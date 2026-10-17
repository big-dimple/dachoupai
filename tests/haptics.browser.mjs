/** Browser API/DOM evidence only. No physical vibration or scene success-path signoff. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {build,preview} from 'vite';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {chooseCharacter,tapUI,point} from '../harness/ui.mjs';

const output='shots/haptics';await mkdir(output,{recursive:true});
const built=await build({mode:'e2e',logLevel:'error',plugins:[{
  name:'haptic-browser-fixture',resolveId:id=>id==='haptic-browser-fixture'?'\0haptic-browser-fixture':undefined,
  load:id=>id==='\0haptic-browser-fixture'?`export {Haptics} from ${JSON.stringify(resolve('src/haptics/Haptics.ts'))};
    import {makeCheckpoint} from ${JSON.stringify(resolve('src/application/checkpoint.ts'))};
    export function fundedShopCheckpoint(state){const copy=structuredClone(state);copy.gold=100;return JSON.stringify(makeCheckpoint(copy,[]));}`:undefined,
}],build:{outDir:output+'/build',rollupOptions:{preserveEntrySignatures:'strict',input:{app:resolve('index.html'),fixture:'haptic-browser-fixture'}}}});
const fixture='/'+built.output.find(chunk=>chunk.type==='chunk'&&chunk.isEntry&&chunk.name==='fixture').fileName;
const server=await preview({build:{outDir:output+'/build'},preview:{host:'127.0.0.1',port:0},logLevel:'error'});
const browser=await chromium.launch({headless:true});
const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  build:JSON.parse(await readFile(output+'/build/build-info.json','utf8')),browser:browser.version(),headless:true,viewport:{width:390,height:740},
  scope:'Real Chromium touch input and settings DOM; API requests are not hardware confirmation',cases:[],physicalFeel:'NOT_RUN',sceneSuccessPaths:'NOT_RUN'};
try{
  const context=await browser.newContext({viewport:{width:390,height:740},hasTouch:true,isMobile:true});
  await context.addInitScript(()=>{
    window.hapticBrowserEvidence={input:[],requests:[],errors:[]};
    for(const type of ['pointerdown','pointerup'])document.addEventListener(type,event=>{
      window.hapticBrowserEvidence.input.push({type,trusted:event.isTrusted,active:navigator.userActivation?.hasBeenActive});
    },true);
    // Observe and invoke the native method. Never replace its return with fabricated support.
    if(typeof navigator.vibrate==='function'){
      const native=navigator.vibrate.bind(navigator);
      navigator.vibrate=pattern=>{const accepted=native(pattern);window.hapticBrowserEvidence.requests.push({pattern,accepted});return accepted;};
    }
  });
  const page=await context.newPage();page.on('pageerror',error=>{(report.pageErrors??=[]).push(error.message);});
  const cdp=await context.newCDPSession(page);
  const read=async expression=>{
    const {result,exceptionDetails}=await cdp.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:false});
    assert.ok(!exceptionDetails,JSON.stringify(exceptionDetails));return result.value;
  };
  await page.goto(server.resolvedUrls.local[0]+'?harness=1',{waitUntil:'domcontentloaded'});
  const first=await read(`new Promise((resolve,reject)=>{
    const timer=setInterval(()=>{const b=document.querySelector('.run-menu-toggle');if(b){clearInterval(timer);const r=b.getBoundingClientRect();resolve({x:r.x+r.width/2,y:r.y+r.height/2,active:navigator.userActivation?.hasBeenActive});}},30);
    setTimeout(()=>{clearInterval(timer);reject(Error('menu did not load'));},20000);
  })`);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:first.x,y:first.y}]});
  const during=await read('navigator.userActivation.hasBeenActive');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const released=await read('navigator.userActivation.hasBeenActive');
  assert.equal(first.active,false);assert.equal(during,false);assert.equal(released,true);
  report.cases.push({name:'First trusted touch activates on release, not pointerdown',status:'PASS',first,during,released,input:await read('window.hapticBrowserEvidence.input')});
  if(!await page.locator('#run-menu-modal').isVisible())await page.locator('.run-menu-toggle').tap();
  await page.locator('.run-menu-settings-tools > summary').tap();
  const input=page.getByRole('checkbox',{name:'触觉反馈',exact:true}),reduced=page.getByRole('checkbox',{name:'减少动态',exact:true});
  assert.equal(await input.isChecked(),true);await input.uncheck();assert.equal(await input.isChecked(),false);
  await reduced.check();assert.equal(await input.isChecked(),false);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dachoupai-haptics-v1')));assert.deepEqual(saved,{version:1,enabled:false});
  report.cases.push({name:'Independent touch control persists off while reduced motion changes',status:'PASS',saved});
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.run-menu-toggle').tap();await page.locator('.run-menu-settings-tools > summary').tap();
  assert.equal(await input.isChecked(),false);await input.check();
  assert.match(await page.locator('#haptic-availability').innerText(),/取决于设备/);
  report.cases.push({name:'Reload retains off; enabling states device uncertainty',status:'PASS'});
  // Exercise the menu's real cancellation boundary with a layer-level fixture.
  await page.evaluate(async fixture=>{
    const {Haptics}=await import(fixture);
    window.hapticBrowserEvidence.requests=[];window.hapticFixture=Haptics.shared.createScope();window.hapticFixture.settlementArrived('fixture-final');
  },fixture);
  await page.locator('.run-menu-toggle').tap();
  await page.evaluate(()=>window.hapticFixture.saved('purchase','late-fixture'));
  const requests=await page.evaluate(()=>window.hapticBrowserEvidence.requests);
  assert.deepEqual(requests.map(r=>r.pattern),[[28,45,36],0]);
  report.cases.push({name:'Real menu close stops the API request and rejects the old scope callback (layer fixture)',status:'PASS',requests});
  await page.locator('.run-menu-toggle').tap();await page.screenshot({path:output+'/settings.png'});
  await reduced.uncheck();await page.locator('.run-menu-toggle').tap();
  await chooseCharacter(page,'laohuan',true);
  for(let purchaseIndex=0;purchaseIndex<2;purchaseIndex++){
    if(purchaseIndex===1){
      // Controlled funds for the two-card drag fixture, imported through the real save UI.
      // The first purchase above is natural. This is not economy/balance evidence.
      const imported=await page.evaluate(async fixture=>{const {fundedShopCheckpoint}=await import(fixture);return fundedShopCheckpoint(window.__harness.game.scene.getScene('shop').run);},fixture);
      await page.locator('.run-menu-toggle').tap();page.once('dialog',dialog=>dialog.accept());
      await page.locator('#run-menu-modal input[type=file]').setInputFiles({name:'controlled-shop-funds.json',mimeType:'application/json',buffer:Buffer.from(imported)});
      await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.scene.isActive()&&s.run.gold===100&&s.registry.get('runController').status==='idle';});
      report.cases.push({name:'Controlled funding checkpoint imported through normal save UI for two-card drag fixture',status:'PASS',controlledGold:100});
    }
    const before=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),r=s.run;return {seq:r.commandSeq,gold:r.gold,ids:r.jokers.map(j=>j.instanceId),offer:r.shop.offers.find(o=>!o.consumed&&o.price<=r.gold&&!r.jokers.some(j=>j.definitionId===o.definitionId))};});
    assert.ok(before.offer,'an affordable natural offer');await page.evaluate(()=>{window.hapticBrowserEvidence.requests=[];});
    await tapUI(page,'shop','offer/'+before.offer.offerId,true);
    const buy=page.getByRole('button',{name:/^购买 · \d+ 金$/});if(!await buy.count())await tapUI(page,'shop','offer/'+before.offer.offerId,true);
    assert.deepEqual(await page.evaluate(()=>window.hapticBrowserEvidence.requests),[],'opening a preview is silent');await buy.tap();
    await page.waitForFunction(seq=>{const s=window.__harness.game.scene.getScene('shop');return s.run.commandSeq>seq&&s.registry.get('runController').status==='idle';},before.seq);
    const after=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');return {seq:s.run.commandSeq,ids:s.run.jokers.map(j=>j.instanceId),requests:window.hapticBrowserEvidence.requests};});
    assert.equal(after.ids.length,before.ids.length+1);assert.deepEqual(after.requests.map(r=>r.pattern),[[12,30,18]]);
    report.cases.push({name:(purchaseIndex===0?'Natural shop purchase':'Controlled-funds shop purchase')+' follows preview → saved ownership → one API request',status:'PASS',before,after});
    const close=page.locator('dialog[open] .dialog-close');if(await close.count())await close.tap();
  }
  const order=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');return {seq:s.run.commandSeq,ids:s.run.jokers.map(j=>j.instanceId)};});
  const from=await point(page,'shop','joker/'+order.ids[0]),to=await point(page,'shop','joker/'+order.ids[1]);
  await page.evaluate(()=>{window.hapticBrowserEvidence.requests=[];});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from.x,y:from.y}]});await page.waitForTimeout(380);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:to.x,y:to.y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(ids=>{const s=window.__harness.game.scene.getScene('shop');return s.run.jokers[1].instanceId===ids[0]&&s.registry.get('runController').status==='idle'&&window.hapticBrowserEvidence.requests.some(r=>JSON.stringify(r.pattern)==='[16]');},order.ids);
  const reordered=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');return {seq:s.run.commandSeq,ids:s.run.jokers.map(j=>j.instanceId),requests:window.hapticBrowserEvidence.requests};});
  assert.deepEqual(reordered.ids,[order.ids[1],order.ids[0]]);assert.equal(reordered.seq,order.seq+1);
  assert.deepEqual(reordered.requests.map(r=>r.pattern),[[12],0,[16]]);
  report.cases.push({name:'Real touch hold → saved reorder → face landing requests pickup, stop and one landing beat',status:'PASS',order,reordered});
  const cancelFrom=await point(page,'shop','joker/'+reordered.ids[0]);await page.evaluate(()=>{window.hapticBrowserEvidence.requests=[];});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cancelFrom.x,y:cancelFrom.y}]});await page.waitForTimeout(380);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  const canceled=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');return {seq:s.run.commandSeq,requests:window.hapticBrowserEvidence.requests};});
  assert.equal(canceled.seq,reordered.seq);assert.deepEqual(canceled.requests.map(r=>r.pattern),[[12],0]);
  report.cases.push({name:'Real touch cancellation stops pickup and commits no reorder or success beat',status:'PASS',canceled});
  report.sceneSuccessPaths='Shop purchases, saved drag landing and pointercancel exercised with real UI/persistence; GameScene NOT_RUN';
  await page.locator('.run-menu-toggle').tap();
  await page.evaluate(()=>{Object.defineProperty(navigator,'vibrate',{value:undefined,configurable:true});document.dispatchEvent(new Event('pointerup'));});
  assert.equal(await input.isDisabled(),true);
  assert.match(await page.locator('#haptic-availability').innerText(),/不提供振动能力/);
  report.cases.push({name:'Absent API is disabled with an explicit unsupported explanation (capability fixture)',status:'PASS'});
  assert.deepEqual(report.pageErrors??[],[]);await context.close();report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack;throw error;}
finally{await writeFile(output+'/browser-report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));console.log(JSON.stringify(report,null,2));}
