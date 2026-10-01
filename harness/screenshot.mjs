/** Short player path in a compiled bundle. Observers are read-only; inputs are real. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {build,preview} from 'vite';
import {waitScene,tapUI,point} from './ui.mjs';
const root=process.cwd(),port=Number(process.env.SHOT_PORT||5199),outDir=path.join(root,'shots/smoke-build'),verify=process.argv.includes('--verify-smoke');
const saveScreens=!verify||process.env.SMOKE_SHOTS==='1';
const engines={chromium,firefox,webkit},selected=(process.env.SMOKE_BROWSERS||'chromium').split(',');
assert.ok(selected.length&&new Set(selected).size===selected.length&&selected.every(e=>engines[e]),'known distinct smoke engines');
const profiles={desktop:{width:1280,height:720},wide:{width:1920,height:1080},mobile:{width:390,height:740},shortmobile:{width:360,height:640},landscape:{width:844,height:390}},selectedProfiles=(process.env.SHOT_PROFILES||'desktop,mobile').split(',');
assert.ok(selectedProfiles.length&&new Set(selectedProfiles).size===selectedProfiles.length&&selectedProfiles.every(p=>profiles[p]),'known distinct viewport profiles');
const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),checks:[],physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN'};
const state=page=>page.evaluate(()=>window.__harness.game.registry.get('runController').state);
const next=(page,seq)=>page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq&&window.__harness.game.registry.get('runController').status==='idle',seq);
const ready=page=>page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&!s.playing&&s.cardViews.length>0;});
const dom=async(page,name,touch)=>{const b=page.getByRole('button',{name,exact:true});if(touch)await b.tap();else await b.click();};
await mkdir('shots',{recursive:true});
await build({mode:'e2e',build:{outDir,emptyOutDir:true},logLevel:'warn'});
const server=await preview({build:{outDir},preview:{port,strictPort:true,host:'127.0.0.1'}}),base=`http://127.0.0.1:${port}/?harness=1&seed=p00-core-ui`;
let browser,activePage;
try {
  for(const engine of selected){
  browser=await engines[engine].launch(engine==='chromium'&&process.env.SMOKE_CHROMIUM_CHANNEL?{channel:process.env.SMOKE_CHROMIUM_CHANNEL}:{});
  for(const name of process.env.SMOKE_FEEDBACK==='only'?[]:selectedProfiles){
    const viewport=profiles[name],touch=['mobile','shortmobile','landscape'].includes(name),deviceScaleFactor=touch?3:1,recordVideo=process.env.SHOT_VIDEO==='1'&&engine===selected[0]&&name==='desktop';
    const context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor,...(recordVideo?{recordVideo:{dir:'shots/p00-video',size:viewport}}:{})}),page=await context.newPage(),errors=[];activePage=page;page.on('pageerror',e=>{errors.push(String(e));console.error(e.stack);});
    await page.goto(base);await waitScene(page,'title');
    const density=await page.locator('canvas').evaluate(c=>c.width/c.getBoundingClientRect().width);
    assert.ok(density>=Math.min(deviceScaleFactor,2),'high-density phone must not magnify a one-pixel canvas');
    const menu=page.locator('.run-menu-toggle'),anchor=await menu.boundingBox();await dom(page,'菜单',touch);
    const opened=await menu.boundingBox();assert.equal(opened.x,anchor.x,'menu anchor stays fixed when opened');assert.equal(opened.y,anchor.y,'menu anchor stays fixed vertically');
    if(touch)await menu.tap();else await menu.click();
    let fullscreen='NOT_RUN';
    if(touch&&await page.evaluate(()=>document.fullscreenEnabled)){
      const full=page.locator('.run-fullscreen-toggle');await full.tap();await page.waitForFunction(()=>document.fullscreenElement===document.documentElement);
      assert.equal(await full.getAttribute('aria-pressed'),'true');await full.tap();await page.waitForFunction(()=>document.fullscreenElement===null);fullscreen='PASS (browser API; physical toolbar/orientation NOT_RUN)';
    }
    await tapUI(page,'title','action/title-start',touch);await waitScene(page,'character-select');
    const count=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select');const walk=list=>list.reduce((n,o)=>n+(o.name.startsWith('character/')?1:0)+(o.list?walk(o.list):0),0);return walk(s.children.list);});assert.equal(count,6);
    if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-select.png`});
    await tapUI(page,'character-select','character/amo',touch);
    assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('character-select').selectedId),'amo');
    assert.equal(await page.evaluate(()=>window.__harness.game.scene.isActive('shop')),false,'selection requires confirmation');
    await tapUI(page,'character-select','action/cancel-character',touch);
    assert.equal((await point(page,'character-select','action/confirm-character')).enabled,false);
    await tapUI(page,'character-select','character/amo',touch);await tapUI(page,'character-select','action/confirm-character',touch);await waitScene(page,'shop');
    assert.equal((await state(page)).characterId,'amo');
    const shop=await state(page),offer=shop.shop.offers.find(o=>!o.consumed&&o.price<=shop.gold);assert.ok(offer,'natural starting gold permits a purchase');
    await tapUI(page,'shop','offer/'+offer.offerId,touch);await dom(page,'取消',touch);assert.deepEqual(await state(page),shop,'cancel leaves gold, shelf and RNG untouched');
    await tapUI(page,'shop','offer/'+offer.offerId,touch);await dom(page,'确认购买',touch);await next(page,shop.commandSeq);
    assert.equal((await state(page)).gold,shop.gold-offer.price);assert.equal((await state(page)).jokers.length,shop.jokers.length+1);
    if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-shop.png`});
    await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length>0);
    await ready(page);const initial=await state(page),chosen=initial.handOrder[0];
    await tapUI(page,'game','card/'+chosen,touch);
    await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible&&c.container.alpha===1));
    if(touch){
      const indices=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.cardViews.map(c=>{const index=c.container.list.find(o=>o.name==='rank-index'),a=index.getBounds(),intersects=b=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;return {rank:c.card.rank,text:index.text,pipOverlap:c.container.list.filter(o=>o.name==='card-pip').some(p=>intersects(p.getBounds()))};});});
      assert.ok(indices.every(c=>!c.pipOverlap),'suit art never covers a rank index');
      for(const c of indices.filter(c=>c.rank===10))assert.ok(c.text.startsWith('10\n'),'ten is printed as the complete rank');
    }
    assert.ok(await page.evaluate(id=>{const s=window.__harness.game.scene.getScene('game'),c=s.cardViews.find(c=>c.card.id===id);return s.selectedIds.has(id)&&c.container.getData('selected')&&s.resultText.text.includes('当前选择');},chosen),'selection immediately changes both card and preview');
    await dom(page,'菜单',touch);
    if(saveScreens&&touch&&engine===selected[0])await page.screenshot({path:`shots/${name}-menu.png`});
    await dom(page,'继续本局',touch);
    assert.ok(await page.evaluate(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),chosen),'opening / closing menu preserves selected cards');
    for(const name of ['action/sort-rank','action/sort-suit']){
      const before=await state(page);await tapUI(page,'game',name,touch);await next(page,before.commandSeq);const after=await state(page);
      assert.deepEqual(after.rng,before.rng);assert.deepEqual(after.stage,before.stage);
      assert.ok(await page.evaluate(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),chosen),'sorting keeps selection');
    }
    await ready(page);const beforeDiscard=await state(page);assert.equal((await point(page,'game','action/discard')).enabled,true,'selected cards permit discard');
    if(process.env.SMOKE_FEEDBACK==='1'&&engine==='chromium'&&name==='mobile'){
      const p=await point(page,'game','action/discard'),cdp=await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await new Promise(resolve=>setTimeout(resolve,450));
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    }else await tapUI(page,'game','action/discard',touch);
    await next(page,beforeDiscard.commandSeq);
    await page.waitForFunction(expected=>{const s=window.__harness.game.scene.getScene('game'),count=s.resourceCounts.discard;return count.text===String(expected)&&count.scaleX>1.05;},beforeDiscard.stage.discardsLeft-1,{timeout:5000});
    if(saveScreens&&touch&&engine===selected[0])await page.screenshot({path:`shots/${name}-discard-feedback.png`});
    await ready(page);const discarded=await state(page);
    await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible&&c.container.alpha===1));
    assert.ok(discarded.discardPile.includes(chosen));assert.ok(!discarded.handOrder.includes(chosen));assert.equal(discarded.handOrder.length,8);
    for(const id of beforeDiscard.handOrder.filter(id=>id!==chosen))assert.ok(discarded.handOrder.includes(id),'unselected cards stay held');
    assert.equal(discarded.stage.discardsLeft,beforeDiscard.stage.discardsLeft-1);assert.equal(discarded.stage.handsLeft,beforeDiscard.stage.handsLeft);assert.equal(discarded.drawPile.length,beforeDiscard.drawPile.length-1);
    await tapUI(page,'game','card/'+discarded.handOrder[0],touch);
    await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),discarded.handOrder[0]);
    if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-game.png`});
    await tapUI(page,'game','action/play',touch);await next(page,discarded.commandSeq);
    await page.waitForFunction(expected=>{const s=window.__harness.game.scene.getScene('game'),count=s.resourceCounts.play;return count.text===String(expected)&&count.scaleX>1.05;},discarded.stage.handsLeft-1,{timeout:5000});
    await ready(page);const played=await state(page);
    assert.equal(played.stage.handsLeft,discarded.stage.handsLeft-1);assert.equal(played.stage.discardsLeft,discarded.stage.discardsLeft);assert.ok(BigInt(played.stage.heat)>BigInt(discarded.stage.heat));assert.ok(played.lastTrace);
    await page.reload();await waitScene(page,'title');assert.deepEqual(await state(page),played,'refresh restores the full determined result');
    await tapUI(page,'title','action/title-continue',touch);await waitScene(page,'game');await ready(page);assert.deepEqual(await state(page),played,'continue never re-scores');
    if(touch){
      const held=played.handOrder[0];await tapUI(page,'game','card/'+held,true);
      await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),held);
      await page.setViewportSize({width:844,height:300});await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').view.layout.width===844);
      assert.deepEqual(await state(page),played,'rotation preserves state and RNG');assert.ok(await page.evaluate(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),held),'rotation preserves selection');
      if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-rotated.png`});
      await page.setViewportSize({width:360,height:640});await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').view.layout.width===360);
      await tapUI(page,'game','card/'+held,true);
      await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').selectedIds.size===0);
      if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-short.png`});
      if(process.env.SMOKE_FEEDBACK==='1'&&name==='mobile'){
        for(let i=0;i<2;i++){
          await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible&&c.container.alpha===1));
          const before=await state(page),id=before.handOrder[0];await tapUI(page,'game','card/'+id,true);
          await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),id);
          await tapUI(page,'game','action/discard',true);await next(page,before.commandSeq);
          await page.waitForFunction(expected=>{const count=window.__harness.game.scene.getScene('game').resourceCounts.discard;return count.text===String(expected)&&count.scaleX>1.05&&count.style.color==='#ffb391';},before.stage.discardsLeft-1,{timeout:5000});
          await ready(page);
        }
        const noDiscards=await state(page);assert.equal(noDiscards.stage.discardsLeft,0);
        await tapUI(page,'game','card/'+noDiscards.handOrder[0],true);
        await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),noDiscards.handOrder[0]);
        assert.equal((await point(page,'game','action/discard')).enabled,false,'exhausted discard control stays disabled');
        await tapUI(page,'game','card/'+noDiscards.handOrder[0],true);
        await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').selectedIds.size===0);
        for(let i=0;i<2;i++){
          await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible&&c.container.alpha===1));
          const before=await state(page),cards=before.handOrder.map(id=>before.deckInstances.find(c=>c.id===id)).sort((a,b)=>a.rank-b.rank),ids=[cards[0].id,cards.find(c=>c.rank!==cards[0].rank).id];
          // Amo's one-card x3 is strong; two distinct ranks deliberately preserve the last-chance fixture.
          for(const id of ids){await tapUI(page,'game','card/'+id,true);await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),id);}
          await tapUI(page,'game','action/play',true);await next(page,before.commandSeq);await ready(page);
        }
        assert.equal((await state(page)).stage.handsLeft,1);
        assert.ok(await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.resourceCounts.play.style.color==='#ffb391'&&s.statusText.text.includes('最后 1 次出牌');}),'last play remains clearly marked after presentation');
        if(saveScreens&&engine===selected[0])await page.screenshot({path:'shots/mobile-last-chance.png'});
        report.checks.push({engine,profile:'mobile-critical-resources',status:'PASS',covered:['last-discard-pulse','exhausted-discards-disabled','last-play-warning'],physicalDevice:'NOT_RUN'});
      }
    }
    assert.deepEqual(errors,[]);report.checks.push({engine,browserVersion:browser.version(),profile:name,viewport,deviceScaleFactor,framebufferDensity:density,fullscreen,status:'PASS',input:touch?'touchscreen.tap / DOM tap':'mouse.click / DOM click',covered:['select-confirm-cancel','buy-cancel','rank/suit-sort','discard-refill','live-discard-count-pulse','live-play-count-pulse','play-preview-feedback','reload-continue','fixed-menu-anchor','menu-preserves-selection',...(touch?['high-DPR','rotation-preserves-state']:[])]});const video=page.video();await context.close();if(recordVideo)await video.saveAs('shots/p00-play.webm');console.log(`${engine}/${name}: ok`);
  }
  if(['1','only'].includes(process.env.SMOKE_FEEDBACK)&&engine===selected[0]){
    const viewport={width:390,height:740},context=await browser.newContext({viewport,hasTouch:true,deviceScaleFactor:3}),page=await context.newPage(),errors=[];activePage=page;
    page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=p04-golden-02`);await waitScene(page,'title');
    await tapUI(page,'title','action/title-start',true);await waitScene(page,'character-select');
    await tapUI(page,'character-select','character/touye',true);await tapUI(page,'character-select','action/confirm-character',true);await waitScene(page,'shop');
    await tapUI(page,'shop','action/start-stage',true);await waitScene(page,'game');await ready(page);
    await tapUI(page,'game','action/forward',true);const beforeWager=await state(page);await dom(page,'押注本手',true);await next(page,beforeWager.commandSeq);await dom(page,'关闭',true);
    // The first card is behind the dismiss button; respect the 350ms anti-click-through guard.
    await page.waitForTimeout(370);
    await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible&&c.container.alpha===1));
    const ids=['clubs-5','diamonds-14','clubs-4','diamonds-3','clubs-2'];
    for(const id of ids){await tapUI(page,'game','card/'+id,true);await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),id,{timeout:5000});}
    const beforePlay=await state(page),started=Date.now();await tapUI(page,'game','action/play',true);await next(page,beforePlay.commandSeq);
    await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.resultText.text.includes('三倍爆场')&&s.scoreTotal.text==='1,200'&&s.scoreTotal.scaleX>1.05&&s.view.root.list.some(o=>o.name==='score/celebration');},{},{timeout:30000});
    const burstElapsedMs=Date.now()-started,renderFps=await page.evaluate(()=>window.__harness.game.loop.actualFps);
    const linkedAudio=await page.evaluate(()=>{const a=window.__harness.game.scene.getScene('game').audio;return {context:a.context?.state,sfxVoices:[...a.voices].filter(v=>v.bus==='sfx').length,master:a.getVolume('master')};});
    assert.equal(linkedAudio.context,'running');assert.ok(linkedAudio.sfxVoices>0,'burst has actual scheduled SFX voices');assert.ok(linkedAudio.master>0);
    if(saveScreens)await page.screenshot({path:'shots/mobile-overkill.png'});
    await waitScene(page,'intermission');const after=await state(page);assert.equal(after.lastTrace.finalScore,'1200');assert.equal(after.stage.heat,'1200');assert.equal(after.stage.targetHeat,'400');assert.equal(after.stage.handsLeft,3);assert.equal(after.gold,14);assert.deepEqual(errors,[]);
    report.checks.push({engine,browserVersion:browser.version(),channel:process.env.SMOKE_CHROMIUM_CHANNEL||'default',profile:'natural-three-times-target',status:'PASS',seed:'p04-golden-02',character:'touye',selectedIds:ids,finalScore:'1200',target:'400',burstElapsedMs,renderFps,linkedAudio,covered:['natural-wager-straight','real-3x-stamp','score-number-bounce','scheduled-overkill-audio','exact-credit-once'],physicalListening:'NOT_RUN',physicalPerformance:'NOT_RUN'});
    await context.close();console.log(`${engine}/natural-3x: ok`);
  }
  await browser.close();browser=undefined;
  }
}catch(error){
  report.failure=String(error);
  if(activePage&&!activePage.isClosed())try{
    report.failureContext=await activePage.evaluate(()=>{const g=window.__harness?.game,s=g?.scene.getScene('game'),r=g?.registry.get('runController');return {phase:r?.state.phase,commandSeq:r?.state.commandSeq,controller:r?.status,playing:s?.playing,presenting:!!s?.presentation,selectedIds:s?[...s.selectedIds]:[],discardEnabled:!!s?.discardButton?.input?.enabled,status:s?.statusText?.text,pointers:g?.input.pointers.map(p=>({id:p.id,touch:p.wasTouch,x:p.x,y:p.y,down:p.timeDown,up:p.timeUp}))};});
    console.error(JSON.stringify(report.failureContext));if(saveScreens)await activePage.screenshot({path:'shots/smoke-failure.png'});
  }catch{/* Keep the original failure even if the failed page cannot be read. */}
  throw error;
}finally{await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve));await writeFile('shots/smoke-result.json',JSON.stringify(report,null,2)+'\n');}
console.log(verify?'smoke: ok':'shots saved to shots/');
