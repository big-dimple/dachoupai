import {r2TargetPolicyFor} from '../domain/r2TargetPolicy';
import {fractionText} from './scoreText';

/** Read the same identity and target contracts as getR2Stage; presentation only. */
export function endlessContinuationCopy(identity:{contentVersion?:unknown;contentHash?:unknown}):string {
  const contract=r2TargetPolicyFor(identity);
  return '八章通关已保存。\n\n继续无尽会保留当前牌组、大丑牌、成长、道具与金币，从第九章商店接续。\n\n'+
    `后续每章同场次目标按 ${fractionText(contract.multiplier)} 倍递增，最终向上取整；新的压轴规则仍会公开。\n\n`+
    '是否继续由你决定；取消可留在胜利页。';
}
