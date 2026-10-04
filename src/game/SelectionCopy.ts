import {HAND_LABELS} from '../content/handLabels';
import type {Box} from './layout';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import type {R2CandidateResult} from '../domain/r2HandCandidates';

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
  const disabledAccompanyingIds=f.accompanyingIds.filter(id=>f.disabledIds.includes(id));
  return {disabledAccompanyingIds,accompanyingNote:disabledAccompanyingIds.length?'附带牌本场计分效果停用；普通点数本来不计，仍参与判型、打出张数和重复条件':'',title:HAND_LABELS[f.type]+' · 已选'+f.playedIds.length+'张',
    pattern:(four?'4张普通':'')+pattern[f.type],
    membership:'计分牌'+f.scoringIds.length+'张 · 附带'+f.accompanyingIds.length+'张',
    restrictions:[f.scoringIds.length!==f.activeScoringIds.length?'其中'+(f.scoringIds.length-f.activeScoringIds.length)+'张计分停用（仍参与判型）':'',f.ordinaryPointsSuppressedIds.length?'普通点数0：'+f.ordinaryPointsSuppressedIds.length+'张，其他效果保留':''].filter(Boolean),
    rules:(f.rules.fourStraight&&f.rules.fourFlush?'4张普通顺子／同花':f.rules.fourStraight?'4张普通顺子':f.rules.fourFlush?'4张普通同花':'')+(f.rules.fourStraight||f.rules.fourFlush?'；同花顺仍5张':''),
    fullRules:[f.rules.fourStraight?'4张普通顺子；同花顺仍5张':undefined,f.rules.fourFlush?'4张普通同花；同花顺仍5张':undefined].filter(Boolean).join('\n')};
}
/** Card role is membership, not a score event or a promise of an effect. */
export function selectionCardCopy(f:R2SelectionFacts|undefined,id:string):string {
  if(!f?.playedIds.includes(id))return '未选择';
  const core=f.scoringIds.includes(id),disabled=f.disabledIds.includes(id);
  const role=core?f.activeScoringIds.includes(id)?'计分牌':'成型核心但计分停用':'附带牌';
  return role+(disabled&&!core?'；本场计分效果停用，仍随本手打出并参与判型、张数和重复条件':'')
    +(f.ordinaryPointsSuppressedIds.includes(id)?'\n普通点数0，其他效果保留':'');
}

/** Two explicit 44px actions share a stable slot in every guidance panel. */
export function selectionCandidateEntryBox(score:Box):Box {
 return {x:score.x+score.width-100,y:score.y+2,width:92,height:44};
}
export function nextCandidate(result:R2CandidateResult|undefined,key:string,current?:R2SelectionFacts['type']):R2SelectionFacts|undefined {
 if(result?.status!=='ready'||result.key!==key||!result.groups.length)return;
 const index=result.groups.findIndex(g=>g.type===current);
 return result.groups[(index+1)%result.groups.length].examples[0];
}
