import {describe,it,expect} from 'vitest';
import {createRun} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {shopOfferGuidance,jokerApplicableRoutes,jokerRouteCaption} from '../src/game/ShopOfferGuidance';
const setup=(id:string,price=4,edition:'none'|'polychrome'='none')=>{const s=createRun({seed:'guidance',runId:'guidance',characterId:'touye',rulesVersion:'r2',r2Identity:newRunIdentity('touye','group'),openingRoute:'group'});s.gold=7;const o={offerId:'fixture',definitionId:id,price,edition,consumed:false};s.shop!.offers=[o];return {s,o};};
describe('public current-run advice stays distinct from rarity and applicability',()=>{
 it('fits a held rail into one measured line while retaining every applicable route and full detail copy',()=>{
  const {s}=setup('d02'),j=r2CreateJoker('d02','held',4,'none',s),before=JSON.stringify(s),measure=(text:string)=>Array.from(text).reduce((width,char)=>width+(/[\u4e00-\u9fff]/u.test(char)?14:5),0);
  for(const width of [64,80,96,128]){const caption=jokerRouteCaption(s,j,width,measure);expect(caption.split('\n')).toHaveLength(1);expect(measure(caption)).toBeLessThanOrEqual(width);expect(caption).toBe(width<96?'同/顺/花':'同点/顺子/同花');}
  expect(jokerRouteCaption(s,j)).toBe('同点/顺子/同花');expect(jokerRouteCaption(s,r2CreateJoker('mantangcai','group',4,'none',s),64,measure)).toBe('同点');expect(JSON.stringify(s)).toBe(before);
 });
 it('recommendation is independent of affordability and rarity, while the price gate stays visible',()=>{const {s,o}=setup('b06',13);o.edition='polychrome';expect(shopOfferGuidance(s,o)).toMatchObject({stars:4,operation:'差6金'});const regular=setup('mantangcai');expect(shopOfferGuidance(regular.s,regular.o).stars).toBe(3);});
 it('general support explicitly covers three routes and retains its actual held condition',()=>{const {s,o}=setup('d02');expect(shopOfferGuidance(s,o)).toMatchObject({stars:2,routeCaption:'同点/顺子/同花'});expect(shopOfferGuidance(s,o).detail).toContain('前4位');expect(jokerApplicableRoutes(s,r2CreateJoker('mantangcai','held',4,'none',s))).toEqual(['group']);});
 it('discount advice does not promise the purchase discounts itself or pays back',()=>{const {s,o}=setup('e02');expect(shopOfferGuidance(s,o).stars).toBe(3);expect(shopOfferGuidance(s,o).detail).toContain('不减本笔');});
 it('same name and full slots are operation gates, without changing basic recommendation or saved state',()=>{const {s,o}=setup('mantangcai');s.jokers=[r2CreateJoker('mantangcai','held',4,'none',s)];expect(shopOfferGuidance(s,o).operation).toBe('已持同名');s.jokers=r2JokerDefinitionsFor(s).filter(d=>d.id!=='mantangcai').slice(0,5).map((d,i)=>r2CreateJoker(d.id,'held/'+i,4,'none',s));const before=JSON.stringify(s);const advice=shopOfferGuidance(s,o);expect(advice.stars).toBe(3);expect(advice.operation).toBe('需替换');expect(JSON.stringify(s)).toBe(before);});
});
