import type {PlayingCard} from '../cards/types';
import type {R2JokerDefinition,R2JokerInstance} from '../content/r2Schema';
import {r2BossText,r2DisabledCards,r2OrdinarySuppression,type R2BossPlan} from '../domain/r2Chapter';
import {r2ScoringDisabledJokerIds} from '../domain/scoreR2';

export interface BossPressure {kind:'scoring'|'ordinary-points';label:string;detail:string}
export interface BossPressureContext {
  boss:R2BossPlan|null;stageIndex:number;hand:readonly PlayingCard[];selectedIds:readonly string[];
  jokers:readonly R2JokerInstance[];definitions:readonly R2JokerDefinition[];sealedJokerIds:readonly string[];
}
const activeBoss=(input:BossPressureContext)=>input.stageIndex%3===2?input.boss:null;

/** Presentation consumes domain eligibility; no second B03/B04/slot/rarity predicate. */
export function bossCardPressure(input:BossPressureContext,cardId:string):BossPressure|undefined {
  const boss=activeBoss(input);if(!boss)return;
  const heading=r2BossText(boss).split('：')[0];
  if(r2DisabledCards(boss,input.stageIndex,input.hand).includes(cardId))return {
    kind:'scoring',label:'计分失效',detail:heading+'：本场此牌仍可选中、打出和组成牌型；普通点数、增强、版次与此牌的计分效果停用。其他有效牌及整手唐宋牌按各自条件结算。',
  };
  if(r2OrdinarySuppression(boss,input.stageIndex,input.hand,input.selectedIds).includes(cardId))return {
    kind:'ordinary-points',label:'点数归零',detail:heading+'：本手此牌仅普通点数归零；仍可打出、组成牌型，增强、版次和明确的唐宋牌效果照常按条件结算。',
  };
}

export function bossJokerPressure(input:BossPressureContext,instanceId:string):BossPressure|undefined {
  const boss=activeBoss(input);if(!boss||!r2ScoringDisabledJokerIds(boss,input.jokers,input.definitions,input.sealedJokerIds).includes(instanceId))return;
  return {kind:'scoring',label:'计分封禁',detail:r2BossText(boss).split('：')[0]+'：本场当前限制下，此唐宋牌的计分效果与版次停用；静态资源、经济与结算后成长仍按各自条件执行。'+(boss.definitionId==='B15'?'封禁跟随此实例，调序不恢复，离开本场解除。':boss.definitionId==='B06'?'限制跟随第2/4槽，出牌前调到其他槽即可恢复计分。':'稀有牌受限，常见与罕见牌照常。')};
}
