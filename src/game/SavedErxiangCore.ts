import type {ScoreTrace} from '../domain/scoreR2';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
/** Saved actual requests, grants and caps, never a score projection. */
export function savedErxiangCore(trace:ScoreTrace):string {
 const core=trace.erxiangCore;if(!core)return '';
 if(core.targetRank===null)return '本手未指定同点核心 · 连锁清除';
 const grants=trace.events.filter(e=>e.sourceType==='character'&&e.sourceDefinitionId==='erxiang'&&e.operation==='retrigger-card');
 return '二响 · 同点核心 '+rankLabel(core.targetRank)+'（'+(core.previousRank===core.targetRank?'连续接同点':'首次／换点')+'）\n'+grants.map(e=>{const card=trace.cards.find(c=>c.id===e.targetCardId)!;return rankLabel(card.rank)+SUIT_SYMBOL[card.suit]+'：实际额外'+e.value.n+'次'+(BigInt(e.value.n)<BigInt(core.extraPerCard)?'（总额外4次封顶）':'');}).join('\n')+'\n下一手：继续指定'+rankLabel(core.targetRank)+'核心则请求每张2次；换点1次。未指定出牌清连锁，弃牌保留，入场重置。';
}
