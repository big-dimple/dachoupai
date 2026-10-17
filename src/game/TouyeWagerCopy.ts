import {heroSkillName} from './HeroSkillPresentation';
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
 const newCore=usesTouyeNewCore(run),risk=newCore?'只赌下一手；新摸牌只当配牌不算；失败×0.85，押后不能再弃牌':TOUYE_RISK;
 const stage=run.stage,wager=stage?.touyeWager,pending=wager?.resolution==='pending'?wager.commit:null;
 const hand=run.handOrder.map(id=>run.deckInstances.find(c=>c.id===id)!),m=readR2Modifiers(run.jokers,r2JokerDefinitionsFor(run)),rules={fourStraight:m.fourStraight,fourFlush:m.fourFlush};
 const reachable=touyeReachableTypes(hand,rules),enabled=usesTouyeWager(run)&&r2RunModeConfig(run).characterAbilityEnabled&&stage?.boss?.definitionId!=='B08',used=wager?.resolution!=='unused';
 const common=!enabled?'本场能力停用':pending?'已押下一手，不可改目标':used?'本场'+heroSkillName('touye')+'已用':run.phase!=='await-input'?'当前不能押':!selectedIds.length||selectedIds.length>5?'先选1–5张实际弃牌':selectedIds.some(id=>!run.handOrder.includes(id))?'选择已过期':!stage||stage.handsLeft<=0?'没有下一手':!run.drawPile.length?'已无牌可补':stage.discardsLeft<r2DiscardCost(run)?'弃牌次数不足':stage.boss?.definitionId==='B07'&&run.gold<1?'弃牌需要1金币':'';
 const choices=TOUYE_TARGETS.map(target=>{const already=reachable.some(t=>touyeTargetReached(target,t)),reason=!newCore&&already?'当前整手已可达，不能押':common;return{target,label:HAND_LABELS[target],available:!reason,reason,accepted:TOUYE_ACCEPTED[target].map(t=>HAND_LABELS[t]).join('／')};});
 const lockedTarget=pending?HAND_LABELS[pending.target]:undefined,label=lockedTarget??null,newCards=pending?.refill?.refilledIds.map(id=>{const card=hand.find(c=>c.id===id)!;return rankLabel(card.rank)+SUIT_SYMBOL[card.suit];}).join('、');
 const compact=heroSkillName('touye')+' · '+(pending?'已押'+label:!enabled?'已停用':used?'已用':'选弃牌');
 const saved=run.lastTrace?.touyeWager,settledFull=saved?.commit?`上手押${HAND_LABELS[saved.commit.target]} · 实际${HAND_LABELS[run.lastTrace!.handType]} · ${saved.outcome==='won'?newCore?'新摸的牌参与成型×2':'达成×2':newCore?saved.core?.lossReason==='new-core'?'新摸的牌没参与成型×0.85':'没凑成所押牌型×0.85':'未成×0.85'}`:'';
 const settled=newCore&&saved?.commit?'上手押'+HAND_LABELS[saved.commit.target]+' · '+(saved.outcome==='won'?'新摸牌成型×2':saved.core?.lossReason==='new-core'?'新摸牌没参与成型×0.85':'没成所押牌型×0.85'):settledFull;
 return{newCore,risk,common,enabled,pending,used,choices,compact,settled,lockedTarget,snapshotToken:stage?touyeSnapshotToken(hand,rules,stage.index,stage.playIndex+1,run.commandSeq):'',status:pending?'已押'+label+' · 出牌后结算':settled,details:pending?(newCore?`已押${label}，换牌已完成。\n3. 下一手至少用一张刚摸回的牌凑成目标，倍率×2；否则×0.85。\n刚摸回的牌：${newCards}。没打出或被封住的新牌不算。\n${risk}\n这些牌型都算成功：${TOUYE_ACCEPTED[pending.target].map(t=>HAND_LABELS[t]).join('／')}。返回或继续存档仍保留押注；不能用改牌工具或更换、调整大丑牌。`:`已押${label}，只绑定下一次真实出牌。\n${risk}\n达成类型：${TOUYE_ACCEPTED[pending.target].map(t=>HAND_LABELS[t]).join('／')}。返回或恢复保留；工具和大丑牌调序暂不可用。`):settledFull||(newCore?'1. 选1–5张要弃的牌。\n2. 押下一手牌型并确认换牌；已成型也可押。\n3. 下一手至少用一张刚摸回的牌凑成目标，倍率×2；否则×0.85。新牌只当配牌、没打出或被封住，都不算。\n每场一次；不押×1.15。押后不能再弃、用改牌工具或更换、调整大丑牌。静场、禁用角色能力的挑战不能押。':'每场一次；弃牌前押当前整手尚凑不出的目标。成型×2，未成×0.85，替代该手普通×1.15。')};
}
export function touyeBetLabel(target:TouyeTarget){return '押'+HAND_LABELS[target];}

export function savedTouyeWager(trace:ScoreTrace|null):string {const t=trace?.touyeWager;if(!t?.commit)return '';return '押'+HAND_LABELS[t.commit.target]+' · '+(t.outcome==='won'?t.core?'新摸牌成型×2':'达成×2':t.core?.lossReason==='new-core'?'新摸牌没参与成型×0.85':'未成×0.85');}

/** Counts only the public gap and stack length; never inspects future card IDs. */
export function touyeConfirmationCopy(run:R2RunState,ids:readonly string[]){const c=touyeChoice(run,ids),newCore=c.newCore;return {risk:c.risk,qualification:newCore?'已成型也可押；下一手至少用一张刚摸的牌凑成目标':'当前整手尚未达到',refillCount:newCore?Math.min(Math.max(0,(run.stage?.handLimit??0)-run.handOrder.length+ids.length),run.drawPile.length):ids.length,success:newCore?'新摸牌参与成型×2':'达成×2'};}
