import assert from 'node:assert/strict';
import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
import {chromium} from '/workspace/dachoupai/node_modules/playwright/index.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {waitScene,tapUI} from '/workspace/dachoupai/harness/ui.mjs';
import {snapshotSource} from '/workspace/dachoupai/scripts/check-runner.mjs';
const root='/workspace/dachoupai',out='/tmp/shop-w2-final';await mkdir(out,{recursive:true});
const source=JSON.parse(await readFile(root+'/docs/production/evidence/w2-build-keepsake-2026-10-09/report.json','utf8'));
const profile=source.profiles.find(p=>p.width===390),saved=profile.transactions.find(t=>t.label==='saved next shop').state;
const server=await createServer({root,mode:'e2e',server:{port:5515,host:'127.0.0.1',strictPort:true},logLevel:'error'});await server.listen();
const {applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const checkpoint=makeCheckpoint(saved,profile.transactions.flatMap(t=>t.commands));assert.equal(readCheckpoint(checkpoint).ok,true);
const report={head:snapshotSource(root).head,before:snapshotSource(root),baselineHead:snapshotSource(root).head,workingTreeCandidate:true,scope:'Same legal saved shop, four bounded views; existing mouse/touch purchase/inspection/cancel paths only, no new gameplay run.',screens:[],errors:[],physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});
try{
 for(const [width,height,name] of [[1366,768,'pc-1366'],[390,740,'phone-390'],[320,740,'phone-320'],[740,390,'short-740']]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width===390,reducedMotion:'reduce'}),page=await ctx.newPage();page.setDefaultTimeout(15000);page.on('dialog',d=>d.accept());page.on('pageerror',e=>report.errors.push(String(e)));
  await page.goto('http://127.0.0.1:5515/?harness=1');await waitScene(page,'title');await page.locator('.run-menu-toggle').click();
  const progress=page.getByText('进度与存档',{exact:true}).locator('..');if(!await progress.evaluate(e=>e.open))await progress.locator('summary').click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'same-normal-shop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
  await waitScene(page,'shop');await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
  const state=()=>page.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal};});const before=await state();assert.deepEqual(before.state,saved);
  await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop'),r=s.run;return [...r.jokers,...r.shop.offers].every(x=>['loaded','unregistered'].includes(s.jokerArtStatus(x.definitionId).status));},{},{timeout:15000});
  await page.waitForTimeout(300);await page.screenshot({path:out+'/'+name+'.png',scale:'css'});assert.deepEqual(await state(),before);
  const geometry=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),g=s.geometry(),objects=[];const walk=list=>{for(const o of list){if(o.name?.startsWith('action/')&&o.input?.enabled){const r=o.getBounds();objects.push({name:o.name,x:r.x,y:r.y,width:r.width,height:r.height});}if(o.list)walk(o.list);}};walk(s.children.list);return {layout:g,objects};});for(const b of geometry.objects){assert.ok(b.height>=44,b.name);assert.ok(b.x>=0&&b.x+b.width<=width+.5,b.name);assert.ok(b.y>=0&&b.y+b.height<=height+.5,b.name);}
  report.screens.push({width,height,file:name+'.png',stateUnchanged:true,commandSeq:saved.commandSeq,geometry,art:await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');return [...s.run.jokers,...s.run.shop.offers].map(x=>({id:x.definitionId,status:s.jokerArtStatus(x.definitionId).status}));})});
  if(width===1366||width===390){
   const touch=width===390;const click=b=>b[touch?'tap':'click']();
   const cancel=async()=>{await click(page.getByRole('button',{name:'取消',exact:true}));assert.deepEqual(await state(),before);};
   await tapUI(page,'shop','offer/'+saved.shop.offers[0].offerId,touch);await page.getByRole('button',{name:/^邀请 ·/}).waitFor();await cancel();
   await tapUI(page,'shop','joker/'+saved.jokers[0].instanceId,touch);await click(page.getByRole('button',{name:'出售…',exact:true}));await page.getByRole('button',{name:/确认出售/}).waitFor();await cancel();
   await page.keyboard.press('Escape');assert.deepEqual(await state(),before);
   let offer=saved.shop.offers[0];if(touch){await tapUI(page,'shop','action/shelf-tools',touch);offer=saved.shop.toolOffers.find(o=>!o.consumed);}
   await tapUI(page,'shop','offer/'+offer.offerId,touch);const button=page.getByRole('button',{name:/^(邀请|购买) · \d+ 金$/});await button.waitFor();assert.ok(!await button.isDisabled());await click(button);
   await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq,saved.commandSeq+1);await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
   const after=await state(),commands=after.journal.filter(c=>c.expectedSeq>=saved.commandSeq);assert.equal(commands.length,1);const expected=applyCommand(saved,commands[0]);assert.ok(expected.ok);assert.deepEqual(after.state,expected.state);
   const plates=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),items=[];const walk=list=>{for(const o of list){if(o.name==='shop/price-plate')items.push({offerId:o.getData('offerId'),status:o.getData('availability')});if(o.list)walk(o.list);}};walk(s.children.list);return items;});assert.equal(plates.find(p=>p.offerId===offer.offerId)?.status,'owned');
   await tapUI(page,'shop','action/tool-inventory',touch);await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.deepEqual(await state(),after);
   await page.mouse.move(0,0);await page.waitForTimeout(450);await page.screenshot({path:out+'/'+name+'-purchased.png',scale:'css'});report.screens.at(-1).paths={purchaseCancel:'PASS',saleCancel:'PASS',toolboxClose:'PASS',purchase:{commands,state:after.state,canonicalEqual:true},pricePlates:plates};
  }await ctx.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;}
finally{report.after=snapshotSource(root);report.sourceUnchanged=JSON.stringify(report.before)===JSON.stringify(report.after);await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();await server.close();}
