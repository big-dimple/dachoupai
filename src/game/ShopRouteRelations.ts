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
export function shopReplacementFacts(state:R2RunState,offer:R2Offer,held:R2JokerInstance,focus:BuildFocus|undefined){
 const d=r2JokerDefinitionFor(state,held.definitionId),other=r2JokerDefinitionFor(state,offer.definitionId);
 const growth=buildGrowthProgress(state).filter(p=>p.instanceId===held.instanceId).map(p=>p.metric+'；'+p.cause).join('\n');
 const coSources=state.jokers.filter(j=>j.instanceId!==held.instanceId&&state.lastTrace?.events.some(e=>e.sourceType==='joker'&&e.sourceInstanceId===held.instanceId)&&state.lastTrace?.events.some(e=>e.sourceType==='joker'&&e.sourceInstanceId===j.instanceId)).map(j=>r2JokerDefinitionFor(state,j.definitionId).name);
 const ownConditions=d.hooks.map(h=>JSON.stringify(h.condition)).filter(c=>c!==JSON.stringify({kind:'always'}));
 const shared=state.jokers.filter(j=>j.instanceId!==held.instanceId&&r2JokerDefinitionFor(state,j.definitionId).hooks.some(h=>ownConditions.includes(JSON.stringify(h.condition)))).map(j=>r2JokerDefinitionFor(state,j.definitionId).name);
 return {held:shopRouteRelation(state,held,focus),offer:shopOfferRelation(state,offer,focus),loss:'出售将失去「'+d.name+'」的效果、版次和当前实例：'+r2JokerStateText(held,d)+(growth?'\n'+growth:'')+'。同名新购牌从新实例初值开始，不继承成长。',connections:(shared.length?'与'+shared.join('、')+'共享条件；共同满足仍分别检查，不保证额外加成。\n':'')+(coSources.length?'上手已保存来源也包括'+coSources.join('、')+'；出售会移除这张来源，不保证下一手仍共同触发。':'未记录与现持其它牌在上手共同触发；这不代表没有配合机会。'),money:'当前余额 '+state.gold+' 金；该牌基础卖价 '+salePrice(held.paidPrice)+' 金；现货「'+other.name+'」当前实付 '+r2PurchasePrice(state,offer)+' 金。出售和购买分别确认，交易来源、优惠和售后余额以实际保存结果重算。'};
}
