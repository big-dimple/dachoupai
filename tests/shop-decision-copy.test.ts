import {it,expect} from 'vitest';
import {createRun,applyCommand} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {toolPurpose} from '../src/game/RouteFitCue';
import {toolInfo} from '../src/game/r2ToolInfo';
import {cardDefinitionName,TANGSONG_CARD_NAMES} from '../src/game/tangsongCardNames';
import {getR2Tool} from '../src/content/r2Tools';
import {r2PurchasePrice} from '../src/domain/r2Shop';
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
it('T18 shows the short exchange-ticket copy while keeping its price and published definition',()=>{
 const s=shop(),offer={offerId:'T18',definitionId:'T18',price:4,consumed:false},before=structuredClone(s),definition=structuredClone(getR2Tool('T18'));
 const info=toolInfo('T18',s);expect(info.name).toBe('换货券');expect(info.label).toBe('补给 · 换货券');expect(info.summary).toBe('刷新一次商店商品');expect(toolPurpose(s,'T18')).toBe(info.summary);expect(info.description).toContain('长期道具不变');
 expect(cardDefinitionName(getR2Tool('T18'))).toBe('换货券');expect(Object.keys(TANGSONG_CARD_NAMES)).toHaveLength(72);expect(r2PurchasePrice(s,offer)).toBe(4);expect(s).toEqual(before);
 s.purchaseCoupons=1;expect(r2PurchasePrice(s,offer)).toBe(2);expect(toolInfo('T18',s).summary).toBe(info.summary);
 expect(getR2Tool('T18')).toEqual(definition);expect(definition.name).toBe('免费逛摊');expect(definition.operation).toEqual({kind:'free-reroll',advanceCount:true,growth:false});
});
