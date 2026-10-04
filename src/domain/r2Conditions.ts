import type {PlayingCard} from '../cards/types';
import type {Condition} from '../content/r2Schema';
import type {R2HandType} from './evaluateR2';
import {Rational} from './rational';

/** Shared authoritative predicates. Context adapters keep score/transaction clocks distinct.
 * No RNG, accumulator, event chain or predicted score is accepted by guidance. */
export interface R2ScoreConditionContext {
 played:readonly PlayingCard[];held:readonly PlayingCard[];validHeld:readonly PlayingCard[];active:readonly PlayingCard[];
 scoringIds:readonly string[];handType:R2HandType;previousHandType:R2HandType|null;
 playIndex:number;handsAfter:number;gold:number;discardsUsed:number;
 extraExecutions:number;resolvedFinal:bigint|null;stageHeatBefore?:string;stageTargetHeat?:string;
}
export function r2ScoreConditionMatches(c:Condition,ctx:R2ScoreConditionContext,card?:PlayingCard):boolean {
switch (c.kind) {
      case 'always': return true;
      case 'hand-type-in': return c.values.includes(ctx.handType);
      case 'rank-in': return !!card && c.values.includes(card.rank);
      case 'played-count': return ctx.played.length === c.equals;
      case 'played-count-maximum': return ctx.played.length <= c.maximum;
      case 'held-count': return ctx.held.length >= c.minimum;
      case 'play-modulo': return ctx.playIndex % c.divisor === c.remainder;
      case 'suit-in': return !!card&&c.values.includes(card.suit);
      case 'paired-rank': return !!card&&ctx.played.filter(p=>p.rank===card.rank).length>=c.minimum;
      case 'rank-groups': return [...new Set(ctx.played.map(p=>p.rank))].filter(rank=>ctx.played.filter(p=>p.rank===rank).length>=c.groupSize).length>=c.minimum;
      case 'held-rank-first': return (c.playedEquals===undefined||ctx.played.length===c.playedEquals)&&!!card&&ctx.validHeld.filter(p=>c.values.includes(p.rank)).slice(0,c.limit).some(p=>p.id===card.id);
      case 'held-scoring-rank-first': return !!card&&ctx.validHeld.filter(p=>ctx.active.some(scored=>scored.rank===p.rank)).slice(0,c.limit).some(p=>p.id===card.id);
      case 'held-enhancement-first': return !!card&&ctx.validHeld.filter(p=>p.enhancement===c.enhancement).slice(0,c.limit).some(p=>p.id===card.id);
      case 'hand-type-transition': return ctx.handType===c.current&&ctx.previousHandType===c.previous;
      case 'extra-retrigger': return ctx.extraExecutions>0;
      case 'stage-score-below-target': return new Rational(BigInt(ctx.stageHeatBefore!)).compare(new Rational(BigInt(ctx.stageTargetHeat!)).multiply(Rational.fromJSON(c.ratio)))<0;
      case 'hand-score-below-target': return ctx.resolvedFinal!==null&&BigInt(ctx.stageHeatBefore!)+ctx.resolvedFinal<BigInt(ctx.stageTargetHeat!)
        &&new Rational(ctx.resolvedFinal).compare(new Rational(BigInt(ctx.stageTargetHeat!)).multiply(Rational.fromJSON(c.ratio)))<0;
      case 'resource': return ({gold:ctx.gold??0,'hands-after':ctx.handsAfter,'play-index':ctx.playIndex,'discards-used':ctx.discardsUsed??0})[c.resource]===c.equals;
      case 'resource-minimum': return (ctx.gold??0)>=c.minimum;
      case 'resource-maximum': return (ctx.gold??0)<=c.maximum;
      case 'all-played-active':return ctx.played.length>=c.minimum&&ctx.played.length===ctx.active.length;
      case 'scoring-position':return !!card&&card.id===(c.position==='third-original'?ctx.scoringIds[2]:(c.position==='first'?ctx.active[0]:ctx.active.at(-1))?.id)&&(!c.handTypes||c.handTypes.includes(ctx.handType))&&(!c.playModulo||ctx.playIndex%c.playModulo.divisor===c.playModulo.remainder);
      case 'discard-count':case 'discard-same-suit':case 'exhausted-hands':return false;
      case 'stage-played-maximum':case 'stage-hand-types-all':case 'no-joker-sale-this-stage':case 'hand-type-unfinished':return false;
    }
}

export interface R2TransactionConditionContext {
 gold:number;handsAfter?:number;playIndex?:number;discardsUsed?:number;
 handType:R2HandType|null;heldCount?:number;discarded:readonly PlayingCard[];
 hasStage:boolean;maxPlayedCount:number;ordinaryStraightSeen:boolean;ordinaryFlushSeen:boolean;
 jokerSold:boolean;traceType:R2HandType|null;heat:string;target:string;
}
/** Reads an actual transaction boundary, not the prospective score clock. */
export function r2TransactionConditionMatches(c:Condition,ctx:R2TransactionConditionContext):boolean {
 switch(c.kind){
  case 'always':return true;
  case 'resource':return ({gold:ctx.gold,'hands-after':ctx.handsAfter,'play-index':ctx.playIndex,'discards-used':ctx.discardsUsed})[c.resource]===c.equals;
  case 'hand-type-in':return !!ctx.handType&&c.values.includes(ctx.handType);
  case 'discard-count':return ctx.discarded.length===c.equals;
  case 'discard-same-suit':return ctx.discarded.length>=c.minimum&&ctx.discarded.every(card=>card.suit===ctx.discarded[0].suit);
  case 'stage-played-maximum':return ctx.hasStage&&!!ctx.playIndex&&ctx.maxPlayedCount<=c.maximum;
  case 'stage-hand-types-all':return ctx.hasStage&&c.values.every(type=>type==='straight'?ctx.ordinaryStraightSeen:type==='flush'&&ctx.ordinaryFlushSeen);
  case 'no-joker-sale-this-stage':return ctx.hasStage&&!ctx.jokerSold;
  case 'held-count':return ctx.heldCount!==undefined&&ctx.heldCount>=c.minimum;
  case 'hand-type-unfinished':return ctx.hasStage&&!!ctx.traceType&&c.values.includes(ctx.traceType)&&BigInt(ctx.heat)<BigInt(ctx.target);
  default:throw Error('invalid-economic-condition');
 }
}
