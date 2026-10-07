import type {R2RunState} from '../domain/r2Run';
import type {R2Offer} from '../domain/r2Shop';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {R2_TOOLS,R2_TOOL_CATALOG} from '../content/r2Tools';
import {HAND_LABELS} from '../content/handLabels';
import {R2_BASE_SCORES} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
import {SUIT_SYMBOL} from '../cards/types';

/** Explain only this public offer's mechanism. No scoring simulation, draws or purchase choice. */
export function shopInvestment(state:R2RunState,offer:R2Offer,kind:'jokers'|'tools'|'items') {
 if(kind==='items')return;
 if(kind==='jokers'){
  const d=r2JokerDefinitionFor(state,offer.definitionId),hooks=d.hooks;
  const first=hooks.find(h=>h.phase==='jokerScore'&&h.condition.kind==='resource'&&h.condition.resource==='play-index'&&h.condition.equals===1);
  const add=first?.operations.find(o=>o.kind==='add-multiplier');
  if(add?.kind==='add-multiplier')return {role:'倍率',short:'倍率 · 首手+'+fractionText(add.value),effect:'仅本场第一手倍率 +'+fractionText(add.value)+'；后续手不获得这项加成。',next:'后续手不获得这项加成；每场重置，不保证过关。'};
  const ops=hooks.flatMap(h=>h.operations),growth=ops.some(o=>['add-growth','add-coefficient','multiply-coefficient-once','update-score-growth'].includes(o.kind));
  const role=growth?'培养':ops.some(o=>o.kind==='add-multiplier'||o.kind==='multiply-multiplier'||o.kind==='read-coefficient'||o.kind==='read-growth'&&o.target==='multiplier')?'倍率':ops.some(o=>o.kind==='add-heat'||o.kind==='read-growth'&&o.target==='heat')?'热度':'条件';
  return {role,short:role+' · '+d.description,effect:d.description,next:growth?'已有值读取与新增条件分别看；购入不追补过去成长。':'按商品条件与封禁结算；购入不等于已发动。'};
 }
 const t=R2_TOOLS.find(t=>t.id===offer.definitionId);if(!t)return;
 const op=t.operation;
 if(op.kind==='upgrade-hand'){
  const type=op.handType,level=type?state.handLevels[type]:undefined,max=R2_TOOL_CATALOG.limits.handLevelMaximum;
  const short=type?HAND_LABELS[type]+(level===undefined?'尚未发现':level>=max?'已满级':` Lv.${level}→${Math.min(max,level+op.levels)}`):'选择已发现牌型';
  let effect='选择已发现且未满级的牌型，永久提升基础值；不改手牌或保证成型。';
  if(type&&level!==undefined&&level<max){const [heat,mult,dh,dm]=R2_BASE_SCORES[type],after=Math.min(max,level+op.levels),m=(l:number)=>fractionText(Rational.fromJSON(mult).add(Rational.fromJSON(dm).multiply(new Rational(BigInt(l-1)))).toJSON());effect=`${HAND_LABELS[type]} Lv.${level}→${after}：基础热度 ${heat+dh*(level-1)}→${heat+dh*(after-1)}，基础倍率 ${m(level)}→${m(after)}。只在实际打出该型时读取，不是预计总分。`;}
  else if(type)effect=short+'，当前不能升级；不会解锁未发现牌型或突破上限。';
  return {role:'升型',short:'升型 · '+short,effect,next:'买后收入工具包，确认使用才升级；不自动生效。'};
 }
 if(op.kind==='set-suit')return {role:'改牌',short:'改牌 · 染成'+SUIT_SYMBOL[op.suit],effect:'永久替换所选牌花色，保留点数；不补顺子断点、不保证抽到所改牌。',next:'买后选择目标并确认；原花色会失去。'};
 if(op.kind==='shift-rank')return {role:'改牌',short:'改牌 · 点数'+(op.delta>0?'+':'')+op.delta,effect:'永久改变所选牌点数；在使用页逐张比较前后，原点数会失去，不保证抽到所改牌。',next:'买后选择目标并确认；不会自动整理牌组。'};
 if(op.kind==='copy-card'||op.kind==='delete-cards'||op.kind==='set-deck-suit')return {role:'改牌',short:'改牌 · '+t.name,effect:'改变牌组构成；具体对象、保留属性和代价见使用页，不保证下一手成型。',next:'买后选择目标并确认，修改成功才消耗。'};
 if(op.kind==='set-enhancement')return {role:['multiplier-paper','glass-paper'].includes(op.enhancement)?'倍率':'增强',short:'增强 · '+t.name,effect:'赋予所选牌增强；旧增强会被替换，收益按计分或持牌条件读取。',next:'买后选择目标并确认。'+(op.enhancement==='glass-paper'?'玻璃另有真实破碎风险。':'')};
 return {role:'工具',short:'工具 · '+t.name,effect:'作用、时点和额外代价见原规则；购买只收入库存。',next:'在工具包选择并确认使用，不自动生效。'};
}
