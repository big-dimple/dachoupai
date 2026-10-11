/** Read-only product diagnosis. Only controlled browser saves are written by native play. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';
import {snapshotSource} from '../scripts/check-runner.mjs';

const out=process.env.AMO_DIAG_OUTPUT??'/tmp/amo-assist-diagnosis';await mkdir(out,{recursive:true});
const frozen=snapshotSource(process.cwd());
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5597,strictPort:true},logLevel:'error'});await server.listen();
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
const fixtures=Object.fromEntries(['plain','held-cost','joker-after-held'].map(kind=>[kind,fixture('amo',kind)]));
const report={base:'e48fd07a6e7b4575067dc356ad28cb0a94fe15e9',sourceBefore:frozen,scope:'Bounded controlled stage-seven validator-approved native imports. PC mouse and portrait touch, software Chromium Canvas DPR1. No natural journey, user save, product edits, C2 integration, remote API, merge or deployment.',comparisons:Object.fromEntries(Object.entries(fixtures).map(([kind,s])=>[kind,{state:s,...comparisons(s)}])),cases:[],heroChecks:[]};
assert.equal(report.comparisons.plain.best.kind,'three-kind');assert.equal(report.comparisons['held-cost'].best.kind,'pair');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{
 for(const viewport of [{width:1366,height:768},{width:390,height:740}]){
  const touch=viewport.width===390,context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'no-preference'}),p=await context.newPage();p.setDefaultTimeout(18000);const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('dialog',d=>d.accept());
  const tap=name=>tapUI(p,'game',name,touch),dom=async l=>touch?l.tap():l.click();
  const settle=()=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.presentation&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
  const snap=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await gameSession().storage.read()};});
  const draft=()=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {main:[...s.selectedIds],assist:[...s.assistIds],type:s.selectionPreview()?.type,held:s.selectionPreview()?.heldIds};});
  const ui=()=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),all=walk(s.children.list),box=o=>{const b=o.getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height};};return {roleText:{text:s.roleText.text,visible:s.roleText.visible,bounds:box(s.roleText)},frame:{bounds:box(s.roleFrame),alpha:s.roleFrame.alpha,lineWidth:s.roleFrame.lineWidth,opportunity:s.roleFrame.getData('abilityOpportunity'),abilityState:s.roleFrame.getData('abilityState'),reminderState:s.roleFrame.getData('reminderState')},shortcut:s.heroActionButton?{name:s.heroActionButton.name,label:s.heroActionButton.getData('label').text,enabled:s.heroActionButton.input.enabled,bounds:box(s.heroActionButton),alpha:s.heroActionButton.alpha}:null,avatar:box(s.roleAvatar),assistButtons:all.filter(o=>o.input&&o.name?.startsWith('selection/assist-')).map(o=>({name:o.name,enabled:o.input.enabled,bounds:box(o),label:o.getData('label')?.text})),assistCopy:all.filter(o=>o.name==='selection/assist-copy').map(o=>({text:o.text,full:o.getData('fullText'),bounds:box(o)})),status:s.statusText.text};});
  const dialog=()=>p.evaluate(()=>{const d=document.querySelector('.detail-dialog[open]'),b=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};};return {title:d.getAttribute('aria-label'),classes:d.className,bounds:b(d),content:b(d.querySelector('.dialog-content')),copy:b(d.querySelector('.dialog-copy')),text:d.innerText,choices:d.querySelectorAll('.dialog-choice-actions button').length,cards:d.querySelectorAll('.experience-card').length,buttons:[...d.querySelectorAll('button')].map(e=>({text:e.textContent,disabled:e.disabled,bounds:b(e),inFooter:!!e.closest('.dialog-actions')})),body:b(d.querySelector('.dialog-body')??d.querySelector('.card-rules'))};});
  const shot=async name=>{await p.screenshot({path:out+'/'+viewport.width+'-'+name+'.png',scale:'css'});return viewport.width+'-'+name+'.png';};
  const close=async(label)=>{await dom(p.getByRole('button',{name:label,exact:true}));await p.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));};
  const imp=async s=>{const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok);await dom(p.locator('.run-menu-toggle'));const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await dom(sec.locator('summary'));const event=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));await(await event).setFiles({name:'controlled-amo-diagnosis.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(p,'game');await settle();assert.deepEqual((await snap()).state,s);};
  try{
   await p.goto('http://127.0.0.1:5597/?harness=1');await waitScene(p,'title');
   for(const kind of ['plain','held-cost']){
    await imp(fixtures[kind]);const row={viewport,kind,before:await snap(),checks:[]};report.cases.push(row);for(const id of main)await tap('card/'+id);await settle();row.table=await ui();row.tableShot=await shot(kind+'-table-before');
    await tap('hero/action-shortcut');row.dialog=await dialog();row.dialogShot=await shot(kind+'-dialog-before');assert.equal(row.dialog.choices,0);assert.ok(row.dialog.buttons.slice(0,-1).every(b=>b.inFooter));assert.deepEqual(await snap(),row.before);await close('返回选牌');
    const first=report.comparisons[kind].rows[0],triple=report.comparisons[kind].rows.find(r=>r.kind==='three-kind');await tap('selection/assist-'+first.ids.join('+'));row.quickDraft=await draft();assert.deepEqual(row.quickDraft.assist,first.ids);assert.deepEqual(await snap(),row.before);await tap('selection/assist-'+first.ids.join('+'));assert.deepEqual((await draft()).assist,[]);assert.deepEqual(await snap(),row.before);row.checks.push('first visible table assist drafts pair then cancels without state/journal/storage change; no automatic highest-score selection');
    if(kind==='plain'){
     await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');window.__heroSamples=[];window.__heroStart=performance.now();window.__heroSampler=()=>{window.__heroSamples.push({at:performance.now()-window.__heroStart,frame:s.roleFrame.alpha,shortcut:s.heroActionButton.alpha,reminder:s.roleFrame.getData('reminderState')});};s.game.events.on('poststep',window.__heroSampler);});await p.waitForFunction(()=>performance.now()-window.__heroStart>4200);row.reminder=await p.evaluate(()=>{window.__harness.game.events.off('poststep',window.__heroSampler);return window.__heroSamples;});assert.ok(Math.min(...row.reminder.map(s=>s.frame))<.72);assert.ok(Math.max(...row.reminder.map(s=>s.frame))>.98);assert.ok(row.reminder.every(s=>s.shortcut===1));
    }
    await p.emulateMedia({reducedMotion:'reduce'});
    row.native=[];
    for(const chosen of [first,triple]){
     if(row.native.length){await imp(fixtures[kind]);for(const id of main)await tap('card/'+id);await settle();}
     const nativeBefore=await snap();
     await tap('hero/action-shortcut');const text=chosen.ids.map(id=>({spades:'♠',hearts:'♥',clubs:'♣',diamonds:'♦'})[fixtures[kind].deckInstances.find(c=>c.id===id).suit]);const exact=chosen.ids.map((id,i)=>'Q'+text[i]).join(' ')+' · 助攻 ×'+chosen.multiplier;await dom(p.getByRole('button',{name:exact,exact:true}));assert.deepEqual((await draft()).assist,chosen.ids);const drafted=await snap();assert.deepEqual(drafted,nativeBefore);
     const chosenDraft=await draft();await tap('action/play');await settle();const after=await snap();assert.deepEqual(after.state,chosen.after);assert.equal(after.journal.filter(c=>c.action.type==='PlayAssistedHand').length,1);assert.deepEqual(after.storage.current.state,after.state);row.native.push({assist:chosen.ids,finalScore:after.state.lastTrace.finalScore,draft:chosenDraft,before:drafted,after});
    }
    await p.emulateMedia({reducedMotion:'no-preference'});row.checks.push('native pair and triple plays each match complete canonical state and actual finalScore, one saved command each');row.status='PASS';console.log(viewport.width,kind,'PASS');
   }
   // Six current hero entry/readiness routes. No hero skill effect submission here.
   for(const hero of ['amo','erxiang','laohuan','touye','xiemu','azao']){
    const s=fixture(hero);await imp(s);const saved=await snap(),before=await ui();for(const id of main)await tap('card/'+id);await settle();const selected=await ui();await tap('hero/action-shortcut');const opened=await dialog();await close('返回选牌'===opened.buttons.at(-1).text?'返回选牌':'返回牌桌');assert.deepEqual(await snap(),saved);report.heroChecks.push({viewport,hero,before,selected,dialog:opened,saveUnchanged:true});
   }
   assert.deepEqual(errors,[]);
  }finally{await context.close();}
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack??String(e);process.exitCode=1;}
finally{report.sourceAfter=snapshotSource(process.cwd());report.sourceUnchanged=JSON.stringify(frozen)===JSON.stringify(report.sourceAfter);assert.ok(report.sourceUnchanged);await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.map(c=>({viewport:c.viewport,kind:c.kind,status:c.status})),heroChecks:report.heroChecks.length,sourceUnchanged:report.sourceUnchanged}));}
