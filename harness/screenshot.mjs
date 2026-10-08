/** Short player path in a compiled bundle. Observers are read-only; inputs are real. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {access,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {build,preview} from 'vite';
import {waitScene,tapUI,point,tapMenuAction,confirmHeroRoute} from './ui.mjs';
import {armResourcePulse,waitResourcePulse} from './resource-pulse.mjs';
const root=process.cwd(),port=Number(process.env.SHOT_PORT||5199),outDir=path.join(root,'shots/smoke-build'),verify=process.argv.includes('--verify-smoke');
const saveScreens=!verify||process.env.SMOKE_SHOTS==='1';
const engines={chromium,firefox,webkit},selected=(process.env.SMOKE_BROWSERS||'chromium').split(',');
const checkC00=['1','only','rescue'].includes(process.env.SMOKE_C00),checkFeedback=['1','only'].includes(process.env.SMOKE_FEEDBACK);
assert.ok(selected.length&&new Set(selected).size===selected.length&&selected.every(e=>engines[e]),'known distinct smoke engines');
const profiles={desktop:{width:1280,height:720},wide:{width:1920,height:1080},mobile:{width:390,height:740},shortmobile:{width:360,height:640},landscape:{width:844,height:390}},selectedProfiles=(process.env.SHOT_PROFILES||'desktop,mobile').split(',');
assert.ok(selectedProfiles.length&&new Set(selectedProfiles).size===selectedProfiles.length&&selectedProfiles.every(p=>profiles[p]),'known distinct viewport profiles');
const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),checks:[],physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN'};
const state=page=>page.evaluate(()=>window.__harness.game.registry.get('runController').state);
const next=(page,seq)=>page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq&&window.__harness.game.registry.get('runController').status==='idle',seq);
const ready=page=>page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&!s.playing&&s.cardViews.length>0;});
const revealCard=async(page,id)=>{
  for(let step=0;step<14;step++){
    const info=await page.evaluate(id=>{const s=window.__harness.game.scene.getScene('game'),card=s.cardViews.find(c=>c.card.id===id),index=s.cardViews.findIndex(c=>c.card.id===id);return {visible:!!card?.container.visible,index,start:s.view.layout.handStart};},id);
    assert.ok(info.index>=0,'target is a publicly known held card');if(info.visible)return;
    await tapUI(page,'game',info.index<info.start?'action/hand-previous':'action/hand-next',true);
  }
  assert.fail('every held card is reachable through ordinary hand navigation');
};
const dom=async(page,name,touch)=>{const b=page.getByRole('button',{name,exact:true});if(touch)await b.tap();else await b.click();};
await mkdir('shots',{recursive:true});
if(process.env.SMOKE_REUSE_BUILD==='1'){
  await access(path.join(outDir,'index.html'));report.build='existing shots/smoke-build (SMOKE_REUSE_BUILD=1)';
}else await build({mode:'e2e',build:{outDir,emptyOutDir:true},logLevel:'warn'});
const server=await preview({build:{outDir},preview:{port,strictPort:true,host:'127.0.0.1'}}),base=`http://127.0.0.1:${port}/?harness=1&seed=p00-core-ui`;
let browser,activePage;
try {
  for(const engine of selected){
  browser=await engines[engine].launch(engine==='chromium'&&process.env.SMOKE_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.SMOKE_CHROMIUM_EXECUTABLE_PATH}:engine==='chromium'&&process.env.SMOKE_CHROMIUM_CHANNEL?{channel:process.env.SMOKE_CHROMIUM_CHANNEL}:{});
  for(const name of process.env.SMOKE_FEEDBACK==='only'||['only','rescue'].includes(process.env.SMOKE_C00)?[]:selectedProfiles){
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
      assert.equal(await full.getAttribute('aria-pressed'),'true');await page.getByRole('button',{name:'展开全屏控制',exact:true}).tap();await page.getByRole('button',{name:'退出全屏',exact:true}).tap();await page.waitForFunction(()=>document.fullscreenElement===null);fullscreen='PASS (browser API; physical toolbar/orientation NOT_RUN)';
    }
    await tapUI(page,'title','action/title-start',touch);await waitScene(page,'character-select');
    const count=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select');const walk=list=>list.reduce((n,o)=>n+(o.name.startsWith('character/')?1:0)+(o.list?walk(o.list):0),0);return walk(s.children.list);});assert.equal(count,6);
    if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-select.png`});
    await tapUI(page,'character-select','character/amo',touch);
    assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('character-select').selectedId),'amo');
    assert.equal(await page.evaluate(()=>window.__harness.game.scene.isActive('shop')),false,'selection requires confirmation');
    await tapUI(page,'character-select','action/cancel-character',touch);
    assert.equal((await point(page,'character-select','action/confirm-character')).enabled,false);
    await tapUI(page,'character-select','character/amo',touch);await confirmHeroRoute(page,touch);await waitScene(page,'shop');
    assert.equal((await state(page)).characterId,'amo');
    assert.equal((await state(page)).contentVersion,'quality-r2-laohuan-refill-v1');
    assert.equal((await state(page)).openingRoute,'group');
    assert.ok((await state(page)).shop.offers.some(o=>o.definitionId==='mantangcai'&&o.edition==='none'&&o.price===4));
    assert.equal((await state(page)).contentHash,'json-fnv-v1:dba09258baef6184');
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
      await tapUI(page,'game','card/'+chosen,true);
      const row=initial.handOrder.slice(0,5);
      for(const order of [row,[...row].reverse()]){
        for(const id of order)await tapUI(page,'game','card/'+id,true);
        await page.waitForTimeout(260);
        const blocked=await page.evaluate(()=>{
          const s=window.__harness.game.scene.getScene('game'),views=s.cardViews.filter(c=>c.container.visible);
          return views.filter(c=>c.container.getData('selected')).filter(c=>{
            const a=c.container.list.find(o=>o.name==='rank-index').getBounds(),z=s.view.root.getIndex(c.container);
            return views.some(other=>{
              if(other===c||s.view.root.getIndex(other.container)<=z)return false;
              const b=other.background.getBounds();
              return Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))>a.width*a.height*.06;
            });
          }).map(c=>c.card.id);
        });
        assert.deepEqual(blocked,[],'touching cards in either direction keeps all selected rank/suit indices visible');
        for(const id of row)await tapUI(page,'game','card/'+id,true);
      }
      assert.deepEqual(await state(page),initial,'selection order cannot spend resources or advance RNG');
      await tapUI(page,'game','card/'+chosen,true);
    }
    assert.ok(await page.evaluate(id=>{const s=window.__harness.game.scene.getScene('game'),c=s.cardViews.find(c=>c.card.id===id);const f=s.selectionPreview();return s.selectedIds.has(id)&&c.container.getData('selected')&&s.resultText.visible&&!!f&&s.resultText.text.endsWith(' · 已选'+f.playedIds.length+'张')&&!s.scoreTotal.visible&&!s.scoreTotal.text&&!s.scoreTotal.getData('fullText');},chosen),'selection immediately changes both card and preview');
    await dom(page,'菜单',touch);
    if(saveScreens&&touch&&engine===selected[0])await page.screenshot({path:`shots/${name}-menu.png`});
    await dom(page,'继续本局',touch);
    assert.ok(await page.evaluate(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),chosen),'opening / closing menu preserves selected cards');
    const beforeInspect=await state(page);
    for(const label of ['查看牌组','规则 / 物品']){
      await tapMenuAction(page,label,touch);assert.equal(await page.locator('.run-menu-modal').evaluate(dialog=>dialog.open),false,'inspection replaces the menu without stacking dialogs');
      assert.ok(await page.locator('dialog[open]').count());await dom(page,'关闭',touch);
      assert.deepEqual(await state(page),beforeInspect,'low-frequency inspection cannot spend resources or RNG');
    }
    await page.waitForTimeout(370);
    const tableNames=await page.evaluate(()=>{
      const scene=window.__harness.game.scene.getScene('game'),names=[],walk=list=>{for(const object of list){if(object.input?.enabled&&object.name.startsWith('action/'))names.push(object.name);if(object.list)walk(object.list);}};walk(scene.children.list);return names;
    });
    assert.deepEqual(tableNames.filter(name=>!name.startsWith('action/hand-')).sort(),['action/discard','action/play','action/sort-rank','action/sort-suit','action/tool-inventory'],'only approved common actions and the direct tool bag occupy the table');
    await tapUI(page,'game','action/tool-inventory',touch);
    await page.getByRole('dialog',{name:'工具包',exact:true}).waitFor();await dom(page,'关闭',touch);
    assert.deepEqual(await state(page),beforeInspect,'opening / closing the direct tool bag cannot spend resources or RNG');
    assert.ok(await page.evaluate(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),chosen),'opening / closing the direct tool bag preserves selected cards');
    for(const name of ['action/sort-rank','action/sort-suit']){
      const before=await state(page);await tapUI(page,'game',name,touch);await next(page,before.commandSeq);const after=await state(page);
      assert.deepEqual(after.rng,before.rng);assert.deepEqual(after.stage,before.stage);
      assert.ok(await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.selectedIds.size===0&&!s.candidateGhost&&!s.candidateUndo;}),'sorting returns all selected cards and ends old candidate state');
    }
    await ready(page);
    await tapUI(page,'game','card/'+chosen,touch);
    await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),chosen);
    await ready(page);const beforeDiscard=await state(page);assert.equal((await point(page,'game','action/discard')).enabled,true,'selected cards permit discard');
    await page.evaluate(armResourcePulse,{kind:'discard',seq:beforeDiscard.commandSeq+1,remaining:beforeDiscard.stage.discardsLeft-1});
    if(process.env.SMOKE_FEEDBACK==='1'&&engine==='chromium'&&name==='mobile'){
      const p=await point(page,'game','action/discard'),cdp=await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await new Promise(resolve=>setTimeout(resolve,450));
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    }else await tapUI(page,'game','action/discard',touch);
    await next(page,beforeDiscard.commandSeq);
    const discardFeedback=await waitResourcePulse(page,'discard');
    if(saveScreens&&touch&&engine===selected[0])await page.screenshot({path:`shots/${name}-discard-feedback.png`});
    await ready(page);const discarded=await state(page);
    await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible&&c.container.alpha===1));
    assert.ok(discarded.discardPile.includes(chosen));assert.ok(!discarded.handOrder.includes(chosen));assert.equal(discarded.handOrder.length,initial.stage.handLimit);
    for(const id of beforeDiscard.handOrder.filter(id=>id!==chosen))assert.ok(discarded.handOrder.includes(id),'unselected cards stay held');
    assert.equal(discarded.stage.discardsLeft,beforeDiscard.stage.discardsLeft-1);assert.equal(discarded.stage.handsLeft,beforeDiscard.stage.handsLeft);assert.equal(discarded.drawPile.length,beforeDiscard.drawPile.length-1);
    await tapUI(page,'game','card/'+discarded.handOrder[0],touch);
    await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),discarded.handOrder[0]);
    if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-game.png`});
    await page.evaluate(armResourcePulse,{kind:'play',seq:discarded.commandSeq+1,remaining:discarded.stage.handsLeft-1});
    await tapUI(page,'game','action/play',touch);await next(page,discarded.commandSeq);
    const playFeedback=await waitResourcePulse(page,'play');
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
    }
    assert.deepEqual(errors,[]);report.checks.push({engine,browserVersion:browser.version(),profile:name,viewport,deviceScaleFactor,framebufferDensity:density,fullscreen,resourceFeedback:{discard:discardFeedback,play:playFeedback},status:'PASS',input:touch?'touchscreen.tap / DOM tap':'mouse.click / DOM click',covered:['select-confirm-cancel','buy-cancel','rank/suit-sort','discard-refill','live-discard-count-pulse','live-play-count-pulse','play-preview-feedback','reload-continue','fixed-menu-anchor','menu-preserves-selection',...(touch?['high-DPR','left/right-selected-rank-visible','rotation-preserves-state']:[])]});console.log(JSON.stringify({observation:'resource-pulse',engine,profile:name,discard:discardFeedback,play:playFeedback}));const video=page.video();await context.close();if(recordVideo)await video.saveAs('shots/p00-play.webm');console.log(`${engine}/${name}: ok`);
  }
  if(checkFeedback&&engine===selected[0]){
    const viewport={width:390,height:740},context=await browser.newContext({viewport,hasTouch:true,deviceScaleFactor:3}),page=await context.newPage(),errors=[];activePage=page;
    page.on('pageerror',e=>errors.push(String(e)));await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=p04-golden-02`);await waitScene(page,'title');
    await tapUI(page,'title','action/title-start',true);await waitScene(page,'character-select');
    await tapUI(page,'character-select','character/touye',true);await confirmHeroRoute(page,true);await waitScene(page,'shop');
    // Confirm and Start-stage overlap on portrait. Respect the production350ms
    // click-through guard before this feedback-only route's next deliberate tap.
    await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await page.waitForTimeout(370);
    await tapUI(page,'shop','action/start-stage',true);await waitScene(page,'game');await ready(page);
    await tapMenuAction(page,'规则 / 物品',true);const beforeWager=await state(page);await dom(page,'押注本手',true);await next(page,beforeWager.commandSeq);await dom(page,'关闭',true);
    // The first card is behind the dismiss button; respect the 350ms anti-click-through guard.
    await page.waitForTimeout(370);
    await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible&&c.container.alpha===1));
    const ids=['clubs-5','diamonds-14','clubs-4','diamonds-3','clubs-2'];
    for(const id of ids){await tapUI(page,'game','card/'+id,true);await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),id,{timeout:5000});}
    const beforePlay=await state(page),started=Date.now();
    await page.evaluate(()=>{
      window.__scoreObservation={started:performance.now(),events:[],fire:[],timer:undefined};
      const observation=window.__scoreObservation;
      observation.timer=setInterval(()=>{
        const s=window.__harness.game.scene.getScene('game');if(!s.scoreTotal?.active)return;
        const id=s.scoreTotal.getData('eventId'),phase=s.scoreTotal.getData('eventPhase');
        if(id&&!observation.events.some(e=>e.id===id&&e.phase===phase))observation.events.push({id,phase,at:performance.now()-observation.started,label:s.resultText.text,heat:s.scoreHeat.text,mult:s.scoreMult.text});
        const level=s.scoreFlame?.graphic?.getData('intensity')??0;
        if(level&&!observation.fire.some(f=>f.level===level)){
          const frame=s.view.root.list.filter(o=>o.name.startsWith('score/fire-frame-')&&o.visible).map(o=>{const b=o.getBounds();return {name:o.name,x:b.x,y:b.y,width:b.width,height:b.height,interactive:!!o.input};});
          observation.fire.push({level,frame,edgeFlash:s.scoreFlame?.frameFlash??0,at:performance.now()-observation.started,voices:s.audio.fireVoices.size,audio:[...s.audio.fireVoices].map(voice=>({layer:voice.fireLayer,filter:voice.filter.type,frequency:voice.filter.frequency.value,gain:voice.gain.gain.value})),shown:s.scoreTotal.text,heat:s.scoreHeat.text,mult:s.scoreMult.text,id,phase});
        }
      },30);
    });
    await tapUI(page,'game','action/play',true);await next(page,beforePlay.commandSeq);
    if(saveScreens){
      await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').scoreFlame?.graphic?.getData('intensity')===1,{},{timeout:30000});
      await page.screenshot({path:'shots/mobile-score-small-fire.png'});
      await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').scoreFlame?.graphic?.getData('intensity')===2,{},{timeout:30000});
      await page.screenshot({path:'shots/mobile-score-fire.png'});
    }
    await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.resultText.text.includes('三倍爆场')&&s.scoreTotal.text==='1,200'&&s.scoreTotal.scaleX>1.05&&s.view.root.list.some(o=>o.name==='score/celebration');},{},{timeout:30000});
    const burstElapsedMs=Date.now()-started,renderFps=await page.evaluate(()=>window.__harness.game.loop.actualFps);
    const linkedAudio=await page.evaluate(()=>{const a=window.__harness.game.scene.getScene('game').audio;return {context:a.context?.state,sfxVoices:[...a.voices].filter(v=>v.bus==='sfx').length,master:a.getVolume('master')};});
    assert.equal(linkedAudio.context,'running');assert.ok(linkedAudio.sfxVoices>0,'burst has actual scheduled SFX voices');assert.ok(linkedAudio.master>0);
    if(saveScreens)await page.screenshot({path:'shots/mobile-overkill.png'});
    await waitScene(page,'intermission');const after=await state(page);assert.equal(after.lastTrace.finalScore,'1200');assert.equal(after.stage.heat,'1200');assert.equal(after.stage.targetHeat,'400');assert.equal(after.stage.handsLeft,3);assert.equal(after.gold,14);assert.deepEqual(errors,[]);
    const observation=await page.evaluate(()=>{const o=window.__scoreObservation;clearInterval(o.timer);return {events:o.events,fire:o.fire};});
    report.naturalScoreObservation={renderFps,burstElapsedMs,linkedAudio,...observation};
    const expected=after.lastTrace.events.filter(e=>e.phase!=='base'&&e.phase!=='finalScore');
    assert.deepEqual(observation.events.filter(e=>e.phase==='impact').map(e=>e.id),expected.map(e=>e.eventId),'every actual source gets its own ordered impact');
    assert.ok(observation.fire.some(f=>f.level===2&&f.voices>0),'actual >=2x score has large flame rendering and real scheduled burning voices');
    assert.deepEqual(observation.fire.map(f=>f.level),[1,2],'natural score roll crosses the two D27 displayed flame thresholds in order');
    for(const frame of observation.fire){
      const shown=BigInt(frame.shown.replaceAll(',','')),total=BigInt(beforePlay.stage.heat)+shown,target=BigInt(after.stage.targetHeat);
      const level=total<target?0:total>=target*5n?3:total>=target*2n?2:1;
      assert.equal(frame.level,level,'flame level follows the score visible in this same browser tick, never a future roll result');
      assert.equal(frame.frame.length,level>=2&&frame.edgeFlash>0?4:0,'only the bounded large/extreme ignition lights the four table edges');
      for(const band of frame.frame){
        assert.equal(band.interactive,false,'fire never intercepts the player input');
        assert.ok(Math.min(band.width,band.height)<=12.01&&band.x>=-.01&&band.y>=-.01&&band.x+band.width<=390.01&&band.y+band.height<=740.01,'visible flame stays in the portrait table gutter');
      }
    }
    for(const event of expected){
      const phases=['windup','impact','rest'].map(phase=>observation.events.find(e=>e.id===event.eventId&&e.phase===phase));
      assert.ok(phases.every(Boolean),'every source retains a visible windup, impact and rest');
      assert.ok(phases[0].at<phases[1].at&&phases[1].at<phases[2].at,'each source has one ordered complete beat');
    }
    const ordinaryPacing=expected.slice(0,5).map((event,i)=>{
      const start=observation.events.find(e=>e.id===event.eventId&&e.phase==='windup'),rest=observation.events.find(e=>e.id===event.eventId&&e.phase==='rest'),next=observation.events.find(e=>e.id===expected[i+1].eventId&&e.phase==='windup');
      const beatMs=next.at-start.at;
      assert.ok(rest.at<next.at,'each ordinary source finishes its own rest before the next source');
      assert.ok(beatMs>=300,'ordinary card keeps its readable 1x beat floor after D22 acceleration');
      return {eventId:event.eventId,ordinal:i,preRestMs:rest.at-start.at,beatMs};
    });
    assert.ok(ordinaryPacing[0].beatMs>ordinaryPacing[4].beatMs,'ordinary cards progressively accelerate within the same committed trace');
    // Regression for the reported blue screen: reuse the same Phaser Scene after a real clear.
    await tapUI(page,'intermission','action/continue-stage',true);await waitScene(page,'shop');
    await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await page.waitForTimeout(370);
    await tapUI(page,'shop','action/start-stage',true);await ready(page);
    assert.equal((await state(page)).stage.index,1);assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('game').cardViews.length),8);
    assert.deepEqual(errors,[],'second table entry must not touch destroyed controls');
    assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('game').audio.fireVoices.size),0,'finished scoring does not leak fire audio into the next table');
    report.checks.push({engine,browserVersion:browser.version(),channel:process.env.SMOKE_CHROMIUM_CHANNEL||'default',executablePath:process.env.SMOKE_CHROMIUM_EXECUTABLE_PATH||null,profile:'natural-three-times-target',status:'PASS',seed:'p04-golden-02',character:'touye',selectedIds:ids,finalScore:'1200',target:'400',burstElapsedMs,renderFps,linkedAudio,observation,ordinaryPacing,covered:['natural-wager-straight','every-source-ordered-impact','progressive-individual-card-pace','displayed-score-fire-thresholds','3x-flame-and-burning-audio','four-visible-noninteractive-frame-flames','real-3x-stamp','score-number-bounce','scheduled-overkill-audio','exact-credit-once','second-table-entry-after-clear','fire-cleanup'],physicalListening:'NOT_RUN',physicalPerformance:'NOT_RUN'});
    await context.close();console.log(`${engine}/natural-3x: ok`);
  }
  if((checkC00||process.env.SMOKE_FEEDBACK==='1')&&engine===selected[0]){
    const fixtures=[...(checkC00&&process.env.SMOKE_C00!=='rescue'?[{seed:'c00-hand-8',character:'amo',joker:'d06',profile:'natural-nine-card-hand'}]:[]),{seed:'c00-rescue-51',character:'erxiang',joker:'f07',profile:'natural-last-hand-rescue'}];
    for(const fixture of fixtures){
      const viewport={width:390,height:740},context=await browser.newContext({viewport,hasTouch:true,deviceScaleFactor:3}),page=await context.newPage(),errors=[];activePage=page;page.on('pageerror',e=>errors.push(String(e)));
      await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=${fixture.seed}`);await waitScene(page,'title');
      await tapUI(page,'title','action/title-start',true);await waitScene(page,'character-select');await tapUI(page,'character-select','character/'+fixture.character,true);await confirmHeroRoute(page,true);await waitScene(page,'shop');
      const shop=await state(page),offer=shop.shop.offers.find(o=>o.definitionId===fixture.joker&&!o.consumed);assert.ok(offer&&offer.price===6&&shop.gold===6,'natural shelf permits the target purchase without injected state');
      await tapUI(page,'shop','offer/'+offer.offerId,true);await dom(page,'确认购买',true);await next(page,shop.commandSeq);assert.equal((await state(page)).gold,0);
      await tapUI(page,'shop','action/start-stage',true);await waitScene(page,'game');await ready(page);
      if(fixture.joker==='d06'){
        const initial=await state(page);assert.equal(initial.stage.handLimit,9);assert.equal(initial.handOrder.length,9);assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('game').cardViews.length),9);
        const ninth=initial.handOrder[8];await revealCard(page,ninth);await tapUI(page,'game','card/'+ninth,true);await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),ninth);
        for(const sort of ['action/sort-rank','action/sort-suit']){
          const before=await state(page);await tapUI(page,'game',sort,true);await next(page,before.commandSeq);assert.deepEqual((await state(page)).rng,before.rng);assert.ok(await page.evaluate(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),ninth));
        }
        await ready(page);await revealCard(page,ninth);if(saveScreens)await page.screenshot({path:'shots/c00-nine-card-hand.png'});
        const beforeDiscard=await state(page);await tapUI(page,'game','action/discard',true);await next(page,beforeDiscard.commandSeq);await ready(page);const discarded=await state(page);
        assert.equal(discarded.stage.handsLeft,4);assert.equal(discarded.stage.discardsLeft,2);assert.equal(discarded.handOrder.length,9);assert.ok(discarded.discardPile.includes(ninth));
        const held=discarded.handOrder[0];await revealCard(page,held);await tapUI(page,'game','card/'+held,true);await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),held);await tapUI(page,'game','action/play',true);await next(page,discarded.commandSeq);await ready(page);
        const played=await state(page);assert.equal(played.stage.handsLeft,3);assert.equal(played.handOrder.length,9);assert.ok(BigInt(played.stage.heat)>0n);
        await page.reload();await waitScene(page,'title');assert.deepEqual(await state(page),played);await tapUI(page,'title','action/title-continue',true);await waitScene(page,'game');await ready(page);assert.deepEqual(await state(page),played);
        const restoredNinth=played.handOrder[8];await revealCard(page,restoredNinth);await tapUI(page,'game','card/'+restoredNinth,true);await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),restoredNinth);
        report.checks.push({engine,browserVersion:browser.version(),profile:fixture.profile,status:'PASS',seed:fixture.seed,handLimit:9,viewport,deviceScaleFactor:3,covered:['natural-6-gold-buy','nine-visible-card-models','ninth-card-touch','sort-keeps-selection','discard-refills-nine','play-refills-nine','reload-preserves-complete-state','restored-ninth-card-touch'],physicalDevice:'NOT_RUN'});
      }else{
        // Erxiang's low single hands do not amplify: keep the real 400 target and exercise resource warnings before the rescue.
        for(let discard=0;discard<3;discard++){
          await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible&&c.container.alpha===1));
          const before=await state(page),id=before.handOrder[0];await revealCard(page,id);await tapUI(page,'game','card/'+id,true);
          await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),id);await tapUI(page,'game','action/discard',true);await next(page,before.commandSeq);
          await page.waitForFunction(expected=>{const count=window.__harness.game.scene.getScene('game').resourceCounts.discard;return count.text===expected+' 次'&&count.scaleX>1.05&&(expected>1||count.style.color==='#ffb391');},before.stage.discardsLeft-1,{timeout:5000});
          await ready(page);assert.equal((await state(page)).stage.handsLeft,4);
        }
        const noDiscards=await state(page),held=noDiscards.handOrder[0];assert.equal(noDiscards.stage.discardsLeft,0);await revealCard(page,held);await tapUI(page,'game','card/'+held,true);
        await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),held);assert.equal((await point(page,'game','action/discard')).enabled,false,'exhausted discard control stays disabled');
        await tapUI(page,'game','card/'+held,true);await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').selectedIds.size===0);
        for(let hand=0;hand<4;hand++){
          await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(c=>!c.back?.visible&&c.container.alpha===1));
          await ready(page);const before=await state(page),card=before.handOrder.map(id=>before.deckInstances.find(c=>c.id===id)).sort((a,b)=>a.rank-b.rank)[0];
          assert.equal(before.stage.handsLeft,4-hand);await revealCard(page,card.id);await tapUI(page,'game','card/'+card.id,true);await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),card.id);
          if(hand===3)await page.evaluate(()=>{window.__c00RescueObservation=[];window.__c00RescueTimer=setInterval(()=>{const s=window.__harness.game.scene.getScene('game'),id=s.scoreTotal?.getData('eventId'),phase=s.scoreTotal?.getData('eventPhase');if(id&&phase==='impact'&&!window.__c00RescueObservation.some(e=>e.id===id))window.__c00RescueObservation.push({id,label:s.resultText.text,playCount:s.resourceCounts.play.text});},30);});
          await tapUI(page,'game','action/play',true);await next(page,before.commandSeq);await ready(page);
          if(hand===2)assert.ok(await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.resourceCounts.play.style.color==='#ffb391'&&s.statusText.text.includes('最后 1 次出牌');}),'last play remains clearly marked after presentation');
        }
        const rescued=await state(page),events=rescued.lastTrace.events.filter(e=>e.phase==='beforeFailure');assert.equal(rescued.phase,'await-input');assert.equal(rescued.stage.handsLeft,1);assert.equal(rescued.stage.playIndex,4);assert.equal(rescued.stage.rescueUsed,true);assert.equal(rescued.safetyNetUsed,true);assert.equal(rescued.gold,0);assert.equal(rescued.jokers.some(j=>j.definitionId==='f07'),false);
        assert.deepEqual(events.map(e=>e.operation),['rescue-hand','destroy-joker']);assert.equal(events[0].resourceBefore,0);assert.equal(events[0].resourceAfter,1);
        const observation=await page.evaluate(()=>{clearInterval(window.__c00RescueTimer);return window.__c00RescueObservation;});for(const event of events)assert.ok(observation.some(o=>o.id===event.eventId),'each rescue source has an actual ordered impact');
        if(saveScreens)await page.screenshot({path:'shots/c00-last-hand-rescue.png'});
        await page.reload();await waitScene(page,'title');assert.deepEqual(await state(page),rescued);await tapUI(page,'title','action/title-continue',true);await waitScene(page,'game');await ready(page);assert.deepEqual(await state(page),rescued);
        await tapMenuAction(page,'回看上一手',true);await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').isPresenting);await ready(page);assert.deepEqual(await state(page),rescued,'replay uses persisted destroyed source and never refunds again');
        const last=rescued.handOrder.map(id=>rescued.deckInstances.find(c=>c.id===id)).sort((a,b)=>a.rank-b.rank)[0];await revealCard(page,last.id);await tapUI(page,'game','card/'+last.id,true);await page.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),last.id);await tapUI(page,'game','action/play',true);await next(page,rescued.commandSeq);await waitScene(page,'intermission');const lost=await state(page);
        assert.equal(lost.phase,'run-lost');assert.equal(lost.stage.handsLeft,0);assert.equal(lost.stage.playIndex,5);assert.equal(lost.gold,0);assert.equal(lost.lastTrace.events.some(e=>e.operation==='rescue-hand'),false);
        report.checks.push({engine,browserVersion:browser.version(),profile:fixture.profile,status:'PASS',seed:fixture.seed,observation,rescueEvents:events,viewport,deviceScaleFactor:3,covered:['natural-6-gold-buy','last-discard-pulse','exhausted-discards-disabled','last-play-warning','four-real-single-plays','0-to-1-rescue-source-impact','original-source-destroyed-once','persisted-trace-after-refresh','replay-never-refunds','fifth-play-fails-without-second-rescue'],physicalDevice:'NOT_RUN'});
      }
      assert.deepEqual(errors,[]);await context.close();console.log(`${engine}/${fixture.profile}: ok`);
    }
  }
  await browser.close();browser=undefined;
  }
}catch(error){
  report.failure=String(error);
  if(activePage&&!activePage.isClosed())try{
    report.failureContext=await activePage.evaluate(()=>{const g=window.__harness?.game,s=g?.scene.getScene('game'),r=g?.registry.get('runController');return {phase:r?.state.phase,commandSeq:r?.state.commandSeq,controller:r?.status,playing:s?.playing,presenting:!!s?.presentation,eventId:s?.scoreTotal?.getData('eventId'),eventPhase:s?.scoreTotal?.getData('eventPhase'),label:s?.resultText?.text,renderFps:g?.loop.actualFps,hidden:document.hidden,selectedIds:s?[...s.selectedIds]:[],discardEnabled:!!s?.discardButton?.input?.enabled,status:s?.statusText?.text,pointers:g?.input.pointers.map(p=>({id:p.id,touch:p.wasTouch,x:p.x,y:p.y,down:p.timeDown,up:p.timeUp}))};});
    console.error(JSON.stringify(report.failureContext));if(saveScreens)await activePage.screenshot({path:'shots/smoke-failure.png'});
  }catch{/* Keep the original failure even if the failed page cannot be read. */}
  throw error;
}finally{await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve));await writeFile('shots/smoke-result.json',JSON.stringify(report,null,2)+'\n');}
console.log(verify?'smoke: ok':'shots saved to shots/');
