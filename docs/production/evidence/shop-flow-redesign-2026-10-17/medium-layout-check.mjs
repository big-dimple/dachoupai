import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from '../../../../harness/ui.mjs';
const before=process.argv.includes('--before'),phase=before?'before':'after',out='docs/production/evidence/shop-flow-redesign-2026-10-17';
const server=await createServer({mode:'e2e',cacheDir:'.vite/shop-medium-check',server:{host:'127.0.0.1',port:5628,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
let run=createRun({rulesVersion:'r2',runId:'controlled/shop-medium-layout',seed:'shop-medium-layout',characterId:'amo',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
const result=applyCommand(run,{runId:run.runId,commandId:run.runId+'/prepare',expectedSeq:run.commandSeq,action:{type:'RerollShop'}});assert.ok(result.ok);run=result.state;const checkpoint=makeCheckpoint(run,[]);assert.equal(readCheckpoint(checkpoint).ok,true);
const sources=['src/game/ShopLayout.ts','src/game/ShopOfferLayout.ts','src/game/ShopScene.ts','src/game/ShopArt.ts','src/game/ShopPresentation.css'];
const report={phase,scope:'One validated actual rolled shop, native import and details, 1180x757 with one 1000x757 resize. Normal motion and read-only first-frame observations; no production hooks, stock override, purchase, whole-device matrix or visual acceptance.',sourceHashes:Object.fromEntries(await Promise.all(sources.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),frames:[],errors:[]};
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
try{
 const context=await browser.newContext({viewport:{width:1180,height:757},deviceScaleFactor:1,reducedMotion:'no-preference'}),p=await context.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(String(e)));p.on('dialog',d=>d.accept());
 await p.goto('http://127.0.0.1:5628/?harness=1');await waitScene(p,'title');
 await p.evaluate(()=>{window.__shopEntryFrames=[];const game=window.__harness.game;game.events.on('poststep',()=>{const s=game.scene.getScene('shop');if(!s?.scene.isActive()||!s.offerArts?.length||window.__shopEntryFrames.length>=50)return;const t=performance.now(),first=window.__shopEntryFrames[0]?.time??t;window.__shopEntryFrames.push({time:t,elapsed:t-first,rootAlpha:s.view.root.alpha,goods:s.offerArts.map(art=>({alpha:art.alpha,visible:art.visible,images:art.list.flatMap(o=>o.list??[o]).filter(o=>o.texture).map(o=>({key:o.texture.key,width:o.displayWidth,height:o.displayHeight}))})),textures:[...s.jokerArtTargets.values()].map(a=>({id:a.definitionId,loaded:s.textures.exists('p08-joker-'+a.definitionId)}))});});});
 await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'shop-medium.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'shop');
 await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.ready&&s.view.root.alpha===1&&s.offerArts.length&&s.offerArts.every(a=>a.alpha===1&&!s.tweens.isTweening(a))&&[...s.jokerArtTargets.values()].every(a=>s.textures.exists('p08-joker-'+a.definitionId));});
 await p.waitForTimeout(150);report.frames=await p.evaluate(()=>window.__shopEntryFrames);
 const inspect=()=>p.evaluate(()=>{
  const s=window.__harness.game.scene.getScene('shop'),g=s.geometry(),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),nodes=walk(s.children.list),box=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
  return{viewport:{width:innerWidth,height:innerHeight},layout:g,offers:s.run.shop.offers.slice(0,3).map(o=>{const target=[...s.jokerArtTargets.values()].find(t=>t.definitionId===o.definitionId&&t.box.y>g.pc.shopPanel.y),painted=nodes.find(n=>n.texture?.key==='p08-joker-'+o.definitionId&&n.getBounds().y>=g.pc.shopPanel.y),fields=Object.fromEntries(['name','identity','purpose','price'].map(k=>{const n=nodes.find(n=>n.name==='shop/offer-'+k&&n.getData('offerId')===o.offerId);return[k,{text:n.text,...box(n)}];}));return{id:o.offerId,art:target.box,paintedArt:painted?box(painted):undefined,fields};}),rootAlpha:s.view.root.alpha,state:s.run};
 });
 report.medium=await inspect();assert.deepEqual(report.medium.state,run);await p.screenshot({path:out+'/1180-shop-'+phase+'.png',scale:'css'});
 const assertOfferLayout=data=>{const prices=data.offers.map(o=>o.fields.price.y);assert.ok(prices.every(y=>Math.abs(y-prices[0])<.01));for(const o of data.offers){assert.ok(o.fields.purpose.y+o.fields.purpose.height<=o.fields.price.y+1);assert.ok(o.fields.identity.y>=o.art.y+o.art.height);assert.ok(o.fields.purpose.text.split('\n').length<=2);assert.ok(Math.abs(o.art.height/o.art.width-1.25)<.001);}};assertOfferLayout(report.medium);
 if(!before){assert.ok(report.frames[0].goods.every(a=>a.alpha>0),'first shop frame retains visible merchandise');await p.setViewportSize({width:1000,height:757});await p.waitForTimeout(350);report.narrow=await inspect();assertOfferLayout(report.narrow);assert.deepEqual(report.narrow.state,run);await p.screenshot({path:out+'/1000-shop-after.png',scale:'css'});await p.setViewportSize({width:1180,height:757});await p.waitForTimeout(200);await tapUI(p,'shop','offer/'+run.shop.offers[0].offerId);await p.locator('.shop-joker-purchase[open]').waitFor();await p.locator('.shop-joker-purchase[open] .dialog-close').click();assert.deepEqual(await p.evaluate(()=>window.__harness.game.registry.get('runController').state),run);}
 assert.deepEqual(report.errors,[]);report.status='PASS';await context.close();
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally{
 await browser.close();await server.close();
 const frames=report.frames,chosen=[frames[0],frames.find(f=>f.textures.every(t=>t.loaded)),frames.find(f=>f.goods.some(g=>g.alpha>0)),frames.find(f=>f.goods.every(g=>g.alpha===1))].filter((f,i,a)=>f&&a.indexOf(f)===i);
 report.observedFrameCount=frames.length;report.frames=chosen.map(f=>({...f,goods:f.goods.map(g=>({...g,images:g.images.filter(i=>/^(p08-joker-|goods-art\/)/.test(i.key))}))}));
 for(const data of [report.medium,report.narrow])if(data?.state){data.stateHash=createHash('sha256').update(JSON.stringify(data.state)).digest('hex');delete data.state;}
 await writeFile(out+'/medium-layout-'+phase+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({phase,status:report.status,error:report.error,art:report.medium?.offers.map(o=>o.art),ownedRail:report.medium?.layout.pc.ownedRail}));
}
