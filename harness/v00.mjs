/** Graybox checks use built bundles and ordinary mouse/touch/DOM inputs only. */
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {createServer as createViteServer} from 'vite';
import {openSelector,waitScene,tapUI,chooseCharacter} from './ui.mjs';

const root=process.cwd(),dir=path.resolve(process.env.V00_EVIDENCE_DIR||'shots/v00-ui'),out=path.join(root,'shots/build-v00');
fs.mkdirSync(dir,{recursive:true});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',cwd:root}).trim();
const report={testedCommit:git('rev-parse','HEAD'),dirtyState:git('status','--porcelain=v1'),checks:[],limitations:['Physical Android Chrome / iPhone Safari and human/art acceptance NOT_RUN.']};
const engines={chromium,firefox,webkit},selected=(process.env.V00_BROWSERS||'chromium').split(',');
assert.ok(selected.length&&new Set(selected).size===selected.length&&selected.every(e=>engines[e]));
const scope=process.env.V00_SCENARIO||'all';assert.ok(['all','chapter','runs','items'].includes(scope));report.scope=scope;
let domain,publicView,policy,rules,ssr;
const read=page=>page.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal};});
const dom=async(page,name,touch)=>{const b=page.getByRole('button',{name,exact:true});if(touch)await b.tap();else await b.click();};
const advance=(page,seq)=>page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq,seq);
const texts=(page,key)=>page.evaluate(key=>{const walk=list=>list.flatMap(o=>[...(typeof o.text==='string'?[o.text]:[]),...(o.list?walk(o.list):[])]);return walk(window.__harness.game.scene.getScene(key).children.list).join('\n');},key);
async function rackFits(page){
  const original=page.viewportSize();await page.setViewportSize({width:360,height:800});
  try{await page.waitForFunction(()=>window.__harness.game.scale.width===360);
    const labels=await page.evaluate(()=>{const bounds=o=>{const b=o.getBounds();return {x:b.x,y:b.y,right:b.right,bottom:b.bottom};};return [...window.__harness.game.scene.getScene('game').jokerViews.values()].map(v=>{const slot=v.getData('frame'),name=v.getData('nameLabel'),value=v.getData('valueLabel');return {slot:bounds(slot),name:bounds(name),value:bounds(value),text:value.text};});});
    for(const l of labels){for(const b of [l.name,l.value])assert.ok(b.x>=l.slot.x&&b.right<=l.slot.right+1&&b.bottom<=l.slot.bottom+1,'360px equipped-card label stays inside its slot: '+JSON.stringify(l));assert.ok(l.name.bottom<=l.value.y,'equipped-card name and full value cannot overlap: '+JSON.stringify(l));}
  }finally{await page.setViewportSize(original);await page.waitForFunction(w=>window.__harness.game.scale.width===w,original.width);}
}
async function menu(page,touch){if(await page.getByRole('button',{name:'菜单',exact:true}).getAttribute('aria-expanded')!=='true')await dom(page,'菜单',touch);}
async function restore(page,touch,key){const before=await read(page);await page.reload();await openSelector(page);assert.deepEqual(await read(page),before,'reload restores complete checkpoint');await menu(page,touch);await dom(page,'继续本局',touch);await waitScene(page,key);assert.deepEqual(await read(page),before,'continuing cannot change score or RNG');}
async function chapterSkip(page,touch,url){
  await page.goto(url+'&seed=v00-ui-minimal');await chooseCharacter(page,'erxiang',touch);
  const before=await read(page);await tapUI(page,'shop','action/chapter',touch);
  const forecast=page.getByRole('dialog',{name:'本章节目',exact:true});await forecast.waitFor();
  const body=await forecast.innerText();for(const target of ['400','600','800'])assert.ok(body.includes(target),'public chapter targets');assert.ok(body.includes(before.state.boss.definitionId),'public fixed Boss');
  assert.deepEqual(await read(page),before,'inspection is not a command');
  await dom(page,'跳过本场',touch);await page.getByRole('dialog',{name:'跳场确认',exact:true}).waitFor();await dom(page,'确认跳场',touch);await advance(page,before.state.commandSeq);await waitScene(page,'intermission');
  const warm=await read(page);assert.equal(warm.state.commandSeq,before.state.commandSeq+1);assert.equal(warm.state.gold,before.state.gold);assert.equal(warm.state.purchaseCoupons,1);assert.equal(warm.state.stage.goldEarned,0);assert.equal(warm.state.stage.skipResult.kind,'coupon');assert.match(await texts(page,'intermission'),/跳过/);
  await restore(page,touch,'intermission');await tapUI(page,'intermission','action/continue-stage',touch);await waitScene(page,'shop');
  const normal=await read(page);await tapUI(page,'shop','action/chapter',touch);await dom(page,'跳过本场',touch);await dom(page,'确认跳场',touch);await advance(page,normal.state.commandSeq);await waitScene(page,'intermission');
  const item=await read(page);assert.equal(item.state.gold,normal.state.gold);assert.equal(item.state.consumables.length,1);assert.equal(item.state.consumables[0].definitionId,before.state.chapterSkipConsumable);assert.equal(item.state.stage.goldEarned,0);assert.equal(item.state.stage.clearId,null);
  await tapUI(page,'intermission','action/continue-stage',touch);await waitScene(page,'shop');await tapUI(page,'shop','action/chapter',touch);assert.equal(await page.getByRole('button',{name:'跳过本场',exact:true}).isDisabled(),true,'Boss cannot skip');await dom(page,'关闭',touch);
  await tapUI(page,'shop','action/items',touch);await page.getByRole('dialog',{name:'局内物品',exact:true}).waitFor();await dom(page,'关闭',touch);await restore(page,touch,'shop');
  return {status:'PASS',name:'chapter-skip-public-ui',input:touch?'touchscreen.tap + native DOM tap':'mouse.click + native DOM click',journal:(await read(page)).journal};
}
const itemNames={T01:'练一招',T03:'红桃染',T04:'方片染',T05:'梅花染',T06:'黑桃染',T17:'再想想'};
async function idle(page){await page.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||(g.scene.isActive('game')&&!s.playing&&s.cardViews.length>0);});}
async function inputs(page,touch,action){
  const before=(await read(page)).state;
  if(action.type==='BuyOffer'){await tapUI(page,'shop','offer/'+action.offerId,touch);await dom(page,'确认购买',touch);}
  else if(action.type==='SellJoker'){await tapUI(page,'shop','joker/'+action.instanceId,touch);await dom(page,'出售',touch);await dom(page,'确认出售',touch);}
  else if(action.type==='RerollShop')await tapUI(page,'shop','action/reroll',touch);
  else if(action.type==='LeaveShop'){await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.registry.get('runController').state.phase==='await-input'&&window.__harness.game.scene.getScene('game').cardViews.length===8);}
  else if(action.type==='OpenShop'){await waitScene(page,'intermission');await tapUI(page,'intermission','action/continue-stage',touch);await waitScene(page,'shop');}
  else if(action.type==='ReorderJokers'){
    // Native adjacent moves are ordinary commands, even when the policy proposes one permutation.
    for(let i=0;i<action.ids.length;i++){let current=(await read(page)).state,from=current.jokers.findIndex(j=>j.instanceId===action.ids[i]);while(from>i){await tapUI(page,'shop','joker/'+action.ids[i],touch);await dom(page,'左移',touch);await advance(page,current.commandSeq);await dom(page,'关闭',touch);current=(await read(page)).state;from--;}}
    assert.deepEqual((await read(page)).state.jokers.map(j=>j.instanceId),action.ids);
  }else if(['PlayHand','DiscardHand'].includes(action.type)){
    for(const id of action.selectedIds)await tapUI(page,'game','card/'+id,touch);
    const predicted=action.type==='PlayHand'?await page.evaluate(()=>window.__harness.game.scene.getScene('game').preview().possibleScores):null;
    await tapUI(page,'game',action.type==='PlayHand'?'action/play':'action/discard',touch);await advance(page,before.commandSeq);
    const after=(await read(page)).state;
    if(action.type==='PlayHand'){
      assert.equal(after.lastTrace.finalScore,predicted[0],'visible preview uses the same gold/discard/Boss context as commit');assert.equal(after.stage.handsLeft,before.stage.handsLeft-1);
      if(['stage-cleared','run-won'].includes(after.phase)){const expected=[4,5,7][before.stageIndex%3]+after.stage.handsLeft+Math.min(5,Math.floor(before.gold/5))+2*before.jokers.filter(j=>j.definitionId==='e01').length;assert.equal(after.stage.goldEarned,expected,'independent successful reward');assert.equal(after.gold,before.gold+expected);}
      if(await page.evaluate(()=>!!window.__harness.game.scene.getScene('game').presentation))await tapUI(page,'game','action/forward',touch);await idle(page);
    }else{const refund=before.stage.discardsUsed===0&&before.jokers.some(j=>j.definitionId==='d05')?1:0;assert.equal(after.stage.discardsLeft,Math.min(3,before.stage.discardsLeft-rules.r2DiscardCost(before)+refund));assert.equal(after.stage.discardsUsed,before.stage.discardsUsed+1);}
  }else throw Error('unsupported ordinary UI action '+action.type);
  await advance(page,before.commandSeq);
  if(!['PlayHand','DiscardHand','LeaveShop','OpenShop'].includes(action.type))await page.locator('dialog[open]').waitFor({state:'detached'});
  const after=(await read(page)).state;if(action.type!=='ReorderJokers')assert.equal(after.commandSeq,before.commandSeq+(action.type==='LeaveShop'?2:1));
  return after;
}
async function fullRun(page,touch,url,fixture,engine){
  const {style,seed,characterId}=fixture;await page.goto(url+'&seed='+seed);await chooseCharacter(page,characterId,touch);await menu(page,touch);await page.getByLabel('演出速度').selectOption('4');await page.getByLabel('静音',{exact:true}).check();await dom(page,'菜单',touch);
  const checkpoints=[],bosses=[],observations=[],restored=new Set();let fullSlot=false;
  for(let step=0;step<180;step++){
    const observed=await read(page),s=observed.state;checkpoints.push({seq:s.commandSeq,hash:domain.stateHash(s)});assert.notEqual(s.phase,'run-lost','selected natural representative must still finish');if(s.phase==='run-won')break;
    if(s.phase==='shop'&&s.stageIndex%3===2&&!restored.has('boss-'+s.stageIndex)){await tapUI(page,'shop','action/chapter',touch);assert.ok((await page.getByRole('dialog').innerText()).includes(s.boss.definitionId));assert.equal(await page.getByRole('button',{name:'跳过本场',exact:true}).isDisabled(),true);await dom(page,'关闭',touch);await restore(page,touch,'shop');restored.add('boss-'+s.stageIndex);}
    const action=policy(publicView(s),style);assert.ok(action);
    if(action.type==='SellJoker'&&s.jokers.length===5){const offer=publicView(s).offers.find(o=>o.price<=s.gold);assert.ok(offer);await tapUI(page,'shop','offer/'+offer.offerId,touch);assert.equal(await page.getByRole('button',{name:'确认购买',exact:true}).isDisabled(),true);assert.match(await page.getByRole('dialog').innerText(),/先.*出售/);assert.deepEqual(await read(page),observed,'full-slot purchase inspection cannot silently replace');await dom(page,'取消',touch);fullSlot=true;}
    const next=await inputs(page,touch,action);observations.push({action,seq:next.commandSeq,stage:s.stageIndex,goldBefore:s.gold,goldAfter:next.gold,score:action.type==='PlayHand'?next.lastTrace.finalScore:null,discardsLeft:next.stage?.discardsLeft});
    if(action.type==='LeaveShop')await rackFits(page);
    if(action.type==='LeaveShop'&&next.stageIndex%3===2){
      bosses.push(next.boss);const cards=await page.evaluate(()=>window.__harness.game.scene.getScene('game').cardViews.map(v=>({id:v.card.id,mark:v.scoringMark.text,visible:v.scoringMark.visible})));
      for(const id of next.stage.disabledIds){const card=cards.find(c=>c.id===id);assert.ok(card.visible&&card.mark==='失效','Boss-disabled cards need a visible persistent mark');}
      await tapUI(page,'game','action/details',touch);assert.ok((await page.getByRole('dialog').innerText()).includes(next.boss.definitionId));await dom(page,'关闭',touch);await page.screenshot({path:path.join(dir,`${engine}-${style}-boss-${next.stageIndex}.png`)});
    }
    if(action.type==='PlayHand'&&!restored.has('growth')&&next.jokers.some(j=>Object.values(j.growth).some(f=>BigInt(f.n)>0n))){await restore(page,touch,next.phase==='await-input'?'game':'intermission');restored.add('growth');}
    if(action.type==='BuyOffer'&&!restored.has('buy')){await restore(page,touch,'shop');restored.add('buy');}
  }
  const final=await read(page);assert.equal(final.state.phase,'run-won');assert.equal(final.state.outcome.reason,'graybox-complete');assert.equal(final.state.stageIndex,6);assert.equal(new Set(bosses.map(b=>b.definitionId)).size,2);await waitScene(page,'intermission');assert.match(await texts(page,'intermission'),/两章试玩完成/);await restore(page,touch,'intermission');await page.screenshot({path:path.join(dir,engine+'-'+style+'-complete.png')});
  let replay=domain.createRun({runId:final.state.runId,seed,characterId,rulesVersion:'r2'});const hashes=new Map([[replay.commandSeq,domain.stateHash(replay)]]);for(const c of final.journal){const r=domain.applyCommand(replay,c);assert.ok(r.ok,r.code);replay=r.state;hashes.set(replay.commandSeq,domain.stateHash(replay));}assert.deepEqual(replay,final.state);for(const c of checkpoints)assert.equal(hashes.get(c.seq),c.hash);
  return {status:'PASS',name:'two-chapters-'+style,style,seed,characterId,input:touch?'touchscreen.tap + native DOM tap':'mouse.click + native DOM click',restored:[...restored,'completion'],fullSlotReplacement:fullSlot,bosses,checkpoints,observations,journal:final.journal,stateHash:domain.stateHash(final.state)};
}
async function itemUse(page,touch,url,fixture){
  await page.goto(url+'&seed='+fixture.seed);await chooseCharacter(page,'amo',touch);
  for(let i=0;i<2;i++){const s=(await read(page)).state;await tapUI(page,'shop','action/chapter',touch);await dom(page,'跳过本场',touch);await dom(page,'确认跳场',touch);await advance(page,s.commandSeq);await waitScene(page,'intermission');await tapUI(page,'intermission','action/continue-stage',touch);await waitScene(page,'shop');}
  let before=(await read(page)).state;assert.equal(before.consumables[0].definitionId,fixture.id);const dye=['T03','T04','T05','T06'].includes(fixture.id);
  if(!dye){await tapUI(page,'shop','action/items',touch);await dom(page,itemNames[fixture.id]+' · 查看',touch);assert.equal(await page.getByRole('button',{name:'确认使用',exact:true}).isDisabled(),true,'unlearned upgrade and out-of-stage discard restore need a clear disabled state');await dom(page,'关闭',touch);assert.deepEqual((await read(page)).state,before);}
  if(!dye){await inputs(page,touch,{type:'LeaveShop'});before=(await read(page)).state;
    if(fixture.id==='T01')await inputs(page,touch,{type:'PlayHand',selectedIds:[before.handOrder[0]]});else await inputs(page,touch,{type:'DiscardHand',selectedIds:[before.handOrder[0]]});
  }
  before=(await read(page)).state;if(dye)await tapUI(page,'shop','action/items',touch);else{await tapUI(page,'game','action/details',touch);await dom(page,'查看物品',touch);}await dom(page,itemNames[fixture.id]+' · 查看',touch);
  let targets=[];if(dye){const suit={T03:'hearts',T04:'diamonds',T05:'clubs',T06:'spades'}[fixture.id];assert.equal(await page.getByRole('button',{name:'确认使用',exact:true}).isDisabled(),true,'empty dye selection cannot submit');const same=before.deckInstances.find(c=>c.suit===suit).id,sameBox=page.getByRole('checkbox',{name:same,exact:true});await sameBox.tap();assert.equal(await page.getByRole('button',{name:'确认使用',exact:true}).isDisabled(),true,'unchanged dye target cannot consume');await sameBox.tap();targets=before.deckInstances.filter(c=>c.suit!==suit).slice(0,3).map(c=>c.id);for(const id of targets){const checkbox=page.getByRole('checkbox',{name:id,exact:true});if(touch)await checkbox.tap();else await checkbox.check();}}else if(fixture.id==='T01')await page.getByLabel('升级牌型').selectOption('high-card');
  await dom(page,'确认使用',touch);await advance(page,before.commandSeq);await page.locator('dialog[open]').waitFor({state:'detached'});const after=(await read(page)).state;assert.equal(after.consumables.length,0);assert.deepEqual(after.rng,before.rng,'item use does not draw or reroll');
  if(dye)for(const id of targets)assert.equal(after.deckInstances.find(c=>c.id===id).suit,{T03:'hearts',T04:'diamonds',T05:'clubs',T06:'spades'}[fixture.id]);else if(fixture.id==='T01')assert.equal(after.handLevels['high-card'],2);else{assert.equal(after.stage.discardsLeft,before.stage.discardsLeft+1);assert.equal(after.stage.discardsUsed,before.stage.discardsUsed);}
  await restore(page,touch,dye?'shop':'game');return {status:'PASS',name:'usable-skip-'+fixture.id,seed:fixture.seed,selection:'First public chapter reward of this type among seeds v00-item-0..99; no injected inventory.',journal:(await read(page)).journal};
}
let server,browser,page;
try{
  ssr=await createViteServer({root,cacheDir:path.join(root,'shots/v00-ui-ssr-cache'),optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:'custom'});
  domain=await ssr.ssrLoadModule('/src/domain/run.ts');({publicR2View:publicView}=await ssr.ssrLoadModule('/src/testing/r2Bot.ts'));({chooseV00Action:policy}=await ssr.ssrLoadModule('/src/testing/v00Bot.ts'));rules=await ssr.ssrLoadModule('/src/domain/r2Run.ts');
  const itemFixtures=[];for(let i=0;i<100&&itemFixtures.length<6;i++){const seed='v00-item-'+i,s=domain.createRun({seed,characterId:'amo',runId:'fixture',rulesVersion:'r2'}),id=s.chapterSkipConsumable;if(!itemFixtures.some(f=>f.id===id))itemFixtures.push({seed,id});}assert.equal(itemFixtures.length,6);
  const sample=fs.existsSync(path.join(root,'shots/v00-sample/natural-report.json'))?'shots/v00-sample/natural-report.json':'docs/production/evidence/v00-2026-10-01/natural-report.json';
  let fixtures=scope==='all'||scope==='runs'?JSON.parse(fs.readFileSync(path.join(root,sample),'utf8')).representatives:[];assert.ok(!fixtures.length||fixtures.length===3);
  if(process.env.V00_STYLE){assert.ok(['groups','suit','single-held'].includes(process.env.V00_STYLE));fixtures=fixtures.filter(f=>f.style===process.env.V00_STYLE);assert.equal(fixtures.length,1,'one recorded public-policy representative');}
  const build=spawnSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build','--mode','e2e','--outDir',out],{cwd:root,stdio:'inherit',windowsHide:true});assert.equal(build.status,0,'built graybox bundle');
  server=createServer((req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p.startsWith('/dachoupai/'))p=p.slice('/dachoupai'.length);if(p.endsWith('/'))p+='index.html';const file=path.resolve(out,'.'+p);if(!file.startsWith(out+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.json':'application/json'};res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);}catch{res.writeHead(400);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/dachoupai/?harness=1`;
  for(const engine of selected){browser=await engines[engine].launch({headless:true});report.browsers??={};report.browsers[engine]=browser.version();
    const cases=[...((scope==='all'||scope==='chapter')?[{name:'chapter-skip-public-ui',run:p=>chapterSkip(p,true,url)}]:[]),...fixtures.map(f=>({name:'two-chapters-'+f.style,run:p=>fullRun(p,f.style!=='groups',url,f,engine),touch:f.style!=='groups'})),...((scope==='all'||scope==='items')?itemFixtures.map(f=>({name:'usable-skip-'+f.id,run:p=>itemUse(p,true,url,f)})):[])];
    for(const scenario of cases){
    const touch=scenario.touch??true,context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},hasTouch:touch,deviceScaleFactor:touch?2:1});page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    try{const check=await scenario.run(page);assert.deepEqual(errors,[]);report.checks.push({engine,...check});console.log(engine+'/'+check.name+': PASS');}
    catch(error){console.error(engine+'/'+scenario.name+': '+String(error));report.checks.push({engine,name:scenario.name,status:'FAIL',error:String(error),errors,observation:await read(page).catch(()=>null)});await page.screenshot({path:path.join(dir,engine+'-'+scenario.name+'-failure.png')}).catch(()=>{});throw error;}
    finally{await context.close();}
    }await browser.close();browser=null;
  }report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);console.error(error);process.exitCode=1;}
finally{await browser?.close();await ssr?.close();if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(dir,'v00-ui.json'),JSON.stringify(report,null,2)+'\n');console.log('graybox browser: '+report.status);}
