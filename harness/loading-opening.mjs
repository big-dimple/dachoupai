import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const out=process.env.LOADING_ART_OUTPUT??'docs/production/evidence/loading-opening-2026-10-15';
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:'/tmp/loading-opening-vite',server:{host:'127.0.0.1',port:5593,strictPort:true},logLevel:'error'});await server.listen();
const {sceneResources}=await server.ssrLoadModule('/src/game/SceneResources.ts');const startupTotal=sceneResources('title',undefined,true).length;assert.equal(startupTotal,146);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
const report={base:'9c41dfff2a66ffa66b5cf812c2742caae9cdf125',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),browser:browser.version(),scope:'Native real preload, software Chromium; bounded controlled transport delays expose animation. No physical device / subjective user acceptance.',cases:[]};
try{
 for(const spec of [{width:1366,height:900},{width:390,height:844},{width:320,height:568},{width:390,height:844,osReduce:true},{width:320,height:740,appReduce:true},{width:1366,height:900,weak:true}].filter(s=>!process.env.LOADING_ART_CASE||process.env.LOADING_ART_CASE===`${s.width}-${s.osReduce?'os-reduce':s.appReduce?'app-reduce':s.weak?'cpu4':'motion'}`)){
  const name=`${spec.width}-${spec.osReduce?'os-reduce':spec.appReduce?'app-reduce':spec.weak?'cpu4':'motion'}`;
  const ctx=await browser.newContext({...(process.env.LOADING_VIDEO==='1'&&!spec.weak&&!spec.appReduce&&!spec.osReduce?{recordVideo:{dir:out+'/video',size:{width:spec.width,height:spec.height}}}:{}),viewport:{width:spec.width,height:spec.height},deviceScaleFactor:spec.width<700?2:1,reducedMotion:spec.osReduce?'reduce':'no-preference'}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(String(e)));const row={...spec,name,errors};report.cases.push(row);
  if(spec.appReduce)await p.addInitScript(()=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({reducedMotion:true,speed:1})));
  if(spec.weak){const client=await ctx.newCDPSession(p);await client.send('Emulation.setCPUThrottlingRate',{rate:4});}
  // Delays are test transport only; product still counts actual decode completions.
  let release;const hold=new Promise(resolve=>release=resolve);
  await p.route('**/assets/**/*.webp',async r=>{await hold;await r.continue().catch(()=>{});});
  await p.addInitScript(()=>{const original=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=async function(){await original.call(this);const path=this.src;let n=0;for(const c of path)n+=c.charCodeAt(0);await new Promise(r=>setTimeout(r,10+(n%10)*4));};});
  let releaseModule;const moduleHold=new Promise(r=>releaseModule=r);await p.route('**/src/main.ts',async r=>{await moduleHold;await r.continue().catch(()=>{});});
  const start=Date.now();await p.goto('http://127.0.0.1:5593/?harness=1&seed=loading-art',{waitUntil:'commit'});await p.locator('.load-brand').waitFor();await p.waitForTimeout(100);await p.screenshot({path:`${out}/${name}-opening.png`,scale:'css'});releaseModule();
  await p.waitForFunction(total=>Number(document.querySelector('#resource-loading')?.dataset.total)===total,startupTotal);
  const snap=()=>p.locator('#resource-loading').evaluate(e=>({loaded:+e.dataset.loaded,total:+e.dataset.total,value:e.querySelector('progress').value,cards:e.querySelectorAll('.load-card-seat.is-inked').length,chapters:e.querySelectorAll('.load-chapters .is-inked').length,overflow:document.documentElement.scrollWidth>innerWidth,scroll:e.scrollHeight>e.clientHeight,scrollX:e.scrollWidth>e.clientWidth,animations:e.getAnimations({subtree:true}).filter(a=>a.playState==='running').length,brand:e.querySelector('.load-brand').getBoundingClientRect().toJSON(),taglineBottom:e.querySelector('.load-brand p').getBoundingClientRect().bottom,cardTop:Math.min(...[...e.querySelectorAll('.load-card-seat')].map(c=>c.getBoundingClientRect().top)),letters:[...e.querySelectorAll('h1 span')].map(s=>({text:s.textContent,transform:getComputedStyle(s).transform})),actions:[...e.querySelectorAll('button:not([hidden])')].map(b=>({height:b.getBoundingClientRect().height,bottom:b.getBoundingClientRect().bottom}))}));
  row.zero=await snap();assert.equal(row.zero.loaded,8); // eight paper textures already decoded; catalog images held
  assert.equal(row.zero.value,row.zero.loaded);assert.equal(row.zero.overflow,false);assert.equal(row.zero.scrollX,false);assert.equal(row.zero.scroll,false);
  if(!spec.osReduce&&!spec.appReduce)assert.ok(row.zero.animations>0);
  else assert.equal(row.zero.animations,0,'both motion preferences suppress all decorative animation');
  if(spec.weak){
   // On a throttled renderer, screenshot capture itself can consume most of the
   // product's 12s deadline. Release transport now; measure native loading while
   // the renderer works, rather than holding its images during more screenshots.
   await p.evaluate(()=>{window.__loadingBeats=[];const h=document.querySelector('#resource-loading');new MutationObserver(()=>window.__loadingBeats.push({loaded:+h.dataset.loaded,total:+h.dataset.total,value:h.querySelector('progress').value,cards:h.querySelectorAll('.load-card-seat.is-inked').length,chapters:h.querySelectorAll('.load-chapters .is-inked').length})).observe(h,{attributes:true,attributeFilter:['data-loaded']});});
   release();await p.waitForFunction(()=>['ready','needs-choice'].includes(window.__harness?.game.registry.get('resourcePreparation')?.status),undefined,{timeout:30000});
   row.preparation=await p.evaluate(()=>JSON.parse(JSON.stringify(window.__harness.game.registry.get('resourcePreparation'))));
   if(row.preparation.status==='needs-choice'){
    assert.ok(row.preparation.loaded<startupTotal);const current=await snap();assert.equal(current.value,current.loaded);assert.ok(current.cards<3);row.deadline=current;
    await p.screenshot({path:`${out}/${name}-deadline.png`,scale:'css'});await p.getByRole('button',{name:'使用文字牌面继续',exact:true}).click();row.completion='12s deadline -> native text continuation';
   }else row.completion='all startupTotal decoded';
   await p.waitForFunction(()=>window.__harness?.game.scene.isActive('title'),undefined,{timeout:30000});
   row.titleMs=Date.now()-start;row.beats=await p.evaluate(()=>window.__loadingBeats);assert.ok(row.beats.length>0);assert.ok(row.beats.every(b=>b.value===b.loaded&&b.chapters===b.cards&&b.cards===(b.loaded===startupTotal?3:b.loaded>=startupTotal/2?2:b.loaded>0?1:0)));if(row.preparation.status==='ready')assert.ok(row.beats.some(b=>b.loaded===startupTotal&&b.cards===3));assert.equal(await p.locator('#resource-loading').count(),0);assert.deepEqual(errors,[]);row.status='PASS';console.log('PASS',name,row.titleMs,row.completion);await ctx.close();continue;
  }
  await p.waitForTimeout(950);
  row.settled=await snap();await p.screenshot({path:`${out}/${name}-settled.png`,scale:'css'});
  assert.ok(row.settled.actions.every(a=>a.height>=44));assert.ok(row.settled.cardTop-row.settled.taglineBottom>=8,'tagline stays clear of the card fan');
  assert.ok(row.settled.letters.every(s=>s.transform==='none'||s.transform==='matrix(1, 0, 0, 1, 0, 0)'),'title text never scales');
  if(!spec.appReduce&&!spec.osReduce){
   row.liveMotion=await p.evaluate(()=>{const h=document.querySelector('#resource-loading'),an=h.getAnimations({subtree:true});return an.filter(a=>a.effect.getTiming().iterations===Infinity).map(a=>({target:a.effect.target.classList.baseVal??a.effect.target.className,time:a.currentTime}));});assert.ok(row.liveMotion.length>=5);
  }
  if(spec.width===1366&&!spec.weak){await p.emulateMedia({reducedMotion:'reduce'});assert.equal((await snap()).animations,0);await p.emulateMedia({reducedMotion:'no-preference'});row.livePreferenceChange='PASS';}
  // Observe only real decoded counts at update time, before the dialog can disappear.
  await p.evaluate(()=>{window.__loadingBeats=[];const h=document.querySelector('#resource-loading');new MutationObserver(()=>{window.__loadingBeats.push({loaded:+h.dataset.loaded,total:+h.dataset.total,value:h.querySelector('progress').value,cards:h.querySelectorAll('.load-card-seat.is-inked').length,chapters:h.querySelectorAll('.load-chapters .is-inked').length});}).observe(h,{attributes:true,attributeFilter:['data-loaded']});});
  release();
  await p.waitForFunction(()=>{const h=window.__harness;return h?.game.scene.isActive('title')&&h.game.registry.get('resourcePreparation')?.status==='ready';},undefined,{timeout:30000});
  row.titleMs=Date.now()-start;row.beats=await p.evaluate(()=>window.__loadingBeats);assert.ok(row.beats.some(b=>b.loaded>8&&b.loaded<startupTotal/2&&b.cards===1));assert.ok(row.beats.some(b=>b.loaded>=startupTotal/2&&b.loaded<startupTotal&&b.cards===2));assert.ok(row.beats.some(b=>b.loaded===startupTotal&&b.cards===3));assert.ok(row.beats.every(b=>b.value===b.loaded&&b.chapters===b.cards));
  assert.equal(await p.locator('#resource-loading').count(),0);assert.deepEqual(errors,[]);row.status='PASS';console.log('PASS',name,row.titleMs);const video=p.video();await ctx.close();if(video)await video.saveAs(`${out}/${name}.webm`);
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;console.error(e);}
finally{await writeFile(`${out}/visual-report.json`,JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
