import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,tapMenuAction,openMenuSection} from './ui.mjs';
const root=process.env.SCORE_SOURCE_ROOT??process.cwd(),out=process.env.SCORE_SOURCE_OUT??'shots/score-source-process',baseline=!!process.env.SCORE_SOURCE_BASELINE,interaction=!!process.env.SCORE_SOURCE_INTERACTION,port=Number(process.env.SCORE_SOURCE_PORT??5586);
await mkdir(out,{recursive:true});
const fixtureServer=await createServer({server:{middlewareMode:true},logLevel:'error'});
const {scoreSourceProcessFixture}=await fixtureServer.ssrLoadModule('/harness/fixtures/score-source-process.ts'),{energySend}=await fixtureServer.ssrLoadModule('/harness/fixtures/score-energy.ts'),{makeCheckpoint,readCheckpoint}=await fixtureServer.ssrLoadModule('/src/application/checkpoint.ts');
await fixtureServer.close();
const server=await createServer({root,mode:'e2e',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
const settled=p=>p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')&&g.scene.getScene('intermission').ready||s.ready&&!s.presentation&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
const report={source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),srcDiff:execFileSync('git',['diff','--stat','HEAD','--','src'],{cwd:root,encoding:'utf8'}),baseline,interaction,browser:browser.version(),scope:'Three bounded controlled legitimate imported checkpoints, one actual native PlayHand/PlayAssistedHand each. PC1366x768/390x844 and narrow320 reduced-motion. Does not play a complete game or certify natural acquisition, physical device, audio or overall aesthetics.',cases:[]},states=[];
const specs=interaction?[{kind:'chain',width:1366,height:768,mode:'forward'},{kind:'chain',width:390,height:844,mode:'settings'},{kind:'billion',width:390,height:844,mode:'resize'}]:['ordinary','chain','billion'].flatMap(kind=>[{kind,width:1366,height:768,mode:'normal'},{kind,width:390,height:844,mode:'normal'}]).concat(baseline?[]:[{kind:'chain',width:390,height:844,mode:'reduce'},{kind:'billion',width:320,height:740,mode:'reduce'}]);
try{
 for(const spec of specs){
  const key=spec.kind+'-'+spec.width+'-'+spec.mode;if(process.env.SCORE_SOURCE_CASES&&!process.env.SCORE_SOURCE_CASES.split(',').includes(key))continue;
  const row={key,...spec,errors:[]};report.cases.push(row);const p=await browser.newPage({viewport:{width:spec.width,height:spec.height},hasTouch:spec.width<800,reducedMotion:spec.mode==='reduce'?'reduce':'no-preference'});p.setDefaultTimeout(40000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e.stack)));
  try{
   const f=scoreSourceProcessFixture(spec.kind),action=f.assistIds.length?{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}:{type:'PlayHand',selectedIds:f.selectedIds},expected=energySend(f.state,action),cp=makeCheckpoint(f.state,[]);assert.ok(readCheckpoint(cp).ok,'legitimate controlled input');assert.ok(readCheckpoint(makeCheckpoint(expected,[])).ok,'domain receipt validates');
   row.finalScore=expected.lastTrace.finalScore;row.accumulator=expected.lastTrace.accumulator;row.events=expected.lastTrace.events.map(e=>({eventId:e.eventId,operation:e.operation,source:e.sourceDefinitionId,phase:e.phase}));if(spec.kind==='billion')assert.ok(BigInt(row.finalScore)>=100000000n);
   await p.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'controlled-source-process.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(p,'game');await settled(p);
   const intro=p.getByRole('button',{name:'开始出牌',exact:true});if(await intro.count())await intro.click();if(await p.locator('.detail-dialog[open]').count())await p.getByRole('button',{name:'关闭',exact:true}).click();await p.evaluate(()=>document.fonts.ready);
   const initial=await saved(p);assert.deepEqual(initial.state,f.state);for(const id of f.selectedIds)await tapUI(p,'game','card/'+id,spec.width<800);if(f.assistIds.length)await tapUI(p,'game','selection/assist-recommend',spec.width<800);
   const targets=interaction?(spec.mode==='forward'?['hero']:spec.mode==='settings'?['edition']:['multiply']):spec.kind==='chain'?['edition','retrigger','repeat','add','hero']:spec.kind==='billion'?['multiply']:['heat'];
   await p.evaluate(({baseline,targets})=>{
    window.__sourceRows=[];window.__sourceMotion=[];window.__sourceMotionSeen=new Set();window.__sourceSeen=new Set();window.__sourceTargets=[...targets];window.__sourceCapture=null;window.__sourceFinished=false;
    const g=window.__harness.game;g.events.on('poststep',()=>{
     const s=g.scene.getScene('game'),id=s.scoreTotal?.getData('eventId'),phase=s.scoreTotal?.getData('eventPhase');
     if(!s.presentation){if(window.__sourceRows.length)window.__sourceFinished=true;return;}
     const live=s.resultText?.getData('scoreSourceProcess'),motionKey=id+'/'+phase;if(live&&!window.__sourceMotionSeen.has(motionKey)){window.__sourceMotionSeen.add(motionKey);window.__sourceMotion.push({eventId:id,phase,text:s.resultText.text,background:s.resultText.style.backgroundColor,interactive:!!s.resultText.input,reduced:s.reducedMotion,flight:s.view.root.list.some(o=>o.name==='score/source-flight-packet'&&o.active)});}
     if(phase!=='impact'||window.__sourceSeen.has(id)||window.__sourceCapture)return;
     const event=s.presentation.score.events.find(e=>e.eventId===id);if(!event)return;
     const cue=s.resultText.getData('scoreSourceProcess'),bounds=o=>{const b=o.getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height};};
     if(!baseline&&!cue)return;
     window.__sourceSeen.add(id);
     const total=s.scoreTotal,caption=s.resultText,walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),climax=s.heroClimax?.group.active?walk(s.heroClimax.group.list).filter(o=>['hero/climax-value-label','hero/climax-value','hero/climax-note','hero/climax-landing','hero/climax-portrait','hero/climax-source'].includes(o.name)).map(o=>({name:o.name,text:o.text,bounds:bounds(o)})):undefined;
     const row={eventId:id,event,climax,caption:caption.text,captionFull:caption.getData('fullText'),captionBounds:bounds(caption),captionHeight:caption.height,captionWrap:caption.style.wordWrapWidth,process:cue,processPhase:caption.getData('sourceProcessPhase'),label:s.scoreLabels[1].text,labelBounds:bounds(s.scoreLabels[1]),multiplier:s.scoreMult.text,multiplierBounds:bounds(s.scoreMult),total:total.text,totalFull:total.getData('fullText'),totalBounds:bounds(total),totalWrap:total.style.wordWrapWidth,board:s.view.layout.scoreBoard,hero:bounds(s.roleFrame),faces:[...s.cardViews,...s.settledCards.values()].map(v=>bounds(v.background)),buttons:[s.playButton,s.discardButton].map(bounds),heroClimax:!!s.heroClimax?.group.active,reduced:s.reducedMotion,flight:!!s.view.root.list.find(o=>o.name==='score/source-flight-packet'&&o.active)};
     window.__sourceRows.push(row);
     const kind=targets.find(k=>window.__sourceTargets.includes(k)&&(k==='heat'?event.sourceType==='card'&&event.operation==='add-heat':k==='edition'?event.reasonKey.startsWith('edition.'):k==='retrigger'?event.operation==='retrigger-card':k==='repeat'?event.retriggerDepth>0:k==='add'?event.sourceType==='joker'&&event.operation==='add-multiplier':k==='hero'?event.sourceType==='character':event.sourceDefinitionId==='a06'&&event.operation==='read-coefficient'));
     if(kind){window.__sourceTargets=window.__sourceTargets.filter(k=>k!==kind);window.__sourceCapture={kind,row};s.scene.pause();}
    });
   },{baseline,targets});
   await tapUI(p,'game','action/play',spec.width<800);row.captures=[];
   for(let i=0;i<targets.length;i++){
    await p.waitForFunction(()=>window.__sourceCapture||window.__sourceFinished);
    const capture=await p.evaluate(()=>window.__sourceCapture);if(!capture)break;
    const filename=key+'-'+capture.kind+'.png';await p.screenshot({path:out+'/'+filename,scale:'css'});row.captures.push({filename,...capture});
    await p.evaluate(()=>{window.__sourceCapture=null;window.__harness.game.scene.getScene('game').scene.resume();});
   }
   if(spec.mode==='forward'){await tapMenuAction(p,'快进当前手');row.actualMenuFastForward=true;}
   if(spec.mode==='settings'){await openMenuSection(p,'settings');await p.getByLabel('减少动态').check();await p.getByLabel('演出速度').selectOption('4');await p.getByRole('button',{name:'关闭菜单',exact:true}).click();row.actualSettings={reducedMotion:true,speed:4};}
   if(spec.mode==='resize'){await p.setViewportSize({width:320,height:740});row.actualResize={width:320,height:740};}
   await settled(p);row.motion=await p.evaluate(()=>window.__sourceMotion);assert.ok(row.motion.every(m=>!m.background&&!m.interactive),'source text has no flashing background or input handler');row.frames=await p.evaluate(()=>window.__sourceRows);assert.ok(row.frames.length);const final=await saved(p);assert.deepEqual(final.state,expected,'actual native saved result equals original domain command');
   if(!baseline){assert.equal(row.captures.length,targets.length,'each requested actual source is captured');for(const r of row.frames){assert.equal(r.processPhase,'impact');assert.equal(r.label,'累计倍率');assert.equal(r.captionWrap,0);assert.ok(!r.caption.includes('\n'));assert.ok(r.captionBounds.x>=0&&r.captionBounds.x+r.captionBounds.width<=spec.width+.1);assert.equal(r.totalWrap,0,'large score remains one numeric row');assert.ok(r.totalBounds.x>=0&&r.totalBounds.x+r.totalBounds.width<=spec.width+.1);const overlap=(a,b)=>a.x<b.x+b.width-1e-4&&b.x<a.x+a.width-1e-4&&a.y<b.y+b.height-1e-4&&b.y<a.y+a.height-1e-4;assert.ok(!r.faces.some(b=>overlap(r.captionBounds,b)),'source caption never paints a card face');assert.ok(!overlap(r.captionBounds,r.hero),'source caption outside hero face');assert.ok(!r.buttons.some(b=>overlap(r.captionBounds,b)),'caption outside actions');if(r.climax){const value=r.climax.find(t=>t.name==='hero/climax-value'),note=r.climax.find(t=>t.name==='hero/climax-note'),label=r.climax.find(t=>t.name==='hero/climax-value-label'),landing=r.climax.find(t=>t.name==='hero/climax-landing');assert.ok(label.text.startsWith('本源'));assert.ok(landing.text.startsWith('累计'));assert.ok(!overlap(value.bounds,note.bounds),'local source number never overlaps its note');}if(spec.mode==='reduce'){assert.equal(r.reduced,true);assert.equal(r.flight,false,'reduced motion disables flights');}}
    const cleanup=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {process:s.resultText?.getData('scoreSourceProcess'),label:s.scoreLabels?.[1].text};});assert.equal(cleanup.process,undefined);assert.notEqual(cleanup.label,'累计倍率');
   }
   await p.reload();await waitScene(p,'title');assert.deepEqual(await saved(p),final,'cold refresh preserves entire state, journal and storage');assert.deepEqual(row.errors,[]);states.push({key,initial,final});row.status='PASS';
  }catch(e){row.status='FAIL';row.error=e.stack;row.observed=await p.evaluate(()=>({rows:window.__sourceRows,targets:window.__sourceTargets,finished:window.__sourceFinished,scene:window.__harness?.game.scene.getScene('game').scoreTotal?.getData('eventPhase')})).catch(()=>undefined);await p.screenshot({path:out+'/'+key+'-FAIL.png',scale:'css'}).catch(()=>{});throw e;}finally{await p.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
 }
 if(process.env.SCORE_SOURCE_COMPARE){const previous=JSON.parse(gunzipSync(await readFile(process.env.SCORE_SOURCE_COMPARE)).toString());assert.deepEqual(states.filter(s=>previous.some(p=>p.key===s.key)),previous);report.baselineStateJournalStorageEqual=true;}
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await writeFile(out+'/states.json.gz',gzipSync(JSON.stringify(states)));console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.map(r=>({key:r.key,status:r.status,score:r.finalScore,captures:r.captures?.map(c=>c.kind),error:r.error}))}));await browser.close();await server.close();}
