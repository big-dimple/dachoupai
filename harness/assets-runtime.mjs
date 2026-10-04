/** A02: inspect one existing compiled bundle; never builds or changes assets. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {mkdir,readFile,readdir,stat,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
import {waitScene,tapUI} from './ui.mjs';

const option=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const buildDir=option('--build-dir'),scenario=option('--scenario','all'),samples=Number(option('--samples','20'));
assert.ok(buildDir,'Pass --build-dir for the already built e2e bundle; this check never builds.');
assert.ok(['all','timeout','svg'].includes(scenario),'Known scenario');
assert.ok(Number.isInteger(samples)&&samples>=0,'Integer sample count');
const root=process.cwd(),absolute=path.resolve(buildDir),output=path.resolve(option('--output','shots/a02-runtime'));
await mkdir(path.dirname(output),{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
async function inventory(directory,prefix=''){
  const result=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const file=prefix+entry.name,full=path.join(directory,entry.name);
    if(entry.isDirectory())result.push(...await inventory(full,file+'/'));
    else if(entry.isFile()){const bytes=await readFile(full);result.push({file,bytes:bytes.length,sha256:hash(bytes)});}
  }
  return result.sort((a,b)=>a.file.localeCompare(b.file));
}
const files=await inventory(absolute),buildInfo=JSON.parse(await readFile(path.join(absolute,'build-info.json'),'utf8'));
const chars=[...(await readFile('src/game/characters.ts','utf8')).matchAll(/\{ id: '([^']+)'/g)].map(m=>m[1]);
const jokers=[...(await readFile('src/game/jokerArt.ts','utf8')).matchAll(/\{ id: '([^']+)', key: '([^']+)', path: '([^']+)', detailPath: '([^']+)'/g)].map(m=>({id:m[1],key:m[2],path:m[3],detailPath:m[4]}));
assert.equal(chars.length,6);assert.equal(jokers.length,24);
const report={workPackage:'A02',command:process.argv.slice(1),testedHead:git('rev-parse','HEAD'),dirty:git('status','--porcelain'),buildDir:path.relative(root,absolute).replaceAll('\\','/'),buildInfo,
  buildTreeSha256:hash(JSON.stringify(files)),bundles:files.filter(f=>/\.(js|css)$/.test(f.file)),environment:{node:process.version,playwright:JSON.parse(await readFile('node_modules/playwright/package.json','utf8')).version,os:os.type(),osRelease:os.release(),arch:os.arch()},
  byteUnits:{MB:1000000,MiB:1048576,firstTransfer:'CDP Network.loadingFinished encodedDataLength: HTTP response headers + encoded body before first input; excludes request headers/TCP/TLS. Resource Timing transferSize is also retained.',publication:'All files in this actual build directory, uncompressed file bytes; includes code/metadata/unused copied assets.',decode:'Live Phaser image source width * height * 4 RGBA8 estimate; excludes driver allocation, mipmaps, framebuffers and audio decode.'},
  budgets:{firstTransferBytes:4000000,publicationBytes:20000000,textureBytes:96*1048576,firstUsableMs:4000},publication:{bytes:files.reduce((n,f)=>n+f.bytes,0),files:files.length,glb:files.filter(f=>/\.glb$/i.test(f.file))},checks:[],coldSamples:[],
  limitations:['Local headless Chromium browser with CDP network throttling; physical Android/iPhone performance and listening NOT_RUN.','Cold contexts have no storage or cache; this is not a 30-minute/100-scene memory test.','Candidate integration only; commercial source allowlist and A03 source specification approval are not granted by this check.']};
let fault,stalledRequests=0;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
const server=createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    if(fault?.kind==='stall'&&pathname===fault.path){stalledRequests++;return;}
    if(fault?.kind==='missing'&&pathname===fault.path){await new Promise(resolve=>setTimeout(resolve,500));response.writeHead(404);response.end('missing SVG');return;}
    let relative=pathname.startsWith('/dachoupai/')?pathname.slice('/dachoupai'.length):pathname;
    if(relative.endsWith('/'))relative+='index.html';
    const full=path.resolve(absolute,'.'+relative);
    if(!full.startsWith(absolute+path.sep)||!(await stat(full).catch(()=>null))?.isFile()){response.writeHead(404);response.end('not found');return;}
    response.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Content-Length':(await stat(full)).size,'Cache-Control':'no-store'});
    createReadStream(full).pipe(response);
  }catch{response.writeHead(400);response.end('bad request');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
report.server={contentEncoding:'identity (no gzip/brotli)',cacheControl:'no-store',mounts:['/','/dachoupai/'],missingFiles:'HTTP 404, no SPA fallback'};
let browser;
async function observedPage({har,throttle=false,touch=true}={}){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:720},deviceScaleFactor:touch?2:1,hasTouch:touch,...(har?{recordHar:{path:har,mode:'minimal',content:'omit'}}:{})});
  await context.addInitScript(()=>{
    const find=list=>{for(const item of list??[]){if(item.name==='action/title-start')return item;const nested=find(item.list);if(nested)return nested;}};
    const observe=()=>{
      const game=window.__harness?.game,scene=game?.scene.getScene('title');
      if(scene?.scene?.isActive()&&find(scene.children.list)?.input?.enabled){requestAnimationFrame(()=>{window.__assetFirstUsable=performance.now();});}
      else requestAnimationFrame(observe);
    };requestAnimationFrame(observe);
  });
  const page=await context.newPage(),errors=[],warnings=[],requests=new Map(),cdp=await context.newCDPSession(page);
  page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',message=>{if(message.type()==='warning')warnings.push(message.text());});
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  if(throttle)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:10000000/8,uploadThroughput:10000000/8,connectionType:'cellular4g'});
  cdp.on('Network.requestWillBeSent',event=>{if(event.request.url.startsWith(base))requests.set(event.requestId,{url:event.request.url,type:event.type});});
  cdp.on('Network.responseReceived',event=>{const row=requests.get(event.requestId);if(row){row.status=event.response.status;row.fromDiskCache=event.response.fromDiskCache;}});
  cdp.on('Network.loadingFinished',event=>{const row=requests.get(event.requestId);if(row){row.encodedBytes=event.encodedDataLength;row.complete=true;}});
  cdp.on('Network.loadingFailed',event=>{const row=requests.get(event.requestId);if(row)row.failure=event.errorText;});
  return {context,page,errors,warnings,requests};
}
async function startupSnapshot(probe){
  await probe.page.waitForFunction(()=>Number.isFinite(window.__assetFirstUsable),undefined,{timeout:10000});
  const snapshot=await probe.page.evaluate(()=>{
    const at=window.__assetFirstUsable,game=window.__harness.game;
    const timing=[...performance.getEntriesByType('navigation'),...performance.getEntriesByType('resource')].filter(r=>r.responseEnd<=at&&/^https?:/.test(r.name)).map(r=>({url:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize,responseEnd:r.responseEnd}));
    const textures=Object.entries(game.textures.list).filter(([key])=>!key.startsWith('__')).flatMap(([key,texture])=>texture.source.map(source=>({key,width:source.width,height:source.height,rgbaBytes:source.width*source.height*4})));
    const gl=game.renderer.gl,debug=gl?.getExtension('WEBGL_debug_renderer_info'),renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl?gl.getParameter(gl.RENDERER):'Canvas2D';
    return {firstUsableMs:at,timing,textures,decodedTextureBytes:textures.reduce((n,t)=>n+t.rgbaBytes,0),graphics:{renderer,software:/swiftshader|llvmpipe|software/i.test(renderer)},framebuffer:{width:game.canvas.width,height:game.canvas.height,density:game.canvas.width/game.canvas.getBoundingClientRect().width}};
  });
  const requests=[...probe.requests.values()].map(row=>({...row,url:new URL(row.url).pathname}));
  return {...snapshot,requests,transferBytes:requests.reduce((n,r)=>n+(r.encodedBytes??0),0),resourceTimingTransferBytes:snapshot.timing.reduce((n,r)=>n+r.transferSize,0)};
}
const noEagerDetails=snapshot=>{
  assert.ok(snapshot.requests.every(r=>!/(\.portrait\.webp|-detail\.webp|\.png|\.glb|\.mp3)$/.test(r.url)),'no HD, source PNG/GLB or long audio before first input');
  assert.equal(snapshot.requests.filter(r=>r.url.endsWith('.avatar.webp')).length,6);
  assert.equal(snapshot.requests.filter(r=>r.url.endsWith('.selection.webp')).length,6);
  assert.equal(snapshot.requests.filter(r=>r.url.includes('/jokers-p07/')&&r.url.endsWith('.webp')).length,24);
  assert.ok(snapshot.transferBytes<=report.budgets.firstTransferBytes,'first screen transfer <= 4MB');
  assert.ok(snapshot.decodedTextureBytes<=report.budgets.textureBytes,'decoded texture estimate <= 96MiB');
};
const clickDom=(page,label)=>page.getByRole('button',{name:label,exact:true}).click();
async function normal(prefix,touch){
  const probe=await observedPage({touch});
  try{
    await probe.page.goto(base+prefix+'?harness=1&seed=p00-core-ui',{waitUntil:'domcontentloaded'});
    const first=await startupSnapshot(probe);noEagerDetails(first);
    assert.ok(first.requests.filter(r=>!r.url.endsWith('/favicon.ico')).every(r=>r.status===200&&r.complete&&!r.fromDiskCache),'all actual startup resources resolve, uncached');
    assert.ok(first.requests.filter(r=>!r.url.endsWith('/favicon.ico')).every(r=>r.url.startsWith(prefix)),'registered BASE_URL remains inside the requested mount');
    await tapUI(probe.page,'title','action/title-start',touch);await waitScene(probe.page,'character-select');
    await tapUI(probe.page,'character-select','character/amo',touch);await tapUI(probe.page,'character-select','action/character-details',touch);
    const characterImage=probe.page.locator('dialog[open] .dialog-portrait');
    await characterImage.evaluate(image=>image.decode());
    const character=await characterImage.evaluate(image=>({path:new URL(image.src).pathname,width:image.naturalWidth,height:image.naturalHeight,fit:getComputedStyle(image).objectFit}));
    assert.equal(character.path,prefix+'assets/handdrawn-p08/characters/amo.portrait.webp');assert.equal(character.fit,'contain');
    await clickDom(probe.page,'关闭');await tapUI(probe.page,'character-select','action/confirm-character',touch);await waitScene(probe.page,'shop');
    const before=await probe.page.evaluate(()=>window.__harness.game.registry.get('runController').state),offer=before.shop.offers.find(o=>!o.consumed),art=jokers.find(j=>j.id===offer.definitionId);assert.ok(art);
    await tapUI(probe.page,'shop','offer/'+offer.offerId,touch);
    const cardImage=probe.page.locator('dialog[open] .dialog-card-image');await cardImage.evaluate(image=>image.decode());
    const card=await cardImage.evaluate(image=>({path:new URL(image.src).pathname,width:image.naturalWidth,height:image.naturalHeight,fit:getComputedStyle(image).objectFit}));
    assert.equal(card.path,prefix+art.detailPath);assert.equal(card.fit,'contain');
    const loadedDetails=[...probe.requests.values()].filter(r=>/(\.portrait\.webp|-detail\.webp)$/.test(new URL(r.url).pathname)).map(r=>({path:new URL(r.url).pathname,status:r.status}));
    assert.equal(loadedDetails.length,2);assert.ok(loadedDetails.every(r=>r.status===200),'only opened character/Joker HD variants load');
    await clickDom(probe.page,'取消');
    assert.deepEqual(await probe.page.evaluate(()=>window.__harness.game.registry.get('runController').state),before,'opening/cancelling artwork preserves the run and RNG');
    if(prefix==='/dachoupai/'){
      await probe.page.route('**/'+art.detailPath,route=>route.fulfill({status:404,body:'missing detail'}));
      await tapUI(probe.page,'shop','offer/'+offer.offerId,touch);await probe.page.locator('dialog[open] .dialog-card-art').waitFor({state:'detached'});
      assert.equal(await probe.page.getByRole('button',{name:'确认购买',exact:true}).isEnabled(),true,'failed HD keeps readable purchase controls');
      await clickDom(probe.page,'取消');
      assert.deepEqual(await probe.page.evaluate(()=>window.__harness.game.registry.get('runController').state),before);
    }
    assert.deepEqual(probe.errors,[]);
    report.checks.push({name:'paths-and-lazy-details',status:'PASS',prefix,viewport:touch?'390x844 DPR2 touch':'1280x720 DPR1 mouse',first,character,card,loadedDetails,hd404:prefix==='/dachoupai/'?'PASS':'NOT_RUN'});
  }finally{await probe.context.close();}
}
async function missingPreviews(){
  const probe=await observedPage();
  try{
    await probe.page.route('**/assets/handdrawn-p08/characters/amo.*.webp',route=>route.fulfill({status:404,body:'missing character'}));
    await probe.page.route('**/assets/jokers-p07/*.webp',route=>route.fulfill({status:404,body:'missing illustration'}));
    await probe.page.goto(base+'/dachoupai/?harness=1&seed=p00-core-ui',{waitUntil:'domcontentloaded'});await startupSnapshot(probe);
    const missing=await probe.page.evaluate(()=>{const t=window.__harness.game.textures;return {avatar:t.exists('avatar-amo'),selection:t.exists('selection-portrait-amo'),jokers:Object.keys(t.list).filter(k=>k.startsWith('p07-joker-'))};});
    assert.deepEqual(missing,{avatar:false,selection:false,jokers:[]});
    await tapUI(probe.page,'title','action/title-start',true);await waitScene(probe.page,'character-select');await tapUI(probe.page,'character-select','character/amo',true);
    const letter=await probe.page.evaluate(()=>{const scene=window.__harness.game.scene.getScene('character-select'),find=list=>list.some(o=>o.text==='阿'||o.list&&find(o.list));return find(scene.children.list);});assert.ok(letter,'avatar/selection failure renders the character letter');
    await tapUI(probe.page,'character-select','action/character-details',true);await probe.page.locator('dialog[open] .dialog-portrait').waitFor({state:'detached'});assert.ok(await probe.page.locator('dialog[open] .dialog-body').textContent());await clickDom(probe.page,'关闭');
    await tapUI(probe.page,'character-select','action/confirm-character',true);await waitScene(probe.page,'shop');await tapUI(probe.page,'shop','action/start-stage',true);await waitScene(probe.page,'game');
    await probe.page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length===8);
    const run=await probe.page.evaluate(()=>window.__harness.game.registry.get('runController').state),cardId=run.handOrder[0];await tapUI(probe.page,'game','card/'+cardId,true);
    await probe.page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),cardId);
    assert.deepEqual(probe.errors,[]);
    report.checks.push({name:'previews-and-character-hd-404',status:'PASS',missing,letterFallback:letter,handCards:run.handOrder.length,warnings:probe.warnings,requests:[...probe.requests.values()].filter(r=>r.status===404).map(r=>({path:new URL(r.url).pathname,status:r.status}))});
  }finally{await probe.context.close();}
}
async function stalledPreview(){
  const probe=await observedPage(),record={name:'server-never-responds',status:'IN_PROGRESS',path:'/dachoupai/assets/handdrawn-p08/characters/amo.avatar.webp'};report.checks.push(record);fault={kind:'stall',path:record.path};
  try{
    await probe.page.goto(base+'/dachoupai/?harness=1&seed=p00-core-ui',{waitUntil:'domcontentloaded'});
    await probe.page.waitForFunction(()=>window.__harness.game.scene.getScene('boot').load.inflight.entries.some(f=>f.src.includes('amo.avatar.webp')&&f.xhrLoader));
    record.loader=await probe.page.evaluate(()=>{const boot=window.__harness.game.scene.getScene('boot'),file=boot.load.inflight.entries.find(f=>f.src.includes('amo.avatar.webp'));return {path:new URL(file.src,location.href).pathname,actualXHRTimeoutMs:file.xhrLoader.timeout,retryAttempts:file.retryAttempts};});
    try{await probe.page.waitForFunction(()=>Number.isFinite(window.__assetFirstUsable),undefined,{timeout:7000});}
    catch(error){record.blocked=await probe.page.evaluate(()=>{const game=window.__harness.game,boot=game.scene.getScene('boot');return {bootLoading:boot.load.isLoading(),titleActive:game.scene.isActive('title'),inflight:boot.load.inflight.entries.map(file=>({path:new URL(file.src,location.href).pathname,xhrTimeoutMs:file.xhrLoader?.timeout}))};});record.stalledRequests=stalledRequests;record.pageErrors=probe.errors;throw error;}
    assert.ok(record.loader.actualXHRTimeoutMs>0&&record.loader.actualXHRTimeoutMs<=5000,'each actual image XHR has a finite timeout');assert.equal(record.loader.retryAttempts,0,'no repeated stall delay');
    assert.equal(await probe.page.evaluate(()=>window.__harness.game.textures.exists('avatar-amo')),false);
    await tapUI(probe.page,'title','action/title-start',true);await waitScene(probe.page,'character-select');await tapUI(probe.page,'character-select','character/amo',true);await tapUI(probe.page,'character-select','action/confirm-character',true);await waitScene(probe.page,'shop');
    assert.deepEqual(probe.errors,[]);record.status='PASS';record.stalledRequests=stalledRequests;record.firstUsableMs=await probe.page.evaluate(()=>window.__assetFirstUsable);record.warnings=probe.warnings;
  }catch(error){record.status='FAIL';record.error=String(error);throw error;}
  finally{fault=undefined;await probe.context.close();}
}
async function stalledReloadedSVG(){
  const probe=await observedPage(),record={name:'missing-boot-svg-then-stalled-game-reload',status:'IN_PROGRESS',path:'/dachoupai/assets/p00/mark-joker.svg'},stallBefore=stalledRequests;report.checks.push(record);fault={kind:'missing',path:record.path};
  const actualXHR=key=>probe.page.evaluate(key=>{const scene=window.__harness.game.scene.getScene(key),file=scene.load.inflight.entries.find(f=>f.src.includes('mark-joker.svg'));return {path:new URL(file.src,location.href).pathname,actualXHRTimeoutMs:file.xhrLoader.timeout,retryAttempts:file.retryAttempts};},key);
  try{
    await probe.page.goto(base+'/dachoupai/?harness=1&seed=p00-core-ui',{waitUntil:'domcontentloaded'});
    await probe.page.waitForFunction(()=>window.__harness.game.scene.getScene('boot').load.inflight.entries.some(f=>f.src.includes('mark-joker.svg')&&f.xhrLoader));record.boot=await actualXHR('boot');
    await startupSnapshot(probe);fault={kind:'stall',path:record.path};
    await tapUI(probe.page,'title','action/title-start',true);await waitScene(probe.page,'character-select');await tapUI(probe.page,'character-select','character/amo',true);await tapUI(probe.page,'character-select','action/confirm-character',true);await waitScene(probe.page,'shop');await tapUI(probe.page,'shop','action/start-stage',true);
    await probe.page.waitForFunction(()=>window.__harness.game.scene.getScene('game').load?.inflight.entries.some(f=>f.src.includes('mark-joker.svg')&&f.xhrLoader));record.game=await actualXHR('game');
    try{await probe.page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&s.cardViews.length===8;},undefined,{timeout:7000});}
    catch(error){record.blocked=await probe.page.evaluate(()=>{const game=window.__harness.game,scene=game.scene.getScene('game');return {gameLoading:scene.load.isLoading(),gameActive:game.scene.isActive('game'),inflight:scene.load.inflight.entries.map(f=>({path:new URL(f.src,location.href).pathname,xhrTimeoutMs:f.xhrLoader?.timeout}))};});record.stalledRequests=stalledRequests-stallBefore;record.pageErrors=probe.errors;throw error;}
    for(const loader of [record.boot,record.game]){assert.ok(loader.actualXHRTimeoutMs>0&&loader.actualXHRTimeoutMs<=5000);assert.equal(loader.retryAttempts,0);}
    assert.equal(await probe.page.evaluate(()=>window.__harness.game.textures.exists('p00-mark-joker')),false);
    const id=await probe.page.evaluate(()=>window.__harness.game.registry.get('runController').state.handOrder[0]);await tapUI(probe.page,'game','card/'+id,true);await probe.page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),id);
    assert.deepEqual(probe.errors,[]);record.status='PASS';record.stalledRequests=stalledRequests-stallBefore;record.handCards=8;record.warnings=probe.warnings;
  }catch(error){record.status='FAIL';record.error=String(error);throw error;}
  finally{fault=undefined;await probe.context.close();}
}
try{
  const channel=process.env.SMOKE_CHROMIUM_CHANNEL;browser=await chromium.launch(channel?{channel}:{});report.environment.chromium=browser.version();report.environment.channel=channel??'default Chromium headless shell';report.environment.headless=true;
  if(scenario==='all'){
    assert.equal(report.publication.glb.length,0,'offline GLB must not be copied into this runtime build');
    assert.ok(report.publication.bytes<=report.budgets.publicationBytes,'all copied runtime build files <= 20MB');
    // Check an actual old model basename; the source files remain available offline.
    const oldModels=await inventory(path.join(root,'public/assets/models')),model=oldModels.find(f=>f.file.endsWith('.glb'));assert.ok(model);assert.equal((await fetch(base+'/dachoupai/assets/models/'+model.file)).status,404);
    report.checks.push({name:'publication-budget-and-offline-source-exclusion',status:'PASS',publication:report.publication,offlineGLBSourceCount:oldModels.filter(f=>f.file.endsWith('.glb')).length,sourceGLBNotServed:'assets/models/'+model.file});
    await normal('/',false);await normal('/dachoupai/',true);await missingPreviews();
  }
  if(scenario!=='svg')await stalledPreview();
  if(scenario!=='timeout')await stalledReloadedSVG();
  if(scenario==='all'){
    report.throttle={downloadMbps:10,uploadMbps:10,latencyMs:80,method:'Chromium CDP Network.emulateNetworkConditions',viewport:{width:390,height:844},deviceScaleFactor:2,cache:'fresh isolated browser context + CDP cache disabled per sample',metric:'navigation start to rendered/enabled title-start; click verifies effective operation after snapshot'};
    for(let i=0;i<samples;i++){
      const probe=await observedPage({throttle:true,har:i===0?output+'.har':undefined});
      try{
        await probe.page.goto(base+'/dachoupai/?harness=1&seed=a02-cold',{waitUntil:'domcontentloaded'});const snapshot=await startupSnapshot(probe);noEagerDetails(snapshot);
        assert.ok(snapshot.requests.filter(r=>!r.url.endsWith('/favicon.ico')).every(r=>r.status===200&&r.complete&&!r.fromDiskCache),'cold resources resolve without cache');
        report.environment.graphics=snapshot.graphics;
        await tapUI(probe.page,'title','action/title-start',true);await waitScene(probe.page,'character-select');assert.deepEqual(probe.errors,[]);
        report.coldSamples.push({sample:i+1,firstUsableMs:snapshot.firstUsableMs,transferBytes:snapshot.transferBytes,resourceTimingTransferBytes:snapshot.resourceTimingTransferBytes,decodedTextureBytes:snapshot.decodedTextureBytes});
        console.log(`cold ${i+1}/${samples}: ${Math.round(snapshot.firstUsableMs)}ms, ${snapshot.transferBytes} transfer bytes`);
      }finally{await probe.context.close();}
    }
    const sorted=report.coldSamples.map(r=>r.firstUsableMs).sort((a,b)=>a-b);
    report.coldSummary={samples:sorted.length,medianMs:sorted.length?(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2:null,p95Ms:sorted.length?sorted[Math.ceil(sorted.length*.95)-1]:null,maxMs:sorted.at(-1)??null};
    if(samples>=20){assert.ok(report.coldSummary.medianMs<=4000&&report.coldSummary.p95Ms<=4000,'20+ cold samples meet median/P95 4s browser target');report.coldSummary.status='PASS (local browser; physical-device performance NOT_RUN)';}
    else report.coldSummary.status='NOT_RUN (fewer than the required 20 cold samples)';
  }
  report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);console.error(report.failure);process.exitCode=1;}
finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await writeFile(output+'.json',JSON.stringify(report,null,2)+'\n');console.log(`assets-runtime: ${report.status}; ${path.relative(root,output)}.json`);}
