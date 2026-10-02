import {describe,expect,it} from 'vitest';
import {r2JokerValue,r2ScoreOperationText} from '../src/game/r2Help';
import {scoreR2Hand,type ScoreEvent} from '../src/domain/scoreR2';
import {R2_JOKERS,type R2JokerInstance} from '../src/content/r2Schema';
import {SeededRng} from '../src/core/SeededRng';

const fraction=(n:string,d='1')=>({n,d});
function event(operation:string,value:{n:string;d:string},extra:Record<string,unknown>={}):ScoreEvent {
  return {eventId:'c02/event',rootId:'c02/hand',rootEventId:'c02/event',phase:'onStageClear',sourceType:'joker',sourceDefinitionId:'e11',sourceInstanceId:'c02/e11',operation,value,before:{H:fraction('22'),M:fraction('1')},after:{H:fraction('22'),M:fraction('1')},reasonKey:'known',visibleCondition:{kind:'always'},retriggerDepth:0,...extra} as ScoreEvent;
}
describe('C02 committed sources distinguish probability, prizes and multiplicative growth',()=>{
  it.each(['0','1'])('names the F08 %s check as one per hand with its public 1/3 probability',hit=>{
    expect(r2ScoreOperationText(event('chance-heat-check',fraction(hit),{phase:'jokerScore',sourceDefinitionId:'f08'}))).toBe(`试试手气 · ${hit==='1'?'命中':'未命中'}（每手1次，概率1/3）`);
  });
  it('states coefficient reads and changes with multiplication and future timing',()=>{
    expect(r2ScoreOperationText(event('read-coefficient',fraction('11','10'),{phase:'jokerScore'}))).toBe('×1.1 系数 · 本手读取');
    expect(r2ScoreOperationText(event('add-coefficient',fraction('1','10'),{growthBefore:fraction('1'),growthAfter:fraction('11','10')}))).toBe('系数 ×1 → ×1.1 · 后续出牌生效');
    expect(r2ScoreOperationText(event('reset-coefficient',fraction('1'),{growthBefore:fraction('11','10'),growthAfter:fraction('1')}))).toBe('系数重置 ×1.1 → ×1 · 后续出牌生效');
  });
  it('names the committed C12 dye and E10 fixed upgrade instead of the T16 supply',()=>{
    expect(r2ScoreOperationText(event('reward-consumable',fraction('1'),{sourceDefinitionId:'c12',rewardDefinitionId:'T04',resourceBefore:0,resourceAfter:1}))).toBe('获得方片染 · 库存 0 → 1');
    expect(r2ScoreOperationText(event('reward-consumable',fraction('1'),{sourceDefinitionId:'e10',rewardDefinitionId:'T01',resourceBefore:1,resourceAfter:2}))).toBe('获得练一招 · 库存 1 → 2');
  });
  it('names the drawn prize even when the committed full inventory converts it to gold',()=>{
    expect(r2ScoreOperationText(event('add-gold',fraction('2'),{sourceDefinitionId:'c12',rewardDefinitionId:'T04',resourceBefore:10,resourceAfter:12}))).toBe('方片染 · 库存已满转 +2 金 · 10 → 12');
  });
  it('shows the actual cross-stage E10 cycle and B12 returned opportunity',()=>{
    expect(r2ScoreOperationText(event('increment-clear-cycle',fraction('1'),{sourceDefinitionId:'e10',resourceBefore:0,resourceAfter:1}))).toBe('过关计数 0 → 1 · 下次成功过关发赠票');
    expect(r2ScoreOperationText(event('increment-clear-cycle',fraction('1'),{sourceDefinitionId:'e10',resourceBefore:1,resourceAfter:0}))).toBe('过关计数 1 → 0 · 本次赠票已结算');
    expect(r2ScoreOperationText(event('refund-hand',fraction('1'),{phase:'afterHand',sourceDefinitionId:'b12',resourceBefore:0,resourceAfter:1}))).toBe('返还 1 次出牌 · 0 → 1（本场一次）');
  });
  it('displays a persistent coefficient as a factor rather than an additive multiplier',()=>{
    const joker:R2JokerInstance={instanceId:'c02/e11',definitionId:'e11',paidPrice:8,growth:{coefficient:fraction('11','10')}};
    expect(r2JokerValue(joker,{gold:6,jokerCount:1,jokerSlots:5,deckSize:52})).toBe('×1.1');
  });
  it('keeps the coefficient source and score immutable after the caller changes current growth',()=>{
    const joker:R2JokerInstance={instanceId:'c02/e11',definitionId:'e11',paidPrice:8,growth:{coefficient:fraction('11','10')}};
    const trace=scoreR2Hand({rulesVersion:'r2',runId:'c02',rootId:'c02/hand',characterId:'neutral',hand:[{id:'known/two',rank:2,suit:'clubs'}],selectedIds:['known/two'],disabledIds:[],jokers:[joker],definitions:R2_JOKERS,handLevels:{'high-card':1},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:new SeededRng('c02/source-copy').snapshot()});
    expect(trace.finalScore).toBe('24');expect(trace.sourceJokers[0].growth.coefficient).toEqual(fraction('11','10'));
    joker.growth.coefficient=fraction('2');expect(trace.sourceJokers[0].growth.coefficient).toEqual(fraction('11','10'));expect(trace.finalScore).toBe('24');
  });
});
