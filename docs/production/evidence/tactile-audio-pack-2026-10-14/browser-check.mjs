import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
const root=new URL('.',import.meta.url),origin=process.env.AUDIO_TEST_ORIGIN||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const report={browser:await browser.version(),heard:false,physicalDevice:false,scope:'Real Chromium/WebAudio on touch viewport; controlled loader failures/lifecycle/mix. Viewport is not physical Android/iOS or speaker acceptance.',cases:[]};
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(origin+'/docs/production/evidence/tactile-audio-pack-2026-10-14/audition.html');
 assert.equal(await page.evaluate(()=>!!window.audioAudition.after.context),false);
 // Weak network + first transient + permanent missing family: actual OGG decode.
 const counts=new Map();let active=0,peak=0;
 await page.route('**/assets/audio/**/*.ogg',async route=>{
  const path=new URL(route.request().url()).pathname,count=(counts.get(path)||0)+1;counts.set(path,count);active++;peak=Math.max(peak,active);
  try{await new Promise(resolve=>setTimeout(resolve,150));
   if(path.endsWith('/card-slide-1.ogg'))return route.fulfill({status:404,body:'missing'});
   if(path.endsWith('/card-slide-2.ogg')&&count===1)return route.abort('failed');
   return await route.continue();
  }finally{active--;}
 });
 const prepare=await page.locator('#prepare').boundingBox();await page.touchscreen.tap(prepare.x+prepare.width/2,prepare.y+prepare.height/2);
 await page.waitForFunction(()=>window.audioAudition.ready,null,{timeout:20000});
 const loaded=await page.evaluate(()=>({samples:window.audioAudition.after.scoreSamples.size,state:window.audioAudition.after.context.state,volumes:{music:window.audioAudition.after.getVolume('music'),sfx:window.audioAudition.after.getVolume('sfx')}}));
 assert.equal(loaded.samples,22);assert.equal(loaded.state,'running');assert.ok(peak<=3);assert.equal([...counts].find(([path])=>path.endsWith('/card-slide-1.ogg'))[1],3);assert.equal([...counts].find(([path])=>path.endsWith('/card-slide-2.ogg'))[1],2);
 report.cases.push({name:'touch unlock / 150ms responses / transient recovery / permanent sibling fallback',status:'PASS',...loaded,peakFetch:peak,attempts:Object.fromEntries(counts)});
 const checks=await page.evaluate(async()=>{
  const e=window.audioAudition.after,created=[],native=e.context.createBufferSource.bind(e.context);e.context.createBufferSource=()=>{const source=native();created.push(source);return source;};
  e.select();const sibling=created[0].buffer===e.scoreSamples.get('card-slide-2');
  e.setVolume('music',.07);e.setVolume('sfx',1);const show={score:{finalScore:'1000000000000'}};
  e.muted=true;e.scoreImpact(show,'muted','award',3);const muted=created.length;e.muted=false;await e.unlock();e.scoreImpact(show,'muted','award',3);const afterMuted=created.length;
  e.setSuspended(true);e.scoreImpact(show,'background','award',3);const background=created.length;e.setSuspended(false);await e.unlock();e.scoreImpact(show,'background','award',3);const afterBackground=created.length;
  e.context.currentTime;const before=created.length;e.scoreImpact(show,'fresh','award',3);const fresh=created.length-before,activeVoices=e.voices.size;e.cancelPresentation();const cancel=e.voices.size;
  const requestsBefore=e.sampleAttempts.size;await e.unlock();const requestsAfter=e.sampleAttempts.size;
  e.setVolume('sfx',0);e.select();const zero=created.length;e.setVolume('sfx',1);
  return {sibling,muted,afterMuted,background,afterBackground,fresh,activeVoices,cancel,requestsBefore,requestsAfter,zero,created:created.length,preferences:{music:e.getVolume('music'),sfx:e.getVolume('sfx')}};
 });
 assert.equal(checks.sibling,true);assert.equal(checks.muted,checks.afterMuted);assert.equal(checks.background,checks.afterBackground);assert.equal(checks.fresh,6);assert.equal(checks.cancel,0);assert.equal(checks.requestsBefore,checks.requestsAfter);assert.equal(checks.zero,checks.created);assert.deepEqual(checks.preferences,{music:.07,sfx:1});
 report.cases.push({name:'real sibling fallback / muted+background cues consumed / fresh trillion rhythm / cancellation / custom7+100 / exactzero',status:'PASS',...checks});
 const stress=await page.evaluate(async()=>{
  const e=window.audioAudition.after,{FOLEY}=await import('/src/audio/foley.ts');e.cueTimes.clear();e.variants.clear();const snapshots=[];
  for(let round=0;round<100;round++)for(const kind of Object.keys(FOLEY)){e.cue(kind);snapshots.push([...e.voices].map(v=>({at:v.startsAt,end:v.endsAt,priority:v.priority})));}
  let maximum=0;for(const voices of snapshots)for(const event of voices)maximum=Math.max(maximum,voices.filter(v=>v.at<=event.at&&v.end>event.at).length);
  const retained=e.voices.size;e.muted=true;return {maximum,retained,cleaned:e.voices.size,calls:100*Object.keys(FOLEY).length};
 });
 assert.ok(stress.maximum<=16);assert.ok(stress.retained<=32);assert.equal(stress.cleaned,0);assert.deepEqual(errors,[]);
 report.cases.push({name:'all semantic families / synchronous 100-round cross-event saturation / actual sources / mute cleanup',status:'PASS',...stress});
 const unsupported=await context.newPage();let audioRequests=0;
 await unsupported.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
 unsupported.on('request',request=>{if(/assets\/audio\/.*\.(ogg|mp3)/.test(request.url()))audioRequests++;});
 await unsupported.goto(origin+'/docs/production/evidence/tactile-audio-pack-2026-10-14/audition.html');await unsupported.click('#prepare');
 const unsupportedState=await unsupported.evaluate(()=>({context:!!window.audioAudition.after.context,ready:window.audioAudition.ready,message:document.querySelector('#status').textContent}));
 assert.equal(unsupportedState.context,false);assert.equal(unsupportedState.ready,false);assert.equal(audioRequests,0);
 report.cases.push({name:'unavailable WebAudio API / no audio fetch or crash',status:'PASS',...unsupportedState,audioRequests});
 await context.close();report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}finally{await browser.close();await fs.writeFile(new URL('browser-report.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
