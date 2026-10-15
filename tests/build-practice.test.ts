import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2PracticeQuotes} from '../src/domain/r2Practice';
import {R2_GROUP_HAND_TYPES} from '../src/domain/r2GroupHands';
import {buildPracticeOptions,buildPracticeStatus,buildJourneyFacts,cashDecision,BUILD_FOCUS} from '../src/game/BuildJourney';
import {buildFallback} from '../src/game/BuildFallback';

function fixture():R2RunState {
 const s=createRun({rulesVersion:'r2',runId:'build-practice',seed:'build-practice',characterId:'laohuan',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});
 s.gold=80;s.handLevels={'high-card':1,pair:1,'two-pair':4,'three-kind':7,straight:10,flush:13,'full-house':16,'four-kind':19,'straight-flush':22,'five-kind':25,'flush-house':28,'flush-five':29};
 s.shop!.offers=[];s.shop!.toolOffers=[];s.shop!.itemOffers=[];return s;
}
function send(s:R2RunState,action:Action):R2RunState {const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});expect(r.ok).toBe(true);if(!r.ok)throw Error(r.code);return r.state;}
describe('build journey immediate upgrades use current domain quotes',()=>{
 it('retains every discovered matching type for all three routes, including the full flush family',()=>{
  const s=fixture(),before=structuredClone(s),quotes=r2PracticeQuotes(s);
  const wanted={group:R2_GROUP_HAND_TYPES,straight:['straight','straight-flush'],flush:['flush','straight-flush','flush-house','flush-five']};
  for(const focus of BUILD_FOCUS){
   const options=buildPracticeOptions(s,focus);expect(options.map(o=>o.quote)).toEqual(quotes.filter(q=>wanted[focus].includes(q.handType)));
   expect(buildJourneyFacts(s,focus).practices).toEqual(options);
   for(const row of options){expect(row.title).toContain('Lv.'+row.quote.levelBefore+' → Lv.'+row.quote.levelAfter);expect(row.body).toContain('原价 '+row.quote.basePrice+' 金，当前实付 '+row.quote.price+' 金');expect(row.body).toContain(cashDecision(s,row.quote.price).body);expect(row.body).toContain('不占道具箱');}
  }
  expect(s).toEqual(before);
 });
 it('excludes undiscovered and capped types, while level 29 keeps the quoted level 30 destination',()=>{
  const s=fixture();s.handLevels={pair:30,'three-kind':29};const rows=buildPracticeOptions(s,'group');expect(rows).toHaveLength(1);expect(rows[0].quote).toMatchObject({handType:'three-kind',levelBefore:29,levelAfter:30});
  expect(buildPracticeOptions(s,'straight')).toEqual([]);expect(buildPracticeStatus(s,'straight')).toContain('尚未发现');s.handLevels['three-kind']=30;expect(buildPracticeOptions(s,'group')).toEqual([]);expect(buildPracticeStatus(s,'group')).toContain('均已30级');
 });
 it('reports an exclusively discovered flush house or flush five as discovered in the route display',()=>{
  const s=fixture();for(const type of ['flush-house','flush-five'] as const){s.handLevels={[type]:29};const facts=buildJourneyFacts(s,'flush');expect(facts.practices.map(p=>p.quote.handType)).toEqual([type]);expect(facts.discovered).toContain('Lv.29');expect(facts.discovered).not.toContain('尚未发现');}
 });
 it('uses discounted final prices and current interest tiers without promising future income',()=>{
  const s=fixture();s.gold=11;s.purchaseCoupons=1;s.longTermItems=['U10'];s.shop!.purchases=0;
  const row=buildPracticeOptions(s,'group')[0],q=r2PracticeQuotes(s).find(q=>q.handType==='pair')!;expect(row.quote).toEqual(q);expect(q.price).toBeLessThan(q.basePrice);expect(row.body).toContain('余额 11→'+q.goldAfter+' 金');expect(row.body).toContain('不是现在到账或下场保证收入');expect(row.affordable).toBe(q.available);
 });
 it('keeps cash-short options inspectable and never rejects immediate practice for full inventory',()=>{
  const s=fixture();s.gold=1;s.consumables=[{instanceId:'full/0',definitionId:'T01'},{instanceId:'full/1',definitionId:'T08'},{instanceId:'full/2',definitionId:'T09'}];const before=structuredClone(s),rows=buildPracticeOptions(s,'group');
  expect(rows.length).toBeGreaterThan(0);for(const row of rows){expect(row.affordable).toBe(false);expect(row.decision).toContain('还差 '+(-row.quote.goldAfter)+' 金');}
  s.gold=80;expect(buildPracticeOptions(s,'group').every(r=>r.affordable)).toBe(true);expect(buildFallback(s,'group')?.choice?.source).toBe('practice');s.gold=1;expect(s).toEqual(before);
 });
 it('omits current-service claims for an old identity or non-shop phase',()=>{
  const old=createRun({rulesVersion:'r2',seed:'old-practice',runId:'old-practice',characterId:'laohuan'});old.handLevels={pair:1};expect(buildPracticeOptions(old,'group')).toEqual([]);expect(buildPracticeStatus(old,'group')).toContain('当前身份没有');
  const s=fixture();s.phase='stage-ready';expect(buildPracticeOptions(s,'group')).toEqual([]);expect(buildPracticeStatus(s,'group')).toContain('仅在商店');expect(buildFallback(s,'group')).toBeUndefined();
 });
 it('spending the shared quota hides every route service, and reroll cannot restore it',()=>{
  const s=fixture(),q=buildPracticeOptions(s,'group')[0].quote,bought=send(s,{type:'PracticeHand',handType:q.handType,expectedLevel:q.levelBefore,shopSeq:q.shopSeq}),refreshed=send(bought,{type:'RerollShop'});
  for(const state of [bought,refreshed])for(const focus of BUILD_FOCUS){expect(buildPracticeOptions(state,focus)).toEqual([]);expect(buildPracticeStatus(state,focus)).toContain('本店自选已用');expect(buildPracticeStatus(state,focus)).toContain('刷新不恢复');}
  expect(refreshed.shop!.basicChoice).toEqual(bought.shop!.basicChoice);
 });
 it('never reports missing route goods or upgrade support when a route service is available',()=>{
  const s=fixture();for(const focus of BUILD_FOCUS){const facts=buildJourneyFacts(s,focus);expect(facts.gaps.join('\n')).not.toContain('本店没有该方向对应商品');expect(facts.gaps.join('\n')).not.toContain('当前没有对应改牌/升型工具');const fallback=buildFallback(s,focus)!;expect(fallback.choice?.source).toBe('practice');expect(fallback.choice?.quote).toEqual(buildPracticeOptions(s,focus)[0].quote);expect(fallback.reason).toContain('留80金');}
 });
 it('does not remove a valid practice alternative when a real Joker recommendation exists',()=>{
  const s=fixture();s.shop!.offers=[{offerId:'real/b10',definitionId:'b10',price:4,consumed:false}];const facts=buildJourneyFacts(s,'group');expect(facts.decision.choices.length).toBeGreaterThan(0);expect(facts.practices).toHaveLength(R2_GROUP_HAND_TYPES.length);expect(facts.decision.choices[0].kind).toBe('jokers');
 });
});
