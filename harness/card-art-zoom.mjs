/** Actual catalog mouse/keyboard path plus controlled image failures in Chromium. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer,preview} from 'vite';
import {chromium} from 'playwright';
import {waitScene} from './ui.mjs';

const baseline=process.argv.includes('--baseline');
const out='docs/production/evidence/card-art-display-2026-10-17';
if(baseline&&existsSync(out+'/baseline-FAIL.json'))throw Error('Retained baseline already exists; do not overwrite original FAIL.');
await mkdir(out,{recursive:true});
const previous='7d7921e76ca794a14e715e3eac3b4d66143862ff^1',oldManifest=JSON.parse(execFileSync('git',['show',previous+':public/assets/handdrawn-p08/manifest.json'],{encoding:'utf8'})),oldAssets=new Map();
for(const a of oldManifest.assets.filter(a=>a.category==='functional-card'))for(const o of a.outputs){const path='/assets/handdrawn-p08/'+o.path;oldAssets.set(path,execFileSync('git',['show',previous+':public'+path]));}
let oldServed=0;
const server=await createServer({mode:'e2e',cacheDir:'/tmp/card-art-zoom-vite',plugins:[{name:'controlled-old-card-http-cache',configureServer(s){s.middlewares.use((req,res,next)=>{
 const bytes=oldAssets.get(req.url);if(!bytes)return next();oldServed++;res.setHeader('Content-Type','image/webp');res.setHeader('Cache-Control','public,max-age=31536000,immutable');res.end(bytes);
});}}],server:{host:'127.0.0.1',port:5586,strictPort:true},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline,browser:browser.version(),scope:'Real production menu → catalog → detail → artwork; controlled failures and lifecycle probes use the same shipped components. Chromium software Canvas, no physical-device claim.',cases:[]};
const fingerprint=createHash('sha256');for(const path of execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src','public/assets/handdrawn-p08/manifest.json'],{encoding:'utf8'}).trim().split('\n').sort()){fingerprint.update(path+'\0');fingerprint.update(await readFile(path));fingerprint.update('\0');}report.sourceFingerprint=fingerprint.digest('hex');
const geometry=page=>page.locator('.card-art-zoom-dialog').evaluate(d=>{
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const img=d.querySelector('.card-art-zoom-detail'),thumb=d.querySelector('.card-art-zoom-thumb');
 return {dialog:rect(d),close:rect(d.querySelector('.card-art-zoom-close')),image:rect(img),fit:getComputedStyle(img).objectFit,thumbFilter:getComputedStyle(thumb).filter,loaded:img.classList.contains('is-loaded'),natural:[img.naturalWidth,img.naturalHeight],focus:document.activeElement?.className};
});
async function catalog(page,name='梅开二度'){
 await page.locator('.run-menu-toggle').click();await page.getByRole('button',{name:'图鉴查询',exact:true}).click();
 await page.getByRole('searchbox',{name:'按名字查找'}).fill(name);await page.getByRole('button',{name:'查看'+name,exact:true}).click();
 await page.locator('.dialog-card-art').waitFor();
}
try {
 for(const viewport of [{width:390,height:844},{width:740,height:320},{width:1366,height:900}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<1000,deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),row={viewport,errors:[]};report.cases.push(row);
  page.on('pageerror',e=>row.errors.push(String(e)));page.setDefaultTimeout(20000);
  try {
   await page.goto('http://127.0.0.1:5586/?harness=1');await waitScene(page,'title');await catalog(page);
   const before=await page.evaluate(()=>({storage:{...localStorage},run:window.__harness.game.registry.get('runController')?.state??null}));
   if(baseline){
    row.badge=await page.locator('.dialog-card-zoom-badge').count();await page.locator('.dialog-art-visual').click();row.a11Opened=await page.locator('.card-art-zoom-dialog[open]').count();
    await page.screenshot({path:out+'/'+viewport.width+'-a11-entry-FAIL.png'});
    await page.evaluate(async()=>{(await import('/src/game/CardArtZoomModal.ts')).openCardArtZoom('a11');});
    await page.waitForFunction(()=>document.querySelector('.card-art-zoom-detail')?.classList.contains('is-loaded'));
    row.geometry=await geometry(page);await page.screenshot({path:out+'/'+viewport.width+'-zoom-FAIL.png'});
   }else {
    // The actual native zoom button must activate with both Enter and Space.
    const trigger=page.getByRole('button',{name:'放大鉴赏梅开二度',exact:true});await trigger.focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.card-art-zoom-detail')?.classList.contains('is-loaded'));
    row.geometry=await geometry(page);const g=row.geometry;
    assert.equal(g.fit,'contain');assert.equal(g.thumbFilter,'none');assert.ok(g.close.width>=44&&g.close.height>=44);assert.ok(g.close.x>=0&&g.close.y>=0&&g.close.right<=viewport.width&&g.close.bottom<=viewport.height);assert.ok(g.image.height>viewport.height-135);assert.ok(g.image.bottom<=viewport.height);
    await page.screenshot({path:out+'/'+viewport.width+'-zoom-PASS.png'});
    await page.keyboard.press('Escape');await page.locator('.card-art-zoom-dialog').waitFor({state:'detached'});assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
    await page.keyboard.press('Space');await page.getByRole('button',{name:'关闭赏析',exact:true}).click();await page.locator('.card-art-zoom-dialog').waitFor({state:'detached'});assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
    await trigger.click();await page.waitForFunction(()=>document.querySelector('.card-art-zoom-detail')?.classList.contains('is-loaded'));
    await page.mouse.click(viewport.width/2,viewport.height/2);assert.equal(await page.locator('.card-art-zoom-dialog[open]').count(),1,'image click preserves artwork');
    // Pick a black margin outside the painted contained image, not its element box.
    const outside=await page.locator('.card-art-zoom-detail').evaluate(i=>{const r=i.getBoundingClientRect(),s=Math.min(r.width/i.naturalWidth,r.height/i.naturalHeight),w=i.naturalWidth*s,h=i.naturalHeight*s;return r.width-w>8?{x:r.x+2,y:r.y+r.height/2}:{x:r.x+r.width/2,y:r.y+2};});
    await page.mouse.click(outside.x,outside.y);await page.locator('.card-art-zoom-dialog').waitFor({state:'detached'});assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);row.outsideClick='PASS';
    // Safe insets remain effective while rotating an already open modal.
    await page.evaluate(()=>{for(const [side,n] of Object.entries({top:12,right:34,bottom:34,left:12}))document.documentElement.style.setProperty('--safe-'+side,n+'px');});
    await trigger.click();await page.setViewportSize({width:740,height:320});const safe=await geometry(page);assert.ok(safe.close.y>=12&&safe.close.right<=706&&safe.image.bottom<=286);row.safeInsetsAndRotation=safe;
    await page.keyboard.press('Escape');await page.locator('.card-art-zoom-dialog').waitFor({state:'detached'});await page.setViewportSize(viewport);
    for(let i=0;i<3;i++){await trigger.click();assert.equal(await page.locator('.card-art-zoom-dialog[open]').count(),1);await page.keyboard.press('Escape');await page.locator('.card-art-zoom-dialog').waitFor({state:'detached'});}
    row.keyboardAndFocus='PASS';assert.deepEqual(await page.evaluate(()=>({storage:{...localStorage},run:window.__harness.game.registry.get('runController')?.state??null})),before);row.readOnly='PASS';
    await page.locator('.detail-dialog[open] .dialog-close').click();await page.locator('.run-menu-toggle').click();await page.getByRole('button',{name:'图鉴查询',exact:true}).click();await page.getByLabel('分类',{exact:true}).selectOption('tool');await page.locator('.catalog-result button').first().click();assert.equal(await page.locator('.dialog-card-zoom-trigger,.dialog-card-zoom-badge').count(),0);row.goodsHaveNoInertZoom='PASS';if(viewport.width===390)await page.screenshot({path:out+'/390-goods-no-zoom-PASS.png'});
   }
   row.status=baseline?'FAIL (retained regression)':'PASS';
  }catch(e){row.status='FAIL';row.error=String(e.stack);await page.screenshot({path:out+'/'+viewport.width+(baseline?'-baseline-observer-FAIL.png':'-observer-FAIL.png')});throw e;}
  finally{await context.close();}
 }
 if(!baseline){
  for(const failure of ['http','decode','hang']){
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),row={failure,errors:[]};report.cases.push(row);page.on('pageerror',e=>row.errors.push(String(e)));
   let blocked=true;const held=[];
   await page.route('**/assets/handdrawn-p08/cards/**',async route=>{
    if(blocked&&new URL(route.request().url()).pathname.endsWith('.detail.webp')){
     if(failure==='hang'){held.push(route);return;}
     return route.fulfill({status:failure==='http'?404:200,contentType:'image/webp',body:'controlled image failure'});
    }await route.continue().catch(()=>{});
   });
   try{
    await page.goto('http://127.0.0.1:5586/?harness=1');await waitScene(page,'title');await catalog(page);
    await page.getByRole('button',{name:'放大鉴赏梅开二度',exact:true}).click();const zoom=page.locator('.card-art-zoom-dialog[open]');
    await zoom.getByRole('button',{name:'重试高清',exact:true}).waitFor({timeout:10000});
    row.fallback=await zoom.locator('.card-art-zoom-thumb').evaluate(i=>({natural:[i.naturalWidth,i.naturalHeight],visible:!i.hidden,filter:getComputedStyle(i).filter,fit:getComputedStyle(i).objectFit}));assert.deepEqual(row.fallback,{natural:[128,160],visible:true,filter:'none',fit:'contain'});
    await page.screenshot({path:out+'/390-'+failure+'-readable-fallback-PASS.png'});blocked=false;await zoom.getByRole('button',{name:'重试高清',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.card-art-zoom-detail')?.classList.contains('is-loaded'));
    row.recovered=await geometry(page);assert.deepEqual(row.recovered.natural,[615,768]);await page.screenshot({path:out+'/390-'+failure+'-recovered-PASS.png'});
    await page.keyboard.press('Escape');await page.locator('.card-art-zoom-dialog').waitFor({state:'detached'});assert.deepEqual(row.errors,[]);row.status='PASS';
   }finally{for(const route of held)await route.abort().catch(()=>{});await context.close();}
  }
  // Hold a real image decode past close/replacement; released old work must never touch the new dialog.
  {
   const context=await browser.newContext({viewport:{width:740,height:320}}),page=await context.newPage(),row={lifecycle:'late decode, replacement, parent close',errors:[]};report.cases.push(row);page.on('pageerror',e=>row.errors.push(String(e)));
   try{
    await page.goto('http://127.0.0.1:5586/?harness=1');await waitScene(page,'title');await catalog(page);
    await page.waitForFunction(()=>document.querySelector('.detail-dialog .dialog-card-image')?.naturalWidth===615);
    await page.evaluate(async()=>{
     window.__decodeRelease=[];window.__lateDecode=0;const decode=HTMLImageElement.prototype.decode;
     HTMLImageElement.prototype.decode=function(){if(this.src.startsWith('blob:')&&window.__holdDecode)return new Promise(resolve=>window.__decodeRelease.push(()=>{window.__lateDecode++;resolve();}));return decode.call(this);};
     // Wait until the underlying catalog decode has settled before holding another card.
     await document.querySelector('.detail-dialog .dialog-card-image').decode();window.__holdDecode=true;
     window.__oldZoom=(await import('/src/game/CardArtZoomModal.ts')).openCardArtZoom('f12');
    });
    await page.waitForFunction(()=>window.__decodeRelease.length>0);await page.evaluate(async()=>{window.__holdDecode=false;window.__newZoom=(await import('/src/game/CardArtZoomModal.ts')).openCardArtZoom('a11');for(const release of window.__decodeRelease)release();});
    await page.waitForFunction(()=>document.querySelector('.card-art-zoom-detail')?.classList.contains('is-loaded'));
    row.late=await page.evaluate(()=>({count:document.querySelectorAll('.card-art-zoom-dialog').length,oldConnected:window.__oldZoom.isConnected,title:document.querySelector('.card-art-zoom-title').textContent,lateDecoded:window.__lateDecode}));assert.equal(row.late.count,1);assert.equal(row.late.oldConnected,false);assert.equal(row.late.title,'梅开二度');assert.ok(row.late.lateDecoded>0);
    await page.keyboard.press('Escape');await page.locator('.card-art-zoom-dialog').waitFor({state:'detached'});assert.equal(await page.getByRole('button',{name:'放大鉴赏梅开二度',exact:true}).evaluate(e=>e===document.activeElement),false,'direct component probe returns original detail close focus');
    await page.evaluate(async()=>{const {DetailDialog}=await import('/src/game/DetailDialog.ts'),{jokerArtUrl,jokerArtPreviewUrl}=await import('/src/game/jokerArt.ts');window.__owner=new DetailDialog();window.__owner.open('测试','规则',[],{portrait:{url:jokerArtUrl('a11'),thumbnailUrl:jokerArtPreviewUrl('a11'),alt:'梅开二度',layout:'card'}});});
    await page.getByRole('button',{name:'放大鉴赏梅开二度',exact:true}).last().click();await page.evaluate(()=>window.__owner.close());await page.locator('.card-art-zoom-dialog').waitFor({state:'detached'});assert.deepEqual(row.errors,[]);row.status='PASS';
   }finally{await context.close();}
  }
  // Actual HTTP cache: old unversioned bytes remain immutable and reused while all current URLs bypass them.
  {
   const context=await browser.newContext({viewport:{width:1366,height:900}}),page=await context.newPage(),row={cache:'144 warmed pre-refresh card URLs',errors:[]};report.cases.push(row);page.on('pageerror',e=>row.errors.push(String(e)));
   try{
    await page.goto('http://127.0.0.1:5586/?harness=1');await waitScene(page,'title');const start=oldServed;
    const warm=()=>page.evaluate(async paths=>{const rows=[];for(const path of paths){const bytes=await(await fetch(path)).arrayBuffer(),sha=await crypto.subtle.digest('SHA-256',bytes);rows.push({path,sha256:[...new Uint8Array(sha)].map(b=>b.toString(16).padStart(2,'0')).join('')});}return rows;},[...oldAssets.keys()]);
    row.old=await warm();assert.equal(oldServed-start,144);assert.deepEqual(await warm(),row.old);assert.equal(oldServed-start,144,'second read really uses HTTP cache');
    const manifest=JSON.parse(await readFile('public/assets/handdrawn-p08/manifest.json','utf8'));
    row.current=await page.evaluate(async()=>{const {JOKER_ART}=await import('/src/game/jokerArt.ts'),rows=[];for(const a of JOKER_ART)for(const [purpose,path] of [['thumbnail',a.path],['detail',a.detailPath]]){const bytes=await(await fetch('/'+path)).arrayBuffer(),sha=await crypto.subtle.digest('SHA-256',bytes);rows.push({id:a.id,purpose,path,sha256:[...new Uint8Array(sha)].map(b=>b.toString(16).padStart(2,'0')).join('')});}return rows;});
    for(const r of row.current){const o=manifest.assets.find(a=>a.id===r.id).outputs.find(o=>o.purpose===r.purpose);assert.equal(r.sha256,o.sha256);assert.ok(r.path.endsWith('?v='+o.sha256));}
    assert.equal(oldServed-start,144);await catalog(page);await page.getByRole('button',{name:'放大鉴赏梅开二度',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.card-art-zoom-detail')?.classList.contains('is-loaded'));row.geometry=await geometry(page);await page.screenshot({path:out+'/1366-warm-cache-PASS.png'});assert.deepEqual(row.errors,[]);row.status='PASS';
   }finally{await context.close();}
  }
  // Consume the actual production output without rebuilding it; exercise relative BASE_URL under a subpath.
  {
   const built=await preview({build:{outDir:'dist'},base:'/card-review/',preview:{host:'127.0.0.1',port:5587,strictPort:true},logLevel:'error'});
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),row={productionSubpath:'/card-review/',build:JSON.parse(await readFile('dist/build-info.json','utf8')),errors:[],requests:[]};report.cases.push(row);
   page.on('pageerror',e=>row.errors.push(String(e)));page.on('request',r=>{if(r.url().includes('/handdrawn-p08/cards/'))row.requests.push(r.url());});
   try{
    await page.goto('http://127.0.0.1:5587/card-review/');await page.locator('[data-ui="title/action/title-start"]').waitFor();await catalog(page);await page.getByRole('button',{name:'放大鉴赏梅开二度',exact:true}).tap();await page.waitForFunction(()=>document.querySelector('.card-art-zoom-detail')?.classList.contains('is-loaded'));row.geometry=await geometry(page);
    assert.ok(row.requests.some(url=>url.includes('/card-review/assets/handdrawn-p08/cards/a11-v3-')&&url.includes('.detail.webp?v=')));assert.equal(row.geometry.fit,'contain');await page.screenshot({path:out+'/390-built-subpath-PASS.png'});await page.getByRole('button',{name:'关闭赏析',exact:true}).tap();await page.locator('.card-art-zoom-dialog').waitFor({state:'detached'});assert.deepEqual(row.errors,[]);row.status='PASS';
   }finally{await context.close();await new Promise(resolve=>built.httpServer.close(resolve));}
  }
 }
 report.status=baseline?'FAIL (expected baseline)':'PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}
finally{await writeFile(out+'/'+(baseline?'baseline-FAIL.json':'browser-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();console.log(JSON.stringify(report));}
