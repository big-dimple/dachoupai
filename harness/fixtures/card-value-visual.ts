import {recommendationFiveStarFixture} from './recommendation-evidence';
import {r2CreateJoker} from '../../src/domain/r2Run';
import {r2Price} from '../../src/domain/r2Shop';
import {assertRunInvariants} from '../../src/domain/run';
/** Controlled current-profile display states; no new recommendation values or natural-run claims. */
export function cardValueVisualFixture(five=false,check=false){
 const s=recommendationFiveStarFixture();
 if(!five){
  s.gold=24;s.jokers=['b02','e11','e01'].map(id=>r2CreateJoker(id,'held/'+id,8,'none',s));
  s.shop!.offers=['b10','e08','d09'].map(definitionId=>({offerId:'public/'+definitionId,definitionId,price:r2Price(definitionId,'none',s),edition:'none',consumed:false}));
 }
 if(check){const definitionId='c07';s.shop!.offers[2]={offerId:'public/'+definitionId,definitionId,price:r2Price(definitionId,'none',s),edition:'none',consumed:false};}
 assertRunInvariants(s);return s;
}
