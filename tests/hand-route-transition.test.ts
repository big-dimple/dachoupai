import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {handRouteTransitions,handRoutePlayBudget} from '../src/game/HandRouteTransition';
import {handRouteReferences} from '../src/game/HandRouteGuidance';
import {r2ScoreContext} from '../src/domain/r2Run';
import {R2_JOKERS} from '../src/content/r2Schema';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2OrdinarySuppression} from '../src/domain/r2Chapter';
import type {R2CandidateInput} from '../src/domain/r2HandCandidates';
import type {R2RunState} from '../src/domain/r2Run';
import type {PlayingCard,Rank} from '../src/cards/types';
const report=JSON.parse(gunzipSync(readFileSync('docs/production/evidence/w5-natural-flush-midgame-2026-10-09/report.json.gz')).toString());
const input=(s:R2RunState):R2CandidateInput=>{const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),stage=s.stage!;return {hand,jokers:s.jokers,definitions:R2_JOKERS,handRules:r2ScoreContext(s,hand,[]).handRules,disabledIds:stage.disabledIds,ordinaryPointsSuppressedIds:[],boss:s.boss,stageIndex:stage.index,sealedJokerIds:stage.sealedJokerIds,challengeDisabledJokerId:stage.challengeDisabledJokerId,resources:{gold:s.gold,handsLeft:stage.handsLeft,playIndex:stage.playIndex,discardsUsed:stage.discardsUsed,stageHeat:stage.heat,target:stage.targetHeat},contentVersion:s.contentVersion}};
it.each([65,66,67])('recorded seq%s four-club gap exposes outside-group examples with complete held context and no state mutation',seq=>{
 const s=report.transactions.find((t:{before:R2RunState})=>t.before.commandSeq===seq).before as R2RunState,i=input(s),before=JSON.stringify(s),keep=i.hand.filter(c=>c.suit==='clubs').map(c=>c.id),examples=handRouteTransitions(i,keep);
 expect(keep).toHaveLength(4);expect(s.stage!.discardsLeft).toBe(0);expect(examples.length).toBeGreaterThan(0);expect(examples.length).toBeLessThanOrEqual(2);
 expect(examples[0].type).toBe(seq===66?'three-kind':'pair');
 for(const f of examples){expect(f.playedIds.every(id=>!keep.includes(id))).toBe(true);expect(f.playedIds.length).toBeLessThanOrEqual(5);expect(f.heldIds).toEqual(i.hand.filter(c=>!f.playedIds.includes(c.id)).map(c=>c.id));const suppressed=i.boss?r2OrdinarySuppression(i.boss,i.stageIndex,i.hand,f.playedIds):[];expect(f).toEqual(r2SelectionFacts({...i,selectedIds:f.playedIds,ordinaryPointsSuppressedIds:suppressed}));expect(f).not.toHaveProperty('finalScore');}
 expect(JSON.stringify(s)).toBe(before);
});
it('actual last play has completed patterns and warns of ordinary exhaustion without inventing a missing piece',()=>{const s=report.transactions.find((t:{before:R2RunState})=>t.before.commandSeq===68).before as R2RunState,i=input(s);expect(s.stage!.handsLeft).toBe(1);const refs=handRouteReferences({hand:i.hand,effectiveDeck:s.deckInstances,rules:{fourStraight:false,fourFlush:false}},'straight');expect(refs).toEqual([]);expect(handRoutePlayBudget(1)).toContain('常规最后一手');expect(handRoutePlayBudget(1)).toContain('败局风险');expect(handRoutePlayBudget(1)).toContain('返手或救场按实际效果结算');expect(handRoutePlayBudget(1)).not.toContain('没有下一手补牌');expect(handRoutePlayBudget(1)).toContain('放弃留牌');expect(i.hand.filter(c=>c.suit==='clubs')).toHaveLength(5);});
it.each([8,9,14])('%s-card public capacity stays bounded, never includes the keep group or selects over five',count=>{const original=input(report.transactions.find((t:{before:R2RunState})=>t.before.commandSeq===65).before),hand:PlayingCard[]=Array.from({length:count},(_,n)=>({id:'capacity/'+n,rank:(2+n%13) as Rank,suit:n<4?'clubs':n%2?'hearts':'diamonds'})),i={...original,hand,boss:null,jokers:[],disabledIds:[]},keep=hand.slice(0,4).map(c=>c.id),before=JSON.stringify(i);const e=handRouteTransitions(i,keep);expect(e.length).toBeLessThanOrEqual(2);for(const f of e){expect(f.playedIds.every(id=>!keep.includes(id))).toBe(true);expect(f.playedIds.length).toBeLessThanOrEqual(5);}expect(JSON.stringify(i)).toBe(before);});
it('no outside cards or invalid retain identity gives no fictitious example; budget reports the actual cost',()=>{const i=input(report.transactions.find((t:{before:R2RunState})=>t.before.commandSeq===65).before);expect(handRouteTransitions(i,i.hand.map(c=>c.id))).toEqual([]);expect(handRouteTransitions(i,['old-card'])).toEqual([]);expect(handRoutePlayBudget(4)).toContain('常规剩余 3 次');expect(handRoutePlayBudget(4)).toContain('返手或救场按实际效果结算');});
