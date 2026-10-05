import type {R2JokerDefinition,R2JokerInstance} from '../content/r2Schema';
import {getR2Joker} from '../domain/r2Shop';
import type {DomainEvent} from '../domain/run';
import {SCORE_LIMITS,type ScoreEvent} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
import {HAND_LABELS} from '../content/handLabels';
import {getR2Tool} from '../content/r2Tools';

/** Short entry hints; values and full conditions still come from the content definition. */
export const R2_OFFER_USE:Record<string,string>={
  pengci:'高牌加倍率',mantangcai:'对子等加热',tiesuanpan:'JQKA加热',huimaqiang:'每3手翻倍',jiedongfeng:'顺/同花增倍',
  a03:'单张加热',a04:'小牌组扩手',a05:'单张成长',a06:'高牌乘倍',a07:'单弃加金',a08:'小点数加热',
  b02:'重复增倍',b03:'对子型成长',b04:'两组增倍',b05:'三张同点加热',b06:'对子重触发',b07:'全计分加热',b08:'对子致胜加金',
  c02:'红牌加热',c03:'黑牌加热',c04:'顺子加热',c05:'同花弃牌蓄热',c06:'同花成长',c07:'末张重触发',c08:'四张普通顺子',
  d01:'留JQK增倍',d02:'留小点数加热',d03:'留≥3张成长',d04:'偶数手首张重触发',d05:'首弃返次',d06:'手牌扩容',d07:'全计分增倍',d10:'空槽加热',
  e01:'过关加金',e02:'每店首购优惠',e03:'金币加热',e04:'提高利息上限',e05:'买别牌成长',e06:'卖别牌成长',e07:'末手致胜加金',e08:'≥20金增倍',
  f02:'末手加热',f03:'首手增倍',f04:'低金币增倍',f05:'逐手突破成长',f06:'四手乘倍',f07:'耗尽时救场',f09:'不弃增倍',
  a09:'小手增倍',a10:'单张留人头',a11:'单张重触发',a12:'小手过关加金',
  b09:'四/五条乘倍',b10:'普通对子成长',b11:'持牌匹配增倍',b12:'未致胜四条返次',
  c09:'四张普通同花',c10:'留A增倍',c11:'顺/同花交替乘倍',c12:'顺+同花过关赠染',
  d08:'留声持牌乘倍',d09:'回声促成长',d11:'原第三张重触发',d12:'留≥4张过关加金',
  e09:'消耗品扩容',e10:'隔次过关赠票',e11:'未卖牌过关系数',e12:'付费刷新成长',
  f08:'每手1/3加热',f10:'冷场乘倍',f11:'低分未胜成长',f12:'末手致胜系数',
};

