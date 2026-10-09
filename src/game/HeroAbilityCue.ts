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
export interface HeroAbilityCue {label:string;available:boolean}
/** Public current-operation facts only. Never predicts a draw, outcome or score. */
export function heroAbilityCue(run:R2RunState,facts?:R2SelectionFacts,ids:readonly string[]=[],assistAvailable=false):HeroAbilityCue|undefined {
 const live=run.phase==='await-input';
 const cue=(label:string,available=false)=>({label,available:live&&available});
 if(usesErxiangHandoff(run)){const c=erxiangChoice(run,facts);return cue(c.used?'二响·交棒已用':!c.enabled?'二响·交棒停用':c.candidates.length?'二响·出前交棒↗':'二响·先选对子以上',c.candidates.length>0);}
 if(usesAzaoCharge(run)){const c=azaoChoice(run,facts?.type);return cue(!c.enabled?'阿燥·蓄势停用':c.available?'阿燥·出前释放↗':!c.charge?'阿燥·先蓄势':'阿燥·先选两对以上',c.available);}
 if(usesXiemuBurn(run)){const c=xiemuChoice(run,facts?.type),available=c.choices.some(c=>c.available);return cue(c.used?'谢幕·燃金已用':!c.enabled?'谢幕·燃金停用':run.gold<10?'谢幕·不足10金':available?'谢幕·出前燃金↗':'谢幕·先选两对以上',available);}
 if(usesTouyeWager(run)){const c=touyeChoice(run,ids),available=c.choices.some(c=>c.available);return cue(c.pending?'骰爷·已押下一手':!c.enabled?'骰爷·赌约停用':c.used?'骰爷·赌约已用':available?'骰爷·弃前押目标↗':ids.length?'骰爷·当前不能押':'骰爷·先选弃牌',available);}
 if(usesLaohuanRefill(run)){
  const enabled=r2RunModeConfig(run).characterAbilityEnabled,used=!!run.stage?.laohuanTrickUsed,pending=!!run.pendingRefill;
  const legal=enabled&&!used&&ids.length>0&&ids.length<=5&&ids.every(id=>run.handOrder.includes(id))&&run.stage!.discardsLeft>=r2DiscardCost(run)&&run.gold>=(run.stage!.boss?.definitionId==='B07'?1:0);
  return cue(pending?'老幻·继续留牌↗':!enabled?'老幻·戏法停用':used?'老幻·戏法已用':legal?'老幻·弃前戏法↗':'老幻·先选合法弃牌',legal);
 }
 if(r2UsesAssist(run)){const c=r2AssistAvailability(run),reason=c.available?'':c.reason;return cue(reason==='disabled'?'阿默·助攻停用':reason==='used'?'阿默·助攻已用':assistAvailable?'阿默·出前选助攻':'阿默·先凑主手副组',c.available&&assistAvailable);}
}
/** Called after a successful saved hand, including fast-forward; no forecast or reward callback. */
export function savedHeroResult(run:R2RunState):string {
 const t=run.lastTrace;if(!t)return '';
 if(usesErxiangHandoff(run))return savedErxiangHandoff(run);
 if(usesTouyeWager(run))return touyeChoice(run).settled;
 if(usesAzaoCharge(run))return savedAzaoCharge(run).split('\n')[0];
 if(usesXiemuBurn(run)&&t.xiemuBurn?.cost)return '谢幕·已燃'+t.xiemuBurn.cost+'金 · 实际×'+t.xiemuBurn.multiplier;
 if(r2UsesAssist(run)&&t.assist&&t.events.some(e=>e.reasonKey==='amo.assist.'+t.assist!.kind))return '阿默·助攻'+t.assist.ids.length+'张已用 · 实际×'+t.assist.multiplier;
 return '';
}
