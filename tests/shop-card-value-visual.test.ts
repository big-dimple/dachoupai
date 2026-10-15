import {describe,it,expect} from 'vitest';
import {shopRecommendationVisual,shopCombinationVisual,shopCombinationMarkLayout,shopEditionVisual} from '../src/game/ShopCardValueVisual';
import {R2_EDITIONS} from '../src/content/r2Tools';
import {editionEffectText} from '../src/game/r2ToolInfo';
import {JOKER_RARITY} from '../src/game/JokerRarity';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {cardValueVisualFixture} from '../harness/fixtures/card-value-visual';

describe('shop card value presentation',()=>{
 it('uses all four authoritative edition names independently of rarity and existing advice',()=>{
  const s=cardValueVisualFixture(),before=structuredClone(s),o=s.shop!.offers[1];
  for(const edition of R2_EDITIONS){
   expect(shopEditionVisual(edition.id)).toMatchObject({id:edition.id,label:edition.name+'版',fullText:editionEffectText(edition.id)});
   // Changing an instance edition cannot relabel its definition rarity or invent stars.
   const g=shopOfferGuidance(s,{...o,edition:edition.id});
   expect(g.stars).toBe(shopOfferGuidance(s,o).stars);
  }
  expect(shopEditionVisual()).toEqual(shopEditionVisual('none'));expect(s).toEqual(before);
 });
 it('reserves three readable characters without overlapping the adjacent rarity badge',()=>{
  expect(shopCombinationMarkLayout(50)).toEqual({width:44,textX:4,rings:false});
  expect(shopCombinationMarkLayout(70)).toEqual({width:62,textX:18,rings:true});
  expect(shopCombinationMarkLayout(43)).toBeUndefined();
  for(const width of [44,50,61,62,70]){const layout=shopCombinationMarkLayout(width)!;expect(layout.width).toBeLessThanOrEqual(width);expect(layout.textX+36).toBeLessThanOrEqual(layout.width-4);}
 });
 it('takes genuine high ordinary and low rare recommendations without conflating their frames',()=>{
  const s=cardValueVisualFixture(),before=JSON.stringify(s),rows=s.shop!.offers.map(o=>shopOfferGuidance(s,o));
  expect(rows.map(r=>r.stars)).toEqual([4,2,2]);
  expect(shopRecommendationVisual(rows[0].stars,88).ink).toBe(shopRecommendationVisual(rows[1].stars,88).ink);
  expect(JOKER_RARITY.common.edge).not.toBe(JOKER_RARITY.rare.edge);
  expect(shopCombinationVisual(rows[2].recommendation)).toEqual({cue:'missing',label:'缺搭档',fullText:'组合潜力：尚缺可用重触来源。'});
  expect(shopCombinationVisual(rows[0].recommendation)).toBeUndefined();expect(JSON.stringify(s)).toBe(before);
 });
 it('uses old gold only for an existing five-star result; keeps the same narrow row capacity',()=>{
  const s=cardValueVisualFixture(true);expect(s.shop!.offers.map(o=>shopOfferGuidance(s,o).stars)).toEqual([5,5,5]);
  for(const width of [72,80,88,100,180]){
   expect(shopRecommendationVisual(5,width)).toMatchObject({width:Math.min(100,width),height:18,ink:'#765422',exceptional:true});
   for(const n of [0,1,2,3,4])expect(shopRecommendationVisual(n,width)).toMatchObject({ink:'#3F606B',exceptional:false});
  }
 });
 it('never calls a prior shared-score record current potential or a pending opportunity triggered',()=>{
  expect(shopCombinationVisual({combination:'组合记录：上手两张牌共同计分。'})).toBeUndefined();
  expect(shopCombinationVisual({combination:'组合潜力：已有重触来源，成长待触发。\n组合记录：尚无两张现持牌共同计分。'})).toMatchObject({cue:'potential',label:'可搭配'});
  expect(shopCombinationVisual({combination:'组合潜力：可重触同花尾牌，核对尾牌加成。'})).toMatchObject({cue:'check',label:'看条件'});
 });
});
