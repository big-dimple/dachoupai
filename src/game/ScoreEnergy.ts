import type {ScoreEvent} from '../domain/scoreR2';
import {actualMultiplier} from '../domain/openingShow';
import {Rational} from '../domain/rational';
import {fractionText} from './scoreText';
import type {ScoreBeat} from './scorePresentation';
export interface NumberImpact {kind:'add'|'key'|'multiply';tier:0|1|2|3;chain:number;factor?:string;peak:number;color:string}
export function numberImpact(e:ScoreEvent,target:string,chain=0):NumberImpact|undefined {
 if(['base','afterHand','onStageClear','beforeFailure','finalScore'].includes(e.phase))return;
 const h0=Rational.fromJSON(e.before.H),h1=Rational.fromJSON(e.after.H),m0=Rational.fromJSON(e.before.M),m1=Rational.fromJSON(e.after.M);
 if(h1.compare(h0)<=0&&m1.compare(m0)<=0)return;
 const factor=actualMultiplier(e),delta=h1.multiply(m1).add(h0.multiply(m0).multiply(new Rational(-1n)));
 const key=delta.compare(new Rational(BigInt(target),4n))>=0,tier:0|1|2|3=factor?chain>=3||factor.compare(new Rational(3n))>=0?3:chain>=2||factor.compare(new Rational(2n))>=0?2:1:key?1:0;
 return {kind:factor?'multiply':key?'key':'add',tier,chain,factor:factor?fractionText({n:factor.n.toString(),d:factor.d.toString()}):undefined,peak:factor?1.34+tier*.02:key?1.28:1.14,color:tier>=3?'#80551f':tier?'#b8473a':'#26313a'};
}
export function impactBeat(base:ScoreBeat,impact:NumberImpact|undefined):ScoreBeat {
 if(!impact)return base;
 return {...base,windup:impact.kind==='multiply'?90:impact.kind==='key'?55:25,flight:base.flight?impact.kind==='multiply'?110:75:0,impact:impact.kind==='multiply'?280:impact.kind==='key'?210:145,rest:impact.kind==='multiply'?90:55};
}
/** A held compression, fast release and one settle; no looping flash or shake. */
export function numberPulse(t:number,kind:NumberImpact['kind'],peak:number){
 const p=Math.max(0,Math.min(1,t));if(p===1)return {scale:1,lift:0};const hold=kind==='multiply'?.22:.10,release=kind==='multiply'?.44:.34;
 if(p<hold)return {scale:kind==='multiply'?.82:.93,lift:0};
 if(p<release){const u=(p-hold)/(release-hold),ease=1-(1-u)**3;return {scale:(kind==='multiply'?.82:.93)+(peak-(kind==='multiply'?.82:.93))*ease,lift:-4*ease};}
 const u=(p-release)/(1-release);return {scale:1+(peak-1)*(1-u)**2,lift:-4*(1-u)**2};
}
