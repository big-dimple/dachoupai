import type {R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import type {R2JokerInstance} from '../content/r2Schema';
import {r2CreateJoker} from '../domain/r2Run';
import {r2JokerDefinitionFor,r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {shopPurchaseCashFacts,shopPurchaseConditionLosses} from './ShopRouteRelations';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from './JokerMemory';
import {findShopSynergy} from './ShopSynergy';
import {fractionText} from './scoreText';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2ScoringDisabledJokerIds} from '../domain/scoreR2';
import {R2_GROUP_HAND_TYPES} from '../domain/r2GroupHands';
import {HAND_LABELS} from '../content/handLabels';
import type {CardAbilityCopy} from './CardCopy';

/** Public purchase facts have no shared strength scale or assumed starter choice. */
export function shopDecisionCopy(run:R2RunState,offer:R2Offer,sold?:R2JokerInstance){
 const cash=shopPurchaseCashFacts(run,offer,sold),source=cash.status==='assessed'?cash.afterSale:run;
 const d=r2JokerDefinitionFor(source,offer.definitionId),fresh=r2CreateJoker(d.id,'decision/'+offer.offerId,offer.price,offer.edition,source);
 const disabled=r2ScoringDisabledJokerIds(source.stageIndex%3===2?source.boss:null,[...source.jokers,fresh],r2JokerDefinitionsFor(source),[],source.chapterDisabledJokerId).includes(fresh.instanceId);
 const publicState=cash.status==='assessed'&&cash.goldAfterPurchase>=0?{...source,gold:cash.goldAfterPurchase}:source;
 const ctx=publicJokerMemoryContext(publicState,{hand:[],scoringLimited:disabled,deckSize:source.deckInstances.length-source.destroyedIds.length,jokerSlots:r2JokerCapacity(source),jokerCount:source.jokers.length});
 const ability=jokerAbilityCopyForRun(source,d.id,undefined,ctx),plain=ability.plain;
 const read=d.hooks.flatMap(h=>h.operations).find(o=>o.kind==='read-growth');
 const growth=d.hooks.find(h=>h.operations.some(o=>o.kind==='add-growth'));
 const gain=growth?.operations.find(o=>o.kind==='add-growth');
 let now=plain?.effectLine??plain?.tile.split('\n').slice(0,2).join(' · ')??d.description;
 let later=plain?.timingLine?.split('；')[0]??plain?.tile.split('\n')[0]??'';
 let kind='条件收益',purchaseAbility:CardAbilityCopy|undefined;
 if(read?.kind==='read-growth'&&gain?.kind==='add-growth'&&read.key===gain.key&&!plain?.fallback){
  now='新购'+(read.target==='heat'?'热度':'倍率')+'+'+fractionText(fresh.growth[read.key]??{n:'0',d:'1'});kind='先成长';
  const c=growth!.condition,types=c.kind==='hand-type-in'?c.values:[];
  const grouped=types.length===R2_GROUP_HAND_TYPES.length&&R2_GROUP_HAND_TYPES.every(t=>types.includes(t));
  const trigger=types.length===4&&['flush','straight-flush','flush-house','flush-five'].every(t=>types.includes(t as never))?'同花族':grouped?'成组':growth!.phase==='onSellJoker'?'成功卖牌':growth!.phase==='onBuyOffer'?'再买其他牌':growth!.phase==='onReroll'?'付费换牌':later.replace(/出牌后$/,'').replace(/后$/,'');
  later=trigger+'后+'+fractionText(gain.value)+'，下手用';
  // A conditional fixed bonus plus saved growth is not a zero-output growth card.
  const [base,stored,update]=d.hooks;
  if(d.hooks.length===3&&base.phase==='jokerScore'&&stored.phase==='jokerScore'&&update.phase==='afterHand'&&base.operations.length===1&&stored.operations.length===1&&update.operations.length===1&&base.operations[0].kind==='add-heat'&&stored.operations[0].kind==='read-growth'&&stored.condition.kind==='always'&&read.target==='heat'&&base.condition.kind==='hand-type-in'&&update.condition.kind==='hand-type-in'&&base.condition.values.join('|')===update.condition.values.join('|')){
   const condition=base.condition.values.map(t=>HAND_LABELS[t]).join('/');
   now=condition+'热度+'+fractionText(base.operations[0].value)+'；新购成长+'+fractionText(fresh.growth[read.key]??{n:'0',d:'1'});
   later='上述牌型结算后成长+'+fractionText(gain.value)+'，下手用';kind='基础与成长';
   purchaseAbility={...ability,state:'',plain:{...plain!,effectLine:disabled?'本场计分停用':now,timingLine:later+(gain.cap?'（上限'+fractionText(gain.cap)+'）':''),essential:'已有成长每手可用，跨场保留。'}};
  }
 }
 if(disabled)now='本场计分停用';
 const synergy=findShopSynergy(source,d.id);
 const losses=shopPurchaseConditionLosses(run,offer,sold);
 const connection=synergy.tradeoff??losses[0]??(synergy.matches.length?'已持'+synergy.matches.map(m=>'「'+m.name+'」'+m.shortReason).join('；'):source.jokers.length?'尚未确认与已持牌配合':'尚无持牌，先看单卡条件');
 const transaction=offer.consumed?'已收入':cash.status==='assessed'?cash.goldAfterPurchase<0?'还差'+(-cash.goldAfterPurchase)+'金':'购后'+cash.goldAfterPurchase+'金':'先选替换对象，再核余额';
 return {now,later,kind,connection,transaction,purchaseAbility,full:[now,later,connection,transaction].filter(Boolean).join('\n')};
}
