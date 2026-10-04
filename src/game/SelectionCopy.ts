import {HAND_LABELS} from '../content/handLabels';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';

const pattern:Record<R2SelectionFacts['type'],string>={
  'high-card':'最高点数的一张成型',pair:'2张相同点数',
  'two-pair':'两组不同点数的对子','three-kind':'3张相同点数',
  straight:'连续点数，花色不限',flush:'同一花色，点数不限',
  'full-house':'3张同点＋另2张同点','four-kind':'4张相同点数',
  'straight-flush':'5张同花色且连续点数','five-kind':'5张相同点数',
  'flush-house':'同一花色的葫芦','flush-five':'同一花色的五条',
};
/** A compact entry is safer than cutting the object or a negation off a condition. */
export function fitConditionEntry(text:string,fits:(text:string)=>boolean,actual=false):string {
  if(fits(text))return text;
  const entry=actual?'状态 ›':'条件 ›';
  return fits(entry)?entry:actual?'状态':'条件';
}
export function selectionCopy(f:R2SelectionFacts){
  const four=f.playedIds.length===4&&(f.type==='straight'||f.type==='flush');
  return {title:HAND_LABELS[f.type]+' · 已选'+f.playedIds.length+'张',
    pattern:(four?'4张普通':'')+pattern[f.type],
    membership:'计分牌'+f.scoringIds.length+'张 · 附带'+f.accompanyingIds.length+'张',
    restrictions:[f.scoringIds.length!==f.activeScoringIds.length?'其中'+(f.scoringIds.length-f.activeScoringIds.length)+'张计分停用（仍参与判型）':'',f.ordinaryPointsSuppressedIds.length?'普通点数0：'+f.ordinaryPointsSuppressedIds.length+'张，其他效果保留':''].filter(Boolean),
    rules:(f.rules.fourStraight&&f.rules.fourFlush?'4张普通顺子／同花':f.rules.fourStraight?'4张普通顺子':f.rules.fourFlush?'4张普通同花':'')+(f.rules.fourStraight||f.rules.fourFlush?'；同花顺仍5张':''),
    fullRules:[f.rules.fourStraight?'4张普通顺子；同花顺仍5张':undefined,f.rules.fourFlush?'4张普通同花；同花顺仍5张':undefined].filter(Boolean).join('\n')};
}
