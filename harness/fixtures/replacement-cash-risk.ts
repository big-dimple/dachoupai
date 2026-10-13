import {f06RecommendationFixture} from './f06-recommendation';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {r2Price} from '../../src/domain/r2Shop';
import {assertRunInvariants} from '../../src/domain/run';

/** Current invariant-valid controlled shop, not natural acquisition or play. */
export function replacementCashRiskFixture(gold=22,id='b10',edition:'none'|'foil'='none'){
 const s=f06RecommendationFixture(2);s.gold=gold;
 s.jokers=['e08','b02','e01','e03','e04'].map((id,i)=>r2CreateJoker(id,'held/'+id,i===2?0:8,'none',s));
 s.shop!.offers=[{offerId:'public/'+id,definitionId:id,price:r2Price(id,edition,s),edition,consumed:false}];
 assertRunInvariants(s);return s;
}
