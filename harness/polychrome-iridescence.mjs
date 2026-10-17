import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {waitScene,tapUI} from './ui.mjs';

const root=process.cwd(),port=5659,dir=resolve(process.env.IRIDESCENCE_OUTPUT||'shots/polychrome-iridescence');
await mkdir(dir,{recursive:true});
const server=await createServer({root,mode:'e2e',cacheDir:resolve('shots/polychrome-vite'),server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
console.log('Local evidence server ready');
const {cardValueVisualFixture}=await server.ssrLoadModule('/harness/fixtures/card-value-visual.ts');
const {makeCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {r2Price,r2ToolPrice}=await server.ssrLoadModule('/src/domain/r2Shop.ts');
const {assertRunInvariants}=await server.ssrLoadModule('/src/domain/run.ts');
console.log('Fixtures loaded');
const browser=await chromium.launch({headless:true}).catch(async error=>{await server.close();throw error;});
console.log('Chromium launched');
const file='src/game/PolychromeCardIridescence.ts';
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes:{},scope:'Actual ShopScene production hooks on a controlled legal five-slot saved fixture, including S05 shelf/inventory. GameScene remains test-only component attachment awaiting its owner. No natural acquisition or physical-device claim.',cases:[]};
for(const path of [file,'src/game/ShopScene.ts','src/game/ForgetTechniqueAttention.ts','src/game/ForgetTechniqueAttention.css','src/game/ConsumableDialog.ts'])report.sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');
const observe=p=>p.evaluate(()=>window.__edges.map(e=>({name:e.name,edition:e.getData('edition'),motion:e.getData('motion'),phase:e.getData('phase'),draws:e.getData('draws'),visible:e.visible,active:e.active})));
const state=p=>p.evaluate(()=>JSON.stringify({state:window.__harness.game.registry.get('runController').state,journal:window.__harness.game.registry.get('runController').journal}));
const nextFrame=p=>p.evaluate(()=>new Promise(r=>window.__harness.game.events.once('poststep',r)));
async function importFixture(p,s){
  await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
  const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'controlled-iridescence-five.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});
  await waitScene(p,'shop');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.ready&&s.view.root.alpha===1&&!s.tweens.isTweening(s.view.root)&&s.offerArts.every(a=>a.alpha===1&&!s.tweens.isTweening(a));});
}
async function collectShop(p,name='card/polychrome-iridescence'){
  return p.evaluate(name=>{
    const scene=window.__harness.game.scene.getScene('shop'),run=scene.run,edges=[];
    const walk=list=>{for(const o of list){if(o.name===name)edges.push(o);if(o.list)walk(o.list);}};walk(scene.view.root.list);
    window.__edges=edges;return {edges:edges.length,ordinary:run.jokers.filter(j=>j.edition==='none').length,slots:run.jokers.length};
  },name);
}
try{
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
    const key=viewport.width===390?'portrait':'pc',context=await browser.newContext({viewport,hasTouch:key==='portrait',deviceScaleFactor:key==='portrait'?2:1,reducedMotion:'no-preference',recordVideo:{dir:resolve(dir,'raw-video'),size:viewport}}),p=await context.newPage();
    const row={key,viewport,status:'RUNNING',errors:[],screenshots:[],samples:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());p.setDefaultTimeout(20000);
    console.log(key+' loading');await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');const s=cardValueVisualFixture(true);
    s.jokers.forEach((j,i)=>j.edition=i===1?'none':'polychrome');s.shop.offers.forEach((o,i)=>{o.edition=i===0?'polychrome':'none';o.price=r2Price(o.definitionId,o.edition,s);});
    Object.assign(s.shop.toolOffers[0],{definitionId:'S05',price:r2ToolPrice('S05',s)});s.consumables=[{instanceId:'owned/S05',definitionId:'S05'},{instanceId:'owned/T17',definitionId:'T17'}];assertRunInvariants(s);
    await importFixture(p,s);await p.mouse.move(viewport.width-1,viewport.height-1);row.attached=await collectShop(p);assert.equal(row.attached.slots,5);assert.equal(row.attached.edges,5);assert.equal(row.attached.ordinary,1);
    row.renderer=await p.evaluate(()=>{const g=window.__harness.game,r=g.renderer;return {browser:navigator.userAgent,type:g.config.renderType,gl:r.gl?{vendor:r.gl.getParameter(r.gl.VENDOR),renderer:r.gl.getParameter(r.gl.RENDERER)}:null};});
    const before=await state(p);row.noInputStart=await p.evaluate(()=>performance.now());
    for(const delay of [0,1000,1000,1600]){await p.waitForTimeout(delay);await nextFrame(p);row.samples.push(await observe(p));const filename=`${key}-no-input-${row.samples.length-1}.png`;await p.screenshot({path:resolve(dir,filename),scale:'css'});row.screenshots.push(filename);}
    row.noInputEnd=await p.evaluate(()=>performance.now());assert.ok(row.noInputEnd-row.noInputStart>=3500);assert.ok(row.samples.at(-1).every((e,i)=>e.draws>row.samples[0][i].draws+30&&e.phase!==row.samples[0][i].phase));assert.equal(await state(p),before);
    await p.emulateMedia({reducedMotion:'reduce'});await nextFrame(p);const reducedBefore=await observe(p);await p.waitForTimeout(3300);row.reduced=await observe(p);assert.deepEqual(row.reduced,reducedBefore);assert.ok(row.reduced.every(e=>e.motion==='static'&&e.visible));await p.screenshot({path:resolve(dir,`${key}-reduced.png`),scale:'css'});
    await p.emulateMedia({reducedMotion:'no-preference'});
    // Controlled lifecycle checks; these calls are not claimed as native user input.
    await p.evaluate(()=>{window.__edges[0].parentContainer.setVisible(false);});await p.waitForTimeout(200);const invisible=await observe(p);await p.waitForTimeout(400);assert.equal((await observe(p))[0].draws,invisible[0].draws);row.hiddenHost=invisible[0];
    await p.evaluate(()=>{const host=window.__edges[0].parentContainer;host.setVisible(true);window.__oldX=host.x;host.x+=10000;});await p.waitForTimeout(200);const offscreen=await observe(p);await p.waitForTimeout(400);assert.equal((await observe(p))[0].draws,offscreen[0].draws);row.offscreen=offscreen[0];await p.evaluate(()=>window.__edges[0].parentContainer.x=window.__oldX);
    await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await observe(p);await p.waitForTimeout(400);assert.deepEqual(await observe(p),hidden);row.hiddenDocument=hidden;await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    assert.equal(await state(p),before);row.unchangedStateHash=createHash('sha256').update(before).digest('hex');
    if(key==='portrait')await tapUI(p,'shop','action/shelf-tools',true);
    await collectShop(p,'card/forget-technique-attention');const warmStart=await observe(p);assert.equal(warmStart.length,1);await p.waitForTimeout(3600);row.forgetShelf=await observe(p);assert.ok(row.forgetShelf[0].draws>warmStart[0].draws+30);assert.equal(row.forgetShelf[0].edition,undefined);await p.screenshot({path:resolve(dir,`${key}-forget-shelf.png`),scale:'css'});
    await tapUI(p,'shop','action/tool-inventory',key==='portrait');const native=p.locator('.forget-technique-attention');await native.waitFor();assert.equal(await native.count(),1);
    const nativeInfo=()=>native.evaluate(e=>({motion:e.dataset.attentionMotion,position:getComputedStyle(e,'::after').backgroundPosition,animation:getComputedStyle(e,'::after').animationName,playState:getComputedStyle(e,'::after').animationPlayState}));
    const nativeStart=await nativeInfo();await p.waitForTimeout(3600);row.forgetInventory=await nativeInfo();assert.equal(row.forgetInventory.motion,'flowing');assert.notEqual(row.forgetInventory.position,nativeStart.position);await p.screenshot({path:resolve(dir,`${key}-forget-inventory.png`),scale:'css'});
    await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);const nativeStill=await nativeInfo();await p.waitForTimeout(500);assert.deepEqual(await nativeInfo(),nativeStill);assert.equal(nativeStill.animation,'none');
    const nativeHandle=await native.elementHandle();await p.getByRole('button',{name:'关闭',exact:true}).click();await p.waitForTimeout(100);row.inventoryCleanup=await nativeHandle.evaluate(e=>({className:e.className,motion:e.dataset.attentionMotion}));assert.ok(!row.inventoryCleanup.className.includes('forget-technique-attention'));await p.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await state(p),before);const oldEdges=await p.evaluateHandle(()=>window.__edges);await tapUI(p,'shop','action/start-stage',key==='portrait');await waitScene(p,'game');row.shopCleanup=await oldEdges.evaluate(edges=>edges.map(e=>({scene:!!e.scene,active:e.active})));assert.ok(row.shopCleanup.every(e=>!e.scene&&!e.active));
    await p.getByRole('button',{name:/^(进入(暖场|正场)|迎战强敌) ›$/}).click();
    await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').jokerViews.size===5);
    const startButton=p.getByRole('button',{name:'开始出牌',exact:true});if(await startButton.count())await startButton.click();
    await p.evaluate(async()=>{const {mountPolychromeCardIridescence:mount}=await import('/src/game/PolychromeCardIridescence.ts');const s=window.__harness.game.scene.getScene('game');window.__edges=[];for(const j of s.run.jokers){const host=s.jokerViews.get(j.instanceId),b=s.view.layout.slots[host.getData('slotIndex')];const edge=mount(s,host,{x:-b.width/2,y:-b.height/2,width:b.width,height:b.height},j.edition);if(edge)window.__edges.push(edge);}});
    const gameBefore=await state(p),start=await observe(p);await p.waitForTimeout(3600);row.game=await observe(p);assert.equal(row.game.length,4);assert.ok(row.game.every((e,i)=>e.draws>start[i].draws+30));assert.equal(await state(p),gameBefore);await p.screenshot({path:resolve(dir,`${key}-game-five.png`),scale:'css'});
    const gameEdges=await p.evaluateHandle(()=>window.__edges);await p.evaluate(()=>window.__harness.game.scene.stop('game'));row.gameCleanup=await gameEdges.evaluate(edges=>edges.map(e=>({scene:!!e.scene,active:e.active})));assert.ok(row.gameCleanup.every(e=>!e.scene&&!e.active));
    assert.deepEqual(row.errors,[]);row.status='PASS';const video=p.video();await context.close();await rename(await video.path(),resolve(dir,`${key}-process.webm`));
  }
  report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e.stack||e);throw e;}
finally{await writeFile(resolve(dir,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({key:c.key,status:c.status,samples:c.samples.length}))}));
