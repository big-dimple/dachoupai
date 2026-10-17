/** Bounded native browser regression check; imports validator-approved checkpoints via the menu. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';

const out=process.env.REGRESSION_OUT??'shots/ai-stage-regressions';
await mkdir(out,{recursive:true});
const port=Number(process.env.REGRESSION_PORT??5697);
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});
await server.listen();
const domain=await server.ssrLoadModule('/src/domain/run.ts');
const checkpoint=await server.ssrLoadModule('/src/application/checkpoint.ts');
const prices=await server.ssrLoadModule('/src/domain/r2Shop.ts');
const launch=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const apply=(s,action)=>{const command={runId:s.runId,commandId:`${s.runId}/command/${s.commandSeq+1}`,expectedSeq:s.commandSeq,action};const r=domain.applyCommand(s,command);assert.ok(r.ok,JSON.stringify(r));return {state:r.state,command};};
const fixtures={};
for(const index of [0,1,2]){
 let state=domain.createRun({r2Identity:launch.newRunIdentity('erxiang'),runId:'regression/stage/'+index,seed:'ai-stage-regression',characterId:'erxiang',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}}),journal=[];
 for(let i=0;i<index;i++){for(const action of [{type:'SkipStage'},{type:'OpenShop'}]){const r=apply(state,action);state=r.state;journal.push(r.command);}}
 fixtures['shop'+index]=checkpoint.makeCheckpoint(state,journal);
 let r=apply(state,{type:'LeaveShop'});state=r.state;journal=[...journal,r.command];
 fixtures['ready'+index]=checkpoint.makeCheckpoint(state,journal);
 if(index===0){let input=fixtures.shop0.state,inputJournal=[...fixtures.shop0.journal];const offer=input.shop.offers.find(o=>prices.r2PurchasePrice(input,o)<=input.gold);assert.ok(offer);r=apply(input,{type:'BuyOffer',offerId:offer.offerId});input=r.state;inputJournal.push(r.command);for(const type of ['LeaveShop','EnterStage']){r=apply(input,{type});input=r.state;inputJournal.push(r.command);}fixtures.input=checkpoint.makeCheckpoint(input,inputJournal);}
}
for(const f of Object.values(fixtures))assert.ok(checkpoint.readCheckpoint(f).ok);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:process.env.REGRESSION_BASELINE??execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:process.env.REGRESSION_BASELINE?'isolated git archive of baseline src':execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),browser:browser.version(),renderer:'Chromium software Canvas',rows:[]};
report.sourceHashes=Object.fromEntries(await Promise.all(['GameScene','ShopScene','BlindSelectPresentation'].map(async name=>[name,createHash('sha256').update(await readFile('src/game/'+name+'.ts')).digest('hex')])));
const snap=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});
async function load(p,f){
 await p.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(p,'title');
 await p.locator('.run-menu-toggle').click();const saves=p.getByText('进度与存档',{exact:true}).locator('..');await saves.locator('summary').click();
 const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'regression.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(f))});
}
async function scenario(name,fn,viewport={width:1366,height:768}){
 if(process.env.REGRESSION_CASES&&!process.env.REGRESSION_CASES.split(',').includes(name))return;
 const context=await browser.newContext({viewport,reducedMotion:'reduce',hasTouch:viewport.width<700}),p=await context.newPage(),row={name,viewport,status:'RUNNING',errors:[]};report.rows.push(row);p.setDefaultTimeout(12000);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
 try{await fn(p,row);assert.deepEqual(row.errors,[]);row.status='PASS';}catch(e){row.status='FAIL';row.error=String(e.stack??e);}finally{row.observed=await p.evaluate(()=>{const g=window.__harness?.game,s=g?.registry.get('runController')?.state;return {activeScenes:g?.scene.getScenes(true).map(s=>s.scene.key),phase:s?.phase,seq:s?.commandSeq,stageIndex:s?.stageIndex,stage:s?.stage,contentVersion:s?.contentVersion,contentHash:s?.contentHash};}).catch(()=>null);await p.screenshot({path:out+'/'+name+'.png'}).catch(()=>{});await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await context.close();console.log(name+': '+row.status+(row.error?' '+row.error.split('\n')[0]:''));}
}
try{
 await scenario('ai-real-play',async(p,row)=>{
  await load(p,fixtures.input);await waitScene(p,'game');await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').controlsLive);
  await p.waitForFunction(()=>['ready','unsupported'].includes(window.__harness.game.scene.getScene('game').aiCandidates.result?.status));
  row.ai=await p.evaluate(()=>window.__harness.game.scene.getScene('game').aiCandidates.result);assert.equal(row.ai.status,'ready');assert.ok(row.ai.ordered.length);
  const before=await snap(p);await tapUI(p,'game','selection/switch-type');row.selected=await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]);assert.deepEqual(row.selected,row.ai.ordered[0].playedIds);assert.deepEqual(await snap(p),before);
  const expected=apply(before.state,{type:'PlayHand',selectedIds:row.selected});
  await tapUI(p,'game','action/play');await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq,before.state.commandSeq);const after=await snap(p);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.journal,[...before.journal,expected.command]);row.finalScore=after.state.lastTrace.finalScore;row.domainStateAndJournalExact=true;
 },{width:390,height:844});
 for(const [name,close] of [['later',p=>p.getByRole('button',{name:'稍后开战',exact:true}).click()],['escape',p=>p.keyboard.press('Escape')]])await scenario('ready-'+name,async(p,row)=>{
  await load(p,fixtures.ready0);await p.locator('.blind-select-dialog[open]').waitFor();const before=await snap(p);row.laterCount=await p.getByRole('button',{name:'稍后开战',exact:true}).count();
  if(name==='later')await p.locator('.blind-select-dialog .dialog-close').click();else await close(p);await p.waitForTimeout(450);assert.ok(await p.evaluate(()=>window.__harness.game.scene.isActive('game')));assert.equal(row.laterCount,1);assert.deepEqual(await snap(p),before);
  await tapUI(p,'game','action/stage-directory');await p.locator('.blind-select-dialog[open]').waitFor();assert.deepEqual(await snap(p),before);await p.getByRole('button',{name:'进入暖场 ›',exact:true}).first().click();await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').controlsLive);const after=await snap(p);assert.deepEqual(after.state,apply(before.state,{type:'EnterStage'}).state);row.closeReopenNoCommand=true;row.enterExact=true;
 });
 for(const index of [0,1])await scenario('skip-'+index,async(p,row)=>{
  await load(p,fixtures['shop'+index]);await waitScene(p,'shop');await tapUI(p,'shop','action/chapter');const before=await snap(p);await p.locator('.blind-btn.is-skip').click();await waitScene(p,'intermission');await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').ready);const after=await snap(p),expected=apply(before.state,{type:'SkipStage'});assert.deepEqual(after.state,expected.state);assert.deepEqual(after.journal,[...before.journal,expected.command]);row.result=await p.evaluate(()=>window.__harness.game.scene.getScene('intermission').result);assert.equal(row.result.stageIndex,index);assert.equal(row.result.stageHeat,after.state.stage.heat);assert.equal(row.result.handsLeft,after.state.stage.handsLeft);assert.equal(row.result.goldEarned,after.state.stage.goldEarned);row.domainStateAndJournalExact=true;
 });
 await scenario('skip-save-retry',async(p,row)=>{
  await load(p,fixtures.ready0);await p.locator('.blind-select-dialog[open]').waitFor();const before=await snap(p);
  await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),r=gameSession().run,store=r.store,commit=store.commit.bind(store);window.__commitCalls=0;store.commit=async(...args)=>{window.__commitCalls++;if(window.__commitCalls===1){await new Promise(resolve=>window.__releaseFailure=resolve);throw new DOMException('injected regression quota','QuotaExceededError');}return commit(...args);};});
  const skip=p.locator('.blind-btn.is-skip');await skip.dblclick({delay:30});await p.waitForFunction(()=>window.__commitCalls===1);assert.deepEqual(await snap(p),before);await p.evaluate(()=>window.__releaseFailure());await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused');
  if(await p.locator('.run-menu-modal').evaluate(d=>d.open))await p.locator('.run-menu-toggle').click();
  await p.getByRole('button',{name:'重试保存并跳场',exact:true}).click();await waitScene(p,'intermission');await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').ready);const after=await snap(p),expected=apply(before.state,{type:'SkipStage'});assert.deepEqual(after.state,expected.state);assert.deepEqual(after.journal,[...before.journal,expected.command]);assert.equal(await p.evaluate(()=>window.__commitCalls),2);row.sameCandidateExactlyOnce=true;
 });
 await scenario('shop-close-and-boss-lock',async(p,row)=>{
  await load(p,fixtures.shop2);await waitScene(p,'shop');const before=await snap(p);for(let i=0;i<2;i++){await tapUI(p,'shop','action/chapter');assert.equal(await p.locator('.blind-btn.is-skip').count(),0);assert.equal(await p.getByRole('button',{name:'返回商店',exact:true}).count(),1);await p.getByRole('button',{name:'返回商店',exact:true}).click();assert.deepEqual(await snap(p),before);}row.cancelNoCommand=true;
 });
}finally{report.status=report.rows.every(r=>r.status==='PASS')?'PASS':'FAIL';await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();console.log(JSON.stringify({status:report.status,rows:report.rows.map(({name,status,error})=>({name,status,error}))},null,2));}
if(report.status==='FAIL')process.exitCode=1;
