export const AMO_EXILE_NAME='贬谪';
export const AMO_EXILE_RULE='出牌时，弃掉手里剩下的牌，这一手得分变为4倍。每场限用1次。';
export const AMO_EXILE_DETAILS=AMO_EXILE_RULE+'至少要有1张余牌可弃；不要求同点，普通对子也能用。弃掉的牌不参与本手计分或留手效果；不算额外一次普通弃牌，不触发普通弃牌收益。之后正常补牌，不永久删牌、不占手位，不额外扣金币、弃牌次数或出牌次数。确认出牌并保存成功才使用本场次数；取消不消耗。';
import type {ScoreTrace} from '../domain/scoreR2';
import {heatText} from './scoreText';

/** Saved integer score proves the result even when ordinary H×M had a fractional remainder. */
export function savedAmoExileFormula(trace:ScoreTrace):string|undefined {
 const x=trace.amoExile;
 return x?.use&&x.beforeScore!==null&&x.afterScore!==null?'贬谪：'+heatText(x.beforeScore)+' ×4 = '+heatText(x.afterScore):undefined;
}
