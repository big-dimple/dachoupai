import type {R2RunState} from '../domain/r2Run';
import {r2DiscardCost,r2UsesAssist} from '../domain/r2Run';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import {r2RunModeConfig} from '../content/r2Modes';
import {usesTouyeWager} from '../domain/r2TouyeWager';
import {usesErxiangHandoff} from '../domain/r2ErxiangHandoff';
import {usesLaohuanRefill} from '../domain/r2LaohuanRefill';
import {usesXiemuBurn} from '../domain/r2XiemuBurn';
import {usesAzaoCharge} from '../domain/r2AzaoCharge';
import {r2AssistAvailability,R2_ASSIST_CONTRACT} from '../domain/r2Assist';
import {characterForRun} from './CharacterRunCopy';
import {touyeChoice,TOUYE_RISK} from './TouyeWagerCopy';
import {erxiangChoice} from './ErxiangHandoffCopy';
import {azaoChoice} from './AzaoChargeCopy';
import {xiemuChoice} from './XiemuBurnCopy';
/** Guidance reads existing public choices. It never enables a command or predicts a draw. */
export function heroSkillGuide(run:R2RunState,facts?:R2SelectionFacts,ids:readonly string[]=[],assistAvailable=false){
 const enabled=r2RunModeConfig(run).characterAbilityEnabled;
 if(usesTouyeWager(run)){const c=touyeChoice(run,ids);return {active:true,step:c.pending?'已押下一手 · 接下来出牌':c.used?'本场赌约已用':!c.enabled?'本场赌约停用':!ids.length?'第1步 · 返回选1–5张弃牌':c.choices.some(x=>x.available)?'第2步 · 已选'+ids.length+'张弃牌，选下一手目标':c.common||'当前整手已能凑出这些目标，不能押',effect:c.pending?c.status:'下一手达成×2；未成×0.85',risk:'每场一次；押后不能再弃牌。不押时×1.15。'};}
 if(usesErxiangHandoff(run)){const c=erxiangChoice(run,facts);return {active:true,step:c.used?'本场交棒已用':!c.enabled?'本场交棒停用':c.candidates.length?'第2步 · 选一张计分牌交棒':'第1步 · 返回选对子及以上',effect:'这张牌的普通点数改加倍率',risk:'每场一次；选好后正常出牌才消耗，增强与版次保留。'};}
 if(usesLaohuanRefill(run)){const used=run.stage?.laohuanTrickUsed;const reason=!enabled?'本场戏法停用':used?'本场戏法已用':!ids.length||ids.length>5?'第1步 · 返回选1–5张弃牌':run.stage!.discardsLeft<r2DiscardCost(run)?'弃牌次数不足':run.stage?.boss?.definitionId==='B07'&&run.gold<1?'弃牌需要1金币':'第2步 · 确认戏法弃牌';return {active:true,step:run.pendingRefill?'第3步 · 从候选中留够应补数':reason,effect:'多看最多2张，自己决定留下哪些',risk:'每场一次；照付弃牌成本，未留候选本场不再抽。'};}
 if(usesXiemuBurn(run)){const c=xiemuChoice(run,facts?.type);return {active:true,step:c.used?'本场燃金已用':!c.enabled?'本场不能燃':!c.qualified?'第1步 · 返回选两对及以上':!c.choices.some(x=>x.available)?'至少需要10金':'第2步 · 选燃金档，或保留金币',effect:'燃10／20／30金，出牌倍率×2／3／4',risk:'每场一次；选档不扣，出牌才扣。持币收益与关末利息读余金。'};}
 if(usesAzaoCharge(run)){const c=azaoChoice(run,facts?.type);return {active:true,step:!c.enabled?'本场蓄势停用':c.available?'出牌前 · 可释放'+c.charge+'层':c.charge?'返回选两对及以上，才能释放':'先用两对及以上出牌蓄势',effect:c.charge?'当前'+c.charge+'层，释放倍率×'+c.multiplier:'1／2／3层释放倍率×1.5／2.5／4',risk:'不释放：异型两对以上续蓄；重复型、对子或高牌出牌清空。弃牌保留，场间清空。'};}
 if(r2UsesAssist(run)){const c=r2AssistAvailability(run);return {active:true,step:!c.available&&c.reason==='disabled'?'本场助攻停用':!c.available&&c.reason==='used'?'本场助攻已用':assistAvailable?'出牌前 · 选一组剩余同点牌助攻':'先选两对及以上主手，再留剩余对子／三条',effect:'剩余对子助攻×'+R2_ASSIST_CONTRACT.pair+'，三条×'+R2_ASSIST_CONTRACT.three,risk:'每场一次；助攻牌随本手消耗，不计主手或留手效果。'};}
 const c=characterForRun(run);if(run.characterId==='touye')return {active:true,step:!enabled?'本场押注停用':run.stage?.wagerUsed?'本场押注已用':run.stage?.wagerSelected?'本手已押注':'出牌前 · 可选择本手押注',effect:c.passiveDescription,risk:'每场一次；押注为50%×2／50%×0.75。'};return {active:false,step:enabled?'被动技能 · 条件满足时自动生效':'本场角色能力停用',effect:c.passiveDescription,risk:''};
}

export function heroOperationSteps(run:R2RunState,guide:ReturnType<typeof heroSkillGuide>,chosen=false){
 const labels=!guide.active?['满足技能条件','出牌时自动生效']:usesTouyeWager(run)?['选要弃的牌','选押注目标','确认补牌']:usesErxiangHandoff(run)?['选对子及以上','选一张牌交棒','确认出牌']:usesLaohuanRefill(run)?['选要弃的牌','确认戏法弃牌','从候选中留牌']:usesXiemuBurn(run)?['选两对及以上','选燃金档','确认出牌']:usesAzaoCharge(run)?['合格出牌蓄势','选择释放','确认出牌']:r2UsesAssist(run)?['选两对及以上主手','选剩余同点牌助攻','确认出牌']:['选择本手押注','确认出牌'];
 if(usesTouyeWager(run)&&run.stage?.touyeWager?.resolution==='pending')return {labels:['选要弃的牌','选押注目标','补牌完成 · 下一步出牌'],current:2};
 const blocked=/停用|已用|次数不足|需要.*金币|不能/.test(guide.step);
 const current=blocked?-1:chosen?labels.length-1:run.pendingRefill?2:guide.step.includes('第2步')||guide.step.startsWith('出牌前')?1:0;
 return {labels,current};
}
export function mountHeroSkillGuide(dialog:HTMLDialogElement):void {
 dialog.classList.add('hero-skill-dialog');const step=dialog.querySelector('.dialog-purchase-summary'),intro=dialog.querySelector('.dialog-intro'),sequence=dialog.querySelector('.operation-guide');if(step&&intro)sequence?sequence.after(step):intro.prepend(step);
}
