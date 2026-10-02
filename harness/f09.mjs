/** Natural F09 acquisition, real UI inputs, separate Canvas / WebGL evidence. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {build,preview} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {chooseCharacter,buyOffer,tapUI,waitScene,openSelector,openMenuSection} from './ui.mjs';
const renderer=process.env.F09_RENDERER||'webgl',root='shots/f09',outDir=root+'/build';
await mkdir(root,{recursive:true});
if(process.env.F09_REUSE!=='1')await build({mode:'e2e',build:{outDir,emptyOutDir:true},logLevel:'warn'});
const server=await preview({build:{outDir},preview:{host:'127.0.0.1',port:5205,strictPort:true}});
const args=renderer==='canvas'?['--disable-gpu','--disable-software-rasterizer']:['--enable-unsafe-swiftshader'];
const browser=await chromium.launch({executablePath:process.env.F09_CHROMIUM||'/usr/bin/chromium',args});
const reports={rendererRequested:renderer,args,browser:browser.version(),physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN',runs:[]};
const state=p=>p.evaluate(()=>window.__harness.game.registry.get('runController').state);
const metrics=p=>p.evaluate(()=>{const g=window.__harness.game,gl=g.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');return {renderer:gl?'WebGL':'Canvas',fps:g.loop.actualFps,framebuffer:[g.canvas.width,g.canvas.height],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};});
try{for(const mobile of [false,true]){
const name=mobile?'mobile':'desktop',viewport=mobile?{width:412,height:820}:{width:1280,height:800};
const ctx=await browser.newContext({viewport,deviceScaleFactor:mobile?3:1,hasTouch:mobile,...(renderer==='canvas'?{recordVideo:{dir:root+'/video',size:viewport}}:{})});
const page=await ctx.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
const report={name,viewport,deviceScaleFactor:mobile?3:1,checks:[],samples:[]};reports.runs.push(report);
const shot=async suffix=>page.screenshot({path:`${root}/final-${renderer}-${name}-${suffix}.png`});
try{
 await page.goto('http://127.0.0.1:5205/?harness=1&seed=f09-sample-30');await chooseCharacter(page,'amo',mobile);
 let s=await state(page);await buyOffer(page,s.shop.offers.find(o=>o.definitionId==='f09').offerId,mobile);
 await tapUI(page,'shop','action/start-stage',mobile);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').ready&&window.__harness.game.scene.getScene('game').cardViews.length);
 s=await state(page);const joker=s.jokers[0].instanceId,chosen=s.handOrder[0];
 await tapUI(page,'game','card/'+chosen,mobile);await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible));
 const values=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return [s.scoreHeat.text,s.scoreMult.text,s.scoreTotal.text];});assert.deepEqual(values,['49','× 6.75','330']);report.checks.push('49 × 6.75 = floor(330.75), all four sources visible');
 await shot('ready');report.samples.push({stage:'ready',...await metrics(page)});
 await tapUI(page,'game','score/sources',mobile);const body=await page.locator('.dialog-body').innerText();assert.match(body,/9♥.*\+9/);assert.match(body,/阿默.*×3/);assert.match(body,/不换词.*×1.5/);assert.doesNotMatch(body,/\+330 倍率/);await page.getByRole('button',{name:'关闭',exact:true}).click();
 await tapUI(page,'game','joker/'+joker,mobile);await page.locator('.f09-art-window .dialog-card-image').evaluate(i=>i.decode());await shot('detail');
 const rect=await page.locator('.f09-art-window').boundingBox();assert.ok(Math.abs(rect.width/rect.height-615/768)<.005);await page.waitForTimeout(1200);await page.getByRole('button',{name:'关闭',exact:true}).click();
 if(mobile){const before=await state(page);await page.setViewportSize({width:412,height:700});await page.waitForTimeout(250);await shot('browser-bars');assert.deepEqual(await state(page),before);await page.setViewportSize(viewport);
 await page.evaluate(()=>{window.orientationLocks=0;screen.orientation.lock=async()=>{window.orientationLocks++;};});await page.locator('.run-fullscreen-toggle').tap();await page.waitForFunction(()=>!!document.fullscreenElement);assert.equal(await page.evaluate(()=>window.orientationLocks),0);await page.locator('.run-fullscreen-toggle').tap();await page.waitForFunction(()=>!document.fullscreenElement);report.checks.push('toolbar viewport resize retains state; fullscreen never requests orientation lock');}
 const started=Date.now();await tapUI(page,'game','action/play',mobile);
 await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').resultText.text.includes('不换词'));
 await shot('trigger');await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing);
 s=await state(page);assert.equal(s.lastTrace.finalScore,'330');assert.ok(s.lastTrace.events.some(e=>e.sourceDefinitionId==='f09'));report.samples.push({stage:'play-complete',elapsedMs:Date.now()-started,...await metrics(page)});
 await tapUI(page,'game','card/'+s.handOrder[0],mobile);await tapUI(page,'game','action/discard',mobile);await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing);
 s=await state(page);assert.equal(s.stage.discardsUsed,1);assert.deepEqual(await page.evaluate(()=>[...window.__harness.game.scene.getScene('game').jokerViews.values()].map(v=>v.getData('valueLabel').text)),['已失效']);await shot('inactive');
 await tapUI(page,'game','joker/'+joker,mobile);assert.equal(await page.locator('.f09-ability strong').innerText(),'本场不再加成');await shot('inactive-detail');await page.getByRole('button',{name:'关闭',exact:true}).click();
 await tapUI(page,'game','card/'+s.handOrder[0],mobile);await tapUI(page,'game','action/play',mobile);await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing);
 s=await state(page);assert.ok(!s.lastTrace.events.some(e=>e.sourceDefinitionId==='f09'));report.checks.push('F09 triggers, successful discard disables both UI and actual next score');
 await page.reload();await openSelector(page);assert.deepEqual(await state(page),s);report.checks.push('refresh restores full state and RNG exactly');
 assert.deepEqual(errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);report.errors=errors;await shot('failure').catch(()=>{});}
if(renderer==='canvas'){const video=page.video();await ctx.close();await video.saveAs(`${root}/${name}-play.webm`);}else await ctx.close();
console.log(JSON.stringify(report));await writeFile(`${root}/final-${renderer}.json`,JSON.stringify(reports,null,2));
}}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
if(reports.runs.some(r=>r.status!=='PASS'))process.exitCode=1;
