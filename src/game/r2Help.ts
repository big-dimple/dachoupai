import type {R2JokerDefinition,R2JokerInstance} from '../content/r2Schema';
import {getR2Joker} from '../domain/r2Shop';
import type {DomainEvent} from '../domain/run';
import {SCORE_LIMITS,type ScoreEvent} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';

/** Short entry hints; values and full conditions still come from the content definition. */
export const R2_OFFER_USE:Record<string,string>={
  pengci:'高牌加倍率',mantangcai:'对子等加热',tiesuanpan:'JQKA加热',huimaqiang:'每3手翻倍',jiedongfeng:'顺/同花增倍',
  a03:'单张加热',a04:'小牌组扩手',a05:'单张成长',a06:'高牌乘倍',a07:'单弃加金',a08:'小点数加热',
  b02:'重复增倍',b03:'对子型成长',b04:'两组增倍',b05:'三张同点加热',b06:'对子重触发',b07:'全计分加热',b08:'对子致胜加金',
  c02:'红牌加热',c03:'黑牌加热',c04:'顺子加热',c05:'同花弃牌蓄热',c06:'同花成长',c07:'末张重触发',c08:'四张普通顺子',
  d01:'留JQK增倍',d02:'留小点数加热',d03:'留≥3张成长',d04:'偶数手首张重触发',d05:'首弃返次',d06:'手牌扩容',d07:'全计分增倍',d10:'空槽加热',
  e01:'过关加金',e02:'每店首购优惠',e03:'金币加热',e04:'提高利息上限',e05:'买别牌成长',e06:'卖别牌成长',e07:'末手致胜加金',e08:'≥20金增倍',
  f02:'末手加热',f03:'首手增倍',f04:'低金币增倍',f05:'逐手突破成长',f06:'四手乘倍',f07:'耗尽时救场',f09:'不弃增倍',
};

export function r2MechanismBadge(definition:R2JokerDefinition){
  const operations=definition.hooks.flatMap(hook=>hook.operations),modifier=definition.modifiers?.[0];
  if(modifier?.kind==='hand-limit')return {label:'手牌扩容',value:'+'+modifier.amount+' 手牌',paper:0xdce9df};
  if(modifier?.kind==='four-straight')return {label:'规则修正',value:'4张顺子',paper:0xe2e3ed};
  if(modifier?.kind==='first-purchase-discount')return {label:'首购优惠',value:'−'+modifier.amount+' 金',paper:0xf2dfbc};
  if(modifier?.kind==='interest-cap')return {label:'利息上限',value:'+'+modifier.amount+' 金',paper:0xf2dfbc};
  const stored=operations.find(operation=>operation.kind==='consume-growth');
  if(stored)return {label:'弃牌蓄热',value:'待用热度',paper:0xdce9df};
  const lifetime=operations.find(operation=>operation.kind==='expire-after-hands');
  if(lifetime?.kind==='expire-after-hands')return {label:'有限寿命',value:lifetime.limit+' 手',paper:0xf0d3c7};
  if(operations.some(operation=>operation.kind==='rescue-hand'))return {label:'安全网',value:'救场1次',paper:0xe2e3ed};
  const growth=operations.find(operation=>operation.kind==='add-growth'||operation.kind==='update-score-growth');
  if(growth?.kind==='add-growth'||growth?.kind==='update-score-growth')return {label:'成长',value:'+'+fractionText(growth.value),paper:0xdce9df};
  const repeat=operations.find(operation=>operation.kind==='retrigger-card');
  if(repeat?.kind==='retrigger-card')return {label:'重触发',value:'额外'+repeat.count+'次',paper:0xe2e3ed};
  const times=operations.find(operation=>operation.kind==='multiply-multiplier');
  if(times?.kind==='multiply-multiplier')return {label:'×倍率',value:'×'+fractionText(times.value),paper:0xf0d3c7};
  const plus=operations.find(operation=>operation.kind==='add-multiplier');
  if(plus?.kind==='add-multiplier')return {label:'+倍率',value:'+'+fractionText(plus.value),paper:0xdce9df};
  const heat=operations.find(operation=>operation.kind==='add-heat');
  if(heat?.kind==='add-heat')return {label:'计分热度',value:'+'+fractionText(heat.value),paper:0xd8e9e3};
  const economy=operations.find(operation=>operation.kind==='add-heat-per-gold'||operation.kind==='add-heat-per-empty-slot');
  if(economy?.kind==='add-heat-per-gold'||economy?.kind==='add-heat-per-empty-slot')return {label:economy.kind==='add-heat-per-gold'?'金币计分':'空槽计分',value:'+'+fractionText(economy.value),paper:0xf2dfbc};
  const gold=operations.find(operation=>operation.kind==='add-gold'||operation.kind==='add-gold-limited');
  if(gold?.kind==='add-gold'||gold?.kind==='add-gold-limited')return {label:'金币收益',value:'+'+gold.amount+' 金',paper:0xf2dfbc};
  if(operations.some(operation=>operation.kind==='refund-discard'))return {label:'返还弃牌',value:'返1次',paper:0xe2e3ed};
  return {label:'构筑计分',value:'',paper:0xf2dfbc};
}

