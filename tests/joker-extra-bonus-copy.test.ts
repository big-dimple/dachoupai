import {expect,it} from 'vitest';
import {jokerExtraBonusCopy} from '../src/game/r2ToolInfo';
import {R2_JOKERS} from '../src/content/r2Schema';
import {scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {r2TransactionConditionMatches,type R2TransactionConditionContext} from '../src/domain/r2Conditions';

it.each([
 ['none','普通','普通 · 无额外加成'],['foil','闪箔','闪箔 · 额外热度+25'],
 ['holographic','全息','全息 · 额外倍率+2'],['polychrome','多彩','多彩 · 额外倍率×1.5'],
] as const)('preserves the familiar %s label and exposes its arithmetic before opening details',(id,label,shelf)=>{
 const copy=jokerExtraBonusCopy(id,{definitionId:'c12'});
 expect(copy.label).toBe(label);expect(copy.shelf).toBe(shelf);
 expect(JSON.stringify(copy)).not.toMatch(/版次|本体|独立于/);
});

it('explains multiplication and the separate gift condition without changing the bonus label',()=>{
 const copy=jokerExtraBonusCopy('polychrome',{definitionId:'c12'});
 expect(copy.detail).toContain('先算这张牌原有的计分效果');
 expect(copy.detail).toContain('当前整手倍率乘以1.5（如倍率4→6）');
 expect(copy.detail).toContain('不用先达成过关赠品条件');
 expect(copy.detail).toContain('被封禁计分时暂停');
 expect(copy.shelf).not.toContain('+1.5');
 const paused=jokerExtraBonusCopy('polychrome',{definitionId:'c12',chapterDisabled:true});
 expect(paused.shelf).toBe('多彩 · 额外倍率×1.5（本章暂停）');expect(paused.detail).toContain('本章封角期间暂停');
});

it('matches actual C12 multiplication on a high card before any straight/flush gift qualification',()=>{
 const input:ScoreInput={rulesVersion:'r2',runId:'bonus-copy',rootId:'bonus-copy/hand',characterId:'neutral',hand:[{id:'two',rank:2,suit:'spades'}],selectedIds:['two'],disabledIds:[],jokers:[{instanceId:'owned/c12',definitionId:'c12',paidPrice:4,growth:{},edition:'polychrome'}],definitions:R2_JOKERS,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,gold:0,rng:{algorithm:'fnv1a-mulberry32-v1',state:1212329753}};
 const before=JSON.stringify(input),trace=scoreR2Hand(input);
 expect(trace.handType).toBe('high-card');expect(trace.finalScore).toBe('33');
 const extra=trace.events.filter(e=>e.reasonKey==='edition.polychrome.multiply-multiplier');
 expect(extra).toHaveLength(1);expect(extra[0]).toMatchObject({phase:'jokerScore',operation:'multiply-multiplier',value:{n:'3',d:'2'},before:{M:{n:'1',d:'1'}},after:{M:{n:'3',d:'2'}}});
 expect(scoreR2Hand({...input,challengeDisabledJokerId:'c12'}).finalScore).toBe('22');
 expect(JSON.stringify(input)).toBe(before);
});

it('keeps the actual gift contract: both ordinary types in one stage, then stage clear',()=>{
 const definition=R2_JOKERS.find(d=>d.id==='c12')!,hook=definition.hooks[0];
 expect(hook.phase).toBe('onStageClear');expect(hook.condition).toEqual({kind:'stage-hand-types-all',values:['straight','flush']});
 expect(hook.operations).toEqual([{kind:'reward-consumable-pool',definitionIds:['T03','T04','T05','T06'],fallbackGold:2}]);
 const ctx:R2TransactionConditionContext={gold:0,handType:'straight-flush',discarded:[],hasStage:true,maxPlayedCount:5,ordinaryStraightSeen:false,ordinaryFlushSeen:true,jokerSold:false,traceType:'straight-flush',heat:'0',target:'400'};
 expect(r2TransactionConditionMatches(hook.condition,ctx)).toBe(false);
 expect(r2TransactionConditionMatches(hook.condition,{...ctx,ordinaryStraightSeen:true})).toBe(true);
 expect(r2TransactionConditionMatches(hook.condition,{...ctx,hasStage:false,ordinaryStraightSeen:true})).toBe(false);
});
