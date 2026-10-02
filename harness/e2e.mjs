/** Built bundles, real browser inputs and independently checked economic outcomes. */
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {createServer as httpServer} from 'node:http';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium,firefox,webkit} from 'playwright';
import {openSelector,waitScene,point,tapUI,chooseCharacter,tapMenuAction,openMenuSection} from './ui.mjs';

const root=process.cwd(),dir=path.resolve(process.env.E2E_EVIDENCE_DIR||'shots/e2e');fs.mkdirSync(dir,{recursive:true});
const engines={chromium,firefox,webkit},selected=(process.env.E2E_BROWSERS||'chromium,firefox,webkit').split(','),scope=process.env.E2E_SCENARIO||'all';
assert.ok(selected.length&&new Set(selected).size===selected.length&&selected.every(e=>engines[e]),'valid E2E_BROWSERS');
assert.ok(['all','reward','touch','assets'].includes(scope),'valid E2E_SCENARIO');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const report={testedCommit:git('rev-parse','HEAD'),dirtyState:git('status','--porcelain=v1'),scope,engines:selected,environment:{os:process.platform,node:process.version},checks:[],limitations:['Browser touchscreen emulation; physical Android Chrome / iPhone Safari and human/art acceptance NOT_RUN.','This harness covers warm-stage transactions, failure and resource fallback; two-chapter/Boss/skip/item paths are checked by test:v00:browser. Eight chapters and endless remain later work.','Cold-load performance, long-session memory and full screen-reader acceptance NOT_RUN.']};
const mark=record=>{report.checks.push(record);console.log(`${record.engine}/${record.name}: ${record.status}`);};
let active,ssr,production,test,domain,bot,characters;
const build=(mode,outDir)=>{
  const result=spawnSync(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'build',...(mode?['--mode',mode]:[]),'--outDir',outDir],{cwd:root,stdio:'inherit',windowsHide:true});
  assert.equal(result.status,0,`${mode||'production'} bundle build`);
  report.bundles??=[];report.bundles.push({mode:mode||'production',outDir,files:fs.readdirSync(path.join(root,outDir,'assets')).filter(n=>/\.(js|css)$/.test(n)).map(name=>{const bytes=fs.readFileSync(path.join(root,outDir,'assets',name));return {name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};})});
};
async function serve(directory){
  const absolute=path.resolve(directory),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json'};
  const server=httpServer((request,response)=>{
    try{
      let pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);if(pathname.startsWith('/dachoupai/'))pathname=pathname.slice('/dachoupai'.length);
      if(pathname.endsWith('/'))pathname+='index.html';const file=path.resolve(absolute,'.'+pathname);
      if(!file.startsWith(absolute+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);response.end('not found');return;}
      response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);
    }catch{response.writeHead(400);response.end('bad request');}
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
const read=page=>page.evaluate(()=>{const c=window.__harness?.game.registry.get('runController');return c?{state:c.state,journal:c.journal,status:c.status}:null;});
const dom=async(page,name,touch)=>{const button=page.getByRole('button',{name,exact:true});if(touch)await button.tap();else await button.click();};
const advance=(page,seq)=>page.waitForFunction(seq=>window.__harness.game.registry.get('runController')?.state.commandSeq>seq,seq);
async function menu(page,touch){const b=page.getByRole('button',{name:'菜单',exact:true});if(await b.getAttribute('aria-expanded')!=='true')await page.locator('.run-menu-toggle')[touch?'tap':'click']();}
async function settings(page,touch,speed='4'){
  const before=await read(page);await openMenuSection(page,'settings',touch);await page.getByLabel('演出速度').selectOption(speed);await page.getByLabel('背景音量',{exact:true}).press('Home');await page.getByLabel('音效音量',{exact:true}).press('Home');await page.locator('.run-menu-toggle')[touch?'tap':'click']();
  assert.deepEqual(await read(page),before,'presentation settings do not consume commands or RNG');
}
async function idle(page){await page.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||(g.scene.isActive('game')&&!s.playing&&s.cardViews.length>0);});}
async function perform(page,touch,action,{double=false,interrupt=false,rotate=false}={}){
  const before=await read(page),view=bot.publicR2View(before.state);
  if(action.type==='BuyOffer'){
    const offer=view.offers.find(o=>o.offerId===action.offerId);assert.ok(offer);
    await tapUI(page,'shop','offer/'+action.offerId,touch);const b=page.getByRole('button',{name:'确认购买',exact:true});
    if(double){const box=await b.boundingBox();assert.ok(box);for(let i=0;i<2;i++)if(touch)await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await page.mouse.click(box.x+box.width/2,box.y+box.height/2);}
    else await dom(page,'确认购买',touch);
    await advance(page,before.state.commandSeq);await page.locator('dialog[open]').waitFor({state:'detached'});
    const after=await read(page);assert.equal(after.state.commandSeq,before.state.commandSeq+1,'one purchase per double intent');assert.equal(after.state.gold,before.state.gold-offer.price,'purchase deducts actual price once');
  }else if(action.type==='LeaveShop'){
    await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.registry.get('runController').state.phase==='await-input'&&window.__harness.game.scene.getScene('game').cardViews.length===8);
    assert.equal((await read(page)).state.commandSeq,before.state.commandSeq+2,'LeaveShop then EnterStage');
  }else if(action.type==='OpenShop'){
    await waitScene(page,'intermission');await tapUI(page,'intermission','action/continue-stage',touch);await waitScene(page,'shop');await advance(page,before.state.commandSeq);
  }else if(action.type==='SellJoker'){
    const owned=before.state.jokers.find(j=>j.instanceId===action.instanceId);await tapUI(page,'shop','joker/'+action.instanceId,touch);await dom(page,'出售',touch);await dom(page,'确认出售',touch);await advance(page,before.state.commandSeq);await page.locator('dialog[open]').waitFor({state:'detached'});
    assert.equal((await read(page)).state.gold,before.state.gold+Math.max(1,Math.floor(owned.paidPrice/2)),'sale uses paid price');
  }else if(action.type==='ReorderJokers'){
    await tapUI(page,'shop','joker/'+before.state.jokers[0].instanceId,touch);await dom(page,'右移',touch);await advance(page,before.state.commandSeq);await dom(page,'关闭',touch);assert.deepEqual((await read(page)).state.jokers.map(j=>j.instanceId),action.ids);
  }else if(action.type==='RerollShop'){
    await tapUI(page,'shop','action/reroll',touch);await advance(page,before.state.commandSeq);assert.equal((await read(page)).state.gold,before.state.gold-Math.min(10,2+before.state.shop.rerollCount),'paid reroll');
  }else if(['PlayHand','DiscardHand'].includes(action.type)){
    for(const id of action.selectedIds)await tapUI(page,'game','card/'+id,touch);
    const target=action.type==='PlayHand'?'action/play':'action/discard',p=await point(page,'game',target);
    for(let i=0;i<(double?2:1);i++)if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
    await advance(page,before.state.commandSeq);const committed=await read(page);assert.equal(committed.state.commandSeq,before.state.commandSeq+1,'one hand per double intent');
    if(action.type==='PlayHand'){
      assert.equal(committed.state.stage.handsLeft,before.state.stage.handsLeft-1);
      if(committed.state.phase==='stage-cleared'){
        const expected=[4,5,7][before.state.stageIndex%3]+committed.state.stage.handsLeft+Math.min(5,Math.floor(before.state.gold/5));
        assert.equal(committed.state.stage.goldEarned,expected,'independent contractual reward (base + unused hands + prior-gold interest)');assert.equal(committed.state.gold,before.state.gold+expected,'reward is granted once');
      }
      if(interrupt){
        await menu(page,touch);await dom(page,'保存并退出',touch);await openSelector(page);assert.deepEqual((await read(page)).state,committed.state,'exiting presentation preserves already committed result');
        await menu(page,touch);await dom(page,'继续本局',touch);await idle(page);assert.deepEqual((await read(page)).state,committed.state,'continue cannot re-award');
      }else if(rotate){
        await page.setViewportSize({width:844,height:390});await idle(page);assert.deepEqual((await read(page)).state,committed.state,'rotation cannot rescore');await page.setViewportSize({width:390,height:844});
      }else{await tapMenuAction(page,'快进当前手',touch);await idle(page);assert.deepEqual((await read(page)).state,committed.state,'fast forward cannot rescore');}
    }else{assert.equal(committed.state.stage.discardsLeft,before.state.stage.discardsLeft-1);assert.equal(committed.state.stage.handsLeft,before.state.stage.handsLeft);}
  }else throw Error('unsupported UI action '+action.type);
  return read(page);
}
async function restart(page,touch){const before=await read(page);await page.reload();await openSelector(page);assert.deepEqual(await read(page),before,'reload restores full state and journal');await menu(page,touch);assert.equal(await page.getByLabel('演出速度').inputValue(),'4');assert.equal(await page.getByLabel('背景音量',{exact:true}).inputValue(),'0');assert.equal(await page.getByLabel('音效音量',{exact:true}).inputValue(),'0');await dom(page,'继续本局',touch);await waitScene(page,before.state.phase==='shop'?'shop':'game');}
async function scenario(browser,engine,name,callback,{touch=false,fault=null,prefix='/'}={}){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},hasTouch:touch,deviceScaleFactor:touch?2:1}),page=await context.newPage();page.setDefaultTimeout(12000);
  const record={engine,name,input:touch?'touchscreen.tap + native DOM tap':'mouse.click + native DOM click',prefix,status:'IN_PROGRESS',errors:[],assetResponses:[],failedRequests:[]};active={context,page,record};
  page.on('pageerror',e=>record.errors.push(String(e)));page.on('response',r=>{if(new URL(r.url()).pathname.includes('/assets/'))record.assetResponses.push({url:new URL(r.url()).pathname,status:r.status()});});page.on('requestfailed',r=>record.failedRequests.push({url:new URL(r.url()).pathname,error:r.failure()?.errorText}));page.on('dialog',d=>d.accept());
  if(fault==='audio-denied')await context.addInitScript(()=>{window.AudioContext=class{constructor(){throw new DOMException('audio denied','NotAllowedError');}};});
  if(fault==='404'||fault==='timedout')await page.route('**/assets/p00/characters/amo.avatar.webp',route=>fault==='404'?route.fulfill({status:404,body:'missing'}):route.abort('timedout'));
  await context.tracing.start({screenshots:true,snapshots:true});
  try{
    await callback(page,record,`${test.url}${prefix}?harness=1`,touch);assert.deepEqual(record.errors,[],'no page errors');
    if(!fault){assert.deepEqual(record.failedRequests,[],'normal resource requests succeed');assert.ok(record.assetResponses.every(r=>r.status===200),'normal asset paths resolve');}
    record.status='PASS';mark(record);await context.tracing.stop();
  }catch(error){record.status='FAIL';record.error=String(error);record.observation=await read(page).catch(()=>null);mark(record);await page.screenshot({path:path.join(dir,`${engine}-${name}-failure.png`)}).catch(()=>{});await context.tracing.stop({path:path.join(dir,`${engine}-${name}-trace.zip`)}).catch(()=>{});throw error;}
  finally{await context.close();active=null;}
}
function fixture(characterId){
  for(let seed=1;seed<=50;seed++){
    const state=domain.createRun({seed:`r03-${seed}`,characterId,runId:'fixture',rulesVersion:'r2'});const c=new domainController(state);let discarded=false;
    for(let step=0;step<24;step++){
      if(c.state.phase==='shop'&&c.state.stageIndex===1)return {seed:c.state.seed,characterId};
      const view=bot.publicR2View(c.state),action=c.state.phase==='await-input'&&!discarded?{type:'DiscardHand',selectedIds:[view.hand[0].id]}:bot.chooseR2Action(view);if(!action)break;if(action.type==='DiscardHand')discarded=true;assert.ok(c.dispatch(action).ok);
    }
  }throw Error('no natural warm-stage fixture for '+characterId);
}
let domainController;
async function workflow(page,record,url,touch,fixture){
  await page.goto(url+'&seed='+fixture.seed);await openSelector(page);
  for(const character of characters){await tapUI(page,'character-select','character/'+character.id,touch);await tapUI(page,'character-select','action/character-details',touch);assert.ok((await page.locator('dialog').textContent()).includes(character.passiveDescription));await dom(page,'关闭',touch);}
  await chooseCharacter(page,fixture.characterId,touch);await settings(page,touch);const checkpoints=[];let discarded=false,doubled=false,interrupted=false;
  for(let step=0;step<24;step++){
    const before=await read(page),state=before.state;checkpoints.push({seq:state.commandSeq,hash:domain.stateHash(state)});if(state.phase==='shop'&&state.stageIndex===1)break;
    assert.notEqual(state.phase,'run-lost','natural warm stage');const view=bot.publicR2View(state),action=state.phase==='await-input'&&!discarded?{type:'DiscardHand',selectedIds:[view.hand[0].id]}:bot.chooseR2Action(view);assert.ok(action);
    const hand=action.type==='PlayHand',interrupt=hand&&!interrupted;
    await perform(page,touch,action,{double:action.type==='BuyOffer'||hand&&!doubled,interrupt});
    if(action.type==='BuyOffer'){
      const after=await read(page),unaffordable=bot.publicR2View(after.state).offers.find(o=>o.price>after.state.gold);
      if(unaffordable){
        // This is a new inspection after the intentional double-confirm. Allow the
        // 350ms modal-dismiss click-through guard to finish before its next intent.
        await page.waitForTimeout(360);await tapUI(page,'shop','offer/'+unaffordable.offerId,touch);assert.equal(await page.getByRole('button',{name:'确认购买',exact:true}).isDisabled(),true);assert.ok((await page.locator('dialog').textContent()).includes('金币不足'));await dom(page,'取消',touch);assert.deepEqual(await read(page),after,'insufficient gold does not submit a purchase');
      }
    }
    if(action.type==='DiscardHand')discarded=true;if(hand){doubled=true;interrupted=true;}
  }
  let observed=await read(page);assert.equal(observed.state.phase,'shop');assert.equal(observed.state.stageIndex,1);record.warmReward=observed.state.stage.goldEarned;
  const offer=bot.publicR2View(observed.state).offers.find(o=>o.price<=observed.state.gold);assert.ok(offer);await perform(page,touch,{type:'BuyOffer',offerId:offer.offerId},{double:true});observed=await read(page);
  assert.ok(observed.state.jokers.length>=2);await perform(page,touch,{type:'ReorderJokers',ids:[observed.state.jokers[1].instanceId,observed.state.jokers[0].instanceId,...observed.state.jokers.slice(2).map(j=>j.instanceId)]});
  while((await read(page)).state.jokers.length)await perform(page,touch,{type:'SellJoker',instanceId:(await read(page)).state.jokers[0].instanceId});
  await perform(page,touch,{type:'RerollShop'});await restart(page,touch);await perform(page,touch,{type:'LeaveShop'});await restart(page,touch);await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length===8);
  const beforeDetails=await read(page),id=beforeDetails.state.handOrder[0];await tapUI(page,'game','card/'+id,touch);await tapUI(page,'game','card/'+id,touch);assert.deepEqual(await read(page),beforeDetails,'select/cancel does not consume state');
  await tapMenuAction(page,'查看牌组',touch);assert.ok((await page.locator('dialog').textContent()).includes('剩余'));await dom(page,'关闭',touch);assert.deepEqual(await read(page),beforeDetails,'deck inspection is read-only');
  for(let hand=0;hand<4;hand++){const before=await read(page);assert.equal(before.state.phase,'await-input');await perform(page,touch,{type:'PlayHand',selectedIds:[before.state.handOrder[0]]},{double:hand===0,rotate:touch&&hand===0});}
  observed=await read(page);assert.equal(observed.state.phase,'run-lost');assert.equal(observed.state.outcome.reason,'hands-exhausted');assert.equal(observed.state.stage.handsLeft,0);assert.equal(observed.state.stage.goldEarned,0,'loss gives no clear reward');
  let replay=domain.createRun({seed:observed.state.seed,characterId:observed.state.characterId,runId:observed.state.runId,rulesVersion:'r2'});const hashes=new Map([[replay.commandSeq,domain.stateHash(replay)]]);
  for(const command of observed.journal){const result=domain.applyCommand(replay,command);assert.ok(result.ok,result.code);replay=result.state;hashes.set(replay.commandSeq,domain.stateHash(replay));}assert.deepEqual(replay,observed.state);for(const checkpoint of checkpoints)assert.equal(hashes.get(checkpoint.seq),checkpoint.hash);
  record.seed=fixture.seed;record.characterId=fixture.characterId;record.commands=observed.journal;record.finalHash=domain.stateHash(replay);record.outcome=observed.state.outcome;record.viewport=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio}));
  await tapUI(page,'intermission','action/continue-stage',touch);await openSelector(page);assert.equal((await read(page)).state.runId,observed.state.runId,'loss restart leaves the previous save until a new choice');
}
try{
  // Own both build directories, so another local build cannot replace the served files.
  build(null,'shots/build-production');build('e2e','shots/build-e2e');production=await serve('shots/build-production');test=await serve('shots/build-e2e');
  ssr=await createServer({root,cacheDir:path.join(root,'shots/e2e-ssr-cache'),optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:'custom'});domain=await ssr.ssrLoadModule('/src/domain/run.ts');bot=await ssr.ssrLoadModule('/src/testing/r2Bot.ts');({RunController:domainController}=await ssr.ssrLoadModule('/src/application/RunController.ts'));({CHARACTERS:characters}=await ssr.ssrLoadModule('/src/game/characters.ts'));
  const fixtures=scope==='all'?[fixture('amo'),fixture('erxiang')]:scope==='reward'?[fixture('amo')]:[];report.fixtures={selection:'first natural seeds among at most 50, through public bot and shared commands; no card/resource injection, not a win-rate sample',runs:fixtures};
  for(const engine of selected){
    const browser=await engines[engine].launch();report.environment[engine]=browser.version();
    try{
      await scenario(browser,engine,'production-observer-hidden',async(page,record)=>{await page.goto(production.url+'/dachoupai/?harness=1');await page.getByRole('button',{name:'菜单',exact:true}).waitFor();await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.avatar.webp')).length===6);assert.equal(await page.evaluate(()=>typeof window.__harness),'undefined','production query must not expose the test observer');const avatars=record.assetResponses.filter(r=>r.url.endsWith('.avatar.webp'));assert.equal(avatars.length,6,'all six production avatars resolve');assert.ok(avatars.every(r=>r.url.startsWith('/dachoupai/assets/p00/characters/')),'subdirectory assets use the registered base');assert.ok(!record.assetResponses.some(r=>/\.(png|glb)$/.test(r.url)),'source portraits and GLB are not startup downloads');});
      if(scope==='all'||scope==='reward')for(const f of fixtures)await scenario(browser,engine,'workflow-'+f.characterId,(p,r,u,t)=>workflow(p,r,u,t,f),{touch:f.characterId==='erxiang',prefix:f.characterId==='erxiang'?'/dachoupai/':'/'});
      if(scope==='all'||scope==='touch')await scenario(browser,engine,'touch-entry',async(page,record,url,touch)=>{await page.goto(url+'&seed=r03-1');await chooseCharacter(page,'amo',touch);await perform(page,touch,{type:'LeaveShop'});const state=(await read(page)).state;await perform(page,touch,{type:'DiscardHand',selectedIds:[state.handOrder[0]]});record.commandSeq=(await read(page)).state.commandSeq;},{touch:true,prefix:'/dachoupai/'});
      if(scope==='all'||scope==='assets')for(const fault of ['404','timedout','audio-denied'])await scenario(browser,engine,'fallback-'+fault,async(page,record,url,touch)=>{await page.goto(url+'&seed=r03-1');await chooseCharacter(page,'amo',touch);await perform(page,touch,{type:'LeaveShop'});if(fault!=='audio-denied')assert.equal(await page.evaluate(()=>window.__harness.game.textures.exists('avatar-amo')),false,'failed image uses the letter fallback');const state=(await read(page)).state;await perform(page,touch,{type:'PlayHand',selectedIds:[state.handOrder[0]]});record.commandSeq=(await read(page)).state.commandSeq;},{touch:true,fault,prefix:'/dachoupai/'});
    }finally{await browser.close();}
  }report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);console.error(error);process.exitCode=1;}
finally{await active?.context.close().catch(()=>{});await ssr?.close();await production?.close();await test?.close();fs.writeFileSync(path.join(dir,'e2e.json'),JSON.stringify(report,null,2)+'\n');console.log(`built-bundle E2E: ${report.status}; ${report.checks.length} actual scenarios (${scope})`);}
