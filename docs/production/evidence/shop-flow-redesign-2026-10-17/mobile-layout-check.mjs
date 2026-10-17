import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from '../../../../harness/ui.mjs';
const before=process.argv.includes('--before'),phase=before?'before':'after',out='docs/production/evidence/shop-flow-redesign-2026-10-17';
const server=await createServer({mode:'e2e',cacheDir:'.vite/shop-mobile-check',server:{host:'127.0.0.1',port:5629,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {r2JokerDefinitionsFor}=await server.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
const {r2ToolPrice,r2Price}=await server.ssrLoadModule('/src/domain/r2Shop.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
let run=createRun({rulesVersion:'r2',runId:'controlled/shop-mobile-layout',seed:'shop-mobile-layout',characterId:'amo',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
const result=applyCommand(run,{runId:run.runId,commandId:run.runId+'/prepare',expectedSeq:run.commandSeq,action:{type:'RerollShop'}});assert.ok(result.ok);run=result.state;
const definitions=r2JokerDefinitionsFor(run),rarities=['common','uncommon','rare'],goods=rarities.map(rarity=>definitions.find(d=>d.rarity===rarity));
run.shop.offers.slice(0,3).forEach((offer,i)=>{offer.definitionId=goods[i].id;offer.price=r2Price(offer.definitionId,offer.edition,run);});run.jokers=[definitions.find(d=>d.rarity==='common'&&!goods.includes(d)),definitions.find(d=>d.rarity==='rare'&&!goods.includes(d))].map((d,i)=>r2CreateJoker(d.id,'controlled/owned/'+i,4,undefined,run));
run.gold=30;run.handLevels={'high-card':1,pair:1};run.shop.toolOffers[0].definitionId='T11';run.shop.toolOffers[0].price=r2ToolPrice('T11',run);
const checkpoint=makeCheckpoint(run,[]);assert.equal(readCheckpoint(checkpoint).ok,true);
const sources=['src/game/ShopLayout.ts','src/game/ShopOfferLayout.ts','src/game/ShopScene.ts','src/game/ShopArt.ts','src/game/ShopPresentation.css'];
const report={phase,scope:'Controlled validated stock with all three rarities, two owned cards,30 gold and T11; native import/category/details/purchase/later at360/390 touch. No natural supply, device or aesthetic approval.',sourceHashes:Object.fromEntries(await Promise.all(sources.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),cases:[]};
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
try{
 for(const width of [390,360]){
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(30000);const row={width,errors:[],shots:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
  const tap=name=>tapUI(p,'shop',name,true),state=()=>p.evaluate(()=>structuredClone(window.__harness.game.registry.get('runController').state)),open=p.locator('.detail-dialog[open]');
  const shot=async name=>{const file=width+'-'+name+'-'+phase+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});row.shots.push(file);};
  const close=async()=>{await open.locator('.dialog-close').tap();await p.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));};
  const dialog=()=>open.evaluate(d=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};},art=d.querySelector('.dialog-card-art'),visual=art?.querySelector('.dialog-art-visual'),image=art?.querySelector('img'),rarity=d.querySelector('.dialog-header .shop-card-tags [data-axis=rarity]'),badge=visual?.querySelector('.joker-rarity-badge');return{box:box(d),scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,art:art?box(art):undefined,visual:visual?box(visual):undefined,image:image?{...box(image),naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight}:undefined,rarity:rarity?{text:rarity.textContent,...box(rarity)}:undefined,badge:badge?{text:badge.textContent,...box(badge)}:undefined,buttons:[...d.querySelectorAll('.dialog-actions button')].map(b=>({text:b.textContent,...box(b)})),checked:d.querySelectorAll('.tool-target-panel input:checked').length,targetArt:[...d.querySelectorAll('.tool-target-art')].slice(0,4).map(box)};});
  await p.goto('http://127.0.0.1:5629/?harness=1');await waitScene(p,'title');await p.locator('.run-menu-toggle').tap();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').tap();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'shop-mobile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(250);
  row.shop=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),nodes=walk(s.children.list),box=o=>{const r=o.getBounds();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{geometry:s.geometry(),hero:nodes.filter(o=>o.name==='shop/hero-backdrop'||o.name==='shop/hero-art').map(o=>({name:o.name,alpha:o.alpha,...box(o)})),fields:nodes.filter(o=>['shop/offer-name','shop/offer-identity','shop/offer-purpose','shop/offer-price','shop/owned-name','shop/owned-identity'].includes(o.name)).map(o=>({name:o.name,text:o.text,id:o.getData('offerId')??o.getData('instanceId'),...box(o)}))};});assert.deepEqual(await state(),run);await shot('shop');
  await tap('offer/'+run.shop.offers[2].offerId);if(!await open.count())await tap('offer/'+run.shop.offers[2].offerId);await p.locator('.shop-joker-purchase[open]').waitFor();await open.locator('.dialog-card-image').waitFor({state:'visible'});row.rareDetail=await dialog();await shot('rare-detail');await close();
  await tap('joker/'+run.jokers[1].instanceId);await p.locator('.shop-joker-held[open]').waitFor();await open.locator('.dialog-card-image').waitFor({state:'visible'});row.heldDetail=await dialog();if(!before)await shot('held-detail');await close();
  await tap('action/shelf-tools');if(!before)await shot('tools');await tap('offer/'+run.shop.toolOffers[0].offerId);await p.locator('.shop-tool-purchase[open]').waitFor();row.toolDetail=await dialog();if(!before)await shot('tool-detail');
  await open.locator('.dialog-primary').tap();await p.locator('.make-cards-tool[open]').waitFor();row.target=await dialog();const bought=await state();assert.equal(bought.commandSeq,run.commandSeq+1);assert.equal(bought.consumables.length,1);assert.equal(row.target.checked,0);assert.equal(await open.locator('.dialog-primary').isDisabled(),true);if(!before){await open.locator('.tool-target-panel input:not(:disabled)').first().tap();assert.deepEqual(await state(),bought);}await shot('target');await close();assert.deepEqual(await state(),bought);
  await tap('action/shelf-items');if(!before)await shot('items');assert.deepEqual(await state(),bought);
  if(!before){
   assert.equal(row.shop.hero.length,1);assert.ok(row.shop.hero[0].alpha>0&&row.shop.hero[0].alpha<.25);
   const identities=row.shop.fields.filter(f=>f.name==='shop/offer-identity').map(f=>f.text).join(' ');for(const label of ['普通','特别','稀有'])assert.ok(identities.includes(label));assert.equal(row.shop.fields.filter(f=>f.name==='shop/owned-identity').length,2);
   for(const d of [row.rareDetail,row.heldDetail]){assert.match(d.rarity.text,/稀有/);assert.ok(d.rarity.y+d.rarity.height<=d.art.y);assert.ok(d.image.width>=170);assert.ok(d.scrollWidth<=d.clientWidth+1);}
   assert.ok(row.target.targetArt.length);assert.ok(row.target.targetArt.every(a=>a.width>=60&&a.height>=75));assert.equal(row.target.buttons.length,2);assert.ok(row.target.scrollWidth<=row.target.clientWidth+1);
   for(const id of run.shop.offers.slice(0,3).map(o=>o.offerId)){const fields=row.shop.fields.filter(f=>f.id===id),identity=fields.find(f=>f.name==='shop/offer-identity'),summary=fields.find(f=>f.name==='shop/offer-purpose'),price=fields.find(f=>f.name==='shop/offer-price');assert.ok(identity.y+identity.height<=summary.y+1);assert.ok(summary.y+summary.height<=price.y+1);}
  }
  if(!before&&width===360){await p.setViewportSize({width:360,height:740});await tap('action/shelf-jokers');await p.waitForTimeout(150);await shot('short-shop');assert.deepEqual(await state(),bought);}
  assert.deepEqual(row.errors,[]);row.status='PASS';await context.close();
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally{await browser.close();await server.close();await writeFile(out+'/mobile-layout-'+phase+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({phase,status:report.status,cases:report.cases.map(r=>({width:r.width,status:r.status})),error:report.error}));}
