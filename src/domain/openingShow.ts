import type {ScoreTrace} from './scoreR2';
import type {ScoreEvent} from './scoreR2';
import {Rational} from './rational';
export interface OpeningShow {handsScored:number;rootId:string|null;eventId:string|null;reason:'starter'|'multiply'|'score'|null}
export const freshOpeningShow=():OpeningShow=>({handsScored:0,rootId:null,eventId:null,reason:null});
export function actualMultiplier(e:ScoreEvent){
 if(['base','finalScore','afterHand','onStageClear','beforeFailure'].includes(e.phase)||!['multiply-multiplier','read-coefficient','rescue-multiplier'].includes(e.operation))return;
 const before=Rational.fromJSON(e.before.M),after=Rational.fromJSON(e.after.M);if(before.n<=0n||after.compare(before)<=0)return;
 return new Rational(after.n*before.d,after.d*before.n);
}
/** One saved opening accent, paid by actual events; the fifth score is an honest fallback. */
export function recordOpeningShow(old:OpeningShow,trace:ScoreTrace,starter:ScoreEvent|undefined,target:string,ending=false):OpeningShow {
 const next={...old,handsScored:old.handsScored+1};if(old.rootId)return next;
 const multiplier=trace.events.find(e=>actualMultiplier(e)?.compare(new Rational(3n,2n))!>=0),final=trace.events.find(e=>e.phase==='finalScore');
 const event=starter??multiplier??(BigInt(trace.finalScore)>=BigInt(target)*2n||next.handsScored>=5||ending?final:undefined);
 return event?{...next,rootId:trace.rootId,eventId:event.eventId,reason:starter?'starter':multiplier?'multiply':'score'}:next;
}
