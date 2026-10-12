import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import type {ScoreTrace} from '../domain/scoreR2';
import {usesTouyeWager,usesTouyeNewCore,TOUYE_TARGETS,TOUYE_ACCEPTED,touyeReachableTypes,touyeTargetReached,touyeSnapshotToken,type TouyeTarget} from '../domain/r2TouyeWager';
import {r2DiscardCost,type R2RunState} from '../domain/r2Run';
import {readR2Modifiers} from '../content/r2Schema';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {r2RunModeConfig} from '../content/r2Modes';
import {HAND_LABELS} from '../content/handLabels';
export const TOUYE_RISK='只赌下一手，不能再弃牌；未成倍率×0.85';
export function touyeChoice(run:R2RunState,selectedIds:readonly string[]=[]){
 const newCore=usesTouyeNewCore(run),risk=newCore?'只赌下一手；新补牌须进入有效计分核心，否则×0.85；押后不能再弃牌':TOUYE_RISK;
 const stage=run.stage,wager=stage?.touyeWager,pending=wager?.resolution==='pending'?wager.commit:null;
 const hand=run.handOrder.map(id=>run.deckInstances.find(c=>c.id===id)!),m=readR2Modifiers(run.jokers,r2JokerDefinitionsFor(run)),rules={fourStraight:m.fourStraight,fourFlush:m.fourFlush};
 const reachable=touyeReachableTypes(hand,rules),enabled=usesTouyeWager(run)&&r2RunModeConfig(run).characterAbilityEnabled&&stage?.boss?.definitionId!=='B08',used=wager?.resolution!=='unused';
 const common=!enabled?'本场能力停用':pending?'已押下一手，不可改目标':used?'本场赌约已用':run.phase!=='await-input'?'当前不能押':!selectedIds.length||selectedIds.length>5?'先选1–5张实际弃牌':selectedIds.some(id=>!run.handOrder.includes(id))?'选择已过期':!stage||stage.handsLeft<=0?'没有下一手':!run.drawPile.length?'已无牌可补':stage.discardsLeft<r2DiscardCost(run)?'弃牌次数不足':stage.boss?.definitionId==='B07'&&run.gold<1?'弃牌需要1金币':'';
 const choices=TOUYE_TARGETS.map(target=>{const already=reachable.some(t=>touyeTargetReached(target,t)),reason=!newCore&&already?'当前整手已可达，不能押':common;return{target,label:HAND_LABELS[target],available:!reason,reason,accepted:TOUYE_ACCEPTED[target].map(t=>HAND_LABELS[t]).join('／')};});
 const label=pending?HAND_LABELS[pending.target]:null,newCards=pending?.refill?.refilledIds.map(id=>{const card=hand.find(c=>c.id===id)!;return rankLabel(card.rank)+SUIT_SYMBOL[card.suit];}).join('、');
 const compact=pending?'骰爷·押'+label:!enabled?'骰爷·赌约停用':used?'骰爷·赌约已用':'骰爷·赌约↗';
 const saved=run.lastTrace?.touyeWager,settledFull=saved?.commit?`上手押${HAND_LABELS[saved.commit.target]} · 实际${HAND_LABELS[run.lastTrace!.handType]} · ${saved.outcome==='won'?'达成×2':newCore?saved.core?.lossReason==='new-core'?'新补牌未入有效核心×0.85':'目标未成×0.85':'未成×0.85'}`:'';
 const settled=newCore&&saved?.commit?'上手押'+HAND_LABELS[saved.commit.target]+' · '+(saved.outcome==='won'?'新补入核心×2':saved.core?.lossReason==='new-core'?'新补未入有效核心×0.85':'目标未成×0.85'):settledFull;
 return{newCore,risk,common,enabled,pending,used,choices,compact,settled,snapshotToken:stage?touyeSnapshotToken(hand,rules,stage.index,stage.playIndex+1,run.commandSeq):'',status:pending?`下一手押${label} · ${newCore?'新补入有效核心＋成型×2，否则×0.85':'成×2／未成×0.85 · 不可再弃'}`:settled,details:pending?`已押${label}，只绑定下一次真实出牌。${newCore?'\n本次实际新补：'+newCards+'。':''}\n${risk}\n达成类型：${TOUYE_ACCEPTED[pending.target].map(t=>HAND_LABELS[t]).join('／')}。返回或恢复保留；工具和大丑牌调序暂不可用。`:settledFull||(newCore?'每场一次；已成型也可押。须实际弃牌，下一手目标达成，且本次实际新补回至少一张进入有效计分核心，才×2；旧核心、仅附带、未出或失效新牌均输×0.85并消耗。不押×1.15，押后不能再弃、改牌或改大丑牌。':'每场一次；弃牌前押当前整手尚凑不出的目标。成型×2，未成×0.85，替代该手普通×1.15。')};
}
export function touyeBetLabel(target:TouyeTarget){return '押'+HAND_LABELS[target];}

export function savedTouyeWager(trace:ScoreTrace|null):string {const t=trace?.touyeWager;if(!t?.commit)return '';return '押'+HAND_LABELS[t.commit.target]+' · '+(t.outcome==='won'?'达成×2':t.core?.lossReason==='new-core'?'新补牌未入核心×0.85':'未成×0.85');}

/** Counts only the public gap and stack length; never inspects future card IDs. */
export function touyeConfirmationCopy(run:R2RunState,ids:readonly string[]){const c=touyeChoice(run,ids),newCore=c.newCore;return {risk:c.risk,qualification:newCore?'已成型也可押；下一手须达目标且本次新补牌进入有效计分核心':'当前整手尚未达到',refillCount:newCore?Math.min(Math.max(0,(run.stage?.handLimit??0)-run.handOrder.length+ids.length),run.drawPile.length):ids.length,success:newCore?'达目标＋新补入核心×2':'达成×2'};}