export function r2JokerValue(joker:R2JokerInstance,context:{gold:number;jokerCount:number;jokerSlots:number;deckSize:number;discardsUsed?:number}):string {
  const definition=getR2Joker(joker.definitionId),operations=definition.hooks.flatMap(hook=>hook.operations);
  const lifetime=operations.find(operation=>operation.kind==='expire-after-hands');
  if(lifetime?.kind==='expire-after-hands')return '余'+Math.max(0,lifetime.limit-(joker.counters?.handsScored??0))+'手';
  const limited=operations.find(operation=>operation.kind==='add-gold-limited');
  if(limited?.kind==='add-gold-limited')return '余'+Math.max(0,limited.limit-(joker.counters?.singleDiscards??0))+'次';
  const stored=operations.find(operation=>operation.kind==='consume-growth');
  if(stored?.kind==='consume-growth')return '待用+'+fractionText(joker.growth[stored.key]??{n:'0',d:'1'});
  const growth=operations.find(operation=>operation.kind==='read-growth');
  if(growth?.kind==='read-growth')return '+'+fractionText(joker.growth[growth.key]??{n:'0',d:'1'});
  const heat=operations.find(operation=>operation.kind==='add-heat-per-gold'||operation.kind==='add-heat-per-empty-slot');
  if(heat?.kind==='add-heat-per-gold'||heat?.kind==='add-heat-per-empty-slot'){
    const count=heat.kind==='add-heat-per-gold'?context.gold:Math.max(0,context.jokerSlots-context.jokerCount),raw=Rational.fromJSON(heat.value).multiply(new Rational(BigInt(count))),cap=Rational.fromJSON(heat.cap);
    return '+'+fractionText((raw.compare(cap)>0?cap:raw).toJSON());
  }
  const modifier=definition.modifiers?.find(modifier=>modifier.kind==='hand-limit');
  if(modifier?.kind==='hand-limit'&&modifier.deckMaximum!==undefined&&context.deckSize>modifier.deckMaximum)return '未生效';
  if(operations.some(operation=>operation.kind==='refund-discard'))return (context.discardsUsed??0)>0?'本场已用':'首弃返1';
  return r2MechanismBadge(definition).value;
}

