import type {R2RunState} from '../domain/r2Run';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import {r2DiscardCost,r2UsesAssist} from '../domain/r2Run';
import {r2AssistAvailability} from '../domain/r2Assist';
import {r2RunModeConfig} from '../content/r2Modes';
import {usesLaohuanRefill} from '../domain/r2LaohuanRefill';
import {usesErxiangHandoff} from '../domain/r2ErxiangHandoff';
import {usesTouyeWager} from '../domain/r2TouyeWager';
import {usesXiemuBurn} from '../domain/r2XiemuBurn';
import {usesAzaoCharge} from '../domain/r2AzaoCharge';
import {erxiangChoice,savedErxiangHandoff} from './ErxiangHandoffCopy';
import {touyeChoice} from './TouyeWagerCopy';
import {xiemuChoice} from './XiemuBurnCopy';
import {azaoChoice,savedAzaoCharge} from './AzaoChargeCopy';
import {heroSkillButton,heroSkillTitle,type HeroSkillFlags,type HeroSkillDraft} from './HeroSkillPresentation';
export interface HeroAbilityCue extends ReturnType<typeof heroSkillButton> {available:boolean;opportunity:boolean}
/** Public current-operation facts only. Never predicts a draw, outcome or score. */
export function heroAbilityCue(run:R2RunState,facts?:R2SelectionFacts,ids:readonly string[]=[],assistAvailable=false,draft:HeroSkillDraft={}):HeroAbilityCue|undefined {
 const live=run.phase==='await-input';
 const cue=(detail:string,available=false,opportunity=available,flags:Omit<HeroSkillFlags,'available'>={})=>({...heroSkillButton(run.characterId,{...flags,ended:['stage-cleared','run-won','run-lost'].includes(run.phase),available:live&&available},detail),available:live&&available,opportunity:live&&opportunity});
 if(usesErxiangHandoff(run)){const c=erxiangChoice(run,facts,draft.erxiangTargetId);return cue(c.used?'本场次数已用':!c.enabled?'本场角色能力停用':c.selected?'已选计分牌，确认出牌后使用':c.candidates.length?'出牌前选一张计分牌':'先选对子及以上',c.candidates.length>0,c.enabled&&!c.used,{used:c.used,disabled:!c.enabled,selected:!!c.selected});}
 if(usesAzaoCharge(run)){const c=azaoChoice(run,facts?.type);return cue(!c.enabled?'本场不蓄层、不释放':!live?c.hold:c.available?'出牌前可选择释放'+c.charge+'层':!c.charge?'先实际出牌蓄层':'先选两对及以上',c.available,c.enabled&&c.charge>0,{disabled:!c.enabled,selected:!!draft.azaoRelease&&c.available});}
 if(usesXiemuBurn(run)){const c=xiemuChoice(run,facts?.type),available=c.choices.some(c=>c.available);return cue(c.used?'本场次数已用':!c.enabled?'本场角色能力停用':run.gold<10?'不足10金':available?'出牌前选择支付档':'先选两对及以上',available,c.enabled&&!c.used&&run.gold>=10,{used:c.used,disabled:!c.enabled,selected:!!draft.xiemuBurn&&c.choices.some(x=>x.available&&x.cost===draft.xiemuBurn)});}
 if(usesTouyeWager(run)){
  const c=touyeChoice(run,ids),available=!draft.touyePhase&&c.choices.some(c=>c.available),target=c.lockedTarget;
  const detail=draft.touyePhase==='drawing'?(target?'已押'+target+'，换牌完成后出牌':'正在确认换牌，请稍候'):draft.touyePhase==='settling'?(target?'已押'+target+'，正在出牌结算':c.settled||'正在出牌结算'):c.pending?'出牌后结算':!c.enabled?'本场角色能力停用':c.used?c.settled||'本场次数已用':available?'弃牌前押牌型并换牌':ids.length?'当前不能押目标':'先选1–5张弃牌';
  return cue(detail,available,!draft.touyePhase&&c.enabled&&!c.used&&!c.pending&&!!run.stage?.handsLeft&&run.drawPile.length>0&&run.stage!.discardsLeft>=r2DiscardCost(run)&&run.gold>=(run.stage?.boss?.definitionId==='B07'?1:0)&&c.choices.some(x=>x.available||x.reason==='先选1–5张实际弃牌'),{used:c.used,disabled:!c.enabled,lockedTarget:target,activity:draft.touyePhase});
 }
 if(usesLaohuanRefill(run)){
  const enabled=r2RunModeConfig(run).characterAbilityEnabled,used=!!run.stage?.laohuanTrickUsed,pending=!!run.pendingRefill;
  const legal=enabled&&!used&&ids.length>0&&ids.length<=5&&ids.every(id=>run.handOrder.includes(id))&&run.stage!.discardsLeft>=r2DiscardCost(run)&&run.gold>=(run.stage!.boss?.definitionId==='B07'?1:0);
  return cue(pending?'继续从候选中留牌':!enabled?'本场角色能力停用':used?'本场次数已用':legal?'弃牌前确认换牌':'先选1–5张弃牌',legal,enabled&&!used&&run.stage!.discardsLeft>=r2DiscardCost(run)&&run.gold>=(run.stage!.boss?.definitionId==='B07'?1:0),{used,disabled:!enabled,pending});
 }
 if(r2UsesAssist(run)){const c=r2AssistAvailability(run),reason=c.available?'':c.reason;return cue(reason==='disabled'?'本场角色能力停用':reason==='used'?'本场次数已用':assistAvailable?'出牌前选一组剩余同点牌':'先凑主手与剩余同点副组',c.available&&assistAvailable,c.available,{used:reason==='used',disabled:reason==='disabled',selected:!!draft.assistCount&&c.available&&assistAvailable});}
}
/** Called after a successful saved hand, including fast-forward; no forecast or reward callback. */
export function savedHeroResult(run:R2RunState):string {
 if(usesLaohuanRefill(run)&&run.stage?.laohuanTrickUsed&&!run.pendingRefill)return heroSkillTitle('laohuan')+' · 本场已用 · 实际留牌已保存';
 const t=run.lastTrace;if(!t)return '';
 if(usesErxiangHandoff(run))return savedErxiangHandoff(run);
 if(usesTouyeWager(run)){const settled=touyeChoice(run).settled;return settled?heroSkillTitle('touye')+' · '+settled:'';}
 if(usesAzaoCharge(run))return savedAzaoCharge(run).split('\n')[0];
 if(usesXiemuBurn(run)&&t.xiemuBurn?.cost)return heroSkillTitle('xiemu')+' · 已付'+t.xiemuBurn.cost+'金 · 实际×'+t.xiemuBurn.multiplier;
 if(r2UsesAssist(run)&&t.assist&&t.events.some(e=>e.reasonKey==='amo.assist.'+t.assist!.kind))return heroSkillTitle('amo')+' · 副组'+t.assist.ids.length+'张已用 · 实际×'+t.assist.multiplier;
 return '';
}
