import type {Action,R2RunState} from '../domain/run';
import {isR2CoreBuild} from '../domain/r2GroupUpgrade';
import {r2PracticeQuotes,type R2PracticeQuote} from '../domain/r2Practice';
import {HAND_LABELS} from '../content/handLabels';
import {R2_BASE_SCORES} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
import type {ShopServiceEntry,ShopServiceQuote} from './ShopServiceDialog';

const unavailable=(q:R2PracticeQuote)=>q.available?undefined:'金币不足 · 还差 '+(-q.goldAfter)+' 金';
/** Every level, price, eligibility and sequence comes from the shared domain query. */
export function shopPracticeServices(run:R2RunState,choose:(q:R2PracticeQuote)=>void):ShopServiceEntry[] {
  return r2PracticeQuotes(run).map(q=>({id:'practice/'+q.handType,title:HAND_LABELS[q.handType],summary:`Lv.${q.levelBefore} → Lv.${q.levelAfter} · 当场升级`,price:q.price,unavailable:unavailable(q),choose:()=>choose(q)}));
}
export function shopPracticeQuota(run:R2RunState):string|undefined {
  if(!isR2CoreBuild(run))return;
  if(run.shop?.basicChoice?.purchase)return '本店自选已用 · 升级 / 改牌 / 染色共用1次，刷新不恢复；下一店恢复。';
  return '升级 / 改牌 / 染色共用本店1次 · 只显示已发现且未30级的牌型。';
}
export function shopPracticeConfirmation(run:R2RunState,q:R2PracticeQuote):ShopServiceQuote {
  return {title:HAND_LABELS[q.handType],price:q.price,goldBefore:run.gold,goldAfter:q.goldAfter,effect:shopPracticeEffect(q),
    quota:`原价 ${q.basePrice} 金 · 当前实付 ${q.price} 金。\n升级 / 改牌 / 染色共用本店1次，刷新不恢复；现货与库存“练一招”保持原用法。`,unavailable:unavailable(q)};
}
export function shopPracticeAction(q:R2PracticeQuote):Extract<Action,{type:'PracticeHand'}> {
  return {type:'PracticeHand',handType:q.handType,expectedLevel:q.levelBefore,shopSeq:q.shopSeq};
}
export type ShopPracticeReceipt=Pick<Extract<import('../domain/run').DomainEvent,{type:'hand-practiced'}>,'handType'|'levelBefore'|'levelAfter'|'paidPrice'|'goldBefore'|'goldAfter'>;
/** Display the published level bases only; a saved result supplies its durable levels. */
export function shopPracticeEffect(change:Pick<ShopPracticeReceipt,'handType'|'levelBefore'|'levelAfter'>):string {
  const {handType,levelBefore,levelAfter}=change,[heat,mult,heatStep,multStep]=R2_BASE_SCORES[handType];
  const multiplier=(level:number)=>fractionText(Rational.fromJSON(mult).add(Rational.fromJSON(multStep).multiply(new Rational(BigInt(level-1)))).toJSON());
  const delta=fractionText(Rational.fromJSON(multStep).multiply(new Rational(BigInt(levelAfter-levelBefore))).toJSON());
  return `${HAND_LABELS[handType]} Lv.${levelBefore} → Lv.${levelAfter}\n基础热度 ${heat+heatStep*(levelBefore-1)} → ${heat+heatStep*(levelAfter-1)}（+${heatStep*(levelAfter-levelBefore)}）\n基础倍率 ${multiplier(levelBefore)} → ${multiplier(levelAfter)}（+${delta}）\n仅打出该牌型时读取；实际手分还取决于计分牌、效果与关卡规则。`;
}
/** Recovery reads the validated durable receipt, never a fresh quote or optimistic price. */
export function shopPracticeSavedReceipt(before:R2RunState,after:R2RunState):ShopPracticeReceipt|undefined {
  const p=after.shop?.basicChoice?.purchase;
  if(!p?.handType||p.levelBefore===undefined||after.commandSeq!==before.commandSeq+1||p.seq!==after.commandSeq||before.handLevels[p.handType]!==p.levelBefore||after.handLevels[p.handType]!==p.levelBefore+1||before.gold-after.gold!==p.paidPrice)return;
  return {handType:p.handType,levelBefore:p.levelBefore,levelAfter:after.handLevels[p.handType]!,paidPrice:p.paidPrice,goldBefore:before.gold,goldAfter:after.gold};
}
