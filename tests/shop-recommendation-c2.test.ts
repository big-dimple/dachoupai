import {describe,it,expect,vi} from 'vitest';
import {assertRunInvariants} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import * as profiles from '../src/domain/r2ContentProfiles';
import {stableHash} from '../src/domain/hash';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2ColdOpening} from '../src/domain/r2ComboGrowth';
import {r2Price} from '../src/domain/r2Shop';
import {shopRecommendation,SHOP_C2_RECOMMENDATION_SEMANTICS,SHOP_C2_RECOMMENDATION_AUDIT} from '../src/game/ShopRecommendation';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {shopRouteGrowthFacts} from '../src/game/ShopRouteGrowthFacts';
import {shopReplacementTransactionFacts,shopReplacementCompactFacts,shopSaleConsequences} from '../src/game/ShopRouteRelations';
import {shopC2Fixture,shopC2PublicDeck,shopC2Score,shopC2EarnedHistory,shopC2Send} from '../harness/fixtures/shop-c2-align';
const offer=(s:ReturnType<typeof shopC2Fixture>,id:string)=>({offerId:'public/'+id,definitionId:id,price:r2Price(id,'none',s),edition:'none' as const,consumed:false});
const rec=(s:ReturnType<typeof shopC2Fixture>,id:string,focus:'group'|'straight'|'flush'='group')=>shopRecommendation(s,offer(s,id),focus);
const events=(s:ReturnType<typeof shopC2Fixture>,ids:string[],id:string)=>shopC2Score(s,ids).trace.events.filter(e=>e.sourceInstanceId==='held/'+id);
describe('C2 reviewed semantic alignment, legacy and global ownership remain separate',()=>{
 it('all72 new definitions are reviewed by the new exact semantic contract, without mutating state',()=>{
  const s=shopC2Fixture(),defs=profiles.r2JokerDefinitionsFor(s),before=JSON.stringify(s);expect(stableHash(defs)).toBe(SHOP_C2_RECOMMENDATION_SEMANTICS);expect(Object.keys(SHOP_C2_RECOMMENDATION_AUDIT).sort()).toEqual(defs.map(d=>d.id).sort());
  for(const d of defs)for(const focus of ['group','straight','flush'] as const)expect(rec(s,d.id,focus).stars).toBeGreaterThan(0);expect(JSON.stringify(s)).toBe(before);
 });
 it('a changed C2 definition is pending, rather than blindly authorizing the run hash',()=>{
  const s=shopC2Fixture(),defs=profiles.r2JokerDefinitionsFor(s),spy=vi.spyOn(profiles,'r2JokerDefinitionsFor').mockReturnValue(defs.map(d=>d.id==='mantangcai'?{...d,description:d.description+' changed'}:d));
  try{expect(rec(s,'mantangcai').stars).toBe(0);}finally{spy.mockRestore();}
 });
 it('mantangcai is +90 on a real group hand and its legacy purpose is unchanged',()=>{
  const s=shopC2Fixture(['mantangcai']);expect(rec(s,'mantangcai').reason).toContain('+90');expect(events(s,['spades-7','hearts-7'],'mantangcai').find(e=>e.operation==='add-heat')?.value).toEqual({n:'90',d:'1'});
  const old=shopC2Fixture([],true);expect(rec(old,'mantangcai').reason).toBe('成组基础热度');expect(shopRouteGrowthFacts(old)).toBeUndefined();
 });
 it('c04 now has initial50 and actual saved growth, including four-card straight, but no fake growth window',()=>{
  const s=shopC2Fixture(['c04','c08']),ids=['spades-2','hearts-3','clubs-4','diamonds-5'],t=shopC2Score(s,ids).trace;
  expect(t.handType).toBe('straight');expect(rec(s,'c04','straight')).toMatchObject({stars:4});expect(rec(s,'c04','straight').condition).toContain('上限100');expect(t.events.filter(e=>e.sourceInstanceId==='held/c04'&&e.operation==='add-heat').some(e=>e.value?.n==='50')).toBe(true);expect(t.jokers.find(j=>j.definitionId==='c04')!.growth.heat).toEqual({n:'10',d:'1'});
  expect(rec({...s,chapter:6,stageIndex:15},'c04','straight').stars).toBe(2);expect(rec(shopC2Fixture([],true),'c04','straight').stars).toBe(3);
 });
 it.each(['flush-house','flush-five'] as const)('c06 and jiedongfeng include actual %s while c07 stays narrow',type=>{
  const s=shopC2PublicDeck(shopC2Fixture(['c06','jiedongfeng','c07']),{7:10,8:10}),ids=type==='flush-house'?['public/7/0','public/7/1','public/7/2','public/8/0','public/8/1']:Array.from({length:5},(_,i)=>'public/7/'+i),before=JSON.stringify(s),t=shopC2Score(s,ids).trace;
  expect(t.handType).toBe(type);expect(t.jokers.find(j=>j.definitionId==='c06')!.growth.multiplier).toEqual({n:'1',d:'2'});expect(t.events.some(e=>e.sourceInstanceId==='held/jiedongfeng'&&e.operation==='add-multiplier'&&e.value?.n==='3'&&e.value?.d==='2')).toBe(true);expect(t.events.some(e=>e.sourceInstanceId==='held/c07')).toBe(false);
  expect(rec(s,'c06')).toMatchObject({stars:4,facts:{flushFamilyPossible:true,ordinaryFlushPossible:false,retriggerSource:false}});expect(rec(s,'jiedongfeng').stars).toBe(4);expect(rec(s,'d09').stars).toBe(2);expect(rec(s,'a06').facts.additiveSource).toBe(true);expect(JSON.stringify(s)).toBe(before);
 });
 it('c06 fresh value0 never manufactures a multiplier source; its real saved value reads on nonflush hands',()=>{
  const s=shopC2Fixture(['c06']);expect(rec(s,'a06').facts.additiveSource).toBe(false);s.jokers[0].growth.multiplier={n:'1',d:'2'};const t=shopC2Score(s,['spades-7','hearts-7']).trace;expect(t.handType).toBe('pair');expect(t.events.some(e=>e.sourceInstanceId==='held/c06'&&e.operation==='read-growth'&&e.value?.d==='2')).toBe(true);expect(rec(s,'a06').facts.additiveSource).toBe(true);
 });
 it('f10 can arm on the first pre-play discard without a cold miss, unlike the retained old identity',()=>{
  let s=shopC2Fixture(['f10']);s=shopC2Send(s,{type:'LeaveShop'}).state;s=shopC2Send(s,{type:'EnterStage'}).state;const formed=['spades-7','hearts-7','clubs-8','diamonds-8','spades-2'];s.handOrder=[...formed,...s.deckInstances.filter(c=>!formed.includes(c.id)).slice(0,s.stage!.handLimit-formed.length).map(c=>c.id)];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));assertRunInvariants(s);s=shopC2Send(s,{type:'DiscardHand',selectedIds:['spades-2']}).state;
  expect(r2ColdOpening(s.stage!.openingDiscard)).toBe(false);expect(s.jokers[0].counters?.rescueArmed).toBe(true);expect(rec(shopC2Fixture(),'f10').condition).toContain('未出牌首弃');expect(rec(shopC2Fixture([],true),'f10').condition).toContain('先弃牌预备');
 });
 it('four real command clears give G1.35, and sale/buy do not erase or award run-owned history',()=>{
  const proof=shopC2EarnedHistory(),s=proof.state;expect(s.routeGrowth).toMatchObject({clears:4,G:4,S:0,F:0});expect(proof.commands.filter(c=>c.action.type==='PlayHand')).toHaveLength(4);assertRunInvariants(s);
  s.jokers=['e11','e06','e05','b10','c08'].map(id=>r2CreateJoker(id,'held/'+id,8,'none',s));s.jokers[0].growth.coefficient={n:'3',d:'2'};s.jokers[3].growth.heat={n:'20',d:'1'};s.shop!.offers=[offer(s,'c04')];assertRunInvariants(s);
  const before=JSON.stringify(s),facts=shopRouteGrowthFacts(s)!;expect(facts.factors.G).toEqual({n:'27',d:'20'});expect(facts.factors.S).toEqual({n:'1',d:'1'});expect(shopOfferGuidance(s,s.shop!.offers[0]).detail).toContain('成组 4次 / ×1.35');
  const held=s.jokers[3],tx=shopReplacementTransactionFacts(s,s.shop!.offers[0],held),rows=shopReplacementCompactFacts(s,held,tx).join('\n'),sale=shopSaleConsequences(s,held).join('\n');expect(tx.growthEffects.join('\n')).not.toContain('长期捧场');expect(rows).toContain('系数×1.5保留');expect(rows).toContain('下一场未售成长失效');expect(rows).toContain('失去：热度+20');expect(sale).toContain('已有系数×1.5保留');expect(sale).toContain('本局过关加成保留');expect(JSON.stringify(s)).toBe(before);
  const sold=shopC2Send(s,{type:'SellJoker',instanceId:held.instanceId}).state,bought=shopC2Send(sold,{type:'BuyOffer',offerId:s.shop!.offers[0].offerId}).state;expect(bought.routeGrowth).toEqual(s.routeGrowth);expect(bought.jokers.find(j=>j.definitionId==='e11')!.growth.coefficient).toEqual({n:'3',d:'2'});expect(bought.jokers.at(-1)!.growth).toEqual(r2CreateJoker('c04','fresh',s.shop!.offers[0].price,'none',s).growth);expect(readCheckpoint(makeCheckpoint(bought,[]))).toMatchObject({ok:true});
 });
 it('selling e11 itself still loses its instance coefficient while run-owned history stays',()=>{
  const s=shopC2Fixture(['e11']);s.jokers[0].growth.coefficient={n:'3',d:'2'};s.shop!.offers=[offer(s,'c04')];const tx=shopReplacementTransactionFacts(s,s.shop!.offers[0],s.jokers[0]);expect(shopReplacementCompactFacts(s,s.jokers[0],tx).join('\n')).toContain('失去：系数×1.5');const sold=shopC2Send(s,{type:'SellJoker',instanceId:s.jokers[0].instanceId}).state;expect(sold.routeGrowth).toEqual(s.routeGrowth);expect(rec(s,'e11').condition).toBe('卖其他牌保倍率 · 下一场不成长');
 });
});
