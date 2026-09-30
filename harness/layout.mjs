import {waitScene,point,tapUI,chooseCharacter,buyOffer} from './ui.mjs';
/** Actual CSS-size observations and pointer workflows; never writes run state. */
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),dir=path.resolve(process.env.LAYOUT_EVIDENCE_DIR||'shots/layout'),port=5205,url=`http://localhost:${port}/?harness=1&seed=r05-layout`;
await mkdir(dir,{recursive:true});
const report={inputTrace:[],testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirtyState:execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'}).trim(),checks:[],limitations:['Chromium touchscreen emulation; physical Android/iPhone acceptance NOT_RUN.']};
const read=page=>page.evaluate(()=>{const c=window.__harness.game.registry.get('runController'),g=window.__harness.game.scene.getScene('game');return{state:c.state,selected:[...g.selectedIds],presenting:!!g.presentation};});
async function metricsFor(page,key){return page.evaluate(key=>{
  const game=window.__harness.game,s=game.scene.getScene(key),rect=game.canvas.getBoundingClientRect(),sx=rect.width/game.scale.width,sy=rect.height/game.scale.height,texts=[],hits=[];
  const walk=list=>{for(const o of list){if(o.type==='Text')texts.push({text:o.text,font:parseFloat(o.style.fontSize)*sy,resolution:o.style.resolution});if(o.name?.startsWith('action/')||o.name?.startsWith('card/')||o.name?.startsWith('character/')||o.name?.startsWith('joker/')){
    const b=o.getBounds(),area=o.input?.hitArea,world=o.getWorldTransformMatrix();let p={x:b.x,y:b.y},w=b.width,h=b.height;if(area){p=world.transformPoint(area.x-o.displayOriginX,area.y-o.displayOriginY);w=area.width;h=area.height;}
    hits.push({name:o.name,x:rect.left+p.x*sx,y:rect.top+p.y*sy,width:w*sx,height:h*sy,enabled:!!o.input?.enabled});
  }if(o.list)walk(o.list);}};walk(s.children.list);return{viewport:{width:innerWidth,height:innerHeight},dpr:devicePixelRatio,scrollY,canvas:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},texts,hits};
},key);}
async function checkScene(page,key,name){const metrics=await metricsFor(page,key),failures=[];
  if(metrics.texts.some(t=>t.font<14))failures.push('body-below-14-css-px');
  for(const h of metrics.hits){const min=h.name.startsWith('card/')?36:['action/play','action/discard','action/start-stage'].includes(h.name)?48:44;if(h.width<min-.01||h.height<44-.01)failures.push('small-target:'+h.name);if(h.x<metrics.canvas.left-.1||h.y<metrics.canvas.top-.1||h.x+h.width>metrics.canvas.left+metrics.canvas.width+.1||h.y+h.height>metrics.canvas.top+metrics.canvas.height+.1)failures.push('outside-canvas:'+h.name);}
  const intersect=(a,b)=>a.x<b.x+b.width-.01&&b.x<a.x+a.width-.01&&a.y<b.y+b.height-.01&&b.y<a.y+a.height-.01;
  for(let i=0;i<metrics.hits.length;i++)for(let j=i+1;j<metrics.hits.length;j++)if(intersect(metrics.hits[i],metrics.hits[j]))failures.push('overlapping-targets:'+metrics.hits[i].name+'|'+metrics.hits[j].name);
  report.checks.push({name,status:failures.length?'FAIL':'PASS',metrics,failures});assert.deepEqual(failures,[],name);
}
async function advanced(page,seq){await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq,seq);}
async function gesture(page,key,name,{cancel=false,to,hold=0}={}){
  const cdp=await page.context().newCDPSession(page),start=await point(page,key,name),target=to?await point(page,key,to):start;
  const send=async(type,p)=>{const touchPoints=['touchEnd','touchCancel'].includes(type)?[]:[{x:p.x,y:p.y,id:1,radiusX:2,radiusY:2,force:1}];await cdp.send('Input.dispatchTouchEvent',{type,touchPoints});report.inputTrace.push({type,target:name,x:p.x,y:p.y,at:new Date().toISOString()});};
  await send('touchStart',start);if(hold)await page.waitForTimeout(hold);if(to)await send('touchMove',target);await send(cancel?'touchCancel':'touchEnd',target);await cdp.detach();
}
async function fresh(character){const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>{throw e;});await page.goto(url.replace('r05-layout','r03-651'));await chooseCharacter(page,character,true);return{context,page};}
async function touchWorkflow(){
  const {context,page}=await fresh('erxiang');try{
    let before=(await read(page)).state,offer=before.shop.offers.find(o=>o.definitionId==='mantangcai');
    await gesture(page,'shop','offer/'+offer.offerId,{hold:410});await page.getByRole('dialog').waitFor();assert.deepEqual((await read(page)).state,before,'long press never purchases');
    const detail=await page.getByRole('dialog').textContent();await page.setViewportSize({width:844,height:390});assert.equal(await page.getByRole('dialog').textContent(),detail,'confirmation survives rotation');assert.deepEqual((await read(page)).state,before);
    await page.getByRole('button',{name:'确认购买',exact:true}).tap();await advanced(page,before.commandSeq);assert.equal((await read(page)).state.gold,2);
    await page.setViewportSize({width:390,height:844});await tapUI(page,'shop','action/start-stage',true);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length===8);
    const state=(await read(page)).state,ids=state.handOrder;
    const views=await page.evaluateHandle(()=>{const g=window.__harness.game.scene.getScene('game');return{hud:g.heatText,card:g.cardViews[0].container};});
    await tapUI(page,'game','card/'+ids[0],true);
    assert.ok(await page.evaluate(old=>old.hud===window.__harness.game.scene.getScene('game').heatText,views),'selection must preserve the HUD rather than recreate the entire stage');
    assert.ok(await page.evaluate(old=>old.card===window.__harness.game.scene.getScene('game').cardViews[0].container,views),'selection updates the existing card view');
    await tapUI(page,'game','card/'+ids[0],true);await views.dispose();
    report.checks.push({name:'touch/selection-preserves-stage-and-card-views',status:'PASS'});
    for(const id of ids.slice(0,6))await tapUI(page,'game','card/'+id,true);
    assert.equal((await read(page)).selected.length,5);assert.ok(await page.evaluate(()=>window.__harness.game.scene.getScene('game').statusMessage.includes('最多选择 5')));
    assert.deepEqual((await read(page)).state,state);let selection=(await read(page)).selected;
    await gesture(page,'game','card/'+ids[6],{cancel:true});assert.deepEqual((await read(page)).selected,selection,'pointercancel leaves selection/resources');
    await gesture(page,'game','card/'+ids[0],{hold:410});await page.getByRole('dialog').waitFor();assert.deepEqual((await read(page)).selected,selection,'long press does not toggle');await page.getByRole('button',{name:'关闭',exact:true}).tap();
    await page.setViewportSize({width:844,height:390});assert.deepEqual((await read(page)).selected,selection);assert.deepEqual((await read(page)).state,state);await checkScene(page,'game','rotated-table');
    await page.setViewportSize({width:390,height:844});await gesture(page,'game','card/'+ids[0],{to:'card/'+ids[1]});await advanced(page,state.commandSeq);let after=(await read(page)).state;assert.deepEqual(after.rng,state.rng);assert.equal(after.gold,state.gold);assert.deepEqual((await read(page)).selected,selection);assert.equal(after.handOrder[1],ids[0]);
    for(const action of ['action/sort-rank','action/sort-suit']){before=(await read(page)).state;const hud=await page.evaluateHandle(()=>window.__harness.game.scene.getScene('game').heatText);await tapUI(page,'game',action,true);await advanced(page,before.commandSeq);after=(await read(page)).state;assert.deepEqual(after.rng,before.rng);assert.deepEqual((await read(page)).selected,selection);assert.ok(await page.evaluate(old=>old===window.__harness.game.scene.getScene('game').heatText,hud),'sorting redraws only the hand');await hud.dispose();}
    await tapUI(page,'game','action/deck',true);await page.getByLabel('牌组范围').selectOption('all');await page.getByLabel('增强筛选').selectOption('enhanced');assert.ok((await page.getByRole('dialog').textContent()).includes('不展示抽牌顺序'));await page.getByRole('button',{name:'关闭',exact:true}).tap();
    // The natural pair of aces wins the warm stage. Selection only is UI state.
    for(const id of (await read(page)).selected)await tapUI(page,'game','card/'+id,true);for(const id of ['clubs-14','hearts-14'])await tapUI(page,'game','card/'+id,true);
    assert.ok(await page.evaluate(()=>window.__harness.game.scene.getScene('game').cardViews.filter(v=>v.container.getData('activeScoring')).length===2));await page.screenshot({path:path.join(dir,'touch-pair-preview.png')});
    before=(await read(page)).state;await tapUI(page,'game','action/play',true);await advanced(page,before.commandSeq);await waitScene(page,'intermission');assert.equal((await read(page)).state.lastTrace.finalScore,'514');
    await tapUI(page,'intermission','action/continue-stage',true);await waitScene(page,'shop');before=(await read(page)).state;offer=before.shop.offers.find(o=>!o.consumed&&o.price===4);await buyOffer(page,offer.offerId,true);await advanced(page,before.commandSeq);
    before=(await read(page)).state;const [first,second]=before.jokers;await gesture(page,'shop','joker/'+first.instanceId,{to:'joker/'+second.instanceId,hold:410});await advanced(page,before.commandSeq);after=(await read(page)).state;
    assert.equal(after.gold,before.gold);assert.deepEqual(after.jokers.map(j=>j.instanceId),[second.instanceId,first.instanceId]);assert.ok(after.receipts.at(-1).commandId);assert.equal(after.commandSeq,before.commandSeq+1,'drag is reorder only');
    await tapUI(page,'shop','joker/'+first.instanceId,true);await page.getByRole('button',{name:'出售',exact:true}).tap();await page.getByRole('dialog',{name:'出售确认'}).waitFor();await page.getByRole('button',{name:'关闭',exact:true}).tap();assert.deepEqual((await read(page)).state,after,'cancel sale preserves inventory and gold');
    await page.screenshot({path:path.join(dir,'touch-reordered-build.png')});report.checks.push({name:'touch/select-limit-cancel-longpress-sort-deck-rotate-drag-confirm',status:'PASS',input:'touchscreen.tap and Chromium Input.dispatchTouchEvent',finalSeq:after.commandSeq,score:'514'});
  }catch(error){report.failureObservation=await read(page);await page.screenshot({path:path.join(dir,'layout-failure.png')});throw error;}finally{await context.close();}
}
async function characterStates(){
  for(const character of ['touye','xiemu','amo']){
    const {context,page}=await fresh(character);try{
      await tapUI(page,'shop','action/start-stage',true);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length===8);
      if(character==='touye'){
        const before=(await read(page)).state;await tapUI(page,'game','action/details',true);await page.getByRole('button',{name:'押注本手',exact:true}).tap();await advanced(page,before.commandSeq);assert.ok((await page.getByRole('dialog').textContent()).includes('50%'));assert.ok((await read(page)).state.stage.wagerSelected);assert.deepEqual((await read(page)).state.rng,before.rng);await page.getByRole('button',{name:'关闭',exact:true}).tap();
        await tapUI(page,'game','card/'+(await read(page)).state.handOrder[0],true);assert.ok(await page.evaluate(()=>window.__harness.game.scene.getScene('game').breakdownText.text.includes('50%')));await page.screenshot({path:path.join(dir,'touch-wager-preview.png')});
      }else if(character==='xiemu'){
        const hud=await page.evaluateHandle(()=>window.__harness.game.scene.getScene('game').heatText);
        for(let i=0;i<3;i++){const before=(await read(page)).state;await tapUI(page,'game','card/'+before.handOrder[0],true);await tapUI(page,'game','action/play',true);await advanced(page,before.commandSeq);await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing);assert.ok(await page.evaluate(old=>old===window.__harness.game.scene.getScene('game').heatText,hud),'dealing the next hand preserves the stage');}
        await hud.dispose();
        assert.equal((await read(page)).state.stage.handsLeft,1);await tapUI(page,'game','action/details',true);assert.ok((await page.getByRole('dialog').textContent()).includes('当前为最后一手'));await page.screenshot({path:path.join(dir,'touch-last-hand.png')});
      }else{
        const empty=(await read(page)).state;await tapUI(page,'game','action/play',true);assert.deepEqual((await read(page)).state,empty,'zero selection cannot play');await page.locator('canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');assert.equal((await read(page)).selected.length,1);await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'关闭',exact:true}).click();await page.keyboard.press('Space');
        for(const id of (await read(page)).selected)await tapUI(page,'game','card/'+id,true);
        const before=(await read(page)).state;await tapUI(page,'game','card/'+before.handOrder[0],true);await tapUI(page,'game','action/play',true);await advanced(page,before.commandSeq);await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').presentation);const committed=(await read(page)).state;
        await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing);assert.deepEqual((await read(page)).state,committed,'presentation resize never replays a command');await page.setViewportSize({width:390,height:844});assert.deepEqual((await read(page)).state,committed);
      }
      report.checks.push({name:'state/'+character,status:'PASS'});
    }finally{await context.close();}
  }
}
const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--mode','e2e','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore',windowsHide:true});let browser,activePage;
try{
  const deadline=Date.now()+30000;while(true){try{if((await fetch(url)).ok)break;}catch{}if(Date.now()>deadline)throw Error('layout server timeout');await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch();report.browser=browser.version();
  for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[844,390],[1024,768],[1280,720],[768,1024]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,deviceScaleFactor:2}),page=await context.newPage(),requests=[];
    activePage=page;page.on('request',r=>{if(r.url().includes('/assets/'))requests.push(r.url());});
    await page.goto(url);await page.waitForFunction(()=>window.__harness?.game.scene.isActive('character-select'));
    const metrics=await metricsFor(page,'character-select');
    const failures=[];if(metrics.canvas.height<height*.9)failures.push('canvas-letterbox');if(metrics.texts.some(t=>t.font<14))failures.push('body-below-14-css-px');if(metrics.hits.some(h=>h.width<44||h.height<44))failures.push('secondary-target-below-44-css-px');if(requests.some(r=>/characters\/[^/]+\.png/.test(r)))failures.push('original-png-first-load');
    report.checks.push({name:`select/${width}x${height}`,status:failures.length?'FAIL':'PASS',metrics,assetRequests:requests,failures});await page.screenshot({path:path.join(dir,`select-${width}x${height}.png`)});
    if(!failures.length){
      await chooseCharacter(page,'amo',true);await page.screenshot({path:path.join(dir,`shop-${width}x${height}.png`)});await checkScene(page,'shop',`shop/${width}x${height}`);
      await tapUI(page,'shop','action/start-stage',true);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length===8);
      await checkScene(page,'game',`table/${width}x${height}`);await page.screenshot({path:path.join(dir,`table-${width}x${height}.png`)});
    }
    await context.close();
  }
  assert.ok(report.checks.every(c=>c.status==='PASS'),'actual CSS/font/target/first-load contract');await touchWorkflow();await characterStates();report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);if(activePage&&!activePage.isClosed()){report.failureObservation=await activePage.evaluate(()=>({scrollY,bodyScroll:document.body.scrollTop,bodyHeight:document.body.clientHeight,bodyScrollHeight:document.body.scrollHeight,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON(),scaleBounds:window.__harness.game.scale.canvasBounds,state:window.__harness.game.registry.get('runState'),dialog:document.querySelector('dialog')?.textContent}));await activePage.screenshot({path:path.join(dir,'layout-failure.png')});}process.exitCode=1;}
finally{await browser?.close();server.kill();await writeFile(path.join(dir,'layout.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.map(x=>({name:x.name,status:x.status,failures:x.failures})),error:report.error},null,2));}
