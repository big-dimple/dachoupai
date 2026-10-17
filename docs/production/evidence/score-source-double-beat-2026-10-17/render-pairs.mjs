import {build} from 'esbuild';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const base='8a9b3d995a980bc9147babc0f683b01f114e39bb',files=['src/audio/AudioEngine.ts','src/audio/foley.ts'];
const out=process.env.AUDIO_PROBE_OUTPUT??'shots/score-source-double-beat/recheck';await mkdir(out,{recursive:true});
const modules={};
for(const version of ['before','after']){
 const result=await build({stdin:{contents:"export {AudioEngine} from './src/audio/AudioEngine';export {scoreEnergyFixture,energySend} from './harness/fixtures/score-energy';export {numberImpact} from './src/game/ScoreEnergy';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'browser',format:'esm',write:false,define:{'import.meta.env':JSON.stringify({BASE_URL:'/',MODE:'test'})},plugins:version==='before'?[{name:'baseline',setup(builder){builder.onLoad({filter:/[/\\]src[/\\]audio[/\\](AudioEngine|foley)\.ts$/},args=>({contents:execFileSync('git',['show',base+':'+path.relative(process.cwd(),args.path).replaceAll('\\','/')],{encoding:'utf8'}),loader:'ts'}));}}]:[]});
 modules['/'+version+'.js']=result.outputFiles[0].contents;
}
const server=createServer((req,res)=>{try{
 const url=new URL(req.url,'http://localhost');if(modules[url.pathname]){res.setHeader('Content-Type','text/javascript');return res.end(modules[url.pathname]);}
 if(url.pathname.startsWith('/assets/')){const file=path.resolve('public','.'+url.pathname);if(!file.startsWith(path.resolve('public')+path.sep))throw Error('outside public');res.setHeader('Content-Type','audio/ogg');return res.end(fs.readFileSync(file));}
 res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Actual saved event double beat audio control</title>');
}catch(error){res.statusCode=500;res.end(String(error));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);
 for(const version of ['before','after']){
  const report=await page.evaluate(async version=>{
   const {AudioEngine,scoreEnergyFixture,energySend,numberImpact}=await import('/'+version+'.js');
   const f=scoreEnergyFixture('multiply'),score=energySend(f.state,{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}).lastTrace,saved=JSON.stringify(score),p={score};
   const positive=score.events.filter(e=>numberImpact(e,'100000000',1));
   const specs=[{label:'ordinary',event:positive[0],gap:.075},{label:'multiply',event:positive.find(e=>e.sourceDefinitionId==='f09'),gap:.095},{label:'fast-multiply',event:positive.find(e=>e.sourceDefinitionId==='amo'),gap:.05}];
   const rate=24000,ctx=new OfflineAudioContext(1,Math.ceil(1.9*rate),rate),engine=new AudioEngine();engine.context=ctx;engine.musicMuted=true;await engine.unlock();await engine.loadScoreSamples();
   let current;const rows=[],original=engine.recordedCue.bind(engine);engine.recordedCue=(...args)=>{const voice=original(...args);if(voice)current.layers.push({sample:args[0],start:voice.startsAt,end:voice.endsAt,rate:voice.source.playbackRate.value,peak:voice.peak});return voice;};
   const tasks=[];
   specs.forEach((spec,index)=>{
    const at=.2+index*.55,n=numberImpact(spec.event,'100000000',index+1);
    for(const phase of ['impact','rebound'])tasks.push(ctx.suspend(at+(phase==='rebound'?spec.gap:0)).then(()=>{
     current={label:spec.label,eventId:spec.event.eventId,source:spec.event.sourceDefinitionId,operation:spec.event.operation,kind:n.kind,phase,at:ctx.currentTime,layers:[]};
     if(phase==='impact')engine.scoreImpact(p,spec.event.eventId,n.kind,n.tier,n.chain,{paired:true,durationMs:150});
     else engine.scoreRebound?.(p,spec.event.eventId,{durationMs:50});
     rows.push(current);return ctx.resume();
    }));
   });
   const rendered=await ctx.startRendering();await Promise.all(tasks);const data=rendered.getChannelData(0),wav=new Uint8Array(44+data.length*2),v=new DataView(wav.buffer),str=(at,s)=>[...s].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));
   str(0,'RIFF');v.setUint32(4,wav.length-8,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,data.length*2,true);
   let peak=0,clipped=0;for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));if(Math.abs(data[i])>=.98)clipped++;v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,data[i]))*32767),true);}
   let binary='';for(let i=0;i<wav.length;i+=8192)binary+=String.fromCharCode(...wav.subarray(i,i+8192));
   return {version,scope:'Same existing controlled saved events, actual AudioEngine/OfflineAudioContext and production mix. Prescribed impact/rebound callbacks at75/95/50ms, not GameScene/Tween integration or human audition.',heard:false,traceUnchanged:JSON.stringify(score)===saved,settings:{music:0,sfx:engine.getVolume('sfx')},duration:rendered.duration,peak,clipped,rows,wav:btoa(binary)};
  },version);
  report.binding={base,sha256NormalizedLF:Object.fromEntries(files.map(file=>[file,createHash('sha256').update((version==='before'?execFileSync('git',['show',base+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')).replaceAll('\r\n','\n')).digest('hex')]))};
  if(report.clipped||!report.traceUnchanged||version==='after'&&report.rows.some(r=>!r.layers.length))throw Error('Double-beat control failed');
  await writeFile(path.join(out,version+'.wav'),Buffer.from(report.wav,'base64'));delete report.wav;await writeFile(path.join(out,version+'.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({version,peak:report.peak,clipped:report.clipped,rows:report.rows.map(r=>({label:r.label,phase:r.phase,at:r.at,layers:r.layers.length}))}));
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
