import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,extname} from 'node:path';
import {createServer as createHttpServer} from 'node:http';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createServer,build} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene,openMenuSection,point} from './ui.mjs';

const out=process.env.OWNED_MOTION_OUT??'shots/owned-joker-score-motion',entry='.vite/owned-joker-motion-entry.html',bundle='.vite/owned-joker-motion-build',port=5596;
await mkdir(out,{recursive:true});await mkdir('.vite',{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},logLevel:'error'});
const {scoreSourceProcessFixture}=await ssr.ssrLoadModule('/harness/fixtures/score-source-process.ts');
const {energySend}=await ssr.ssrLoadModule('/harness/fixtures/score-energy.ts');
const {makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
const {ownedJokerMotionCue}=await ssr.ssrLoadModule('/src/game/OwnedJokerScoreMotion.ts');
const {r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts');
const probe=`<script type="module">
import {AudioEngine} from '/src/audio/AudioEngine.ts';
window.ownedProbe={start(record=false){
 const game=window.__harness.game,probe=window.__owned={frames:[],audio:[],rebounds:[],voices:[],replayCues:[],images:[],events:{},violations:[],finished:false};
 const audio=AudioEngine.shared,original=audio.scoreImpact.bind(audio),originalRebound=audio.scoreRebound.bind(audio),originalCue=audio.cue.bind(audio);
 const admitted=(id,phase,call)=>{const before=new Set(audio.voices);const result=call();probe.voices.push(...[...audio.voices].filter(v=>!before.has(v)).map(v=>({id,phase,at:performance.now(),semantic:v.semantic,startsAt:v.startsAt,endsAt:v.endsAt,rate:v.source.playbackRate?.value})));return result;};
 audio.cue=(...args)=>{if(game.scene.getScene('game').presentation?.replay)probe.replayCues.push(args[0]);return originalCue(...args);};
 audio.scoreImpact=(...args)=>{const s=game.scene.getScene('game');probe.audio.push({id:args[1],kind:args[2],at:performance.now(),numericId:s.scoreTotal?.getData('eventId'),numericPhase:s.scoreTotal?.getData('eventPhase'),paired:!!args[5]?.paired,durationMs:args[5]?.durationMs,signal:!!args[5]?.signal});return admitted(args[1],'impact',()=>original(...args));};
 audio.scoreRebound=(...args)=>{const s=game.scene.getScene('game'),m=[...s.jokerViews.values()].find(m=>m.getData('scoreMotionEventId')===args[1]);probe.rebounds.push({id:args[1],at:performance.now(),phase:m?.getData('scoreMotionPhase'),durationMs:args[2]?.durationMs,signal:!!args[2]?.signal});return admitted(args[1],'rebound',()=>originalRebound(...args));};
 let finishRecording;const recording=record&&audio.context&&audio.gains?(()=>{const destination=audio.context.createMediaStreamDestination();audio.gains.master.connect(destination);const canvas=game.canvas.captureStream(30),stream=new MediaStream([...canvas.getVideoTracks(),...destination.stream.getAudioTracks()]),recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus',videoBitsPerSecond:1600000}),chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};const done=new Promise(resolve=>{finishRecording=resolve;});recorder.onstop=async()=>{const blob=new Blob(chunks,{type:recorder.mimeType}),reader=new FileReader();reader.onload=()=>{probe.recordedWebm=reader.result.split('base64,')[1];stream.getTracks().forEach(t=>t.stop());audio.gains.master.disconnect(destination);finishRecording();};reader.readAsDataURL(blob);};recorder.start();return {recorder,done};})():undefined;
 const box=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
 const tick=()=>{const s=game.scene.getScene('game');if(!s.scene.isActive()||!s.view?.root.active){if(!s.presentation&&Object.keys(probe.events).length)probe.finished=true;return;}
  const cards=[];for(const [source,marker] of s.jokerViews){const visual=marker.getData('scorePoseRoot');if(!visual?.active)continue;const id=marker.getData('scoreMotionEventId'),phase=marker.getData('scoreMotionPhase'),tier=marker.getData('scoreMotionTier');
   const c={source,id,phase,tier,outer:[marker.x,marker.y,marker.angle,marker.scaleX,marker.scaleY],inner:[visual.x,visual.y,visual.angle,visual.scaleX,visual.scaleY],frame:box(marker.getData('frame')),hit:marker.getData('hit')?box(marker.getData('hit')):undefined,rays:marker.list.filter(o=>o.name==='owned-joker/score-rays'&&o.active).length,values:visual.list.filter(o=>o.name==='owned-joker/score-value'||o.name==='source/impact').map(o=>o.text)};cards.push(c);
   if(!id)continue;const e=probe.events[id]??={id,source,tier,phases:[],positive:0,negative:0,first:performance.now(),last:0,impactAt:null,reboundAt:null};e.last=performance.now();if(!e.phases.includes(phase))e.phases.push(phase);if(phase==='impact')e.impactAt??=performance.now();if(phase==='rebound')e.reboundAt??=performance.now();e.positive=Math.max(e.positive,visual.angle);e.negative=Math.min(e.negative,visual.angle);
   if(phase!=='rest'&&(Math.abs(marker.x-marker.getData('baseX'))>.001||Math.abs(marker.y-marker.getData('baseY'))>.001||marker.angle!==0||marker.scaleX!==1||marker.scaleY!==1))probe.violations.push('outer moved:'+id);
   if(c.rays>1)probe.violations.push('duplicate rays:'+id);
  }
  const edges=[],walk=list=>{for(const o of list){if(o.name==='card/polychrome-iridescence')edges.push({bounds:o.getData('bounds'),phase:o.getData('phase'),motion:o.getData('motion'),parent:o.parentContainer.name});if(o.list)walk(o.list);}};walk(s.view.root.list);
  const row={at:performance.now(),playing:s.playing,presentation:!!s.presentation,numericId:s.scoreTotal?.getData('eventId'),numericPhase:s.scoreTotal?.getData('eventPhase'),H:s.scoreHeat?.text,M:s.scoreMult?.text,cards,edges,scoreVoices:[...audio.voices].filter(v=>v.scoreAccent).length};if(row.scoreVoices>6)probe.violations.push('score voice budget');if(probe.frames.length<5000)probe.frames.push(row);
  const active=cards.find(c=>c.phase==='impact'||c.phase==='rebound');if(active){const key=active.tier+'-'+(active.inner[2]<-1?'left':active.inner[2]>1?'right':'center');if(!probe.images.some(i=>i.key===key)&&probe.images.length<9)probe.images.push({key,...row,png:game.canvas.toDataURL('image/png')});}
  if(!s.presentation&&Object.keys(probe.events).length)probe.finished=true;
 };game.events.on('postrender',tick);probe.stop=async()=>{game.events.off('postrender',tick);audio.scoreImpact=original;audio.scoreRebound=originalRebound;audio.cue=originalCue;if(recording){recording.recorder.stop();await recording.done;}};
},snapshot(){const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal};}};
</script>`;
await writeFile(entry,(await readFile('index.html','utf8')).replace('</body>',probe+'</body>'));
await ssr.close();
console.log('building owned-source sample');await build({mode:'e2e',base:'./',build:{outDir:bundle,rollupOptions:{input:entry}},logLevel:'error'});console.log('compiled sample ready');
const server=createHttpServer(async(request,response)=>{
 const path=decodeURIComponent(new URL(request.url,'http://localhost').pathname),roots=path==='/'?[resolve(bundle,entry)]:[resolve(bundle,'.'+path),resolve('public','.'+path)];
 for(const file of roots){if(!file.startsWith(resolve(bundle))&&!file.startsWith(resolve('public')))continue;try{const data=await readFile(file);response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]??'application/octet-stream');response.end(data);return;}catch{}}
 response.writeHead(404);response.end();
});await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}),sources:Object.fromEntries(await Promise.all(['src/game/GameScene.ts','src/game/OwnedJokerScoreMotion.ts','src/game/layout.ts','src/game/PolychromeCardIridescence.ts','src/audio/AudioEngine.ts'].map(async path=>[path,createHash('sha256').update((await readFile(path,'utf8')).replaceAll('\r\n','\n')).digest('hex')]))),scope:'One compiled build, actual public checkpoint import, native selection and PlayHand. Domain oracle exact state/journal comparison; real render-boundary card transforms and actual WebAudio voice admission times. Controlled inventory, no natural acquisition, physical phone, hearing or subjective feel acceptance.',cases:[]};
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});report.browser=browser.version();
const specs=[{key:'pc',width:1366,height:768,dpr:1},{key:'phone',width:390,height:740,dpr:2},{key:'small',width:320,height:568,dpr:2},{key:'short',width:844,height:390,dpr:1},{key:'reduced',width:390,height:740,dpr:2,reduced:true,speed:4},{key:'fast',width:390,height:740,dpr:2,speed:4},{key:'cancel-windup',width:1366,height:768,dpr:1,boundary:true,cancel:'windup'},{key:'cancel-rebound',width:390,height:740,dpr:2,boundary:true,cancel:'rebound'},{key:'background',width:390,height:740,dpr:2,boundary:true,interrupt:'background'},{key:'destroy',width:1366,height:768,dpr:1,boundary:true,interrupt:'destroy'}].filter(s=>!process.env.OWNED_MOTION_CASES||process.env.OWNED_MOTION_CASES.split(',').includes(s.key));
const menu=async(p,label,touch)=>{await openMenuSection(p,'playback',touch);const button=p.getByRole('button',{name:label,exact:true});if(touch)await button.tap();else await button.click();};
try{for(const spec of specs){
 const fixture=scoreSourceProcessFixture('chain');fixture.assistIds=[];fixture.state.jokers.push(r2CreateJoker('mantangcai','controlled/source-process/4',8,'polychrome',fixture.state));if(spec.boundary){fixture.selectedIds=fixture.selectedIds.slice(0,1);fixture.state.jokers=fixture.state.jokers.filter(j=>j.definitionId==='f09');}fixture.state.stage.initialJokerIds=fixture.state.jokers.map(j=>j.instanceId);
 const action=fixture.assistIds.length?{type:'PlayAssistedHand',selectedIds:fixture.selectedIds,assistIds:fixture.assistIds}:{type:'PlayHand',selectedIds:fixture.selectedIds};
 let expected=energySend(fixture.state,action),cues=expected.lastTrace.events.map(e=>ownedJokerMotionCue(expected.lastTrace,e)).filter(Boolean);const checkpoint=makeCheckpoint(fixture.state,[]);assert.ok(readCheckpoint(checkpoint).ok);if(!spec.boundary)assert.equal(new Set(cues.map(c=>c.tier)).size,3);
 const dir=out+'/'+spec.key;await mkdir(dir,{recursive:true});
 const viewport={width:spec.width,height:spec.height},context=await browser.newContext({viewport,deviceScaleFactor:spec.dpr,hasTouch:spec.width<800,reducedMotion:spec.reduced?'reduce':'no-preference',recordVideo:{dir,size:viewport}}),p=await context.newPage(),row={...spec,cues,expectedPhase:expected.phase,errors:[]};report.cases.push(row);p.setDefaultTimeout(90000);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
 try{
  if(spec.speed)await p.addInitScript(speed=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed})),spec.speed);
  console.log(spec.key+': loading local compiled page');await p.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(p,'title');console.log(spec.key+': title ready');
  await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
  await p.screenshot({path:dir+'/import-menu.png'});row.importMenu=await p.locator('.run-menu-modal').innerText();
  const chooser=p.waitForEvent('filechooser');chooser.catch(()=>{});await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'owned-motion-public.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
  await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.every(v=>!v.dealing);});console.log(spec.key+': real public import ready');
  const intro=p.getByRole('button',{name:'开始本场',exact:true});if(await intro.count())await intro.click();if(await p.locator('.detail-dialog[open]').count())await p.getByRole('button',{name:'关闭',exact:true}).click();
  const initial=await p.evaluate(()=>ownedProbe.snapshot());
  row.layout=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {mode:s.view.layout.mode,slots:s.view.layout.slots,help:s.tableHelpBox(),cards:[...s.jokerViews.values()].map(m=>({nameVisible:m.getData('nameLabel')?.visible,valueVisible:m.getData('valueLabel')?.visible,isStroked:m.getData('frame').isStroked,accessible:m.getData('accessibleLabel')})),aria:s.ownedInput.surface.getAttribute('aria-label')};});
  assert.equal(row.layout.cards.length,spec.boundary?1:5);assert.ok(row.layout.cards.every(c=>!c.nameVisible&&!c.valueVisible&&!c.isStroked&&c.accessible));assert.ok(row.layout.help.x>=0&&row.layout.help.y>=0&&row.layout.help.x+row.layout.help.width<=spec.width&&row.layout.help.y+row.layout.help.height<=spec.height);
  await tapUI(p,'game','selection/source-benefits',spec.width<800);assert.ok((await p.locator('.detail-dialog[open]').innerText()).includes('本场与选牌帮助'));await p.keyboard.press('Escape');assert.deepEqual(await p.evaluate(()=>ownedProbe.snapshot()),initial);row.help=true;
  if(['pc','phone'].includes(spec.key)){
   if(spec.key==='pc'){
    const at=await point(p,'game','joker/'+fixture.state.jokers[0].instanceId);await p.mouse.move(at.x,at.y);await p.waitForTimeout(180);const a=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),v=[...s.jokerViews.values()][0].getData('scorePoseRoot');return {pose:[v.x,v.y,v.angle,v.scaleX,v.scaleY],panel:!!s.jokerHoverPreview?.active};});await p.waitForTimeout(140);const b=await p.evaluate(()=>{const v=[...window.__harness.game.scene.getScene('game').jokerViews.values()][0].getData('scorePoseRoot');return [v.x,v.y,v.angle,v.scaleX,v.scaleY];});assert.ok(a.panel);assert.deepEqual(a.pose,b);await p.mouse.move(1,1);row.hoverFrozen=true;
    await p.locator('.shop-owned-input').focus();await p.keyboard.press('ArrowRight');await p.keyboard.press('Enter');await p.locator('.detail-dialog[open]').waitFor();await p.keyboard.press('Escape');row.keyboard=true;
   }else {await tapUI(p,'game','joker/'+fixture.state.jokers[0].instanceId,true);await p.locator('.detail-dialog[open]').waitFor();await p.keyboard.press('Escape');row.nativeTap=true;}
   assert.deepEqual(await p.evaluate(()=>ownedProbe.snapshot()),initial);
   const cdp=spec.key==='phone'?await context.newCDPSession(p):undefined;
   for(const [from,to] of [[0,4],[4,0]]){
    const before=await p.evaluate(()=>ownedProbe.snapshot()),ids=before.state.jokers.map(j=>j.instanceId),a=await point(p,'game','joker/'+ids[from]),b=await point(p,'game','joker/'+ids[to]);
    if(cdp)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:1,radiusX:8,radiusY:8,force:1}]});else {await p.mouse.move(a.x,a.y);await p.mouse.down();}
    await p.waitForTimeout(420);if(cdp){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x,y:b.y,id:1,radiusX:8,radiusY:8,force:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else {await p.mouse.move(b.x,b.y,{steps:8});await p.mouse.up();}
    await p.waitForFunction(seq=>{const c=window.__harness.game.registry.get('runController');return c.status==='idle'&&c.state.commandSeq===seq+1;},before.state.commandSeq);ids.splice(to,0,ids.splice(from,1)[0]);fixture.state=energySend(before.state,{type:'ReorderJokers',ids});assert.deepEqual((await p.evaluate(()=>ownedProbe.snapshot())).state,fixture.state);
   }
   row.nativeReorder=true;expected=energySend(fixture.state,action);cues=expected.lastTrace.events.map(e=>ownedJokerMotionCue(expected.lastTrace,e)).filter(Boolean);row.cues=cues;
  }
  for(const id of fixture.selectedIds)await tapUI(p,'game','card/'+id,spec.width<800);if(fixture.assistIds.length)await tapUI(p,'game','selection/assist-recommend',spec.width<800);
  assert.deepEqual((await p.evaluate(()=>ownedProbe.snapshot())).state,fixture.state);await p.evaluate(record=>ownedProbe.start(record),['pc','phone','fast'].includes(spec.key));await p.screenshot({path:dir+'/selected.png'});await tapUI(p,'game','action/play',spec.width<800);const reminder=p.getByRole('button',{name:'继续出牌',exact:true});if(await reminder.count())await reminder.click();
  if(spec.cancel){await p.waitForFunction(phase=>{const s=window.__harness.game.scene.getScene('game');return [...s.jokerViews.values()].some(m=>m.getData('scoreMotionPhase')===phase);},spec.cancel);await menu(p,'快进当前手',spec.width<800);}
  if(spec.interrupt){await p.waitForFunction(()=>[...window.__harness.game.scene.getScene('game').jokerViews.values()].some(m=>m.getData('scoreMotionPhase')==='impact'));
   if(spec.interrupt==='background'){const other=await context.newPage();await other.goto('about:blank');await other.bringToFront();const nativeHidden=await p.evaluate(()=>document.hidden);row.visibilityMethod=nativeHidden?'native tab':'synthetic visibility event; headless tab activation stayed visible';
    if(!nativeHidden)await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await p.waitForTimeout(80);row.hidden=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {hidden:document.hidden,voices:s.audio.voices.size,poses:[...s.jokerViews.values()].map(m=>{const v=m.getData('scorePoseRoot');return [v.x,v.y,v.angle,v.scaleX,v.scaleY];})};});assert.ok(row.hidden.hidden);assert.equal(row.hidden.voices,0);assert.ok(row.hidden.poses.every(p=>JSON.stringify(p)==='[0,0,0,1,1]'));await p.bringToFront();await other.close();if(!nativeHidden)await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});}
   else {row.beforeDestroy=await p.evaluate(()=>ownedProbe.snapshot());await p.evaluate(()=>window.__harness.game.scene.stop('game'));row.afterDestroy=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {voices:s.audio.voices.size,active:s.scene.isActive(),size:s.jokerViews.size};});assert.equal(row.afterDestroy.voices,0);assert.equal(row.afterDestroy.active,false);assert.equal(row.afterDestroy.size,0);}
  }
  await p.waitForFunction(()=>window.__owned.finished);const saved=await p.evaluate(()=>ownedProbe.snapshot());assert.deepEqual(saved.state,expected);assert.equal(saved.journal.at(-1).action.type,action.type);row.stateExact=true;
  const observed=await p.evaluate(async()=>{const r=window.__owned;await r.stop();return {...r,stop:undefined};});if(observed.recordedWebm){const video=Buffer.from(observed.recordedWebm,'base64');assert.ok(video.length>1000,'actual media bytes');await writeFile(dir+'/av-continuous.webm',video);delete observed.recordedWebm;row.recordedWebAudio=true;}
  row.events=Object.values(observed.events);row.audio=observed.audio;row.rebounds=observed.rebounds;row.voices=observed.voices;row.frames=observed.frames.length;row.violations=[...new Set(observed.violations)];
  await writeFile(dir+'/frames.json.gz',gzipSync(JSON.stringify(observed.frames)));
  for(const img of observed.images){await writeFile(dir+'/'+img.key+'.png',Buffer.from(img.png.split(',')[1],'base64'));delete img.png;}row.images=observed.images;
  if(!spec.cancel&&!spec.interrupt){for(const cue of cues){const e=row.events.find(e=>e.id===cue.eventId);assert.ok(e?.phases.includes('impact'),cue.eventId+' arrived');if(!spec.reduced){assert.ok(e.positive>1&&e.negative< -1,cue.eventId+' both sway directions');assert.ok(e.phases.includes('rebound'));}else assert.equal(e.positive-e.negative,0);}
   const sequence=row.events.filter(e=>e.impactAt).sort((a,b)=>a.impactAt-b.impactAt);assert.ok(sequence.some((e,i)=>i&&e.source!==sequence[i-1].source),'two distinct owned sources in sequence');
   for(const cue of cues){const a=row.audio.filter(a=>a.id===cue.eventId&&['add','key','multiply'].includes(a.kind));assert.equal(a.length,1,cue.eventId+' one main impact');const e=row.events.find(e=>e.id===cue.eventId);assert.ok(Math.abs(e.impactAt-a[0].at)<110,'arrival/pose/audio within rendered frame budget');assert.equal(a[0].numericPhase,'impact');}
   if(!spec.reduced)for(const cue of cues){const a=row.audio.find(a=>a.id===cue.eventId&&a.paired),r=row.rebounds.filter(r=>r.id===cue.eventId);assert.ok(a?.signal);assert.equal(r.length,1,'one actual rebound callback');assert.equal(r[0].phase,'rebound');assert.ok(r[0].at-a.at>=45,'two beats remain separated at real speed');assert.ok(r[0].at-a.at<=150,'quick second landing');assert.ok(row.voices.some(v=>v.id===cue.eventId&&v.phase==='impact'),'real first voices admitted');assert.ok(row.voices.some(v=>v.id===cue.eventId&&v.phase==='rebound'),'real second voices admitted');}
  }
  assert.ok(row.events.every(e=>cues.some(c=>c.eventId===e.id)),'no fake source motion');assert.deepEqual(row.violations,[]);assert.deepEqual(row.errors,[]);
  const clean=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return [...s.jokerViews.values()].filter(m=>m.active).map(m=>({phase:m.getData('scoreMotionPhase'),inner:(()=>{const v=m.getData('scorePoseRoot');return v?[v.x,v.y,v.angle,v.scaleX,v.scaleY]:undefined;})(),rays:m.list.some(o=>o.name==='owned-joker/score-rays'&&o.active)}));});assert.ok(clean.every(c=>!c.rays&&Math.abs(c.inner[0])<=.81&&Math.abs(c.inner[1])<=2.81&&Math.abs(c.inner[2])<=1.61&&c.inner[3]<=1&&c.inner[4]<=1));row.clean=clean;
  if(spec.boundary&&spec.interrupt!=='destroy'){assert.equal(expected.phase,'await-input');await p.evaluate(()=>ownedProbe.start());const beforeReplay=await p.evaluate(()=>ownedProbe.snapshot());await menu(p,'回看上一手',spec.width<800);await p.waitForFunction(()=>window.__owned.finished);const replay=await p.evaluate(async()=>{const r=window.__owned;await r.stop();return {events:Object.values(r.events),audio:r.audio,rebounds:r.rebounds,cues:r.replayCues};});assert.deepEqual(await p.evaluate(()=>ownedProbe.snapshot()),beforeReplay);assert.equal(replay.audio.length,0);assert.equal(replay.rebounds.length,0);assert.deepEqual(replay.cues,[]);row.replay=replay;
   // Real Scene lifecycle, after a real replay: no stale objects or state changes.
   await p.evaluate(()=>window.__harness.game.scene.stop('game'));assert.deepEqual(await p.evaluate(()=>ownedProbe.snapshot()),beforeReplay);row.sceneStopped=true;
  }
  await p.screenshot({path:dir+'/clean.png'});row.status='PASS';console.log(JSON.stringify({key:spec.key,status:row.status,frames:row.frames,events:row.events.length,tiers:[...new Set(row.events.map(e=>e.tier))]}));
 }catch(error){row.status='FAIL';row.failure=String(error.stack);await p.screenshot({path:dir+'/FAIL.png'}).catch(()=>{});throw error;}
 finally{const video=p.video();await context.close();if(video)await rename(await video.path(),dir+'/continuous.webm');}
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error.stack);process.exitCode=1;console.error(report.failure);}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));}
