/** Real owned-card input with a controlled delay before its native release callback. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {openSelector,confirmHeroRoute,tapUI,buyOffer,waitScene} from './ui.mjs';
const before=process.env.OWNED_CLOCK_PHASE==='before',out=process.env.OWNED_CLOCK_OUT??'shots/owned-card-clock/'+(before?'before':'after');
await mkdir(out,{recursive:true});const files=['src/game/OwnedJokerInput.ts','src/game/PointerReleaseTime.ts','harness/owned-card-release-clock.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before,sourceHashes:await hashes(),scope:'Actual fresh six-gold run, affordable public joker purchase, real native mouse/touch. A 600ms capture listener delays only the release callback; no input-handler, controller, save or stock replacement. Not physical-device performance acceptance.',cases:[]};
const buildDir=path.resolve(out,'build');await build({mode:'e2e',build:{outDir:buildDir,emptyOutDir:true},logLevel:'error'});
const server=await preview({build:{outDir:buildDir},preview:{host:'127.0.0.1',port:5598,strictPort:true},logLevel:'error'}),browser=await chromium.launch();report.browser=browser.version();let active;
const snapshot=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:await c.store.read()};});
const ownedPoint=p=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),b=s.geometry().slots[0],r=s.game.canvas.getBoundingClientRect(),q=s.cameras.main.matrix.transformPoint(b.x+b.width/2,b.y+b.height/2);return{x:r.left+q.x*r.width/s.scale.width,y:r.top+q.y*r.height/s.scale.height};});
try{
 for(const viewport of[{width:1366,height:900},{width:390,height:740},{width:320,height:568}]){
  const touch=viewport.width<700,ctx=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:touch?2:1}),p=await ctx.newPage();active=p;
  await p.addInitScript(()=>{window.addEventListener('pointerdown',e=>{if(e.target instanceof HTMLElement&&e.target.classList.contains('shop-owned-input'))window.__ownedDownStamp=e.timeStamp;},true);window.addEventListener('pointerup',e=>{const delay=window.__ownedReleaseDelay;if(!delay)return;window.__ownedReleaseDelay=0;const started=performance.now();while(performance.now()-started<delay){}window.__ownedReleaseObservation={nativeDuration:e.timeStamp-window.__ownedDownStamp,callbackDelay:performance.now()-started,trusted:e.isTrusted,type:e.pointerType};},true);});
  const row={viewport,touch,errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));await p.goto('http://127.0.0.1:5598/?harness=1&seed=interrupted-pointer');await waitScene(p,'title');await openSelector(p,touch);await tapUI(p,'character-select','character/laohuan',touch);await confirmHeroRoute(p,touch,'group');await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
  const initial=await snapshot(p);assert.equal(initial.state.gold,6);const offer=initial.state.shop.offers.find(o=>!o.consumed&&o.price<=initial.state.gold);assert.ok(offer);await buyOffer(p,offer.offerId,touch);await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready&&window.__harness.game.registry.get('runController').state.jokers.length===1);await p.waitForTimeout(750);
  row.purchased=await snapshot(p);assert.equal(row.purchased.state.gold,6-offer.price);assert.equal(row.purchased.journal.length,initial.journal.length+1);const at=await ownedPoint(p),cdp=await ctx.newCDPSession(p);
  const down=async()=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:at.x,y:at.y,id:1}]});else{await p.mouse.move(at.x,at.y);await p.mouse.down();}};
  const up=async()=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.mouse.up();};
  await down();await p.waitForFunction(()=>!window.__harness.game.scene.getScene('shop').input.enabled);await p.evaluate(()=>window.__ownedReleaseDelay=600);await p.waitForTimeout(50);await up();await p.waitForTimeout(100);row.release=await p.evaluate(()=>window.__ownedReleaseObservation);assert.equal(row.release.trusted,true);assert.ok(row.release.nativeDuration>=0&&row.release.nativeDuration<350,'genuine native short press');assert.ok(row.release.callbackDelay>=600);row.delayedDialogs=await p.locator('.detail-dialog[open]').count();assert.equal(row.delayedDialogs,before?0:1);assert.deepEqual(await snapshot(p),row.purchased);await p.screenshot({path:out+'/'+viewport.width+'-delayed-release.png',scale:'css'});if(row.delayedDialogs)await p.keyboard.press('Escape');
  await p.waitForTimeout(400);if(touch)await p.touchscreen.tap(at.x,at.y);else await p.mouse.click(at.x,at.y);await p.locator('.detail-dialog[open]').waitFor();row.freshDetail=true;assert.deepEqual(await snapshot(p),row.purchased);await p.keyboard.press('Escape');
  await p.waitForTimeout(400);await down();await p.waitForTimeout(430);await up();await p.waitForTimeout(100);assert.equal(await p.locator('.detail-dialog[open]').count(),0,'ready-state stationary hold does not become a tap');assert.deepEqual(await snapshot(p),row.purchased);row.realHoldCanceled=true;
  await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);assert.deepEqual(await snapshot(p),row.purchased);row.coldRestore=true;assert.deepEqual(row.errors,[]);row.status=before?'EXPECTED_GAP_REPRODUCED':'PASS';console.log(row.status,viewport.width);await ctx.close();active=undefined;
 }
 report.sourceUnchanged=JSON.stringify(await hashes())===JSON.stringify(report.sourceHashes);assert.ok(report.sourceUnchanged);report.status=before?'EXPECTED_GAP_REPRODUCED':'PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;console.error(e);if(active)await active.screenshot({path:out+'/FAIL.png'}).catch(()=>{});}
finally{await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));await browser.close();await server.close();console.log(report.status);}
