import type {R2RunState} from '../domain/r2Run';
import {r2RunModeConfig} from '../content/r2Modes';
import type {ScoreTrace} from '../domain/scoreR2';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
/** Saved actual requests, grants and caps, never a score projection. */
export function savedErxiangCore(trace:ScoreTrace,state:R2RunState):string {
 const core=trace.erxiangCore;if(!core)return '';
 const next=state.phase!=='await-input'?'本场已结束，连锁已清；再次入场首次指定核心，每张请求1次。':!r2RunModeConfig(state).characterAbilityEnabled||state.stage?.boss?.definitionId==='B08'?'本场核心停用，不记录连锁。':state.stage?.erxiangPreviousRank?('当前本场连锁 '+rankLabel(state.stage.erxiangPreviousRank)+'：下一手继续指定此点数核心，每张请求2次；换点1次。未指定出牌清连锁，弃牌保留，入场重置。'):'当前连锁已清；本场下一手首次指定核心，每张请求1次。';
 if(core.targetRank===null)return '本手未指定同点核心 · 连锁清除\n'+next;
 const grants=trace.events.filter(e=>e.sourceType==='character'&&e.sourceDefinitionId==='erxiang'&&e.operation==='retrigger-card');
 return '二响 · 同点核心 '+rankLabel(core.targetRank)+'（'+(core.previousRank===core.targetRank?'连续接同点':'首次／换点')+'）\n'+grants.map(e=>{const card=trace.cards.find(c=>c.id===e.targetCardId)!;return rankLabel(card.rank)+SUIT_SYMBOL[card.suit]+'：实际额外'+e.value.n+'次'+(BigInt(e.value.n)<BigInt(core.extraPerCard)?'（总额外4次封顶）':'');}).join('\n')+'\n'+next;
}
