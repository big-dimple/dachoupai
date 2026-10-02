import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {r2HandLimit,r2HandsBudget} from '../src/domain/r2Resources';
import {r2ToolAcquisitionPool} from '../src/domain/r2Shop';
import type {R2BossId} from '../src/domain/r2Chapter';

type ToolId='S03'|'S04'|'S08';
type Use=Extract<Action,{type:'UseConsumable'}>;
const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`boss-tools/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
function send(state:R2RunState,action:Action):R2RunState {
  const result=applyCommand(state,command(state,action));if(!result.ok)throw Error(result.code);return result.state;
}
function positioned(boss:R2BossId,index:number,modifiers:Partial<R2RunState['spectralModifiers']>={}):R2RunState {
  const state=createRun({seed:'c03-boss-tools',runId:`c03-tools/${boss}/${index}`,characterId:'erxiang',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  const chapter=Math.floor(index/3)+1;
  // Explicit chapter position/plan fixtures, not a natural acquisition or full-run claim.
  Object.assign(state,{stageIndex:index,chapter,phase:'stage-ready',shop:null,boss:{definitionId:boss,disabledSuit:null},
    seenBossIds:[...['B01','B02','B03','B04','B05','B06','B07'].slice(0,chapter-1),boss],
    spectralModifiers:{...state.spectralModifiers,...modifiers}});
  return state;
}
function bossShop(boss:'B09'|'B10',modifiers:Partial<R2RunState['spectralModifiers']>={},index=8):R2RunState {
  // Real skip/open-shop transactions leave the preceding ordinary stage snapshot in place.
  return send(send(positioned(boss,index-1,modifiers),{type:'SkipStage'}),{type:'OpenShop'});
}
const entered=(boss:'B09'|'B10',index=8)=>send(positioned(boss,index),{type:'EnterStage'});
function attach(state:R2RunState,id:ToolId):Use {
  state.consumables=[{instanceId:'fixture/tool',definitionId:id}];
  return {type:'UseConsumable',instanceId:'fixture/tool',targetIds:id==='S03'?[state.phase==='await-input'?state.handOrder[0]:state.deckInstances[0].id]:[],...(id==='S04'?{suit:'hearts' as const}:{})};
}
function specials(state:R2RunState):void {
  state.deckInstances[0].enhancement='heat-paper';state.deckInstances[0].edition='foil';
  state.deckInstances[1].enhancement='voice-paper';state.deckInstances[2].edition='holographic';state.deckInstances[3].edition='polychrome';
}
function applied(state:R2RunState,action:Use):R2RunState {
  const before=structuredClone(state),result=applyCommand(state,command(state,action));
  expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);
  expect(state).toEqual(before);expect(result.state.rng).toEqual(before.rng);
  expect(result.state.stage).toEqual(before.stage);expect(result.state.lastTrace).toEqual(before.lastTrace);
  expect(result.state.consumables).toEqual([]);expect(result.state.commandSeq).toBe(before.commandSeq+1);
  return result.state;
}
function rejected(state:R2RunState,action:Use,code:string):void {
  const before=structuredClone(state),hash=stateHash(state),result=applyCommand(state,command(state,action));
  expect(result.ok).toBe(false);if(result.ok)return;
  expect(result.code).toBe(code);expect(result.state).toBe(state);expect(state).toEqual(before);expect(stateHash(state)).toBe(hash);
  expect(state.rng).toEqual(before.rng);expect(state.consumables).toEqual(before.consumables);
}
const enterShop=(state:R2RunState)=>send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
const pool=(state:R2RunState)=>r2ToolAcquisitionPool(state).map(tool=>tool.id);

function afterBossShop(boss:'B09'|'B10',nextBoss:'B09'|'B10',modifiers:Partial<R2RunState['spectralModifiers']>={}):R2RunState {
  let state=send(positioned(boss,8,modifiers),{type:'EnterStage'});
  const ids=state.handOrder.slice(0,5);
  // A declared card fixture makes a real clear; this test does not alter any score expectation.
  for(const id of ids){const card=state.deckInstances.find(card=>card.id===id)!;card.rank=14;card.suit='hearts';}
  state=send(state,{type:'PlayHand',selectedIds:ids});expect(state.phase).toBe('stage-cleared');
  state=send(state,{type:'OpenShop'});
  // Explicitly fix the new chapter plan, retaining the real previous Boss/trace snapshots.
  state.boss={definitionId:nextBoss,disabledSuit:null};state.seenBossIds[state.seenBossIds.length-1]=nextBoss;
  return state;
}

describe('C03 Boss Shop permanent resource contracts',()=>{
  it('S03 pays a real 3 to 2 hands change for the upcoming B09, without editing the old ordinary snapshot',()=>{
    const state=bossShop('B09'),action=attach(state,'S03');
    expect(state.stage).toMatchObject({index:7,boss:null,initialHands:4});expect(r2HandsBudget(state)).toBe(3);expect(pool(state)).toContain('S03');
    const next=applied(state,action);expect(next.spectralModifiers.handsPenalty).toBe(1);expect(next.deckInstances).toHaveLength(54);
    const entry=enterShop(next);expect(entry.stage).toMatchObject({boss:{definitionId:'B09',disabledSuit:null},initialHands:2,handsLeft:2,initialHandLimit:8});
  });
  it('S03 is neither offered nor consumed when B09 already clamps hands to two',()=>{
    const state=bossShop('B09',{handsPenalty:1}),action=attach(state,'S03');
    expect(r2HandsBudget(state)).toBe(2);expect(pool(state)).not.toContain('S03');rejected(state,action,'resource-floor');
  });
  it('S04 pays a real 6 to 5 hand change for upcoming B10',()=>{
    const state=bossShop('B10'),action=attach(state,'S04');expect(r2HandLimit(state)).toBe(6);expect(pool(state)).toContain('S04');
    const next=applied(state,action);expect(next.spectralModifiers.handPenalty).toBe(1);expect(next.deckInstances.every(card=>card.suit==='hearts')).toBe(true);
    const entry=enterShop(next);expect(entry.stage).toMatchObject({boss:{definitionId:'B10',disabledSuit:null},initialHands:4,initialHandLimit:5,handLimit:5});expect(entry.handOrder).toHaveLength(5);
  });
  it('S04 is neither offered nor consumed when B10 already clamps the hand to five',()=>{
    const state=bossShop('B10',{handPenalty:1}),action=attach(state,'S04');
    expect(r2HandLimit(state)).toBe(5);expect(pool(state)).not.toContain('S04');rejected(state,action,'resource-floor');
  });
  it('S08 clears four distinct specials for a real B10 entry increase from five to six',()=>{
    const state=bossShop('B10',{handPenalty:1});specials(state);const action=attach(state,'S08');
    expect(r2HandLimit(state)).toBe(5);expect(pool(state)).toContain('S08');const next=applied(state,action);
    expect(next.spectralModifiers).toEqual({handsPenalty:0,handPenalty:1,cleanSlateBonus:1});
    expect(next.deckInstances.every(card=>card.enhancement===undefined&&card.edition===undefined)).toBe(true);
    const entry=enterShop(next);expect(entry.stage).toMatchObject({initialHandLimit:6,handLimit:6});expect(entry.handOrder).toHaveLength(6);
  });
  it('B10 hand floor does not block S03 from paying a separate hands cost',()=>{
    const state=bossShop('B10',{handPenalty:1}),action=attach(state,'S03');
    expect(r2HandLimit(state)).toBe(5);expect(r2HandsBudget(state)).toBe(4);expect(pool(state)).toContain('S03');
    const entry=enterShop(applied(state,action));expect(entry.stage).toMatchObject({initialHands:3,initialHandLimit:5});
  });
  it('B09 hands floor does not block S04 from paying a separate hand cost',()=>{
    const state=bossShop('B09',{handsPenalty:1}),action=attach(state,'S04');
    expect(r2HandsBudget(state)).toBe(2);expect(r2HandLimit(state)).toBe(8);expect(pool(state)).toContain('S04');
    const entry=enterShop(applied(state,action));expect(entry.stage).toMatchObject({initialHands:2,initialHandLimit:7});
  });
  it('S03 uses normal next entry 4 to 3 after a real B09 clear left two frozen hands',()=>{
    const state=afterBossShop('B09','B10'),action=attach(state,'S03');
    expect(state.stageIndex).toBe(9);expect(state.stage).toMatchObject({index:8,boss:{definitionId:'B09',disabledSuit:null},initialHands:3,handsLeft:2});
    expect(r2HandsBudget(state)).toBe(4);const entry=enterShop(applied(state,action));expect(entry.stage).toMatchObject({index:9,boss:null,initialHands:3,handsLeft:3});
  });
  it('S04 uses normal next entry 7 to 6 after a real B10 hand-floor clear',()=>{
    const state=afterBossShop('B10','B09',{handPenalty:1}),action=attach(state,'S04');
    action.suit='spades';expect(state.stage).toMatchObject({boss:{definitionId:'B10',disabledSuit:null},initialHandLimit:5,handLimit:5});
    expect(r2HandLimit(state)).toBe(7);const entry=enterShop(applied(state,action));expect(entry.stage).toMatchObject({index:9,boss:null,initialHandLimit:6,handLimit:6});
  });
  it.each(['S03','S04','S08'] as const)('%s remains Shop-only with atomic rejection during a real Boss input phase',id=>{
    const state=entered('B09');if(id==='S08')specials(state);rejected(state,attach(state,id),'wrong-phase');
  });
  it.each(['S03','S04','S08'] as const)('%s does not consume anything during the last stage 23',id=>{
    const state=entered('B10',23);if(id==='S08')specials(state);rejected(state,attach(state,id),'wrong-phase');
  });
  it('Shop before stage 23 still has a real next entry and may pay S03 before the final B09',()=>{
    const state=bossShop('B09',{},23),action=attach(state,'S03');expect(pool(state)).toContain('S03');
    const entry=enterShop(applied(state,action));expect(entry.stage).toMatchObject({index:23,initialHands:2,handsLeft:2});
  });
});
