import {heroText} from './HeroIdentity';
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
export interface HeroAbilityCue {label:string;available:boolean;opportunity:boolean}
/** Public current-operation facts only. Never predicts a draw, outcome or score. */
export function heroAbilityCue(run:R2RunState,facts?:R2SelectionFacts,ids:readonly string[]=[],assistAvailable=false):HeroAbilityCue|undefined {
 const live=run.phase==='await-input';
 const cue=(label:string,available=false,opportunity=available)=>({label,available:live&&available,opportunity:live&&opportunity});
 if(usesErxiangHandoff(run)){const c=erxiangChoice(run,facts);return cue(c.used?heroText('二响·交棒已用'):!c.enabled?heroText('二响·交棒停用'):c.candidates.length?heroText('二响·出前交棒↗'):heroText('二响·选对子以上'),c.candidates.length>0,c.enabled&&!c.used);}
 if(usesAzaoCharge(run)){const c=azaoChoice(run,facts?.type);return cue(!c.enabled?heroText('阿燥·蓄势停用'):c.available?heroText('阿燥·出前释放↗'):!c.charge?heroText('阿燥·先蓄势'):heroText('阿燥·选两对以上'),c.available,c.enabled&&c.charge>0);}
 if(usesXiemuBurn(run)){const c=xiemuChoice(run,facts?.type),available=c.choices.some(c=>c.available);return cue(c.used?heroText('谢幕·燃金已用'):!c.enabled?heroText('谢幕·燃金停用'):run.gold<10?heroText('谢幕·不足10金'):available?heroText('谢幕·出前燃金↗'):heroText('谢幕·选两对以上'),available,c.enabled&&!c.used&&run.gold>=10);}
 if(usesTouyeWager(run)){const c=touyeChoice(run,ids),available=c.choices.some(c=>c.available);return cue(c.pending?heroText('骰爷·已押下一手'):!c.enabled?heroText('骰爷·赌约停用'):c.used?heroText('骰爷·赌约已用'):available?heroText('骰爷·弃前押注↗'):ids.length?heroText('骰爷·当前不能押'):heroText('骰爷·先选弃牌'),available,c.enabled&&!c.used&&!c.pending&&!!run.stage?.handsLeft&&run.drawPile.length>0&&run.stage!.discardsLeft>=r2DiscardCost(run)&&run.gold>=(run.stage?.boss?.definitionId==='B07'?1:0)&&c.choices.some(x=>x.available||x.reason==='先选1–5张实际弃牌'));}
 if(usesLaohuanRefill(run)){
  const enabled=r2RunModeConfig(run).characterAbilityEnabled,used=!!run.stage?.laohuanTrickUsed,pending=!!run.pendingRefill;
  const legal=enabled&&!used&&ids.length>0&&ids.length<=5&&ids.every(id=>run.handOrder.includes(id))&&run.stage!.discardsLeft>=r2DiscardCost(run)&&run.gold>=(run.stage!.boss?.definitionId==='B07'?1:0);
  return cue(pending?heroText('老幻·继续留牌↗'):!enabled?heroText('老幻·戏法停用'):used?heroText('老幻·戏法已用'):legal?heroText('老幻·弃前戏法↗'):heroText('老幻·先选弃牌'),legal,enabled&&!used&&run.stage!.discardsLeft>=r2DiscardCost(run)&&run.gold>=(run.stage!.boss?.definitionId==='B07'?1:0));
 }
 if(r2UsesAssist(run)){const c=r2AssistAvailability(run),reason=c.available?'':c.reason;return cue(reason==='disabled'?heroText('阿默·助攻停用'):reason==='used'?heroText('阿默·助攻已用'):assistAvailable?heroText('阿默·出前选助攻'):heroText('阿默·先凑主副组'),c.available&&assistAvailable,c.available);}
}
/** Called after a successful saved hand, including fast-forward; no forecast or reward callback. */
export function savedHeroResult(run:R2RunState):string {
 if(usesLaohuanRefill(run)&&run.stage?.laohuanTrickUsed&&!run.pendingRefill)return heroText('老幻·本场戏法已用 · 实际留牌已保存');
 const t=run.lastTrace;if(!t)return '';
 if(usesErxiangHandoff(run))return savedErxiangHandoff(run);
 if(usesTouyeWager(run))return touyeChoice(run).settled;
 if(usesAzaoCharge(run))return savedAzaoCharge(run).split('\n')[0];
 if(usesXiemuBurn(run)&&t.xiemuBurn?.cost)return heroText('谢幕·已燃')+t.xiemuBurn.cost+'金 · 实际×'+t.xiemuBurn.multiplier;
 if(r2UsesAssist(run)&&t.assist&&t.events.some(e=>e.reasonKey==='amo.assist.'+t.assist!.kind))return heroText('阿默·助攻')+t.assist.ids.length+'张已用 · 实际×'+t.assist.multiplier;
 return '';
}
