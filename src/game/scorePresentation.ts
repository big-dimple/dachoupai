import type {ScoreEvent} from '../domain/scoreR2';

export type ScoreBeat={windup:number;flight:number;impact:number;rest:number;strength:'light'|'medium'|'role'|'multiply'|'retrigger'};

/** Playback mapping only. Each committed event receives its own full beat, even in long chains. */
export function scoreBeat(event:ScoreEvent):ScoreBeat {
  let beat:ScoreBeat;
  if(event.phase==='afterHand')beat={windup:200,flight:0,impact:260,rest:240,strength:'medium'};
  else if(event.operation==='ordinary-points-suppressed'||event.operation==='retrigger-cap')beat={windup:180,flight:0,impact:280,rest:200,strength:'light'};
  else if(event.operation==='retrigger-card')beat={windup:220,flight:0,impact:300,rest:180,strength:'retrigger'};
  else if(event.operation==='multiply-multiplier')beat={windup:480,flight:240,impact:450,rest:320,strength:'multiply'};
  else if(event.sourceType==='character')beat={windup:320,flight:200,impact:360,rest:240,strength:'role'};
  else if(event.sourceType==='card'&&event.retriggerDepth>0)beat={windup:140,flight:160,impact:260,rest:140,strength:'retrigger'};
  else if(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d)beat={windup:280,flight:210,impact:340,rest:230,strength:'medium'};
  else if(event.sourceType==='card')beat={windup:200,flight:150,impact:280,rest:180,strength:'light'};
  else beat={windup:260,flight:200,impact:320,rest:220,strength:'medium'};
  const changed=event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d||event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d;
  return {...beat,flight:changed?beat.flight:0};
}

/** The provisional displayed product may fall later (e.g. wager ×0.75); no prediction or credit. */
export function scoreFireLevel(beforeHeat:string,displayedHandScore:string,targetHeat:string):0|1|2|3 {
  const total=BigInt(beforeHeat)+BigInt(displayedHandScore),target=BigInt(targetHeat);
  if(target<=0n||total<=target)return 0;
  return total>=target*3n?3:total>=target*2n?2:1;
}
