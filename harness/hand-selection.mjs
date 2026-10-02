/** Frozen E2E bundle, natural hand and real browser input; no run-state fixtures. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {build,preview} from 'vite';
import {chooseCharacter,point,tapUI,waitScene} from './ui.mjs';

const root=process.cwd(),dir=path.resolve(process.env.HAND_SELECTION_EVIDENCE_DIR||'shots/hand-selection');
const outDir=path.join(dir,'build'),port=5209,seed='f09-sample-30';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const args=['--disable-gpu','--disable-software-rasterizer'];
const report={testedCommit:git('rev-parse','HEAD'),dirtyState:git('status','--porcelain=v1'),seed,
  environment:{platform:process.platform,node:process.version,executable:process.env.HAND_SELECTION_CHROMIUM||'/usr/bin/chromium',args},
  scope:'Natural suit-sorted hand; selection, layering, cancellation and explicit detail reorder',
  limitations:['Canvas functional adapter with GPU and software rasterization disabled; WebGL NOT_RUN.',
    'Linux Chromium mouse and CDP touch emulation; physical Android/iPhone, hardware GPU and device performance NOT_RUN.',
    '390×640 is a constrained CSS viewport, not a real browser address bar or physical-device acceptance.',
    'No play, discard or long gameplay is part of this focused route.'],runs:[]};
await mkdir(dir,{recursive:true});
let server,browser;

/** Read the entire checkpoint store without requesting or performing any write. */
async function persisted(page){return page.evaluate(async()=>{
  const c=window.__harness.game.registry.get('runController');
  const storage=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('dachoupai-checkpoints');
    request.onerror=()=>reject(request.error);request.onupgradeneeded=()=>{request.transaction.abort();reject(Error('Expected existing checkpoint database'));};
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('saves','readonly'),cursor=tx.objectStore('saves').openCursor(),records=[];
      cursor.onsuccess=()=>{const row=cursor.result;if(row){records.push({key:row.key,value:row.value});row.continue();}};
      tx.oncomplete=()=>{db.close();resolve(records);};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};
    };
  });
  return {state:c.state,journal:c.journal,status:c.status,exportJSON:c.exportJSON(),storage};
});}

async function observation(page){return page.evaluate(()=>{
  const game=window.__harness.game,s=game.scene.getScene('game'),root=s.view.root,canvas=game.canvas.getBoundingClientRect();
  const screen=p=>{const q=s.cameras.main.matrix.transformPoint(p.x-s.cameras.main.scrollX,p.y-s.cameras.main.scrollY);return {x:canvas.left+q.x*canvas.width/game.scale.width,y:canvas.top+q.y*canvas.height/game.scale.height};};
  const views=s.cardViews,ordered=root.list.filter(o=>views.some(v=>v.container===o));
  const cards=views.map(v=>{
    const c=v.container,label=c.list.find(o=>o.name==='rank-index'),matrix=label?.getWorldTransformMatrix();
    const samples=matrix?[.25,.75].map(y=>matrix.transformPoint(label.width*.5-label.displayOriginX,label.height*y-label.displayOriginY)):[];
    const coveredBy=samples.map(p=>views.filter(other=>{
      if(other===v||!other.container.visible||ordered.indexOf(other.container)<=ordered.indexOf(c))return false;
      const q=other.container.getWorldTransformMatrix().applyInverse(p.x,p.y),w=Number(other.container.getData('width')),h=Number(other.container.getData('height'));
      return q.x>-w/2+1&&q.x<w/2-1&&q.y>-h/2+1&&q.y<h/2-1;
    }).map(other=>other.card.id));
    const hit=v.hit,area=hit?.input?.hitArea,hitMatrix=hit?.getWorldTransformMatrix();
    const hitCorners=area&&hitMatrix?[hitMatrix.transformPoint(area.x-hit.displayOriginX,area.y-hit.displayOriginY),hitMatrix.transformPoint(area.x+area.width-hit.displayOriginX,area.y+area.height-hit.displayOriginY)].map(screen):[];
    return {id:v.card.id,suit:v.card.suit,rank:v.card.rank,selected:s.selectedIds.has(v.card.id),visible:c.visible,
      layer:ordered.indexOf(c),depth:c.depth,x:c.x,y:c.y,angle:c.angle,scaleX:c.scaleX,scaleY:c.scaleY,
      scoring:!!c.getData('activeScoring'),selectionMark:!!v.selectionMark?.visible,indexText:label?.text,
      rankSuitPoints:samples.map(screen),coveredBy,hitEnabled:!!hit?.input?.enabled,hitCorners};
  });
  return {selected:views.filter(v=>s.selectedIds.has(v.card.id)).map(v=>v.card.id),rawSelected:[...s.selectedIds],cards,
    layers:ordered.map(o=>views.find(v=>v.container===o).card.id),focusIndex:s.focusIndex,
    preview:{result:s.resultText.text,breakdown:s.breakdownText.text,heat:s.scoreHeat.text,mult:s.scoreMult.text,total:s.scoreTotal.text},
    status:s.statusText.text,playing:s.playing,presenting:!!s.presentation,handOrder:[...s.run.handOrder],
    layout:{mode:s.view.layout.mode,hand:s.view.layout.hand,visibleCardCount:s.view.layout.visibleCardCount},
    renderer:game.renderer.gl?'WebGL':'Canvas',fps:game.loop.actualFps,framebuffer:[game.canvas.width,game.canvas.height],
    viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},canvas:{x:canvas.x,y:canvas.y,width:canvas.width,height:canvas.height}};
});}