export function r2MechanismBadge(definition:R2JokerDefinition){
  const operations=definition.hooks.flatMap(hook=>hook.operations),modifier=definition.modifiers?.[0];
  if(modifier?.kind==='hand-limit')return {label:'手牌扩容',value:'+'+modifier.amount+' 手牌',paper:0xdce9df};
  if(modifier?.kind==='four-straight')return {label:'规则修正',value:'4张顺子',paper:0xe2e3ed};
  if(modifier?.kind==='four-flush')return {label:'规则修正',value:'4张同花',paper:0xe2e3ed};
  if(modifier?.kind==='consumable-capacity')return {label:'库存扩容',value:'+'+modifier.amount+' 消耗品槽',paper:0xdce9df};
  if(modifier?.kind==='first-purchase-discount')return {label:'首购优惠',value:'−'+modifier.amount+' 金',paper:0xf2dfbc};
  if(modifier?.kind==='interest-cap')return {label:'利息上限',value:'+'+modifier.amount+' 金',paper:0xf2dfbc};
  const stored=operations.find(operation=>operation.kind==='consume-growth');
  if(stored)return {label:'弃牌蓄热',value:'待用热度',paper:0xdce9df};
  const lifetime=operations.find(operation=>operation.kind==='expire-after-hands');
  if(lifetime?.kind==='expire-after-hands')return {label:'有限寿命',value:lifetime.limit+' 手',paper:0xf0d3c7};
  if(operations.some(operation=>operation.kind==='rescue-hand'))return {label:'安全网',value:'救场1次',paper:0xe2e3ed};
  if(operations.some(operation=>operation.kind==='refund-hand-limited'))return {label:'返还出牌',value:'本场1次',paper:0xe2e3ed};
  const coefficient=operations.find(operation=>operation.kind==='add-coefficient');
  if(coefficient?.kind==='add-coefficient')return {label:'系数成长',value:'+'+fractionText(coefficient.value)+' 系数',paper:0xf0d3c7};
  const alternation=operations.find(operation=>operation.kind==='multiply-coefficient-once');
  if(alternation?.kind==='multiply-coefficient-once')return {label:'交替成长',value:'系数 ×'+fractionText(alternation.value),paper:0xf0d3c7};
  const rescue=operations.find(operation=>operation.kind==='rescue-multiplier');
  if(rescue?.kind==='rescue-multiplier')return {label:'一次救火',value:'×'+fractionText(rescue.value),paper:0xe2e3ed};
  const income=operations.find(operation=>operation.kind==='add-gold-per-held'||operation.kind==='add-gold-per-capital');
  if(income?.kind==='add-gold-per-held')return {label:'实际留牌收入',value:'留≥'+income.minimum+' · 最多'+income.cap+'金',paper:0xf2dfbc};
  if(income?.kind==='add-gold-per-capital')return {label:'奖励前本金收入',value:'每'+income.divisor+'金+1 · 最多'+income.cap+'金',paper:0xf2dfbc};
  const chance=operations.find(operation=>operation.kind==='chance-add-heat');
  if(chance?.kind==='chance-add-heat')return {label:'每手概率',value:chance.probability.n+'/'+chance.probability.d+' · +'+fractionText(chance.value)+' 热度',paper:0xd8e9e3};
  const reward=operations.find(operation=>operation.kind==='reward-consumable-pool'||operation.kind==='reward-consumable-every-clears');
  if(reward?.kind==='reward-consumable-pool')return {label:'过关赠品',value:'随机花色染',paper:0xf2dfbc};
  if(reward?.kind==='reward-consumable-every-clears')return {label:'过关赠票',value:'每'+reward.every+'次 · '+getR2Tool(reward.definitionId).name,paper:0xf2dfbc};
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

export function r2JokerValue(joker:R2JokerInstance,context:{gold:number;jokerCount:number;jokerSlots:number;deckSize:number;discardsUsed?:number;quadRefundUsed?:boolean},definition:R2JokerDefinition=getR2Joker(joker.definitionId)):string {
  const operations=definition.hooks.flatMap(hook=>hook.operations);
  if(joker.definitionId==='f09'&&(context.discardsUsed??0)>0)return '不再×1.5';
  const lifetime=operations.find(operation=>operation.kind==='expire-after-hands');
  if(lifetime?.kind==='expire-after-hands')return '余'+Math.max(0,lifetime.limit-(joker.counters?.handsScored??0))+'手';
  const limited=operations.find(operation=>operation.kind==='add-gold-limited');
  if(limited?.kind==='add-gold-limited')return '余'+Math.max(0,limited.limit-(joker.counters?.singleDiscards??0))+'次';
  const stored=operations.find(operation=>operation.kind==='consume-growth');
  if(stored?.kind==='consume-growth')return '待用+'+fractionText(joker.growth[stored.key]??{n:'0',d:'1'});
  const coefficient=operations.find(operation=>operation.kind==='read-coefficient');
  if(coefficient?.kind==='read-coefficient')return '×'+fractionText(joker.growth[coefficient.key]);
  if(operations.some(operation=>operation.kind==='reward-consumable-every-clears'))return joker.counters!.stageClears===1?'下关':'2关';
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
  if(operations.some(operation=>operation.kind==='refund-hand-limited'))return context.quadRefundUsed?'本场已用':'四条未胜返1';
  return r2MechanismBadge(definition).value;
}

export function r2JokerStateText(joker:R2JokerInstance,definition:R2JokerDefinition=getR2Joker(joker.definitionId)):string {
  const operations=definition.hooks.flatMap(hook=>hook.operations);
  const names:Record<string,string>={heat:'热度成长',multiplier:'倍率成长',pendingHeat:'待用热度'};
  const state=Object.entries(joker.growth).map(([key,value])=>key==='coefficient'?'乘法系数 ×'+fractionText(value):(names[key]??'成长')+' '+fractionText(value));
  const lifetime=operations.find(operation=>operation.kind==='expire-after-hands');
  if(lifetime?.kind==='expire-after-hands')state.push('累计出牌 '+(joker.counters?.handsScored??0)+' / '+lifetime.limit+' 手，余 '+Math.max(0,lifetime.limit-(joker.counters?.handsScored??0))+' 手');
  const limited=operations.find(operation=>operation.kind==='add-gold-limited');
  if(limited?.kind==='add-gold-limited')state.push('本场收益 '+(joker.counters?.singleDiscards??0)+' / '+limited.limit+' 次');
  if(operations.some(operation=>operation.kind==='reward-consumable-every-clears'))state.push('过关轮转 '+joker.counters!.stageClears+' / 1；'+(joker.counters!.stageClears===1?'下次成功过关赠票':'再成功过关两次赠票')+'，跳场不计');
  return state.join('；')||'无成长或使用计数';
}

export function r2JokerExtraHelp(definition:R2JokerDefinition):string {
  const notes:string[]=[];
  if(definition.hooks.some(hook=>hook.operations.some(operation=>operation.kind==='retrigger-card')))notes.push('每张牌每手最多额外重触发 '+SCORE_LIMITS.extraRetriggers+' 次，最深 '+SCORE_LIMITS.retriggerDepth+' 层；重触发不重复角色或整手能力。');
  if(definition.modifiers?.some(modifier=>modifier.kind==='hand-limit'))notes.push('手牌上限只在进场锁定；不返还已消费资源。所有加成后的手牌硬上限为14。');
  if(definition.modifiers?.some(modifier=>modifier.kind==='four-straight'))notes.push('四张只用于普通顺子，同花顺仍须五张；A234可成顺子，QKA2不成顺子。');
  if(definition.modifiers?.some(modifier=>modifier.kind==='four-flush'))notes.push('四张只用于普通同花，同花顺与扩展同花牌型仍须五张；同时允许四张顺子时，四张同花连续牌按普通同花结算。');
  if(definition.modifiers?.some(modifier=>modifier.kind==='consumable-capacity'))notes.push('与长期道具合计最多4个消耗品槽；出售或牺牲后超容量会拒绝，须先处理超额库存。');
  const operations=definition.hooks.flatMap(hook=>hook.operations);
  if(operations.some(operation=>operation.kind==='read-coefficient'))notes.push(operations.some(operation=>operation.kind==='multiply-coefficient-once')?'本次出牌读取开始时已保存的系数；出牌结算后的成长从下一次出牌生效。':'本手读取出牌开始时已保存的乘法系数；成功过关的新增系数从后续出牌生效。');
  if(operations.some(operation=>operation.kind==='reset-coefficient'))notes.push('本场包含入场前准备商店的销售；出售其他大丑牌立即重置系数，出售后再买回不恢复旧系数。');
  if(operations.some(operation=>operation.kind==='chance-add-heat'))notes.push('每个有效实例每手只判断一次；扑克重触发不增加判断，演出和回看不再抽随机结果。');
  if(operations.some(operation=>operation.kind==='refund-hand-limited'))notes.push('每场最多返还一次，先于耗尽失败判断；致胜四条、五条及扩展牌型不返还，实际出牌序号不回退。');
  const pool=operations.find(operation=>operation.kind==='reward-consumable-pool');
  if(pool?.kind==='reward-consumable-pool')notes.push(pool.definitionIds.map(id=>getR2Tool(id).name).join('、')+'各1/'+pool.definitionIds.length+'；满槽转'+pool.fallbackGold+'金币仍消费一次奖励随机，失败或跳场不赠。');
  if(operations.some(operation=>operation.kind==='reward-consumable-every-clears'))notes.push('固定赠票不消费奖励随机；0/1轮转跨场保存，失败或跳场不计数；满槽转2金币。');
  return notes.length?'\n'+notes.join('\n'):'';
}

export function r2ScoreOperationText(event:ScoreEvent,definition?:R2JokerDefinition):string {
  const value=fractionText(event.value);
  const resource=event.resourceBefore!==undefined&&event.resourceAfter!==undefined?' · '+event.resourceBefore+' → '+event.resourceAfter:'';
  if(event.operation==='lucky-multiplier-check')return '幸运倍率 · '+(event.value.n==='1'?'命中':'未命中')+'（1/5）';
  if(event.operation==='lucky-gold-check')return '幸运金币 · '+(event.value.n==='1'?'命中':'未命中')+'（1/15）';
  if(event.operation==='lucky-gold-cap')return '幸运金币本手已达'+value+'金上限';
  if(event.operation==='chance-heat-check'){
    const source=definition??getR2Joker(event.sourceDefinitionId),chance=source.hooks.flatMap(hook=>hook.operations).find(operation=>operation.kind==='chance-add-heat');
    return source.name+' · '+(event.value.n==='1'?'命中':'未命中')+'（每手1次，概率'+(chance?.kind==='chance-add-heat'?chance.probability.n+'/'+chance.probability.d:'未知')+'）';
  }
  if(event.operation==='glass-check')return event.value.n==='1'?'玻璃裂纹（碎裂概率1/4）':'玻璃完好（碎裂概率1/4）';
  if(event.operation==='destroy-card')return '玻璃碎裂 · 永久离开牌组';
  if(event.operation==='upgrade-hand')return (event.targetHandType?HAND_LABELS[event.targetHandType]:'牌型')+'升'+value+'级'+resource;
  if(event.operation==='reward-free-reroll')return '节目单兑现 · 下一商店免费换牌1次';
  if(event.operation==='program-reward-skipped')return '本章用过的牌型均满级 · 不重复升级';
  const prize=event.rewardDefinitionId?getR2Tool(event.rewardDefinitionId).name:event.sourceType==='rule'&&event.sourceDefinitionId==='T16'?'小红包':'赠品';
  if(event.operation==='reward-consumable')return '获得'+prize+' · 库存 '+event.resourceBefore+' → '+event.resourceAfter;
  if(event.operation==='add-gold'&&event.rewardDefinitionId)return prize+' · 库存已满转 +'+value+' 金'+resource;
  if(event.operation==='add-gold'||event.operation==='add-gold-limited')return '+'+value+' 金'+resource;
  if(event.operation==='ordinary-points-suppressed')return '普通点数归零';
  if(event.operation==='halve-base-heat')return '牌型基础热度 ÷2 · 点数与加成正常';
  if(event.operation==='seal-joker')return '计分封禁 · 下一手生效';
  if(event.operation==='retrigger-card')return '额外重触发 '+value+' 次';
  if(event.operation==='retrigger-cap')return '重触发达到上限';
  if(event.operation==='consume-growth')return '+'+value+' 热度 · 蓄热已消费清空';
  if(event.operation==='add-growth')return '成长 +'+value+' · 下手生效';
  if(event.operation==='reset-growth')return '成长归零 · 下手生效';
  if(event.operation==='score-growth-baseline')return '首手仅记录分数 · 成长不变';
  if(event.operation==='increment-hands-scored')return '累计使用 '+value+' 手';
  if(event.operation==='destroy-joker')return event.sourceDefinitionId==='f07'?'救场完成 · 销毁此实例':'寿命用尽 · 销毁此实例';
  if(event.operation==='rescue-hand')return '返还 '+value+' 次出牌'+resource;
  if(event.operation==='refund-hand')return '返还 '+value+' 次出牌'+resource+'（本场一次）';
  if(event.operation==='multiply-coefficient')return '出牌结算后系数 ×'+value+(event.growthBefore&&event.growthAfter?'：'+fractionText(event.growthBefore)+' → '+fractionText(event.growthAfter):'')+' · 下一次出牌生效';
  if(event.operation==='rescue-multiplier')return '救火 ×'+value+' 倍率';
  if(event.operation==='consume-rescue')return '救火已消耗';
  if(event.operation==='add-gold-per-held')return '实际留牌收入 +'+value+' 金'+resource;
  if(event.operation==='add-gold-per-capital')return '奖励前本金 '+event.goldBeforeRewards+' 金 · 实际额外收入 +'+value+' 金'+resource;
  if(event.operation==='read-coefficient')return '×'+value+' 系数 · 本手读取';
  if(event.operation==='add-coefficient'||event.operation==='reset-coefficient')return coefficientChangeText(event.operation,event.growthBefore,event.growthAfter);
  if(event.operation==='increment-clear-cycle')return '过关计数 '+event.resourceBefore+' → '+event.resourceAfter+' · '+(event.resourceAfter===1?'下次成功过关发赠票':'本次赠票已结算');
  if(event.operation==='multiply-multiplier')return '×'+value+' 倍率';
  const heatChanged=event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d;
  return '+'+value+(heatChanged||event.operation==='add-heat'?' 热度':' 倍率');
}

type JokerTransaction=Extract<DomainEvent,{type:'joker-transaction'}>;
function coefficientChangeText(operation:string,before:ScoreEvent['growthBefore'],after:ScoreEvent['growthAfter']):string {
  const change=before&&after?' ×'+fractionText(before)+' → ×'+fractionText(after):'';
  return (operation==='reset-coefficient'?'系数重置':'系数')+change+' · 后续出牌生效';
}
export function r2TransactionText(event:JokerTransaction,source:R2JokerDefinition=getR2Joker(event.definitionId)):string {
  const [n,d='1']=event.amount.split('/'),amount=fractionText({n,d});
  let effect:string;
  if(event.operation==='add-coefficient'||event.operation==='reset-coefficient')effect=coefficientChangeText(event.operation,event.growthBefore,event.growthAfter);
  else if(event.operation==='reward-consumable')effect='获得'+getR2Tool(event.rewardDefinitionId!).name;
  else if(event.operation==='add-gold'&&event.rewardDefinitionId)effect=getR2Tool(event.rewardDefinitionId).name+' · 库存已满转 +'+amount+' 金';
  else if(event.operation==='increment-clear-cycle')effect='过关计数 '+event.resourceBefore+' → '+event.resourceAfter;
  else if(event.operation==='add-gold'||event.operation==='add-gold-limited')effect='+'+amount+' 金';
  else if(event.operation==='arm-rescue')effect='救火已备好 · 下一次出牌后消耗';
  else if(event.operation==='consume-rescue')effect='救火已消耗';
  else if(event.operation==='add-gold-per-held')effect='实际留牌收入 +'+amount+' 金';
  else if(event.operation==='add-gold-per-capital')effect='奖励前本金 '+event.goldBeforeRewards+' 金 · 实际额外收入 +'+amount+' 金';
  else if(event.operation==='multiply-coefficient')effect=coefficientChangeText(event.operation,event.growthBefore,event.growthAfter);
  else if(event.operation==='refund-discard')effect='返还 '+amount+' 次弃牌';
  else if(event.operation==='rescue-hand')effect='返还 '+amount+' 次出牌';
  else if(event.operation==='refund-hand')effect='返还 '+amount+' 次出牌（本场一次）';
  else if(event.operation==='destroy-joker')effect='销毁此实例';
  else effect=(event.definitionId==='c05'?'待用热度':'成长')+' +'+amount+' · 后续出牌生效';
  return source.name+' · '+effect;
}
