import type {ScoreEvent} from '../domain/scoreR2';
import {actualMultiplier} from '../domain/openingShow';
import {numberImpact} from './ScoreEnergy';
import {hasActualBenefit} from './JokerExperience';
import {scoreBeat,type ScoreBeat,type ScorePhraseGesture} from './scorePresentation';
import {OWNED_SCORE_SPRING} from './inkwaveSpring';

/** Read-only phrase over the committed order. No sorting, score arithmetic,
 * independent timers, or mutation of a trace. The Scene consumes each beat once. */
export function scorePhrase(events:readonly ScoreEvent[],target:string,speed=1):Map<string,ScoreBeat>{
 const beats=new Map<string,ScoreBeat>(),rate=[1,2,4].includes(speed)?speed:1;
 const eligible=(e:ScoreEvent)=>!['base','finalScore','afterHand','onStageClear','beforeFailure'].includes(e.phase)&&(!!numberImpact(e,target)||e.sourceType==='joker'&&hasActualBenefit(e));
 const gains=events.filter(eligible),multiplies=gains.filter(e=>actualMultiplier(e));
 // One key multiplier, strongest actual factor; the last equal factor closes its run.
 const accent=multiplies.reduce<ScoreEvent|undefined>((best,e)=>!best||actualMultiplier(e)!.compare(actualMultiplier(best)!)>=0?e:best,undefined);
 let pulse=0,cursor=0,settled=false,previousSource:string|undefined;
 for(const event of events){
  const base=scoreBeat(event,pulse),gain=eligible(event),repeat=gain&&previousSource===event.sourceInstanceId;
  let role:ScorePhraseGesture['role'],weight:number,paired=false,windup:number,flight:number,impact:number,rest:number;
  if(event.phase==='finalScore'){role='settle';weight=1;windup=120;flight=0;impact=430;rest=130;settled=true;}
  else if(settled||['afterHand','onStageClear','beforeFailure'].includes(event.phase)){role='receipt';weight=.28;windup=20;flight=0;impact=100;rest=24;}
  else if(gain){
   const progress=Math.min(1,pulse/Math.max(1,gains.length-1));
   role=event===accent?'accent':pulse===0?'opening':'run';
   weight=role==='accent'?1:role==='opening'?.72:Math.min(.8,[.46,.61,.42,.67][pulse%4]+progress*.1);
   paired=event.sourceType==='joker'&&(role==='accent'||role==='opening'||pulse%4===0);
   if(role==='accent'){windup=180;flight=105;impact=340;rest=100;}
   else if(role==='opening'){windup=120;flight=95;impact=300;rest=90;}
   else {windup=Math.round(64-34*progress);flight=Math.round(96-34*progress);impact=Math.round(250-76*progress);rest=Math.round(66-40*progress);if(repeat){windup=Math.max(18,windup-14);rest=Math.max(18,rest-10);}}
   pulse++;previousSource=event.sourceInstanceId;
  }else {role='notice';weight=.32;windup=35;flight=0;impact=130;rest=35;previousSource=undefined;}
  if(!base.flight)flight=0;
  // Only structural two-beat gestures need a real-time floor at 4x. Ordinary
  // single strikes retain their faster slots; no later motion layer overrides it.
  if(paired)impact=Math.max(impact,Math.ceil(50/OWNED_SCORE_SPRING.reboundAt*rate));
  else if(gain&&event.sourceType==='joker')impact=Math.max(impact,96*rate);
  const start=cursor,arrival=start+windup+flight;cursor=arrival+impact+rest;
  beats.set(event.eventId,{...base,windup,flight,impact,rest,phrase:{role,pulse:gain?pulse-1:pulse,accentWeight:weight,paired,start,arrival,end:cursor}});
 }
 return beats;
}
