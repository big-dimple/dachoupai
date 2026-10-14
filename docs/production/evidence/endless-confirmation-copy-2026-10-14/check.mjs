import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from '../../../../harness/ui.mjs';

const root=process.cwd(),out=process.env.ENDLESS_COPY_OUTPUT??'/tmp/endless-confirmation-evidence',base='c2b506174d9add1df43eb9d94dbebe2bb974090f';
await mkdir(out,{recursive:true});
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const source=await readFile(root+'/src/game/IntermissionScene.ts','utf8'),original=git('show',base+':src/game/IntermissionScene.ts');
const normalize=text=>text.trim().replace(/^import \{endlessContinuationCopy\} from '\.\/EndlessContinuationCopy';\n/m,'').replace(/('继续无尽 · 自愿巡演',)(?:'[^'\n]*'|endlessContinuationCopy\(run\))(?=,\[)/,'$1BODY');
assert.equal(normalize(source),normalize(original),'entire scene outside the confirmation copy/import matches main');
assert.equal(git('diff','--name-only',base,'--','src/domain','src/application','src/content','src/audio','public','.github','AGENTS.md','docs/production/DELIVERY_PLAN.md','docs/development-handoff.md'),'');
const frozen={head:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD:src'),status:git('status','--porcelain')};
assert.equal(frozen.status,'');
const report={base,...frozen,browser:'system Chromium, software Canvas, DPR1',scope:'Controlled valid late-entry checkpoints and domain-generated true final clears; browser menu import and native UI only. No natural play, device/audio/balance acceptance.',sceneOutsideCopyExact:true,protectedFilesUnchanged:true,rows:[],status:'RUNNING'};
const server=await createServer({root,mode:'e2e',cacheDir:'/tmp/endless-confirmation-vite',server:{host:'127.0.0.1',port:5686,strictPort:true,hmr:false},logLevel:'error'});
await server.listen();
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {applyCommand,createRun}=await server.ssrLoadModule('/src/domain/run.ts');
const {assertR2Invariants,getR2Stage,r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {boundedStart,boundedSend}=await server.ssrLoadModule('/tests/fixtures/bounded-clear.ts');
const {endlessContinuationCopy}=await server.ssrLoadModule('/src/game/EndlessContinuationCopy.ts');
const build=s=>({identity:[s.contentVersion,s.contentHash],gold:s.gold,deck:s.deckInstances,draw:s.drawPile,hand:s.handOrder,played:s.playedPile,discard:s.discardPile,destroyed:s.destroyedIds,jokers:s.jokers,levels:s.handLevels,consumables:s.consumables,items:s.longTermItems,route:s.routeGrowth,spectral:s.spectralModifiers,coupons:s.purchaseCoupons,supply:s.supplyRewardClaimed,rescue:s.safetyNetUsed,total:s.totalHeat,completion:s.normalCompletion,stage:s.stage,trace:s.lastTrace});
function fixture(kind){
 let s=boundedSend(kind==='bounded'?boundedStart('erxiang'):createRun({seed:'mode-save-free',characterId:'erxiang',runId:'endless-copy/v11',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}}),{type:'LeaveShop'});
 Object.assign(s,{chapter:8,stageIndex:23,shop:null,totalHeat:'1000',boss:{definitionId:'B12',disabledSuit:null},seenBossIds:['B01','B02','B05','B06','B07','B08','B13','B12'],handLevels:{'high-card':1,'flush-five':30}});
 s.deckInstances=Array.from({length:20},(_,index)=>({id:kind+'/final/card/'+index,rank:14,suit:'hearts',enhancement:'encore-paper',edition:'polychrome'}));
 s.drawPile=s.deckInstances.map(c=>c.id);
 if(kind==='bounded')s.routeGrowth={clears:23,G:23,S:0,F:0,settlements:Array.from({length:23},(_,stageIndex)=>({stageIndex,families:['G']}))};
 s.gold=25;s.consumables=[{instanceId:kind+'/held-tool',definitionId:'T01'}];s.longTermItems=['U01'];
 s.jokers=[r2CreateJoker('b10',kind+'/held-joker',6,undefined,s)];s.jokers[0].growth.heat={n:'30',d:'1'};
 s=boundedSend(s,{type:'EnterStage'});
 assertR2Invariants(s);
 const command={runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:{type:'PlayHand',selectedIds:s.handOrder.slice(0,5)}};
 const result=applyCommand(s,command);assert.ok(result.ok,result.code);assert.equal(result.state.phase,'run-won');
 const checkpoint=makeCheckpoint(result.state,[command]),checked=readCheckpoint(checkpoint);assert.ok(checked.ok,checked.code);
 return checkpoint;
}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{
 for(const viewport of [{width:1366,height:768},{width:390,height:740}])for(const kind of ['bounded','historical-v11']){
  const checkpoint=fixture(kind),context=await browser.newContext({viewport,hasTouch:viewport.width===390,deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),row={kind,viewport,errors:[]};report.rows.push(row);
  page.setDefaultTimeout(25000);page.on('dialog',d=>d.accept());page.on('pageerror',e=>row.errors.push(String(e)));
  const touch=viewport.width===390,dom=locator=>touch?locator.tap():locator.click();
  const snap=()=>page.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});
  try{
   await page.goto('http://127.0.0.1:5686/?harness=1');await waitScene(page,'title');await dom(page.locator('.run-menu-toggle'));
   const saves=page.getByText('进度与存档',{exact:true}).locator('..');if(!await saves.evaluate(e=>e.open))await dom(saves.locator('summary'));
   const choose=page.waitForEvent('filechooser');await dom(page.getByRole('button',{name:'导入本局',exact:true}));await(await choose).setFiles({name:kind+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
   await waitScene(page,'intermission');await page.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').ready);await page.evaluate(()=>document.fonts.ready);
   const before=await snap();assert.deepEqual(before.state,checkpoint.state);assert.deepEqual(before.journal,checkpoint.journal);
   row.identity={version:before.state.contentVersion,hash:before.state.contentHash};row.beforeHash=sha(before);row.targets={c8:getR2Stage(21,'normal',0,before.state).targetHeat,c9:getR2Stage(24,'endless',0,before.state).targetHeat,c10:getR2Stage(27,'endless',0,before.state).targetHeat};
   assert.deepEqual(row.targets,kind==='bounded'?{c8:'20475',c9:'22523',c10:'24775'}:{c8:'160000',c9:'384000',c10:'921600'});
   await tapUI(page,'intermission','action/continue-endless',touch);const dialog=page.locator('.detail-dialog[open]');await dialog.waitFor();
   row.body=await dialog.locator('.dialog-body').innerText();assert.equal(row.body,endlessContinuationCopy(before.state));
   assert.ok(row.body.includes(kind==='bounded'?'目标按 1.1 倍':'目标按 2.4 倍'));assert.ok(row.body.includes('最终向上取整'));
   row.bounds=await dialog.evaluate(d=>{const scroll=d.querySelector('.dialog-scroll');return {width:d.clientWidth,scrollWidth:d.scrollWidth,bodyWidth:scroll.clientWidth,bodyScrollWidth:scroll.scrollWidth,buttons:[...d.querySelectorAll('.dialog-actions button')].map(b=>({label:b.textContent,rect:b.getBoundingClientRect().toJSON()}))};});
   assert.ok(row.bounds.scrollWidth<=row.bounds.width+1&&row.bounds.bodyScrollWidth<=row.bounds.bodyWidth+1);
   assert.ok(row.bounds.buttons.every(({rect:r})=>r.height>=44&&r.x>=0&&r.right<=viewport.width+1&&r.bottom<=viewport.height+1));
   const image=kind+'-'+viewport.width+'.png';await page.screenshot({path:out+'/'+image,scale:'css'});row.image=image;
   await dom(page.getByRole('button',{name:'取消',exact:true}));await waitScene(page,'intermission');assert.equal(await page.locator('.detail-dialog[open]').count(),0);assert.deepEqual(await snap(),before);row.cancelStateJournalStorageExact=true;
   await tapUI(page,'intermission','action/continue-endless',touch);await dom(page.getByRole('button',{name:'确认继续',exact:true}));await waitScene(page,'shop');await page.waitForFunction(async()=>{const {gameSession}=await import('/src/game/session.ts');return gameSession().run.status==='idle';});
   const after=await snap(),command=after.journal.at(-1);assert.equal(command.action.type,'ContinueEndless');assert.equal(after.journal.length,before.journal.length+1);
   const expected=applyCommand(before.state,command);assert.ok(expected.ok,expected.code);assert.deepEqual(after.state,expected.state);assert.deepEqual(build(after.state),build(before.state));
   assert.equal(after.state.phase,'shop');assert.equal(after.state.chapter,9);assert.equal(after.state.tourMode,'endless');assert.deepEqual(after.storage.current,makeCheckpoint(expected.state,[...before.journal,command]));
   row.confirmStateEqualsOriginalCommand=true;row.buildAndIdentityExact=true;row.savedCheckpointExact=true;row.afterHash=sha(after);row.buildHash=sha(build(after.state));
   await page.reload();await waitScene(page,'title');await tapUI(page,'title','action/title-continue',touch);await waitScene(page,'shop');await page.waitForFunction(async()=>{const {gameSession}=await import('/src/game/session.ts');return gameSession().run.status==='idle';});assert.deepEqual(await snap(),after);row.coldRestoreExact=true;
   assert.deepEqual(row.errors,[]);row.status='PASS';console.log(JSON.stringify({kind,viewport,status:row.status}));
  }catch(error){row.status='FAIL';row.error=error.stack;await page.screenshot({path:out+'/'+kind+'-'+viewport.width+'-FAIL.png'});throw error;}finally{await context.close();}
 }
 assert.deepEqual({head:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD:src'),status:git('status','--porcelain')},frozen);report.sourceFrozen=true;report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1;}finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,rows:report.rows.length,head:report.head}));}
