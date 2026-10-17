import type {ScoreEvent} from '../domain/scoreR2';
import {Rational,type Fraction} from '../domain/rational';
import {fractionText,readableFractionText} from './scoreText';

export interface ScoreContribution {target:'H'|'M';kind:'heat'|'add'|'multiply';label:string;exact:string;before:Fraction;after:Fraction}
/** Only committed accumulator changes travel. Growth, chances and seal bookkeeping do not. */
export function scoreContributions(event:ScoreEvent):ScoreContribution[]{
  if(!['onCardScore','onHeldCard','jokerScore','characterScore','routeGrowth'].includes(event.phase))return [];
  const result:ScoreContribution[]=[];
  for(const target of ['H','M'] as const){
    const before=event.before[target],after=event.after[target],delta=Rational.fromJSON(after).add(Rational.fromJSON(before).multiply(new Rational(-1n)));
    if(delta.n===0n)continue;
    const base=Rational.fromJSON(before),factor=target==='M'&&base.n!==0n&&['multiply-multiplier','read-coefficient','route-factor','rescue-multiplier'].includes(event.operation)?Rational.fromJSON(after).multiply(new Rational(base.d,base.n)):undefined,kind=factor?'multiply':target==='H'?'heat':'add';
    const value=factor?.toJSON()??delta.toJSON(),label=(factor?'×':delta.n>0n?'+':'')+readableFractionText(value);
    result.push({target,kind,label,exact:(target==='H'?'热度':'倍率')+' '+fractionText(before)+' → '+fractionText(after),before,after});
  }
  return result;
}
