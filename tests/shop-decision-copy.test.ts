import {it,expect} from 'vitest';
import {createRun,applyCommand} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {shopRerollEconomyCopy} from '../src/game/ShopRerollEconomyCopy';
import {r2PaidRerollPrice,r2PurchasePrice} from '../src/domain/r2Shop';
import {r2CreateJoker} from '../src/domain/r2Run';

const shop=()=>createRun({rulesVersion:'r2',seed:'phone-shop-decision',runId:'phone-shop-decision',characterId:'erxiang',r2Identity:newRunIdentity('erxiang','flush'),openingRoute:'flush'});
it('the photographed choices state new growth, actual cost and conditions without turning the starter into a ranking',()=>{
 const s=shop();s.gold=6;s.shop!.offers=[{offerId:'a11',definitionId:'a11',price:10,edition:'foil',consumed:false},{offerId:'e06',definitionId:'e06',price:6,consumed:false},{offerId:'c06',definitionId:'c06',price:6,consumed:false}];
 const before=structuredClone(s),growth=shopOfferGuidance(s,s.shop!.offers[2]),sale=shopOfferGuidance(s,s.shop!.offers[1]);
 expect(growth.label).toBe('选购依据');expect(growth.decision).toMatchObject({now:'新购倍率+0',later:'同花族后+0.5，下手用',transaction:'购后0金'});
 expect(sale.decision).toMatchObject({now:'新购倍率+0',later:'成功卖牌后+0.5，下手用'});expect(sale.stars).toBe(3);expect(shopOfferGuidance(s,s.shop!.offers[0]).operation).toBe('差4金');expect(s).toEqual(before);
 const bought=applyCommand(s,{runId:s.runId,commandId:'buy-c06',expectedSeq:s.commandSeq,action:{type:'BuyOffer',offerId:'c06'}});expect(bought.ok).toBe(true);if(!bought.ok)return;
 const next=shopOfferGuidance(bought.state,bought.state.shop!.offers[1]);expect(next.operation).toBe('差6金');expect(next.stars).toBe(3);expect(next.decision.transaction).toBe('还差6金');
});
it('candidate spending and Qin Qiong conflicts remain explicit instead of becoming a positive connection',()=>{
 const s=shop();s.gold=21;s.jokers=[r2CreateJoker('e08','capital',8,'none',s)];s.shop!.offers=[{offerId:'new',definitionId:'b10',price:4,consumed:false}];expect(shopOfferGuidance(s,s.shop!.offers[0]).decision.connection).toContain('20');expect(shopOfferGuidance(s,s.shop!.offers[0]).decision.later).toBe('成组后+10，下手用');
 const q=createRun({rulesVersion:'r2',seed:'qin-decision',runId:'qin-decision',characterId:'touye',r2Identity:newRunIdentity('touye','group'),openingRoute:'group'});q.shop!.offers=[{offerId:'qin',definitionId:'f09',price:4,consumed:false}];expect(shopOfferGuidance(q,q.shop!.offers[0]).decision.connection).toContain('秦琼弃牌技能');
});
it('T18 compares canonical actual purchase and current direct-reroll prices, then switches to held cost basis',()=>{
 const s=shop(),offer={offerId:'T18',definitionId:'T18',price:4,consumed:false};s.shop!.freeRerolls=0;s.shop!.rerollCount=0;
 expect(shopRerollEconomyCopy(s,offer)).toMatchObject({paid:4,direct:2,saved:-2,summary:'立用比直刷多花2金'});
 s.purchaseCoupons=1;expect(shopRerollEconomyCopy(s,offer)).toMatchObject({paid:2,direct:2,saved:0,summary:'立用与直刷同价'});
 s.shop!.rerollCount=5;s.longTermItems=['U06'];const before=structuredClone(s),copy=shopRerollEconomyCopy(s,offer);expect(copy.paid).toBe(r2PurchasePrice(s,offer));expect(copy.direct).toBe(r2PaidRerollPrice(s));expect(copy.saved).toBe(copy.direct-copy.paid);
 expect(shopRerollEconomyCopy(s).paid).toBe(0);expect(shopRerollEconomyCopy(s).summary).toBe('已持有：本次可省'+copy.direct+'金');expect(s).toEqual(before);
 s.shop!.freeRerolls=1;expect(shopRerollEconomyCopy(s)).toMatchObject({direct:0,paid:0,free:true,summary:'已有免费换牌，可留着此工具'});expect(shopRerollEconomyCopy(s,offer).summary).toContain('多花');expect(shopRerollEconomyCopy(s,offer).detail).toContain('换牌次数仍增加');
});
