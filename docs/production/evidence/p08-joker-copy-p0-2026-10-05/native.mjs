import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene,tapMenuAction,point} from '../../harness/ui.mjs';
import {snapshotSource} from '../../scripts/check-runner.mjs';
const dir='shots/p0-copy',fixtures={};
const before=snapshotSource(process.cwd());
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts'),{r2Price}=await ssr.ssrLoadModule('/src/domain/r2Shop.ts');
 for(const key of ['legacy','assist','replay','shop']){
  let state=createRun({runId:'fixture/p0/'+key,seed:'p0/'+key,characterId:'amo',rulesVersion:'r2',...(key==='assist'||key==='shop'?{r2Profile:'amo-assist-v1'}:{}),modeConfig:{mode:'standard',difficulty:3,challengeId:null,programsEnabled:false}});
  const group=key==='legacy'?['c07','d07','huimaqiang','e11','f06']:key==='assist'?['a03','a05','a06','d09','b03']:key==='replay'?['e11','f12','d09','b03']:[];
  state.jokers=group.map(id=>r2CreateJoker(id,'copy/'+id,0));
  const send=action=>{const r=applyCommand(state,{runId:state.runId,commandId:'fixture/'+state.commandSeq,expectedSeq:state.commandSeq,action});assert.ok(r.ok);state=r.state;};
  if(key==='shop')state.shop.offers.slice(0,3).forEach((o,i)=>{o.definitionId=['a03','a05','a06'][i];o.price=r2Price(o.definitionId,o.edition??'none');});
  else{
   send({type:'LeaveShop'});send({type:'EnterStage'});
   const pick=key==='replay'?['spades-2','hearts-2']:['spades-9','hearts-9','clubs-13','diamonds-13'];
   const rest=state.deckInstances.map(c=>c.id).filter(id=>!pick.includes(id));state.handOrder=[...pick,...rest.splice(0,state.stage.handLimit-pick.length)];state.drawPile=rest;
   if(key==='replay'){send({type:'PlayHand',selectedIds:pick});assert.equal(state.phase,'await-input');assert.ok(state.lastTrace);}
  }
  const cp=makeCheckpoint(state,[]),read=readCheckpoint(cp);assert.ok(read.ok,JSON.stringify(read));fixtures[key]={bytes:JSON.stringify(cp),state};
 }
}finally{await ssr.close();}
if(!process.env.REUSE_BUILD)await build({mode:'e2e',base:'/p0-copy/',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({base:'/p0-copy/',build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5312,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={status:'IN_PROGRESS',before,build:JSON.parse(await readFile(dir+'/build/build-info.json')),fixture:'Validator-approved native imports; real PlayHand saved trace. Software Canvas, not natural acquisition or device/GPU approval.',screens:[],details:[],tables:[],errors:[]};
try{
 for(const width of [320,390]){
  const context=await browser.newContext({viewport:{width,height:740},hasTouch:true,deviceScaleFactor:1,reducedMotion:'no-preference'}),page=await context.newPage();
  page.setDefaultTimeout(15000);page.on('dialog',d=>d.accept());page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto('http://127.0.0.1:5312/p0-copy/?harness=1');await waitScene(page,'title');
  async function load(key){
   await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();
   const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'p0-'+key+'.json',mimeType:'application/json',buffer:Buffer.from(fixtures[key].bytes)});
   await page.waitForFunction(runId=>window.__harness.game.registry.get('runController')?.state.runId===runId,fixtures[key].state.runId);await waitScene(page,key==='shop'?'shop':'game');await page.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.isActive('game')?g.scene.getScene('game'):g.scene.getScene('shop');return s.ready&&(!s.cardViews||s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container)));});
  }
  const saved=()=>page.evaluate(()=>window.__harness.game.registry.get('runController').state);
  async function shot(name){const path=dir+'/'+width+'-'+name+'.png';await page.screenshot({path});report.screens.push(path);}
  async function detail(id,key,close='关闭'){
   await page.locator('.detail-dialog[open]').waitFor();await page.waitForFunction(()=>{const im=document.querySelector('.detail-dialog[open] img');return !im||im.complete;});
   const g=await page.locator('.detail-dialog[open]').evaluate(d=>{const rect=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{text:e.textContent,x:r.x,y:r.y,width:r.width,height:r.height,font:s.fontSize,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth};};return{main:rect(d.querySelector('.ability-main')),limits:rect(d.querySelector('.ability-limits')),state:rect(d.querySelector('.card-ability small')),scroll:rect(d.querySelector('.dialog-scroll')),actions:[...d.querySelectorAll('.dialog-actions button')].map(rect),rulesOpen:d.querySelector('.card-rules').open,art:d.querySelector('img')?.getAttribute('src')};});
   assert.ok(parseFloat(g.main.font)>=20);assert.ok(parseFloat(g.limits.font)>=14);assert.ok(parseFloat(g.state.font)>=14);assert.equal(g.rulesOpen,false);assert.ok(g.main.scrollWidth<=g.main.clientWidth);assert.ok(g.main.y+g.main.height<=g.scroll.y+g.scroll.height+1,'main initially visible');assert.ok(g.actions.every(b=>b.width>=44&&b.height>=44));assert.ok(g.art);
   if(['a03','a05','a06'].includes(id))assert.match(g.main.text,/两对及以上牌型/);
   if(key==='replay'){assert.doesNotMatch(g.state.text,/已有实际效果|已有计分增益/);assert.match(g.state.text,id==='e11'?/本次按×1结算/:/本次按\+0结算/);if(id==='b03')assert.match(g.state.text,/结算后成长 \+0.25，新增从下一次出牌生效/);}
   report.details.push({width,id,key,...g});await shot(key+'-'+id);await page.getByRole('button',{name:close,exact:true}).tap();
  }
  for(const key of (process.env.ONLY_SHOP?[]:['legacy','assist'])){
   await load(key);const pre=await saved();
   const labels=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.run.jokers.map(j=>{const v=s.jokerViews.get(j.instanceId),l=v.getData('valueLabel'),h=v.getData('hit'),b=h?.getBounds();return{id:j.definitionId,text:l.text,full:l.getData('fullText'),width:l.width,room:l.getData('labelRoom'),font:l.style.fontSize,hit:b?{width:b.width,height:b.height}:null};});});
   assert.deepEqual(labels.map(l=>l.id),key==='legacy'?['c07','d07','huimaqiang','e11','f06']:['a03','a05','a06','d09','b03']);
   for(const l of labels){assert.equal(l.font,'14px');assert.ok(l.width<=l.room);assert.ok(l.hit.width>=44&&l.hit.height>=44);if(['c07','d07','a03','a05','a06'].includes(l.id))assert.equal(l.text,'条件 ›');if(l.id==='huimaqiang')assert.ok(['每3次×2','条件 ›'].includes(l.text));if(l.id==='f06')assert.equal(l.text,'余4手');}
   report.tables.push({width,key,labels});await shot(key+'-table');
   for(const id of key==='legacy'?['c07','d07']:['a03','a05','a06']){await tapUI(page,'game','joker/copy/'+id,true);await detail(id,key);assert.deepEqual(await saved(),pre);}
  }
  await load('shop');const preShop=await saved();await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.view.root.alpha===1&&s.offerArts.length===3&&s.offerArts.every(a=>a.alpha===1&&!s.tweens.isTweening(a));});
  await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]);return walk(s.children.list).filter(o=>o.name==='shop/offer-purpose').length===3;});
  const summaries=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]);return walk(s.children.list).filter(o=>o.name==='shop/offer-purpose').map(o=>({text:o.text,full:o.getData('fullText'),font:o.style.fontSize,width:o.width,height:o.height}));});
  assert.equal(summaries.length,3);for(const s of summaries){assert.ok(parseFloat(s.font)>=14);assert.ok(s.text===s.full||s.text==='条件与效果\n点击查看');}report.tables.push({width,key:'shop',summaries});await shot('shop');
  const offer=preShop.shop.offers.find(o=>o.definitionId==='a06');await tapUI(page,'shop','offer/'+offer.offerId,true);await detail('a06','shop','取消');assert.deepEqual(await saved(),preShop);
  for(const id of (process.env.ONLY_SHOP?[]:['e11','b03'])){
   await load('replay');const pre=await saved(),p=await point(page,'game','joker/copy/'+id);
   await tapMenuAction(page,'回看上一手',true);await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').isPresenting);await page.touchscreen.tap(p.x,p.y);await detail(id,'replay');
   if(await page.evaluate(()=>window.__harness.game.scene.getScene('game').isPresenting))await tapMenuAction(page,'快进当前手',true);
   await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').ready);assert.deepEqual(await saved(),pre);
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);report.after=snapshotSource(process.cwd());assert.deepEqual(report.after,before);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}
finally{await browser.close();await server.httpServer.close();await writeFile(dir+(process.env.ONLY_SHOP?'/shop-native-report.json':'/native-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,details:report.details.length,screens:report.screens}));}
