/** Shared reader: bounded native menu/filter/close and four real modification commands. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene,tapMenuAction} from '../../harness/ui.mjs';
import {snapshotSource} from '../../scripts/check-runner.mjs';

const dir='shots/p08-deck-inspector',base='624bc28cae3b3f94e19468e91957446ee5d0c577';
await mkdir(dir,{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(commit,base);assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');
const frozen=snapshotSource(process.cwd()),json=x=>JSON.parse(JSON.stringify(x)),digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fixtures={};let applyCommand,makeCheckpoint,readCheckpoint;
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});
try{
 const d=await ssr.ssrLoadModule('/src/domain/run.ts'),r=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),cp=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 ({applyCommand}=d);({makeCheckpoint,readCheckpoint}=cp);
 let s=d.createRun({seed:'p08-deck-inspector',runId:'fixture/p08-deck-inspector',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s.jokers=[r.r2CreateJoker('e09','fixture/capacity',0)];s.longTermItems=['U07'];s.consumables=[{instanceId:'fixture/delete',definitionId:'T02'}];
 const card=id=>s.deckInstances.find(c=>c.id===id);
 Object.assign(card('hearts-13'),{enhancement:'glass-paper',edition:'foil'});card('clubs-9').enhancement='heat-paper';card('diamonds-9').enhancement='gold-paper';card('clubs-11').edition='holographic';
 const send=action=>{const result=applyCommand(s,{runId:s.runId,commandId:'fixture/'+s.commandSeq+'/'+action.type,expectedSeq:s.commandSeq,action});assert.ok(result.ok,JSON.stringify(result));s=result.state;};
 const hand=ids=>{s.handOrder=[...ids];s.drawPile=s.deckInstances.filter(c=>![...ids,...s.playedPile,...s.discardPile,...s.destroyedIds].includes(c.id)).map(c=>c.id);s.stage.disabledIds=[];};
 send({type:'LeaveShop'});send({type:'EnterStage'});
 assert.equal(s.stage.handLimit,8);
 hand(['hearts-13','spades-14','clubs-3','diamonds-2','clubs-9','hearts-10','diamonds-11','spades-2']);
 send({type:'UseConsumable',instanceId:'fixture/delete',targetIds:['spades-2']});send({type:'DiscardHand',selectedIds:['hearts-10']});send({type:'PlayHand',selectedIds:['spades-14']});assert.equal(s.phase,'await-input');
 hand(['hearts-13','clubs-3','diamonds-2','clubs-9','hearts-11','diamonds-12','clubs-4','hearts-6']);
 s.consumables=['T07','T08','T06','T10'].map(id=>({instanceId:'fixture/use/'+id,definitionId:id}));
 const pack=state=>{const c=makeCheckpoint(state,[]),valid=readCheckpoint(c);assert.ok(valid.ok,JSON.stringify(valid));return{state:json(state),text:JSON.stringify(c),checkpointSHA256:digest(c),validator:'PASS'};};
 fixtures.game=pack(s);
 hand(['diamonds-10','diamonds-11','diamonds-12','diamonds-13','diamonds-14','hearts-13','clubs-4','hearts-6']);
 send({type:'PlayHand',selectedIds:['diamonds-10','diamonds-11','diamonds-12','diamonds-13','diamonds-14']});assert.equal(s.phase,'stage-cleared');send({type:'OpenShop'});fixtures.shop=pack(s);
 assert.equal(s.destroyedIds.length,1);assert.ok(s.drawPile.length<51);assert.ok(s.playedPile.length>0&&s.discardPile.length>0);
 await writeFile(dir+'/fixtures.json',JSON.stringify(fixtures,null,2)+'\n');
}finally{await ssr.close();}
console.log(JSON.stringify({fixtures:2,validator:'PASS',source:commit}));
if(process.env.DECK_SKIP_BUILD!=='1')await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({build:{outDir:dir+'/build'},preview:{port:5317,strictPort:true,host:'127.0.0.1'},logLevel:'error'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={taskId:'P08',testedCommit:commit,baseCommit:'d1c072dff5055238bd94775a14f2fca44c4d38b8',build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),browser:browser.version(),renderer:'Chromium software Canvas',DPR:1,motion:'reduce',fixture:'Two validator-approved checkpoints; controlled capacity and visible hand, T02 deletion plus real domain play/discard/clear ledgers. Four modification tools are used through native UI once at390; resulting saved state is imported at320/short. Synthetic setup, not natural acquisition or a full run.',sourceFreeze:{before:frozen},device:'NOT_RUN',GPU:'NOT_RUN',audio:'NOT_RUN',profiles:[],modifications:[],errors:[],screenshots:[]};
const suits=['♠','♥','♣','♦'],suitKeys=['spades','hearts','clubs','diamonds'],ranks=['A','K','Q','J','10','9','8','7','6','5','4','3','2'];
function independentCounts(state,scope,filter){
 const live=state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id)),visible=live.filter(c=>(state.phase==='shop'||scope==='all'||state.drawPile.includes(c.id))&&(filter==='all'||(filter==='none'?c.enhancement===undefined:c.enhancement!==undefined)));
 const counts={total:visible.length,suits:Array(4).fill(0),ranks:Array(13).fill(0)};
 for(const c of visible){counts.suits[suitKeys.indexOf(c.suit)]++;counts.ranks[14-c.rank]++;}return counts;
}
function assertCounts(text,expected){
 const blocks=text.split('\n\n');assert.match(blocks[1],new RegExp(' · '+expected.total+' 张$'));
 assert.equal(blocks[2],'花色：'+suits.map((s,i)=>s+' '+expected.suits[i]).join(' · '));
 assert.equal(blocks[3],'点数：'+ranks.map((r,i)=>r+' '+expected.ranks[i]).join(' · '));
 return expected;
}
if(process.env.DECK_RESUME390==='1'){const previous=JSON.parse(await readFile(dir+'/fifth/browser.json','utf8'));assert.deepEqual(previous.build,report.build);assert.equal(previous.modifications.length,4);assert.ok(previous.modifications.every(c=>c.status==='PASS'));assert.equal(previous.profiles[0].reload.status,'PASS');assert.deepEqual(previous.sourceFreeze.after,frozen);const text=await readFile(dir+'/modified-fixture.json','utf8'),c=JSON.parse(text);assert.ok(readCheckpoint(c).ok);fixtures.modified={state:c.state,text,checkpointSHA256:digest(c),validator:'PASS'};report.prior390=previous.profiles[0];report.modifications=previous.modifications;report.resume='Same build; prior four commands and reload retained, only exit follow-up plus320/short.';}
async function profile(spec){
 const out={viewport:spec.viewport,safeTop:spec.top??0,safeBottom:spec.bottom??0,inspections:[],lifecycle:[]};report.profiles.push(out);
 const ctx=await browser.newContext({viewport:spec.viewport,deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await ctx.newPage();
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('dialog',d=>d.accept());
 if(spec.top||spec.bottom)await page.addInitScript(({top,bottom})=>{const set=()=>{document.documentElement?.style.setProperty('--safe-top',top+'px');document.documentElement?.style.setProperty('--safe-bottom',bottom+'px');};set();document.addEventListener('DOMContentLoaded',set);},{top:spec.top,bottom:spec.bottom});
 const state=()=>page.evaluate(()=>window.__harness.game.registry.get('runController').state);
 const selected=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s?.scene.isActive()?[...s.selectedIds]:[];});
 const ready=key=>page.waitForFunction(key=>{const s=window.__harness?.game.scene.getScene(key);return key==='shop'?s?.ready:s?.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));},key);
 const unchanged=async(s,selection)=>{assert.deepEqual(await state(),s);assert.deepEqual(await selected(),selection);};
 const body=()=>page.getByRole('dialog',{name:'牌组查看',exact:true}).locator('.dialog-body');
 async function install(f){await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'deck-inspection-fixture.json',mimeType:'application/json',buffer:Buffer.from(f.text)});const key=f.state.phase==='shop'?'shop':'game';await waitScene(page,key);await ready(key);assert.deepEqual(await state(),f.state);}
 async function open(){await tapMenuAction(page,'查看牌组',true);await page.getByRole('dialog',{name:'牌组查看',exact:true}).waitFor();}
 async function close(){await page.getByRole('button',{name:'关闭',exact:true}).tap();await page.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));await page.waitForTimeout(360);}
 async function geometry(){
  const measure=()=>page.evaluate(()=>{const d=document.querySelector('.detail-dialog[open]'),scroll=d.querySelector('.dialog-scroll'),close=d.querySelector('.dialog-close'),box=e=>{const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};};return{dialog:box(d),scroll:{...box(scroll),top:scroll.scrollTop,client:scroll.clientHeight,contentHeight:scroll.scrollHeight,contentWidth:scroll.scrollWidth,clientWidth:scroll.clientWidth},close:box(close),selects:[...d.querySelectorAll('select')].map(box)};});
  const a=await measure();out.lastGeometry=a;console.log(JSON.stringify({phase:'reader-layout',viewport:spec.viewport,geometry:a}));assert.ok(a.close.width>=44&&a.close.height>=44);assert.ok(a.close.y>=out.safeTop&&a.close.y+a.close.height<=spec.viewport.height-out.safeBottom);assert.ok(a.dialog.x>=0&&a.dialog.x+a.dialog.width<=spec.viewport.width+1);assert.ok(a.scroll.contentWidth<=a.scroll.clientWidth+1);for(const b of a.selects)assert.ok(b.height>=44&&b.x>=a.dialog.x&&b.x+b.width<=a.dialog.x+a.dialog.width);
  if(a.scroll.contentHeight<=a.scroll.client+1)return{before:a,scroll:'N/A: complete body fits the viewport; overflow:auto retained',status:'PASS'};await page.mouse.move(a.scroll.x+a.scroll.width/2,a.scroll.y+a.scroll.height-10);await page.mouse.wheel(0,2000);await page.waitForFunction(()=>document.querySelector('.detail-dialog[open] .dialog-scroll').scrollTop>0);
  const b=await measure();assert.deepEqual(b.close,a.close);assert.ok(b.scroll.top+b.scroll.client>=b.scroll.contentHeight-1);await page.mouse.wheel(0,-2000);await page.waitForFunction(()=>document.querySelector('.detail-dialog[open] .dialog-scroll').scrollTop===0);return{before:a,scrolled:b,status:'PASS'};
 }
 async function inspect(scopes,photo){
  const before=await state(),selection=await selected();await open();const shop=before.phase==='shop';assert.equal(await page.getByLabel('牌组范围',{exact:true}).inputValue(),shop?'all':'remaining');
  if(shop){assert.equal(await page.locator('select[aria-label="牌组范围"] option[value="remaining"]').evaluate(e=>e.disabled),true);const scope=page.getByLabel('牌组范围',{exact:true});await scope.focus();await scope.press('Home');await scope.press('ArrowUp');assert.equal(await scope.inputValue(),'all');assert.match(await body().innerText(),/入场后可查/);}
  const results=[];
  for(const scope of scopes)for(const filter of ['all','none','enhanced']){await page.getByLabel('牌组范围',{exact:true}).selectOption(scope);await page.getByLabel('增强筛选',{exact:true}).selectOption(filter);const text=await body().innerText();results.push({scope,filter,counts:assertCounts(text,independentCounts(before,scope,filter)),text});await unchanged(before,selection);}
  await page.getByLabel('牌组范围',{exact:true}).selectOption('all');await page.getByLabel('增强筛选',{exact:true}).selectOption('all');const text=await body().innerText();
  if(shop){assert.match(text,/上场已打出/);assert.match(text,/上场已弃/);assert.match(text,/上场手牌/);assert.equal(independentCounts(before,'all','all').total,51);assert.notEqual(before.drawPile.length,51);}
  else {assert.match(text,/已打出/);assert.match(text,/已弃/);assert.match(text,/手牌/);}
  const layout=await geometry();if(photo){if(spec.bottom){const b=await page.locator('.dialog-scroll').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height-8);await page.mouse.wheel(0,170);await page.waitForFunction(()=>document.querySelector('.dialog-scroll').scrollTop>100);}await page.screenshot({path:dir+'/'+photo,scale:'css',fullPage:true});report.screenshots.push(photo);}
  await close();await unchanged(before,selection);out.inspections.push({phase:before.phase,beforeRunSHA256:digest(before),afterRunSHA256:digest(await state()),commandSeq:before.commandSeq,RNG:'UNCHANGED',selectedBefore:selection,selectedAfter:await selected(),results,layout,status:'PASS'});return text;
 }
 async function exit(){await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();await page.getByRole('button',{name:'保存并退出',exact:true}).tap();await waitScene(page,'character-select');const lifecycle=await page.evaluate(()=>{const g=window.__harness.game;return{registryPresent:!!g.registry.get('runMenuActions'),gameOwnerPresent:!!g.scene.getScene('game').menuActions,shopOwnerPresent:!!g.scene.getScene('shop').menuActions,modalCount:document.querySelectorAll('.detail-dialog[open]').length};});assert.deepEqual(lifecycle,{registryPresent:false,gameOwnerPresent:false,shopOwnerPresent:false,modalCount:0});await page.locator('.run-menu-toggle').tap();assert.equal(await page.getByRole('button',{name:'查看牌组',exact:true,includeHidden:true}).isHidden(),true);await page.locator('.run-menu-toggle').tap();out.lifecycle.push({scene:'character-select',...lifecycle,status:'PASS'});}
 try{
  await page.goto('http://127.0.0.1:5317/?harness=1');await waitScene(page,'title');assert.equal(await page.evaluate(()=>window.__harness.game.renderer.type),1);
  if(spec.viewport.width===390&&process.env.DECK_RESUME390==='1'){await install(fixtures.modified);await tapUI(page,'game','card/hearts-13',true);await tapUI(page,'game','card/clubs-3',true);await inspect(['remaining','all']);await exit();out.status='PASS';console.log(JSON.stringify({profile:spec,status:'PASS',followup:'390 exit after prior verified native modifications/reload'}));return;}
  await install(fixtures.shop);await inspect(['all'],spec.viewport.width===390?'390-shop-all-ranks.png':undefined);
  const previous=await state();await tapUI(page,'shop','action/start-stage',true);await waitScene(page,'game');await ready('game');const entered=await state();assert.equal(entered.phase,'await-input');assert.equal(entered.commandSeq,previous.commandSeq+2);assert.equal(entered.drawPile.length,43);assert.deepEqual(entered.playedPile,[]);assert.deepEqual(entered.discardPile,[]);
  const lifecycle=await page.evaluate(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return{currentOwner:g.registry.get('runMenuActions')===s.menuActions,shopOwnerReleased:g.scene.getScene('shop').menuActions===undefined};});assert.deepEqual(lifecycle,{currentOwner:true,shopOwnerReleased:true});out.lifecycle.push({scene:'game',newStage:entered.stageIndex,remaining:entered.drawPile.length,previousRemaining:previous.drawPile.length,...lifecycle,status:'PASS'});
  await open();assert.equal(await page.getByLabel('牌组范围',{exact:true}).inputValue(),'remaining');assertCounts(await body().innerText(),independentCounts(entered,'remaining','all'));await close();assert.deepEqual(await state(),entered);await exit();
  await install(spec.viewport.width===390?fixtures.game:fixtures.modified);await tapUI(page,'game','card/hearts-13',true);await tapUI(page,'game','card/clubs-3',true);assert.deepEqual(await selected(),['hearts-13','clubs-3']);
  const initial=await state();assert.deepEqual(independentCounts(initial,'all','all'),spec.viewport.width===390?{total:51,suits:[12,13,13,13],ranks:[4,4,4,4,4,4,4,4,4,4,4,4,3]}:{total:52,suits:[14,14,12,12],ranks:[5,4,4,4,4,4,4,4,4,4,4,4,3]});
  await inspect(['remaining','all'],spec.viewport.width===320?'320-game-modified-ranks.png':spec.bottom?'844-short-game-modified-ranks.png':undefined);
  if(spec.viewport.width===390){
   const cases=[['T07',['hearts-13']],['T08',['hearts-13']],['T06',['clubs-3','diamonds-2']],['T10',['clubs-3','clubs-4']]];
   for(const [id,targets] of cases){const before=await state();await tapUI(page,'game','action/tool-inventory',true);await page.getByRole('dialog',{name:'工具包',exact:true}).waitFor();await page.locator('.tool-inventory-card[data-item-id="fixture/use/'+id+'"]').tap();await page.locator('.tool-detail[open]').waitFor();for(const target of targets)await page.locator('.tool-target-panel input[value="'+target+'"]').tap();const confirm=page.getByRole('button',{name:'确认使用',exact:true});assert.equal(await confirm.isDisabled(),false);await confirm.tap();await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.commandSeq);await ready('game');const after=await state(),reference=applyCommand(before,{runId:before.runId,commandId:after.receipts.at(-1).commandId,expectedSeq:before.commandSeq,action:{type:'UseConsumable',instanceId:'fixture/use/'+id,targetIds:before.handOrder.filter(x=>targets.includes(x))}});assert.ok(reference.ok);assert.deepEqual(after,json(reference.state));assert.deepEqual(after.rng,before.rng);
    const a=independentCounts(before,'all','all'),b=independentCounts(after,'all','all');
    if(id==='T07'){assert.equal(b.total,a.total+1);assert.equal(b.ranks[1],a.ranks[1]+1);assert.equal(b.suits[1],a.suits[1]+1);assert.equal(after.deckInstances.filter(c=>c.rank===13&&c.suit==='hearts'&&c.enhancement==='glass-paper').length,2);}
    if(id==='T08'){assert.equal(b.ranks[0],a.ranks[0]+1);assert.equal(b.ranks[1],a.ranks[1]-1);}
    if(id==='T06'){assert.deepEqual(b.suits,[a.suits[0]+2,a.suits[1],a.suits[2]-1,a.suits[3]-1]);}
    if(id==='T10'){assert.equal(independentCounts(after,'all','enhanced').total,6);assert.equal(independentCounts(after,'all','none').total,46);}
    const text=await inspect(['all']);report.modifications.push({id,targets,commandSeq:[before.commandSeq,after.commandSeq],before:a,after:b,completeStateVsAuthoritativeCommand:'PASS',freshReader:text,status:'PASS'});console.log(JSON.stringify({id,status:'PASS',counts:b}));
   }
   const saved=await state(),c=makeCheckpoint(saved,[]);assert.ok(readCheckpoint(c).ok);fixtures.modified={state:saved,text:JSON.stringify(c),checkpointSHA256:digest(c),validator:'PASS'};await writeFile(dir+'/modified-fixture.json',fixtures.modified.text);
   await page.reload();await waitScene(page,'title');await tapUI(page,'title','action/title-continue',true);await waitScene(page,'game');await ready('game');assert.deepEqual(await state(),saved);await inspect(['remaining','all']);out.reload={beforeRunSHA256:digest(saved),afterRunSHA256:digest(await state()),status:'PASS'};
  }
  await exit();out.status='PASS';console.log(JSON.stringify({profile:spec,status:'PASS',inspections:out.inspections.length}));
 }catch(e){out.status='FAIL';out.error=String(e);await page.screenshot({path:dir+'/failure-'+spec.viewport.width+'.png',scale:'css',fullPage:true});throw e;}finally{await ctx.close();}
}
try{
 assert.equal(report.build.revision,base);assert.equal(report.build.modified,false);
 for(const spec of [{viewport:{width:390,height:740}},{viewport:{width:320,height:568}},{viewport:{width:844,height:300},top:12,bottom:34}])await profile(spec);
 assert.deepEqual(report.errors,[]);report.sourceFreeze.after=snapshotSource(process.cwd());assert.deepEqual(report.sourceFreeze.after,frozen);report.sourceFreeze.status='PASS';report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;console.error(e);}finally{report.sourceFreeze.after=snapshotSource(process.cwd());report.sourceFreeze.status=JSON.stringify(report.sourceFreeze.after)===JSON.stringify(frozen)?'PASS':'FAIL';await browser.close();await server.httpServer.close();await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,source:commit,profiles:report.profiles.map(p=>({viewport:p.viewport,status:p.status,error:p.error})),screenshots:report.screenshots}));}
