import type {R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {r2CreateJoker,r2ConsumableCapacity} from '../domain/r2Run';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {r2JokerCapacity,r2HandLimit} from '../domain/r2Resources';
import {stableHash} from '../domain/hash';
import {R2_GROUP_HAND_TYPES} from '../domain/r2GroupHands';
import {R2_ENHANCEMENTS} from '../content/r2Tools';
import {Rational} from '../domain/rational';
import {readR2Modifiers,type Condition} from '../content/r2Schema';
import {r2ScoringDisabledJokerIds} from '../domain/scoreR2';
import {evaluateR2Hand} from '../domain/evaluateR2';
import type {BuildFocus} from './BuildDirectionPreferences';
import {isR2RouteGrowth} from '../domain/r2GroupUpgrade';
import {shopRouteGrowthFacts} from './ShopRouteGrowthFacts';
import {shopPurchaseCashFacts} from './ShopRouteRelations';
import type {R2JokerInstance} from '../content/r2Schema';

/** Audited against e48fd07's resolved 72 definitions. Changed/older semantics require review. */
export const SHOP_RECOMMENDATION_SEMANTICS='json-fnv-v1:bd8fa974db581460';
export const SHOP_C2_RECOMMENDATION_SEMANTICS='json-fnv-v1:91387711fbe1298d';
export const SHOP_RECOMMENDATION_AUDIT={
 pengci:'triple',mantangcai:'group-heat',tiesuanpan:'face-score',huimaqiang:'third-play',jiedongfeng:'straight-flush-add',
 a03:'first-score',a05:'repeat-growth',b02:'pair-score',b03:'group-growth',b04:'two-groups',
 c02:'red-score',c04:'straight-heat',c06:'flush-growth',d01:'held-face',d03:'held-growth',d05:'discard-refund',
 d10:'empty-slots',e01:'clear-income',e03:'capital-heat',e05:'buy-growth',e08:'capital-multiply',
 f02:'last-play',f03:'first-play',f09:'no-discard',a04:'small-deck',a06:'diverse-coefficient',a07:'single-discard-income',
 a08:'low-score',b05:'triple-score',b06:'group-retrigger',b07:'all-score-heat',b08:'group-income',
 c03:'black-score',c05:'discard-charge',c07:'flush-retrigger',c08:'four-straight',d02:'held-low',d04:'even-retrigger',
 d06:'hand-space',d07:'all-score-mult',e02:'purchase-discount',e04:'capital-income',e06:'sell-growth',e07:'last-income',
 f04:'low-capital',f05:'rising-growth',f06:'temporary-multiply',f07:'rescue',a09:'short-play',a10:'held-multiply',
 a11:'house-retrigger',a12:'short-income',b09:'quad-multiply',b10:'group-heat-growth',b11:'matching-held',b12:'quad-refund',
 c09:'four-flush',c10:'held-ace',c11:'route-transition',c12:'route-reward',d08:'held-paper',d09:'retrigger-growth',
 d11:'third-retrigger',d12:'held-income',e09:'tool-space',e10:'clear-tool',e11:'sale-reset-coefficient',e12:'reroll-growth',
 f08:'chance-heat',f10:'opening-rescue',f11:'low-score-growth',f12:'last-clear-coefficient',
} as const;
/** PR121 9c56744: six reviewed semantic changes; other 66 duties stay shared. */
export const SHOP_C2_RECOMMENDATION_AUDIT={...SHOP_RECOMMENDATION_AUDIT,
 mantangcai:'group-heat-c2',c04:'straight-heat-growth-c2',c06:'flush-family-growth-c2',
 jiedongfeng:'route-family-add-c2',e11:'sale-keeps-coefficient-c2',f10:'opening-discard-rescue-c2',
} as const;
export type RecommendationStars=0|1|2|3|4|5;
export interface ShopRecommendation {stars:RecommendationStars;reason:string;condition:string;detail:string;stage:'early'|'mid'|'late';combination:string;facts:Readonly<Record<string,number|boolean|string>>}
const hashes=new WeakMap<object,string>();
/** No affordability rating, RNG, future piles or stored recommendation. Cash gates use purchase cash. */
export function shopRecommendation(state:R2RunState,offer:R2Offer,focus?:BuildFocus,sold?:R2JokerInstance):ShopRecommendation {
 const cash=offer.definitionId==='e08'||sold?shopPurchaseCashFacts(state,offer,sold):undefined;
 // Every specified sale removes its sources/modifiers and applies real sale hooks.
 // The original state, RNG and storage remain untouched.
 if(cash?.status==='assessed')state=cash.afterSale;
 const definitions=r2JokerDefinitionsFor(state);let hash=hashes.get(definitions);if(!hash){hash=stableHash(definitions);hashes.set(definitions,hash);}
 const c2=isR2RouteGrowth(state)&&hash===SHOP_C2_RECOMMENDATION_SEMANTICS;
 const audited=c2||hash===SHOP_RECOMMENDATION_SEMANTICS;
 const routeGrowth=c2?shopRouteGrowthFacts(state):undefined;
 const stage=state.chapter<=2?'early':state.chapter<=5?'mid':'late';
 const cards=state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id)),ranks=new Map<number,number>(),suits=new Map<string,number>();
 for(const c of cards){ranks.set(c.rank,(ranks.get(c.rank)??0)+1);suits.set(c.suit,(suits.get(c.suit)??0)+1);}
 const counts=[...ranks.values()].sort((a,b)=>b-a),largest=counts[0]??0,second=counts[1]??0,largestSuit=Math.max(0,...suits.values());
 const groupConcentrated=largest>=3&&second>=2&&largest+second>=Math.max(7,Math.ceil(cards.length*.5));
 const flushConcentrated=largestSuit>=Math.max(6,Math.ceil(cards.length*.5));
 const consecutive=(pool:typeof cards,length:number)=>{const ranks=new Set(pool.flatMap(c=>c.rank===14?[1,14]:[c.rank]));return Array.from({length:15-length},(_,i)=>i+1).some(start=>Array.from({length},(_,j)=>start+j).every(r=>ranks.has(r)));};
 const straightPossible=consecutive(cards,5),straightConcentrated=straightPossible&&ranks.size<=9;
 const modifiers=readR2Modifiers(state.jokers,definitions),handRules={fourStraight:modifiers.fourStraight,fourFlush:modifiers.fourFlush};
 // Existence witnesses from the public deck only; no future draw/EV search.
 const ordinaryStraightPossible=[5,...(handRules.fourStraight?[4]:[])].some(length=>Array.from({length:15-length},(_,i)=>i+1).some(start=>{
  const pools=Array.from({length},(_,i)=>cards.filter(c=>c.rank===(start+i===1?14:start+i)));if(pools.some(p=>!p.length))return false;
  const witness=pools.map(p=>p[0]);if(witness.every(c=>c.suit===witness[0].suit)){const index=pools.findIndex(p=>p.some(c=>c.suit!==witness[0].suit));if(index>=0)witness[index]=pools[index].find(c=>c.suit!==witness[0].suit)!;}
  return evaluateR2Hand(witness,handRules).type==='straight';
 }));
 const ordinaryFlushPossible=[...suits.keys()].some(suit=>{
  const pool=cards.filter(c=>c.suit===suit),groups=[...new Set(pool.map(c=>c.rank))].map(rank=>pool.filter(c=>c.rank===rank));
  const seek=(i:number,left:number,witness:typeof cards):boolean=>{if(!left)return evaluateR2Hand(witness,handRules).type==='flush';if(i===groups.length)return false;for(let n=Math.min(left,groups[i].length);n>=0;n--)if(seek(i+1,left-n,[...witness,...groups[i].slice(0,n)]))return true;return false;};
  return pool.length>=5&&seek(0,5,[])||handRules.fourFlush&&pool.length>=4&&seek(0,4,[]);
 });
 const flushRetriggerPossible=ordinaryFlushPossible||[...suits.keys()].some(suit=>consecutive(cards.filter(card=>card.suit===suit),5));
 // C2's F family is broader than c07's unchanged ordinary-flush/SF trigger.
 const flushHousePossible=c2&&[...suits.keys()].some(suit=>{const ns=[...new Set(cards.filter(c=>c.suit===suit).map(c=>c.rank))].map(rank=>cards.filter(c=>c.suit===suit&&c.rank===rank).length).sort((a,b)=>b-a);return (ns[0]??0)>=3&&(ns[1]??0)>=2;});
 const flushFivePossible=c2&&[...suits.keys()].some(suit=>[...ranks.keys()].some(rank=>cards.filter(c=>c.suit===suit&&c.rank===rank).length>=5));
 const straightFamilyPossible=ordinaryStraightPossible||[...suits.keys()].some(suit=>consecutive(cards.filter(card=>card.suit===suit),5));
 const flushFamilyPossible=flushRetriggerPossible||flushHousePossible||flushFivePossible;
 const boosted=(c:typeof cards[number])=>!!c.edition&&c.edition!=='none'||R2_ENHANCEMENTS.find(e=>e.id===c.enhancement)?.effects.some(e=>e.phase==='onCardScore'&&['add-heat','add-multiplier','multiply-multiplier'].includes(e.kind))===true;
 const boostedGroup=largest>=3&&[...ranks].some(([r,n])=>n===largest&&cards.filter(c=>c.rank===r&&boosted(c)).length>=3);
 const houseCardPayoff=[...ranks].some(([triple,n])=>n>=3&&cards.filter(c=>c.rank===triple&&boosted(c)).length>=3&&[...ranks].some(([pair,m])=>pair!==triple&&m>=2&&cards.some(c=>c.rank===pair&&boosted(c))));
 const boostedHouse=groupConcentrated&&houseCardPayoff;
 const trace=state.lastTrace,groupRecord=!!trace&&R2_GROUP_HAND_TYPES.includes(trace.handType),houseRecord=!!trace&&['full-house','flush-house'].includes(trace.handType),flushRecord=!!trace&&['flush','straight-flush'].includes(trace.handType);
 const groupReady=focus==='group'&&(groupConcentrated||groupRecord),flushReady=focus==='flush'&&(flushConcentrated||flushRecord),straightReady=focus==='straight'&&straightConcentrated;
 const qualifiedRecord=!!trace&&!['high-card','pair'].includes(trace.handType),qualifiedReady=groupConcentrated||straightReady||flushReady||qualifiedRecord;
 const knownBoss=state.stageIndex%3===2?state.boss:null;
 const sealedIds=state.stage?.index===state.stageIndex?state.stage.sealedJokerIds:[];
 const disabledSources=new Set(r2ScoringDisabledJokerIds(knownBoss,state.jokers,definitions,sealedIds,state.chapterDisabledJokerId));
 const scoringJokers=state.jokers.filter(j=>!disabledSources.has(j.instanceId));
 const heldDefinitions=scoringJokers.map(j=>definitions.find(d=>d.id===j.definitionId)!);
 const heldCardPayoff=heldDefinitions.some(d=>d.hooks.some(h=>h.phase==='onCardScore'&&h.operations.some(o=>['add-heat','add-multiplier'].includes(o.kind))&&
  (h.condition.kind==='always'||h.condition.kind==='paired-rank'&&largest>=h.condition.minimum||h.condition.kind==='rank-in'&&cards.filter(c=>h.condition.kind==='rank-in'&&h.condition.values.includes(c.rank)).length>=3||h.condition.kind==='suit-in'&&cards.filter(c=>h.condition.kind==='suit-in'&&h.condition.values.includes(c.suit)).length>=Math.ceil(cards.length*.5))));
 const heldGroupPayoff=heldDefinitions.some(d=>d.hooks.some(h=>h.phase==='onCardScore'&&h.operations.some(o=>['add-heat','add-multiplier'].includes(o.kind))&&[...ranks].some(([rank,n])=>n===largest&&cards.filter(c=>c.rank===rank&&(h.condition.kind==='always'||h.condition.kind==='paired-rank'&&n>=h.condition.minimum||h.condition.kind==='rank-in'&&h.condition.values.includes(c.rank)||h.condition.kind==='suit-in'&&h.condition.values.includes(c.suit))).length>=3)));
 const retriggerSource=scoringJokers.some(j=>j.definitionId==='b06'&&largest>=2||j.definitionId==='a11'&&largest>=3&&second>=2||j.definitionId==='c07'&&flushRetriggerPossible||j.definitionId==='d11'&&cards.length>=3||j.definitionId==='d04');
 // A sustained qualified-hand base needs an executable public condition, not
 // just an operation tag. This checks availability, never next-hand odds.
 const multiplierCondition=(c:Condition):boolean=>{
  switch(c.kind){
   case 'always':return true;
   case 'paired-rank':return largest>=c.minimum;
   case 'rank-groups':return counts.filter(n=>n>=c.groupSize).length>=c.minimum;
   case 'held-rank-first':return r2HandLimit(state)>=4&&cards.some(card=>c.values.includes(card.rank));
   case 'held-scoring-rank-first':return r2HandLimit(state)>=4&&largest>=3;
   case 'resource-maximum':return c.resource==='gold'&&state.gold<=c.maximum;
   case 'resource':return c.resource==='play-index'&&c.equals===1&&state.phase==='shop';
   case 'all-played-active':return cards.length>=c.minimum;
   // A ≤2-card short program cannot share an a06 qualified main hand.
   case 'played-count-maximum':return false;
   case 'hand-type-in':return c.values.some(type=>type==='three-kind'?largest>=3:type==='straight'?ordinaryStraightPossible:type==='flush'?ordinaryFlushPossible:type==='straight-flush'?[...suits.keys()].some(suit=>consecutive(cards.filter(card=>card.suit===suit),5)):type==='flush-house'?flushHousePossible:type==='flush-five'?flushFivePossible:false);
   default:return false;
  }
 };
 const additiveSource=scoringJokers.some(j=>{const d=definitions.find(d=>d.id===j.definitionId)!;return d.hooks.some(h=>multiplierCondition(h.condition)&&h.operations.some(o=>o.kind==='add-multiplier'&&Rational.fromJSON(o.value).compare(new Rational(0n))>0||o.kind==='read-growth'&&o.target==='multiplier'&&Rational.fromJSON(j.growth[o.key]??{n:'0',d:'1'}).compare(new Rational(0n))>0));});
 const potentialStages=state.tourMode==='endless'?6:Math.max(0,24-state.stageIndex),growthWindow=stage!=='late'&&potentialStages>=6;
 const facts={cards:cards.length,largest,second,largestSuit,groupConcentrated,flushConcentrated,straightConcentrated,ordinaryStraightPossible,ordinaryFlushPossible,boostedGroup,houseCardPayoff,boostedHouse,groupRecord,houseRecord,flushRecord,qualifiedRecord,heldCardPayoff,heldGroupPayoff,retriggerSource,additiveSource,disabledSourceCount:disabledSources.size,potentialStages,growthWindow,initialGrowth:JSON.stringify(r2CreateJoker(offer.definitionId,'recommendation/'+offer.offerId,offer.price,offer.edition,state).growth),...(c2?{straightFamilyPossible,flushFamilyPossible,flushHousePossible,flushFivePossible,routeGrowth:JSON.stringify(routeGrowth)}:{})};
 const d=definitions.find(d=>d.id===offer.definitionId),rules=c2?SHOP_C2_RECOMMENDATION_AUDIT:SHOP_RECOMMENDATION_AUDIT,rule=rules[offer.definitionId as keyof typeof SHOP_RECOMMENDATION_AUDIT];
 // Potential is a public prerequisite, never a saved activation or a star bonus.
 const potential=rule==='group-retrigger'&&(boostedGroup||heldGroupPayoff)?'同点重触可接加成，待触发':
  rule==='house-retrigger'&&houseCardPayoff?'葫芦重触可接加成，待触发':
  rule==='flush-retrigger'&&flushRetriggerPossible?'可重触同花尾牌，核对尾牌加成':
  rule==='retrigger-growth'?(retriggerSource?'已有重触来源，成长待触发':'尚缺可用重触来源'):
  rule==='diverse-coefficient'?(additiveSource?'已有加倍率来源，换型待触发':'换型待触发，核对加倍率来源'):'';
 const recorded=state.jokers.filter(j=>trace?.events.some(e=>e.sourceType==='joker'&&e.sourceInstanceId===j.instanceId&&['onCardScore','onHeldCard','jokerScore'].includes(e.phase)&&(JSON.stringify(e.before)!==JSON.stringify(e.after)||e.operation==='retrigger-card'&&Rational.fromJSON(e.value).compare(new Rational(0n))>0))).map(j=>definitions.find(d=>d.id===j.definitionId)!.name);
 const combination=(potential?'组合潜力：'+potential+'。\n':'')+(recorded.length>=2?'组合记录：上手'+recorded.join('、')+'共同计分（新牌未参与）。':'组合记录：尚无两张现持牌共同计分。');
 const result=(stars:RecommendationStars,reason:string,condition:string):ShopRecommendation=>({stars,reason,condition,stage,combination,facts,detail:reason+'；'+condition+(d?'。'+d.description:'')+(stars>=4?`\n公开依据：最大同点组${largest}张，前两组${largest+second}/${cards.length}张；最大花色${largestSuit}/${cards.length}张；已持逐牌加成${heldCardPayoff?'有':'无'}；剩余场次窗口${potentialStages}。`:'')+'\n'+combination+'\n共同计分不代表额外奖励或下手必触发，新现货尚未加入上手记录。\n推荐指数不等于稀有度或路线契合；星星不代表必买或稳赚，需结合替换损失。\n基于公开构筑与当前阶段的推荐；不表示指定替换净更强。'+(routeGrowth?'\n'+routeGrowth.detail:'')});
 if(sold&&cash?.status==='blocked')return result(0,'替换不可执行','先核对出售限制');
 if(!audited||!rule||!d)return result(0,'规则待核','该身份尚未审计');
 const scoreHooks=d.hooks.some(h=>['jokerScore','onCardScore','onHeldCard'].includes(h.phase));
 if(scoreHooks&&state.chapterDisabledJokerId===d.id)return result(1,'本章计分停用','静态与经营效果另核');
 if(scoreHooks&&state.stageIndex%3===2&&state.boss.definitionId==='B16'&&d.rarity==='rare')return result(1,'本场稀有计分停用','封禁结束再考虑');
 const growth=(ready:boolean,reason:string,condition:string)=>result(ready&&growthWindow?4:stage==='late'?2:3,reason,condition+(stage==='late'?' · 新购从初值开始':''));
 const count=(predicate:(c:typeof cards[number])=>boolean)=>cards.filter(predicate).length;
 const groupFit=focus==='group'||groupRecord,flushFit=focus==='flush'||flushRecord,straightFit=focus==='straight';
 switch(rule){
   case 'group-heat-c2':return result(largest<2?1:groupFit?(stage==='late'?2:3):2,'成组热度+90','含五条与同花升级牌型');
   case 'straight-heat-growth-c2':return !straightFamilyPossible?result(1,'缺顺子成长条件','新购成长为0'):growth(straightFit||straightConcentrated||!!trace&&['straight','straight-flush'].includes(trace.handType),'顺子热度与成长','热+50 · 成长+10/上限100');
   case 'flush-family-growth-c2':return !flushFamilyPossible?result(1,'缺同花族成长条件','新购成长为0'):growth(flushFit||flushConcentrated||!!trace&&['flush-house','flush-five'].includes(trace.handType),'同花族长倍率','含同花升级 · +0.5/上限6');
   case 'route-family-add-c2':return result(!straightFamilyPossible&&!flushFamilyPossible?1:straightReady||flushReady||flushConcentrated&&flushFamilyPossible?4:straightFit||flushFit?3:2,'顺花族加倍率1.5','含同花葫芦与同花五条');
   case 'sale-keeps-coefficient-c2':return result(stage==='late'?2:potentialStages>=6?4:3,'不出售跨场成长','卖其他牌保倍率 · 下一场不成长');
   case 'opening-discard-rescue-c2':return result(largest>=3||second>=2||straightFamilyPossible||flushFamilyPossible?3:2,'首次弃牌备救火','未出牌首弃 · 下手两对以上×3');
  case 'triple':return result(largest<3?1:groupReady?4:groupFit?3:2,'主手三条加倍率','需主手三条');
  case 'group-heat':return result(largest<2?1:groupFit?(stage==='late'?2:3):2,'成组基础热度','普通成组牌型');
  case 'pair-score':return result(largest<2?1:groupReady&&heldCardPayoff?4:groupFit?3:2,'同点逐牌加倍率','计分点数实际重复');
  case 'two-groups':return result(second<2?1:groupReady?4:groupFit?3:2,'两组同点加倍率','需两对或葫芦');
  case 'face-score':return result(count(c=>c.rank>=11)<3?2:count(c=>c.rank>=11)>=Math.ceil(cards.length*.5)?4:3,'人头逐牌加热','只读有效JQKA');
  case 'low-score':return result(count(c=>c.rank<=5)<3?2:count(c=>c.rank<=5)>=Math.ceil(cards.length*.5)?4:3,'低点逐牌加热','有效2至5');
  case 'triple-score':return result(largest<3?1:groupReady?4:groupFit?3:2,'三同点逐牌加热','需至少三张同点');
  case 'red-score':case 'black-score':{const n=count(c=>rule==='red-score'?['hearts','diamonds'].includes(c.suit):['spades','clubs'].includes(c.suit));return result(n===0?1:n>=Math.ceil(cards.length*.7)?4:3,'对应花色逐牌加热',rule==='red-score'?'有效红桃或方片':'有效黑桃或梅花');}
  case 'straight-heat':return result(!straightPossible?1:straightFit?(stage==='late'?2:3):2,'顺子基础热度','普通顺子或同花顺');
  case 'straight-flush-add':return result(straightReady||flushReady?4:straightFit||flushFit?3:2,'顺花加倍率','普通顺花或同花顺');
  case 'group-growth':case 'group-heat-growth':return largest<2?result(1,'缺成组成长条件','新购成长为0'):growth(groupFit,rule==='group-growth'?'持续长倍率':'持续长热度','成组后增长 · 下手生效');
  case 'flush-growth':return largestSuit<5?result(1,'缺同花成长条件','新购成长为0'):growth(flushFit,'持续长倍率','普通同花后增长');
  case 'repeat-growth':return growth(qualifiedReady,'重复主手长热度','连续相同合格主手');
  case 'held-growth':return growth(cards.length>=8,'留牌长热度','每手留至少3张');
  case 'buy-growth':return growth(potentialStages>=6,'后续买牌长热度','先持有 · 再买其他牌');
  case 'sell-growth':return result(stage==='late'?2:3,'后续出售长倍率','换入前的出售不成长');
  case 'reroll-growth':return result(stage==='late'?2:3,'付费刷新长热度','免费刷新不成长');
  case 'rising-growth':return result(growthWindow&&additiveSource?3:2,'递增得分长倍率','不升分会归零');
  case 'low-score-growth':return result(2,'低分后长热度','未过关且低于目标10%');
  case 'retrigger-growth':return retriggerSource?growth(true,'重触后长倍率','需实际额外重触'):result(2,'尚缺重触来源','新购成长为0');
  case 'diverse-coefficient':return result(stage==='late'?(qualifiedReady?3:2):groupConcentrated&&boostedGroup&&additiveSource&&growthWindow?5:qualifiedReady?4:groupFit||flushFit||straightFit?3:2,'长期相乘成长','新购×1.5 · 连续不同合格主手');
  case 'sale-reset-coefficient':return result(stage==='late'?2:potentialStages>=6?4:3,'不出售跨场成长','初始×1 · 出售其他重置');
  case 'last-clear-coefficient':return result(stage==='late'?2:3,'压线过关系数成长','新购×1 · 最后一手成功');
  case 'group-retrigger':return result(largest<2?1:groupConcentrated&&(boostedGroup||heldGroupPayoff)?5:groupFit||boostedGroup||heldGroupPayoff?4:2,'成组核心逐牌重触','最大原始同点组有效牌');
  case 'house-retrigger':return result(largest<3||second<2?1:(groupConcentrated||houseRecord)&&boostedHouse?5:groupConcentrated||houseRecord||houseCardPayoff?4:2,'葫芦整组重触','只读葫芦或同花葫芦');
  case 'flush-retrigger':return result(largestSuit<5?1:flushReady&&cards.some(boosted)||flushReady&&heldCardPayoff?4:flushFit?3:2,'同花尾牌重触','普通同花或同花顺');
  case 'third-retrigger':return result(cards.length<3?1:heldCardPayoff||count(boosted)>=3?4:3,'第三计分牌重触','第三原始牌须有效');
  case 'even-retrigger':return result(heldCardPayoff||count(boosted)>=3?4:3,'偶数手首牌重触','每场第偶数次出牌');
  case 'capital-multiply':{
   if(cash?.status!=='assessed')return result(2,'替换待核',cash?.status==='blocked'?'指定出售不可执行，余额待核':'先指定替换对象，再核20金');
   const gold=cash.goldAfterPurchase;
   return result(gold>=20&&additiveSource?4:2,gold>=0&&gold<20?'暂不触发':'持金放大倍率',gold<0?'当前买不起；需留20金':`买后${gold}金，${gold>=20?'满足20金门槛':'暂不触发'}`);
  }
  case 'quad-multiply':return result(largest<4?1:groupConcentrated&&additiveSource?4:2,'四条以上相乘','需四条或更高同点组');
  case 'route-transition':return result(straightConcentrated&&flushConcentrated&&ordinaryStraightPossible&&ordinaryFlushPossible?4:2,'普通顺花交替相乘','首手与同花顺不触发');
  case 'no-discard':return result(additiveSource&&(groupReady||flushReady||straightReady)?4:3,'未弃牌相乘','本场成功弃牌即停用');
  case 'third-play':return result(3,'第三手相乘','本场每第3次出牌');
  case 'temporary-multiply':return result(stage==='late'?3:2,'短期爆发相乘','第4次出牌后销毁');
  case 'chance-heat':return result(2,'随机补热度','每手1/3 · 未中为0');
  case 'held-face':case 'held-multiply':{const n=count(c=>c.rank>=11&&c.rank<=13);return result(n===0?1:n>=Math.ceil(cards.length*.4)?4:2,'人头持牌收益','需把JQK留下');}
  case 'held-low':return result(count(c=>c.rank<=5)===0?1:2,'低点持牌加热','前4位持牌2至5');
  case 'held-ace':return result(count(c=>c.rank===14)===0?1:count(c=>c.rank===14)>=4?3:2,'持A加倍率','前2张有效持A');
  case 'held-paper':return result(count(c=>c.enhancement==='voice-paper')===0?1:count(c=>c.enhancement==='voice-paper')>=Math.max(3,Math.ceil(cards.length*.25))?4:2,'留声纸持牌相乘','前2张有效留声纸');
  case 'matching-held':return result(largest<3?1:groupReady?4:2,'同点持牌加倍率','有效计分牌同点持牌');
  case 'four-straight':return result(!consecutive(cards,4)?1:straightFit?4:2,'普通四顺更易成型','同花顺仍需5张');
  case 'four-flush':return result(largestSuit<4?1:flushFit?4:2,'普通四花更易成型','扩展同花仍需5张');
  case 'small-deck':return result(cards.length>40||r2HandLimit(state)>=14?1:cards.length<=32?4:3,'小牌组扩手','下次进场 · 牌组≤40');
  case 'hand-space':return result(r2HandLimit(state)>=14?1:3,'增加下场手牌','下次进场 · 总上限14');
  case 'empty-slots':return result(state.jokers.length>=r2JokerCapacity(state)-1?1:stage==='late'?2:3,'空槽加热','买入也占一槽');
  case 'capital-heat':return result(state.gold>=15?3:2,'持金加热度','每金+2 · 最多60');
  case 'low-capital':return result(state.gold<=3?3:2,'低余额加倍率','计分前余额≤3金');
  case 'purchase-discount':return result(potentialStages>=6?3:2,'后续首购省金','买它不减本笔 · 不保回本');
  case 'capital-income':return result(state.gold>=20&&potentialStages>=6?3:2,'本金持续产金','奖励前每10金 · 最多6');
  case 'clear-income':case 'group-income':return result(potentialStages<3?2:rule==='group-income'&&!groupFit?2:3,'过关增加收入',rule==='group-income'?'成组致胜 · 不保证过关':'成功过关 · 跳场不给');
  case 'clear-tool':return result(potentialStages<3?2:3,'连续过关赠工具','每两次成功 · 满槽转金');
  case 'tool-space':return result(r2ConsumableCapacity(state)>=4?1:state.consumables.length>=r2ConsumableCapacity(state)?4:2,'扩一道具容量','售后超容量会拒绝');
  case 'last-income':return result(2,'最后一手过关加金','失败和跳场不给');
  case 'held-income':return result(groupReady&&cards.length>=9?3:2,'成组留牌过关加金','两对以上 · 至少留4张');
  case 'short-income':return result(focus==='group'?3:2,'短主手过关加金','本场每手均不超过4张');
  case 'route-reward':return result(straightConcentrated&&flushConcentrated&&ordinaryStraightPossible&&ordinaryFlushPossible?3:2,'普通顺花过关赠工具','本场实际打过两种');
  case 'discard-refund':return result(3,'增加一次弃牌机会','每场首次成功弃牌');
  case 'single-discard-income':return result(potentialStages<3?2:3,'单弃带来收入','每场最多两次');
  case 'discard-charge':return result(flushFit?3:2,'同色弃牌蓄热','下手消费 · 场末清零');
  case 'opening-rescue':return result(groupFit?3:2,'开场缺件救火','先弃牌预备 · 下手成组');
  case 'quad-refund':return result(largest>=4&&groupReady?3:2,'四条未过关返手','每场一次 · 不保过关');
  case 'rescue':return result(state.safetyNetUsed?1:3,'耗尽出牌时续手','每局一次 · 需有可用牌');
  case 'first-score':return result(retriggerSource?4:3,'首有效牌加热','合格主手 · 重触可再读');
  case 'all-score-heat':case 'all-score-mult':return result(3,rule==='all-score-heat'?'全有效打牌加热':'全有效打牌加倍率','所出牌全部有效计分');
  case 'first-play':return result(3,'首手加倍率','每场第一手');
  case 'last-play':return result(2,'最后一手加热','本手后无出牌余量');
  case 'short-play':return result(3,'短手加倍率','实际出牌≤2张');
 }
}
