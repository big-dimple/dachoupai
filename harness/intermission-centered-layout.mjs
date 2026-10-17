import assert from 'node:assert/strict';
import {build,preview} from 'vite';
import {build as bundle} from 'esbuild';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,point,openRunMenu} from './ui.mjs';

const out=process.env.RESULT_LAYOUT_OUT??'shots/intermission-centered-layout/after',selected=process.env.RESULT_LAYOUT_CASES?.split(',');
await mkdir(out,{recursive:true});
const fixtureFile=path.resolve(out,'fixtures.mjs');
await bundle({stdin:{contents:"export {supportSettlementReady,climaxSettlementReady,settlementReady} from './harness/fixtures/settlement';export {c12GiftEvidence} from './harness/fixtures/c12-gift-delivery';export {energySend} from './harness/fixtures/hero-climax';export {makeCheckpoint,readCheckpoint} from './src/application/checkpoint';export {applyCommand} from './src/domain/run';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':JSON.stringify('./')},outfile:fixtureFile,logLevel:'error'});
const {supportSettlementReady,climaxSettlementReady,settlementReady,c12GiftEvidence,energySend,makeCheckpoint,readCheckpoint,applyCommand}=await import(pathToFileURL(fixtureFile));
const ordinary=supportSettlementReady(),long=climaxSettlementReady('long'),loss=settlementReady('boss-loss','current'),gift=await c12GiftEvidence(true);
for(const f of [ordinary,long,loss])f.after=energySend(f.state,f.action);
const cases=[
 {key:'pc-1366',width:1366,height:768,f:ordinary,native:true},
 {key:'pc-1440',width:1440,height:900,f:ordinary},
 {key:'pc-1920',width:1920,height:1080,f:ordinary},
 {key:'phone-390',width:390,height:844,f:ordinary},
 {key:'phone-320-safe',width:320,height:568,safe:true,f:ordinary},
 {key:'short-740',width:740,height:320,f:ordinary},
 {key:'long-number-320',width:320,height:568,safe:true,f:long},
 {key:'long-number-pc',width:1366,height:768,f:long},
 {key:'gift-reward-320',width:320,height:568,safe:true,f:{state:gift.before,action:gift.command.action,after:gift.after},native:true},
 {key:'failure-390',width:390,height:844,f:loss}
].filter(c=>!selected||selected.includes(c.key));
const buildDir=path.resolve(process.env.RESULT_LAYOUT_BUILD_DIR??path.join(out,'build'));
if(!process.env.RESULT_LAYOUT_REUSE_BUILD)await build({mode:'e2e',build:{outDir:buildDir,emptyOutDir:true},logLevel:'error'});
const server=await preview({build:{outDir:buildDir},preview:{host:'127.0.0.1',port:5598,strictPort:true},logLevel:'error'}),browser=await chromium.launch({channel:'msedge'});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),scope:'Controlled legal scorer/save fixtures; real import, native mouse/touch scrolling and continuation. PC1366 and c12 phone use actual PlayHand. Not natural play, physical device or human aesthetic/hearing acceptance.',sourceFiles:{},cases:[]};
for(const f of ['src/game/IntermissionScene.ts','src/game/IntermissionLayout.ts','src/game/IntermissionScroll.ts'])report.sourceFiles[f]=createHash('sha256').update(await readFile(f)).digest('hex');
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read(),localStorage:Object.fromEntries(Object.entries(localStorage).sort())};});
async function imp(p,state,scene='intermission'){
 assert.ok(readCheckpoint(makeCheckpoint(state,[])).ok);
 await p.goto('http://127.0.0.1:5598/?harness=1');await waitScene(p,'title');await openRunMenu(p,p.viewportSize().width<800);
 const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();
 const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'result-layout.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(state,[])))});
 await waitScene(p,scene);await p.waitForFunction(scene=>window.__harness.game.scene.getScene(scene).ready,scene);
}
const regions=p=>p.evaluate(()=>{
 const s=window.__harness.game.scene.getScene('intermission'),all=[],walk=list=>{for(const o of list){all.push(o);if(o.list)walk(o.list);}};walk(s.view.root.list);
 const content=all.find(o=>o.name==='result/content'),leaves=[],measure=list=>{for(const o of list){if(o.list)measure(o.list);else if(o.visible&&o.type!=='Graphics'){const b=o.getBounds();if(b.width&&b.height)leaves.push(b);}}};measure(content.list);
 const paper=all.find(o=>o.name==='result-art/stage'),b=paper.getData('bounds'),origin=paper.getWorldTransformMatrix().transformPoint(b.x,b.y);leaves.push({...origin,width:b.width,height:b.height});
 const x=Math.min(...leaves.map(b=>b.x)),y=Math.min(...leaves.map(b=>b.y)),group={x,y,width:Math.max(...leaves.map(b=>b.x+b.width))-x,height:Math.max(...leaves.map(b=>b.y+b.height))-y};
 return {viewport:content.getData('viewport'),group,paper:{...origin,width:b.width,height:b.height},texts:all.filter(o=>o.type==='Text'&&o.visible&&o.text).map(o=>({name:o.name,text:o.text,bounds:o.getBounds()})),controls:all.filter(o=>o.input?.enabled).map(o=>({name:o.name,primary:!!o.getData('buttonPrimary'),bounds:o.getBounds()}))};
});
async function swipe(p,from,to){const cdp=await p.context().newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:from}]});for(let n=1;n<=8;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:160,y:from+(to-from)*n/8}]});await p.waitForTimeout(18);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
try{for(const spec of cases){
 const row={key:spec.key,viewport:{width:spec.width,height:spec.height},errors:[]};report.cases.push(row);
 const p=await browser.newPage({viewport:row.viewport,hasTouch:spec.width<800,reducedMotion:spec.key==='pc-1440'?'no-preference':'reduce'});p.setDefaultTimeout(25000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(e.stack));
 if(spec.safe)await p.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--safe-top','24px');document.documentElement.style.setProperty('--safe-bottom','34px');}));
 try{
  if(spec.native){await imp(p,spec.f.state,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(c=>!c.dealing&&!s.tweens.isTweening(c.container));});for(const id of spec.f.action.selectedIds)await tapUI(p,'game','card/'+id,spec.width<800);await tapUI(p,'game','action/play',spec.width<800);await waitScene(p,'intermission');assert.deepEqual((await saved(p)).state,spec.f.after);}
  else await imp(p,spec.f.after);
  await p.waitForTimeout(spec.key==='pc-1440'?1200:600);row.before=await saved(p);row.start=await regions(p);await p.screenshot({path:out+'/'+spec.key+'-top.png'});
  const start=row.start,v=start.viewport;assert.ok(start.group.x>=12&&start.group.x+start.group.width<=spec.width-12,'horizontal safe bounds');
  const notice=start.texts.find(t=>t.name==='result/notice');if(spec.width>=1100&&notice)assert.ok(notice.bounds.x>=start.paper.x+start.paper.width,'wide final notice remains with its next-step column');
  if(!v.overflow)assert.ok(Math.abs(start.group.y+start.group.height/2-(v.top+v.bottom)/2)<1,'complete group centered in actual safe viewport');
  else {assert.ok(Math.abs(start.group.y-v.top)<1,'overflow begins at first line');if(spec.width<700){await swipe(p,spec.height-105,140);const moved=await regions(p);assert.ok(moved.viewport.scroll>0,'native touch scroll moves content');}await p.mouse.move(spec.width/2,spec.height/2);await p.mouse.wheel(0,10000);await p.waitForTimeout(100);row.bottom=await regions(p);assert.equal(row.bottom.viewport.scroll,row.bottom.viewport.overflow,'wheel reaches final row');await p.screenshot({path:out+'/'+spec.key+'-bottom.png'});await p.keyboard.press('Home');assert.equal((await regions(p)).viewport.scroll,0);await p.keyboard.press('End');assert.equal((await regions(p)).viewport.scroll,v.overflow);}
  const end=await regions(p),primary=end.controls.find(c=>c.primary);assert.ok(primary&&primary.bounds.height>=48&&primary.bounds.y>=v.top&&primary.bounds.y+primary.bounds.height<=v.bottom+1,'primary reachable at end');
  if(spec.key==='long-number-320')assert.match(end.texts.find(t=>t.name==='result/score').text,/e\d+/);
  if(spec.key==='gift-reward-320')assert.match(end.texts.find(t=>t.name==='result/reward').text,/库存已满|满|金币|金/);
  assert.deepEqual(await saved(p),row.before,'scrolling never changes state/journal/storage');
  if(spec.key!=='failure-390'){
   const action=end.controls.some(c=>c.name==='action/continue-stage'&&c.primary)?'action/continue-stage':null;
   if(action){const hit=await point(p,'intermission',action);if(spec.width<800)await p.touchscreen.tap(hit.x,hit.y);else await p.mouse.click(hit.x,hit.y,{clickCount:3,delay:15});await waitScene(p,'shop');const actual=await saved(p),receipt=actual.state.receipts.at(-1),command={runId:row.before.state.runId,commandId:receipt.commandId,expectedSeq:row.before.state.commandSeq,action:{type:'OpenShop'}},expected=applyCommand(row.before.state,command);assert.ok(expected.ok);assert.deepEqual(actual.state,expected.state);assert.deepEqual(actual.journal,[...row.before.journal,command]);assert.deepEqual(actual.storage.current,makeCheckpoint(actual.state,actual.journal));row.continued=actual;}
  }
  assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',spec.key,'overflow',v.overflow);
 }catch(e){row.status='FAIL';row.error=e.stack;await p.screenshot({path:out+'/'+spec.key+'-FAIL.png'});throw e;}finally{await p.close();}
}report.status='PASS';}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{
 await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));await writeFile(out+'/summary.json',JSON.stringify({...report,cases:report.cases.map(({before,continued,...row})=>row)},null,2));await browser.close();await server.close();console.log(report.status,report.error??'');
}
