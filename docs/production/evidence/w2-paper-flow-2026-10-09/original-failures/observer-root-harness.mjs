import assert from 'node:assert/strict';
import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
import {chromium} from '/workspace/dachoupai/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {tapUI,waitScene,openSelector,confirmHeroRoute,point,openMenuSection} from '/workspace/dachoupai/harness/ui.mjs';
import {snapshotSource} from '/workspace/dachoupai/scripts/check-runner.mjs';
const root='/workspace/dachoupai',out='/tmp/paper-flow-native';await mkdir(out,{recursive:true});
const server=await createServer({root,mode:'e2e',server:{port:5496,host:'127.0.0.1',strictPort:true},logLevel:'error'});await server.listen();
const {applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const report={testedCommit:snapshotSource(root).head,before:snapshotSource(root),profiles:[],errors:[],physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN',scope:'Finite actual mouse/touch first chapter path; source/state observers read-only. No software GPU FPS acceptance.'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{
for(const [width,height,touch] of [[1366,768,false],[390,740,true]]){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:touch}),page=await ctx.newPage(),cdp=await ctx.newCDPSession(page),profile={width,height,touch,transactions:[],sweeps:[]};report.profiles.push(profile);
 page.setDefaultTimeout(18000);page.on('pageerror',e=>report.errors.push(String(e)));page.on('dialog',d=>d.accept());
 await page.addInitScript(()=>{localStorage.setItem('dachoupai-first-chapter-guide-v1',JSON.stringify({disabled:true,skipped:[]}));window.__flowObserved=[];new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.className==='paper-flow')window.__flowObserved.push({at:performance.now(),pointer:getComputedStyle(n).pointerEvents});}).observe(document.documentElement,{childList:true,subtree:true});});
 const state=()=>page.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal};});
 const ready=key=>page.waitForFunction(key=>{const g=window.__harness.game,s=g.scene.getScene(key);return g.scene.isActive(key)&&s.ready&&!s.presentationActive;},key);
 const transaction=async(label,input,key='shop',count=1)=>{const before=await state();await input();await page.waitForFunction(n=>window.__harness.game.registry.get('runController').state.commandSeq>=n,before.state.commandSeq+count);if(key==='game')await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&s.ready&&!s.playing;});else await ready(key);const after=await state(),commands=after.journal.filter(c=>c.expectedSeq>=before.state.commandSeq);assert.equal(commands.length,count);let expected=before.state;for(const c of commands){const r=applyCommand(expected,c);assert.ok(r.ok);expected=r.state;}assert.deepEqual(after.state,expected);profile.transactions.push({label,commands,seq:after.state.commandSeq});return after.state;};
 await page.goto('http://127.0.0.1:5496/?harness=1&seed=1791513668946');await waitScene(page,'title');
 let frames=[],writes=[],captureUntil=Date.now()+6000;if(!touch){await mkdir(out+'/frames',{recursive:true});cdp.on('Page.screencastFrame',e=>{cdp.send('Page.screencastFrameAck',{sessionId:e.sessionId}).catch(()=>{});if(Date.now()>captureUntil||frames.length>=100)return;const file=`frames/${String(frames.length).padStart(4,'0')}.jpg`;frames.push({file,t:e.metadata.timestamp});writes.push(writeFile(out+'/'+file,Buffer.from(e.data,'base64')));});await cdp.send('Page.startScreencast',{format:'jpeg',quality:75,maxWidth:960,maxHeight:540,everyNthFrame:2});}
 // Hold one real shared button to inspect face vs hit geometry, then release normally.
 const pt=await point(page,'title','action/title-start');
 const geometry=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('title'),walk=l=>{for(const o of l){if(o.name==='action/title-start')return o;if(o.list){const r=walk(o.list);if(r)return r;}}},b=walk(s.children.list),a=b.getData('buttonArt'),r=b.getBounds();return {bounds:{x:r.x,y:r.y,width:r.width,height:r.height},scale:a.scaleX};});
 const before=await geometry();if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pt.x,y:pt.y}]});else{await page.mouse.move(pt.x,pt.y);await page.mouse.down();}await page.waitForTimeout(110);const pressed=await geometry();assert.deepEqual(pressed.bounds,before.bounds);assert.ok(Math.abs(pressed.scale-.955)<.001);profile.press={before,pressed};await page.screenshot({path:out+`/pressed-${width}.png`,scale:'css'});
 if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();await waitScene(page,'character-select');await page.waitForTimeout(100);await page.screenshot({path:out+`/sweep-${width}.png`,scale:'css'});
 await tapUI(page,'character-select','character/erxiang',touch);await confirmHeroRoute(page,touch);await ready('shop');let s=(await state()).state;
 assert.equal(s.gold,6);const starter=s.shop.offers.find(o=>o.definitionId==='mantangcai');await tapUI(page,'shop','offer/'+starter.offerId,touch);s=await transaction('purchase saved starter',()=>page.getByRole('button',{name:/^邀请 · 4 金$/})[touch?'tap':'click']());
 if(!touch){await cdp.send('Page.stopScreencast');await Promise.all(writes);profile.frames=frames;}
 s=await transaction('enter saved stage',()=>tapUI(page,'shop','action/start-stage',touch),'game',2);
 await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.cardViews.every(c=>!c.dealing&&!s.tweens.isTweening(c.container));});
 const visible=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.cardViews.filter(c=>c.container.visible).map(c=>c.card);}),pair=visible.filter(c=>c.rank==='K'||c.rank===13);assert.equal(pair.length,2);for(const c of pair)await tapUI(page,'game','card/'+c.id,touch);
 s=await transaction('play actual visible kings',()=>tapUI(page,'game','action/play',touch),'intermission');assert.equal(s.phase,'stage-cleared');await page.screenshot({path:out+`/intermission-${width}.png`,scale:'css'});
 await page.waitForTimeout(650);s=await transaction('continue saved stage',()=>tapUI(page,'intermission','action/continue-stage',touch));assert.equal(s.phase,'shop');
 await page.waitForTimeout(650);assert.equal(await page.locator('.paper-flow').count(),0);profile.sweeps=await page.evaluate(()=>window.__flowObserved);assert.ok(profile.sweeps.length>=5);assert.ok(profile.sweeps.every(e=>e.pointer==='none'));
 // Actual setting then native next scene: reduced motion adds no sheet.
 await openMenuSection(page,'settings',touch);await page.getByLabel('减少动态',{exact:false}).check();await page.locator('.run-menu-toggle')[touch?'tap':'click']();const n=profile.sweeps.length;
 await transaction('reduced motion next entry',()=>tapUI(page,'shop','action/start-stage',touch),'game',2);await page.waitForTimeout(650);assert.equal(await page.locator('.paper-flow').count(),0);assert.equal(await page.evaluate(()=>window.__flowObserved.length),n);profile.lowMotion='PASS';
 await page.screenshot({path:out+`/low-motion-${width}.png`,scale:'css'});await ctx.close();
}
assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);report.stack=e.stack;process.exitCode=1;}
finally{report.after=snapshotSource(root);report.sourceUnchanged=JSON.stringify(report.before)===JSON.stringify(report.after);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,profiles:report.profiles.map(p=>({width:p.width,commands:p.transactions.length,sweeps:p.sweeps.length}))}));await browser.close();await server.close();}
