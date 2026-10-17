import assert from 'node:assert/strict';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {openSelector,tapUI,confirmHeroRoute,waitScene} from './ui.mjs';

const out=process.env.LOADING_SINGLE_OUT??'shots/loading-single-opening';
await mkdir(out,{recursive:true});
const files=['src/game/LoadingScreen.ts','src/game/LoadingScreen.css','src/game/LoadingProgress.ts','src/game/SceneResources.ts','src/game/BootScene.ts'];
const hashes=Object.fromEntries(await Promise.all(files.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
await build({mode:'e2e',build:{outDir:'shots/loading-single-build',emptyOutDir:true},logLevel:'error'});
const server=await preview({build:{outDir:'shots/loading-single-build'},preview:{host:'127.0.0.1',port:5586,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({headless:true});
const report={base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:hashes,browser:browser.version(),scope:'Built application; native inputs and real decoded texture gate. Controlled transport holds and 503 failures only. Software viewports; no physical-device or player acceptance claim.',cases:[]};
const url='http://127.0.0.1:5586/?harness=1&seed=single-opening';
const probe=()=>{
 const openings=new WeakSet(),preparations=new WeakSet();
 window.__loadProbe={openings:0,preparations:0,samples:[]};
 const inspect=()=>{
  for(const [id,set,key] of [['resource-loading',openings,'openings'],['resource-preparation',preparations,'preparations']]){
   const host=document.getElementById(id);if(!host)continue;
   if(!set.has(host)){set.add(host);window.__loadProbe[key]++;}
  }
 };
 new MutationObserver(inspect).observe(document,{childList:true,subtree:true});
 setInterval(()=>{inspect();const h=document.querySelector('#resource-loading,#resource-preparation');if(h)window.__loadProbe.samples.push({id:h.id,loaded:Number(h.dataset.loaded??0),total:Number(h.dataset.total??0),status:h.dataset.loadStatus??'boot',value:h.querySelector('progress').value});},100);
};
const state=page=>page.evaluate(()=>({probe:window.__loadProbe,preparation:window.__harness?.game.registry.get('resourcePreparation'),active:window.__harness?.game.scene.getScenes(true).map(s=>s.scene.key),canvases:document.querySelectorAll('canvas').length}));
const localLayout=page=>page.locator('#resource-preparation').evaluate(h=>({rect:h.getBoundingClientRect().toJSON(),width:innerWidth,height:innerHeight,brand:h.querySelectorAll('.load-brand,.load-scene,.load-card-seat').length,buttons:[...h.querySelectorAll('button:not([hidden])')].map(b=>b.getBoundingClientRect().toJSON()),counter:h.querySelector('[data-load-counter]').textContent,progress:h.querySelector('progress').value}));
const checkLocal=info=>{assert.equal(info.brand,0);assert.ok(info.rect.height<info.height*.55);assert.ok(info.rect.width<=380);assert.ok(info.rect.x>=0&&info.rect.right<=info.width);assert.ok(info.rect.y>=0&&info.rect.bottom<=info.height);assert.ok(info.progress<1);for(const b of info.buttons)assert.ok(b.height>=44);};
const snap=async(page,name)=>{await page.screenshot({path:out+'/'+name+'.png',scale:'css'});};
try{
 for(const spec of [{name:'pc',width:1366,height:900},{name:'390',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.width<700,reducedMotion:spec.width<700?'reduce':'no-preference'}),page=await context.newPage();page.setDefaultTimeout(20000);
  const row={...spec,errors:[],heroHits:0,paperHits:0,courtHits:0};report.cases.push(row);page.on('pageerror',e=>row.errors.push(String(e)));await page.addInitScript(probe);
  let releaseHero,releaseCourt;
  const heroHold=new Promise(resolve=>releaseHero=resolve),courtHold=new Promise(resolve=>releaseCourt=resolve);
  await page.route(/\/azao\.avatar\.webp(?:\?.*)?$/,async route=>{row.heroHits++;await heroHold;await route.continue().catch(()=>{});});
  // A paper texture failing in Phaser must be recovered before title entry too.
  await page.route(/\/p00\/paper\.svg$/,async route=>{row.paperHits++;if(row.paperHits===1)return route.fulfill({status:503,body:'controlled paper failure'});await route.continue();});
  await page.route(/\/court\/j\.court\.webp$/,async route=>{row.courtHits++;await courtHold;if(row.courtHits===1)return route.fulfill({status:503,body:'controlled court failure'}).catch(()=>{});await route.continue().catch(()=>{});});
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.getElementById('resource-loading')?.dataset.total==='20');
   await page.waitForFunction(()=>Number(document.getElementById('resource-loading')?.dataset.loaded)>=18);
   row.coldPending=await state(page);assert.equal(row.coldPending.probe.openings,1);assert.ok(!row.coldPending.active.includes('title'));assert.ok(row.coldPending.preparation.loaded<20);
   await snap(page,spec.name+'-opening');releaseHero();await waitScene(page,'title');
   row.firstEntry=await state(page);assert.equal(row.firstEntry.preparation.total,20);assert.equal(row.firstEntry.preparation.loaded,20);assert.equal(row.firstEntry.canvases,1);assert.ok(row.paperHits>=2);assert.equal(await page.locator('#resource-loading').count(),0);
   assert.ok(await page.evaluate(()=>window.__harness.game.textures.exists('p00-paper')));
   await openSelector(page,spec.width<700);await tapUI(page,'character-select','character/amo',spec.width<700);await confirmHeroRoute(page,spec.width<700);
   await page.locator('#resource-preparation').waitFor({state:'visible'});row.local=await localLayout(page);checkLocal(row.local);assert.equal(await page.locator('#resource-loading').count(),0);await snap(page,spec.name+'-local');
   // Escape pauses the same gate; resume retains the completed textures.
   await page.keyboard.press('Escape');await page.waitForFunction(()=>document.getElementById('resource-preparation')?.dataset.loadStatus==='paused');row.paused=await state(page);
   await page.getByRole('button',{name:'继续准备',exact:true}).click();releaseCourt();await waitScene(page,'shop');
   row.shop=await state(page);assert.equal(row.shop.probe.openings,1);assert.ok(row.courtHits>=2);assert.equal(row.shop.preparation.loaded,row.shop.preparation.total);assert.ok(await page.evaluate(()=>window.__harness.game.textures.exists('p08-court-j')));await snap(page,spec.name+'-shop');
   await tapUI(page,'shop','action/start-stage',spec.width<700);await waitScene(page,'game');row.table=await state(page);assert.equal(row.table.probe.openings,1);assert.equal(row.table.canvases,1);assert.equal(await page.locator('#resource-loading,#resource-preparation').count(),0);
   assert.ok(row.table.probe.samples.every(p=>p.status==='ready'||p.value<1));assert.equal(row.errors.length,0);await snap(page,spec.name+'-table');
   if(spec.name==='pc'){
    const before=await page.evaluate(()=>JSON.stringify(window.__harness.game.registry.get('runController').state));
    let releaseEyes;const eyesHold=new Promise(resolve=>releaseEyes=resolve);
    await page.route(/\/tangsong-eyes\/amo\.eyes-[^/]+\.webp(?:\?.*)?$/,async route=>{await eyesHold;await route.continue().catch(()=>{});});
    try{
     await page.reload({waitUntil:'domcontentloaded'});await waitScene(page,'title');await tapUI(page,'title','action/title-continue');
     await page.locator('#resource-preparation').waitFor({state:'visible'});row.restoreLocal=await localLayout(page);checkLocal(row.restoreLocal);assert.equal(await page.locator('#resource-loading').count(),0);await snap(page,'pc-restore-local');
     releaseEyes();await waitScene(page,'game');row.restored=await state(page);assert.equal(row.restored.probe.openings,1);assert.equal(row.restored.canvases,1);
     const after=await page.evaluate(()=>JSON.stringify(window.__harness.game.registry.get('runController').state));assert.equal(after,before,'cold continue preserves the complete saved run');row.restoredRunSHA256=createHash('sha256').update(after).digest('hex');assert.equal(row.errors.length,0);
    }finally{releaseEyes();}
   }
  }finally{releaseHero();releaseCourt();await context.close();}
 }
 // A second visit shares the browser HTTP cache, but starts exactly one new document opening.
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await context.newPage();page.setDefaultTimeout(20000);await page.addInitScript(probe);
 const row={name:'second-visit',errors:[]};report.cases.push(row);page.on('pageerror',e=>row.errors.push(String(e)));
 try{
  await page.goto(url);await waitScene(page,'title');row.first=await state(page);await page.reload();await waitScene(page,'title');row.second=await state(page);assert.equal(row.first.probe.openings,1);assert.equal(row.second.probe.openings,1);assert.equal(row.second.canvases,1);assert.equal(row.second.preparation.total,20);assert.equal(row.second.preparation.loaded,20);
  await openSelector(page,true);row.selection=await state(page);assert.equal(row.selection.probe.openings,1);assert.equal(await page.locator('#resource-loading,#resource-preparation').count(),0);assert.equal(row.errors.length,0);
 }finally{await context.close();}
 report.pass=true;
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await server.httpServer.close();}
console.log(JSON.stringify({pass:report.pass,cases:report.cases.map(r=>({name:r.name,errors:r.errors,openings:r.table?.probe.openings??r.second?.probe.openings,preparations:r.table?.probe.preparations??r.second?.probe.preparations,paperHits:r.paperHits,courtHits:r.courtHits})),out}));
