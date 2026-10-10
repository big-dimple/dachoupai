import {describe,it,expect} from 'vitest';
import {createRun} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {shopOfferGuidance,jokerApplicableRoutes} from '../src/game/ShopOfferGuidance';
const setup=(id:string,price=4,edition:'none'|'polychrome'='none')=>{const s=createRun({seed:'guidance',runId:'guidance',characterId:'touye',rulesVersion:'r2',r2Identity:newRunIdentity('touye','group'),openingRoute:'group'});s.gold=7;const o={offerId:'fixture',definitionId:id,price,edition,consumed:false};s.shop!.offers=[o];return {s,o};};
describe('public current-run advice stays distinct from rarity and applicability',()=>{
 it('expensive rare is deferred, while affordable common filling a real route gap can rate highest',()=>{const {s,o}=setup('b06',13);o.edition='polychrome';expect(shopOfferGuidance(s,o)).toMatchObject({stars:1,reason:'差6金'});const regular=setup('mantangcai');expect(shopOfferGuidance(regular.s,regular.o).stars).toBe(3);});
 it('general support explicitly covers three routes and retains its actual held condition',()=>{const {s,o}=setup('d02');expect(shopOfferGuidance(s,o)).toMatchObject({stars:2,routeCaption:'同点/顺子/同花'});expect(shopOfferGuidance(s,o).detail).toContain('前4位');expect(jokerApplicableRoutes(s,r2CreateJoker('mantangcai','held',4,'none',s))).toEqual(['group']);});
 it('discount advice does not promise the purchase discounts itself or pays back',()=>{const {s,o}=setup('e02');expect(shopOfferGuidance(s,o).stars).toBe(2);expect(shopOfferGuidance(s,o).detail).toContain('不减本笔');});
 it('same name and unresolved full slots cap advice, without mutating saved state',()=>{const {s,o}=setup('mantangcai');s.jokers=[r2CreateJoker('mantangcai','held',4,'none',s)];expect(shopOfferGuidance(s,o).reason).toBe('已持同名');s.jokers=r2JokerDefinitionsFor(s).filter(d=>d.id!=='mantangcai').slice(0,5).map((d,i)=>r2CreateJoker(d.id,'held/'+i,4,'none',s));const before=JSON.stringify(s);const advice=shopOfferGuidance(s,o);expect(advice.stars).toBeLessThanOrEqual(2);expect(JSON.stringify(s)).toBe(before);});
});
