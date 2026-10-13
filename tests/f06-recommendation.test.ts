import {it,expect} from 'vitest';
import {f06RecommendationFixture} from '../harness/fixtures/f06-recommendation';
import {recommendationFiveStarFixture} from '../harness/fixtures/recommendation-evidence';
import {shopRecommendation} from '../src/game/ShopRecommendation';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';

it.each([1,2,5,6,8,13])('chapter %i keeps new f06 at two stars with its finite-use phrase',chapter=>{
 for(const legacy of [false,true]){
  const s=f06RecommendationFixture(chapter,{legacy}),before=structuredClone(s),o=s.shop!.offers[0];
  expect(readCheckpoint(makeCheckpoint(s,[]))).toMatchObject({ok:true});
  expect(shopRecommendation(s,o,'group')).toMatchObject({stars:2,reason:'限4次',condition:'第4次出牌后销毁',combinationHint:''});
  expect(shopOfferGuidance(s,o)).toMatchObject({stars:2,label:'推荐指数 ★★☆☆☆',reason:'限4次'});expect(s).toEqual(before);
 }
});
it('chapter-scoring ban stays at one star before and after the chapter-six boundary',()=>{
 for(const chapter of [5,6]){const s=f06RecommendationFixture(chapter,{disabled:true});expect(readCheckpoint(makeCheckpoint(s,[]))).toMatchObject({ok:true});expect(shopRecommendation(s,s.shop!.offers[0],'group')).toMatchObject({stars:1,reason:'本章计分停用'});}
});
it('B16 rare scoring ban stays at one star with the real late chapter pool',()=>{
 const s=f06RecommendationFixture(8,{boss:true});expect(readCheckpoint(makeCheckpoint(s,[]))).toMatchObject({ok:true});expect(shopRecommendation(s,s.shop!.offers[0],'group')).toMatchObject({stars:1,reason:'本场稀有计分停用'});
});
it('all three existing five-star paths retain their original public prerequisites',()=>{
 const s=recommendationFiveStarFixture(),before=structuredClone(s);
 for(const o of s.shop!.offers)expect(shopOfferGuidance(s,o)).toMatchObject({stars:5,label:'推荐指数 ★★★★★'});
 expect(s).toEqual(before);
});
