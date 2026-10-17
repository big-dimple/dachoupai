import {heroSkillName,heroSkillTitle} from './HeroSkillPresentation';
import {usesErxiangHandoff,ordinaryCardPoints} from '../domain/r2ErxiangHandoff';
import type {R2RunState} from '../domain/r2Run';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import {r2RunModeConfig} from '../content/r2Modes';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {enhancementText} from './CardSpecialLabels';
import {editionLabel} from './r2ToolInfo';
export function erxiangChoice(run:R2RunState,facts?:R2SelectionFacts,targetId:string|null=null){
 const enabled=usesErxiangHandoff(run)&&run.phase==='await-input'&&r2RunModeConfig(run).characterAbilityEnabled&&run.stage?.boss?.definitionId!=='B08',used=!!run.stage?.erxiangHandoffUsed;
 const candidates=enabled&&!used&&facts&&facts.type!=='high-card'?run.deckInstances.filter(c=>facts.activeScoringIds.includes(c.id)&&!facts.ordinaryPointsSuppressedIds.includes(c.id)).map(card=>{
  const points=ordinaryCardPoints(card);
  return {card,points,label:'第'+(run.handOrder.indexOf(card.id)+1)+'张 · '+rankLabel(card.rank)+SUIT_SYMBOL[card.suit],detail:'增强：'+enhancementText(card)+'；版次：'+editionLabel(card.edition)+'。'+heroSkillName('erxiang')+'：首次普通'+points+'点热度 → 倍率。'};
 }):[];
 const selected=candidates.find(c=>c.card.id===targetId);
 return {enabled,used,candidates,selected,compact:heroSkillName('erxiang')+' · '+(used?'已用':!enabled?'已停用':selected?'已选'+selected.points+'点':'选牌'),sentence:selected?'这张的'+selected.points+'点改加倍率，本场一次':used?'本场'+heroSkillName('erxiang')+'已用':!enabled?'本场角色停用，仍可正常出牌':candidates.length?'选一张核心：普通点数改加倍率，本场一次':'先选对子及以上的有效核心'};
}
export function savedErxiangHandoff(run:R2RunState):string {
 const t=run.lastTrace?.erxiangHandoff;if(!t?.targetId)return '';
 const e=run.lastTrace!.events.find(e=>e.sourceType==='character'&&e.reasonKey==='erxiang.handoff'&&e.targetCardId===t.targetId);
 return e?'上手'+heroSkillTitle('erxiang')+' · '+e.value.n+'点热度 → 倍率（首次普通计分）':'';
}
