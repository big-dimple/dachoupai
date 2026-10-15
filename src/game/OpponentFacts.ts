import type {PlayingCard} from '../cards/types';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {HAND_LABELS} from '../content/handLabels';
import {evaluateR2Hand,R2_HAND_TYPES,type R2HandType,type HandRules} from '../domain/evaluateR2';
import type {R2RunState} from '../domain/r2Run';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import {fractionText,heatText} from './scoreText';

export interface OpponentBeat {kind:'repeat'|'changed'|'opening'|'unknown'|'won'|'lost';quote:string;title:string;effect:string;eventId?:string}
/** Only the saved scoring context and its actual events establish a reaction. */
export function opponentHandBeat(trace:ScoreTrace|null|undefined):OpponentBeat|undefined {
  const context=trace?.bossContext;if(!trace||context?.boss?.definitionId!=='B05')return;
  const event=trace.events.find(isEchoReduction),previous=context.previousHandType,current=HAND_LABELS[trace.handType];
  if(event)return {kind:'repeat',quote:'同一招，我听过了。',title:'回音墙 · 同招回响',effect:'牌型基础 '+fractionText(event.before.H)+' → '+fractionText(event.after.H),eventId:event.eventId};
  if(previous&&previous!==trace.handType)return {kind:'changed',quote:'哦？你换招了。',title:'回音墙 · 换招避开',effect:HAND_LABELS[previous]+' → '+current+' · 本手基础未减半'};
  if(previous===null)return {kind:'opening',quote:'先让我听听你的招。',title:'回音墙 · 首手',effect:current+' · 首手基础不减半'};
  return {kind:'unknown',quote:'这一手，按记录认账。',title:'回音墙 · 已存结果',effect:current+' · '+heatText(trace.finalScore)+' 分'};
}
export function isEchoReduction(event:ScoreEvent):boolean {return event.phase==='base'&&event.sourceType==='rule'&&event.sourceDefinitionId==='B05'&&event.operation==='halve-base-heat';}
/** The first base event is painted by the landing hook. Later base events must reach the accumulator. */
export function remainingScoreEvents(trace:ScoreTrace):readonly ScoreEvent[] {return trace.events.filter((event,index)=>!(index===0&&event.phase==='base'));}
export function opponentSavedStatus(trace:ScoreTrace|null|undefined):string {
  const beat=opponentHandBeat(trace);if(!beat||!trace)return '';
  return (beat.kind==='repeat'?'同型硬闯 · 基础½':beat.kind==='changed'?'换型避开基础½':beat.kind==='opening'?'首手 · 基础正常':'已存本手')+' · '+heatText(trace.finalScore)+' 分';
}
export function opponentOutcome(run:Pick<R2RunState,'phase'|'stage'>,trace:ScoreTrace):OpponentBeat|undefined {
  if(run.stage?.boss?.definitionId!=='B05'||trace.bossContext?.boss?.definitionId!=='B05')return;
  if(run.phase==='stage-cleared'||run.phase==='run-won')return {kind:'won',quote:'你的招，我认了。',title:'回音墙 · 你赢了这场',effect:heatText(run.stage.heat)+' / '+heatText(run.stage.targetHeat)+' 热度'};
  if(run.phase==='run-lost')return {kind:'lost',quote:'这一场，我接住了。',title:'回音墙 · 本场未过',effect:heatText(run.stage.heat)+' / '+heatText(run.stage.targetHeat)+' 热度'};
}
export interface OpponentChoice {kind:'repeat'|'change'|'opening';type:R2HandType;ids:string[];label:string;detail:string}
/** Public formed cards only, no scoring simulation, hidden draw, ability choice or RNG. */
export function opponentChoices(hand:readonly PlayingCard[],rules:HandRules,previous:R2HandType|null):OpponentChoice[] {
  const formed=new Map<R2HandType,PlayingCard[]>();
  const visit=(at:number,picked:PlayingCard[])=>{
    if(picked.length){
      const facts=evaluateR2Hand(picked,rules),scoring=picked.filter(c=>facts.scoringIds.includes(c.id));
      // Do not silently consume non-scoring cards for a sample.
      if(scoring.length===picked.length){const old=formed.get(facts.type);if(!old||picked.length<old.length||picked.length===old.length&&picked.reduce((n,c)=>n+c.rank,0)>old.reduce((n,c)=>n+c.rank,0))formed.set(facts.type,[...picked]);}
    }
    if(picked.length===5)return;for(let i=at;i<hand.length;i++)visit(i+1,[...picked,hand[i]]);
  };visit(0,[]);
  const types=[...formed.keys()].sort((a,b)=>R2_HAND_TYPES.indexOf(b)-R2_HAND_TYPES.indexOf(a));
  const candidates=previous?[...(formed.has(previous)?[previous]:[]),...types.filter(t=>t!==previous).slice(0,1)]:types.slice(0,2);
  return candidates.map(type=>{const cards=formed.get(type)!,kind=previous?(type===previous?'repeat':'change'):'opening',kept=hand.length-cards.length;
    return {kind,type,ids:cards.map(c=>c.id),label:(kind==='repeat'?'同型硬闯':kind==='change'?'换型避开':'首手')+' · '+HAND_LABELS[type],detail:cards.map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join(' ')+' · 出'+cards.length+'张，留'+kept+'张\n'+(kind==='repeat'?'仅牌型基础½；牌点数、增强和大丑牌热度照常':kind==='change'?'本手避开基础½；仍需凑够目标，未必得分更高':'首手基础不减半')};
  });
}
