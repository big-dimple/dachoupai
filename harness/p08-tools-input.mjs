/** Native touch overlap with delayed tool thumbnails; reuses the tested Canvas build. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createServer,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene,point} from './ui.mjs';
const dir='shots/p08-tools-s1',base='/tools-s1/';
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});let fixture;
try{const {createRun}=await ssr.ssrLoadModule('/src/domain/run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');const s=createRun({seed:'p08-tools-input',runId:'fixture/p08-tools-input',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});s.shop.toolOffers=[{offerId:'review/T12',definitionId:'T12',price:5,consumed:false}];const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok);fixture=JSON.stringify(cp);}finally{await ssr.close();}
const server=await preview({base,build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5294,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const fingerprint=createHash('sha256');for(const path of execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src'],{encoding:'utf8'}).trim().split('\n').sort()){fingerprint.update(path+'\0');fingerprint.update(await readFile(path));fingerprint.update('\0');}
const report={status:'IN_PROGRESS',build:JSON.parse(await readFile(dir+'/build/build-info.json')),sourceFingerprint:fingerprint.digest('hex'),renderer:'Canvas',viewport:{width:390,height:740},DPR:1,checks:[],errors:[]};
function findTarget(page,store=false){return page.evaluate(store=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>{for(const o of list){if(o.name==='offer/review/T12')return o;if(o.list){const hit=walk(o.list);if(hit)return hit;}}},o=walk(s.children.list);if(store)window.__toolTarget=o;return {same:o===window.__toolTarget,active:!!o?.active,input:!!o?.input?.enabled,selected:s.selectedOfferId};},store);}
try{
 for(const mode of ['tap-overlap','move-cancel','close-late']){
  const ctx=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await ctx.newPage();page.on('pageerror',e=>report.errors.push(String(e)));page.on('dialog',d=>d.accept());let release,releaseJokers;const gate=new Promise(yes=>{release=yes;}),jokerGate=new Promise(yes=>{releaseJokers=yes;});
  await page.route('**/tool-t12.thumbnail.webp',async route=>{await gate;await route.continue().catch(()=>{});});
  await page.route('**/handdrawn-p08/cards/*.thumbnail.webp',async route=>{await jokerGate;await route.continue().catch(()=>{});});
  try{
   await page.goto('http://127.0.0.1:5294'+base+'?harness=1');await waitScene(page,'title');await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'tools-input-fixture.json',mimeType:'application/json',buffer:Buffer.from(fixture)});await waitScene(page,'shop');await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');window.__lateJokerIds=s.run.shop.offers.map(o=>o.definitionId);});await tapUI(page,'shop','action/shelf-tools',true);assert.equal(await page.evaluate(()=>window.__lateJokerIds.some(id=>window.__harness.game.scene.getScene('shop').textures.exists('p08-joker-'+id))),false,'old shelf Joker requests remain delayed while tools are active');
   const before=await page.evaluate(()=>window.__harness.game.registry.get('runController').state);await findTarget(page,true);
   if(mode==='close-late'){
    let releaseHD;const hdGate=new Promise(yes=>{releaseHD=yes;});await page.route('**/tool-t12.detail.webp',async r=>{await hdGate;await r.continue().catch(()=>{});});await tapUI(page,'shop','offer/review/T12',true);await page.getByRole('button',{name:'取消',exact:true}).waitFor();await page.evaluate(()=>{window.__closedToolImage=document.querySelector('.detail-dialog[open] img');window.__closedToolSource=window.__closedToolImage.src;});await page.getByRole('button',{name:'取消',exact:true}).tap();await findTarget(page,true);release();releaseJokers();releaseHD();await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.textures.exists('goods-art/T12')&&window.__lateJokerIds.every(id=>s.textures.exists('p08-joker-'+id));});assert.equal(await page.locator('.detail-dialog[open]').count(),0);assert.equal(await page.evaluate(()=>window.__closedToolImage.src===window.__closedToolSource),true);assert.ok((await findTarget(page)).same);report.checks.push('cross old-Joker + tool callbacks: closed dialog stays closed; late thumb paints only the current picture holder; canceled HD cannot mutate removed image');
   }else{
    const p=await point(page,'shop','offer/review/T12'),cdp=await ctx.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});
    if(mode==='move-cancel')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+90,y:p.y}]});
    release();releaseJokers();await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.textures.exists('goods-art/T12')&&window.__lateJokerIds.every(id=>s.textures.exists('p08-joker-'+id));});const live=await findTarget(page);assert.ok(live.same&&live.active&&live.input,'arrival preserves exact live interactive identity');assert.equal(live.selected,undefined);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if(mode==='tap-overlap'){await page.getByRole('button',{name:'取消',exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('shop').selectedOfferId),'review/T12');await page.getByRole('button',{name:'取消',exact:true}).tap();report.checks.push('cross old-Joker + tool callbacks: native down → thumbnail arrival → up opens the correct detail; exact hit identity retained during arrival');}
    else{await page.evaluate(()=>new Promise(resolve=>window.__harness.game.events.once('poststep',resolve)));assert.equal(await page.locator('.detail-dialog[open]').count(),0);assert.equal((await findTarget(page)).selected,undefined);report.checks.push('cross old-Joker + tool callbacks: native movement cancellation survives thumbnail arrival; release opens nothing');}
   }
   assert.deepEqual(await page.evaluate(()=>window.__harness.game.registry.get('runController').state),before);
  }finally{release();releaseJokers();await ctx.close();}
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;console.error(error);}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/input-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
