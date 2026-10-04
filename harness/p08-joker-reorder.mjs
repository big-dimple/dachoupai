/** Natural owned Jokers; browser inputs only. Reuses the existing UI geometry harness. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {point,tapUI,waitScene,chooseCharacter,buyOffer} from './ui.mjs';

const dir='shots/p08-joker-reorder',outDir=process.env.JOKER_REORDER_REUSE_BUILD||dir+'/build',port=5296;
await mkdir(dir,{recursive:true});
if(!process.env.JOKER_REORDER_REUSE_BUILD)await build({mode:'e2e',build:{outDir},logLevel:'error'});
assert.equal(await readFile(outDir+'/licenses/browslatro.MIT.txt','utf8'),await readFile('public/licenses/browslatro.MIT.txt','utf8'));
const server=await preview({build:{outDir},preview:{port,strictPort:true,host:'127.0.0.1'},logLevel:'error'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={taskId:'P08',baseCommit:'3938cee365994910d7d79f62fc91701273f2efe0',testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(await readFile(outDir+'/build-info.json','utf8')),browser:browser.version(),renderer:'Chromium software Canvas',viewport:{width:390,height:740},DPR:1,seed:'r03-1',acquisition:'erxiang → buy mantangcai → natural first-stage four-card play → next shop → buy jiedongfeng; no card/resource/checkpoint injection',physicalDevice:'OnePlus/hardware GPU/audio NOT_RUN',runs:[],errors:[]};
const read=page=>page.evaluate(()=>({state:window.__harness.game.registry.get('runController').state,journal:window.__harness.game.registry.get('runController').journal}));
const idle=(page,key)=>page.waitForFunction(key=>window.__harness.game.scene.getScene(key)?.ready,key);
const step=page=>page.evaluate(()=>new Promise(resolve=>window.__harness.game.events.once('poststep',resolve)));
const dom=(page,label,touch)=>touch?page.getByRole('button',{name:label,exact:true}).tap():page.getByRole('button',{name:label,exact:true}).click();

async function assertMove(page,before,sourceId,to,record,label){
 await page.waitForFunction(seq=>{const c=window.__harness.game.registry.get('runController');return c.status==='idle'&&c.state.commandSeq===seq+1;},before.state.commandSeq);
 const after=await read(page),expected=[...before.state.jokers],from=expected.findIndex(j=>j.instanceId===sourceId),[source]=expected.splice(from,1);expected.splice(to,0,source);
 assert.deepEqual(after.state.jokers,expected,'exact instances, editions and growth travel with the order');
 assert.equal(after.state.commandSeq,before.state.commandSeq+1,'one saved command for one input');
 assert.deepEqual(after.state.rng,before.state.rng);assert.equal(after.state.gold,before.state.gold);
 const {jokers,commandSeq,receipts,...stable}=after.state,{jokers:oldJokers,commandSeq:oldSeq,receipts:oldReceipts,...oldStable}=before.state;
 assert.deepEqual(stable,oldStable,'reorder changes no other run fields');
 assert.equal(after.journal.length,before.journal.length+1);
 assert.deepEqual(after.journal.at(-1).action,{type:'ReorderJokers',ids:expected.map(j=>j.instanceId)});
 assert.equal(after.journal.at(-1).expectedSeq,before.state.commandSeq);
 await step(page);assert.deepEqual(await read(page),after,'release does not submit again');
 record.checks.push({label,status:'PASS',beforeSeq:before.state.commandSeq,afterSeq:after.state.commandSeq,ids:expected.map(j=>j.instanceId)});
}

async function target(page,key,id,store=false){
 return page.evaluate(({key,id,store})=>{
  const scene=window.__harness.game.scene.getScene(key),walk=list=>{for(const o of list){if(o.name==='joker/'+id)return o;if(o.list){const found=walk(o.list);if(found)return found;}}},o=walk(scene.children.list),b=o.getBounds();
  if(store)window.__reorderTarget=o;
  return {same:o===window.__reorderTarget,active:o.active,pressedSame:scene.view.pressed?.object===o,bounds:{x:b.x,y:b.y,width:b.width,height:b.height}};
 },{key,id,store});
}

async function nativeDrag(page,cdp,touch,key,id,end,{cancel=false,preHold=false,sameSlot=false,onHeld}={}){
 const start=await point(page,key,'joker/'+id);
 if(touch){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start.x,y:start.y}]});
  await page.waitForFunction(key=>!!window.__harness.game.scene.getScene(key).view.pressed,key);
  if(preHold)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+20,y:start.y}]});
  else await page.waitForFunction(key=>window.__harness.game.scene.getScene(key).view.pressed?.held,key);
  await onHeld?.();
  if(cancel)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
  else{
   if(sameSlot)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+12,y:start.y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[end]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
 }else{
  await page.mouse.move(start.x,start.y);await page.mouse.down();
  if(sameSlot)await page.mouse.move(start.x+12,start.y);
  await page.mouse.move(end.x,end.y,{steps:3});await page.mouse.up();
 }
 await step(page);
}

async function slotPoint(page,key,index){
 return page.evaluate(({key,index})=>{
  const s=window.__harness.game.scene.getScene(key),b=(key==='shop'?s.geometry():s.view.layout).slots[index],canvas=s.game.canvas.getBoundingClientRect(),screen=s.cameras.main.matrix.transformPoint(b.x+b.width/2,b.y+b.height/2);
  return {x:canvas.left+screen.x*canvas.width/s.scale.width,y:canvas.top+screen.y*canvas.height/s.scale.height};
 },{key,index});
}

try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:report.viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),record={input:touch?'native CDP touch + touchscreen.tap + DOM tap':'mouse drag/click + DOM click',checks:[]};report.runs.push(record);
  const held=[];let released=!touch;
  page.on('pageerror',error=>report.errors.push(String(error)));
  await page.route('**/jiedongfeng.thumbnail.webp',route=>released?route.continue():held.push(route));
  try{
   await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=r03-1`);await chooseCharacter(page,'erxiang',touch);await idle(page,'shop');
   assert.equal(await page.evaluate(()=>window.__harness.game.renderer.type),1);
   let observed=await read(page);const first=observed.state.shop.offers.find(o=>o.definitionId==='mantangcai');assert.ok(first);
   await buyOffer(page,first.offerId,touch);await idle(page,'shop');await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await idle(page,'game');
   observed=await read(page);const selected=['spades-6','clubs-14','hearts-6','hearts-14'];assert.ok(selected.every(id=>observed.state.handOrder.includes(id)));
   for(const id of selected)await tapUI(page,'game','card/'+id,touch);
   await tapUI(page,'game','action/play',touch);await waitScene(page,'intermission');await tapUI(page,'intermission','action/continue-stage',touch);await waitScene(page,'shop');await idle(page,'shop');
   observed=await read(page);const second=observed.state.shop.offers.find(o=>o.definitionId==='jiedongfeng');assert.ok(second);
   await buyOffer(page,second.offerId,touch);await idle(page,'shop');observed=await read(page);assert.equal(observed.state.jokers.length,2);
   const id=observed.state.jokers[1].instanceId,cdp=touch?await context.newCDPSession(page):undefined;
   if(touch){
    assert.ok(held.length,'natural second Joker thumbnail is delayed');
    const before=await read(page),original=await target(page,'shop',id,true),end=await slotPoint(page,'shop',0);
    await nativeDrag(page,cdp,true,'shop',id,end,{onHeld:async()=>{
     released=true;await Promise.all(held.splice(0).map(route=>route.continue()));
     await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').textures.exists('p08-joker-jiedongfeng'));
     const during=await target(page,'shop',id);assert.ok(during.same&&during.active&&during.pressedSame);assert.deepEqual(during.bounds,original.bounds);assert.deepEqual(await read(page),before);
     record.checks.push({label:'thumbnail update during natural long press retains hit object, gesture, geometry and full saved run',status:'PASS'});
    }});
    await assertMove(page,before,id,0,record,'shop long-press drag after thumbnail update');
   }else{
    const before=await read(page);await nativeDrag(page,cdp,false,'shop',id,await slotPoint(page,'shop',0));await assertMove(page,before,id,0,record,'shop mouse drag');
   }

   for(const key of ['shop','game']){
    if(key==='game'){await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await idle(page,'game');}
    await page.waitForFunction(key=>{const s=window.__harness.game.scene.getScene(key);return s.run.jokers.every(j=>s.textures.exists('p08-joker-'+j.definitionId));},key);
    for(const [from,to,label] of [[0,1,'右移'],[1,0,'左移']]){
     const before=await read(page),source=before.state.jokers[from].instanceId;
     await tapUI(page,key,'joker/'+source,touch);await page.locator('.detail-dialog[open]').waitFor();assert.deepEqual(await read(page),before,'short click/touch opens details without a command');
     await dom(page,label,touch);await assertMove(page,before,source,to,record,key+' detail '+label);await dom(page,'关闭',touch);await idle(page,key);
    }
    const before=await read(page),source=before.state.jokers[0].instanceId;
    await nativeDrag(page,cdp,touch,key,source,await slotPoint(page,key,1));await assertMove(page,before,source,1,record,key+(touch?' long-press drag':' mouse drag'));
    for(const kind of ['same-slot','empty-slot','outside-slot',...(touch?['pre-hold-move','native-cancel']:[])]){
     await idle(page,key);const stable=await read(page),id=stable.state.jokers[0].instanceId;
     const end=kind==='same-slot'?await point(page,key,'joker/'+id):kind==='empty-slot'?await slotPoint(page,key,3):kind==='outside-slot'?{x:1,y:(await slotPoint(page,key,0)).y}:await slotPoint(page,key,1);
     await nativeDrag(page,cdp,touch,key,id,end,{sameSlot:kind==='same-slot',preHold:kind==='pre-hold-move',cancel:kind==='native-cancel'});
     assert.equal(await page.locator('.detail-dialog[open]').count(),0);assert.deepEqual(await read(page),stable,'canceled/no-op gesture dispatches no command');
     record.checks.push({label:key+' '+kind,status:'PASS',seq:stable.state.commandSeq});
    }
    if(touch&&key==='game')await page.screenshot({path:dir+'/390-natural-owned-jokers.png',scale:'css'});
   }
   const saved=await read(page);await page.reload();await waitScene(page,'title');assert.deepEqual(await read(page),saved,'full persisted run and journal restore exactly');
   record.checks.push({label:'reload restores full order, RNG, gold, instance growth and journal',status:'PASS',seq:saved.state.commandSeq});await cdp?.detach();record.status='PASS';
  }finally{released=true;await Promise.all(held.splice(0).map(r=>r.continue().catch(()=>{})));await context.close();}
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);console.error(error);process.exitCode=1;}
finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
