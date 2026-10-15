import {it,expect} from 'vitest';
import {createRun,applyCommand,assertRunInvariants,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2CreateJoker,r2ScoreContext} from '../src/domain/r2Run';
import {r2Price} from '../src/domain/r2Shop';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {shopRecommendation} from '../src/game/ShopRecommendation';
import {shopOfferGuidance} from '../src/game/ShopOfferGuidance';
import {shopPurchaseCashFacts,shopPurchaseConditionLosses,shopReplacementTransactionFacts,shopReplacementCompactFacts} from '../src/game/ShopRouteRelations';
function setup(gold:number,id='e08'){
 let s=createRun({seed:'post-purchase-condition',runId:'post-purchase-condition',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});
 // Leave the protected starter shop through public commands before specifying test stock.
 for(const type of ['LeaveShop','SkipStage','OpenShop'] as const)s=send(s,{type});
 s.gold=gold;s.purchaseCoupons=0;s.jokers=[r2CreateJoker('b02','held/base',4,'none',s)];
 const o={offerId:'public/stock',definitionId:id,price:r2Price(id,'none',s),edition:'none' as const,consumed:false};
 s.shop!.offers=[o];assertRunInvariants(s);return {s,o};
}
function send(s:R2RunState,action:Parameters<typeof applyCommand>[1]['action']){
 const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/test/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
 expect(r.ok,r.ok?'':r.code).toBe(true);if(!r.ok)throw Error(r.code);return r.state;
}
function baoEvents(s:R2RunState){
 const hand=[...s.deckInstances.filter(c=>c.rank===7).slice(0,2),...s.deckInstances.filter(c=>c.rank===8).slice(0,2)];
 const selectedIds=hand.map(c=>c.id);
 const t=scoreR2Hand({rulesVersion:'r2',runId:s.runId,rootId:'public/threshold',hand,selectedIds,disabledIds:[],jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:s.rng.rule,...r2ScoreContext(s,hand,selectedIds)});
 return t.events.filter(e=>e.sourceDefinitionId==='e08'&&e.operation==='multiply-multiplier');
}
it.each([[26,18,2,false],[28,20,3,true]] as const)('new Baochang uses actual %i→%i cash, shared guidance and real scorer', (gold,after,stars,active)=>{
 const {s,o}=setup(gold),before=structuredClone(s);
 expect(shopRecommendation(s,o,'group').stars).toBe(stars);
 const g=shopOfferGuidance(s,o);expect(g).toMatchObject({stars,operation:'可购买'});expect(g.condition).toContain(`买后${after}金`);
 expect(g.purchaseConditionLosses.length).toBe(active?0:1);if(!active)expect(g.detail).toContain('买后18金，暂不触发');
 const bought=send(s,{type:'BuyOffer',offerId:o.offerId});expect(bought.gold).toBe(after);expect(baoEvents(bought).length>0).toBe(active);
 expect(s).toEqual(before);
});
it('buying zero-growth b10 accounts for the retained Baochang loss',()=>{
 const {s,o}=setup(26,'b10');s.jokers.push(r2CreateJoker('e08','held/bao',8,'none',s));s.gold=23;
 const before=structuredClone(s),g=shopOfferGuidance(s,o);expect(g.stars).toBe(1);expect(g.operation).toBe('可购买');expect(g.operationShort).toBe('现金风险');expect(g.detail).toContain('23→19');expect(g.detail).toContain('包场买后19金，暂不触发');
 expect(baoEvents(send(s,{type:'BuyOffer',offerId:o.offerId}))).toHaveLength(0);expect(s).toEqual(before);
});
it('full slots require the specified actual sale, preserve growth/discount consequences and clear on changing selection',()=>{
 const {s,o}=setup(24);s.jokers=['b02','e02','e06','e05','e11'].map((id,i)=>r2CreateJoker(id,'held/'+i,i===1?2:8,'none',s));
 s.jokers[4].growth.coefficient={n:'3',d:'2'};s.purchaseCoupons=1;s.shop!.purchases=0;
 const before=structuredClone(s),discount=s.jokers[1],other=s.jokers[4];
 expect(shopPurchaseCashFacts(s,o)).toEqual({status:'needs-selection'});expect(shopOfferGuidance(s,o)).toMatchObject({operation:'需替换',replaceId:undefined,purchaseConditionLosses:[]});expect(shopOfferGuidance(s,o).condition).toContain('先指定替换对象');
 for(const [sold,gold,price,stars] of [[discount,19,6,2],[other,23,5,2]] as const){
  const g=shopOfferGuidance(s,o,sold),tx=shopReplacementTransactionFacts(s,o,sold);
  expect(g.stars).toBe(stars);expect(tx).toMatchObject({status:'ready',price,goldAfterPurchase:gold});expect(g.purchaseConditionLosses).toEqual(tx.cashLosses);
  expect(shopReplacementCompactFacts(s,sold,tx).join('\n')).toContain(`买后${gold}金`);
  if(gold<20)expect(g.detail).toContain('暂不触发');else expect(g.purchaseConditionLosses).toEqual([]);
  expect(tx.growthEffects.join('\n')).toContain('旧物新用');expect(tx.growthEffects.join('\n')).toContain('置办行头');
 }
 expect(shopOfferGuidance(s,o)).toMatchObject({replaceId:undefined,purchaseConditionLosses:[]});expect(s).toEqual(before);
});
it('selling an expansion with excess tools never fabricates affordable purchase cash',()=>{
 const {s,o}=setup(26);s.jokers.push(r2CreateJoker('e09','capacity',8,'none',s));s.consumables=['T01','T02','T03'].map((definitionId,i)=>({instanceId:'tool/'+i,definitionId}));
 const before=structuredClone(s);expect(shopPurchaseCashFacts(s,o,s.jokers[1])).toMatchObject({status:'blocked',code:'over-capacity-after-sale'});expect(shopPurchaseConditionLosses(s,o,s.jokers[1])).toEqual([]);expect(s).toEqual(before);
});
it('full Joker slots do not suppress a legal tool purchase warning for retained Baochang',()=>{
 const {s}=setup(23);s.jokers=['e08','b02','e01','e05','e06'].map((id,i)=>r2CreateJoker(id,'held/'+i,8,'none',s));
 const o={offerId:'public/tool',definitionId:'T01',price:4,consumed:false};s.shop!.toolOffers=[o];
 expect(shopPurchaseCashFacts(s,o)).toMatchObject({status:'assessed',goldAfterPurchase:19});expect(shopPurchaseConditionLosses(s,o).join('\n')).toContain('包场买后19金，暂不触发');
});
it('discounted purchase uses the real threshold, while ordinary high / rare low / five-star core remain possible',()=>{
 const {s,o}=setup(26);s.purchaseCoupons=1;expect(shopOfferGuidance(s,o)).toMatchObject({stars:3,condition:expect.stringContaining('买后20金')});s.purchaseCoupons=0;expect(shopOfferGuidance(s,o).stars).toBe(2);
 const high={...o,definitionId:'b06',price:r2Price('b06','none',s)};s.gold=0;expect(shopOfferGuidance(s,high)).toMatchObject({stars:4,operation:expect.stringContaining('差')});
 s.deckInstances=s.deckInstances.filter(c=>c.rank===7||c.rank===8&&c.suit!=='spades'||c.rank===9&&['hearts','clubs'].includes(c.suit)||c.rank===10&&c.suit==='hearts');
 expect(shopRecommendation(s,high,'group').stars).toBe(5);
});
