import type {R2RunState} from '../domain/r2Run';
import {r2DiscardCost} from '../domain/r2Run';
import {touyeConfirmationCopy} from './TouyeWagerCopy';
import type {DetailDialog} from './DetailDialog';
import {mountHeroDecisionEyes} from './HeroDecisionEyes';
import {showHeroDiscardChoice} from './HeroDiscardChoice';
/** A fresh UI-only discard draft. The table's proposed play is never reused or changed. */
export function showTouyeDiscardChoice(dialog:DetailDialog,run:R2RunState,valid:()=>boolean,next:(ids:string[])=>void):void {
 const copy=touyeConfirmationCopy(run,[]),modal=showHeroDiscardChoice(dialog,run,valid,next,{title:'秦琼 · 先重新选弃牌',body:copy.risk+'。'+copy.success+'，不押仍按原规则。',summaryBody:'先弃牌换牌，再出牌。原拟出牌选择保留；下面重新选1–5张要弃的牌。',effectBody:'确认换牌才花'+r2DiscardCost(run)+'次弃牌'+(run.stage?.boss?.definitionId==='B07'?'＋1金币':'，不另收金币')+'；确认后不能取消重抽。',nextLabel:'下一步 · 选押注牌型'});
 mountHeroDecisionEyes(modal,'discard-choice');modal.classList.add('touye-discard-choice');
}
