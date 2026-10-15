import type {R2RunState} from '../domain/r2Run';
import type {Suit} from '../cards/types';
import {r2S04Facts,r2S04Issue} from '../domain/r2S04';

const names={hearts:'红桃',diamonds:'方片',clubs:'梅花',spades:'黑桃'} as const;
export function s04IssueText(state:R2RunState,suit?:Suit):string|undefined {
 const issue=r2S04Issue(state,suit),facts=r2S04Facts(state);
 if(issue==='s04-chapter-gated')return `第${facts.minimumChapter}章起才可获取和使用独幕，当前第${facts.chapter}章。`;
 if(issue==='no-effect')return '有效牌组已全部是该花色，没有变化。';
 if(issue==='s04-suit-density'){
  const row=facts.suits.find(row=>row.suit===suit);
  return row?`${names[row.suit]} ${row.count}/${facts.living} 张，还差 ${row.missing} 张达到50%。`:`须先把一种花色铺到至少 ${facts.required}/${facts.living} 张（50%）。`;
 }
}
export function s04QualificationText(state:R2RunState,suit?:Suit):string|undefined {
 const facts=r2S04Facts(state);if(!facts.restricted)return;
 const counts=facts.suits.filter(row=>!suit||row.suit===suit).map(row=>`${names[row.suit]} ${row.count}/${facts.living}`+(row.eligible?' · 达标':row.count===facts.living?' · 无变化':row.missing?` · 还差${row.missing}张`:` · 第${facts.minimumChapter}章解锁`));
 return (state.chapter<facts.minimumChapter?`当前第${facts.chapter}章，须第${facts.minimumChapter}章起使用。\n`:'')+`第${facts.minimumChapter}章起 · 目标花色至少${facts.required}/${facts.living}张（50%）\n`+counts.join('；');
}
