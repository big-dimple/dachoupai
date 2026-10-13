import {it,expect} from 'vitest';
import {recommendationEvidenceFixture,recommendationFiveStarFixture} from '../harness/fixtures/recommendation-evidence';
import {shopRecommendation} from '../src/game/ShopRecommendation';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {shopReplacementTransactionFacts,shopReplacementCompactFacts} from '../src/game/ShopRouteRelations';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2Price} from '../src/domain/r2Shop';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
it.each(['group','straight','flush'] as const)('%s: a specified sale cannot remain its own retrigger partner',route=>{
 const s=recommendationEvidenceFixture(route),o=s.shop!.offers[0],before=structuredClone(s);
 expect(readCheckpoint(makeCheckpoint(s,[]))).toMatchObject({ok:true});
 const shelf=shopOfferGuidance(s,o),remove=shopOfferGuidance(s,o,s.jokers[0]),keep=shopOfferGuidance(s,o,s.jokers[3]);
 expect(shelf).toMatchObject({stars:4,operation:'需替换'});
 expect(remove.recommendation).toMatchObject({stars:2,facts:{retriggerSource:false}});
 expect(remove.recommendation).toMatchObject({combinationHint:'',reason:'尚缺重触来源',condition:'新购成长为0'});
 expect(keep.recommendation).toMatchObject({stars:4,facts:{retriggerSource:true}});
 const tx=shopReplacementTransactionFacts(s,o,s.jokers[2]),cost=shopReplacementCompactFacts(s,s.jokers[2],tx).join('\n');
 expect(tx.status).toBe('ready');expect(cost).toContain('实付');expect(cost).toContain('买后');expect(cost).toContain('失去：系数×1.6');
 expect(s).toEqual(before);
});
it.each(['group','straight','flush'] as const)('%s: potential and retained saved co-scoring are distinct',route=>{
 const s=recommendationEvidenceFixture(route),o=s.shop!.offers[0];
 const r=shopRecommendation(s,o,route);
 expect(r.combinationHint).toBe('组合潜力：已有重触来源，成长待触发。');expect(r.combinationHint).not.toMatch(/组合记录|上手|新牌未参与/);expect(r.detail).not.toMatch(/必买|稳赚|不代表|净更强/);expect(r.combination).toContain('组合潜力：已有重触来源');expect(r.combination).toContain('组合记录：上手三拍');expect(r.combination).toContain('新牌未参与');
 expect(shopRecommendation(s,o,route,s.jokers[0]).combination).not.toContain('上手三拍');
 s.lastTrace=null;expect(shopRecommendation(s,o,route).combination).toContain('尚无两张');
});
it('an illegal sale is pending, not rated using the source that cannot be removed',()=>{
 const s=recommendationEvidenceFixture('group'),o=s.shop!.offers[0];s.jokers[0]=r2CreateJoker('e09','capacity',8,'none',s);s.consumables=['T01','T02','T03'].map((definitionId,i)=>({instanceId:'tool/'+i,definitionId}));
 const before=structuredClone(s);expect(shopRecommendation(s,o,'group',s.jokers[0])).toMatchObject({stars:0,reason:'替换不可执行'});expect(s).toEqual(before);
});
it.each(['group','straight','flush'] as const)('%s: all audited recommendations retain five complete display slots',route=>{
 const s=recommendationEvidenceFixture(route),before=structuredClone(s);
 for(const d of r2JokerDefinitionsFor(s)){
  const o={offerId:'public/'+d.id,definitionId:d.id,price:r2Price(d.id,'none',s),edition:'none' as const,consumed:false};
  const r=shopOfferGuidance(s,o);expect(r.stars).toBeLessThanOrEqual(5);expect(r.label.match(/[★☆]/g)).toHaveLength(5);
 }
 expect(shopRecommendation(s,s.shop!.offers[2],route).condition).toContain('第4次');expect(s).toEqual(before);
});

it('retains all three original five-star branches independently of the specified-sale fix',()=>{
 const s=recommendationFiveStarFixture(),before=structuredClone(s);
 expect(readCheckpoint(makeCheckpoint(s,[]))).toMatchObject({ok:true});
 for(const o of s.shop!.offers)expect(shopOfferGuidance(s,o)).toMatchObject({stars:5,label:'推荐指数 ★★★★★',operation:'需替换'});
 const coefficient=s.shop!.offers[2];
 expect(shopOfferGuidance(s,coefficient,s.jokers[1]).recommendation).toMatchObject({stars:4,facts:{additiveSource:false}});
 expect(shopOfferGuidance(s,coefficient,s.jokers[3]).recommendation).toMatchObject({stars:5,facts:{additiveSource:true}});
 expect(s).toEqual(before);
});

it('unmet or disabled conditions stay ahead of a potential hint without changing stars',()=>{
 const s=recommendationEvidenceFixture('flush'),o=s.shop!.offers[0];
 const disabled=shopRecommendation({...s,chapterDisabledJokerId:o.definitionId},o,'flush');
 expect(disabled).toMatchObject({stars:1,combinationHint:'',reason:'本章计分停用'});
 const late=shopRecommendation({...s,chapter:8,stageIndex:22},o,'flush');
 expect(late).toMatchObject({stars:2,combinationHint:''});expect(late.condition).toContain('新购从初值开始');
});
