import assert from 'node:assert/strict';
import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
import {chromium} from '/workspace/dachoupai/node_modules/playwright/index.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {waitScene} from '/workspace/dachoupai/harness/ui.mjs';
import {snapshotSource} from '/workspace/dachoupai/scripts/check-runner.mjs';
const root='/workspace/dachoupai',out='/tmp/shop-w2-title';await mkdir(out,{recursive:true});
const source=JSON.parse(await readFile(root+'/docs/production/evidence/w2-build-keepsake-2026-10-09/report.json','utf8'));
const profile=source.profiles.find(p=>p.width===390),saved=profile.transactions.find(t=>t.label==='saved next shop').state;
const server=await createServer({root,mode:'e2e',server:{port:5515,host:'127.0.0.1',strictPort:true},logLevel:'error'});await server.listen();
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const checkpoint=makeCheckpoint(saved,profile.transactions.flatMap(t=>t.commands));assert.equal(readCheckpoint(checkpoint).ok,true);
const report={head:snapshotSource(root).head,before:snapshotSource(root),scope:'Read-only unchanged legal saved next shop, default full screen; no gameplay commands, no asset/code edits.',screens:[],errors:[],physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});
try{
 for(const [width,height,name] of [[320,740,'phone-320'],[740,390,'short-740']]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width===390,reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('dialog',d=>d.accept());page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto('http://127.0.0.1:5515/?harness=1');await waitScene(page,'title');await page.locator('.run-menu-toggle').click();
  const progress=page.getByText('进度与存档',{exact:true}).locator('..');if(!await progress.evaluate(e=>e.open))await progress.locator('summary').click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'same-normal-shop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
  await waitScene(page,'shop');await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
  const state=()=>page.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal};});const before=await state();assert.deepEqual(before.state,saved);
  await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop'),r=s.run;return [...r.jokers,...r.shop.offers].every(x=>['loaded','unregistered'].includes(s.jokerArtStatus(x.definitionId).status));},{},{timeout:15000});
  await page.waitForTimeout(300);const titleGeometry=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),p=s.geometry(),walk=list=>{for(const o of list){if(o.name==='shop/title')return o;if(o.list){const found=walk(o.list);if(found)return found;}}},t=walk(s.children.list),r=t.getBounds();return {text:t.text,bounds:{x:r.x,y:r.y,width:r.width,height:r.height},controls:[{x:p.x+p.w-(s.view.layout.width<=700?96:136)-124,y:p.top-1,width:116,height:34},p.reroll,p.build],layout:p};});const t=titleGeometry.bounds;for(const b of titleGeometry.controls)assert.ok(t.x+t.width<=b.x||b.x+b.width<=t.x||t.y+t.height<=b.y||b.y+b.height<=t.y,'title must not intersect control');assert.equal(titleGeometry.layout.play.height,56);assert.equal(titleGeometry.layout.reroll.height,44);await page.screenshot({path:out+'/'+name+'.png',scale:'css'});assert.deepEqual(await state(),before);
  report.screens.push({width,height,file:name+'.png',stateUnchanged:true,commandSeq:saved.commandSeq,titleGeometry,art:await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');return [...s.run.jokers,...s.run.shop.offers].map(x=>({id:x.definitionId,status:s.jokerArtStatus(x.definitionId).status}));})});await ctx.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;}
finally{report.after=snapshotSource(root);report.sourceUnchanged=JSON.stringify(report.before)===JSON.stringify(report.after);await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();await server.close();}