export function r2JokerStateText(joker:R2JokerInstance):string {
  const definition=getR2Joker(joker.definitionId),operations=definition.hooks.flatMap(hook=>hook.operations);
  const names:Record<string,string>={heat:'热度成长',multiplier:'倍率成长',pendingHeat:'待用热度'};
  const state=Object.entries(joker.growth).map(([key,value])=>(names[key]??'成长')+' '+fractionText(value));
  const lifetime=operations.find(operation=>operation.kind==='expire-after-hands');
  if(lifetime?.kind==='expire-after-hands')state.push('累计出牌 '+(joker.counters?.handsScored??0)+' / '+lifetime.limit+' 手，余 '+Math.max(0,lifetime.limit-(joker.counters?.handsScored??0))+' 手');
  const limited=operations.find(operation=>operation.kind==='add-gold-limited');
  if(limited?.kind==='add-gold-limited')state.push('本场收益 '+(joker.counters?.singleDiscards??0)+' / '+limited.limit+' 次');
  return state.join('；')||'无成长或使用计数';
}

export function r2JokerExtraHelp(definition:R2JokerDefinition):string {
  const notes:string[]=[];
  if(definition.hooks.some(hook=>hook.operations.some(operation=>operation.kind==='retrigger-card')))notes.push('每张牌每手最多额外重触发 '+SCORE_LIMITS.extraRetriggers+' 次，最深 '+SCORE_LIMITS.retriggerDepth+' 层；重触发不重复角色或整手能力。');
  if(definition.modifiers?.some(modifier=>modifier.kind==='hand-limit'))notes.push('手牌上限只在进场锁定；不返还已消费资源。所有加成后的手牌硬上限为14。');
  if(definition.modifiers?.some(modifier=>modifier.kind==='four-straight'))notes.push('四张只用于普通顺子，同花顺仍须五张；A234可成顺子，QKA2不成顺子。');
  return notes.length?'\n'+notes.join('\n'):'';
}

export function r2ScoreOperationText(event:ScoreEvent):string {
  const value=fractionText(event.value);
  const resource=event.resourceBefore!==undefined&&event.resourceAfter!==undefined?' · '+event.resourceBefore+' → '+event.resourceAfter:'';
  if(event.operation==='add-gold'||event.operation==='add-gold-limited')return '+'+value+' 金'+resource;
  if(event.operation==='ordinary-points-suppressed')return '普通点数归零';
  if(event.operation==='retrigger-card')return '额外重触发 '+value+' 次';
  if(event.operation==='retrigger-cap')return '重触发达到上限';
  if(event.operation==='consume-growth')return '+'+value+' 热度 · 蓄热已消费清空';
  if(event.operation==='add-growth')return '成长 +'+value+' · 下手生效';
  if(event.operation==='reset-growth')return '成长归零 · 下手生效';
  if(event.operation==='score-growth-baseline')return '首手仅记录分数 · 成长不变';
  if(event.operation==='increment-hands-scored')return '累计使用 '+value+' 手';
  if(event.operation==='destroy-joker')return event.sourceDefinitionId==='f07'?'救场完成 · 销毁此实例':'寿命用尽 · 销毁此实例';
  if(event.operation==='rescue-hand')return '返还 '+value+' 次出牌'+resource;
  if(event.operation==='multiply-multiplier')return '×'+value+' 倍率';
  const heatChanged=event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d;
  return '+'+value+(heatChanged||event.operation==='add-heat'?' 热度':' 倍率');
}

type JokerTransaction=Extract<DomainEvent,{type:'joker-transaction'}>;
export function r2TransactionText(event:JokerTransaction):string {
  const source=getR2Joker(event.definitionId),[n,d='1']=event.amount.split('/'),amount=fractionText({n,d});
  let effect:string;
  if(event.operation==='add-gold'||event.operation==='add-gold-limited')effect='+'+amount+' 金';
  else if(event.operation==='refund-discard')effect='返还 '+amount+' 次弃牌';
  else if(event.operation==='rescue-hand')effect='返还 '+amount+' 次出牌';
  else if(event.operation==='destroy-joker')effect='销毁此实例';
  else effect=(event.definitionId==='c05'?'待用热度':'成长')+' +'+amount+' · 后续出牌生效';
  return source.name+' · '+effect;
}
