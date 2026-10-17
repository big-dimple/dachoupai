import {describe,it,expect} from 'vitest';
import {analyze,audit,freshSushi,visibleHand,preparedDeck,sampledHand,routeDiscardIds,send,ROUTES} from '../harness/fixtures/sushi-balance-model';
import {assistCandidates} from '../src/game/AssistSelection';
import {evaluateR2Hand} from '../src/domain/evaluateR2';
import {r2RouteFamilies} from '../src/domain/r2RouteGrowth';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import type {PlayingCard,Rank,Suit} from '../src/cards/types';
const card=(rank:number,suit:Suit='hearts',id=suit+'-'+rank):PlayingCard=>({id,rank:rank as Rank,suit});
describe('Su Shi offline balance model',()=>{
 it('matches official assist enumeration across every main subset in 32 natural hands, including disabled-card filtering',()=>{
  const ref=freshSushi('sushi-balance/oracle');
  for(let n=0;n<32;n++)for(const disabled of [false,true]){
   const hand=visibleHand(freshSushi('sushi-balance/oracle/'+n)),disabledIds=disabled?hand.filter(c=>c.suit==='spades').map(c=>c.id):[];
   const best=Object.fromEntries(ROUTES.map(r=>[r,0])),model=analyze(hand,1,'ANY',disabledIds);
   for(let mask=1;mask<256;mask++){
    const main=hand.filter((_,i)=>mask&(1<<i));if(main.length>5)continue;
    const type=evaluateR2Hand(main,{}).type;
    const facts=assistCandidates({hand,selectedIds:main.map(c=>c.id),disabledIds,jokers:[],definitions:r2JokerDefinitionsFor(ref)},true);
    if(!facts.length)continue;
    for(const r of ['ANY',...r2RouteFamilies(type),...(type==='pair'?['P']:[])])best[r]=1;
   }
   for(const route of ROUTES)expect(Number(model.skill.current[route].score>0)).toBe(best[route]);
   expect(audit(hand,model,ref,1,'ANY',disabledIds)).toBeGreaterThan(0);
  }
 });
 it('distinguishes ordinary pair from the group family and keeps eligibility unchanged for the charge ceiling',()=>{
  const hand=[card(14),card(14,'clubs'),card(2),card(2,'clubs'),card(5,'diamonds'),card(7,'spades'),card(9,'clubs'),card(11,'diamonds')];
  const a=analyze(hand);
  expect(a.skill.current.P.score).toBe(0);expect(a.skill.current.G.score).toBe(0);
  expect(a.skill['pair-main'].P.multiplier).toBe(2);
  expect(a.skill['pair-main'].P.score).toBeGreaterThan(a.plain.ANY.score);
  for(const route of ROUTES)expect(Boolean(a.skill['charged-ceiling'][route].score)).toBe(Boolean(a.skill.current[route].score));
 });
 it('offers only a matching-core single echo and retains the existing pair/triple tiers',()=>{
  const main=[2,4,6,8,10].map(r=>card(r));
  const echo=analyze([...main,card(10,'clubs'),card(3,'spades'),card(13,'diamonds')]);
  expect(echo.skill.current.F.score).toBe(0);expect(echo.skill['echo-single-1.25'].F.multiplier).toBe(1.25);
  expect(echo.skill['echo-single-1.25'].F.side).toEqual(['clubs-10']);
  const unmatched=analyze([...main,card(3,'clubs'),card(7,'spades'),card(13,'diamonds')]);
  expect(unmatched.skill['echo-single-1.25'].F.score).toBe(0);
  const pair=analyze([...main,card(3,'clubs'),card(3,'spades'),card(13,'diamonds')]);
  expect(pair.skill['echo-single-1.25'].F.multiplier).toBe(2);
  const triple=analyze([...main,card(3,'clubs'),card(3,'spades'),card(3,'diamonds')]);
  expect(triple.skill.current.F.multiplier).toBe(4);
 });
 it('never uses a scoring-disabled assist card and audits level-five prepared decks against canonical scores',()=>{
  const ref=freshSushi('sushi-balance/prepared');
  for(const [kind,route]of [['flush26','F'],['straight20','S'],['group12','G']] as const){
   for(let n=0;n<16;n++){
    const hand=sampledHand(preparedDeck(ref.deckInstances,kind),'sushi-balance/prepared/'+n),disabled=hand.filter(c=>c.suit==='spades').map(c=>c.id),a=analyze(hand,5,route,disabled);
    expect(audit(hand,a,ref,5,route,disabled)).toBeGreaterThan(0);
    for(const model of Object.values(a.skill))for(const best of Object.values(model))expect(best.side.some(id=>disabled.includes(id))).toBe(false);
   }
  }
 });
 it('uses legal visible-only discard choices and actual domain commands without changing the original state',()=>{
  const ref=freshSushi('sushi-balance/discard'),before=JSON.stringify(ref);
  for(const route of ['F','S','P','G'] as const){let s=ref;for(let i=0;i<3;i++){
   const ids=routeDiscardIds(visibleHand(s),route);expect(ids.length).toBeGreaterThan(0);expect(ids.length).toBeLessThanOrEqual(5);
   s=send(s,{type:'DiscardHand',selectedIds:ids});expect(s.handOrder.length).toBe(8);expect(s.stage!.discardsLeft).toBe(2-i);
  }}expect(JSON.stringify(ref)).toBe(before);
 });
});
