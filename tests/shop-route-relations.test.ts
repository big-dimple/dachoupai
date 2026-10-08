import {it,expect} from 'vitest';
import {buildJourneyPlan,buildTransitionPlan,journeySend} from '../harness/fixtures/build-journey';
import {shopRouteRelation,shopOfferRelation,shopReplacementFacts} from '../src/game/ShopRouteRelations';
import {r2CreateJoker} from '../src/domain/r2Run';
import {buildJourneyFacts} from '../src/game/BuildJourney';
it('general support is never a route core simply because all three routes can use it',()=>{
 const s=buildJourneyPlan(),j=r2CreateJoker('d03','held/d03',4,undefined,s);
 for(const focus of ['group','straight','flush'] as const){const r=shopRouteRelation(s,j,focus);expect(r.kind).toBe('support');expect(r.body).toContain('不专属某一种牌型');}
});
it('fresh stock never borrows the carried growth of a held same-name instance',()=>{
 const s=buildJourneyPlan(),j=s.jokers[0],o={offerId:'public/b10',definitionId:'b10',price:4,consumed:false};
 expect(shopRouteRelation(s,j,'group').kind).toBe('direct');expect(shopRouteRelation(s,j,'straight').kind).toBe('support');
 expect(shopOfferRelation(s,o,'straight').kind).toBe('other');expect(shopOfferRelation(s,o,'group').kind).toBe('direct');
 expect(shopRouteRelation(s,j,undefined).kind).toBe('unfocused');
});
it('every held source remains visible after freely changing focus without changing the run',()=>{
 const s=buildJourneyPlan();s.jokers.push(r2CreateJoker('b04','held/b04',4,undefined,s));const before=JSON.stringify(s);
 for(const f of ['group','straight','flush'] as const)expect(buildJourneyFacts(s,f).owned.map(j=>j.id)).toEqual(s.jokers.map(j=>j.instanceId));
 expect(JSON.stringify(s)).toBe(before);
});
it('replacement reports actual lost growth and public prices without a net-score promise or command',()=>{
 const s=buildJourneyPlan(),j=s.jokers[0],o=s.shop!.offers.find(o=>!o.consumed)!;const before=JSON.stringify(s),f=shopReplacementFacts(s,o,j,'group');
 expect(f.loss).toContain('20');expect(f.loss).toContain('不继承成长');expect(f.money).toContain('当前余额 15');expect(f.money).toContain('分别确认');expect(f.connections).toContain('未记录');expect(JSON.stringify(s)).toBe(before);
});
it('saved co-sources use exact held instance identities, not another same-name card or an invented synergy',()=>{
 const p=buildTransitionPlan('straight'),s=journeySend(p.state,{type:'PlayHand',selectedIds:p.selected}),j=s.jokers[0],other=r2CreateJoker(j.definitionId,'new-instance',4,undefined,s);s.jokers.push(other);
 const o={offerId:'public/b04',definitionId:'b04',price:4,consumed:false};
 expect(shopReplacementFacts(s,o,j,'straight').connections).toContain('未记录');
 expect(shopReplacementFacts(s,o,other,'straight').connections).toContain('未记录');
});
