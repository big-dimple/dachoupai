import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';

const out=process.env.AI_PARITY_OUT??'shots/ai-hero-context-integration',port=5297;
await mkdir(out,{recursive:true});
console.log('AI parity: loading the public fixture without dev discovery/watchers');
const ssr=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'error'});
const {liueAttachmentFixture}=await ssr.ssrLoadModule('/harness/fixtures/liue-target-attachment.ts');
const {makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
const {applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts');
const {previewR2Hand}=await ssr.ssrLoadModule('/src/domain/scoreR2.ts');
const {aiHandScoreInput}=await ssr.ssrLoadModule('/src/game/AiHandCandidates.ts');
const fixture=liueAttachmentFixture(),checkpoint=makeCheckpoint(fixture.state,[]);
assert.equal(readCheckpoint(checkpoint).ok,true);
await ssr.close();
console.log('AI parity: public fixture ready, building the integrated e2e app');
const buildDir=resolve(out,'build');
await build({mode:'e2e',build:{outDir:buildDir},logLevel:'error'});
const server=await preview({build:{outDir:buildDir},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1366,height:768},deviceScaleFactor:1,reducedMotion:'no-preference',recordVideo:{dir:out,size:{width:1366,height:768}}});
const page=await context.newPage();page.setDefaultTimeout(30000);
console.log('AI parity: actual Edge input sequence starting');
const report={product:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--short'],{encoding:'utf8'}),buildInfo:JSON.parse(await readFile(buildDir+'/build-info.json','utf8')),browser:browser.version(),scope:'One controlled current-identity Liu E native import/select/cancel/AI-cycle/undo/play sequence on actual PC input. Canonical commands independently verify captured AI score inputs and final full state. Not natural acquisition, global optimal AI, all heroes/devices, hearing or experience acceptance.',status:'RUNNING',errors:[],steps:[]};
page.on('pageerror',error=>report.errors.push(String(error)));page.on('dialog',dialog=>dialog.accept());
const snap=()=>page.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:await c.store.read()};});
const ready=()=>page.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing);});
const waitAI=()=>page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game'),r=s.aiCandidates.result;return s.ready&&!s.playing&&!s.presentation&&r?.status==='ready'&&(JSON.parse(r.key)[1].erxiangHandoff?.targetId??null)===s.erxiangTargetId;});
const probe=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),edges=[],walk=list=>{for(const o of list){if(o.active&&o.name==='hero/target-edge')edges.push({targetId:o.getData('targetId'),phase:o.getData('phase')});if(o.list)walk(o.list);}};walk(s.view.root.list);return{target:s.erxiangTargetId,selected:[...s.selectedIds],input:s.aiInput(),ai:s.aiCandidates.result,edges};});
const choose=async()=>{await tapUI(page,'game','hero/action-shortcut');await page.getByRole('button',{name:/^(已选 )?第\d+张 · 6♥$/}).click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));await waitAI();};
let initial,final;
async function take(label){
 console.log('AI parity: '+label);
 await waitAI();const p=await probe();assert.deepEqual(await snap(),initial,label+': selection/cache changes cannot mutate state/journal/storage');
 const rows=p.ai.ordered.map((facts,index)=>{
  const action={type:'PlayHand',selectedIds:facts.playedIds,...(p.target?{erxiangTargetId:p.target}:{})};
  const canonical=applyCommand(initial.state,{runId:initial.state.runId,commandId:'readonly-parity/'+label+'/'+index,expectedSeq:initial.state.commandSeq,action});
  assert.equal(canonical.ok,true,label+': candidate rejected by canonical command');
  const actualInputPreview=previewR2Hand(aiHandScoreInput(p.input,facts.playedIds));
  assert.equal(actualInputPreview.scoreRange.minimum,canonical.state.lastTrace.finalScore,label+': captured AI input differs from canonical command');
  if(p.target)assert.ok(facts.activeScoringIds.includes(p.target),label+': chosen target missing from candidate core');
  return{type:facts.type,ids:facts.playedIds,canonicalScore:canonical.state.lastTrace.finalScore,aiInputMinimum:actualInputPreview.scoreRange.minimum};
 });
 const row={label,target:p.target,selected:p.selected,cacheKey:p.ai.key,scoreContext:p.input.score,edges:p.edges,candidates:rows};report.steps.push(row);return row;
}
async function resetOriginalSelection(){const selected=(await probe()).selected;for(const id of selected)await tapUI(page,'game','card/'+id);for(const id of fixture.selectedIds)await tapUI(page,'game','card/'+id);await waitAI();}
try{
 await page.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(page,'title');
 await page.locator('.run-menu-toggle').click();const section=page.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'ai-parity-public-checkpoint.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
 await waitScene(page,'game');await ready();const intro=page.getByRole('button',{name:'开始出牌',exact:true});if(await intro.count())await intro.click();if(await page.locator('.detail-dialog[open]').count())await page.getByRole('button',{name:'关闭',exact:true}).click();
 for(const id of fixture.selectedIds)await tapUI(page,'game','card/'+id);
 initial=await snap();assert.deepEqual(initial.state,fixture.state);
 const plain=await take('plain-pair');assert.equal(plain.target,null);
 await choose();const chosen=await take('chosen-pair');assert.equal(chosen.target,fixture.targetId);assert.notEqual(chosen.cacheKey,plain.cacheKey);await page.screenshot({path:out+'/chosen.png'});
 await tapUI(page,'game','selection/switch-type');const first=await take('AI-keeps-chosen-target');assert.equal(first.target,fixture.targetId);assert.deepEqual(first.selected,chosen.candidates[0].ids);
 await tapUI(page,'game','hero/action-shortcut');await page.getByRole('button',{name:'取消本手选牌',exact:true}).click();
 const cancelled=await take('cancel-target');assert.equal(cancelled.target,null);assert.notEqual(cancelled.cacheKey,first.cacheKey);assert.equal(cancelled.edges.length,0);await page.screenshot({path:out+'/cancelled.png'});
 await tapUI(page,'game','selection/switch-type');const cancelledAI=await take('AI-after-cancel');assert.equal(cancelledAI.target,null);
 await resetOriginalSelection();await choose();await take('reselect-target');
 await tapUI(page,'game','selection/switch-type');const a=await take('AI-first-compatible');
 await tapUI(page,'game','selection/switch-type');const b=await take('AI-next-compatible');assert.equal(b.target,fixture.targetId);assert.notDeepEqual([...a.selected].sort(),[...b.selected].sort());
 await tapUI(page,'game','selection/hand-rules');await page.getByRole('button',{name:'撤销换组',exact:true}).click();const undone=await take('undo-restores-target-and-hand');assert.equal(undone.target,fixture.targetId);assert.deepEqual([...undone.selected].sort(),[...a.selected].sort());await page.screenshot({path:out+'/AI-before-play.png'});
 await tapUI(page,'game','action/play');await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,initial.state.commandSeq);await ready();
 final=await snap();assert.equal(final.journal.length,initial.journal.length+1);const command=final.journal.at(-1);assert.equal(command.action.type,'PlayHand');assert.equal(command.action.erxiangTargetId,fixture.targetId);assert.deepEqual([...command.action.selectedIds].sort(),[...undone.selected].sort());
 const expected=applyCommand(initial.state,command);assert.equal(expected.ok,true);assert.deepEqual(final.state,expected.state);assert.deepEqual(final.storage.current,makeCheckpoint(final.state,final.journal));assert.deepEqual(report.errors,[]);
 report.command=command;report.finalScore=final.state.lastTrace.finalScore;report.savedTarget=final.state.lastTrace.erxiangHandoff?.targetId;assert.equal(report.savedTarget,fixture.targetId);report.status='PASS';await page.screenshot({path:out+'/saved.png'});
}catch(error){report.status='FAIL';report.error=String(error.stack||error);process.exitCode=1;await page.screenshot({path:out+'/FAIL.png'}).catch(()=>{});}
finally{
 const video=page.video();await context.close();if(video)await rename(await video.path(),out+'/continuous.webm');
 await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/states.json.gz',gzipSync(JSON.stringify({initial,final})));
 console.log(JSON.stringify({status:report.status,steps:report.steps.map(s=>({label:s.label,target:s.target,selected:s.selected,candidates:s.candidates})),finalScore:report.finalScore,error:report.error},null,2));
 await browser.close();await new Promise(done=>server.httpServer.close(done));
}
