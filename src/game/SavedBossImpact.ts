import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {r2BossText} from '../domain/r2Chapter';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import type {R2RunState} from '../domain/r2Run';
import {r2ScoringDisabledJokerIds,type ScoreTrace} from '../domain/scoreR2';
import {fractionText} from './scoreText';

/** Historic scoring restrictions only. Never use the next stage, live slots or cleared seals. */
export function savedBossImpact(run:R2RunState,trace:ScoreTrace):string {
  const boss=trace.bossContext?.boss;if(!boss)return '';
  const lines:string[]=[],name=r2BossText(boss).split('：')[0];
  const cardName=(id:string)=>{const c=trace.cards.find(c=>c.id===id);return c?rankLabel(c.rank)+SUIT_SYMBOL[c.suit]:'记录中的牌';};
  const suppressed=[...new Set(trace.events.filter(e=>e.sourceType==='rule'&&e.sourceDefinitionId===boss.definitionId&&e.operation==='ordinary-points-suppressed'&&e.targetCardId).map(e=>e.targetCardId!))];
  if(suppressed.length)lines.push(suppressed.map(cardName).join('、')+' 普通点数归零；仍可成型和触发大丑牌效果。');
  for(const event of trace.events.filter(e=>e.sourceType==='rule'&&e.sourceDefinitionId===boss.definitionId&&e.operation==='halve-base-heat'))lines.push('牌型基础热度 '+fractionText(event.before.H)+' → '+fractionText(event.after.H)+'；普通点数与大丑牌加成正常。');
  if(boss.definitionId==='B03'||boss.definitionId==='B04'){
    const disabled=trace.sets.scoringIds.filter(id=>!trace.sets.activeScoringIds.includes(id));
    if(disabled.length)lines.push(disabled.map(cardName).join('、')+' 计分失效；仍参与牌型。');
  }
  if(['B06','B15','B16'].includes(boss.definitionId)){
    const definitions=r2JokerDefinitionsFor(run),disabled=r2ScoringDisabledJokerIds(boss,trace.sourceJokers,definitions,trace.bossContext.sealedJokerIds);
    const names=trace.sourceJokers.filter(j=>disabled.includes(j.instanceId)).map(j=>definitions.find(d=>d.id===j.definitionId)?.name??j.definitionId);
    if(names.length)lines.push(names.join('、')+' 本手计分与版次停用；静态资源、经济与结算后成长保持原规则。');
  }
  if(boss.definitionId==='B08')lines.push('本手角色计分能力与押注停用；初始牌型等级和非计分收益保留。');
  return lines.length?'压轴实际影响 · '+name+'\n'+lines.join('\n'):'';
}
