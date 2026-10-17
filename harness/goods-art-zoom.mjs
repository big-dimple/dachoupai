/** Bounded browser check of the shipped catalog, inventory and shared detail modules. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {build} from 'vite';
import {chromium} from 'playwright';

const smallTrigger=process.argv.includes('--small-trigger');
const out=smallTrigger?'docs/production/evidence/art-zoom-small-image-2026-10-17':'docs/production/evidence/common-art-zoom-2026-10-17',bundle='.vite/goods-art-zoom-build',entry='.vite/goods-art-zoom-entry.html';
await mkdir(out,{recursive:true});await mkdir('.vite',{recursive:true});
const sourceFiles=['src/game/CardArtSource.ts','src/game/CardArtZoomModal.ts','src/game/DetailDialog.ts','src/game/DetailDialog.css'];
const sourceHashes=Object.fromEntries(await Promise.all(sourceFiles.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
await writeFile(entry,`<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body><button id="catalog">图鉴查询</button><script type="module">
import '/src/style.css';
import {DetailDialog} from '/src/game/DetailDialog.ts';
import {showCatalog} from '/src/game/CatalogDialog.ts';
import {showConsumables} from '/src/game/ConsumableDialog.ts';
import {createRun} from '/src/domain/run.ts';
import {newRunIdentity} from '/src/game/RunLaunch.ts';
import {toolInfo,itemInfo,goodsArtPortrait} from '/src/game/r2ToolInfo.ts';
import {cardDisplayName} from '/src/game/tangsongCardNames.ts';
const owner=new DetailDialog(),state=createRun({seed:'common-art-zoom',runId:'controlled/common-art-zoom',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});let sends=0;
state.consumables=[{instanceId:'controlled/T12',definitionId:'T12'},{instanceId:'controlled/P01',definitionId:'P01'}];state.longTermItems=['U01'];
if(${smallTrigger})state.consumables[0]={instanceId:'controlled/T16',definitionId:'T16'};
document.querySelector('#catalog').onclick=()=>showCatalog(owner,undefined,()=>true);
window.probe={names:{T12:toolInfo('T12').name,P01:toolInfo('P01').name,P11:toolInfo('P11').name,U01:itemInfo('U01').name,c06:cardDisplayName('c06')},snapshot:()=>({state:JSON.stringify(state),storage:{...localStorage},sends}),close:()=>owner.close(),inventory:()=>showConsumables(owner,state,true,async()=>{sends++;return false;}),purchase:()=>owner.open('购买详情','规则',[{label:'购买',run:()=>{sends++;}}],{shopContext:'purchase',portrait:goodsArtPortrait(toolInfo('T12'))}),mechanism:()=>owner.open('机制示意','规则',[],{portrait:{...goodsArtPortrait(toolInfo('T12')),url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'}})};
</script></body></html>`);
await build({configFile:false,base:'./',publicDir:false,logLevel:'error',build:{outDir:bundle,rollupOptions:{input:entry}}});
const server=createServer(async(request,response)=>{
  const path=decodeURIComponent(new URL(request.url,'http://localhost').pathname),roots=path==='/'?[resolve(bundle,entry)]:[resolve(bundle,'.'+path),resolve('public','.'+path)];
  for(const file of roots){if(!file.startsWith(resolve(bundle))&&!file.startsWith(resolve('public')))continue;try{const data=await readFile(file);response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2'})[extname(file)]??'application/octet-stream');response.end(data);return;}catch{}}
  response.writeHead(404);response.end();
});
await new Promise(resolve=>server.listen(5594,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(10000);
const report={sourceHashes,browser:browser.version(),scope:'One local bundled component page: production showCatalog, showConsumables, DetailDialog and styles. Controlled shop-state inventory, no actual ShopScene/GameScene journey or physical-device claim.',checks:[],errors:[]};page.on('pageerror',error=>report.errors.push(String(error)));
const zoom=()=>page.locator('.card-art-zoom-dialog[open]');
async function loaded(){await page.waitForFunction(()=>document.querySelector('.card-art-zoom-detail')?.classList.contains('is-loaded'));await zoom().locator('.card-art-zoom-detail').evaluate(image=>Promise.all(image.getAnimations().map(animation=>animation.finished)));}
const restored=()=>page.locator('.dialog-card-zoom-trigger').evaluate(button=>document.activeElement===button);
async function catalog(name){await page.locator('#catalog').click();await page.getByRole('searchbox',{name:'按名字查找'}).fill(name);await page.getByRole('button',{name:'查看'+name,exact:true}).click();}
async function closeDetail(){await page.keyboard.press('Escape');await page.keyboard.press('Escape');}
async function geometry(){return zoom().evaluate(dialog=>{const rect=element=>{const r=element.getBoundingClientRect();return {width:r.width,height:r.height};},image=dialog.querySelector('.card-art-zoom-detail');return {dialog:rect(dialog),image:rect(image),close:rect(dialog.querySelector('.card-art-zoom-close')),fit:getComputedStyle(image).objectFit,background:getComputedStyle(dialog).backgroundColor,natural:[image.naturalWidth,image.naturalHeight],transition:getComputedStyle(image).transitionDuration};});}
try{
  await page.goto('http://127.0.0.1:5594/');await page.waitForFunction(()=>window.probe);const before=await page.evaluate(()=>probe.snapshot()),names=await page.evaluate(()=>probe.names);
  for(const id of ['T12','P01','U01','c06']){
    await catalog(names[id]);if(smallTrigger&&id==='T12')await page.screenshot({path:out+'/390-catalog-detail.png'});await page.locator('.dialog-card-zoom-trigger').tap();await loaded();const box=await geometry();assert.deepEqual(box.image,box.dialog);assert.equal(box.fit,'contain');assert.equal(box.background,'rgb(0, 0, 0)');assert.ok(box.close.width>=44&&box.close.height>=44);
    if(id==='T12')await page.screenshot({path:out+'/390-tool-zoom.png'});
    await page.touchscreen.tap(195,422);assert.equal(await zoom().count(),1);await page.keyboard.press('Escape');await zoom().waitFor({state:'detached'});assert.equal(await restored(),true);
    await page.keyboard.press('Space');await loaded();await page.getByRole('button',{name:'关闭赏析',exact:true}).tap();await zoom().waitFor({state:'detached'});assert.equal(await restored(),true);report.checks.push({entry:'production catalog/'+id,status:'PASS',geometry:box});await closeDetail();
  }
  let blocked=true;await page.route('**/assets/handdrawn-tools/*p11*.detail.webp',route=>blocked?route.fulfill({status:503,body:'controlled unavailable'}):route.continue());
  await catalog(names.P11);await page.locator('.dialog-card-zoom-trigger').tap();await zoom().getByRole('button',{name:'重试高清',exact:true}).waitFor({state:'visible'});
  const fallback=await zoom().locator('.card-art-zoom-thumb').evaluate(image=>({visible:!image.hidden,natural:[image.naturalWidth,image.naturalHeight]}));assert.deepEqual(fallback,{visible:true,natural:[128,160]});await page.screenshot({path:out+'/390-recoverable-detail-failure.png'});
  blocked=false;await zoom().getByRole('button',{name:'重试高清',exact:true}).tap();await loaded();assert.equal(await page.locator('.card-art-zoom-close').evaluate(button=>button===document.activeElement),true);await page.keyboard.press('Escape');await zoom().waitFor({state:'detached'});assert.equal(await restored(),true);report.checks.push({entry:'P11 503 → readable thumbnail → retry → HD',status:'PASS'});await closeDetail();
  for(const id of [smallTrigger?'controlled/T16':'controlled/T12','controlled/P01','U01']){
    await page.evaluate(()=>probe.inventory());await page.locator('.tool-inventory-card[data-item-id="'+id+'"]').tap();
    if(smallTrigger&&id==='controlled/T16'){
      await page.getByRole('button',{name:'返回选牌',exact:true}).tap();
      await page.waitForFunction(()=>{const image=document.querySelector('.dialog-card-image');return image&&!image.hidden&&image.naturalWidth>0;});
      report.smallTrigger=await page.locator('.dialog-card-art').evaluate(frame=>{const image=frame.querySelector('.dialog-card-image'),hint=frame.querySelector('.dialog-card-zoom-badge'),trigger=frame.querySelector('.dialog-card-zoom-trigger'),r=image.getBoundingClientRect(),h=hint.getBoundingClientRect();return {imageWidth:r.width,imageHeight:r.height,hintBelowImage:h.top>=r.bottom,hintInsideTrigger:trigger.contains(hint),hintBackground:getComputedStyle(hint).backgroundColor,hintWhiteSpace:getComputedStyle(hint).whiteSpace,label:trigger.getAttribute('aria-label')};});
      await page.screenshot({path:out+'/390-t16-use.png'});await page.locator('.dialog-card-art').screenshot({path:out+'/60px-trigger.png'});
      assert.ok(report.smallTrigger.imageWidth>=59&&report.smallTrigger.imageWidth<=61);assert.equal(report.smallTrigger.hintBelowImage,true);assert.equal(report.smallTrigger.hintInsideTrigger,false);assert.equal(report.smallTrigger.hintBackground,'rgba(0, 0, 0, 0)');assert.equal(report.smallTrigger.hintWhiteSpace,'nowrap');assert.equal(report.smallTrigger.label,'放大鉴赏小红包');
    }
    await page.locator('.dialog-card-zoom-trigger').tap();await loaded();
    if(id==='U01'){await page.setViewportSize({width:1366,height:900});assert.deepEqual((await geometry()).image,{width:1366,height:900});await page.screenshot({path:out+'/1366-permanent-item-zoom.png'});}
    await page.keyboard.press('Escape');await zoom().waitFor({state:'detached'});assert.equal(await restored(),true);
    if(smallTrigger&&id==='controlled/T16')for(const key of ['Enter','Space']){await page.keyboard.press(key);await loaded();await page.keyboard.press('Escape');await zoom().waitFor({state:'detached'});assert.equal(await restored(),true);(report.smallTrigger.keys??=[]).push(key);}
    report.checks.push({entry:'controlled production inventory/'+id,status:'PASS'});await page.evaluate(()=>probe.close());
  }
  await page.evaluate(()=>probe.purchase());await page.locator('.dialog-card-zoom-trigger').click();await loaded();assert.equal((await page.evaluate(()=>probe.snapshot())).sends,0);await page.evaluate(()=>probe.close());await zoom().waitFor({state:'detached'});report.checks.push({entry:'purchase image isolates actions; parent close disposes zoom',status:'PASS'});
  await page.evaluate(()=>probe.mechanism());assert.equal(await page.locator('.dialog-card-zoom-trigger').count(),0);await page.evaluate(()=>probe.close());report.checks.push({entry:'mechanism-only portrait has no entry',status:'PASS'});
  assert.deepEqual(await page.evaluate(()=>probe.snapshot()),before);assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);await page.screenshot({path:out+'/browser-FAIL.png'}).catch(()=>{});throw error;}
finally{await writeFile(out+'/browser.json',JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify({status:report.status,checks:report.checks.length,errors:report.errors}));
