import assert from 'node:assert/strict';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openSelector} from './ui.mjs';
const out=process.env.AUTO_LOADING_OUT??'shots/loading-auto-recovery';await mkdir(out,{recursive:true});
const paths=['index.html','src/game/BootScene.ts','src/game/LoadingScreen.ts','src/game/LoadingProgress.ts','src/game/ResourceRecovery.ts','src/game/SceneResources.ts','src/game/ImageWarmupQueue.ts'];
const hashes=Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
await build({mode:'e2e',build:{outDir:'shots/loading-auto-build',emptyOutDir:true},logLevel:'error'});
const server=await preview({build:{outDir:'shots/loading-auto-build'},preview:{host:'127.0.0.1',port:5582,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({...process.env.AUTO_LOADING_BROWSER?{executablePath:process.env.AUTO_LOADING_BROWSER}:{channel:process.platform==='win32'?'msedge':undefined},args:['--disable-gpu']});
const report={base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:hashes,browser:browser.version(),platform:process.platform,cases:[]};
const heroAssets=JSON.parse(await readFile('public/assets/tangsong-portraits/manifest.json','utf8')).assets;
const specs=[{name:'slow-320',width:320,height:740,slow:true},{name:'slow-390-reduced',width:390,height:844,slow:true,reduced:true},{name:'transient-503',width:390,height:844,once:true},{name:'timeout-auto',width:1366,height:768,timeout:true},{name:'offline-online',width:390,height:844,offline:true},{name:'permanent-404',width:320,height:740,missing:true},{name:'pause-resume',width:390,height:844,pause:true},{name:'back-exit',width:390,height:844,exit:true},{name:'cancel-reentry-cache',width:1366,height:768,cancel:true},{name:'warm-cache',width:1366,height:768,warm:true}];
specs.push({name:'deadline-tail',width:1366,height:768,slow:true,latency:200,deadline:true});
const prep=p=>p.evaluate(()=>JSON.parse(JSON.stringify(window.__harness?.game.registry.get('resourcePreparation')??null)));
const shot=(p,name)=>p.screenshot({path:out+'/'+name+'.png',scale:'css'});
async function loadingLayout(page,width){
 const info=await page.evaluate(()=>{const host=document.querySelector('#resource-loading');return {scroll:host.scrollWidth,client:host.clientWidth,boxes:[...host.querySelectorAll('[data-load-caption],[data-load-counter],progress,button:not([hidden])')].map(e=>{const b=e.getBoundingClientRect();return {text:e.textContent,x:b.x,y:b.y,width:b.width,height:b.height};})};});
 assert.ok(info.scroll<=info.client+1,'loading dialog horizontal overflow '+JSON.stringify(info));for(const b of info.boxes)assert.ok(b.x>=0&&b.x+b.width<=width+1,'loading content bounds '+JSON.stringify(info));return info;
}
try{
 for(const spec of specs.filter(s=>!process.env.AUTO_LOADING_CASE||s.name===process.env.AUTO_LOADING_CASE)){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.width<640,reducedMotion:spec.reduced?'reduce':'no-preference'}),page=await context.newPage();page.setDefaultTimeout(35000);
  const row={...spec,requests:[],errors:[],maxActiveFetches:0,maxSamePath:0};report.cases.push(row);const active=new Map(),activePaths=new Map();let targetHits=0,offlineTriggered=false;
  page.on('pageerror',e=>row.errors.push(String(e)));
  page.on('request',request=>{if(!request.url().includes('/assets/'))return;const path=new URL(request.url()).pathname;row.requests.push({path,type:request.resourceType(),at:Date.now()});if(request.resourceType()!=='fetch'||! /\.(webp|svg)$/.test(path))return;active.set(request,path);activePaths.set(path,(activePaths.get(path)??0)+1);row.maxActiveFetches=Math.max(row.maxActiveFetches,active.size);row.maxSamePath=Math.max(row.maxSamePath,activePaths.get(path));});
  const finished=request=>{const path=active.get(request);if(path){active.delete(request);activePaths.set(path,activePaths.get(path)-1);}};page.on('requestfinished',finished);page.on('requestfailed',finished);
  await page.addInitScript(()=>{
   window.__loadSamples=[];let previous,cycle=0;
   setInterval(()=>{const host=document.querySelector('#resource-loading');if(!host)return;if(host!==previous){previous=host;cycle++;}const progress=host.querySelector('progress'),record=window.__harness?.game.registry.get('resourcePreparation');window.__loadSamples.push({at:performance.now(),cycle,value:progress?.value??0,max:progress?.max??1,loaded:+host.dataset.loaded||0,total:+host.dataset.total||0,status:host.dataset.loadStatus??'initial',ready:record?.status==='ready'});},80);
  });
  await page.route('**/assets/**',async route=>{
   const path=new URL(route.request().url()).pathname,target=path.endsWith('/azao.avatar.webp');
   if(target){targetHits++;
    if(spec.missing)return route.fulfill({status:404,body:'controlled permanent missing image'});
    if(spec.once&&targetHits===1)return route.fulfill({status:503,body:'controlled transient failure'});
    if(spec.offline&&!offlineTriggered){offlineTriggered=true;await context.setOffline(true);return route.abort('internetdisconnected').catch(()=>{});}
    if((spec.timeout||spec.cancel||spec.pause||spec.exit)&&targetHits===1)await new Promise(resolve=>setTimeout(resolve,spec.timeout?6000:1800));
   }
   if(spec.slow&&/\.(webp|svg)$/.test(path))await new Promise(resolve=>setTimeout(resolve,spec.latency??70));
   await route.continue().catch(()=>{});
  });
  try{
   if(spec.exit)await page.goto('about:blank#loading-return');
   const start=Date.now();await page.goto('http://127.0.0.1:5582/?harness=1&seed=auto-loading-evidence',{waitUntil:'domcontentloaded'});
   await page.locator('#resource-loading').waitFor();
   if(spec.slow){await page.waitForFunction(()=>{const p=window.__harness?.game.registry.get('resourcePreparation');return p?.total===146&&p.loaded>10&&p.pending>0;});row.intermediate=await prep(page);row.loadingLayout=await loadingLayout(page,spec.width);await shot(page,spec.name+'-loading');}
   if(spec.offline){
    await page.waitForFunction(()=>window.__harness?.game.registry.get('resourcePreparation')?.status==='offline');const before=row.requests.length;
    await page.evaluate(()=>{for(let i=0;i<8;i++)dispatchEvent(new Event('offline'));});await page.waitForTimeout(800);assert.equal(row.requests.length,before,'offline requests stop');row.offline=await prep(page);await shot(page,spec.name+'-waiting');
    await context.setOffline(false);await page.evaluate(()=>{for(let i=0;i<8;i++)dispatchEvent(new Event('online'));});
   }
   if(spec.cancel||spec.pause||spec.exit){
    await page.waitForFunction(()=>{const g=window.__harness?.game,p=g?.registry.get('resourcePreparation');return p?.total===146&&p.loaded>15&&p.pending>0;});
    const decoded=await page.evaluate(assets=>assets.filter(a=>window.__harness.game.textures.exists(a.key)).map(a=>'/'+a.path),heroAssets.filter(a=>['avatar','selection'].includes(a.purpose)));assert.ok(decoded.length>0);
    row.beforeCancel=await prep(page);
    if(spec.exit){row.samples=await page.evaluate(()=>window.__loadSamples);await shot(page,spec.name+'-before-exit');await page.getByRole('button',{name:'返回上一页',exact:true}).click();await page.waitForURL('about:blank#loading-return');row.exitedToPreviousPage=true;}
    else {await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__harness.game.registry.get('resourcePreparation').status==='paused');const images=()=>row.requests.filter(r=>/\.(webp|svg)$/.test(r.path)).length,before=images();await page.waitForTimeout(600);assert.equal(images(),before,'paused image preparation stops; existing keyboard audio unlock is outside this gate');await shot(page,spec.name+'-paused');
     if(spec.pause)await page.getByRole('button',{name:'继续准备',exact:true}).click();
     else {await page.evaluate(()=>{const g=window.__harness.game;g.scene.stop('boot');g.scene.start('boot');});row.decodedBeforeRestart=decoded;}
    }
   }
   if(spec.missing){
    await page.waitForFunction(()=>window.__harness?.game.registry.get('resourcePreparation')?.status==='waiting');row.firstWait=await prep(page);assert.equal(row.firstWait.loaded,145);assert.equal(row.firstWait.failed,1);assert.equal(targetHits,1);
    row.loadingLayout=await loadingLayout(page,spec.width);await shot(page,spec.name+'-waiting');await page.waitForTimeout(1000);assert.equal(targetHits,1,'no rapid 404 retries');
    await page.waitForFunction(()=>window.__harness.game.registry.get('resourcePreparation').round>=2,undefined,{timeout:33000});row.secondWait=await prep(page);assert.equal(targetHits,2);assert.equal(await page.evaluate(()=>window.__harness.game.scene.isActive('title')),false);assert.equal(row.secondWait.loaded,145);
    await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__harness.game.registry.get('resourcePreparation').status==='paused');
   }else if(!spec.exit){
    if(spec.deadline){await page.waitForFunction(()=>window.__harness?.game.registry.get('resourcePreparation')?.round>=1,undefined,{timeout:35000});row.afterDeadline=await prep(page);await shot(page,spec.name+'-retry');}
    await page.waitForFunction(()=>window.__harness?.game.scene.isActive('title'),undefined,{timeout:45000});row.ready=await prep(page);row.readyMs=Date.now()-start;assert.equal(row.ready.loaded,146);assert.equal(row.ready.status,'ready');assert.equal(await page.locator('#resource-loading').count(),0);await shot(page,spec.name+'-ready');
    if(spec.once||spec.timeout)assert.equal(targetHits,2,'one failed fetch is retried without clicks');
    if(spec.deadline){assert.ok(row.ready.round>=1);for(const a of heroAssets.filter(a=>['avatar','selection'].includes(a.purpose)))assert.equal(row.requests.filter(r=>r.type==='fetch'&&r.path==='/'+a.path).length,1,'deadline retains decoded hero '+a.key);}
    if(spec.cancel)for(const path of row.decodedBeforeRestart)assert.equal(row.requests.filter(r=>r.path===path&&r.type==='fetch').length,1,'decoded cache retained '+path);
    if(spec.warm){const before=row.requests.length;await openSelector(page,false);await page.waitForTimeout(300);row.warmRequests=row.requests.slice(before).filter(r=>r.type==='fetch'&&/\.(webp|svg)$/.test(r.path)&&!/\.(portrait|focus)\.webp$/.test(r.path));assert.deepEqual(row.warmRequests,[],'cached scene entry makes no catalog fetches');}
   }
   row.samples??=await page.evaluate(()=>window.__loadSamples);assert.ok(row.samples.length>0);
   for(let i=0;i<row.samples.length;i++){const sample=row.samples[i],previous=row.samples[i-1];if(previous&&sample.cycle===previous.cycle)assert.ok(sample.value+1e-7>=previous.value,'visual progress never reverses');if(!sample.ready)assert.ok(sample.value<1,'undecoded resources cannot show 100%');}
   row.layout=await page.evaluate(()=>{const host=document.querySelector('#resource-loading');return {overflow:document.documentElement.scrollWidth>innerWidth,buttons:host?[...host.querySelectorAll('button:not([hidden])')].map(b=>{const r=b.getBoundingClientRect();return {label:b.textContent,x:r.x,y:r.y,width:r.width,height:r.height};}):[]};});assert.equal(row.layout.overflow,false);for(const b of row.layout.buttons)assert.ok(b.height>=44&&b.x>=0&&b.x+b.width<=spec.width+1);
   if(!spec.cancel)assert.ok(row.maxSamePath<=1,'automatic retries do not overlap for one key');assert.deepEqual(row.errors,[]);row.targetHits=targetHits;row.status='PASS';console.log('PASS',spec.name,row.readyMs??'blocked safely',targetHits);
  }catch(error){row.status='FAIL';row.error=error.stack??String(error);row.preparation=await prep(page);await shot(page,spec.name+'-FAIL');throw error;}finally{await context.close();}
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack??String(error);process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(report.status,report.error??'');await browser.close();server.httpServer.closeAllConnections();await new Promise(resolve=>server.httpServer.close(resolve));}
