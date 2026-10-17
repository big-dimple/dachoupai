import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene,point} from '../../../../harness/ui.mjs';

const out='docs/production/evidence/shop-flow-redesign-2026-10-17',dist='.vite/shop-flow-browser-build',inspectionOnly=process.argv.includes('--final-inspection');
await mkdir(out,{recursive:true});
const ssr=await createServer({mode:'e2e',server:{middlewareMode:true},logLevel:'error'});
let fixture,checkpoint,giftId;
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts');
 const {newRunIdentity}=await ssr.ssrLoadModule('/src/game/RunLaunch.ts');
 const {makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 const {R2_TOOLS}=await ssr.ssrLoadModule('/src/content/r2Tools.ts');
 const {r2ToolPrice}=await ssr.ssrLoadModule('/src/domain/r2Shop.ts');
 fixture=createRun({rulesVersion:'r2',runId:'controlled/shop-flow-redesign',seed:'shop-flow-redesign',characterId:'amo',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 const rerolled=applyCommand(fixture,{runId:fixture.runId,commandId:fixture.runId+'/prepare',expectedSeq:fixture.commandSeq,action:{type:'RerollShop'}});assert.ok(rerolled.ok,rerolled.code);fixture=rerolled.state;
 fixture.gold=30;fixture.handLevels={'high-card':1,pair:1};giftId=R2_TOOLS.find(t=>t.operation.kind==='add-gold'&&t.phases.includes('shop')).id;
 fixture.consumables=[{instanceId:'controlled/gift',definitionId:giftId}];
 fixture.shop.toolOffers[0].definitionId='T11';fixture.shop.toolOffers[0].price=r2ToolPrice('T11',fixture);
 checkpoint=makeCheckpoint(fixture,[]);assert.equal(readCheckpoint(checkpoint).ok,true);
}finally{await ssr.close();}
const sources=['src/game/ShopScene.ts','src/game/ShopLayout.ts','src/game/ShopOfferLayout.ts','src/game/ShopAnchoredTip.ts','src/game/ShopPurchaseFlow.ts','src/game/ShopSynergyPreview.ts','src/game/MakeCardsDialog.ts','src/game/ConsumableDialog.ts','src/game/DetailDialog.ts','src/game/ShopPresentation.css'];
const report={scope:'Controlled validated fixture through native import. Mouse1912 and touch390, resize1280/320. No user saves, CI, deployment, device or aesthetic approval.',fixture,giftId,sourceHashes:Object.fromEntries(await Promise.all(sources.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')]))),cases:[]};
await build({mode:'e2e',build:{outDir:dist},logLevel:'error'});
const server=await preview({build:{outDir:dist},preview:{host:'127.0.0.1',port:5617,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});report.browser=browser.version();
const state=p=>p.evaluate(()=>structuredClone(window.__harness.game.registry.get('runController').state));
const ready=async p=>{await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);};
try{
 for(const viewport of [{width:1912,height:954},{width:390,height:844}]){
  const touch=viewport.width<900,context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(15000);
  const row={viewport,checks:[],shots:[],errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
  const click=l=>touch?l.tap():l.click(),tap=name=>tapUI(p,'shop',name,touch),open=p.locator('.detail-dialog[open]');
  const closeAll=async()=>{for(let i=0;i<3&&await open.count();i++)await click(open.locator('.dialog-close'));assert.equal(await open.count(),0);};
  const shot=async name=>{await p.waitForTimeout(350);const file=viewport.width+'-'+name+(inspectionOnly?'-final':'')+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});row.shots.push(file);};
  const inventory=async()=>{await tap(touch?'action/tool-inventory':'action/make-cards');await p.locator('.tool-inventory[open]').waitFor();};
  try{
   await p.goto('http://127.0.0.1:5617/?harness=1');await waitScene(p,'title');
   await click(p.locator('.run-menu-toggle'));const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await click(section.locator('summary'));
   const chooser=p.waitForEvent('filechooser');await click(p.getByRole('button',{name:'导入本局',exact:true}));await(await chooser).setFiles({name:'shop-flow.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await ready(p);assert.deepEqual(await state(p),fixture);
   await shot('shop');
   if(!touch){
    const target=await point(p,'shop','offer/'+fixture.shop.offers[0].offerId);await p.mouse.move(target.x,target.y);await p.waitForTimeout(250);
    row.tooltip=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>list.flatMap(o=>[o,...o.list?walk(o.list):[]]),title=walk(s.children.list).find(o=>o.name==='shop/synergy-title'),b=title?.getBounds();return{left:s.geometry().pc.left,bounds:b?{x:b.x,y:b.y,width:b.width,height:b.height}:undefined};});
    assert.ok(row.tooltip.bounds);assert.ok(row.tooltip.bounds.x>=row.tooltip.left.x+row.tooltip.left.width);assert.deepEqual(await state(p),fixture);await shot('nearby-tip');await p.mouse.move(5,5);
   }
   await inventory();await click(p.locator('.tool-inventory-card[data-item-id="controlled/gift"]'));await p.locator('.tool-targetless[open]').waitFor();
   row.compact=await open.evaluate(d=>({box:d.getBoundingClientRect().toJSON(),art:d.querySelector('.dialog-card-art').getBoundingClientRect().toJSON(),footer:[...d.querySelectorAll('.dialog-actions button')].map(b=>b.textContent)}));
   assert.ok(row.compact.box.width<=600);assert.ok(row.compact.box.height<600);assert.ok(row.compact.art.width>=120);assert.equal(row.compact.footer.length,2);await shot('targetless-tool');
   if(inspectionOnly){const beforeZoom=await state(p);await click(open.locator('.dialog-card-zoom-trigger'));await p.locator('.card-art-zoom-dialog[open]').waitFor();await shot('full-art');await click(p.locator('.card-art-zoom-close'));assert.equal(await open.locator('.dialog-card-zoom-trigger').evaluate(e=>e===document.activeElement),true);assert.deepEqual(await state(p),beforeZoom);}
   const beforeGift=await state(p);await click(open.locator('.dialog-primary'));await ready(p);const afterGift=await state(p);assert.equal(afterGift.commandSeq,beforeGift.commandSeq+1);assert.equal(afterGift.consumables.length,0);await closeAll();
   if(touch)await tap('action/shelf-tools');
   await tap('offer/'+fixture.shop.toolOffers[0].offerId);await p.locator('.shop-tool-purchase[open]').waitFor();await p.evaluate(()=>{window.__purchasePanel=document.querySelector('.detail-dialog[open]');});
   const beforeBuy=await state(p);await click(open.locator('.dialog-primary'));await p.locator('.make-cards-tool[open]').waitFor();await ready(p);
   assert.equal(await p.evaluate(()=>document.querySelector('.detail-dialog[open]')===window.__purchasePanel),true);
   assert.equal(await open.evaluate(d=>d.matches(':modal')),true,'reused panel retains native modal layer and backdrop');
   const bought=await state(p),gained=bought.consumables.find(c=>c.definitionId==='T11');assert.ok(gained);assert.equal(bought.commandSeq,beforeBuy.commandSeq+1);
   assert.equal(await open.locator('.dialog-actions button').count(),2);assert.equal(await open.locator('.tool-target-panel input:checked').count(),0);assert.equal(await open.locator('.dialog-primary').isDisabled(),true);
   await click(open.locator('.tool-target-panel input:not(:disabled)').first());assert.deepEqual(await state(p),bought);await shot('purchased-select-target');
   await click(open.locator('.dialog-close'));assert.equal(await open.count(),0);assert.deepEqual(await state(p),bought);
   if(inspectionOnly){
    await tap('action/build');await p.locator('.make-cards-tool[open]').waitFor();assert.equal(await open.locator('.dialog-actions button').count(),2);assert.equal(await open.locator('.tool-target-panel input:checked').count(),0);assert.deepEqual(await state(p),bought);await closeAll();
    if(touch){await tap('action/shelf-tools');await tap('offer/basic-choice/'+bought.shop.basicChoice.shopSeq);}else await tap('action/basic-choice');
    await p.locator('.shop-workshop[open]').waitFor();await click(open.getByRole('button',{name:'改牌工具',exact:true}));await shot('workshop-tools');await click(open.getByRole('button',{name:'染色工具',exact:true}));await shot('workshop-dyes');await closeAll();assert.deepEqual(await state(p),bought);
    row.checks.push('final source: same native modal/backdrop, empty targets, two footer actions, receipt resumes same flow; enlarged clear artwork, outside zoom caption, full-art focus returns; workshop tools/dyes close without state changes');assert.deepEqual(row.errors,[]);row.status='PASS';continue;
   }
   await inventory();await click(p.locator('.tool-inventory-card[data-item-id="'+gained.instanceId+'"]'));await p.locator('.tool-detail[open]').waitFor();
   await click(open.locator('.tool-target-panel input:not(:disabled)').first());assert.equal(await open.locator('.dialog-primary').isEnabled(),true);await click(open.locator('.dialog-primary'));await ready(p);
   const used=await state(p);assert.equal(used.commandSeq,bought.commandSeq+1);assert.equal(used.consumables.some(c=>c.instanceId===gained.instanceId),false);await closeAll();
   row.checks.push('targetless compact true preview; saved buy reused exact panel; no preselected card; selecting/later preserve full state; explicit confirm consumes once');
   if(touch){await tap('action/shelf-tools');await tap('offer/basic-choice/'+used.shop.basicChoice.shopSeq);}else await tap('action/basic-choice');
   await p.locator('.shop-workshop[open]').waitFor();assert.equal(await open.locator('.workshop-nav button').count(),3);assert.equal(await open.locator('.make-cards-stock').count(),0);await shot('workshop');
   await click(open.locator('[data-service-id]').first());await p.locator('.shop-service-confirmation[open]').waitFor();const beforeUpgrade=await state(p);await click(open.locator('.dialog-primary'));await ready(p);
   const upgraded=await state(p);assert.equal(upgraded.commandSeq,beforeUpgrade.commandSeq+1);assert.ok(upgraded.shop.basicChoice.purchase.handType);assert.equal(upgraded.consumables.length,used.consumables.length);await closeAll();
   await tap('action/reroll');await ready(p);const refreshed=await state(p);assert.deepEqual(refreshed.shop.basicChoice.purchase,upgraded.shop.basicChoice.purchase);
   await p.setViewportSize(touch?{width:320,height:740}:{width:1280,height:720});await p.waitForTimeout(450);assert.deepEqual(await state(p),refreshed);await shot('resized');
   await p.reload();await waitScene(p,'title');await click(p.getByRole('button',{name:'继续本局',exact:true}));await ready(p);assert.deepEqual(await state(p),refreshed);
   row.checks.push('single workshop with three factual groups; upgrade consumes shared quota; reroll keeps receipt; resize and cold continue preserve full state');
   assert.deepEqual(row.errors,[]);row.status='PASS';
  }catch(error){row.status='FAIL';row.error=String(error.stack??error);await shot('FAIL');throw error;}
  finally{await context.close();}
 }
}finally{await writeFile(out+(inspectionOnly?'/browser-final-check.json':'/browser-check.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
console.log(JSON.stringify({cases:report.cases.map(c=>({viewport:c.viewport,status:c.status,checks:c.checks,errors:c.errors}))}));
