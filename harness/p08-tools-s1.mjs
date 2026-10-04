/** Four approved tool/item faces; legal imported fixtures, not natural inventory. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';
const dir='shots/p08-tools-s1',base='/tools-s1/',manifest=JSON.parse(await readFile('public/assets/handdrawn-tools/manifest.json'));
await mkdir(dir,{recursive:true});const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'}),fixtures=[];
try{
  const {createRun}=await ssr.ssrLoadModule('/src/domain/run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
  for(const ids of [['T12'],['P11'],['S02']]){
    const state=createRun({seed:'p08-tools-s1',runId:'fixture/p08-tools-s1',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
    state.gold=100;state.handLevels['flush-house']=1;
    state.shop.toolOffers=ids.map(id=>({offerId:'review/'+id,definitionId:id,price:{T12:5,P11:4,S02:8,T01:4}[id],consumed:false}));
    state.shop.itemOffers=[{offerId:'review/U07',definitionId:'U07',price:10,consumed:false}];
    const cp=makeCheckpoint(state,[]);assert.ok(readCheckpoint(cp).ok);fixtures.push(JSON.stringify(cp));
  }
}finally{await ssr.close();}
const fingerprint=createHash('sha256');for(const p of execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src'],{encoding:'utf8'}).trim().split('\n').sort()){fingerprint.update(p+'\0');fingerprint.update(await readFile(p));fingerprint.update('\0');}
await build({mode:'e2e',base,build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({base,build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5294,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={status:'IN_PROGRESS',sourceFingerprint:fingerprint.digest('hex'),build:JSON.parse(await readFile(dir+'/build/build-info.json')),assetCommit:manifest.sourceCommit,runtimeManifestSHA256:createHash('sha256').update(await readFile('public/assets/handdrawn-tools/manifest.json')).digest('hex'),renderer:'Canvas',viewport:{width:390,height:740},DPR:1,safeInset:{top:0,right:0,bottom:0,left:0},base,route:'Validator-approved imported shop fixtures; One T12, P11 or S02 tool offer and U07 item offer,100gold,flush-house discovered. Native tabs/offer/cancel/purchase. Not natural acquisition/deployment.',checks:[],details:[],errors:[]};
async function context(){const ctx=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await ctx.newPage(),requests=[];page.on('request',r=>{if(r.url().includes('handdrawn-tools'))requests.push(new URL(r.url()).pathname);});page.on('pageerror',e=>report.errors.push(String(e)));page.on('dialog',d=>d.accept());return {ctx,page,requests};}
async function install(page,index){await page.goto('http://127.0.0.1:5294'+base+'?harness=1');await waitScene(page,'title');await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'tools-s1-fixture.json',mimeType:'application/json',buffer:Buffer.from(fixtures[index])});await waitScene(page,'shop');await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);assert.equal(await page.evaluate(()=>window.__harness.game.renderer.gl?'WebGL':'Canvas'),'Canvas');}
const state=page=>page.evaluate(()=>window.__harness.game.registry.get('runController').state);
async function cancel(page){await page.getByRole('button',{name:'取消',exact:true}).tap();}
async function detail(page,id){await tapUI(page,'shop','offer/review/'+id,true);await page.waitForFunction(()=>[...document.querySelectorAll('.detail-dialog[open] img')].some(i=>i.complete&&i.naturalWidth===615&&i.naturalHeight===768));const actual=await page.locator('.detail-dialog[open] img').evaluate(async i=>{const b=await(await fetch(i.src)).arrayBuffer(),sha=await crypto.subtle.digest('SHA-256',b),r=i.getBoundingClientRect(),f=i.closest('figure').getBoundingClientRect();return {width:i.naturalWidth,height:i.naturalHeight,bytes:b.byteLength,sha256:[...new Uint8Array(sha)].map(v=>v.toString(16).padStart(2,'0')).join(''),fit:getComputedStyle(i).objectFit,frame:{width:f.width,height:f.height},image:{width:r.width,height:r.height}};});const expected=manifest.assets.find(a=>a.domainId===id).outputs.find(o=>o.purpose==='detail');for(const k of ['bytes','sha256','width','height'])assert.equal(actual[k],expected[k]);assert.equal(actual.fit,'contain');report.details.push({id,...actual});}
try{
  for(let index=0;index<3;index++){
    const {ctx,page,requests}=await context();try{
      await install(page,index);await tapUI(page,'shop','action/shelf-tools',true);const ids=[['T12'],['P11'],['S02']][index];
      await page.waitForFunction(ids=>ids.every(id=>window.__harness.game.scene.getScene('shop').textures.exists('goods-art/'+id)),ids);
      const before=await state(page);assert.ok(!requests.some(p=>p.endsWith('.detail.webp')),'no HD before a detail opens');
      for(const id of ids){const texture=await page.evaluate(id=>{const s=window.__harness.game.scene.getScene('shop'),image=s.textures.get('goods-art/'+id).getSourceImage(),walk=list=>{for(const o of list){if(o.name==='shop/goods-art/'+id)return o;if(o.list){const hit=walk(o.list);if(hit)return hit;}}},holder=walk(s.children.list);return {width:image.naturalWidth,height:image.naturalHeight,visible:!!holder?.active&&holder.list.some(o=>o.texture?.key==='goods-art/'+id)};},id);assert.equal(texture.width,128);assert.equal(texture.height,160);assert.ok(texture.visible);assert.ok(requests.includes(base+'assets/handdrawn-tools/tool-'+id.toLowerCase()+'.thumbnail.webp'));}
      if(!index){await page.screenshot({path:dir+'/390-tools-s1-shop.png'});report.checks.push('one actual390×740 T12 representative shop PNG');}
      for(const id of ids){await detail(page,id);const body=await page.locator('.detail-dialog[open]').textContent();assert.ok(body.includes(id==='T12'?'1/4':id==='P11'?'同花葫芦':'5/10'));await cancel(page);assert.deepEqual(await state(page),before);const count=requests.filter(p=>p.endsWith('tool-'+id.toLowerCase()+'.detail.webp')).length;await detail(page,id);await cancel(page);assert.equal(requests.filter(p=>p.endsWith('tool-'+id.toLowerCase()+'.detail.webp')).length,count,'reopen uses decoded HD cache');}
      await tapUI(page,'shop','action/shelf-items',true);await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').textures.exists('goods-art/U07'));assert.ok(!requests.some(p=>p.endsWith('item-u07.detail.webp')));await detail(page,'U07');await cancel(page);assert.deepEqual(await state(page),before);
      if(!index){await detail(page,'U07');await page.getByRole('button',{name:'确认购买',exact:true}).tap();await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready&&window.__harness.game.registry.get('runController').state.longTermItems.includes('U07'));const after=await state(page);assert.equal(after.gold,before.gold-10);assert.equal(after.commandSeq,before.commandSeq+1);assert.equal(after.longTermItems.filter(id=>id==='U07').length,1);assert.deepEqual(after.rng,before.rng);report.checks.push('U07 explicit purchase once /10gold/+1 persisted item; cancel inspections leave full run unchanged');}
      report.checks.push('fixture'+index+' actual thumbs/BASE_URL/no HD preload/all HD hash/contain/close-reopen-cache/full run-RNG unchanged');
    }finally{await ctx.close();}
  }
  const {ctx,page}=await context();try{
    let missing=true;await page.route('**/tool-t12.*.webp',r=>missing?r.fulfill({status:404,body:'missing fixture'}):r.continue());await install(page,0);await tapUI(page,'shop','action/shelf-tools',true);
    await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.textures.exists('goods-motif/T12')&&!s.textures.exists('goods-art/T12');});const before=await state(page);
    await tapUI(page,'shop','offer/review/T12',true);await page.getByRole('button',{name:'重试高清',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('.detail-dialog[open] figure')?.dataset.artFallback==='mechanism');
    const frame=await page.locator('.detail-dialog[open] figure').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));missing=false;await page.getByRole('button',{name:'重试卡面',exact:true}).tap();await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').textures.exists('goods-art/T12'));await page.getByRole('button',{name:'重试高清',exact:true}).tap();await page.waitForFunction(()=>document.querySelector('.detail-dialog[open] img')?.naturalWidth===615);assert.deepEqual(await page.locator('.detail-dialog[open] figure').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),frame);await cancel(page);assert.deepEqual(await state(page),before);report.checks.push('404 thumb+HD shows mechanism fallback; explicit retries restore thumb+HD; fixed frame/no run mutation');
  }finally{await ctx.close();}
  assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;console.error(error);}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,sourceFingerprint:report.sourceFingerprint,checks:report.checks}));}
