/** Real native input, with a controlled visibility-without-blur lifecycle fault. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {openSelector,confirmHeroRoute,tapUI,point,waitScene} from './ui.mjs';

const baseline='8af3e5066984979059b7ff72111b6c3cbc13aa4a';
const before=process.env.POINTER_PHASE==='before';
const out=process.env.POINTER_OUT??`shots/interrupted-pointer/${before?'before':'after'}`;
await mkdir(out,{recursive:true});
const files=['src/game/SceneView.ts','src/game/PointerIntent.ts','src/game/PointerReleaseTime.ts','harness/interrupted-pointer.mjs'];
const sha=data=>createHash('sha256').update(data).digest('hex');
const hashes=async()=>Object.fromEntries(await Promise.all(files.map(async f=>[f,sha(await readFile(f))])));
const oldView=execFileSync('git',['show',baseline+':src/game/SceneView.ts'],{encoding:'utf8'});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline,before,
 sourceHashes:await hashes(),effectiveSceneView:sha(before?oldView:(await readFile(files[0],'utf8')).replaceAll('\r\n','\n')),
 limits:['Windows headless Chromium, software viewports; not physical phone/background acceptance.',
  'Headless lifecycle freeze, tab switch and virtual minimization did not produce document.hidden without blur. Only hidden/visibilityState + visibilitychange are fault-injected; event.isTrusted is recorded as false. Native mouse/touch input, application callbacks and saves are real.',
  'No imported run, stock/gold/deal override, domain dispatch or handler replacement. Baseline build uses the exact Git SceneView blob via read-only Vite transform.'],cases:[]};
const buildDir=path.resolve(out,'build');
await build({mode:'e2e',plugins:before?[{name:'read-only-baseline-scene-view',enforce:'pre',transform(_code,id){
 if(id.split('?')[0].replaceAll('\\','/').endsWith('/src/game/SceneView.ts'))return {code:oldView,map:null};
}}]:[],build:{outDir:buildDir,emptyOutDir:true},logLevel:'error'});
const server=await preview({build:{outDir:buildDir},preview:{host:'127.0.0.1',port:5596,strictPort:true},logLevel:'error'});
const browser=await chromium.launch();report.browser=browser.version();let active;
const snapshot=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
async function down(p,cdp,target,touch){
 const pos=await point(p,'shop',target);
 if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pos.x,y:pos.y,id:1}]});
 else {await p.mouse.move(pos.x,pos.y);await p.mouse.down();}
 await p.waitForFunction(target=>window.__harness.game.scene.getScene('shop').view.pressed?.object.name===target,target);
}
async function up(p,cdp,touch){
 if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.mouse.up();
 await p.waitForTimeout(450);
}
async function hidden(p){
 await p.evaluate(()=>{
  window.__visibilityFault={hidden:true,blur:0,events:[]};
  window.__faultBlur=()=>window.__visibilityFault.blur++;
  window.addEventListener('blur',window.__faultBlur);
  window.__faultVisibility=e=>window.__visibilityFault.events.push({hidden:document.hidden,trusted:e.isTrusted});
  document.addEventListener('visibilitychange',window.__faultVisibility);
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.__visibilityFault.hidden});
  Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>window.__visibilityFault.hidden?'hidden':'visible'});
  document.dispatchEvent(new Event('visibilitychange'));
 });
 await p.waitForTimeout(500);
}
async function visible(p){
 const observation=await p.evaluate(()=>{
  const f=window.__visibilityFault;f.hidden=false;document.dispatchEvent(new Event('visibilitychange'));
  delete document.hidden;delete document.visibilityState;
  window.removeEventListener('blur',window.__faultBlur);document.removeEventListener('visibilitychange',window.__faultVisibility);
  return {...f,modalCount:document.querySelectorAll('dialog[open]').length};
 });
 assert.equal(observation.blur,0,'isolate visibility without already-protected window blur');
 await p.waitForFunction(()=>!document.hidden&&window.__harness.game.scene.isActive('shop'));
 return observation;
}
try{
 for(const viewport of [{width:1366,height:900},{width:390,height:740},{width:320,height:568}]){
  const touch=viewport.width<700,context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:touch?2:1}),p=await context.newPage();active=p;
  const row={viewport,touch,errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));
  await p.goto('http://127.0.0.1:5596/?harness=1&seed=interrupted-pointer');await waitScene(p,'title');
  await openSelector(p,touch);await tapUI(p,'character-select','character/laohuan',touch);await confirmHeroRoute(p,touch,'group');await waitScene(p,'shop');
  await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(700);
  const cdp=await context.newCDPSession(p);row.initial=await snapshot(p);assert.equal(row.initial.state.gold,6);
  await down(p,cdp,'action/reroll',touch);await hidden(p);row.paidVisibility=await visible(p);await up(p,cdp,touch);row.afterInterruptedRelease=await snapshot(p);
  if(before){
   assert.equal(row.afterInterruptedRelease.state.commandSeq,row.initial.state.commandSeq+1);
   assert.equal(row.afterInterruptedRelease.state.gold,4);row.paidGap='interrupted release executed RerollShop and charged 2 gold';
  }else{
   assert.deepEqual(row.afterInterruptedRelease,row.initial,'background release cannot spend gold or alter the run');
   await tapUI(p,'shop','action/reroll',touch);await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq,row.initial.state.commandSeq+1);
   await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);row.fresh=await snapshot(p);
   assert.equal(row.fresh.state.gold,4);assert.equal(row.fresh.journal.length,row.initial.journal.length+1);
   assert.equal(row.fresh.journal.at(-1).action.type,'RerollShop');row.freshClick='exactly one intentional RerollShop after returning';
  }
  await p.waitForTimeout(700);const heldBefore=await snapshot(p),offer=heldBefore.state.shop.offers[0];
  await down(p,cdp,'offer/'+offer.offerId,touch);await hidden(p);row.holdVisibility=await visible(p);await up(p,cdp,touch);
  row.unintendedDialogs=await p.locator('dialog[open]').count();
  if(before)assert.ok(row.unintendedDialogs>0,'baseline pending hold opens a dialog without a new gesture');
  else assert.equal(row.unintendedDialogs,0,'interrupted hold cannot open a delayed detail dialog');
  assert.deepEqual(await snapshot(p),heldBefore,'viewing a card never writes or consumes');
  await p.screenshot({path:out+'/'+viewport.width+'-returned.png',scale:'css'});
  if(row.unintendedDialogs)await p.keyboard.press('Escape');
  if(!before){
   await tapUI(p,'shop','offer/'+offer.offerId,touch);await p.locator('dialog[open]').waitFor();await p.keyboard.press('Escape');
   assert.deepEqual(await snapshot(p),heldBefore);row.freshDetail='ordinary card detail/Escape still read-only';
   await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'shop');
   await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);assert.deepEqual(await snapshot(p),heldBefore);row.coldRestore=true;
  }
  assert.deepEqual(row.errors,[]);row.status=before?'EXPECTED_GAP_REPRODUCED':'PASS';console.log(row.status,viewport.width);await context.close();active=undefined;
 }
 report.sourceUnchanged=JSON.stringify(await hashes())===JSON.stringify(report.sourceHashes);assert.ok(report.sourceUnchanged);
 report.status=before?'EXPECTED_GAP_REPRODUCED':'PASS';
}catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1;if(active)await active.screenshot({path:out+'/FAIL.png'}).catch(()=>{});console.error(error);}
finally{await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));await browser.close();await server.close();console.log(report.status);}
