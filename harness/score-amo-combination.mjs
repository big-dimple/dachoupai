/** Two explicit old/new Amo fixtures: actual ordered score playback and native recap. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {build,createServer,preview} from 'vite';
import {chromium} from 'playwright';
import {waitScene,tapUI,tapMenuAction} from './ui.mjs';

const dir='shots/score-amo-combination',port=5334,base='/score-amo-combination/';
await mkdir(dir,{recursive:true});
const legacy=JSON.parse(await readFile('tests/fixtures/r2-v10-amo-checkpoints.json','utf8'));
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});
let newer;
try {
  const rules=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),cp=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
  const state=structuredClone(legacy.before.state);
  state.contentVersion=rules.R2_CONTENT_VERSION;state.contentHash=rules.R2_CONTENT_HASH;
  newer=cp.makeCheckpoint(state,[]);assert.equal(cp.readCheckpoint(newer).ok,true);
}finally{await ssr.close();}
await build({mode:'e2e',base,build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({base,build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={runtimeSource:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),alignedMain:'04d2f729bbe37d7e34783f4a2a81b9026ff98a64',scoreReview:'76cd618564b2037aee98895e245ee71cfa4f5ddc',runs:[],scope:'Only two fixture routes,390x740/DPR1/safe12/34/softwareCanvas. Frozen old-v10 before checkpoint and explicitly retagged valid equivalent v11 hand; legal DOM import, not natural purchase. No art retakes,video,FPS or listening.',status:'IN_PROGRESS'};
const saved=p=>p.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,export:c.exportJSON()};});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function importFixture(p,checkpoint){
  await p.locator('.run-menu-toggle').tap();
  const section=p.getByText('进度与存档',{exact:true}).locator('..');
  if(!await section.evaluate(e=>e.open))await section.locator('summary').tap();
  const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).tap();
  await(await chooser).setFiles({name:'explicit-amo-rule-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
  await waitScene(p,'game');
  await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!v.back?.visible&&!s.tweens.isTweening(v.container));});
}
async function endPlayback(p){
  await p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||s.scene.isActive()&&!s.playing&&!s.presentation;});
}
async function instrumentation(p){
  await p.evaluate(()=>{
    const g=window.__harness.game,s=g.scene.getScene('game'),audio=s.audio,show=s.showScoreEvent,brush=audio.scoreBrush;
    const probe={called:[],frames:[],accents:[],committed:undefined};
    s.showScoreEvent=function(event,...args){probe.called.push({frame:g.loop.frame,at:performance.now(),eventId:event.eventId,source:event.sourceDefinitionId,phase:event.phase,replay:!!this.presentation?.replay});return show.call(this,event,...args);};
    audio.scoreBrush=function(presentation,eventId,level){probe.accents.push({frame:g.loop.frame,at:performance.now(),eventId,level,replay:!!presentation.replay});return brush.call(this,presentation,eventId,level);};
    const observe=()=>{
      const p=s.presentation;if(!p)return;
      const controller=g.registry.get('runController'),state=JSON.stringify({state:controller.state,journal:controller.journal,export:controller.exportJSON()});
      probe.committed??=state;
      const eventId=s.scoreTotal.getData('eventId'),event=p.score.events.find(e=>e.eventId===eventId),ink=s.scoreFlame;
      probe.frames.push({frame:g.loop.frame,at:performance.now(),eventId,source:event?.sourceDefinitionId,phase:event?.phase,visualPhase:s.scoreTotal.getData('eventPhase'),replay:p.replay,credited:p.credited,shown:s.scoreTotal.text,product:s.displayedScoreProduct,pulses:[s.scoreHeat,s.scoreMult,s.scoreTotal].map(o=>({requested:o.getData('scorePulseScale')??1,scale:o.scaleX})),brushState:ink?.graphic.getData('strokeState'),impactId:ink?.graphic.getData('lastImpact'),impactCount:ink?.graphic.getData('impactCount')??0,accentVoices:[...audio.voices].filter(v=>v.scoreAccent).length,savedStable:state===probe.committed});
    };
    const cleanup=()=>({brush:!!s.scoreFlame,nodes:s.view.root.list.filter(o=>o.name.startsWith('score/fire')).length,masks:s.children.list.filter(o=>o.name==='score/fire-safe-area').length,accentVoices:[...audio.voices].filter(v=>v.scoreAccent).length,pulses:[s.scoreHeat,s.scoreMult,s.scoreTotal].filter(o=>o?.active).map(o=>({requested:o.getData('scorePulseScale')??1,scale:o.scaleX}))});
    probe.observe=observe;probe.cleanup=cleanup;probe.restore=()=>{g.events.off('postrender',observe);s.showScoreEvent=show;audio.scoreBrush=brush;};
    window.__scoreAmoCombination=probe;g.events.on('postrender',observe);
  });
}
async function sample(p){return p.evaluate(()=>{const o=window.__scoreAmoCombination;return{called:o.called,frames:o.frames,accents:o.accents,cleanup:o.cleanup()};});}
function assertCleanup(value){
  assert.equal(value.brush,false);assert.equal(value.nodes,0);assert.equal(value.masks,0);assert.equal(value.accentVoices,0);
  assert.ok(value.pulses.every(p=>p.requested===1&&p.scale===1));
}
try {
  for(const spec of [{profile:'legacy-v10',checkpoint:legacy.before,score:'325'},{profile:'new-v11',checkpoint:newer,score:'525'}]){
    const context=await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:1,isMobile:true,hasTouch:true}),p=await context.newPage();
    const r={profile:spec.profile,status:'IN_PROGRESS',errors:[]};report.runs.push(r);p.on('pageerror',e=>r.errors.push(String(e)));
    await p.addInitScript(()=>{
      localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:false}));
      document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--safe-top','12px');document.documentElement.style.setProperty('--safe-bottom','34px');});
    });
    try {
      await p.goto(`http://127.0.0.1:${port}${base}?harness=1`);await waitScene(p,'title');await importFixture(p,spec.checkpoint);
      const before=await saved(p);assert.deepEqual(before.state,spec.checkpoint.state);
      await instrumentation(p);await tapUI(p,'game','card/spades-13',true);assert.deepEqual(await saved(p),before);
      await tapUI(p,'game','action/play',true);
      await p.waitForFunction(score=>window.__harness.game.registry.get('runController').state.lastTrace?.finalScore===score,spec.score);
      const committed=await saved(p);assert.equal(committed.state.contentVersion,before.state.contentVersion);assert.equal(committed.state.contentHash,before.state.contentHash);
      await endPlayback(p);assert.deepEqual(await saved(p),committed);
      r.original=await sample(p);assertCleanup(r.original.cleanup);assert.ok(r.original.frames.length>0);assert.ok(r.original.frames.every(f=>f.savedStable&&!f.replay));
      const expected=committed.state.lastTrace.events.filter(e=>e.phase!=='base'&&e.phase!=='finalScore'),ids=expected.map(e=>e.eventId);
      assert.deepEqual(r.original.called.map(e=>e.eventId),ids);
      const arrivals=[...new Map(r.original.frames.filter(f=>f.visualPhase==='impact').map(f=>[f.eventId,f])).values()];
      assert.deepEqual(arrivals.map(f=>f.eventId),ids,'actual rendered arrivals must retain every saved source in its saved order');
      r.actualArrivalOrder=arrivals.map(f=>({eventId:f.eventId,source:f.source,phase:f.phase,frame:f.frame,at:f.at,shown:f.shown,product:f.product}));
      const role=r.actualArrivalOrder.findIndex(e=>e.source==='amo'),joker=r.actualArrivalOrder.findIndex(e=>e.source==='pengci');
      assert.ok(spec.profile==='new-v11'?role>joker:role<joker);
      for(const e of expected){
        const f=arrivals.find(f=>f.eventId===e.eventId),a=e.after;
        assert.equal(f.product,(BigInt(a.H.n)*BigInt(a.M.n)/(BigInt(a.H.d)*BigInt(a.M.d))).toString(),'positive committed display lands at actual arrival');
      }
      const accentIds=[...ids,'award'];
      assert.deepEqual(r.original.accents.map(e=>e.eventId),accentIds);assert.equal(new Set(accentIds).size,accentIds.length);
      assert.ok(r.original.frames.some(f=>f.accentVoices>0),'actual audio schedule created owned short accents');
      const marker={called:r.original.called.length,frames:r.original.frames.length,accents:r.original.accents.length};
      await tapMenuAction(p,'回看上一手',true);
      if(spec.profile==='legacy-v10'){
        await p.waitForFunction(()=>window.__scoreAmoCombination.frames.some(f=>f.replay));await endPlayback(p);
        const observed=await sample(p);
        r.recap={route:'Actual animated GameScene recap',called:observed.called.slice(marker.called),frames:observed.frames.slice(marker.frames),accentCalls:observed.accents.slice(marker.accents),cleanup:observed.cleanup};
        assert.deepEqual(r.recap.called.map(e=>e.eventId),ids);assert.ok(r.recap.frames.length>0);
        assert.ok(r.recap.frames.every(f=>f.replay&&f.credited&&f.savedStable&&f.accentVoices===0&&f.impactCount===0&&f.pulses.every(v=>v.requested===1&&v.scale===1)));
        assert.deepEqual(r.recap.accentCalls,[]);assertCleanup(r.recap.cleanup);
      }else{
        // The production intermission recap is the saved ledger, with no animated replay route.
        const text=await p.locator('.run-menu-status').innerText();assert.ok(text.includes(spec.score));
        const roleAt=text.indexOf('amo.multiply-multiplier'),jokerAt=text.indexOf('pengci.add-multiplier');assert.ok(roleAt>jokerAt&&jokerAt>=0);
        const observed=await sample(p);
        r.recap={route:'Actual Intermission DOM ledger recap',text,addedFrames:observed.frames.length-marker.frames,accentCalls:observed.accents.slice(marker.accents),cleanup:observed.cleanup};
        assert.equal(r.recap.addedFrames,0);assert.deepEqual(r.recap.accentCalls,[]);assertCleanup(r.recap.cleanup);await p.locator('.run-menu-toggle').tap();
      }
      assert.deepEqual(await saved(p),committed);
      await p.evaluate(()=>window.__scoreAmoCombination.restore());
      await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',true);await waitScene(p,spec.profile==='new-v11'?'intermission':'game');assert.deepEqual(await saved(p),committed);
      r.score=committed.state.lastTrace.finalScore;r.contentVersion=committed.state.contentVersion;r.contentHash=committed.state.contentHash;r.commandSeq=committed.state.commandSeq;
      r.wholeStateJournalExportHash=hash(committed);r.savedDuringPresentationRecapAndReloadEqual=true;assert.deepEqual(r.errors,[]);r.status='PASS';
      console.log(JSON.stringify({profile:r.profile,status:r.status,score:r.score,actualArrivalOrder:r.actualArrivalOrder,recap:r.recap.route}));
    }catch(error){r.status='FAIL';r.error=String(error);r.stack=error.stack;throw error;}
    finally{await context.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');}
  }
  report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}
finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error}));}
