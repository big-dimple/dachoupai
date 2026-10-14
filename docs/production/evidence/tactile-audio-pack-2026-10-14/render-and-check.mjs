import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const out=new URL('.',import.meta.url),origin=process.env.AUDIO_TEST_ORIGIN||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const report={browser:await browser.version(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Actual final WebAudio output; identical prerecorded-material timeline, music30/effects80. Audition fixture, not a game/natural high-score proof. Subjective/human hearing NOT_RUN.',heard:false,physicalDevice:false,rows:[]};
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.addInitScript(()=>{window.ceilingNodes=[];const create=AudioContext.prototype.createWaveShaper;AudioContext.prototype.createWaveShaper=function(...args){const node=create.apply(this,args);window.ceilingNodes.push(node);return node;};});
 await page.goto(origin+'/docs/production/evidence/tactile-audio-pack-2026-10-14/audition.html');await page.click('#prepare');
 await page.waitForFunction(()=>window.audioAudition?.ready);assert.equal(await page.evaluate(()=>window.audioAudition.after.scoreSamples.size),23);
 await page.waitForFunction(()=>window.audioAudition.after.musicElement?.readyState>=3&&!window.audioAudition.after.musicElement.paused);
 for(const version of ['before','after']){
  await page.evaluate(version=>{
   const app=window.audioAudition,ctx=app.after.context,dest=ctx.createMediaStreamDestination();window.ceilingNodes[0].connect(dest);window.captureDest=dest;
   window.chunks=[];window.recorder=new MediaRecorder(dest.stream,{mimeType:'audio/webm;codecs=opus'});window.recorder.ondataavailable=e=>window.chunks.push(e.data);window.recorder.start();
   window.calls=[];const engine=app[version],original=engine.recordedCue.bind(engine);engine.recordedCue=(...args)=>{const voice=original(...args);window.calls.push({sample:args[0],time:ctx.currentTime,delay:args[5],created:!!voice});return voice;};
   app.run(version);window.started=ctx.currentTime;
  },version);
  await page.waitForTimeout(18000);
  const row=await page.evaluate(async()=>{const bytes=await new Promise(resolve=>{window.recorder.onstop=async()=>resolve([...new Uint8Array(await new Blob(window.chunks,{type:'audio/webm'}).arrayBuffer())]);window.recorder.stop();});window.ceilingNodes[0].disconnect(window.captureDest);return {bytes,calls:window.calls,started:window.started,preferences:{music:window.audioAudition.after.getVolume('music'),sfx:window.audioAudition.after.getVolume('sfx')},voices:window.audioAudition.after.voices.size+window.audioAudition.before.voices.size};});
  assert.ok(row.bytes.length>10000);assert.equal(row.voices,0);assert.deepEqual(row.preferences,{music:.3,sfx:.8});
  await fs.writeFile(new URL(version+'.webm',out),Buffer.from(row.bytes));execFileSync('ffmpeg',['-y','-v','error','-i',new URL(version+'.webm',out).pathname,'-ac','1','-ar','48000',new URL(version+'.wav',out).pathname]);
  report.rows.push({version,audioBytes:row.bytes.length,started:row.started,calls:row.calls,voicesAfter:row.voices,preferences:row.preferences});
 }
 const metrics=[];
 const segments=[['gesture',0,.55],['landing',.6,1],['purchase',1.1,1.75],['ordinary',6,6.7],['chain',6.8,8.15],['key',8.2,9.05],['ordinary-award',9.2,10.2],['million',10.4,11.6],['hundred-million',11.8,13.2],['trillion',13.4,14.8],['success',15,16.3],['failure',16.5,18]];
 for(const version of ['before','after']){
  const pcm=execFileSync('ffmpeg',['-v','error','-i',new URL(version+'.wav',out).pathname,'-f','f32le','-ac','1','pipe:1'],{maxBuffer:8*1024*1024});
  const sampleRate=48000,total=pcm.length/4;
  const measure=(start,end)=>{let sum=0,peak=0,nearClipping=0,frames=0;for(let i=Math.floor(start*sampleRate);i<Math.min(total,Math.floor(end*sampleRate));i++){const value=pcm.readFloatLE(i*4);sum+=value*value;peak=Math.max(peak,Math.abs(value));if(Math.abs(value)>=.98)nearClipping++;frames++;}const rms=Math.sqrt(sum/Math.max(1,frames));return {peak,rms,dBFS:20*Math.log10(Math.max(rms,1e-12)),nearClipping};};
  const whole=measure(0,total/sampleRate);assert.equal(whole.nearClipping,0);assert.ok(whole.peak<.95);
  metrics.push({version,duration:total/sampleRate,...whole,segments:segments.map(([event,start,end])=>({event,start,end,...measure(start,end)}))});
 }
 await fs.writeFile(new URL('audio-metrics.json',out),JSON.stringify({scope:'Final output WAV including unchanged existing BGM, same event schedule and 30/80 settings. Whole clip peak/RMS/headroom only. Segment windows follow nominal wall-clock fixture timings, include BGM/tails and may drift with capture/device scheduling; not event-isolated or sample-accurate measurements. No subjective or perceptual quality claim.',heard:false,rows:metrics},null,2)+'\n');
 assert.deepEqual(errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}finally{await browser.close();await fs.writeFile(new URL('render-report.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,rows:report.rows.map(x=>({version:x.version,audioBytes:x.audioBytes,calls:x.calls.length}))}));}
