import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {waitScene,tapUI} from './ui.mjs';
const out='docs/production/evidence/staged-image-warmup-2026-10-13',browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const context=await browser.newContext({viewport:{width:390,height:740},hasTouch:true}),page=await context.newPage(),requests=[],failures=[],errors=[];
page.on('request',r=>{if(/characters\/amo\./.test(r.url()))requests.push({url:r.url(),at:Date.now()});});page.on('requestfailed',r=>{if(/characters\/amo\./.test(r.url()))failures.push({url:r.url(),at:Date.now(),error:r.failure()});});page.on('pageerror',e=>errors.push(String(e)));
await page.route('**/assets/handdrawn-p08/characters/amo.*.webp',()=>{});
const report={fault:'Three existing amo images never respond; fetch + decode deadline is 4500ms, one automatic transient retry.',requests,failures,errors};
try{
 await page.goto((process.env.WARMUP_URL??'http://127.0.0.1:5175')+'/?harness=1&seed=warmup-stall',{waitUntil:'domcontentloaded'});await waitScene(page,'title');report.titleUsableMs=await page.evaluate(()=>performance.now());assert.ok(report.titleUsableMs<4500);
 await tapUI(page,'title','action/title-start',true);await waitScene(page,'character-select');await tapUI(page,'character-select','character/amo',true);
 await page.waitForFunction(()=>document.querySelector('[data-image-warmup]')?.textContent.startsWith('3张图暂用简图'),undefined,{timeout:30000});
 const walk=list=>{for(const o of list){if(o.name==='action/confirm-character')return o;if(o.list){const found=walk(o.list);if(found)return found;}}};
 report.controls=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select'),walk=list=>{for(const o of list){if(o.name==='action/confirm-character')return o;if(o.list){const f=walk(o.list);if(f)return f;}}};return {selectorActive:s.scene.isActive(),confirmEnabled:walk(s.children.list)?.input?.enabled,heroLoaded:window.__harness.game.textures.exists('opening-portrait-amo')};});assert.equal(report.controls.confirmEnabled,true);assert.equal(report.controls.heroLoaded,false);
 await page.screenshot({path:out+'/mobile-stall-fallback.png'});await tapUI(page,'character-select','action/confirm-character',true);await page.waitForFunction(()=>window.__harness.game.scene.getScene('character-select').step==='route');
 assert.equal(requests.length,6,'exactly two attempts for each stalled image');assert.equal(failures.length,6,'all timed out requests aborted');assert.deepEqual(errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;await page.screenshot({path:out+'/mobile-stall-FAIL.png'});}finally{await browser.close();await writeFile(out+'/stall.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
