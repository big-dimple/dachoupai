import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from '../../../../harness/ui.mjs';

const out='docs/production/evidence/card-detail-background-2026-10-17';
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:'.vite/card-background-check',server:{host:'127.0.0.1',port:5630,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {r2ToolPrice,r2Price}=await server.ssrLoadModule('/src/domain/r2Shop.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
let run=createRun({rulesVersion:'r2',runId:'controlled/card-detail-background',seed:'card-detail-background',characterId:'amo',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
const result=applyCommand(run,{runId:run.runId,commandId:run.runId+'/prepare',expectedSeq:run.commandSeq,action:{type:'RerollShop'}});assert.ok(result.ok);run=result.state;
run.gold=30;run.handLevels={'high-card':1,pair:1};run.shop.offers[0].definitionId='c04';run.shop.offers[0].price=r2Price('c04',run.shop.offers[0].edition,run);
run.jokers=[r2CreateJoker('f09','controlled/owned/f09',4,undefined,run)];
run.shop.toolOffers[0].definitionId='T11';run.shop.toolOffers[0].price=r2ToolPrice('T11',run);
const checkpoint=makeCheckpoint(run,[]);assert.equal(readCheckpoint(checkpoint).ok,true);
const sources=['src/game/DetailDialog.ts','src/game/DetailArtBackground.css','src/game/ShopScene.ts','src/game/ConsumableDialog.ts'];
const report={scope:'Controlled validated checkpoint; real native import, mouse PC1180 and touch390/360 purchase details, whole original, held card, tool purchase/reused targets and item details. No natural supply, physical device or human visual approval.',sourceHashes:Object.fromEntries(await Promise.all(sources.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),cases:[]};
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});report.browser=browser.version();
try{
 for(const viewport of [{width:1180,height:757},{width:390,height:844},{width:360,height:844}]){
  const touch=viewport.width<900,context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(20000);
  const row={viewport,errors:[],shots:[],checks:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
  const click=locator=>touch?locator.tap():locator.click(),tap=name=>tapUI(p,'shop',name,touch),state=()=>p.evaluate(()=>structuredClone(window.__harness.game.registry.get('runController').state)),open=p.locator('.detail-dialog[open]');
  const shot=async name=>{const file=viewport.width+'-'+name+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});row.shots.push(file);};
  const close=async()=>{await click(open.locator('.dialog-close'));await p.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));};
  const details=async name=>{
   await open.locator('.dialog-backdrop-art .dialog-card-image').waitFor({state:'visible'});
   await p.waitForFunction(()=>{const i=document.querySelector('.dialog-backdrop-art .dialog-card-image');return i?.complete&&i.naturalWidth>=600;});
   const geometry=await open.evaluate(d=>{const box=e=>e.getBoundingClientRect().toJSON(),frame=d.querySelector('.dialog-backdrop-art'),image=frame.querySelector('.dialog-card-image'),original=d.querySelector('.dialog-art-original'),scroll=d.querySelector('.dialog-scroll');return{dialog:box(d),frame:box(frame),image:{...box(image),naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,fit:getComputedStyle(image).objectFit,position:getComputedStyle(image).objectPosition,opacity:getComputedStyle(image).opacity,filter:getComputedStyle(image).filter,src:image.currentSrc},original:{...box(original),label:original.getAttribute('aria-label')},scrim:getComputedStyle(scroll).backgroundImage,scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,buttons:[...d.querySelectorAll('.dialog-actions button')].map(b=>({text:b.textContent,...box(b)}))};});
   assert.equal(geometry.image.fit,'cover');assert.equal(geometry.image.opacity,'1');assert.equal(geometry.image.filter,'none');
   assert.ok(Math.abs(geometry.frame.width-geometry.dialog.width)<=3);assert.ok(Math.abs(geometry.frame.height-geometry.dialog.height)<=3);
   assert.ok(geometry.original.width>=44&&geometry.original.height>=44);assert.ok(geometry.original.y>=geometry.dialog.y&&geometry.original.y+geometry.original.height<=geometry.dialog.y+150);
   assert.ok(geometry.scrollWidth<=geometry.clientWidth+1);assert.ok(geometry.buttons.every(b=>b.y+b.height<=viewport.height));
   await shot(name);return geometry;
  };
  try{
   await p.goto('http://127.0.0.1:5630/?harness=1');await waitScene(p,'title');await click(p.locator('.run-menu-toggle'));const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await click(section.locator('summary'));
   const chooser=p.waitForEvent('filechooser');await click(p.getByRole('button',{name:'导入本局',exact:true}));await(await chooser).setFiles({name:'card-detail.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);assert.deepEqual(await state(),run);
   await tap('offer/'+run.shop.offers[0].offerId);if(!await open.count())await tap('offer/'+run.shop.offers[0].offerId);await p.locator('.shop-joker-purchase[open]').waitFor();row.purchase=await details('purchase-background');assert.match(row.purchase.original.label,/步步高升/);assert.deepEqual(await state(),run);
   await click(open.locator('.dialog-art-original'));const zoom=p.locator('.card-art-zoom-dialog[open]');await zoom.waitFor();await zoom.locator('.card-art-zoom-thumb').waitFor({state:'visible'});
   row.zoom=await zoom.evaluate(d=>({background:getComputedStyle(d).backgroundColor,image:[...d.querySelectorAll('img')].map(i=>({fit:getComputedStyle(i).objectFit,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,src:i.currentSrc}))}));assert.ok(row.zoom.image.some(i=>i.fit==='contain'&&i.naturalWidth>0));await shot('whole-original');await click(p.locator('.card-art-zoom-close'));assert.equal(await open.locator('.dialog-art-original').evaluate(e=>e===document.activeElement),true);assert.deepEqual(await state(),run);
   await click(open.locator('.card-rules summary'));await open.locator('.card-rules p').scrollIntoViewIfNeeded();assert.deepEqual(await state(),run);await close();
   await tap('joker/'+run.jokers[0].instanceId);await p.locator('.shop-joker-held[open]').waitFor();row.held=await details('held-background');assert.deepEqual(await state(),run);await close();
   if(touch)await tap('action/shelf-tools');await tap('offer/'+run.shop.toolOffers[0].offerId);await p.locator('.shop-tool-purchase[open]').waitFor();row.tool=await details('tool-background');assert.notEqual(row.tool.image.src,row.purchase.image.src);
   await p.evaluate(()=>{window.__backgroundPanel=document.querySelector('.detail-dialog[open]');});await click(open.locator('.dialog-primary'));await p.locator('.make-cards-tool[open]').waitFor();
   assert.equal(await p.evaluate(()=>document.querySelector('.detail-dialog[open]')===window.__backgroundPanel),true);assert.equal(await open.evaluate(d=>d.matches(':modal')),true);
   assert.equal(await open.locator('.dialog-backdrop-art,.dialog-art-original').count(),0);assert.equal(await open.evaluate(d=>d.classList.contains('detail-dialog--art-background')),false);
   const bought=await state();assert.equal(bought.commandSeq,run.commandSeq+1);assert.equal(bought.consumables.length,1);assert.equal(await open.locator('.tool-target-panel input:checked').count(),0);assert.equal(await open.locator('.dialog-primary').isDisabled(),true);await shot('targets-cleared-background');
   await click(open.locator('.tool-target-panel input:not(:disabled)').first());assert.deepEqual(await state(),bought);await close();assert.deepEqual(await state(),bought);
   if(touch)await tap('action/shelf-items');await tap('offer/'+bought.shop.itemOffers[0].offerId);row.item=await details('item-background');assert.notEqual(row.item.image.src,row.tool.image.src);await close();assert.deepEqual(await state(),bought);
   row.checks.push('cover fills panel without global dim/filter; local prose scrim; top original button44px; contain original and focus return; rules/cancel unchanged state; held and goods opt-in; same purchased modal removes background/action before empty target selection; selecting/later never consumes');assert.deepEqual(row.errors,[]);row.status='PASS';
  }catch(error){row.status='FAIL';row.error=String(error.stack??error);await shot('FAIL');throw error;}
  finally{await context.close();}
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally{await browser.close();await server.close();await writeFile(out+'/browser-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({viewport:r.viewport,status:r.status})),error:report.error}));}
