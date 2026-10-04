import {expect,it} from 'vitest';
import {R2_HAND_TYPES} from '../src/domain/evaluateR2';
import {R2_BASE_SCORES} from '../src/domain/scoreR2';
import {HAND_LABELS} from '../src/content/handLabels';
import {handRuleReference} from '../src/game/HandRuleReference';
import {nextCandidate} from '../src/game/SelectionCopy';
import {enumerateR2HandCandidates,type R2CandidateInput} from '../src/domain/r2HandCandidates';
import {R2_JOKERS} from '../src/content/r2Schema';
import type {PlayingCard} from '../src/cards/types';

it('references all12 real bases and partial saved levels without discovery/save mutation',()=>{
 const levels={straight:5,flush:5,'high-card':3},before=structuredClone(levels),copy=handRuleReference(levels);
 for(const type of R2_HAND_TYPES){expect(copy).toContain(HAND_LABELS[type]);if(!(type in levels))expect(copy).toContain(HAND_LABELS[type]+' · 未发现 · 按Lv1基准');}
 expect(copy).toContain('高牌 · Lv3\n');expect(copy).toContain('基础热度 40 · 基础倍率 1.5');
 expect(copy).toContain('基础热度 '+(R2_BASE_SCORES.straight[0]+4*R2_BASE_SCORES.straight[2])+' · 基础倍率 6');
 expect(copy).toContain('基础热度 '+(R2_BASE_SCORES.flush[0]+4*R2_BASE_SCORES.flush[2])+' · 基础倍率 6');
 expect(copy).toContain('最后热度×倍率，只向下取整一次');expect(copy).toContain('先×1.5再+2为8倍');expect(copy).toContain('普通点数0只停止普通点数');expect(levels).toEqual(before);
 expect(copy).not.toMatch(/预计|最佳|最强|本手总分|能过关/);
});
it('four rules explain ordinary exceptions, clone types and evaluator precedence',()=>{
 const copy=handRuleReference({},{fourStraight:true,fourFlush:true});expect(copy).toContain('4张普通顺子；同花顺仍5张');expect(copy).toContain('4张普通同花；同花顺仍5张');expect(copy).toContain('4张同花连续判普通同花，不是同花顺');expect(copy).toContain('不能跨越QKA2');expect(copy).toContain('不同实例身份');
 expect(copy).toContain('判型优先顺序（先符合者）：同花五条 → 同花葫芦 → 五条 → 同花顺 → 四条 → 葫芦 → 同花 → 顺子');
});
const hand:PlayingCard[]=[{id:'a',rank:5,suit:'hearts'},{id:'b',rank:8,suit:'clubs'},{id:'c',rank:6,suit:'clubs'},{id:'d',rank:5,suit:'clubs'},{id:'e',rank:4,suit:'clubs'},{id:'f',rank:3,suit:'clubs'},{id:'g',rank:9,suit:'diamonds'},{id:'h',rank:5,suit:'diamonds'}];
const input:R2CandidateInput={hand,definitions:R2_JOKERS,jokers:[],disabledIds:[],boss:null,stageIndex:0,sealedJokerIds:[],challengeDisabledJokerId:null,resources:{gold:0,handsLeft:4,playIndex:0,discardsUsed:0,stageHeat:'0',target:'400'},contentVersion:'fixture'};
it('direct cycle visits only cached actual types in fixed directory order and uses first deterministic representative',()=>{
 const before=structuredClone(input),r=enumerateR2HandCandidates(input);expect(r.groups.map(g=>g.type)).toEqual(['high-card','pair','three-kind','flush']);
 let current;for(const g of r.groups){const next=nextCandidate(r,r.key,current);expect(next).toEqual(g.examples[0]);current=next!.type;}
 expect(nextCandidate(r,r.key,current)).toEqual(r.groups[0].examples[0]);expect(input).toEqual(before);
 for(const result of[undefined,{...r,status:'working' as const},{...r,status:'unsupported' as const}])expect(nextCandidate(result,r.key)).toBeUndefined();
 expect(nextCandidate(r,'stale')).toBeUndefined();expect(nextCandidate({...r,groups:[]},r.key)).toBeUndefined();
});
