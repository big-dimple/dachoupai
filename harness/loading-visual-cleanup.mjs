import assert from 'node:assert/strict';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openSelector} from './ui.mjs';

const out=process.env.LOADING_VISUAL_OUT??'shots/loading-visual-cleanup';
await mkdir(out,{recursive:true});
const paths=['index.html','src/game/LoadingScreen.ts','src/game/BootScene.ts','src/game/SceneResources.ts','src/game/LoadingProgress.ts','src/game/ResourceRecovery.ts','src/game/ImageWarmupQueue.ts','src/main.ts'];
const hashes=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
const heroes=JSON.parse(await readFile('public/assets/tangsong-portraits/manifest.json','utf8')).assets.filter(a=>['avatar','selection'].includes(a.purpose));
const target=heroes.find(a=>a.path.endsWith('/azao.avatar.webp'));
assert.ok(target);
const targetRoute=url=>url.pathname==='/'+target.path;
await build({mode:'e2e',build:{outDir:'shots/loading-visual-build',emptyOutDir:true},logLevel:'error'});
const server=await preview({build:{outDir:'shots/loading-visual-build'},preview:{host:'127.0.0.1',port:5584,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({executablePath:process.env.LOADING_VISUAL_BROWSER??'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu']});
const report={base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:hashes,browser:browser.version(),scope:'Built application; real BootScene, decoded texture gate, recovery and browser input. Only transport is held or faulted to expose loading. Software Chromium viewports, not physical device or player acceptance.',cases:[]};
const preparation=page=>page.evaluate(()=>JSON.parse(JSON.stringify(window.__harness.game.registry.get('resourcePreparation'))));
const shot=(page,name)=>page.screenshot({path:out+'/'+name+'.png',scale:'css'});
const layout=page=>page.locator('#resource-loading').evaluate(host=>{
 const rect=element=>element.getBoundingClientRect().toJSON(),progress=host.querySelector('progress');
 return {fish:host.querySelectorAll('[class*="goldfish"]').length,brand:host.querySelector('.load-brand h1').textContent,cards:host.querySelectorAll('.load-card-seat').length,value:progress.value,max:progress.max,motion:host.dataset.loadMotion,scrollX:host.scrollWidth>host.clientWidth,scrollY:host.scrollHeight>host.clientHeight,documentOverflow:document.documentElement.scrollWidth>innerWidth,animations:host.getAnimations({subtree:true}).filter(a=>a.playState==='running').length,boxes:[...host.querySelectorAll('.load-brand,[data-load-title],[data-load-caption],progress,button:not([hidden])')].map(e=>({text:e.textContent,tag:e.tagName,...rect(e)})),active:document.activeElement?.textContent,buttons:[...host.querySelectorAll('button:not([hidden])')].map(e=>({text:e.textContent,...rect(e)}))};
});
function checkLayout(info,spec){
 assert.equal(info.fish,0);assert.equal(info.brand,'唐宋牌');assert.equal(info.cards,3);
 assert.equal(info.documentOverflow,false);assert.equal(info.scrollX,false);assert.equal(info.scrollY,false);
 assert.ok(info.value<info.max,'pending resources never reach 100%');
 for(const box of info.boxes)assert.ok(box.x>=0&&box.right<=spec.width+1&&box.y>=0&&box.bottom<=spec.height+1,'visible loading content '+JSON.stringify(box));
 for(const button of info.buttons)assert.ok(button.height>=44);
}
try{
 for(const spec of [{name:'pc',width:1366,height:900,pause:true,reentry:true},{name:'390',width:390,height:844,transient:true},{name:'390-os-reduce',width:390,height:844,osReduce:true},{name:'390-app-reduce',width:390,height:844,appReduce:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.width<700,deviceScaleFactor:spec.width<700?2:1,reducedMotion:spec.osReduce?'reduce':'no-preference'}),page=await context.newPage();
  page.setDefaultTimeout(20000);
  const row={...spec,errors:[],targetHits:0,requests:[]};report.cases.push(row);
  page.on('pageerror',e=>row.errors.push(String(e)));
  page.on('request',r=>{if(r.resourceType()==='fetch'&&r.url().includes('/assets/'))row.requests.push(new URL(r.url()).pathname);});
  if(spec.appReduce)await page.addInitScript(()=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({reducedMotion:true,speed:1})));
  let releaseModule,releaseImage;
  const moduleHold=new Promise(resolve=>releaseModule=resolve),imageHold=new Promise(resolve=>releaseImage=resolve);
  await page.route(/\/assets\/[^/]+\.js(?:\?.*)?$/,async route=>{await moduleHold;await route.continue().catch(()=>{});});
  await page.route(targetRoute,async route=>{
   row.targetHits++;const hit=row.targetHits;await imageHold;
   if(spec.transient&&hit===1)return route.fulfill({status:503,body:'controlled transient image failure'}).catch(()=>{});
   await route.continue().catch(()=>{});
  });
  try{
   await page.goto('http://127.0.0.1:5584/?harness=1&seed=loading-visual-cleanup',{waitUntil:'commit'});
   await page.locator('.load-brand').waitFor();
   assert.equal(await page.locator('[class*="goldfish"]').count(),0,'first HTML contains no fish before the bundle');
   if(spec.osReduce||spec.appReduce)assert.equal((await layout(page)).animations,0,'reduced motion applies before the bundle');
   releaseModule();
   await page.waitForFunction(total=>{const p=window.__harness?.game.registry.get('resourcePreparation');return p?.total===total&&p.loaded===total-1&&p.pending===1;},heroes.length);
   await page.waitForTimeout(350);
   row.loading=await preparation(page);assert.deepEqual([...row.loading.keys].sort(),heroes.map(a=>a.key).sort());
   row.layout=await layout(page);checkLayout(row.layout,spec);
   assert.equal(await page.evaluate(()=>window.__harness.game.scene.isActive('title')),false);
   if(spec.osReduce||spec.appReduce){assert.equal(row.layout.motion,'reduce');assert.equal(row.layout.animations,0);}
   await shot(page,spec.name+'-loading');
   if(spec.pause){
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>window.__harness.game.registry.get('resourcePreparation').status==='paused');
    const imageRequests=()=>row.requests.filter(path=>/\.(webp|svg)$/.test(path)).length;
    const before=imageRequests();await page.waitForTimeout(250);assert.equal(imageRequests(),before,'pause starts no image preparation fetch; keyboard audio unlock is separate');
    row.paused=await layout(page);assert.equal(row.paused.animations,0);assert.ok(row.paused.buttons.some(b=>b.text==='继续准备'));
    await page.getByRole('button',{name:'继续准备',exact:true}).click();
    await page.waitForFunction(()=>window.__harness.game.registry.get('resourcePreparation').status==='loading');
    row.pauseResume='PASS';
    await page.emulateMedia({reducedMotion:'reduce'});assert.equal((await layout(page)).animations,0);await page.emulateMedia({reducedMotion:'no-preference'});
   }
   releaseImage();
   await page.waitForFunction(()=>window.__harness.game.scene.isActive('title'));
   row.ready=await preparation(page);assert.equal(row.ready.status,'ready');assert.equal(row.ready.loaded,heroes.length);assert.equal(row.ready.pending,0);assert.equal(row.ready.failed,0);
   assert.equal(await page.locator('#resource-loading').count(),0);
   if(spec.transient){assert.equal(row.targetHits,2);assert.equal(row.ready.round,1);row.automaticRetry='503 recovered without clicks';}
   if(spec.reentry){
    let releaseReentry;const reentryHold=new Promise(resolve=>releaseReentry=resolve);
    await page.unroute(targetRoute);
    await page.route(targetRoute,async route=>{await reentryHold;await route.continue().catch(()=>{});});
    await page.evaluate(key=>window.__harness.game.textures.remove(key),target.key);
    const opened=openSelector(page);
    await page.locator('#resource-loading').waitFor();
    await page.waitForFunction(total=>document.querySelector('#resource-loading')?.dataset.total===String(total),heroes.length);
    assert.equal(await page.locator('[class*="goldfish"]').count(),0,'cloned dialog cannot reinsert the fish');
    row.reentry=await preparation(page);assert.equal(row.reentry.pending,1);
    releaseReentry();await opened;row.reentryResult='native title button -> repeated loading dialog -> selector';
   }
   assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',spec.name);
  }catch(error){row.status='FAIL';row.error=String(error.stack??error);row.observed=await preparation(page).catch(()=>null);await shot(page,spec.name+'-FAIL');throw error;}
  finally{releaseModule();releaseImage();await context.close();}
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report.status,report.error??'');await browser.close();await server.close();}
