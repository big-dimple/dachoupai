import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter,waitScene,tapUI} from '../../harness/ui.mjs';
const dir='shots/w1-inputs-20261007',report={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Current native UI inputs; one existing seed, no sweep. Controlled nine-card and management save explicitly separated from ordinary initial shop. Software Canvas, not device/GPU acceptance.',cases:[],screenshots:[]};
const ssr=await createServer({server:{middlewareMode:true},logLevel:'error'});let cpShop,cpNine;
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts'),{r2JokerDefinitionsFor}=await ssr.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
 let s=createRun({seed:'group-natural-17',runId:'w1-controlled-20261007',characterId:'erxiang',rulesVersion:'r2',r2Profile:'group-upgrade-v1',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s.jokers=[r2CreateJoker('b10','w1/b10',4,undefined,s),r2CreateJoker('c11','w1/c11',6,undefined,s)];s.consumables=[{instanceId:'w1/T03',definitionId:'T03'}];s.longTermItems=['U01'];
 cpShop=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cpShop).ok,'controlled shop valid');await writeFile(dir+'/controlled-shop.json',JSON.stringify(cpShop,null,2)+'\n');
 report.definitions=r2JokerDefinitionsFor(s).filter(d=>['b10','c11',...s.shop.offers.map(o=>o.definitionId)].includes(d.id));
 for(const type of ['LeaveShop','EnterStage']){const r=applyCommand(s,{runId:s.runId,commandId:'w1/'+type,expectedSeq:s.commandSeq,action:{type}});assert.ok(r.ok,r.code);s=r.state;}
 assert.equal(s.stage.handLimit,9,'normal base8 + existing U01');s.handOrder=['diamonds-2','clubs-7','hearts-5','clubs-5','diamonds-8','spades-10','diamonds-10','diamonds-12','hearts-7'];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));
 cpNine=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cpNine).ok,'controlled nine valid');await writeFile(dir+'/controlled-nine.json',JSON.stringify(cpNine,null,2)+'\n');
}finally{await ssr.close();}
await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'error'});report.build=JSON.parse(await readFile(dir+'/build/build-info.json','utf8'));
const server=await preview({build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5391,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});report.browser=browser.version();
const state=p=>p.evaluate(()=>window.__harness.game.registry.get('runController').state);
const shopReady=async p=>{await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(400);};
const nineReady=async p=>{await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});};
const imp=async(p,cp)=>{await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'w1.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});};
const shot=async(p,name)=>{await p.screenshot({path:dir+'/'+name+'.png',scale:'css'});report.screenshots.push(name+'.png');};
const geom=(p,key)=>p.evaluate(key=>{const s=window.__harness.game.scene.getScene(key),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),all=walk(s.children.list),box=o=>{const r=o.getBounds();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{layout:s.view.layout,texts:all.filter(o=>o.type==='Text'&&o.visible&&o.parentContainer?.visible!==false).map(o=>({name:o.name,text:o.text,font:o.style.fontSize,bounds:box(o)})),controls:all.filter(o=>o.input?.enabled).map(o=>({name:o.name,bounds:box(o)})),selected:[...(s.selectedIds??[])],images:all.filter(o=>o.type==='Image'&&o.visible).map(o=>({key:o.texture.key,bounds:box(o)}))};},key);
const detail=async p=>{const d=p.locator('.detail-dialog[open]');return{text:await d.innerText(),buttons:await d.getByRole('button').evaluateAll(bs=>bs.map(b=>({text:b.textContent,disabled:b.disabled,bounds:b.getBoundingClientRect().toJSON()}))),images:await d.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.getAttribute('src'),complete:i.complete,naturalWidth:i.naturalWidth,bounds:i.getBoundingClientRect().toJSON()})))};};
try{
 for(const size of [{width:1280,height:720},{width:390,height:740}]){
  const ctx=await browser.newContext({viewport:size,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await ctx.newPage(),row={size,errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
  await p.goto('http://127.0.0.1:5391/?harness=1&seed=group-natural-17');await waitScene(p,'title');await chooseCharacter(p,'erxiang');await shopReady(p);row.natural=await state(p);await writeFile(dir+'/natural-'+size.width+'.json',JSON.stringify(row.natural,null,2)+'\n');row.naturalGeometry=await geom(p,'shop');await shot(p,'natural-shop-'+size.width);
  for(const kind of ['tools','items']){await tapUI(p,'shop','action/shelf-'+kind);await p.waitForTimeout(350);row['natural'+kind]=await geom(p,'shop');if(size.width===390)await shot(p,'natural-'+kind+'-'+size.width);}
  await imp(p,cpShop);await shopReady(p);row.controlledShop=await state(p);await tapUI(p,'shop','joker/w1/b10');await p.waitForTimeout(350);row.detailFirst=await detail(p);await shot(p,'held-b10-'+size.width);assert.equal(row.detailFirst.buttons.find(b=>b.text==='左移').disabled,true);assert.equal(row.detailFirst.buttons.find(b=>b.text==='右移').disabled,false);
  await p.getByRole('button',{name:'右移',exact:true}).click();await p.waitForFunction(()=>window.__harness.game.registry.get('runController').state.jokers[1].instanceId==='w1/b10');await p.waitForTimeout(350);row.detailLast=await detail(p);assert.equal(row.detailLast.buttons.find(b=>b.text==='右移').disabled,true);await p.getByRole('button',{name:'左移',exact:true}).click();await p.waitForFunction(()=>window.__harness.game.registry.get('runController').state.jokers[0].instanceId==='w1/b10');await p.waitForTimeout(350);
  const before=await state(p);await p.getByRole('button',{name:'出售',exact:true}).click();row.sell=await detail(p);await p.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await state(p),before,'cancel does not sell');row.afterManagement=await state(p);
  await imp(p,cpNine);await nineReady(p);row.nine=await state(p);row.nineUnselected=await geom(p,'game');if(size.width===390)await shot(p,'nine-unselected-'+size.width);for(const id of ['diamonds-2','hearts-5','clubs-5','spades-10','diamonds-10'])await tapUI(p,'game','card/'+id);await p.waitForTimeout(350);row.nineSelected=await geom(p,'game');assert.equal(row.nineSelected.selected.length,5);assert.equal(row.nineSelected.layout.visibleCardCount,9);assert.deepEqual(await state(p),row.nine,'selection does not mutate saved state');await shot(p,'nine-selected-'+size.width);
  await ctx.close();assert.deepEqual(row.errors,[]);row.status='PASS';
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;console.error(e);}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report.status,report.error||'');}
