import {describe,expect,it} from 'vitest';
import {r2ScoreOperationText} from '../src/game/r2Help';
import type {ScoreEvent} from '../src/domain/scoreR2';
const event=(operation:string,n:string,extra:Partial<ScoreEvent>={}):ScoreEvent=>({eventId:'one',rootId:'hand',rootEventId:'one',phase:'onCardScore',sourceType:'card',sourceDefinitionId:'lucky',sourceInstanceId:'lucky',targetCardId:'lucky',operation,value:{n,d:'1'},before:{H:{n:'30',d:'1'},M:{n:'1',d:'1'}},after:{H:{n:'30',d:'1'},M:{n:'1',d:'1'}},reasonKey:'known',visibleCondition:{kind:'always'},retriggerDepth:0,...extra});
describe('C01 resource/risk events state their actual committed outcome',()=>{
  it('separates missed probability checks, capped gold and physical breakage from multiplier gain',()=>{
    expect(r2ScoreOperationText(event('lucky-multiplier-check','0'))).toBe('幸运倍率 · 未命中（1/5）');
    expect(r2ScoreOperationText(event('lucky-gold-check','1'))).toBe('幸运金币 · 命中（1/15）');
    expect(r2ScoreOperationText(event('lucky-gold-cap','20'))).toBe('幸运金币本手已达20金上限');
    expect(r2ScoreOperationText(event('glass-check','0',{phase:'afterHand'}))).toBe('玻璃完好（碎裂概率1/4）');
    expect(r2ScoreOperationText(event('destroy-card','0',{phase:'afterHand'}))).toBe('玻璃碎裂 · 永久离开牌组');
  });
  it('names the upgraded hand and inventory reward instead of reporting phantom multiplier',()=>{
    expect(r2ScoreOperationText(event('upgrade-hand','1',{phase:'onStageClear',sourceType:'rule',sourceDefinitionId:'U09',targetHandType:'pair',resourceBefore:2,resourceAfter:3}))).toBe('对子升1级 · 2 → 3');
    expect(r2ScoreOperationText(event('reward-consumable','1',{phase:'onStageClear',sourceType:'rule',sourceDefinitionId:'T16',resourceBefore:0,resourceAfter:1}))).toBe('获得小红包 · 库存 0 → 1');
  });
});
