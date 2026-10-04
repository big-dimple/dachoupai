/** Natural shop + native touch across thumbnail completion/failure; observers never dispatch domain actions. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {point,tapUI,waitScene} from './ui.mjs';
const dir='shots/p08-joker-art-touch',outDir=process.env.ART_TOUCH_REUSE_BUILD||dir+'/build',port=5295;
await mkdir(dir,{recursive:true});
if(!process.env.ART_TOUCH_REUSE_BUILD)await build({mode:'e2e',build:{outDir},logLevel:'error'});
const server=await preview({build:{outDir},preview:{port,strictPort:true,host:'127.0.0.1'},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={taskId:'P08',testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(await readFile(outDir+'/build-info.json','utf8')),renderer:'Canvas',viewport:{width:390,height:740},DPR:3,physicalDevice:'NOT_RUN',checks:[],errors:[]};
async function observe(page,name){return page.evaluate(name=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>{for(const o of list){if(o.name===name)return o;if(o.list){const found=walk(o.list);if(found)return found;}}},o=walk(s.children.list),b=o.getBounds(),p=s.view.pressed;return {sameTarget:o===window.__artTouchTarget,active:o.active,pressedSame:p?.object===o,pressedHeld:p?.held??false,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},state:window.__harness.game.registry.get('runController').state};},name);}
try{
 for(const kind of ['tap','drag','failure']){
  const context=await browser.newContext({viewport:report.viewport,hasTouch:true,deviceScaleFactor:3}),page=await context.newPage(),held=[],requests=[];let failed=false;
  page.on('pageerror',e=>report.errors.push(String(e)));page.on('request',r=>requests.push(new URL(r.url()).pathname));
  await page.route('**/cards/*.thumbnail.webp',r=>{if(kind==='failure'&&failed)return r.continue();held.push(r);});
  await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=p00-core-ui`);await waitScene(page,'title');
  await tapUI(page,'title','action/title-start',true);await waitScene(page,'character-select');await tapUI(page,'character-select','character/amo',true);await tapUI(page,'character-select','action/confirm-character',true);await waitScene(page,'shop');
  assert.equal(await page.evaluate(()=>window.__harness.game.renderer.type),1,'actual Canvas');
  const before=await page.evaluate(()=>window.__harness.game.registry.get('runController').state),offer=before.shop.offers.find(o=>!o.consumed&&o.price<=before.gold),name='offer/'+offer.offerId;
  assert.equal(offer.definitionId,'b11','natural seed exercises a newly registered final21 face');
  const p=await point(page,'shop',name);
  await page.evaluate(name=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>{for(const o of list){if(o.name===name)return o;if(o.list){const f=walk(o.list);if(f)return f;}}};window.__artTouchTarget=walk(s.children.list);},name);
  const original=await observe(page,name),cdp=await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').view.pressed?.object===window.__artTouchTarget);
  if(kind==='drag')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+30,y:p.y}]});
  await Promise.all(held.splice(0).map(r=>kind==='failure'&&r.request().url().endsWith('/b11.thumbnail.webp')?r.fulfill({status:404,body:'controlled missing thumbnail'}):r.continue()));failed=kind==='failure';
  await page.waitForFunction(kind=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>list.some(o=>kind==='failure'?o.type==='Text'&&o.text==='插画未加载'||o.list&&walk(o.list):o.type==='Image'&&o.texture.key==='p08-joker-b11'||o.list&&walk(o.list));return walk(s.children.list);},kind);
  const during=await observe(page,name);
  assert.ok(during.sameTarget&&during.active&&during.pressedSame,'thumbnail notification preserves the owning hit target and native press');assert.deepEqual(during.bounds,original.bounds,'thumbnail loading cannot move the offer hit frame');assert.deepEqual(during.state,before,'completion/failure cannot mutate run, RNG or saved resources');
  assert.ok(!requests.some(p=>p.endsWith('.detail.webp')),'unopened HD remains on demand');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  if(kind==='drag'){
   await page.evaluate(()=>new Promise(resolve=>window.__harness.game.events.once('poststep',resolve)));assert.equal(await page.locator('.detail-dialog[open]').count(),0,'a moved touch never becomes a tap');
   await tapUI(page,'shop',name,true);
  }
  await page.getByRole('button',{name:'取消',exact:true}).waitFor();
  if(kind==='failure'){
   const frame=page.locator('.detail-dialog[open] .dialog-card-art .dialog-art-visual'),frameBefore=await frame.boundingBox();await page.getByRole('button',{name:'重试卡面',exact:true}).tap();
   await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').textures.exists('p08-joker-b11'));await page.getByRole('button',{name:'重试卡面',exact:true}).waitFor({state:'hidden'});assert.deepEqual(await frame.boundingBox(),frameBefore,'404 + explicit retry keeps the fixed detail frame');
  }
  await page.getByRole('button',{name:'取消',exact:true}).tap();assert.deepEqual(await page.evaluate(()=>window.__harness.game.registry.get('runController').state),before,'native cancel leaves gold, shelf, RNG and save unchanged');
  if(kind==='tap'){await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.offerArts.every(a=>a.alpha===1&&!s.tweens.isTweening(a));});await page.screenshot({path:dir+'/390-natural-shop.png',scale:'css'});}
  report.checks.push({kind,status:'PASS',definitionId:offer.definitionId,originalBounds:original.bounds,duringBounds:during.bounds,heldBeforeRelease:during.pressedHeld,covered:['same owning hit target during thumbnail notification','fixed geometry','unopened HD not requested','full run/RNG unchanged','native detail cancel',...(kind==='drag'?['movement preserved','fresh cached tap works']:[]),...(kind==='failure'?['thumbnail404 usable','manual retry works','fixed detail frame']:[])]});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
