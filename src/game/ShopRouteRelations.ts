import type {R2RunState} from '../domain/r2Run';
import type {Condition,R2JokerInstance} from '../content/r2Schema';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {R2_GROUP_HAND_TYPES} from '../domain/r2GroupHands';
import {r2CreateJoker} from '../domain/r2Run';
import {r2PurchasePrice,salePrice,type R2Offer} from '../domain/r2Shop';
import type {BuildFocus} from './BuildJourney';
import {r2ConditionDescription} from './JokerMemory';
import {r2JokerStateText} from './r2Help';
import {buildGrowthProgress} from './BuildGrowthProgress';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
const labels={group:'同点成组',straight:'顺子接续',flush:'同花集中'};
const focuses=['group','straight','flush'] as const;
function conditionRoutes(c:Condition):BuildFocus[]{
 const types=c.kind==='hand-type-in'||c.kind==='hand-type-relation'||c.kind==='stage-hand-types-all'||c.kind==='hand-type-unfinished'?c.values:c.kind==='hand-type-transition'?[c.current,c.previous]:c.kind==='scoring-position'?c.handTypes:undefined;
 if(types)return focuses.filter(f=>types.some(t=>(f==='group'?R2_GROUP_HAND_TYPES:f==='straight'?['straight','straight-flush']:['flush','straight-flush']).includes(t)));
 return ['largest-scoring-rank-group','paired-rank','rank-groups'].includes(c.kind)?['group']:[];
}
/** Purpose describes public conditions, never present activation or a recommended sale. */
export function shopRouteRelation(state:R2RunState,j:R2JokerInstance,focus:BuildFocus|undefined){
 const d=r2JokerDefinitionFor(state,j.definitionId),routes=new Set<BuildFocus>();
 for(const h of d.hooks)for(const f of conditionRoutes(h.condition))routes.add(f);
 for(const m of d.modifiers??[])if(m.kind==='four-straight')routes.add('straight');else if(m.kind==='four-flush')routes.add('flush');
 const general=d.hooks.some(h=>!conditionRoutes(h.condition).length&&h.operations.some(o=>o.kind==='read-growth'||o.kind==='consume-growth'?Number(j.growth[o.key]?.n??0)>0:true))||!!d.modifiers?.some(m=>m.kind!=='four-straight'&&m.kind!=='four-flush');
 const kind=!focus?'unfocused':routes.has(focus)?'direct':general||!routes.size?'support':'other';
 const label=kind==='direct'?'路线直接条件':kind==='support'?'通用辅助':kind==='other'?'其它路线机会':'尚未选方向';
 const tag=kind==='direct'?'主线':kind==='support'?'辅助':kind==='other'?'转向':'待选';
 const conditions=[...new Set(d.hooks.filter(h=>h.condition.kind!=='always').map(h=>r2ConditionDescription(h.condition)))].join('；');
 const opportunity=[...routes].map(f=>labels[f]).join('／');
 return {kind,label,tag,body:label+' · '+(opportunity?'明确条件涉及'+opportunity+'。':'不专属某一种牌型。')+'\n'+d.description+'\n'+conditions+'\n用途不表示已发动或最优；仍按实际条件、封禁和保存事件检查。'};
}
export function shopOfferRelation(state:R2RunState,o:R2Offer,focus:BuildFocus|undefined){
 return shopRouteRelation(state,r2CreateJoker(o.definitionId,'preview/'+o.offerId,r2PurchasePrice(state,o),o.edition,state),focus);
}
/** Deterministic public on-sale effects on retained instances; no command, RNG or scoring preview. */
export function shopSaleConsequences(state:R2RunState,sold:R2JokerInstance):string[]{
 if(state.phase!=='shop'||!state.shop||!state.jokers.some(j=>j.instanceId===sold.instanceId))return [];
 const rows:string[]=[];
 for(const [index,j] of state.jokers.entries()){
  if(j.instanceId===sold.instanceId)continue;
  const d=r2JokerDefinitionFor(state,j.definitionId),growth={...j.growth};
  for(const hook of d.hooks){
   if(hook.phase!=='onSellJoker'||hook.condition.kind!=='always')continue;
   for(const op of hook.operations){
    if(op.kind==='add-growth'){
     const before=Rational.fromJSON(growth[op.key]??{n:'0',d:'1'}),raw=before.add(Rational.fromJSON(op.value)),cap=Rational.fromJSON(op.cap),after=raw.compare(cap)>0?cap:raw;
     growth[op.key]=after.toJSON();const read=d.hooks.flatMap(h=>h.operations).find(o=>o.kind==='read-growth'&&o.key===op.key);
     const unit=read?.kind==='read-growth'&&read.target==='multiplier'?'倍率成长':'热度成长';
     rows.push(`${d.name}（第${index+1}槽）保留：${unit} +${fractionText(before.toJSON())} → +${fractionText(after.toJSON())}（上限${fractionText(op.cap)}${after.compare(before)===0?'，本次不再增加':''}）。`);
    }else if(op.kind==='reset-coefficient'){
     const before=growth[op.key];if(!before)continue;growth[op.key]=op.initial;
     rows.push(`${d.name}（第${index+1}槽）保留：系数 ×${fractionText(before)} → ×${fractionText(op.initial)}。`);
    }
   }
  }
  if(d.hooks.some(h=>h.phase==='onStageClear'&&h.condition.kind==='no-joker-sale-this-stage'))rows.push(d.name+'：'+(state.shop.soldJoker?'本店已出售，该资格已失去；本次仍不满足':'本次出售将使下一场“本场未出售”的过关成长条件不满足')+'；不会在这里获得过关成长。');
 }
 return rows;
}
export function shopReplacementFacts(state:R2RunState,offer:R2Offer,held:R2JokerInstance,focus:BuildFocus|undefined){
 const d=r2JokerDefinitionFor(state,held.definitionId),other=r2JokerDefinitionFor(state,offer.definitionId);
 const growth=buildGrowthProgress(state).filter(p=>p.instanceId===held.instanceId).map(p=>p.metric+'；'+p.cause).join('\n');
 const coSources=state.jokers.filter(j=>j.instanceId!==held.instanceId&&state.lastTrace?.events.some(e=>e.sourceType==='joker'&&e.sourceInstanceId===held.instanceId)&&state.lastTrace?.events.some(e=>e.sourceType==='joker'&&e.sourceInstanceId===j.instanceId)).map(j=>r2JokerDefinitionFor(state,j.definitionId).name);
 const ownConditions=d.hooks.map(h=>JSON.stringify(h.condition)).filter(c=>c!==JSON.stringify({kind:'always'}));
 const shared=state.jokers.filter(j=>j.instanceId!==held.instanceId&&r2JokerDefinitionFor(state,j.definitionId).hooks.some(h=>ownConditions.includes(JSON.stringify(h.condition)))).map(j=>r2JokerDefinitionFor(state,j.definitionId).name);
 return {saleEffects:shopSaleConsequences(state,held),held:shopRouteRelation(state,held,focus),offer:shopOfferRelation(state,offer,focus),loss:'出售将失去「'+d.name+'」的效果、版次和当前实例：'+r2JokerStateText(held,d)+(growth?'\n'+growth:'')+'。同名新购牌从新实例初值开始，不继承成长。',connections:(shared.length?'与'+shared.join('、')+'共享条件；共同满足仍分别检查，不保证额外加成。\n':'')+(coSources.length?'上手已保存来源也包括'+coSources.join('、')+'；出售会移除这张来源，不保证下一手仍共同触发。':'未记录与现持其它牌在上手共同触发；这不代表没有配合机会。'),money:'当前余额 '+state.gold+' 金；该牌基础卖价 '+salePrice(held.paidPrice)+' 金；现货「'+other.name+'」当前实付 '+r2PurchasePrice(state,offer)+' 金。出售和购买分别确认，交易来源、优惠和售后余额以实际保存结果重算。'};
}
