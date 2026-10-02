import {applyCommand,createRun,type Action,type R2RunState} from '../src/domain/run';
import {cardAbilityCopy} from '../src/game/CardCopy';
import {describe,it,expect} from 'vitest';
import {r2JokerValue} from '../src/game/r2Help';
import {R2_JOKERS,type R2JokerInstance} from '../src/content/r2Schema';
import {previewR2Hand,scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
const joker:R2JokerInstance={instanceId:'f09-test',definitionId:'f09',paidPrice:6,growth:{},edition:'none'};
const context={gold:0,jokerCount:1,jokerSlots:5,deckSize:52};
const input:Omit<ScoreInput,'rng'>={rulesVersion:'r2',runId:'f09',rootId:'hand',characterId:'amo',hand:[{id:'ten',rank:10,suit:'hearts'}],selectedIds:['ten'],disabledIds:[],jokers:[joker],definitions:R2_JOKERS,handLevels:{'high-card':3},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,discardsUsed:0};
describe('F09 visible promise and complete public score ledger',()=>{
  it('shows loss of eligibility after a successful discard, including a refunded discard',()=>{
    expect(r2JokerValue(joker,{...context,discardsUsed:0})).toBe('×1.5');
    expect(r2JokerValue(joker,{...context,discardsUsed:1})).toBe('不再×1.5');
    expect(r2JokerValue(joker,{...context,discardsUsed:3})).toBe('不再×1.5');
    expect(r2JokerValue(joker,{...context,discardsUsed:0})).toBe('×1.5');
  });
  it.each([0,1])('explains every score source with %i discards without consuming RNG or mutating ownership',discardsUsed=>{
    const request={...input,discardsUsed},snapshot=JSON.stringify(request),preview=previewR2Hand(request);
    const scored=scoreR2Hand({...request,rng:{algorithm:'fnv1a-mulberry32-v1',state:17}});
    expect(preview.breakdown.minimum).toEqual(scored.accumulator);
    expect(preview.breakdown.maximum).toEqual(scored.accumulator);
    expect(preview.breakdown.events.some(e=>e.sourceDefinitionId==='f09')).toBe(discardsUsed===0);
    expect(preview.breakdown.events.some(e=>e.sourceType==='character')).toBe(true);
    expect(preview.breakdown.events.some(e=>e.targetCardId==='ten')).toBe(true);
    expect(preview.scoreRange.minimum).toBe(scored.finalScore);
    expect(JSON.stringify(request)).toBe(snapshot);
  });
});


it('F04 plain-language +3 is additive and respects the real 3/4 gold boundary',()=>{
  expect(cardAbilityCopy('f04',{gold:3})?.value).toBe('整手倍率 +3');
  expect(cardAbilityCopy('f04',{gold:3})?.state).toContain('满足条件');
  expect(cardAbilityCopy('f04',{gold:4})?.state).toContain('尚未满足');
  const request={...input,characterId:'neutral' as const,handLevels:{},jokers:[{...joker,definitionId:'f04'}]};
  expect(previewR2Hand({...request,gold:3}).scoreRange.minimum).toBe('120');
  expect(previewR2Hand({...request,gold:4}).scoreRange.minimum).toBe('30');
});

it.each([['foil','168','112'],['holographic','212','175'],['polychrome','168','112']] as const)('F09 %s survives discard but Boss seal disables body and edition', (edition,before,after)=>{
  // H=40+10, M=1.5; body multiplies M by1.5 before foil(+25 H), holo(+2 M), or poly(×1.5 M).
  const request={...input,characterId:'neutral' as const,jokers:[{...joker,edition}]};
  expect(previewR2Hand(request).scoreRange.minimum).toBe(before);
  const lost=previewR2Hand({...request,discardsUsed:1});
  expect(lost.scoreRange.minimum).toBe(after);
  expect(lost.breakdown.events.some(e=>e.sourceDefinitionId==='f09')).toBe(true);
  expect(previewR2Hand({...request,discardsUsed:1,boss:{definitionId:'B15',disabledSuit:null},sealedJokerIds:[joker.instanceId]}).scoreRange.minimum).toBe('75');
  expect(cardAbilityCopy('f09',{gold:0,inStage:true,discardsUsed:1})).toMatchObject({condition:'已弃牌',value:'本场不再×1.5',state:'本体下场恢复 · 特殊版次仍正常结算'});
  expect(cardAbilityCopy('f09',{gold:0,inStage:true,discardsUsed:1,disabledReason:'封牌'})?.value).toBe('本体与版次均不计分');
});

it('successful discard and T17 refund preserve lost body eligibility; rejected discard preserves state',()=>{
  let state=createRun({seed:'f09-refund',runId:'f09-refund',characterId:'amo',rulesVersion:'r2'});
  state.jokers=[{...joker,edition:'foil'}];state.consumables=[{instanceId:'refund',definitionId:'T17'}];
  const send=(action:Action)=>{const result=applyCommand(state,{runId:state.runId,commandId:'f09/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});expect(result.ok).toBe(true);if(result.ok)state=result.state as R2RunState;};
  send({type:'LeaveShop'});send({type:'EnterStage'});
  const before=structuredClone(state);
  const rejected=applyCommand(state,{runId:state.runId,commandId:'empty',expectedSeq:state.commandSeq,action:{type:'DiscardHand',selectedIds:[]}});
  expect(rejected.ok).toBe(false);expect(rejected.state).toEqual(before);
  send({type:'DiscardHand',selectedIds:[state.handOrder[0]]});
  send({type:'UseConsumable',instanceId:'refund',targetIds:[]});
  expect(state.stage).toMatchObject({discardsUsed:1,discardsLeft:before.stage!.discardsLeft});
  expect(r2JokerValue(state.jokers[0],{...context,discardsUsed:state.stage!.discardsUsed})).toBe('不再×1.5');
});