async function settle(page,touch){
  if(!touch)await page.mouse.move(3,200);
  await page.waitForFunction(()=>{const s=window.__harness?.game.scene.getScene('game');return s?.cardViews.length&&s.cardViews.every(v=>!v.dealing&&!v.back?.visible&&!s.tweens.isTweening(v.container));});
}
const selected=page=>page.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]);
const normalized=ids=>[...ids].sort();
const assertSelected=async(page,ids,label)=>assert.deepEqual(normalized(await selected(page)),normalized(ids),label);
const signature=o=>({selected:o.selected,layers:o.layers,cards:o.cards.map(({id,layer,depth,x,y,angle,scaleX,scaleY,scoring,selectionMark})=>({id,layer,depth,x,y,angle,scaleX,scaleY,scoring,selectionMark})),preview:o.preview});
const assertExposed=o=>{for(const card of o.cards){assert.equal(card.rankSuitPoints.length,2,card.id+': rank and suit measured');assert.deepEqual(card.coveredBy,[[],[]],card.id+': rank/suit samples are not covered by a higher card');assert.equal(card.hitEnabled,true,card.id+': independent strip enabled');}};

async function scenario(spec){
  const {name,viewport,touch,reducedMotion}=spec,context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:touch?3:1,reducedMotion});
  const page=await context.newPage(),cdp=touch?await context.newCDPSession(page):undefined,errors=[];
  const run={...spec,input:touch?'CDP Input.dispatchTouchEvent + touchscreen tap':'Playwright mouse + keyboard',checks:[],trace:[],screenshots:[]};report.runs.push(run);
  page.on('pageerror',error=>errors.push(String(error)));
  const trace=(action,details={})=>run.trace.push({action,...details});
  const shot=async suffix=>{const file=`${name}-${suffix}.png`;await page.screenshot({path:path.join(dir,file)});run.screenshots.push(file);};
  const tap=async id=>{trace('tap',{id});await tapUI(page,'game','card/'+id,touch);};
  const touchEvent=async(type,points)=>{trace(type,{points});await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(({x,y,id=1})=>({x,y,id,radiusX:2,radiusY:2,force:1}))});};
  const down=async p=>{if(touch)await touchEvent('touchStart',[p]);else{trace('mouseDown',p);await page.mouse.move(p.x,p.y);await page.mouse.down();}};
  const move=async p=>{if(touch)await touchEvent('touchMove',[p]);else{trace('mouseMove',p);await page.mouse.move(p.x,p.y);}};
  const up=async()=>{if(touch)await touchEvent('touchEnd',[]);else{trace('mouseUp');await page.mouse.up();}};
  const route=async ids=>{const points=await Promise.all(ids.map(id=>point(page,'game','card/'+id)));await down(points[0]);for(const p of points.slice(1))await move(p);await up();await settle(page,touch);};
  let baseline,references;
  const invariant=async label=>{
    const value=await persisted(page);assert.deepEqual(value,baseline,label+': full state, RNG, journal, exported save and IndexedDB stay unchanged');
    assert.equal(await page.evaluate(()=>window.__harness.game.scene.isActive('game')),true,label+': stays on table');
    const o=await observation(page);assert.equal(o.playing,false,label+': no play/discard');assert.equal(o.presenting,false,label+': no score presentation');
    run.checks.push({name:label,status:'PASS',selected:o.selected,persistedSha256:digest(value)});return o;
  };
  const clear=async()=>{for(const id of await selected(page))await tap(id);await settle(page,touch);await assertSelected(page,[],'clear by actual taps');};
  try{
    await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=${seed}`);await chooseCharacter(page,'amo',touch);
    await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');
    await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.length===8;});await settle(page,touch);
    const beforeSort=await persisted(page);trace('sort-suit');await tapUI(page,'game','action/sort-suit',touch);
    await page.waitForFunction(seq=>{const c=window.__harness.game.registry.get('runController');return c.status==='idle'&&c.state.commandSeq>seq;},beforeSort.state.commandSeq);await settle(page,touch);
    baseline=await persisted(page);assert.deepEqual(baseline.state.rng,beforeSort.state.rng,'sort never consumes RNG');
    const suits=['spades','hearts','clubs','diamonds'],expected=baseline.state.handOrder.map(id=>baseline.state.deckInstances.find(c=>c.id===id)).sort((a,b)=>suits.indexOf(a.suit)-suits.indexOf(b.suit)||b.rank-a.rank).map(c=>c.id);
    const ids=baseline.state.handOrder,chosen=ids.slice(0,5);assert.deepEqual(ids,expected,'natural hand sorted through real suit control');
    run.hand=ids.map(id=>baseline.state.deckInstances.find(c=>c.id===id));run.baselineSha256=digest(baseline);
    await writeFile(path.join(dir,`${name}-before.json`),JSON.stringify(baseline,null,2)+'\n');
    references=await page.evaluateHandle(()=>{const s=window.__harness.game.scene.getScene('game');return {hud:s.heatText,cards:s.cardViews.map(v=>v.container)};});
    run.initial=await observation(page);assert.equal(run.initial.renderer,'Canvas','explicit Canvas functional route');assert.equal(run.initial.layout.visibleCardCount,8,'all eight natural cards available');await shot('suit-sorted');

    let canonical;
    for(const [label,order] of [['tap-left-to-right',chosen],['tap-right-to-left',[...chosen].reverse()],['tap-mixed',[chosen[2],chosen[4],chosen[0],chosen[3],chosen[1]]]]){
      await clear();for(const id of order)await tap(id);await settle(page,touch);await assertSelected(page,chosen,label);
      const o=await invariant(label);assertExposed(o);if(canonical)assert.deepEqual(signature(o),canonical,label+': equivalent final layers, transforms and preview');else canonical=signature(o);
      await shot(label);
    }
    // Hover must settle back to the same complete layer order, including unselected cards.
    if(!touch){const p=await point(page,'game','card/'+ids[6]);await page.mouse.move(p.x,p.y);await settle(page,touch);assert.deepEqual(signature(await observation(page)),canonical,'hover/out restores complete stable layer order');await invariant('mouse-hover-out-restores-layers');}

    for(const [label,order] of [['sweep-left-to-right',[chosen[0],chosen[4]]],['sweep-right-to-left',[chosen[4],chosen[0]]],['sweep-reverse-without-retoggle',[chosen[0],chosen[4],chosen[0]]]]){
      await clear();await route(order);await assertSelected(page,chosen,label);const o=await invariant(label);
      assert.deepEqual(signature(o),canonical,label+': same final layers/preview as taps');assertExposed(o);await shot(label);
    }
    // Starting selected fixes this whole gesture to deselection, including crossed gaps.
    await clear();for(const id of [ids[0],ids[2],ids[4]])await tap(id);await route([ids[4],ids[0],ids[4]]);await assertSelected(page,[],'selected-start sweep removes selected cards without selecting gaps');await invariant('selected-start-deselect-and-reverse');
    await route([ids[0],ids[7]]);await assertSelected(page,ids.slice(0,5),'fast full-row sweep fills only first five');await invariant('fast-sweep-max-five-left');
    await tap(ids[7]);await assertSelected(page,ids.slice(0,5),'sixth tap is rejected');assert.match((await observation(page)).status,/最多选择 5/);await invariant('sixth-tap-feedback');
    await clear();await route([ids[7],ids[0]]);await assertSelected(page,ids.slice(3),'reverse full-row sweep fills first five encountered');await invariant('fast-sweep-max-five-right');

    // Check both visible rank/suit samples against higher card faces, then use that strip.
    await clear();for(const id of [ids[0],ids[2],ids[4]])await tap(id);await settle(page,touch);
    const strips=await observation(page);run.rankSuitStrips=strips.cards.map(c=>({id:c.id,selected:c.selected,points:c.rankSuitPoints,coveredBy:c.coveredBy,hitCorners:c.hitCorners}));
    assertExposed(strips);
    for(const id of ids.filter(id=>![ids[0],ids[2],ids[4]].includes(id))){
      const card=(await observation(page)).cards.find(c=>c.id===id),p=card.rankSuitPoints[1];trace('tap-visible-suit-strip',{id,...p});
      if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
      await assertSelected(page,[ids[0],ids[2],ids[4],id],id+': unselected visible strip selects intended card');await tap(id);
    }
    await settle(page,touch);await invariant('rank-suit-visible-and-unselected-strips-selectable');await shot('partial-selection-readable');

    // Provisional sweep preview is rolled back by genuine touchCancel / Escape.
    await clear();for(const id of [ids[1],ids[5]])await tap(id);await settle(page,touch);const beforeCancel=signature(await observation(page));
    let p0=await point(page,'game','card/'+ids[0]),p3=await point(page,'game','card/'+ids[3]);await down(p0);await move(p3);
    await assertSelected(page,[ids[0],ids[1],ids[2],ids[3],ids[5]],'sweep updates preview before release');
    assert.deepEqual(await persisted(page),baseline,'live sweep cannot mutate full persistent state');
    if(touch)await touchEvent('touchCancel',[]);else{trace('Escape');await page.keyboard.press('Escape');await page.mouse.up();}
    await settle(page,touch);assert.deepEqual(signature(await observation(page)),beforeCancel,'cancel restores initial selection, layers and preview');await invariant(touch?'touch-cancel-restores-preview':'escape-cancel-restores-preview');await shot('cancel-restored');

    // A release over either command button must not be interpreted as its click.
    for(const action of ['action/play','action/discard']){
      p0=await point(page,'game','card/'+ids[0]);p3=await point(page,'game','card/'+ids[3]);const target=await point(page,'game',action);
      await down(p0);await move(p3);await move(target);await up();await settle(page,touch);await invariant('sweep-release-over-'+action.slice(7));
      await clear();for(const id of [ids[1],ids[5]])await tap(id);await settle(page,touch);
    }
    const beforeOutside=signature(await observation(page));p0=await point(page,'game','card/'+ids[0]);p3=await point(page,'game','card/'+ids[3]);
    await down(p0);await move(p3);await move({x:-12,y:200});await up();await settle(page,touch);
    assert.deepEqual(signature(await observation(page)),beforeOutside,'outside release cancels and restores preview');await invariant('outside-release-does-not-play');

    if(touch){
      const beforeMulti=signature(await observation(page));p0=await point(page,'game','card/'+ids[0]);p3=await point(page,'game','card/'+ids[3]);
      await down(p0);await move(p3);await touchEvent('touchStart',[{...p3,id:1},{...await point(page,'game','card/'+ids[6]),id:2}]);await touchEvent('touchEnd',[]);await settle(page,touch);
      assert.deepEqual(signature(await observation(page)),beforeMulti,'additional touch cancels whole selection gesture');await invariant('multitouch-cancels-no-play');
      // A pre-existing control press must be canceled before a second finger enters the hand.
      for(const action of ['action/play','action/discard'])for(const releaseFirst of ['control','hand']){
        const beforeContact=signature(await observation(page)),control={...await point(page,'game',action),id:1},hand={...await point(page,'game','card/'+ids[0]),id:2};
        assert.equal(control.enabled,true,action+': regression begins on an enabled control');
        await touchEvent('touchStart',[control]);await touchEvent('touchStart',[control,hand]);
        await touchEvent('touchEnd',[releaseFirst==='control'?hand:control]);await touchEvent('touchEnd',[]);await settle(page,touch);
        assert.deepEqual(signature(await observation(page)),beforeContact,'control-first multitouch keeps selection and preview');await invariant(action.slice(7)+'-first-multitouch-release-'+releaseFirst+'-first');
      }
      for(const action of ['action/play','action/discard']){
        const beforeMixed=signature(await observation(page)),control={...await point(page,'game',action),id:1},hand=await point(page,'game','card/'+ids[0]);
        assert.equal(control.enabled,true,action+': mixed-device regression begins on enabled control');
        await touchEvent('touchStart',[control]);trace('mouse-click-during-control-touch',{action,...hand});await page.mouse.click(hand.x,hand.y);
        await touchEvent('touchEnd',[]);await page.mouse.move(3,200);await settle(page,touch);
        assert.deepEqual(signature(await observation(page)),beforeMixed,'mixed touch/mouse contact keeps selection and preview');await invariant(action.slice(7)+'-touch-first-mouse-hand-no-command');
      }
      const beforeVertical=signature(await observation(page));p0=await point(page,'game','card/'+ids[0]);await down(p0);await move({x:p0.x+3,y:p0.y+36});await up();await settle(page,touch);
      assert.deepEqual(signature(await observation(page)),beforeVertical,'vertical intent restores original selection and preview');await invariant('vertical-touch-cancels-no-play');
      const beforeHold=signature(await observation(page));p0=await point(page,'game','card/'+ids[0]);await down(p0);await page.getByRole('dialog').waitFor();await up();
      await assertSelected(page,beforeHold.selected,'stationary long press opens detail without toggling');await page.getByRole('button',{name:'关闭',exact:true}).tap();await settle(page,touch);
      assert.deepEqual(signature(await observation(page)),beforeHold,'closing long-press detail restores preview');await invariant('stationary-long-press-detail-preserved');
      await page.locator('.run-menu-toggle').tap();assert.equal(await page.locator('.run-menu-modal').evaluate(dialog=>dialog.open),true,'real menu opens');await invariant('menu-preserves-selection-and-save');
      await page.locator('.run-menu-toggle').tap();await settle(page,touch);assert.deepEqual(signature(await observation(page)),beforeHold,'closing menu preserves selection and preview');
    }

    await clear();await page.locator('canvas').focus();
    const focus=(await observation(page)).focusIndex;trace('keyboard',{keys:['ArrowRight','Space','Space','ArrowLeft','Space']});
    await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');await assertSelected(page,[ids[(focus+1)%ids.length]],'right arrow + Space selects focused card');
    await page.keyboard.press('Space');await assertSelected(page,[],'Space toggles focused card off');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Space');await assertSelected(page,[ids[focus]],'left arrow + Space selects original focused card');
    await settle(page,touch);await invariant('keyboard-arrow-space-remains');await shot('keyboard-selection');
    assert.equal(await page.evaluate(old=>{const s=window.__harness.game.scene.getScene('game');return old.hud===s.heatText&&old.cards.every((c,i)=>c===s.cardViews[i].container);},references),true,'selection preserves HUD and original hand views');
    run.checks.push({name:'selection-preserves-existing-stage-and-card-views',status:'PASS'});
    await clear();run.final=await invariant('final-complete-save-and-rng-invariant');await writeFile(path.join(dir,`${name}-after.json`),JSON.stringify(await persisted(page),null,2)+'\n');
    // The explicit detail control now owns manual reordering; test it after selection invariance.
    for(const id of [ids[0],ids[2]])await tap(id);await settle(page,touch);await invariant('detail-reorder-selection-setup');
    const reorderBefore=await persisted(page),selectedBefore=await selected(page),first=await point(page,'game','card/'+ids[0]);
    await down(first);await page.getByRole('dialog').waitFor();await up();trace('detail-right-move',{id:ids[0]});
    run.detailControls={leftEnabled:await page.getByRole('button',{name:'左移',exact:true}).isEnabled(),rightEnabled:await page.getByRole('button',{name:'右移',exact:true}).isEnabled()};
    assert.deepEqual(run.detailControls,{leftEnabled:false,rightEnabled:true},'first-card detail exposes bounded explicit reorder controls');await shot('manual-reorder-detail');
    const right=page.getByRole('button',{name:'右移',exact:true});if(touch)await right.tap();else await right.click();
    await page.waitForFunction(seq=>{const c=window.__harness.game.registry.get('runController');return c.status==='idle'&&c.state.commandSeq>seq;},reorderBefore.state.commandSeq);
    const reorderAfter=await persisted(page),expectedOrder=[ids[1],ids[0],...ids.slice(2)];
    assert.equal(reorderAfter.state.commandSeq,reorderBefore.state.commandSeq+1,'detail right move commits exactly one command');
    assert.deepEqual(reorderAfter.state.handOrder,expectedOrder,'detail right move shifts only requested card one place');
    assert.deepEqual(reorderAfter.state.rng,reorderBefore.state.rng,'detail reorder keeps all RNG streams');assert.equal(reorderAfter.state.gold,reorderBefore.state.gold,'detail reorder keeps gold');
    assert.deepEqual(reorderAfter.state.stage,reorderBefore.state.stage,'detail reorder keeps stage/resources');await assertSelected(page,selectedBefore,'detail reorder preserves selection');
    assert.equal(reorderAfter.journal.length,reorderBefore.journal.length+1,'one additional journal entry');assert.equal(reorderAfter.journal.at(-1).action.type,'ReorderHand','explicit detail move uses shared reorder command');
    const close=page.getByRole('button',{name:'关闭',exact:true});if(touch)await close.tap();else await close.click();await settle(page,touch);
    run.detailReorder={beforeCommandSeq:reorderBefore.state.commandSeq,afterCommandSeq:reorderAfter.state.commandSeq,selected:selectedBefore,handOrder:reorderAfter.state.handOrder};
    run.checks.push({name:'detail-right-move-commits-once-preserves-rng-gold-stage-selection',status:'PASS'});
    await writeFile(path.join(dir,`${name}-after-detail-reorder.json`),JSON.stringify(reorderAfter,null,2)+'\n');await shot('detail-right-move');
    assert.deepEqual(errors,[],'no browser page errors');run.status='PASS';
  }catch(error){run.status='FAIL';run.error=String(error);run.stack=error.stack;run.browserErrors=errors;run.failureObservation=await observation(page).catch(()=>null);await shot('failure').catch(()=>{});process.exitCode=1;
  }finally{await references?.dispose();await cdp?.detach();await context.close();console.log(JSON.stringify({name,status:run.status,checks:run.checks.map(c=>c.name),error:run.error}));await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');}
}

try{
  if(process.env.HAND_SELECTION_REUSE!=='1')await build({mode:'e2e',build:{outDir,emptyOutDir:true},logLevel:'warn'});
  report.bundleFiles=await Promise.all((await readdir(path.join(outDir,'assets'))).filter(file=>/\.(js|css)$/.test(file)).map(async file=>({file,sha256:digest(await readFile(path.join(outDir,'assets',file),'utf8'))})));
  server=await preview({build:{outDir},preview:{host:'127.0.0.1',port,strictPort:true}});
  browser=await chromium.launch({executablePath:report.environment.executable,args});report.environment.browser=browser.version();
  for(const spec of [{name:'desktop',viewport:{width:1280,height:800},touch:false,reducedMotion:'no-preference'},
    {name:'touch',viewport:{width:412,height:820},touch:true,reducedMotion:'no-preference'},
    {name:'touch-bars',viewport:{width:390,height:640},touch:true,reducedMotion:'reduce'}])await scenario(spec);
  report.status=report.runs.every(r=>r.status==='PASS')?'PASS':'FAIL';
}catch(error){report.status='FAIL';report.error=String(error);report.stack=error.stack;process.exitCode=1;
}finally{await browser?.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,evidence:dir}));}
