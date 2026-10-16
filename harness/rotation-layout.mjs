import assert from 'node:assert/strict';
import {preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tapUI,openSelector,waitScene} from './ui.mjs';
const phase=process.env.ROTATION_PHASE??'after',out=process.env.ROTATION_OUTPUT??'shots/rotation/'+phase;
await mkdir(out,{recursive:true});
const server=await preview({build:{outDir:process.env.ROTATION_BUILD_DIR??'shots/rotation/build'},preview:{host:'127.0.0.1',port:5597,strictPort:true},logLevel:'error'});
const browser=await chromium.launch();
const p=await browser.newPage({viewport:{width:390,height:740},hasTouch:true,reducedMotion:'reduce'});
const sources=['src/game/CharacterSelectScene.ts','src/game/OpeningShowcaseLayout.ts','src/game/SelectionLayout.ts','src/game/ShopScene.ts','src/game/ShopLayout.ts','src/game/ShopArt.ts'];
const report={phase,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),node:process.version,platform:process.platform,sourceHashes:Object.fromEntries(await Promise.all(sources.map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')]))),cases:[],errors:[]};p.on('pageerror',e=>report.errors.push(String(e)));
const snapshot=()=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return c?{state:c.state,journal:c.journal,storage:await c.store.read()}:null;});
async function nativePanel(label){await p.waitForTimeout(380);const info=await p.locator('dialog[open]').evaluate(d=>{const c=getComputedStyle(d),r=getComputedStyle(document.documentElement);return {class:d.className,box:d.getBoundingClientRect().toJSON(),height:c.height,maxHeight:c.maxHeight,top:c.top,bottom:c.bottom,margin:c.margin,safeTop:r.getPropertyValue('--safe-top'),safeBottom:r.getPropertyValue('--safe-bottom'),buttons:[...d.querySelectorAll('.dialog-actions button,.dialog-close')].map(b=>({text:b.textContent,box:b.getBoundingClientRect().toJSON()}))};});for(const b of info.buttons){assert.ok(b.box.height>=44);assert.ok(b.box.y>=parseFloat(info.safeTop)&&b.box.bottom<=p.viewportSize().height-parseFloat(info.safeBottom));}(report.panels??=[]).push({label,...info});await p.screenshot({path:out+'/'+label+'.png'});}
const overlaps=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
async function resize(width,height,safe={}){await p.evaluate(s=>{for(const k of ['top','bottom','left','right'])document.documentElement.style.setProperty('--safe-'+k,(s[k]??0)+'px');},safe);await p.setViewportSize({width:width+1,height});await p.setViewportSize({width,height});await p.waitForTimeout(500);}
async function capture(scene,label){
 const info=await p.evaluate(key=>{const s=window.__harness.game.scene.getScene(key),texts=[],targets=[];const walk=list=>{for(const o of list){if(o.visible===false)continue;const b=o.getBounds?.();if(o.type==='Text')texts.push({name:o.name,text:o.text,x:b.x,y:b.y,width:b.width,height:b.height});if(o.input?.enabled)targets.push({name:o.name,x:b.x,y:b.y,width:b.width,height:b.height});if(o.list)walk(o.list);}};walk(s.view.root.list);return {viewport:{width:innerWidth,height:innerHeight},selected:s.selectedId,route:s.selectedRoute,mode:s.modeConfig,geometry:key==='shop'?s.geometry():null,texts,targets};},scene);
 await p.screenshot({path:out+'/'+label+'.png'});report.cases.push({label,...info});return info;
}
try{
 await p.goto('http://127.0.0.1:5597/?harness=1',{waitUntil:'domcontentloaded'});await openSelector(p,true);
 await tapUI(p,'character-select','character/azao',true);
 for(const [w,h,s] of [[390,740,{}],[740,320,{top:24,bottom:20,left:44,right:12}],[568,320,{top:24,bottom:20,left:44,right:12}],[740,300,{top:24,bottom:20,left:44,right:12}],[320,568,{top:24,bottom:34}],[1366,768,{}]]){await resize(w,h,s);await capture('character-select',w+'x'+h+'-hero');
  if(phase==='after'&&(h<=320||w===320))for(const id of ['amo','touye','laohuan','erxiang','azao','xiemu']){
   await tapUI(p,'character-select','character/'+id,true);const row=await capture('character-select',w+'x'+h+'-'+id);
   const facts=row.texts.filter(t=>['opening/name','opening/skill-tag','opening/skill-hook','opening/skill-conditions'].includes(t.name));
   for(const f of facts)for(const target of row.targets)assert.ok(!overlaps(f,target),'fact/action overlap '+JSON.stringify({label:row.viewport,f,target}));
   for(let i=0;i<facts.length;i++)for(let j=i+1;j<facts.length;j++)assert.ok(!overlaps(facts[i],facts[j]),'fact overlap');
   for(const t of row.targets){assert.ok(t.width>=44&&t.height>=44,'44px '+JSON.stringify(t));assert.ok(t.x>=(s.left??0)&&t.x+t.width<=w-(s.right??0)+1&&t.y>=0&&t.y+t.height<=h-(s.bottom??0)+1,'safe target '+JSON.stringify(t));}
  }
 }
 await tapUI(p,'character-select','character/azao',true);
 if(phase==='after'){
  await tapUI(p,'character-select','action/select-mode',true);const checkbox=p.locator('dialog[open] input[type=checkbox]');if(await checkbox.count())await checkbox.last().uncheck();await p.getByRole('button',{name:'使用此模式',exact:true}).tap();await p.waitForTimeout(380);
  const before=await capture('character-select','choice-before-rotation');await tapUI(p,'character-select','opening/hero-details',true);await p.locator('.hero-story summary').tap();await resize(740,320,{top:24,bottom:20,left:44,right:12});await p.screenshot({path:out+'/story-rotated.png'});await p.keyboard.press('Escape');await p.waitForTimeout(380);const after=await capture('character-select','choice-after-rotation');assert.equal(after.selected,before.selected);assert.deepEqual(after.mode,before.mode);
  await tapUI(p,'character-select','opening/portrait-full',true);await p.locator('.hero-portrait-view[open] .dialog-portrait').waitFor();await resize(320,568,{top:24,bottom:34});await p.screenshot({path:out+'/full-portrait-rotated.png'});await p.keyboard.press('Escape');await p.waitForTimeout(380);assert.equal((await p.evaluate(()=>window.__harness.game.scene.getScene('character-select').selectedId)),before.selected);
 }
 await tapUI(p,'character-select','action/confirm-character',true);await tapUI(p,'character-select','route/group',true);
 await resize(740,320,{top:24,bottom:20,left:44,right:12});await capture('character-select','740x320-route');
 await resize(390,740);await tapUI(p,'character-select','action/confirm-character',true);await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(450);
 for(const [w,h,s] of [[390,740,{}],[740,320,{top:24,bottom:20,left:44,right:12}],[568,320,{top:24,bottom:20,left:44,right:12}],[740,300,{top:24,bottom:20,left:44,right:12}],[320,568,{top:24,bottom:34}],[1366,768,{}]]){await resize(w,h,s);const row=await capture('shop',w+'x'+h+'-shop');if(phase==='after'){
  for(const t of row.targets){assert.ok(t.width>=44&&t.height>=44,'shop touch '+JSON.stringify(t));assert.ok(t.x>=(s.left??0)-1&&t.x+t.width<=w-(s.right??0)+1&&t.y>=0&&t.y+t.height<=h-(s.bottom??0)+1,'shop safe '+JSON.stringify(t));}
  for(const offer of row.targets.filter(t=>t.name.startsWith('offer/')))for(const action of row.targets.filter(t=>['action/start-stage','action/reroll','action/build'].includes(t.name)))assert.ok(!overlaps(offer,action),'shop stock/action overlap');
 }}
 if(phase==='after'){
  await resize(568,320,{top:24,bottom:20,left:44,right:12});const original=await snapshot();assert.equal(original.state.characterId,'azao');assert.equal(original.state.programsEnabled,false);await tapUI(p,'shop','action/shelf-page',true);const lastOffer=original.state.shop.offers[2].offerId;await tapUI(p,'shop','offer/'+lastOffer,true);await resize(390,740);await p.screenshot({path:out+'/offer-detail-rotated.png'});await p.keyboard.press('Escape');await p.waitForTimeout(350);assert.deepEqual(await snapshot(),original);
  await resize(740,320,{top:24,bottom:20,left:44,right:12});
  await tapUI(p,'shop','action/tool-inventory',true);if(await p.getByRole('button',{name:'选购工具',exact:true}).isVisible())await p.getByRole('button',{name:'选购工具',exact:true}).tap();
  await p.locator('[data-make-id="T11"]').tap();await resize(320,568,{top:24,bottom:34});await p.screenshot({path:out+'/purchase-rotated.png'});assert.deepEqual(await snapshot(),original);
  await p.getByRole('button',{name:/^买来使用/}).tap();await p.locator('.tool-purchased-destination[open]').waitFor();const bought=await snapshot();assert.equal(bought.state.commandSeq,original.state.commandSeq+1);const gained=bought.state.consumables.find(c=>!original.state.consumables.some(o=>o.instanceId===c.instanceId));assert.ok(gained);
  await resize(740,320,{top:24,bottom:20,left:44,right:12});await p.screenshot({path:out+'/destination-rotated.png'});await p.getByRole('button',{name:'带入牌桌 · 选手牌',exact:true}).tap();await waitScene(p,'game');await p.locator('.tool-detail[open]').waitFor();
  const entered=await snapshot();assert.equal(entered.state.commandSeq,bought.state.commandSeq+2);await p.locator('.tool-card-option input').first().check();await resize(320,568,{top:24,bottom:34});await p.getByRole('button',{name:'查看预览',exact:true}).tap();await p.screenshot({path:out+'/target-preview-rotated.png'});
  await p.keyboard.press('Escape');await p.waitForTimeout(350);assert.deepEqual(await snapshot(),entered);await tapUI(p,'game','action/tool-inventory',true);await p.locator('[data-item-id="'+gained.instanceId+'"]').tap();await p.locator('.tool-card-option input').first().check();await p.getByRole('button',{name:'查看预览',exact:true}).tap();await p.getByRole('button',{name:'确认使用',exact:true}).tap();
  await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq,entered.state.commandSeq+1);const used=await snapshot();assert.ok(!used.state.consumables.some(c=>c.instanceId===gained.instanceId));await resize(740,320,{top:24,bottom:20,left:44,right:12});await p.screenshot({path:out+'/saved-result-rotated.png'});await p.getByRole('button',{name:'回到牌桌',exact:true}).tap();await p.waitForTimeout(380);await p.screenshot({path:out+'/returned-table.png'});
  await tapUI(p,'game','hero/azao-charge',true);await p.getByRole('button',{name:'查看本场技能操作',exact:true}).tap();await nativePanel('skill-landscape');await resize(320,568,{top:24,bottom:34});await nativePanel('skill-portrait');await p.keyboard.press('Escape');await p.waitForTimeout(350);assert.deepEqual(await snapshot(),used);
  report.flow={naturalNewRun:true,boughtInstance:gained,commands:used.journal.slice(original.journal.length).map(c=>c.action.type),cancelPreservedState:true};
  assert.deepEqual(report.flow.commands,['BuyBasicTool','LeaveShop','EnterStage','UseConsumable']);
  await p.reload({waitUntil:'domcontentloaded'});await waitScene(p,'title');await tapUI(p,'title','action/title-continue',true);await waitScene(p,'game');await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').ready);assert.deepEqual(await snapshot(),used);assert.equal(await p.locator('.tool-detail[open]').count(),0);report.flow.coldRestored=true;
 }
 assert.deepEqual(report.errors,[]);report.status=phase==='after'?'PASS':'CAPTURED';
}catch(e){report.error=e.stack;report.status='FAIL';process.exitCode=1;await p.screenshot({path:out+'/FAIL.png'});}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(report.status,report.error??'');await browser.close();await new Promise(r=>server.httpServer.close(r));}
