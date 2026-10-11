// Run from the repository root. A bounded evidence export, never a seed search or full game.
import {createServer} from 'vite';
import {writeFileSync} from 'node:fs';
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
try {
  const paths=['domain/scoreR2','domain/r2Run','domain/run','game/RunLaunch','domain/r2ContentProfiles','domain/r2GroupUpgrade','application/checkpoint','application/SavedRun','core/SeededRng','domain/r2Chapter','domain/r2Shop','domain/hash'];
  const [scores,domain,run,launch,content,identity,checkpoint,saved,rng,chapter,shop,hash]=await Promise.all(paths.map(p=>server.ssrLoadModule('/src/'+p+'.ts')));
  const id={contentVersion:identity.R2_ROUTE_GROWTH_VERSION,contentHash:identity.R2_ROUTE_GROWTH_HASH},before={clears:14,G:14,S:14,F:14};
  const suits=['spades','hearts','clubs','diamonds'];
  const cards=(ranks,paper,same)=>ranks.map((rank,i)=>({id:'p/'+i,rank,suit:same?'hearts':suits[i%4],...(i<paper?{enhancement:'multiplier-paper'}:{})}));
  const make=(definitionId,growth={})=>{
    const j=domain.r2CreateJoker(definitionId,definitionId,shop.r2Price(definitionId,undefined,id),undefined,id);
    return {...j,growth:{...j.growth,...growth}};
  };
  const definitions=content.r2JokerDefinitionsFor(id);
  const resolve=(hand,jokers,tag)=>{
    const input={rulesVersion:'r2',runId:'c2-finite',rootId:tag,characterId:'neutral',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers,definitions,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:new rng.SeededRng('finite').snapshot(),amoScoreTiming:'assist-v1',routeGrowth:before};
    const trace=scores.scoreR2Hand(input);
    return {input:{...input,definitions:'R2_ROUTE_GROWTH_JOKERS'},trace};
  };
  const routes=[
    {route:'G',inputs:[12,11,10,9].map((r,i)=>cards([r,r],i<2?2:1,false)),owned:[make('b10',{heat:{n:'100',d:'1'}}),make('mantangcai')],bare:[make('b10',{heat:{n:'100',d:'1'}})]},
    {route:'S',inputs:[3,4,5,6].map((r,i)=>cards([r,r+1,r+2,r+3,r+4],i<2?2:1,false)),owned:[make('c04',{heat:{n:'100',d:'1'}})],bare:[]},
    {route:'F',inputs:[[2,5,8,10,13],[14,2,3,10,13],[2,4,6,8,10],[2,3,6,7,10]].map((r,i)=>cards(r,i<2?2:1,true)),owned:[make('c06',{multiplier:{n:'6',d:'1'}})],bare:[]},
  ];
  const capacity=routes.map(({route,inputs,owned,bare})=>({route,kind:'four-independent-hands-not-post-win-play',before,hands:inputs.map((hand,i)=>({owned:resolve(hand,owned,route+'/'+i+'/owned'),soldStarter:resolve(hand,bare,route+'/'+i+'/sold')}))}));
  const actionLog=[];
  const dispatch=(state,action)=>{
    const command={runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action};
    const result=run.applyCommand(state,command);if(!result.ok)throw Error(result.code);
    actionLog.push(command);return result.state;
  };
  let state=run.createRun({seed:'c2-bounded',runId:'c2-bounded',characterId:'amo',rulesVersion:'r2',r2Identity:launch.newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  // Explicit controlled fixture: mature b10 and enhanced pairs are planted.
  // Only subsequent clear counts, source snapshots and transactions are evidence.
  state.jokers=['mantangcai','b10'].map(d=>domain.r2CreateJoker(d,d,shop.r2Price(d,undefined,state),undefined,state));
  state=dispatch(dispatch(state,{type:'LeaveShop'}),{type:'EnterStage'});
  const prepare=state=>{
    const core=['spades-9','hearts-9'];
    for(const cid of core)state.deckInstances.find(c=>c.id===cid).enhancement='multiplier-paper';
    state.jokers[1].growth.heat={n:'100',d:'1'};
    const available=state.deckInstances.filter(c=>!state.playedPile.includes(c.id)&&!state.discardPile.includes(c.id)&&!state.destroyedIds.includes(c.id));
    state.handOrder=[...core,...available.filter(c=>!core.includes(c.id)).slice(0,state.stage.handLimit-core.length).map(c=>c.id)];
    state.drawPile=available.map(c=>c.id).filter(cid=>!state.handOrder.includes(cid));
    state.stage.disabledIds=state.stage.boss?chapter.r2DisabledCards(state.stage.boss,state.stage.index,state.handOrder.map(cid=>state.deckInstances.find(c=>c.id===cid))):[];
    domain.assertR2Invariants(state);return state;
  };
  const clearCheckpoints=[];let firstBefore;
  for(let n=1;n<=5;n++){
    if(n>1)state=dispatch(dispatch(dispatch(state,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});
    state=prepare(state);if(n===1)firstBefore=structuredClone(state);
    state=dispatch(state,{type:'PlayHand',selectedIds:['spades-9','hearts-9']});
    if(state.phase!=='stage-cleared')throw Error('controlled-clear-failed-'+n);
    const cp=checkpoint.makeCheckpoint(state,actionLog),restored=checkpoint.readCheckpoint(cp);
    if(!restored.ok)throw Error(restored.code);clearCheckpoints.push(cp);
  }
  class Store {
    slots={revision:0,current:null,previous:null};fail=false;
    async read(){return structuredClone(this.slots);}
    async commit(rev,current,previous){
      if(this.fail)throw new DOMException('quota','QuotaExceededError');
      if(rev!==this.slots.revision)throw Error('write-conflict');
      this.slots={revision:rev+1,current:structuredClone(current),previous:structuredClone(previous)};return this.slots.revision;
    }
  }
  const store=new Store(),savedRun=await saved.SavedRun.start(store,firstBefore,store.slots),storageBefore=structuredClone(store.slots),stateBefore=structuredClone(savedRun.state);
  const command={runId:firstBefore.runId,commandId:firstBefore.runId+'/command/'+(firstBefore.commandSeq+1),expectedSeq:firstBefore.commandSeq,action:{type:'PlayHand',selectedIds:['spades-9','hearts-9']}};
  store.fail=true;
  const failed=await savedRun.submit(command),failedState=structuredClone(savedRun.state),failedStorage=structuredClone(store.slots),pending=JSON.parse(savedRun.exportJSON());
  if(failed.ok||JSON.stringify(stateBefore)!==JSON.stringify(failedState)||JSON.stringify(storageBefore)!==JSON.stringify(failedStorage)||!checkpoint.readCheckpoint(pending).ok)throw Error('atomic-save-failed');
  store.fail=false;
  const retried=await savedRun.retry();if(!retried.ok)throw Error('retry-failed');
  const afterRetry=JSON.parse(savedRun.exportJSON()),duplicate=await savedRun.submit(command);
  if(!duplicate.ok||!duplicate.duplicate||JSON.stringify(pending)!==JSON.stringify(afterRetry))throw Error('duplicate-or-retry-failed');
  const evidence={kind:'controlled-software-evidence-not-natural-gameplay',base:'6d2d954d1b41cddf632dfdce86fb75374e8f7e54',identity:id,capacity,controlledClearCheckpoints:clearCheckpoints,atomicSave:{command,stateBefore,storageBefore,failedState,failedStorage,pending,afterRetry,storageAfter:store.slots,duplicate}};
  writeFileSync('docs/production/evidence/route-growth-c2-2026-10-11/scorer-and-save.json',JSON.stringify(evidence,null,2)+'\n');
  // The independent review's exact bounded anomaly, preserving its actual
  // commands/receipts while altering only the earlier type and family.
  let recovery=run.createRun({seed:'review',runId:'review',characterId:'amo',rulesVersion:'r2',r2Identity:id,openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  const recoveryJournal=[],apply=action=>{const command={runId:recovery.runId,commandId:recovery.runId+'/command/'+(recovery.commandSeq+1),expectedSeq:recovery.commandSeq,action};const result=run.applyCommand(recovery,command);if(!result.ok)throw Error(result.code);recovery=result.state;recoveryJournal.push(command);};
  const arrange=ids=>{const available=recovery.deckInstances.filter(c=>!recovery.playedPile.includes(c.id)&&!recovery.discardPile.includes(c.id)&&!recovery.destroyedIds.includes(c.id));recovery.handOrder=[...ids,...available.filter(c=>!ids.includes(c.id)).slice(0,recovery.stage.handLimit-ids.length).map(c=>c.id)];recovery.drawPile=available.map(c=>c.id).filter(id=>!recovery.handOrder.includes(id));};
  apply({type:'LeaveShop'});apply({type:'EnterStage'});
  for(const cid of ['clubs-14','diamonds-14'])Object.assign(recovery.deckInstances.find(c=>c.id===cid),{enhancement:'multiplier-paper',edition:'polychrome'});
  for(const selectedIds of [['spades-12','hearts-12'],['clubs-3']]){arrange(selectedIds);apply({type:'PlayHand',selectedIds});}
  const recoveryBefore=checkpoint.makeCheckpoint(recovery,recoveryJournal),forged=structuredClone(recoveryBefore);
  forged.state.stage.routeGrowth.handTypes[0]='flush';forged.state.stage.routeGrowth.eligible=['F'];const {checksum:_,...forgedPayload}=forged;forged.checksum=hash.stableHash(forgedPayload);
  const forgedRead=checkpoint.readCheckpoint(forged);if(forgedRead.ok)throw Error('forged-earlier-family-accepted');
  const originalRead=checkpoint.readCheckpoint(recoveryBefore);if(!originalRead.ok)throw Error(originalRead.code);recovery=originalRead.checkpoint.state;
  for(const cid of ['clubs-14','diamonds-14']){arrange([cid]);apply({type:'PlayHand',selectedIds:[cid]});}
  const recoveryAfter=checkpoint.makeCheckpoint(recovery,recoveryJournal);
  if(recovery.stage.heat!=='411'||recovery.routeGrowth.G!==1||recovery.routeGrowth.F!==0||!checkpoint.readCheckpoint(recoveryAfter).ok)throw Error('legitimate-mixed-recovery-failed');
  const oldSource=structuredClone(recovery.stage.routeGrowth.sources[0]),oldEntry=structuredClone(recovery.stage.routeGrowth.entry);
  apply({type:'OpenShop'});apply({type:'LeaveShop'});apply({type:'EnterStage'});
  for(const selectedIds of [['spades-2','hearts-3'],['clubs-4'],['diamonds-5']]){arrange(selectedIds);apply({type:'PlayHand',selectedIds});}
  const crossBefore=checkpoint.makeCheckpoint(recovery,recoveryJournal);
  if(recovery.phase!=='await-input'||recovery.stage.routeGrowth.eligible.length||!checkpoint.readCheckpoint(crossBefore).ok)throw Error('legitimate-next-stage-failed');
  const reuseOldSource=(cp,oldBoundary=false)=>{const bad=structuredClone(cp);bad.state.stage.routeGrowth.sources[0]=structuredClone(oldSource);bad.state.stage.routeGrowth.handTypes[0]='pair';bad.state.stage.routeGrowth.eligible=['G'];if(oldBoundary)bad.state.stage.routeGrowth.entry=structuredClone(oldEntry);const {checksum,...payload}=bad;bad.checksum=hash.stableHash(payload);return bad;};
  const crossForged=reuseOldSource(crossBefore),crossForgedRead=checkpoint.readCheckpoint(crossForged),crossOldEntry=reuseOldSource(crossBefore,true),crossOldEntryRead=checkpoint.readCheckpoint(crossOldEntry);
  if(crossForgedRead.ok||crossOldEntryRead.ok)throw Error('prior-stage-source-or-boundary-accepted');
  const journalRecoveryChecks=[{kind:'empty',log:[]},{kind:'last-command-only',log:[recoveryJournal.at(-1)]}].map(({kind,log})=>{
    const cp=checkpoint.makeCheckpoint(recovery,log),legitimate=checkpoint.readCheckpoint(cp),sourceRead=checkpoint.readCheckpoint(reuseOldSource(cp)),entryRead=checkpoint.readCheckpoint(reuseOldSource(cp,true));
    if(!legitimate.ok||sourceRead.ok||entryRead.ok)throw Error('journal-boundary-recovery-failed-'+kind);
    return {kind,legitimateAccepted:true,forgedSourceRead:sourceRead,forgedOldEntryRead:entryRead};
  });
  const selectedIds=['clubs-14','clubs-3','clubs-6','clubs-10','clubs-13'];arrange(selectedIds);apply({type:'PlayHand',selectedIds});
  const crossAfter=checkpoint.makeCheckpoint(recovery,recoveryJournal);
  if(recovery.phase!=='stage-cleared'||recovery.routeGrowth.clears!==2||recovery.routeGrowth.G!==1||recovery.routeGrowth.F!==1||!checkpoint.readCheckpoint(crossAfter).ok)throw Error('legitimate-next-stage-F-clear-failed');
  const crossStage={oldSource,oldEntry,before:crossBefore,forged:crossForged,forgedRead:crossForgedRead,forgedOldEntry:crossOldEntry,forgedOldEntryRead:crossOldEntryRead,journalRecoveryChecks,after:crossAfter};
  writeFileSync('docs/production/evidence/route-growth-c2-2026-10-11/p2-recovery.json',JSON.stringify({kind:'bounded-anomalous-import-not-natural-gameplay',identity:id,before:recoveryBefore,forged,forgedRead,after:recoveryAfter,crossStage,assertions:{checksumRecomputed:true,originalJournalAndReceiptsPreserved:true,forgedEarlierFamilyRejected:true,priorStageSourceRejected:true,priorStageEntryRejected:true,legitimateHeat:'411',legitimateGrowth:{clears:1,G:1,S:0,F:0},legitimateNextClearGrowth:{clears:2,G:1,S:0,F:1}}},null,2)+'\n');
  console.log(JSON.stringify({identity:id,capacities:capacity.map(r=>({route:r.route,owned:r.hands.map(h=>h.owned.trace.finalScore),sold:r.hands.map(h=>h.soldStarter.trace.finalScore)})),clears:clearCheckpoints.map(c=>({N:c.state.routeGrowth.G,before:c.state.lastTrace.routeGrowth.before.G,factor:c.state.lastTrace.routeGrowth.factors.G,score:c.state.lastTrace.finalScore})),atomicSave:'failed-state-and-storage-unchanged-retry-identical-duplicate-once',p2:{forgedRead,legitimateHeat:'411',G:1,F:0,crossForgedRead,crossOldEntryRead,journalRecoveryChecks,legitimateNextClearGrowth:{clears:2,G:1,S:0,F:1}}}));
} finally {await server.close();}
