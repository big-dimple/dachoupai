import type {R2RunState} from '../domain/r2Run';
import type {Condition,R2JokerInstance,R2JokerDefinition} from '../content/r2Schema';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {R2_GROUP_HAND_TYPES} from '../domain/r2GroupHands';
import {r2CreateJoker} from '../domain/r2Run';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2PurchasePrice,salePrice,type R2Offer} from '../domain/r2Shop';
import type {BuildFocus} from './BuildJourney';
import {r2ConditionDescription} from './JokerMemory';
import {r2JokerStateText} from './r2Help';
import {buildGrowthProgress} from './BuildGrowthProgress';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
const labels={group:'同点成组',straight:'顺子接续',flush:'同花集中'};
const focuses=['group','straight','flush'] as const;
const effectNames:Record<string,string>={heat:'热度',multiplier:'倍率',multiply:'相乘倍率',retrigger:'再次计分',gold:'过关金币','four-straight':'四张顺子','four-flush':'四张同花'};
function effectRoles(d:R2JokerDefinition){
 const roles=new Set<string>();for(const h of d.hooks)for(const o of h.operations){
  if(o.kind==='add-heat'||o.kind==='add-heat-per-gold'||o.kind==='add-heat-per-empty-slot')roles.add('heat');
  if(o.kind==='add-multiplier')roles.add('multiplier');
  if(o.kind==='read-growth'||o.kind==='consume-growth')roles.add(o.target);
  if(o.kind==='multiply-multiplier'||o.kind==='read-coefficient')roles.add('multiply');
  if(o.kind==='retrigger-card')roles.add('retrigger');
  if(o.kind==='add-gold'&&h.phase==='onStageClear')roles.add('gold');
 }for(const m of d.modifiers??[])if(m.kind==='four-straight'||m.kind==='four-flush')roles.add(m.kind);return [...roles];
}
function routePossible(state:R2RunState,c:Condition,focus:BuildFocus,size=5){
 const cards=state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id));
 const counts=[...new Set(cards.map(c=>c.rank))].map(r=>cards.filter(c=>c.rank===r).length);
 if(c.kind==='hand-type-transition'||c.kind==='hand-type-relation'||c.kind==='stage-hand-types-all'||c.kind==='hand-type-unfinished')return false;
 if(focus==='group'&&c.kind==='hand-type-in')return c.values.some(t=>t==='pair'?counts.some(n=>n>=2):t==='two-pair'?counts.filter(n=>n>=2).length>=2:t==='three-kind'?counts.some(n=>n>=3):t==='full-house'?counts.some((n,i)=>n>=3&&counts.some((m,j)=>j!==i&&m>=2)):t==='four-kind'?counts.some(n=>n>=4):false);
 if(focus==='group'&&c.kind==='paired-rank')return counts.some(n=>n>=c.minimum);
 if(focus==='group'&&c.kind==='rank-groups')return counts.filter(n=>n>=c.groupSize).length>=c.minimum;
 if(focus==='group'&&c.kind==='largest-scoring-rank-group')return counts.some(n=>n>=2);
 if(focus==='flush')return [...new Set(cards.map(c=>c.suit))].some(s=>cards.filter(c=>c.suit===s).length>=size);
 if(focus==='straight'){const ranks=new Set(cards.flatMap(c=>c.rank===14?[1,14]:[c.rank]));return Array.from({length:15-size},(_,i)=>i+1).some(start=>Array.from({length:size},(_,i)=>start+i).every(r=>ranks.has(r)));}
 return true;
}
function savedInvestment(state:R2RunState,j:R2JokerInstance){
 const fresh=r2CreateJoker(j.definitionId,'advice/initial',j.paidPrice,j.edition,state);
 return !!j.edition&&j.edition!=='none'||Object.entries(j.growth).some(([k,v])=>Rational.fromJSON(v).compare(Rational.fromJSON(fresh.growth[k]??{n:'0',d:'1'}))>0)||Object.values(j.counters??{}).some(v=>typeof v==='number'?v>0:v===true)||!!state.lastTrace?.events.some(e=>e.sourceType==='joker'&&e.sourceInstanceId===j.instanceId);
}
function shortEffect(d:R2JokerDefinition){
 const values=d.hooks.flatMap(h=>h.operations).flatMap(o=>o.kind==='add-multiplier'?['倍率+'+fractionText(o.value)]:o.kind==='add-heat'?['热度+'+fractionText(o.value)]:o.kind==='multiply-multiplier'?['倍率×'+fractionText(o.value)]:[]);return [...new Set(values)].join('、')||d.description.split('；')[0];
}
export interface ShopRouteAdviceItem {offer:R2Offer;verdict:'consider'|'compare'|'skip';reason:string;replaceId?:string;loss?:string}
/** Conservative current-state advice layered on the existing relation/price/replacement facts. No score or future draws. */
export function shopRouteAdvice(state:R2RunState,focus:BuildFocus){
 const held=state.jokers.map(j=>({j,d:r2JokerDefinitionFor(state,j.definitionId),relation:shopRouteRelation(state,j,focus)}));
 const roles=new Set(held.filter(h=>h.relation.kind!=='other').flatMap(h=>effectRoles(h.d)));
 const items:ShopRouteAdviceItem[]=(state.phase==='shop'?state.shop?.offers??[]:[]).filter(o=>!o.consumed).map(offer=>{
  const d=r2JokerDefinitionFor(state,offer.definitionId),relation=shopOfferRelation(state,offer,focus),price=r2PurchasePrice(state,offer),base={offer,verdict:'skip' as const};
  if(held.some(h=>h.j.definitionId===d.id))return {...base,reason:'已经持有同名牌，不能重复购买；先留金。'};
  if(price>state.gold)return {...base,reason:`实付${price}金，当前还差${price-state.gold}金；这轮先留金。`};
  if(relation.kind==='other')return {...base,reason:`它的条件不补当前${labels[focus]}；想用它时先主动换方向。`};
  const missing=effectRoles(d).filter(r=>!roles.has(r));
  const routeHooks=d.hooks.filter(h=>conditionRoutes(h.condition).includes(focus));
  const direct=relation.kind==='direct'&&missing.length>0&&(routeHooks.some(h=>routePossible(state,h.condition,focus))||(d.modifiers??[]).some(m=>m.kind==='four-'+focus&&routePossible(state,{kind:'always'},focus,4)));
  const multiplier=d.hooks.some(h=>h.condition.kind==='always'&&h.operations.some(o=>o.kind==='multiply-multiplier'&&Rational.fromJSON(o.value).compare(Rational.fromJSON({n:'1',d:'1'}))>0));
  const additive=held.filter(h=>h.relation.kind==='direct'&&effectRoles(h.d).includes('multiplier')&&Object.values(h.j.growth).some(v=>Rational.fromJSON(v).compare(Rational.fromJSON({n:'0',d:'1'}))>0));
  const support=relation.kind==='support'&&multiplier&&additive.length>0&&!roles.has('multiply');
  if(!direct&&!support){const same=held.filter(h=>effectRoles(h.d).some(r=>effectRoles(d).includes(r)));return {...base,reason:same.length?`已有${same[0].d.name}（${r2JokerStateText(same[0].j,same[0].d)}）；新牌${shortEffect(d)}，未补明确缺口，建议先不买。`:`当前构筑没有明确需要它的条件；${shortEffect(d)}，这轮先留金。`};}
  const reason=direct?`补当前缺少的${missing.map(r=>effectNames[r]).join('／')}，用于${labels[focus]}；实付${price}金。`:`可接${additive.map(h=>h.d.name).join('、')}已存倍率，再作相乘；实付${price}金。`;
  if(state.jokers.length<r2JokerCapacity(state))return {offer,verdict:'consider',reason};
  const replace=held.find(h=>h.relation.kind==='other'&&!savedInvestment(state,h.j));
  if(!replace){const investment=held.find(h=>savedInvestment(state,h.j));return {...base,reason:investment?`槽位已满；${investment.d.name}（${r2JokerStateText(investment.j,investment.d)}）应先保留，不为本件先丢成长/来源；这轮留金。`:'槽位已满；没有明确可换的非路线牌，建议这轮留金。'};}
  const loss=shopReplacementFacts(state,offer,replace.j,focus),saleEffects=shopSaleConsequences(state,replace.j);
  if(saleEffects.length)return {...base,reason:`换掉${replace.d.name}还会影响保留牌的出售联动；先留金，完整损失可查看。`};
  return {offer,verdict:'compare',replaceId:replace.j.instanceId,reason:reason+`先比较第${state.jokers.indexOf(replace.j)+1}槽${replace.d.name}。`,loss:`出售会失去${replace.d.name}：${shortEffect(replace.d)}；基础卖价${salePrice(replace.j.paidPrice)}金。`,details:loss.loss};
 });
 const priority=(i:ShopRouteAdviceItem)=>{const d=r2JokerDefinitionFor(state,i.offer.definitionId),r=effectRoles(d);return shopOfferRelation(state,i.offer,focus).kind==='support'?4:r.some(r=>r.startsWith('four-'))?0:r.some(r=>r==='heat'||r==='multiplier')?1:r.includes('retrigger')?2:3;};
 const candidates=items.filter(i=>i.verdict!=='skip').sort((a,b)=>priority(a)-priority(b)||r2PurchasePrice(state,a.offer)-r2PurchasePrice(state,b.offer));
 return {items,candidates,headline:candidates.length?(candidates[0].verdict==='compare'?'先看替换：':'优先考虑：')+r2JokerDefinitionFor(state,candidates[0].offer.definitionId).name:`这轮不买，留${state.gold}金`,reason:candidates[0]?.reason??'当前货架没有明确补强这条路线的牌；保留现有构筑，或主动换方向。'};
}
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
