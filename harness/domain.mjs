/** Real r2 workflow through buttons and dialogs; the observer never writes game state. */
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(root,process.env.DOMAIN_EVIDENCE_DIR||'shots/domain'),port=5202,base=`http://localhost:${port}/?harness=1`;
await mkdir(output,{recursive:true});
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const report={testedCommit:git('rev-parse','HEAD'),dirtyState:git('status','--porcelain=v1'),rulesVersion:'r2',runs:[],limitations:['Browser touchscreen emulation, not physical Android/iPhone or human acceptance.','One natural warm-stage workflow; not eight-chapter/Boss or balance acceptance.','Recovery/cancellation have their own R04 evidence; R05 layout remains separate.']};
const ssr=await createServer({root,server:{middlewareMode:true},appType:'custom'});
const domain=await ssr.ssrLoadModule('/src/domain/run.ts'),bot=await ssr.ssrLoadModule('/src/testing/r2Bot.ts');
const {RunController}=await ssr.ssrLoadModule('/src/application/RunController.ts');
let fixture;
for(let seed=1;seed<=50&&!fixture;seed++){
  const controller=new RunController(domain.createRun({seed:`r03-${seed}`,characterId:'erxiang',runId:'fixture',rulesVersion:'r2'}));let discarded=false;
  for(let step=0;step<20;step++){
    const state=controller.state,view=bot.publicR2View(state);
    if(state.phase==='shop'&&state.stageIndex===1){
      const common=view.offers.find(o=>o.price===4),remaining=view.offers.filter(o=>o.offerId!==common?.offerId).sort((a,b)=>a.price-b.price)[0];
      if(common&&remaining&&state.gold>=4&&state.gold-4+Math.max(1,Math.floor(state.jokers[0].paidPrice/2))>=remaining.price)fixture={seed:state.seed,commands:controller.journal,shopState:state};break;
    }
    const action=state.phase==='await-input'&&!discarded?{type:'DiscardHand',selectedIds:[view.hand[0].id]}:bot.chooseR2Action(view);
    if(!action)break;if(action.type==='DiscardHand')discarded=true;
    const result=controller.dispatch(action);assert.ok(result.ok,result.code);
  }
}
assert.ok(fixture,'natural workflow fixture with affordable replacement');
report.fixture={seed:fixture.seed,characterId:'erxiang',selection:'first of up to 50 natural seeds that permits the required buy/discard/clear/trade workflow; no injected cards/resources; not a win-rate sample'};
const scene=(page,key)=>page.waitForFunction(key=>window.__harness?.game.scene.getScene(key)?.scene.isActive(),key);
const read=page=>page.evaluate(async()=>{const {publicR2View}=await import('/src/testing/r2Bot.ts');const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,view:publicR2View(c.state)};});
async function click(page,touch,x,y){const point=await page.evaluate(({x,y})=>{const r=document.querySelector('canvas').getBoundingClientRect();return{x:r.left+x*r.width/1280,y:r.top+y*r.height/720};},{x,y});if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);}
async function perform(page,touch,observed,action,double=false){
  if(action.type==='BuyOffer'){
    const i=observed.view.offers.findIndex(o=>o.offerId===action.offerId);assert.ok(i>=0);await click(page,touch,167+i*274,445);
  }else if(action.type==='LeaveShop'){await click(page,touch,1108,624);await scene(page,'game');await page.waitForFunction(()=>window.__harness.game.registry.get('runController').state.phase==='await-input'&&window.__harness.game.scene.getScene('game').cardViews.length>0);}
  else if(action.type==='OpenShop'){await scene(page,'intermission');await click(page,touch,640,570);await scene(page,'shop');}
  else if(action.type==='ReorderJokers'){await click(page,touch,179,271);}
  else if(action.type==='SellJoker'){const i=observed.state.jokers.findIndex(j=>j.instanceId===action.instanceId);assert.ok(i>=0);await click(page,touch,117+i*164,271);}
  else if(['PlayHand','DiscardHand'].includes(action.type)){
    for(const id of action.selectedIds){const point=await page.evaluate(id=>{const v=window.__harness.game.scene.getScene('game').cardViews.find(v=>v.card.id===id);return{x:v.container.x,y:v.container.y};},id);await click(page,touch,point.x,point.y);}
    await click(page,touch,action.type==='PlayHand'?640:390,650);
    if(double)await click(page,touch,640,650);
    await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq,observed.state.commandSeq);
    const after=await read(page);assert.equal(after.state.commandSeq,observed.state.commandSeq+1,'one command per selected intent');
    if(action.type==='PlayHand')await page.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.getScene('intermission').scene.isActive()||(s.scene.isActive()&&!s.playing);});
  }else throw new Error(`unsupported user action ${action.type}`);
  await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq,observed.state.commandSeq);
  const after=await read(page);assert.ok(after.state.commandSeq>observed.state.commandSeq,`input submitted ${action.type}`);return after;
}
async function run(browser,name,viewport){
  const touch=name==='mobile',context=await browser.newContext({viewport,hasTouch:touch}),page=await context.newPage();
  const record={name,viewport,input:touch?'touchscreen.tap':'mouse.click',errors:[],dialogs:[],checkpoints:[]};report.runs.push(record);
  page.on('pageerror',error=>record.errors.push(String(error)));page.on('dialog',async dialog=>{record.dialogs.push({type:dialog.type(),message:dialog.message()});await dialog.accept();});
  try{
    await page.goto(`${base}&seed=${fixture.seed}`);await scene(page,'character-select');await click(page,touch,248,532);await scene(page,'shop');
    let discarded=false,doubled=false;
    for(let step=0;step<20;step++){
      const observed=await read(page);record.checkpoints.push({seq:observed.state.commandSeq,stateHash:domain.stateHash(observed.state)});
      if(observed.state.phase==='shop'&&observed.state.stageIndex===1)break;
      assert.notEqual(observed.state.phase,'run-lost');
      const action=observed.state.phase==='await-input'&&!discarded?{type:'DiscardHand',selectedIds:[observed.view.hand[0].id]}:bot.chooseR2Action(observed.view);
      assert.ok(action);const rapid=action.type==='PlayHand'&&!doubled;
      await perform(page,touch,observed,action,rapid);if(action.type==='DiscardHand'){discarded=true;await page.screenshot({path:path.join(output,`${name}-discard.png`)});}if(rapid)doubled=true;
      if((await read(page)).state.phase==='stage-cleared')await page.screenshot({path:path.join(output,`${name}-clear.png`)});
    }
    let observed=await read(page);assert.equal(observed.state.phase,'shop');assert.equal(observed.state.stageIndex,1);
    const original=observed.state.jokers[0].instanceId,common=observed.view.offers.find(o=>o.price===4);assert.ok(common);
    observed=await perform(page,touch,observed,{type:'BuyOffer',offerId:common.offerId});assert.equal(observed.state.jokers.length,2);
    const reverse=observed.state.jokers.map(j=>j.instanceId).reverse();observed=await perform(page,touch,observed,{type:'ReorderJokers',ids:reverse});assert.deepEqual(observed.state.jokers.map(j=>j.instanceId),reverse);
    observed=await perform(page,touch,observed,{type:'SellJoker',instanceId:original});assert.equal(observed.state.jokers.length,1);
    const replacement=observed.view.offers.filter(o=>o.price<=observed.state.gold).sort((a,b)=>a.price-b.price)[0];assert.ok(replacement);
    observed=await perform(page,touch,observed,{type:'BuyOffer',offerId:replacement.offerId});assert.equal(observed.state.jokers.length,2);
    assert.ok(record.dialogs.length>=4,'purchase and sell confirmations shown');await page.screenshot({path:path.join(output,`${name}-trade.png`)});
    let replay=domain.createRun({seed:observed.state.seed,characterId:observed.state.characterId,runId:observed.state.runId,rulesVersion:'r2'}),hashes=new Map([[replay.commandSeq,domain.stateHash(replay)]]);
    for(const command of observed.journal){const result=domain.applyCommand(replay,command);assert.ok(result.ok,result.code);replay=result.state;hashes.set(replay.commandSeq,domain.stateHash(replay));}
    assert.deepEqual(replay,observed.state);for(const checkpoint of record.checkpoints)assert.equal(hashes.get(checkpoint.seq),checkpoint.stateHash);
    record.commands=observed.journal;record.finalState=observed.state;record.stateHash=domain.stateHash(replay);record.status='PASS';assert.deepEqual(record.errors,[]);console.log(`${name}: r2 buy/discard/play/clear/reorder/sell/replace + exact replay PASS (${record.stateHash})`);
  }finally{await context.close();}
}
const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore',windowsHide:true});let browser;
try{const deadline=Date.now()+30000;while(true){try{if((await fetch(base)).ok)break;}catch{}if(Date.now()>deadline)throw new Error('browser server timeout');await new Promise(resolve=>setTimeout(resolve,200));}
  browser=await chromium.launch();report.browser=browser.version();await run(browser,'desktop',{width:1280,height:800});await run(browser,'mobile',{width:390,height:844});report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);console.error(error);process.exitCode=1;}
finally{await browser?.close();server.kill();await ssr.close();await writeFile(path.join(output,'domain-replay.json'),JSON.stringify(report,null,2)+'\n');console.log(`domain workflow: ${report.status}`);}
