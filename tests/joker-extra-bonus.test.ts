import {expect,it} from 'vitest';
import {jokerExtraBonusCopy} from '../src/game/r2ToolInfo';
import {shopLayout} from '../src/game/ShopLayout';
import {shopOfferGeometry} from '../src/game/ShopOfferLayout';
import {intersects} from '../src/game/layout';
import {workshopExtraFixture} from '../harness/fixtures/workshop-layout';
it('keeps unhovered numeric UI samples on a valid actual-price checkpoint',()=>{expect(workshopExtraFixture().state.shop!.offers[0]).toMatchObject({definitionId:'c12',edition:'polychrome'});});
it('uses exact scoring catalogue additions and multiplication, with no invented normal bonus',()=>{
 expect(jokerExtraBonusCopy().shelf).toContain('无额外加成');expect(jokerExtraBonusCopy('foil').shelf).toContain('热度+25');expect(jokerExtraBonusCopy('holographic').shelf).toContain('倍率+2');expect(jokerExtraBonusCopy('polychrome').shelf).toContain('倍率×1.5');
});
it('reserves an external extra row without colliding with art, main benefit or the actual price',()=>{
 for(const [w,h] of [[1000,768],[1280,720],[1366,768],[1912,954]]){
  const p=shopLayout(w,h,8,0,3);for(const tile of p.pc!.jokerOffers){const g=shopOfferGeometry(tile,'jokers',true)!;expect(g.summary.height).toBeGreaterThanOrEqual(34);expect(g.extra).toBeDefined();for(const b of [g.art,g.title,g.identity!,g.summary,g.price])expect(intersects(g.extra!,b)).toBe(false);expect(g.art.height/g.art.width).toBeCloseTo(1.25);}
 }
});
