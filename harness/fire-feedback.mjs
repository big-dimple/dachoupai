/** D43: natural one-hand clears, actual mixed audio, reduced/mute/restore and saved preferences. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {chooseCharacter,tapUI,waitScene,tapMenuAction} from './ui.mjs';

const dir=process.env.FIRE_DIR||'shots/d43/fire/after',build=process.env.FIRE_BUILD||'shots/d43/fire/build',baseline=process.env.FIRE_BASELINE==='1';
await mkdir(dir,{recursive:true});
const report={baseline,build:JSON.parse(await readFile(build+'/build-info.json','utf8')),runs:[],limits:[
  'Natural normal-mode seed/role/hand through native mouse or CDP touch. No injected score, target, rules or RNG.',
  'Linux Chromium Canvas/DPR1 desktop and DPR3 touch emulation; physical OnePlus/WebGL performance and speaker listening NOT_RUN.',
  'MediaRecorder captures the actual app final mix. Isolated OfflineAudioContext uses runtime fire methods and equivalent master limiter graph, separately labelled.',
]};
const server=await preview({build:{outDir:build},preview:{host:'127.0.0.1',port:5227,strictPort:true},logLevel:'warn'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});report.browser=browser.version();
const wheel=['clubs-5','diamonds-14','clubs-4','diamonds-3','clubs-2'];
const specs=baseline?[{name:'ordinary-before',touch:true,seed:'p04-golden-02',character:'amo',ids:wheel,score:'600',tier:1}]:[
  {name:'ordinary-desktop',touch:false,seed:'p04-golden-02',character:'amo',ids:wheel,score:'600',tier:1},
  {name:'ordinary-touch',touch:true,seed:'p04-golden-02',character:'amo',ids:wheel,score:'600',tier:1},
  {name:'over-touch',touch:true,seed:'d43-fire-1',character:'laohuan',ids:['diamonds-7','diamonds-9','diamonds-4','diamonds-12','diamonds-10'],score:'1200',tier:2},
  {name:'extreme-touch',touch:true,seed:'d43-fire-267',character:'laohuan',ids:['diamonds-11','diamonds-13','diamonds-12','diamonds-10','diamonds-14'],score:'5589',tier:3},
  {name:'reduced-touch',touch:true,reduced:true,seed:'p04-golden-02',character:'amo',ids:wheel,score:'600',tier:1},
  {name:'muted-touch',touch:true,preferences:{version:2,music:0,sfx:0},seed:'p04-golden-02',character:'amo',ids:wheel,score:'600',tier:1},
  {name:'fast-forward-touch',touch:true,fastForward:true,seed:'p04-golden-02',character:'amo',ids:wheel,score:'600',tier:1},
];
const state=p=>p.evaluate(()=>window.__harness.game.registry.get('runController').state);
function wav(samples,sampleRate){const data=Buffer.alloc(44+samples.length*2);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(sampleRate,24);data.writeUInt32LE(sampleRate*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>data.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));return data;}
async function run(spec){
  const {name,touch}=spec,viewport=touch?{width:412,height:820}:{width:1280,height:800};
  const context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:touch?3:1,reducedMotion:spec.reduced?'reduce':'no-preference',recordVideo:{dir:dir+'/video',size:viewport}}),p=await context.newPage(),r={...spec,viewport,dpr:touch?3:1,checks:[],errors:[]};report.runs.push(r);
  p.on('pageerror',e=>r.errors.push(String(e)));p.on('dialog',d=>d.accept());
  await p.addInitScript(preferences=>{
    if(preferences)localStorage.setItem('dachoupai-audio-v2',JSON.stringify(preferences));
    // Observe final mixed output without changing app routing, volume, clock or commands.
    const connect=AudioNode.prototype.connect;
    AudioNode.prototype.connect=function(target,...rest){
      const result=connect.call(this,target,...rest);
      if(target instanceof AudioDestinationNode&&!window.__mixRecorder){
        const destination=this.context.createMediaStreamDestination();connect.call(this,destination);
        const recorder=new MediaRecorder(destination.stream),chunks=[],record={recorder,chunks,startedAt:performance.now()};window.__mixRecorder=record;
        recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.start();
      }
      return result;
    };
  },spec.preferences??null);
  try{
    await p.goto(`http://127.0.0.1:5227/?harness=1&seed=${spec.seed}`);await chooseCharacter(p,spec.character,touch);
    await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(400);await tapUI(p,'shop','action/start-stage',touch);await waitScene(p,'game');
    await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.length&&s.cardViews.every(v=>!v.dealing&&!v.back?.visible);});
    r.before=await state(p);assert.equal(r.before.stage.heat,'0');assert.equal(r.before.stage.targetHeat,'400');
    for(const id of spec.ids)await tapUI(p,'game','card/'+id,touch);
    await p.evaluate(()=>{
      const g=window.__harness.game,s=g.scene.getScene('game'),seen=new Set(),frames=[],rasters=[];
      const observe=()=>{
        const level=s.scoreFlame?.graphic.getData('intensity')??0;if(!s.scoreTotal?.active)return;
        const presentation=s.presentation;
        const row={at:performance.now(),renderer:g.renderer.gl?'WebGL':'Canvas',fps:g.loop.actualFps,level,product:s.scoreTotal.text,origin:presentation?.originHeat,credited:presentation?.credited,replay:presentation?.replay,
          phase:window.__harness.game.registry.get('runController').state.phase,heat:window.__harness.game.registry.get('runController').state.stage?.heat,
          voices:s.audio.fireVoices.size,ignition:!!s.audio.fireIgnition,fire:s.scoreFlame?{reduced:s.scoreFlame.reduced,textures:[s.scoreFlame.material,s.scoreFlame.frameMaterial].filter(Boolean).map(t=>({width:t.width,height:t.height})),bands:s.view.root.list.filter(o=>o.name.startsWith('score/fire-frame-')&&o.visible).map(o=>({name:o.name,interactive:!!o.input,bounds:o.getBounds()}))}:null};
        frames.push(row);
        if(level&&!seen.has(level)){seen.add(level);const copy=document.createElement('canvas');copy.width=g.canvas.width;copy.height=g.canvas.height;copy.getContext('2d').drawImage(g.canvas,0,0);rasters.push({level,at:row.at,canvas:copy});}
        // A later actual frame shows evolved plume shape, not only the first warm-up.
        if(level&&!seen.has('settled/'+level)&&rasters.some(f=>f.level===level&&row.at-f.at>450)){seen.add('settled/'+level);const copy=document.createElement('canvas');copy.width=g.canvas.width;copy.height=g.canvas.height;copy.getContext('2d').drawImage(g.canvas,0,0);rasters.push({level,at:row.at,settled:true,canvas:copy});}
      };
      window.__fireObservation={frames,rasters,observe};g.events.on('postrender',observe);
    });
    await tapUI(p,'game','action/play',touch);
    if(spec.fastForward){await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').scoreFlame?.graphic.getData('intensity')>0);await tapMenuAction(p,'快进当前手',touch);}
    await waitScene(p,'intermission');r.after=await state(p);
    assert.equal(r.after.lastTrace.finalScore,spec.score);assert.equal(r.after.stage.heat,spec.score);assert.equal(r.after.stage.playIndex,1);assert.equal(r.after.stage.handsLeft,3);assert.equal(r.after.phase,'stage-cleared');
    const observed=await p.evaluate(()=>{const g=window.__harness.game,o=window.__fireObservation;g.events.off('postrender',o.observe);return{frames:o.frames,rasters:o.rasters.map(({canvas,...rest})=>({...rest,png:canvas.toDataURL('image/png')}))};});
    r.frames=observed.frames;r.levels=[...new Set(r.frames.filter(f=>f.level).map(f=>f.level))];
    for(const image of observed.rasters){const path=`${dir}/${name}-fire-${image.level}${image.settled?'-settled':''}.png`;await writeFile(path,Buffer.from(image.png.split(',')[1],'base64'));}
    assert.ok(r.levels.includes(spec.tier),'one real first hand clear gets expected fire tier');
    for(const f of r.frames.filter(f=>f.level)){
      const total=BigInt(f.origin)+BigInt(f.product.replaceAll(',','')),target=400n;
      const expected=baseline?(total<=target?0:total>=2n*target?2:1):(total<target?0:total>=5n*target?3:total>=2n*target?2:1);
      assert.equal(f.level,expected,'fire follows same-frame displayed score, never future RNG');assert.equal(f.fire.bands.length,f.level>=2&&!spec.reduced?4:0);
      for(const band of f.fire.bands){assert.equal(band.interactive,false);assert.ok(Math.min(band.bounds.width,band.bounds.height)<=12.01);}
      if(spec.preferences?.sfx===0)assert.equal(f.voices,0);else assert.equal(f.voices,2,'exactly two owned burning loops');
    }
    r.checks.push('Natural first-hand score/clear and same-frame deterministic level; two bounded loops and noninteractive gutter');
    if(!baseline&&!spec.preferences)assert.ok(r.frames.some(f=>f.ignition),'real ignition source scheduled once');
    await p.screenshot({path:`${dir}/${name}-result.png`});
    assert.equal(await p.evaluate(()=>window.__harness.game.scene.getScene('game').audio.fireVoices.size),0,'burning cleaned on intermission');
    await tapMenuAction(p,'回看上一手',touch);
    assert.deepEqual(await state(p),r.after,'result-page public recap never commits another clear');
    assert.equal(await p.evaluate(()=>window.__harness.game.scene.getScene('game').audio.fireVoices.size),0);
    assert.equal(await p.evaluate(()=>!!window.__harness.game.scene.getScene('game').audio.fireIgnition),false);
    await p.locator('.run-menu-toggle').click();r.checks.push('Result-page public recap keeps score/RNG and does not restart ignition/burning');
    const mix=await p.evaluate(async()=>{
      const record=window.__mixRecorder;if(!record)return null;
      await new Promise(resolve=>{record.recorder.onstop=resolve;record.recorder.stop();});
      const blob=new Blob(record.chunks,{type:record.recorder.mimeType});
      const url=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
      return{startedAt:record.startedAt,stoppedAt:performance.now(),mime:blob.type,url};
    });
    if(mix){const path=`${dir}/${name}-mixed-audio.webm`;await writeFile(path,Buffer.from(mix.url.split(',')[1],'base64'));r.mixedAudio={path,startedAt:mix.startedAt,stoppedAt:mix.stoppedAt,mime:mix.mime};}
    // Actual runtime-generated samples, isolated for engineering comparison; not a speaker listening claim.
    if(name==='ordinary-before'||name==='ordinary-touch'||name==='extreme-touch'){
      const isolated=await p.evaluate(async({level,volume})=>{
        const Audio=window.__harness.game.scene.getScene('game').audio.constructor,engine=new Audio(),rate=48000,context=new OfflineAudioContext(1,Math.ceil(rate*1.2),rate);
        const gains={master:context.createGain(),music:context.createGain(),sfx:context.createGain(),ui:context.createGain()},compressor=context.createDynamicsCompressor(),ceiling=context.createWaveShaper(),curve=new Float32Array(1025);
        compressor.threshold.value=-11;compressor.knee.value=12;compressor.ratio.value=5;compressor.attack.value=.002;compressor.release.value=.12;
        for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=.9*Math.tanh(x*1.35)/Math.tanh(1.35);}ceiling.curve=curve;ceiling.oversample='2x';
        gains.music.connect(gains.master);gains.sfx.connect(gains.master);gains.ui.connect(gains.master);gains.master.connect(compressor);compressor.connect(ceiling);ceiling.connect(context.destination);
        engine.context=context;engine.gains=gains;engine.unlocked=true;engine.createFireBuffers(context);engine.setVolume('sfx',volume);engine.setScoreFire(level,{});
        const loops=engine.fireVoices.size,ignition=!!engine.fireIgnition;
        for(const voice of engine.voices)voice.source.stop(1.05);
        const rendered=await context.startRendering(),data=rendered.getChannelData(0);let peak=0,sum=0;
        for(const n of data){peak=Math.max(peak,Math.abs(n));sum+=n*n;}
        return{rate,peak,rms:Math.sqrt(sum/data.length),loops,ignition,samples:[...data]};
      },{level:spec.tier,volume:baseline?1:.8});
      const path=`${dir}/${name}-isolated-fire.wav`;await writeFile(path,wav(isolated.samples,isolated.rate));delete isolated.samples;r.isolatedAudio={...isolated,path};assert.ok(isolated.peak<.91&&isolated.rms>0);
    }
    await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'intermission');assert.deepEqual(await state(p),r.after,'refresh keeps score/RNG and never repeats clear');
    r.restoredAudio=await p.evaluate(()=>{const a=window.__harness.game.scene.getScene('game').audio;return{loops:a.fireVoices.size,ignition:!!a.fireIgnition,music:a.getVolume('music'),sfx:a.getVolume('sfx')};});
    assert.equal(r.restoredAudio.loops,0);assert.equal(r.restoredAudio.ignition,false);if(spec.preferences){assert.equal(r.restoredAudio.music,spec.preferences.music);assert.equal(r.restoredAudio.sfx,spec.preferences.sfx);}
    r.checks.push('Committed clear cleans burning; refresh/continue preserves result and preferences without fire replay');
    assert.deepEqual(r.errors,[]);r.status='PASS';
  }catch(e){r.status='FAIL';r.error=String(e);r.stack=e.stack;process.exitCode=1;await p.screenshot({path:`${dir}/${name}-failure.png`}).catch(()=>{});}
  finally{
    const video=p.video();await context.close();await video.saveAs(`${dir}/${name}.webm`);await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({name,status:r.status,score:r.after?.lastTrace?.finalScore,levels:r.levels,error:r.error}));
  }
}
async function preferences(){
  for(const spec of [
    {name:'fresh',expected:{music:.30,sfx:.80}},
    {name:'saved-v2',key:'dachoupai-audio-v2',saved:{version:2,music:.22,sfx:1},expected:{music:.22,sfx:1}},
    {name:'saved-v1',key:'dachoupai-audio-v1',saved:{master:.4},expected:{music:.088,sfx:.4}},
    {name:'muted-v2',key:'dachoupai-audio-v2',saved:{version:2,music:.35,sfx:0},expected:{music:.35,sfx:0}},
    {name:'legacy-muted',key:'dachoupai-presentation-v1',saved:{muted:true},expected:{music:0,sfx:0}},
  ]){
    const context=await browser.newContext({viewport:{width:412,height:820},hasTouch:true}),p=await context.newPage();
    if(spec.key)await p.addInitScript(({key,saved})=>{if(!sessionStorage.getItem('prefs-fixture')){localStorage.setItem(key,JSON.stringify(saved));sessionStorage.setItem('prefs-fixture','1');}},spec);
    const observe=()=>p.evaluate(()=>{const a=window.__harness.game.scene.getScene('game').audio;return{music:a.getVolume('music'),sfx:a.getVolume('sfx'),ui:a.getVolume('ui'),saved:JSON.parse(localStorage.getItem('dachoupai-audio-v2')??'null')};});
    const r={name:'preferences/'+spec.name,checks:[]};report.runs.push(r);
    try{
      await p.goto('http://127.0.0.1:5227/?harness=1');await waitScene(p,'title');r.initial=await observe();assert.ok(Math.abs(r.initial.music-spec.expected.music)<1e-10);assert.equal(r.initial.sfx,spec.expected.sfx);assert.equal(r.initial.ui,spec.expected.sfx);
      if(spec.name==='fresh'){
        await p.locator('.run-menu-toggle').tap();await p.locator('.run-menu-settings-tools summary').tap();
        const music=p.getByRole('slider',{name:'背景音量'}),sfx=p.getByRole('slider',{name:'音效音量'});assert.equal(await music.inputValue(),'30');assert.equal(await sfx.inputValue(),'80');
        await music.focus();await p.keyboard.press('Home');for(let i=0;i<7;i++)await p.keyboard.press('ArrowRight');
        await sfx.focus();await p.keyboard.press('Home');for(let i=0;i<12;i++)await p.keyboard.press('ArrowRight');
        r.manual=await observe();assert.deepEqual(r.manual.saved,{version:2,music:.07,sfx:.12});
        await p.screenshot({path:dir+'/manual-audio-preferences.png'});
      }
      await p.reload();await waitScene(p,'title');r.restored=await observe();assert.equal(r.restored.music,r.manual?.music??r.initial.music);assert.equal(r.restored.sfx,r.manual?.sfx??r.initial.sfx);r.status='PASS';r.checks.push('Actual first/legacy/saved/muted buses and reload; fresh native sliders save exact manual values');
    }catch(e){r.status='FAIL';r.error=String(e);process.exitCode=1;}
    finally{await context.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({name:r.name,status:r.status,error:r.error}));}
  }
}
try{for(const spec of specs)if(!process.env.FIRE_SCOPE||process.env.FIRE_SCOPE==='visual'||process.env.FIRE_SCOPE===spec.name)await run(spec);if(!baseline&&(!process.env.FIRE_SCOPE||process.env.FIRE_SCOPE==='preferences'))await preferences();}
finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));report.status=report.runs.every(r=>r.status==='PASS')?'PASS':'FAIL';await writeFile(dir+'/report.json',JSON.stringify(report,null,2));}
