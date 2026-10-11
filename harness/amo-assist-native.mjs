/** Read-only product diagnosis. Only controlled browser saves are written by native play. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';
import {snapshotSource} from '../scripts/check-runner.mjs';

const out=process.env.AMO_NATIVE_OUTPUT??'/tmp/amo-assist-native';await mkdir(out,{recursive:true});
const frozen=snapshotSource(process.cwd());
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5598,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {r2CreateJoker,r2ScoreContext}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {r2JokerDefinitionsFor}=await server.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
const {assistCandidates}=await server.ssrLoadModule('/src/game/AssistSelection.ts');
const {previewR2Hand}=await server.ssrLoadModule('/src/domain/scoreR2.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const main=['spades-9','hearts-9','clubs-13','diamonds-13'],side=['spades-12','hearts-12','clubs-12'],hand=[...main,...side,'clubs-6'];
const command=(s,action)=>({runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
const send=(s,a)=>{const r=applyCommand(s,command(s,a));assert.ok(r.ok,r.code);return r.state;};
function arrange(s,ids){const available=s.deckInstances.map(c=>c.id).filter(id=>!s.playedPile.includes(id)&&!s.discardPile.includes(id)&&!s.destroyedIds.includes(id));assert.ok(ids.every(id=>available.includes(id)));s.handOrder=[...ids];s.drawPile=available.filter(id=>!ids.includes(id));return s;}
function fixture(hero='amo',kind='plain'){
 let s=createRun({seed:'amo-diagnosis-controlled',runId:'controlled/amo-diagnosis/'+hero+'/'+kind,rulesVersion:'r2',characterId:hero,r2Identity:newRunIdentity(hero,'group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s=send(s,{type:'LeaveShop'});s.stageIndex=6;s.chapter=3;s.shop=null;s.seenBossIds=['B01','B02','B04'];s.boss={definitionId:'B04',disabledSuit:null};s=send(s,{type:'EnterStage'});s.gold=15;
 if(hero==='azao'){const first=['spades-3','hearts-3','clubs-4','diamonds-4'];s=arrange(s,[...first,...side,'clubs-6']);s=send(s,{type:'PlayHand',selectedIds:first});assert.equal(s.phase,'await-input');assert.equal(s.stage.azaoCharge.charge,1);}
 s=arrange(s,hand);
 if(kind!=='plain'){
  const defs=kind==='held-cost'?['d01','d08']:['d01','d08','b03'];s.jokers=defs.map(id=>r2CreateJoker(id,'controlled/'+id,8,'none',s));s.stage.initialJokerIds=s.jokers.map(j=>j.instanceId);s.deckInstances.find(c=>c.id===side[2]).enhancement='voice-paper';
  if(kind==='joker-after-held')s.jokers.find(j=>j.definitionId==='b03').growth.multiplier={n:'3',d:'2'};
 }
 const cp=makeCheckpoint(s,[]),read=readCheckpoint(cp);assert.ok(read.ok,JSON.stringify(read));return s;
}
function comparisons(s){
 const cards=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)),context=r2ScoreContext(s,cards,main),definitions=r2JokerDefinitionsFor(s),candidates=assistCandidates({hand:cards,selectedIds:main,disabledIds:s.stage.disabledIds,jokers:s.jokers,definitions,handRules:context.handRules},true);
 const row=ids=>{
  const action=ids.length?{type:'PlayAssistedHand',selectedIds:main,assistIds:ids}:{type:'PlayHand',selectedIds:main},after=send(s,action),trace=after.lastTrace;
  const publicInput={rulesVersion:'r2',runId:s.runId,rootId:s.runId+'/public-check',hand:cards,selectedIds:main,...(ids.length?{assistIds:ids}:{}),disabledIds:s.stage.disabledIds,jokers:s.jokers,definitions,handLevels:s.handLevels,playIndex:s.stage.playIndex+1,handsBeforePlay:s.stage.handsLeft,previousHandType:s.stage.previousHandType,wager:s.stage.wagerSelected,...context};
  const preview=previewR2Hand(publicInput);assert.equal(preview.scoreRange.minimum,trace.finalScore);assert.equal(preview.scoreRange.maximum,trace.finalScore);
  const hero=trace.events.findIndex(e=>e.reasonKey.startsWith('amo.assist.')),lastJoker=Math.max(-1,...trace.events.flatMap((e,i)=>e.phase==='jokerScore'?[i]:[]));if(ids.length)assert.ok(hero>lastJoker);
  return {ids,kind:trace.assist?.kind??'none',multiplier:trace.assist?.multiplier??1,finalScore:trace.finalScore,H:trace.accumulator.H,M:trace.accumulator.M,sets:trace.sets,events:trace.events,heroIndex:hero,lastJokerIndex:lastJoker,publicRange:preview.scoreRange,after};
 };
 const before=JSON.stringify(s),rows=candidates.map(c=>row(c.assistIds)),unassisted=row([]);assert.equal(JSON.stringify(s),before);
 return {candidateOrder:candidates.map(c=>({ids:c.assistIds,kind:c.assistKind,multiplier:c.assistMultiplier})),rows,unassisted,best:rows.reduce((best,r)=>BigInt(r.finalScore)>BigInt(best.finalScore)?r:best)};
}
const {AssistRecommendationCache}=await server.ssrLoadModule('/src/game/AssistRecommendation.ts');
const {touyeChoice}=await server.ssrLoadModule('/src/game/TouyeWagerCopy.ts');
const cache=new AssistRecommendationCache();
const fixtures=Object.fromEntries(['plain','held-cost','joker-after-held'].map(kind=>[kind,fixture('amo',kind)]));
fixtures['no-assist']=fixture('amo','held-cost');fixtures['no-assist']=arrange(fixtures['no-assist'],[...main,...side.slice(0,2),'clubs-6','diamonds-7']);for(const id of side.slice(0,2))fixtures['no-assist'].deckInstances.find(c=>c.id===id).enhancement='voice-paper';
fixtures.random=fixture();fixtures.random.deckInstances.find(c=>c.id===main[0]).enhancement='lucky-paper';fixtures.random.jokers=[r2CreateJoker('f08','native/f08',8,'none',fixtures.random)];fixtures.random.stage.initialJokerIds=fixtures.random.jokers.map(j=>j.instanceId);
fixtures.tie=fixture();fixtures.tie=arrange(fixtures.tie,[...main,...side.slice(0,2),'clubs-6','diamonds-7']);for(const id of side.slice(0,2))fixtures.tie.deckInstances.find(c=>c.id===id).enhancement='voice-paper';
const report={base:'e48fd07a6e7b4575067dc356ad28cb0a94fe15e9',sourceBefore:frozen,scope:'Controlled validator-approved public fixtures, native mouse/touch, no natural journey or user saves, software Chromium Canvas DPR1.',cases:[],heroes:[],guards:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{
 for(const viewport of (process.env.AMO_NATIVE_BOUNDARIES?[{width:320,height:740},{width:740,height:390}]:[{width:1366,height:768},{width:390,height:740},{width:320,height:740},{width:740,height:390}])){
  const touch=viewport.width!==1366,ctx=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await ctx.newPage();p.setDefaultTimeout(15000);const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('dialog',d=>d.accept());
  const tap=name=>tapUI(p,'game',name,touch),dom=l=>touch?l.tap():l.click();
  const settle=()=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.presentation&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
  const snap=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await gameSession().storage.read()};});
  const draft=()=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return{main:[...s.selectedIds],assist:[...s.assistIds]};});
  const ui=()=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),b=o=>{const r=o.getBounds();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{role:{text:s.roleText.text,visible:s.roleText.visible,bounds:b(s.roleText)},gold:{text:s.goldText.text,bounds:b(s.goldText)},target:{text:s.heatText.text,bounds:b(s.heatText)},frame:{alpha:s.roleFrame.alpha,state:s.roleFrame.getData('abilityState'),reminder:s.roleFrame.getData('reminderState')},shortcut:s.heroActionButton?{enabled:s.heroActionButton.input.enabled,label:s.heroActionButton.getData('label').text,bounds:b(s.heroActionButton),width:s.heroActionButton.lineWidth,opacity:s.heroActionButton.strokeAlpha,reminder:s.heroActionButton.getData('reminderState')}:null,inventory:s.inventoryButton.input.enabled,status:s.statusText.text};});
  const imp=async s=>{assert.ok(readCheckpoint(makeCheckpoint(s,[])).ok);if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await dom(p.locator('.run-menu-toggle'));const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await dom(sec.locator('summary'));const event=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));await(await event).setFiles({name:'controlled-native.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});await waitScene(p,'game');await settle();assert.deepEqual((await snap()).state,s);};
  const select=async ids=>{for(const id of ids)await tap('card/'+id);await settle();};
  const close=async()=>{const d=p.locator('.detail-dialog[open]');await dom(d.locator('.dialog-close'));await p.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));};
  const shot=async name=>{const file=viewport.width+'x'+viewport.height+'-'+name+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});return file;};
  const panel=()=>p.evaluate(()=>{const d=document.querySelector('.amo-assist-dialog[open]'),b=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{bounds:b(d),text:d.innerText,scroll:{client:d.querySelector('.dialog-scroll').clientHeight,scroll:d.querySelector('.dialog-scroll').scrollHeight},summaryHeights:[...d.querySelectorAll('.amo-assist-option summary')].map(e=>b(e).height),primaryBounds:b(d.querySelector('.dialog-primary')),footerBounds:b(d.querySelector('.dialog-actions')),main:[...d.querySelectorAll('.amo-assist-main [data-card-id]')].map(e=>e.dataset.cardId),options:[...d.querySelectorAll('.amo-assist-option')].map(e=>({ids:e.dataset.ids,chosen:e.dataset.chosen,recommended:e.classList.contains('is-recommended'),cards:[...e.querySelectorAll('[data-card-id]')].map(c=>c.dataset.cardId),button:b(e.querySelector('button')),title:e.querySelector('h3').textContent,detail:e.querySelector('details').textContent})),primary:d.querySelectorAll('.dialog-primary').length,footer:[...d.querySelectorAll('.dialog-actions button')].map(e=>e.textContent)};});
  try{
   await p.goto('http://127.0.0.1:5598/?harness=1');await waitScene(p,'title');
   for(const kind of viewport.width===1366||viewport.width===390?Object.keys(fixtures):['plain','held-cost']){
    const initial=fixtures[kind],rec=cache.get(initial,main);await imp(initial);const before=await snap();await select(main);const row={viewport,kind,before,recommendation:rec};report.cases.push(row);row.table=await ui();assert.equal(row.table.role.visible,true);assert.ok(row.table.shortcut.bounds.width>=44);if(viewport.width===390||viewport.width===320){const a=row.table.role.bounds,b=row.table.gold.bounds;assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);assert.ok(row.table.role.bounds.y+row.table.role.bounds.height<=row.table.target.bounds.y);}row.tableShot=await shot(kind+'-table');
    await tap('hero/action-shortcut');assert.deepEqual((await draft()).assist,rec.best.ids);assert.deepEqual(await snap(),before);row.quick=await draft();row.quickShot=await shot(kind+'-quick');
    if(rec.best.ids.length){await tap('hero/action-shortcut');assert.deepEqual((await draft()).assist,[]);assert.deepEqual(await snap(),before);}else assert.match((await ui()).status,/不助攻/);
    await tap('selection/assist-change');await p.locator('.amo-assist-dialog[open]').waitFor();row.panel=await panel();assert.equal(row.panel.primary,1);assert.deepEqual(row.panel.main,main);assert.deepEqual(row.panel.footer,['返回选牌']);assert.equal(row.panel.options[0].ids,rec.best.ids.join('|'));assert.ok(row.panel.bounds.x>=0&&row.panel.bounds.y>=0&&row.panel.bounds.x+row.panel.bounds.width<=viewport.width&&row.panel.bounds.y+row.panel.bounds.height<=viewport.height);assert.ok(row.panel.options.every(o=>o.button.height>=44));assert.ok(row.panel.summaryHeights.every(h=>h>=44));assert.ok(row.panel.primaryBounds.y+row.panel.primaryBounds.height<=row.panel.footerBounds.y);row.panelShot=await shot(kind+'-panel');await dom(p.locator('.amo-assist-option.is-recommended summary'));assert.ok(await p.locator('.amo-assist-option.is-recommended details').evaluate(e=>e.open));row.scoreDetailShot=await shot(kind+'-score-detail');await dom(p.locator('.amo-assist-option.is-recommended summary'));assert.deepEqual(await snap(),before);await close();assert.deepEqual(await snap(),before);
    // Deliberately choose a non-recommended group; refresh and opening/cancel preserve it.
    const manual=rec.options.find(o=>o.ids.length&&o.ids.join('|')!==rec.best.ids.join('|'))??rec.options.find(o=>o.ids.length);
    await tap('selection/assist-change');await dom(p.locator('.amo-assist-option[data-ids="'+manual.ids.join('|')+'"]').locator('button'));assert.deepEqual((await draft()).assist,manual.ids);await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.aiCandidates.result?.status==='ready';});assert.deepEqual((await draft()).assist,manual.ids);assert.deepEqual(await snap(),before);
    row.manual=await draft();await tap('selection/assist-change');await p.locator('.amo-assist-option').last().scrollIntoViewIfNeeded();row.otherGroupsShot=await shot(kind+'-other-groups');await close();assert.deepEqual((await draft()).assist,manual.ids);
    await tap('hero/action-shortcut');assert.deepEqual((await draft()).assist,[]);
    if((viewport.width===1366||viewport.width===390)&&!process.env.AMO_NATIVE_LAYOUT_ONLY){
     // Re-import prevents sort order from changing the command/state oracle.
     await imp(initial);await select(main);await tap('hero/action-shortcut');const chosen=await draft(),expected=send(initial,chosen.assist.length?{type:'PlayAssistedHand',selectedIds:main,assistIds:chosen.assist}:{type:'PlayHand',selectedIds:main});await tap('action/play');await settle();row.after=await snap();assert.deepEqual(row.after.state,expected);assert.equal(row.after.journal.length,1);assert.deepEqual(row.after.storage.current.state,expected);row.actualFinal=expected.lastTrace.finalScore;assert.ok(BigInt(row.actualFinal)>=BigInt(rec.best.range.minimum)&&BigInt(row.actualFinal)<=BigInt(rec.best.range.maximum));
    }
    row.status='PASS';console.log(viewport.width,kind,'PASS');
   }
   if((viewport.width===1366||viewport.width===390)&&!process.env.AMO_NATIVE_LAYOUT_ONLY){
    for(const hero of ['amo','erxiang','laohuan','touye','xiemu','azao']){
     const s=fixture(hero);await imp(s);const before=await snap();const row={viewport,hero,states:[]};report.heroes.push(row);row.states.push({name:'needs-selection',ui:await ui()});row.needsShot=await shot(hero+'-needs-selection');await select(main);row.availableShot=await shot(hero+'-available');row.states.push({name:'available',ui:await ui()});assert.equal(row.states.at(-1).ui.shortcut.reminder,'static');
     await p.emulateMedia({reducedMotion:'no-preference'});await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');window.__samples=[];window.__start=performance.now();window.__sampler=()=>window.__samples.push({at:performance.now()-window.__start,opacity:s.heroActionButton.strokeAlpha,reminder:s.heroActionButton.getData('reminderState')});s.game.events.on('poststep',window.__sampler);});await p.waitForFunction(()=>performance.now()-window.__start>4100);row.samples=await p.evaluate(()=>{window.__harness.game.events.off('poststep',window.__sampler);return window.__samples;});assert.ok(Math.min(...row.samples.map(x=>x.opacity))<.72);assert.ok(Math.max(...row.samples.map(x=>x.opacity))>.98);await p.emulateMedia({reducedMotion:'reduce'});
     if(hero==='amo'){await tap('hero/action-shortcut');row.states.push({name:'chosen',ui:await ui()});row.chosenShot=await shot(hero+'-chosen');await tap('selection/assist-change');}
     else {await tap('hero/action-shortcut');}
     await p.waitForFunction(()=>!!document.querySelector('.detail-dialog[open]')&&window.__harness.game.scene.getScene('game').heroActionButton.getData('reminderState')==='paused');row.states.push({name:'dialog-paused',ui:await ui()});assert.equal(row.states.at(-1).ui.shortcut.reminder,'paused');row.panelShot=await shot(hero+'-entry');
     if(hero==='erxiang'||hero==='xiemu'||hero==='azao'){const chosen=p.locator('.dialog-choice-actions button:not([disabled])').first();await dom(chosen);await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').heroActionButton.getData('reminderState')==='chosen');row.states.push({name:'chosen',ui:await ui()});assert.equal(row.states.at(-1).ui.shortcut.reminder,'chosen');row.chosenShot=await shot(hero+'-chosen');}else await close();assert.deepEqual(await snap(),before);
     let used;
     if(hero==='amo')used=send(s,{type:'PlayAssistedHand',selectedIds:main,assistIds:side.slice(0,2)});
     if(hero==='erxiang')used=send(s,{type:'PlayHand',selectedIds:main,erxiangTargetId:main[0]});
     if(hero==='xiemu')used=send(s,{type:'PlayHand',selectedIds:main,xiemuBurn:10});
     if(hero==='azao')used=send(s,{type:'PlayHand',selectedIds:main,azaoRelease:true});
     if(hero==='laohuan'){const pending=send(s,{type:'DiscardHand',selectedIds:['clubs-6'],laohuanTrick:true});await imp(pending);row.states.push({name:'pending-candidates',ui:await ui()});row.pendingShot=await shot(hero+'-pending');assert.equal(row.states.at(-1).ui.inventory,false);used=send(pending,{type:'ChooseRefill',selectedIds:pending.pendingRefill.candidateIds.slice(0,pending.pendingRefill.required)});}
     if(hero==='touye'){const ids=['clubs-6'],copy=touyeChoice(s,ids),target=copy.choices.find(c=>c.available).target;used=send(s,{type:'DiscardHand',selectedIds:ids,touyeBet:{target,snapshotToken:copy.snapshotToken}});await imp(used);row.states.push({name:'pending-wager',ui:await ui()});row.pendingShot=await shot(hero+'-pending');used=send(used,{type:'PlayHand',selectedIds:[used.handOrder[0]]});}
     await imp(used);row.states.push({name:hero==='azao'?'released-empty':'used',ui:await ui()});assert.equal(row.states.at(-1).ui.shortcut.enabled,false);row.usedShot=await shot(hero+'-used');if(hero==='laohuan'){assert.equal(row.states.at(-1).ui.inventory,true);const saved=await snap();await tap('action/tool-inventory');await close();assert.deepEqual(await snap(),saved);}row.status='PASS';console.log(viewport.width,hero,'hero PASS');
    }
    await imp(fixtures.plain);await select(main);await tap('hero/action-shortcut');const saveBefore=await snap(),saveDraft=await draft(),saveExpected=send(fixtures.plain,{type:'PlayAssistedHand',selectedIds:main,assistIds:saveDraft.assist});
    await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();window.__originalCommit=s.storage.commit.bind(s.storage);window.__writes=0;s.storage.commit=(...args)=>{window.__writes++;return new Promise((resolve,reject)=>{window.__reject=()=>reject(new DOMException('controlled quota','QuotaExceededError'));});};});
    await tap('action/play');await p.waitForFunction(()=>window.__writes===1);const saving={viewport,name:'saving-duplicate',ui:await ui(),before:saveBefore};await tap('action/play');await tap('hero/action-shortcut');assert.equal(await p.evaluate(()=>window.__writes),1);assert.deepEqual(await snap(),saveBefore);saving.after=await snap();report.guards.push(saving);assert.equal(saving.ui.shortcut.reminder,'paused');
    await p.evaluate(()=>window.__reject());await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused'&&!window.__harness.game.scene.getScene('game').playing);if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));const paused={viewport,name:'paused-inspection',ui:await ui(),before:saveBefore};await tap('hero/action-shortcut');assert.deepEqual(await snap(),saveBefore);await tap('action/tool-inventory');await close();assert.deepEqual(await snap(),saveBefore);assert.equal(await p.evaluate(()=>window.__writes),1);paused.after=await snap();paused.shot=await shot('paused');report.guards.push(paused);assert.equal(paused.ui.inventory,true);assert.equal(paused.ui.shortcut.reminder,'paused');
    await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts');gameSession().storage.commit=window.__originalCommit;});await dom(p.locator('.run-menu-toggle'));await dom(p.getByRole('button',{name:'重试保存',exact:true}));await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='idle');if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await settle();const retried=await snap();assert.deepEqual(retried.state,saveExpected);assert.equal(retried.journal.length,1);report.guards.push({viewport,name:'retry-once',after:retried});
    // Old dialog callback is exercised after actual lease loss; no save write.
    await imp(fixtures.plain);await select(main);const lockedBefore=await snap();await tap('selection/assist-change');await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts');const s=gameSession();window.__writes=0;window.__originalCommit=s.storage.commit.bind(s.storage);s.storage.commit=(...args)=>{window.__writes++;return window.__originalCommit(...args);};s.lease.drop();});await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='readonly');const guard={viewport,name:'readonly-old-dialog',ui:await ui(),before:lockedBefore};if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await dom(p.locator('.amo-assist-option.is-recommended button'));assert.deepEqual((await draft()).assist,[]);assert.deepEqual(await snap(),lockedBefore);assert.equal(await p.evaluate(()=>window.__writes),0);guard.after=await snap();guard.shot=await shot('readonly');report.guards.push(guard);
   }
   assert.deepEqual(errors,[]);
  }finally{await ctx.close();}
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack??String(e);process.exitCode=1;}
finally{report.sourceAfter=snapshotSource(process.cwd());report.sourceUnchanged=JSON.stringify(frozen)===JSON.stringify(report.sourceAfter);assert.ok(report.sourceUnchanged);await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.length,heroes:report.heroes.length,guards:report.guards.length,sourceUnchanged:report.sourceUnchanged}));}
