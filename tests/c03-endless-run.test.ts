import {describe,expect,it} from 'vitest';
import {applyCommand,assertRunInvariants,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {getR2Stage,r2CreateJoker,R2_LEGACY_CONTENT_VERSION,R2_LEGACY_CONTENT_HASH} from '../src/domain/r2Run';
import {r2ToolAcquisitionPool} from '../src/domain/r2Shop';

const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`endless/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const send=(state:R2RunState,action:Action):R2RunState=>{
  const result=applyCommand(state,command(state,action));
  expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)throw Error(result.code);
  assertRunInvariants(result.state);return result.state;
};
const continueAction:Action={type:'ContinueEndless'};
const reject=(state:R2RunState,action:Action,code:string)=>{
  const before=stateHash(state),rng=structuredClone(state.rng),result=applyCommand(state,command(state,action));
  expect(result.ok).toBe(false);if(result.ok)return;
  expect(result.code).toBe(code);expect(result.state).toBe(state);expect(stateHash(state)).toBe(before);expect(state.rng).toEqual(rng);
};

function finalBoss(legacy=false):R2RunState {
  const state=createRun({seed:'c03-endless-final',runId:'c03-endless',characterId:'erxiang',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  // Explicit valid late checkpoint. It tests commands, not natural acquisition or balance.
  state.chapter=8;state.stageIndex=23;state.phase='stage-ready';state.shop!.visitIndex=23;
  state.seenBossIds=['B01','B02','B03','B04','B05','B06','B07','B15'];state.boss={definitionId:'B15',disabledSuit:null};
  const suits=['spades','hearts','clubs','diamonds'] as const;
  state.deckInstances=Array.from({length:24},(_,i)=>({id:`ace/${i}`,rank:14 as const,suit:suits[i%4]}));
  state.drawPile=state.deckInstances.map(card=>card.id);state.handLevels={'five-kind':30,'flush-five':30};
  state.jokers=['pengci','f06','e11','e10','f12'].map(id=>r2CreateJoker(id,`owned/${id}`,9,'polychrome'));
  state.jokers.find(joker=>joker.definitionId==='e10')!.counters={stageClears:1};
  state.consumables=[{instanceId:'held/1',definitionId:'T01'},{instanceId:'held/2',definitionId:'P01'}];
  state.longTermItems=['U01'];state.purchaseCoupons=2;state.supplyRewardClaimed=true;state.safetyNetUsed=true;
  if(legacy){state.contentVersion=R2_LEGACY_CONTENT_VERSION;state.contentHash=R2_LEGACY_CONTENT_HASH;}
  return send(state,{type:'EnterStage'});
}
function normalWin(legacy=false):R2RunState {
  const state=finalBoss(legacy),won=send(state,{type:'PlayHand',selectedIds:state.handOrder.slice(0,5)});
  expect(won.phase).toBe('run-won');expect(won.stage!.clearId).toBe('c03-endless/clear/23');return won;
}
const build=(state:R2RunState)=>({gold:state.gold,deck:state.deckInstances,draw:state.drawPile,hand:state.handOrder,played:state.playedPile,discard:state.discardPile,
  destroyed:state.destroyedIds,jokers:state.jokers,levels:state.handLevels,consumables:state.consumables,items:state.longTermItems,
  spectral:state.spectralModifiers,coupons:state.purchaseCoupons,supply:state.supplyRewardClaimed,rescue:state.safetyNetUsed,total:state.totalHeat});

describe('C03.4 voluntary endless uses atomic shared commands',()=>{
  it('starts normal with no implicit ninth chapter or fabricated completion',()=>{
    const state=createRun({seed:'normal',runId:'normal',characterId:'amo',rulesVersion:'r2'});
    expect(state.tourMode).toBe('normal');expect(state.normalCompletion).toBeNull();expect(getR2Stage(24)).toBeUndefined();
  });
  it.each(['shop','stage-ready','await-input','run-lost'] as const)('rejects entering endless from %s with no mutation',phase=>{
    const state=phase==='shop'?createRun({seed:'reject',runId:'reject',characterId:'amo',rulesVersion:'r2'}):finalBoss();
    state.phase=phase;if(phase==='run-lost')state.outcome={reason:'abandoned',stageIndex:23};
    reject(state,continueAction,'not-normal-win');
  });
  it('records the real final clear once after its legitimate score and rewards',()=>{
    const state=normalWin();
    expect(state.tourMode).toBe('normal');expect(state.normalCompletion).toEqual({clearId:'c03-endless/clear/23',totalHeat:state.totalHeat});
    expect(state.stageIndex).toBe(24);expect(state.chapter).toBe(8);expect(state.outcome).toEqual({reason:'all-stages-cleared',stageIndex:23});
    expect(state.lastTrace!.events.filter(event=>event.sourceDefinitionId==='e10'&&event.operation==='add-gold')).toHaveLength(1);
    expect(state.lastTrace!.events.filter(event=>event.sourceDefinitionId==='B15'&&event.operation==='seal-joker')).toHaveLength(1);
    expect(state.jokers.find(joker=>joker.definitionId==='e10')!.counters).toEqual({stageClears:0});
  });
  it('rejects counterfeit victory without the normal-clear qualification',()=>{
    const state=normalWin();state.normalCompletion=null;
    reject(state,continueAction,'not-normal-win');
  });
  it('opens chapter nine once without replaying rewards or replacing the old source snapshots',()=>{
    const won=normalWin(),oldBuild=structuredClone(build(won)),stage=structuredClone(won.stage),trace=structuredClone(won.lastTrace);
    const cmd=command(won,continueAction),result=applyCommand(won,cmd);
    expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)return;
    const state=result.state;assertRunInvariants(state);
    expect(state).toMatchObject({tourMode:'endless',phase:'shop',chapter:9,stageIndex:24,outcome:null,normalCompletion:won.normalCompletion});
    expect(build(state)).toEqual(oldBuild);expect(state.stage).toEqual(stage);expect(state.lastTrace).toEqual(trace);
    expect(state.seenBossIds.slice(0,8)).toEqual(won.seenBossIds);expect(state.seenBossIds).toHaveLength(9);
    expect(won.seenBossIds).not.toContain(state.boss.definitionId);expect(state.shop!.visitIndex).toBe(24);
    expect(state.rng.deck).toEqual(won.rng.deck);expect(state.chapterHandUsage).toEqual({});expect(state.normalClearClaimed).toBe(false);
    expect(getR2Stage(24,state.tourMode)?.targetHeat).toBe('384000');expect(result.events).toEqual([]);
    const retry=applyCommand(state,cmd);expect(retry.ok&&retry.duplicate).toBe(true);expect(retry.state).toBe(state);
    if(retry.ok)expect(retry.events).toEqual([]);
    reject(state,continueAction,'not-normal-win');
  });
  it('can lose endless without erasing the completed normal tour',()=>{
    let state=send(normalWin(),continueAction);const completion=structuredClone(state.normalCompletion);
    state=send(state,{type:'LeaveShop'});state=send(state,{type:'EnterStage'});
    expect(state.stage!.targetHeat).toBe('384000');expect(state.stage!.boss).toBeNull();
    state=send(state,{type:'AbandonRun'});
    expect(state.phase).toBe('run-lost');expect(state.tourMode).toBe('endless');expect(state.normalCompletion).toEqual(completion);
    expect(state.outcome).toEqual({reason:'abandoned',stageIndex:24});reject(state,continueAction,'not-normal-win');
  });
  it('skip gives only its specified coupon and never re-awards normal completion',()=>{
    let state=send(normalWin(),continueAction);const completion=structuredClone(state.normalCompletion),gold=state.gold;
    const e10=structuredClone(state.jokers.find(joker=>joker.definitionId==='e10'));
    state=send(state,{type:'SkipStage'});
    expect(state).toMatchObject({tourMode:'endless',phase:'stage-cleared',chapter:9,stageIndex:25,normalCompletion:completion,gold});
    expect(state.purchaseCoupons).toBe(3);expect(state.stage!.skipResult).toEqual({kind:'coupon',amount:2});
    expect(state.jokers.find(joker=>joker.definitionId==='e10')).toEqual(e10);
    state=send(state,{type:'OpenShop'});expect(state.shop!.visitIndex).toBe(25);expect(state.seenBossIds).toHaveLength(9);
  });
  it.each(['S03','S04','S08'] as const)('%s retains a real next stage in the endless shop',definitionId=>{
    let state=send(normalWin(),continueAction);
    state.consumables=[{instanceId:'endless/spectral',definitionId}];
    if(definitionId==='S08')for(const card of state.deckInstances.slice(0,4))card.enhancement='heat-paper';
    const beforePool=stateHash(state);
    expect(r2ToolAcquisitionPool(state).map(tool=>tool.id)).toContain(definitionId);
    expect(stateHash(state)).toBe(beforePool);
    const selected=definitionId==='S03'?[state.deckInstances[0].id]:[];
    const action:Action={type:'UseConsumable',instanceId:'endless/spectral',targetIds:selected,...(definitionId==='S04'?{suit:'hearts' as const}:{})};
    const completion=structuredClone(state.normalCompletion);state=send(state,action);
    expect(state.consumables).toEqual([]);expect(state.normalCompletion).toEqual(completion);
    if(definitionId==='S03'){expect(state.deckInstances).toHaveLength(26);expect(state.spectralModifiers.handsPenalty).toBe(1);}
    if(definitionId==='S04'){expect(state.deckInstances.every(card=>card.suit==='hearts')).toBe(true);expect(state.spectralModifiers.handPenalty).toBe(1);}
    if(definitionId==='S08'){expect(state.deckInstances.every(card=>card.enhancement===undefined&&card.edition===undefined)).toBe(true);expect(state.spectralModifiers.cleanSlateBonus).toBe(1);}
  });
  it('rejects opening a shop past the finite numeric cap without a draw or false victory',()=>{
    let state=send(normalWin(),continueAction);
    // Synthetic numeric-boundary checkpoint, not a score or natural traversal claim.
    Object.assign(state,{chapter:10766,stageIndex:32297,phase:'stage-ready',stage:null,lastTrace:null,shop:null,
      boss:{definitionId:'B01',disabledSuit:null},seenBossIds:['B01','B02','B03','B04','B05','B06','B07','B08','B09','B10','B11','B12','B13','B14','B15','B16',...Array<string>(10750).fill('B01')]});
    state=send(state,{type:'EnterStage'});
    state.stage!.heat=state.stage!.targetHeat;state.stage!.handsLeft--;state.stage!.playIndex=1;state.stage!.maxPlayedCount=5;
    state.stage!.clearId=`${state.runId}/clear/32297`;state.totalHeat=(BigInt(state.totalHeat)+BigInt(state.stage!.heat)).toString();
    state.stageIndex=32298;state.phase='stage-cleared';assertRunInvariants(state);
    const completion=structuredClone(state.normalCompletion),trace=structuredClone(state.lastTrace);
    reject(state,{type:'OpenShop'},'numeric-length-limit');
    expect(state.normalCompletion).toEqual(completion);expect(state.lastTrace).toEqual(trace);
    expect(state.phase).toBe('stage-cleared');expect(state.outcome).toBeNull();expect(getR2Stage(state.stageIndex,state.tourMode)).toBeUndefined();
  });
});


describe('explicit old/new identities survive chapter-nine entry',()=>{
  it.each([false,true])('legacy=%s keeps saved identity, trace and reward receipts through ContinueEndless',legacy=>{
    const won=normalWin(legacy),trace=structuredClone(won.lastTrace),identity=[won.contentVersion,won.contentHash],receipts=structuredClone(won.receipts);
    const next=send(won,continueAction);expect([next.contentVersion,next.contentHash]).toEqual(identity);
    expect(next.lastTrace).toEqual(trace);expect(next.receipts.slice(0,-1)).toEqual(receipts);expect(next.gold).toBe(won.gold);
    const entered=send(send(next,{type:'LeaveShop'}),{type:'EnterStage'});expect([entered.contentVersion,entered.contentHash]).toEqual(identity);
  });
});
