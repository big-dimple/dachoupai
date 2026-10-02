import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {chooseCharacter,buyOffer,tapUI,waitScene} from './ui.mjs';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={checks:[],physicalDevice:'NOT_RUN'};
try{
 if(process.env.F04_ONLY!=='1'){
 const context=await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:3,hasTouch:true,reducedMotion:'reduce'});const p=await context.newPage();p.setDefaultTimeout(30000);
 const requests=[];p.on('request',r=>requests.push(r.url()));let active=0,maxActive=0;const inFlight=new Set();p.on('request',r=>{if(r.url().includes('-detail.webp')){inFlight.add(r);active++;maxActive=Math.max(active,maxActive);}});const finished=r=>{if(inFlight.delete(r))active--;};p.on('requestfinished',finished);p.on('requestfailed',finished);
 await p.route('**/f09-detail.webp',route=>route.abort());await p.goto('http://127.0.0.1:5201/?harness=1&seed=f09-sample-30');await waitScene(p,'title');
 assert.ok(!requests.some(u=>u.includes('jokers-p07/')));report.checks.push('title requests no Joker thumbnails or high resolution');
 await chooseCharacter(p,'amo',true);let s=await p.evaluate(()=>window.__harness.game.registry.get('runController').state);await buyOffer(p,s.shop.offers.find(o=>o.definitionId==='f09').offerId,true);await tapUI(p,'shop','action/start-stage',true);await waitScene(p,'game');
 s=await p.evaluate(()=>window.__harness.game.registry.get('runController').state);await tapUI(p,'game','joker/'+s.jokers[0].instanceId,true);
 await p.getByRole('button',{name:'重试高清',exact:true}).waitFor({state:'visible'});const frame=p.locator('.f09-art-window'),before=await frame.boundingBox();
 assert.ok(await p.locator('.f09-art-window .dialog-card-image').evaluate(i=>i.complete&&i.naturalWidth===256));
 const ability=await p.locator('.card-ability').boundingBox();assert.ok(ability.y<before.y);assert.ok(ability.y+ability.height<740*.55);assert.equal(await p.locator('.card-rules').evaluate(e=>e.open),false);
 assert.equal(await p.locator('.f09-script').evaluate(e=>getComputedStyle(e).animationName),'none');await p.screenshot({path:'shots/f09/latest-mobile-f09-fallback.png'});
 await p.unroute('**/f09-detail.webp');await p.getByRole('button',{name:'重试高清',exact:true}).tap();await p.waitForFunction(()=>document.querySelector('.f09-art-window .dialog-card-image')?.naturalWidth===615);
 const after=await frame.boundingBox();assert.ok(Math.abs(before.height-after.height)<1&&Math.abs(before.width-after.width)<1);await p.screenshot({path:'shots/f09/latest-mobile-f09-detail.png'});
 assert.ok(maxActive<=2);report.checks.push('HD failure retains 256px thumbnail; retry upgrades to 615px without frame shift; max HD concurrency '+maxActive,'ability precedes artwork; rules folded; OS reduced-motion stops layers');
 await context.close();
 }
 const c=await browser.newContext({viewport:{width:390,height:740},hasTouch:true});const q=await c.newPage();await q.goto('http://127.0.0.1:5201/?harness=1&seed=f04-copy-70');await chooseCharacter(q,'amo',true);const state=await q.evaluate(()=>window.__harness.game.registry.get('runController').state);const offer=state.shop.offers.find(o=>o.definitionId==='f04');assert.ok(offer,'natural F04 shelf seed');await tapUI(q,'shop','offer/'+offer.offerId,true);
 assert.match(await q.locator('.card-ability').innerText(),/只剩 3 金币或更少[\s\S]*整手倍率 \+3/);assert.equal(await q.locator('.card-rules').evaluate(e=>e.open),false);await q.screenshot({path:'shots/f09/latest-mobile-f04-copy.png'});report.checks.push('F04 comparison: literal <=3 condition, additive +3, flavor separated and rules folded');await c.close();
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);throw error;}finally{await writeFile('shots/f09/edge.json',JSON.stringify(report,null,2));await browser.close();}
