import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {tapUI,waitScene} from './ui.mjs';

const out=resolve(process.env.HERO_ATTACHMENT_OUT??'shots/hero-attachments'),port=5698;
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:resolve('shots/hero-attachments-vite'),optimizeDeps:{noDiscovery:true,include:['phaser']},server:{host:'127.0.0.1',port,strictPort:true,watch:null},logLevel:'error'});await server.listen();
const {heroAttachmentFixture}=await server.ssrLoadModule('/harness/fixtures/hero-attachments.ts'),{applyCommand}=await server.ssrLoadModule('/src/domain/run.ts'),{makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts'),{savedHeroAttachment}=await server.ssrLoadModule('/src/game/HeroAttachmentFacts.ts');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:{},scope:'Actual GameScene and SavedRun public checkpoint import. Su Shi uses native card selection, assist shortcut and play input; this fixture shortcut directly chooses the group, so dialog selection is not covered. Other heroes use controlled legal Scene drafts and real save/presentation methods; not full native-input, natural-acquisition, hearing or physical-device acceptance.',cases:[],status:'RUNNING'};
for(const f of ['src/game/GameScene.ts','src/game/HeroTargetAttachment.ts','src/game/HeroTargetAttachmentState.ts','src/game/HeroAttachmentFacts.ts'])report.sourceHashes[f]=createHash('sha256').update(await readFile(f)).digest('hex');
const browser=await chromium.launch({headless:true});report.browser=browser.version();
const heroes=['amo','erxiang','azao','xiemu','touye','laohuan'];
const snapshot=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:await c.store.read()};});
const edges=p=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),walk=list=>list.flatMap(o=>[...(o.name==='hero/target-edge'?[{targetId:o.getData('targetId'),kind:o.getData('attachmentKind'),members:o.getData('memberIds'),phase:o.getData('phase'),flow:o.getData('flowPhase'),eventId:o.getData('eventId'),bounds:o.getBounds?.()}]:[]),...(o.list?walk(o.list):[])]);return walk(s.children.list);});
async function changedExterior(a,b,{faces,exclusions}){
 const first=await sharp(a).ensureAlpha().raw().toBuffer({resolveWithObject:true}),second=await sharp(b).ensureAlpha().raw().toBuffer();let changed=0;
 const inside=(x,y,r,pad=0)=>x>=r.x-pad&&x<=r.x+r.width+pad&&y>=r.y-pad&&y<=r.y+r.height+pad;
 // The existing call-to-action aura is outside this component's ownership.
 for(let y=0;y<first.info.height;y++)for(let x=0;x<first.info.width;x++)if(faces.some(r=>inside(x,y,r,9))&&!faces.some(r=>inside(x,y,r))&&!exclusions.some(r=>inside(x,y,r,6))){const i=(y*first.info.width+x)*4;if(Math.max(...[0,1,2].map(c=>Math.abs(first.data[i+c]-second[i+c])))>5)changed++;}return changed;
}
try{for(const phone of [false,true])for(const hero of heroes){
 const key=(phone?'390':'1366')+'-'+hero;if(process.env.HERO_ATTACHMENT_CASES&&!process.env.HERO_ATTACHMENT_CASES.split(',').includes(key))continue;
 const dir=resolve(out,key);await mkdir(dir,{recursive:true});const viewport={width:phone?390:1366,height:phone?844:768},f=heroAttachmentFixture(hero),checkpoint=makeCheckpoint(f.state,[]);assert.ok(readCheckpoint(checkpoint).ok);
 const row={key,viewport,errors:[],checks:[],status:'RUNNING'};report.cases.push(row);
 const context=await browser.newContext({viewport,deviceScaleFactor:phone?2:1,hasTouch:phone,recordVideo:{dir:resolve(dir,'raw'),size:viewport}}),p=await context.newPage();p.setDefaultTimeout(25000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e)));
 try{
  await p.addInitScript(()=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:false})));
  console.log(key+': import');await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'hero-target-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
  await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.length&&s.cardViews.every(v=>!v.dealing);});if(await p.locator('.detail-dialog[open]').count())await p.keyboard.press('Escape');
  const before=await snapshot(p);
  if(hero==='amo'){
   for(const id of f.selectedIds)await tapUI(p,'game','card/'+id,phone);await tapUI(p,'game','hero/action-shortcut',phone);
   // Exact instance provenance, not a score estimate or recommended-option assumption.
   if(await p.locator('.amo-assist-dialog[open]').count()){
    const option=p.locator('.amo-assist-option').filter({has:p.locator('button[aria-label="选择助攻 K♠ K♥"]')});
    if(await option.count())await option.locator('button').click();else await p.locator('.amo-assist-option[data-ids="spades-13|hearts-13"] button').click();
   }
   assert.deepEqual((await p.evaluate(()=>window.__harness.game.scene.getScene('game').assistIds)).slice().sort(),f.assistIds.slice().sort());
  }else await p.evaluate(f=>{const s=window.__harness.game.scene.getScene('game');s.selectedIds=new Set(f.selectedIds);s.erxiangTargetId=f.targetId??null;s.azaoRelease=!!f.action.azaoRelease;s.xiemuBurn=f.action.xiemuBurn??0;s.refreshSelection();},f);
  await p.waitForTimeout(350);row.pending=await edges(p);assert.equal(row.pending.length,['azao','xiemu'].includes(hero)?1:f.targetIds.length,key+' pending count');assert.deepEqual([...new Set(row.pending.flatMap(e=>e.members))].sort(),[...f.targetIds].sort());
  row.labels=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),buttons=[s.heroActionButton,s.inventoryButton,s.playButton,s.discardButton,s.rankButton,s.suitButton,s.aiButton].filter(o=>o?.active&&o.visible).map(o=>o.getBounds()),walk=list=>list.flatMap(o=>[...(o.name==='hero/target-tag'?[{text:o.text,bounds:o.getBounds()}]:[]),...(o.list?walk(o.list):[])]);return walk(s.children.list).map(t=>({...t,intersectsControl:buttons.some(b=>t.bounds.x<b.right&&t.bounds.right>b.x&&t.bounds.y<b.bottom&&t.bounds.bottom>b.y)}));});assert.ok(row.labels.every(t=>!t.intersectsControl),key+' tag covers control');
  const faces=await p.evaluate(ids=>{const s=window.__harness.game.scene.getScene('game');return {exclusions:[s.heroActionButton,s.inventoryButton,s.playButton,s.discardButton,s.rankButton,s.suitButton,s.aiButton].filter(o=>o?.active&&o.visible).map(o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};}),faces:ids.map(id=>{const {container,width,height}=s.targetAttachment.options.target(id),m=container.getWorldTransformMatrix(),a=m.transformPoint(-width/2,-height/2),b=m.transformPoint(width/2,height/2);return {x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};})};},f.targetIds);row.rasterMask=faces;
  const start=performance.now(),rasters=[];row.samples=[];for(const wait of [0,1100,1100,1100]){if(wait)await p.waitForTimeout(wait);row.samples.push({elapsed:performance.now()-start,edges:await edges(p)});rasters.push(await p.screenshot({scale:'css'}));}assert.ok(row.samples.at(-1).elapsed>=3300);assert.ok(new Set(row.samples.map(s=>s.edges[0]?.flow)).size>2,key+' continuous idle flow');row.changedExteriorPixels=await changedExterior(rasters[0],rasters.at(-1),faces);assert.ok(row.changedExteriorPixels>0,key+' no rendered exterior movement');assert.deepEqual(await snapshot(p),before,key+' preview writes state');row.checks.push('>=3.3 seconds continuous idle flow without input; actual exterior pixels change; state/journal/storage unchanged; exact instances only; labels avoid controls');await writeFile(resolve(dir,'pending-start.png'),rasters[0]);await writeFile(resolve(dir,'pending.png'),rasters.at(-1));
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(160);const reducedA=await edges(p),reducedRasterA=await p.screenshot({scale:'css'});await p.waitForTimeout(300);const reducedB=await edges(p),reducedRasterB=await p.screenshot({scale:'css'});assert.ok(reducedA.length);assert.ok(reducedA.every(e=>e.flow===0));assert.deepEqual(reducedA.map(e=>e.flow),reducedB.map(e=>e.flow));row.reducedExteriorPixels=await changedExterior(reducedRasterA,reducedRasterB,faces);row.reduced=reducedB;await writeFile(resolve(dir,'reduced-start.png'),reducedRasterA);await writeFile(resolve(dir,'reduced.png'),reducedRasterB);assert.equal(row.reducedExteriorPixels,0);await p.emulateMedia({reducedMotion:'no-preference'});row.checks.push('reduced motion keeps semantic static edges; no flowing phase or exterior pixel changes');
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await edges(p)).length,0);await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await p.waitForTimeout(200);assert.ok((await edges(p)).every(e=>e.phase==='idle'));row.checks.push('hidden removes visuals; return resumes idle without replaying travel');
  if(hero==='amo'||hero==='erxiang'){
   await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');s.assistIds=[];s.erxiangTargetId=null;s.refreshSelection();});assert.equal((await edges(p)).length,0);await p.evaluate(f=>{const s=window.__harness.game.scene.getScene('game');s.assistIds=f.assistIds??[];s.erxiangTargetId=f.targetId??null;s.refreshSelection();},f);row.checks.push('cancel removes exact pending target; fresh deliberate draft can reattach');
  }
  await p.evaluate(()=>{
   const g=window.__harness.game,s=g.scene.getScene('game'),probe=window.attachmentProbe={frames:[],shots:{}};
   const tick=()=>{if(!s.scene.isActive())return;const walk=list=>list.flatMap(o=>[...(o.name==='hero/target-edge'?[{targetId:o.getData('targetId'),members:o.getData('memberIds'),phase:o.getData('phase'),eventId:o.getData('eventId'),labelText:o.getData('labelText')}]:[]),...(o.list?walk(o.list):[])]),edges=walk(s.children.list),frame={at:performance.now(),edges,scoreEvent:s.scoreTotal?.getData('eventId'),scorePhase:s.scoreTotal?.getData('eventPhase')};if(probe.frames.length<2500)probe.frames.push(frame);if(edges.some(e=>e.phase==='release')&&!probe.shots.release)probe.shots.release=g.canvas.toDataURL('image/png').split('base64,')[1];};g.events.on('postrender',tick);probe.stop=()=>g.events.off('postrender',tick);
  });
  console.log(key+': real save/presentation');if(hero==='amo')await tapUI(p,'game','action/play',phone);else await p.evaluate(hero=>{const s=window.__harness.game.scene.getScene('game');if(hero==='laohuan')void s.chooseRefill();else void s.playSelected(true);},hero);
  await p.waitForFunction(seq=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.registry.get('runController').state.commandSeq>seq&&(g.scene.isActive('intermission')||!s.playing&&!s.presentation&&!s.refillPresentation);},f.state.commandSeq);
  const after=await snapshot(p);assert.equal(after.journal.length,before.journal.length+1);const result=applyCommand(before.state,after.journal.at(-1));assert.ok(result.ok);assert.deepEqual(after.state,result.state,key+' real saved state differs from canonical command');const fact=hero==='laohuan'?undefined:savedHeroAttachment(after.state.lastTrace,hero);
  const observed=await p.evaluate(()=>{attachmentProbe.stop();return {frames:attachmentProbe.frames,shots:attachmentProbe.shots};});const release=observed.frames.filter(f=>f.edges.some(e=>e.phase==='release'));assert.ok(release.length,key+' no actual release observed');row.release=release;
  if(fact){assert.ok(release.some(frame=>frame.scoreEvent===fact.event.eventId&&frame.scorePhase==='impact'));assert.ok(release.every(frame=>frame.edges.every(e=>e.eventId===fact.event.eventId)));assert.deepEqual([...new Set(release.flatMap(frame=>frame.edges.flatMap(e=>e.members)))].sort(),[...fact.targetIds].sort());row.expectedEvent={id:fact.event.eventId,reason:fact.event.reasonKey,targetIds:fact.targetIds};}
  else {assert.equal(after.state.lastTrace?.events?.length??0,before.state.lastTrace?.events?.length??0);assert.deepEqual([...new Set(release.flatMap(frame=>frame.edges.flatMap(e=>e.members)))].sort(),[...f.targetIds].sort());row.expectedEvent={kind:'saved ChooseRefill receipt, no ScoreEvent',targetIds:f.targetIds};}
  if(hero==='touye')assert.ok(release.every(frame=>frame.edges.filter(e=>e.phase==='release').every(e=>e.labelText==='已参与'||e.labelText==='已成')),key+' resolved wager must not retain pending shorthand');
  for(const [name,data]of Object.entries(observed.shots))await writeFile(resolve(dir,name+'.png'),Buffer.from(data,'base64'));
  assert.equal((await edges(p)).length,0,key+' final cleanup');row.checks.push('actual command saved once; canonical state equals domain result; release follows actual source impact; completed presentation removes all edges');
  row.cleanup=await p.evaluate(()=>{const g=window.__harness.game,s=g.scene.getScene('game');s.targetAttachment?.destroy();g.scene.stop('game');const walk=list=>list.some(o=>o.name?.startsWith('hero/target-')||o.list&&walk(o.list));return !walk(s.children.list);});assert.ok(row.cleanup);assert.deepEqual(row.errors,[]);row.status='PASS';console.log(key+': PASS');
 }catch(error){row.status='FAIL';row.failure=String(error.stack||error);await p.screenshot({path:resolve(dir,'failure.png'),scale:'css'}).catch(()=>{});throw error;}
 finally{const video=p.video();await context.close();if(video)await rename(await video.path(),resolve(dir,'process.webm'));await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
}report.status='PASS';}catch(error){report.status='FAIL';throw error;}
finally{await writeFile(resolve(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({key:c.key,status:c.status}))}));
