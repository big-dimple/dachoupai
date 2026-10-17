import {createServer} from 'node:http';
import {build} from 'esbuild';
import path from 'node:path';
import fs from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

// Same public controlled fixtures and arrivals for both versions. This deliberately
// renders audio alone: integrated GameScene/action-peak synchronization is pending.
const base='7f40cd1b07d2fac8c0cddfb0860ba79fb27ba5b6';
const out=process.env.AUDIO_PROBE_OUTPUT??'shots/score-audio-density/recheck';
const audioFiles=['src/audio/AudioEngine.ts','src/audio/foley.ts','src/audio/mixPolicy.ts'];
await mkdir(out,{recursive:true});
const entry=`export {AudioEngine} from './src/audio/AudioEngine';
export {numberImpact,impactBeat} from './src/game/ScoreEnergy';
export {scoreBeat} from './src/game/scorePresentation';
export {scoreEnergyFixture,energySend} from './harness/fixtures/score-energy';
export {finaleReady} from './harness/fixtures/finale';`;
const modules={};
for(const version of ['before','after']){
 const result=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'browser',format:'esm',write:false,
  define:{'import.meta.env':JSON.stringify({BASE_URL:'/',MODE:'test'})},plugins:version==='before'?[{name:'baseline-audio',setup(builder){
   builder.onLoad({filter:/[/\\]src[/\\]audio[/\\](AudioEngine|foley|mixPolicy)\.ts$/},args=>({contents:execFileSync('git',['show',base+':'+path.relative(process.cwd(),args.path).replaceAll('\\','/')],{encoding:'utf8'}),loader:'ts'}));
  }}]:[]});
 modules['/'+version+'.js']=result.outputFiles[0].contents;
}
const server=createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(modules[url.pathname]){res.setHeader('Content-Type','text/javascript');res.end(modules[url.pathname]);return;}
  if(url.pathname.startsWith('/assets/')){
   const file=path.resolve('public','.'+url.pathname);if(!file.startsWith(path.resolve('public')+path.sep))throw Error('outside public');
   res.setHeader('Content-Type','audio/ogg');res.end(fs.readFileSync(file));return;
  }
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Controlled score audio comparison</title>');
 }catch(error){res.statusCode=500;res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 for(const version of ['before','after']){
  const report=await page.evaluate(async version=>{
   const {AudioEngine,numberImpact,impactBeat,scoreBeat,scoreEnergyFixture,energySend,finaleReady}=await import('/'+version+'.js');
   const scenarios=['simple','sources','late-4x'].map(label=>{
    let state,action;
    if(label==='late-4x'){state=finaleReady();action={type:'PlayHand',selectedIds:state.handOrder.slice(0,5)};}
    else{const f=scoreEnergyFixture(label==='simple'?'ordinary':'multiply');state=f.state;action=f.assistIds.length?{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}:{type:'PlayHand',selectedIds:f.selectedIds};}
    const scored=energySend(state,action);return {label,score:scored.lastTrace,speed:label==='late-4x'?4:1};
   });
   let cursor=.25;
   const arrivals=[],segments=[];
   for(const {label,score,speed} of scenarios){
    const start=cursor,presentation={score};let chain=0;
    score.events.forEach((event,index)=>{
     const number=numberImpact(event,'100000000',chain+1);if(!number)return;
     if(number.kind==='multiply')chain++;
     const beat=impactBeat(scoreBeat(event,index),number);
     // One already-committed event clock: no independent cue timers.
     cursor+=(beat.windup+beat.flight)/1000/speed;
     arrivals.push({presentation,event,number,at:cursor,durationMs:beat.impact/speed,segment:label});
     cursor+=(beat.impact+beat.rest)/1000/speed;
    });
    segments.push({label,start,end:cursor,speed,finalScore:score.finalScore,events:arrivals.filter(a=>a.segment===label).length,traceUnchanged:JSON.stringify(score)});
    cursor+=.7;
   }
   const sampleRate=24000,ctx=new OfflineAudioContext(2,Math.ceil((cursor+.3)*sampleRate),sampleRate),engine=new AudioEngine();
   engine.context=ctx;engine.musicMuted=true;await engine.unlock();await engine.loadScoreSamples();
   const hits=[];let current;
   const original=engine.recordedCue.bind(engine);
   engine.recordedCue=(...args)=>{
    const voice=original(...args);if(voice)current.layers.push({sample:args[0],rate:voice.source.playbackRate.value,start:voice.startsAt,end:voice.endsAt,peak:voice.peak});return voice;
   };
   const tasks=arrivals.map(a=>ctx.suspend(a.at).then(()=>{
    current={eventId:a.event.eventId,segment:a.segment,phase:a.event.phase,operation:a.event.operation,sourceType:a.event.sourceType,sourceInstanceId:a.event.sourceInstanceId,sourceDefinitionId:a.event.sourceDefinitionId,targetCardId:a.event.targetCardId,retriggerDepth:a.event.retriggerDepth,kind:a.number.kind,arrival:ctx.currentTime,durationMs:a.durationMs,layers:[]};
    engine.scoreImpact(a.presentation,a.event.eventId,a.number.kind,a.number.tier,a.number.chain,{durationMs:a.durationMs});
    current.activeNumeric=[...engine.voices].filter(v=>v.semantic?.startsWith('score')&&v.startsAt<=ctx.currentTime&&v.endsAt>ctx.currentTime).length;
    hits.push(current);return ctx.resume();
   }));
   const rendered=await ctx.startRendering();await Promise.all(tasks);
   const channels=[rendered.getChannelData(0),rendered.getChannelData(1)];
   const metrics=(start,end)=>{
    let sum=0,peak=0,clipped=0,count=0;
    for(const data of channels)for(let i=Math.floor(start*sampleRate);i<Math.min(data.length,Math.floor(end*sampleRate));i++){
     const v=data[i];sum+=v*v;peak=Math.max(peak,Math.abs(v));clipped+=Math.abs(v)>=.98?1:0;count++;
    }
    return {peak,rms:Math.sqrt(sum/Math.max(1,count)),clipped};
   };
   const pcm=new Uint8Array(44+rendered.length*4),v=new DataView(pcm.buffer);
   const str=(at,text)=>[...text].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
   str(0,'RIFF');v.setUint32(4,pcm.length-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,sampleRate,true);v.setUint32(28,sampleRate*4,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,pcm.length-44,true);
   for(let i=0;i<rendered.length;i++)for(let c=0;c<2;c++)v.setInt16(44+i*4+c*2,Math.round(Math.max(-1,Math.min(1,channels[c][i]))*32767),true);
   let binary='';for(let at=0;at<pcm.length;at+=8192)binary+=String.fromCharCode(...pcm.subarray(at,at+8192));
   for(const s of segments){s.unchanged=scenarios.find(x=>x.label===s.label)&&JSON.stringify(scenarios.find(x=>x.label===s.label).score)===s.traceUnchanged;delete s.traceUnchanged;Object.assign(s,metrics(s.start,s.end+.2));}
   const layers=hits.flatMap(h=>h.layers),peakLayerOverlap=Math.max(...layers.map(l=>layers.filter(other=>other.start<=l.start&&other.end>l.start).length));
   return {version,heard:false,scope:'Same existing controlled legal saved trace -> numberImpact -> actual AudioEngine, real OfflineAudioContext with production buses/compressor/ceiling. Audio-only prescribed scoreBeat arrivals; not natural acquisition, GameScene/action-peak recording, human audition or physical device.',sampleRate,duration:rendered.duration,settings:{music:0,sfx:engine.getVolume('sfx')},segments,hits,peakLayerOverlap,...metrics(0,rendered.duration),wav:btoa(binary)};
  },version);
  report.binding={base,headAtRender:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha256NormalizedLF:Object.fromEntries(audioFiles.map(file=>[file,createHash('sha256').update((version==='before'?execFileSync('git',['show',base+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')).replaceAll('\r\n','\n')).digest('hex')]))};
  await writeFile(path.join(out,version+'.wav'),Buffer.from(report.wav,'base64'));delete report.wav;
  await writeFile(path.join(out,version+'.json'),JSON.stringify(report,null,2)+'\n');
  if(report.clipped||report.segments.some(s=>!s.unchanged)||report.hits.some(h=>!h.layers.length))throw Error('Audio output or trace invariant failed');
  console.log(JSON.stringify({version,duration:report.duration,peak:report.peak,clipped:report.clipped,segments:report.segments.map(({label,events,peak})=>({label,events,peak})),maxNumeric:Math.max(...report.hits.map(h=>h.activeNumeric))}));
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
