import {describe,expect,it} from 'vitest';
import {applyCommand,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {R2_MODE_CATALOG,type R2ModeSelection} from '../src/content/r2Modes';
import {r2CreateJoker,r2ScoreContext} from '../src/domain/r2Run';
import {previewR2Hand} from '../src/domain/scoreR2';
import {R2_JOKERS} from '../src/content/r2Schema';

const selection=(patch:Partial<R2ModeSelection>={}):R2ModeSelection=>({mode:'standard',difficulty:0,challengeId:null,programsEnabled:true,...patch});
function start(modeConfig?:R2ModeSelection,seed='c04-shared-start',characterId:'erxiang'|'amo'='erxiang'):R2RunState {
  const result=applyCommand(null,{runId:'c04-shared-run',commandId:'c04-shared-run/start',expectedSeq:0,
    action:{type:'StartRun',seed,characterId,rulesVersion:'r2',...(modeConfig===undefined?{}:{modeConfig})}});
  expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok||!result.state)throw Error('start-failed');
  return result.state as R2RunState;
}
function send(state:R2RunState,action:Action):R2RunState {
  const command={runId:state.runId,commandId:`${state.runId}/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action};
  const result=applyCommand(state,command);expect(result.ok,result.ok?'':result.code).toBe(true);
  if(!result.ok)throw Error(result.code);return result.state;
}
// Literal D31 creation values, not derived from implementation/config under test.
const challenges=[
  ['Q01',52,6,1,0],['Q02',52,6,1,0],['Q03',52,6,1,0],['Q04',40,6,1,0],
  ['Q05',32,6,1,0],['Q06',52,6,1,0],['Q07',52,6,1,0],['Q08',52,6,1,0],
  ['Q09',52,0,1,0],['Q10',52,6,1,0],['Q11',52,6,1,0],['Q12',52,20,3,6],
] as const;

describe('C04.2 real shared mode start and atomic commands',()=>{
  it('creates explicit v10 standard D0 selection even when the caller omits options',()=>{
    const state=start();
    expect(state.contentVersion).toBe('quality-r2-content-v11');
    expect(state).toMatchObject({mode:'standard',difficulty:0,challengeId:null,programsEnabled:true,
      chapterDisabledJokerId:null,programRerollCoupon:false,tourMode:'normal',normalCompletion:null});
    expect(state.program).toMatchObject({chapter:1,selectedId:null,choiceMade:false,abandoned:false,lastOpportunityClear:false,claimed:false});
  });
  it.each(challenges)('%s executes its actual distinct creation, deck and initial shop',(id,cardCount,gold,chapter,stageIndex)=>{
    const state=start(selection({mode:'challenge',challengeId:id}),`challenge/${id.toLowerCase()}/0`);
    expect(state).toMatchObject({mode:'challenge',challengeId:id,difficulty:0,chapter,stageIndex,gold,phase:'shop',totalHeat:'0'});
    expect(state.deckInstances).toHaveLength(cardCount);expect(state.drawPile).toHaveLength(cardCount);
    expect(state.handOrder).toEqual([]);expect(state.playedPile).toEqual([]);expect(state.discardPile).toEqual([]);
    expect(state.seenBossIds).toHaveLength(chapter);expect(state.chapterHandUsage).toEqual({});expect(state.purchaseCoupons).toBe(0);
    expect(state.normalCompletion).toBeNull();expect(state.shop?.visitIndex).toBe(stageIndex);
    if(id==='Q04')expect([...new Set(state.deckInstances.map(card=>card.rank))]).toEqual([2,3,4,5,6,7,8,9,10,14]);
    if(id==='Q05')expect([...new Set(state.deckInstances.map(card=>card.rank))]).toEqual([7,8,9,10,11,12,13,14]);
    if(id==='Q09'){
      expect(state.jokers.map(joker=>[joker.definitionId,joker.paidPrice,joker.edition])).toEqual([['huimaqiang',0,'none'],['e08',0,'none']]);
      expect(state.shop?.offers.every(offer=>!['huimaqiang','e08'].includes(offer.definitionId))).toBe(true);
    }else expect(state.jokers).toEqual([]);
  });
  it('rejects illegal profile combinations and wrong fixed seeds before any run exists',()=>{
    const cases=[
      [selection({mode:'challenge',challengeId:'Q01'}),'wrong'],
      [selection({mode:'challenge',challengeId:'Q01',difficulty:1}),'challenge/q01/0'],
      [selection({mode:'tutorial',programsEnabled:false}),'wrong'],
      [selection({difficulty:4 as never}),'seed'],
      [{...selection(),unexpected:'script'},'seed'],
      [selection(),'x'.repeat(4097)],
    ] as const;
    for(const [modeConfig,seed] of cases){
      const command={runId:'bad-mode',commandId:'bad-mode/start',expectedSeq:0,
        action:{type:'StartRun',seed,characterId:'erxiang',rulesVersion:'r2',modeConfig}} as Command;
      const before=JSON.stringify(command),result=applyCommand(null,command);
      expect(result.ok).toBe(false);expect(result.state).toBeNull();expect(JSON.stringify(command)).toBe(before);
    }
  });
  it('disables Q01 initial passive gifts and score sources without replacing character identity',()=>{
    const standard=start(selection(),'c04-amo-normal','amo');expect(standard.handLevels).toEqual({'high-card':3});
    let state=start(selection({mode:'challenge',challengeId:'Q01'}),'challenge/q01/0','amo');
    expect(state.characterId).toBe('amo');expect(state.handLevels).toEqual({});
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.lastTrace?.level).toBe(1);expect(state.lastTrace?.events.some(event=>event.sourceType==='character')).toBe(false);
  });
  it('keeps all old four rule streams unchanged when program/challenge streams are introduced or disabled',()=>{
    const enabled=start(selection()),disabled=start(selection({programsEnabled:false}));
    for(const key of ['deck','rule','shop','reward'] as const)expect(enabled.rng[key]).toEqual(disabled.rng[key]);
    expect(disabled.program).toBeNull();expect(enabled.program?.offerIds).toHaveLength(2);
    expect(enabled.rng.program).not.toEqual(disabled.rng.program);
  });
  it('fixes tutorial identity and permits only its fixed teaching seed',()=>{
    expect(start(selection({mode:'tutorial',programsEnabled:false}),'r2/tutorial/core-v1')).toMatchObject({mode:'tutorial',characterId:'erxiang',program:null,difficulty:0});
    const result=applyCommand(null,{runId:'wrong-teacher',commandId:'wrong-teacher/start',expectedSeq:0,
      action:{type:'StartRun',seed:'r2/tutorial/core-v1',characterId:'amo',rulesVersion:'r2',modeConfig:selection({mode:'tutorial',programsEnabled:false})}});
    expect(result.ok).toBe(false);
  });
  it('locks Q11 one public definition per chapter and snapshots it on actual entry and trace',()=>{
    let state=start(selection({mode:'challenge',challengeId:'Q11'}),'challenge/q11/0');
    const banned=state.chapterDisabledJokerId;expect(typeof banned).toBe('string');
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    expect(state.stage?.challengeDisabledJokerId).toBe(banned);
    state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.lastTrace?.bossContext.challengeDisabledJokerId).toBe(banned);
    expect(state.chapterDisabledJokerId).toBe(banned);
  });
  it('locks a valid program choice once, automatically seals no-choice on entry, and rejects late changes atomically',()=>{
    let state=start(),chosen=state.program!.offerIds[0];state=send(state,{type:'ChooseProgram',programId:chosen});
    expect(state.program).toMatchObject({selectedId:chosen,choiceMade:true});
    state=send(state,{type:'AbandonProgram'});expect(state.program?.abandoned).toBe(true);
    const before=stateHash(state),result=applyCommand(state,{runId:state.runId,commandId:'late-choice',expectedSeq:state.commandSeq,action:{type:'ChooseProgram',programId:chosen}});
    expect(result.ok).toBe(false);expect(stateHash(state)).toBe(before);
    const unselected=send(send(start(),{type:'LeaveShop'}),{type:'EnterStage'});
    expect(unselected.program).toMatchObject({choiceMade:true,selectedId:null});
  });
  it('keeps exactly the four adopted program IDs in the shared finite catalog',()=>{
    expect(R2_MODE_CATALOG.programs.map(program=>program.id)).toEqual(['PG01','PG02','PG03','PG04']);
  });
  it('counts only the two actual empty slots in Q02 for both preview and submitted score',()=>{
    // Controlled ownership/card boundary, not a natural shop acquisition or balance result.
    let state=start(selection({mode:'challenge',challengeId:'Q02'}),'challenge/q02/0');
    state.jokers=[r2CreateJoker('d10','fixture/empty-slots',4)];
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    const id=state.handOrder[0];Object.assign(state.deckInstances.find(card=>card.id===id)!,{rank:2,suit:'clubs'});
    const hand=state.handOrder.map(id=>state.deckInstances.find(card=>card.id===id)!);
    const preview=previewR2Hand({rulesVersion:'r2',runId:state.runId,rootId:'preview',hand,selectedIds:[id],disabledIds:[],jokers:state.jokers,
      definitions:R2_JOKERS,handLevels:state.handLevels,playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,...r2ScoreContext(state,hand,[id])});
    expect(preview.possibleScores).toEqual(['46']);
    state=send(state,{type:'PlayHand',selectedIds:[id]});
    expect(state.lastTrace?.events.find(event=>event.operation==='add-heat-per-empty-slot')?.value).toEqual({n:'24',d:'1'});
    expect(state.lastTrace?.finalScore).toBe('46');
  });
});
