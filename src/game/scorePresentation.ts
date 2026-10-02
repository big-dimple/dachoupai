import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';

/** Only the modifier which enabled the committed four-card type receives the formation cue. */
export function fourCardFormation(score:ScoreTrace):{instanceId:string;definitionId:'c08'|'c09';handType:'straight'|'flush'}|undefined {
  if(score.sets.scoringIds.length!==4||score.handType!=='straight'&&score.handType!=='flush')return;
  const definitionId=score.handType==='straight'?'c08':'c09';
  const source=score.sourceJokers.find(joker=>joker.definitionId===definitionId);
  if(source)return {instanceId:source.instanceId,definitionId,handType:score.handType};
}

/** Resource/growth bookkeeping has no accumulator packet; coefficient reads really multiply M. */
export function scorePacketSymbol(event:ScoreEvent):'+H'|'+M'|'×M'|undefined {
  if(event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d)
    return event.operation==='multiply-multiplier'||event.operation==='read-coefficient'?'×M':'+M';
  if(event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d)return '+H';
}

export type ScoreBeat={windup:number;flight:number;impact:number;rest:number;strength:'light'|'medium'|'role'|'multiply'|'retrigger'};

/** Zero-based presented trace position, never chain length or a rule clock. Long chains retain every beat. */
export function scoreBeat(event:ScoreEvent,ordinal=0):ScoreBeat {
  let start:ScoreBeat,fast:ScoreBeat;
  if(event.operation==='lucky-multiplier-check'||event.operation==='lucky-gold-check'||event.operation==='lucky-gold-cap'||event.operation==='chance-heat-check'){
    start={windup:90,flight:0,impact:170,rest:100,strength:'light'};fast={windup:70,flight:0,impact:140,rest:90,strength:'light'};
  }else if(event.operation==='glass-check'){
    start={windup:110,flight:0,impact:190,rest:120,strength:'light'};fast={windup:80,flight:0,impact:150,rest:90,strength:'light'};
  }else if(event.operation==='destroy-card'||event.operation==='destroy-joker'){
    start={windup:180,flight:0,impact:270,rest:150,strength:'medium'};fast={windup:140,flight:0,impact:220,rest:120,strength:'medium'};
  }else if(event.operation==='reward-consumable'){
    start={windup:170,flight:0,impact:280,rest:150,strength:'medium'};fast={windup:110,flight:0,impact:190,rest:100,strength:'medium'};
  }else if(event.operation==='upgrade-hand'||event.operation==='add-gold'){
    start={windup:140,flight:0,impact:240,rest:120,strength:'medium'};fast={windup:90,flight:0,impact:180,rest:90,strength:'medium'};
  }else if(event.phase==='afterHand'||event.phase==='beforeFailure'||event.phase==='onStageClear'){
    start={windup:140,flight:0,impact:240,rest:120,strength:'medium'};fast={windup:90,flight:0,impact:180,rest:90,strength:'medium'};
  }else if(event.operation==='ordinary-points-suppressed'||event.operation==='retrigger-cap'){
    start={windup:100,flight:0,impact:180,rest:120,strength:'light'};fast={windup:60,flight:0,impact:150,rest:90,strength:'light'};
  }else if(event.operation==='retrigger-card'){
    start={windup:140,flight:0,impact:220,rest:140,strength:'retrigger'};fast={windup:100,flight:0,impact:160,rest:100,strength:'retrigger'};
  }else if(event.operation==='multiply-multiplier'||event.operation==='read-coefficient'){
    start={windup:360,flight:180,impact:340,rest:220,strength:'multiply'};fast={windup:300,flight:150,impact:270,rest:180,strength:'multiply'};
  }else if(event.sourceType==='character'){
    start={windup:220,flight:160,impact:260,rest:160,strength:'role'};fast={windup:160,flight:120,impact:200,rest:120,strength:'role'};
  }else if(event.sourceType==='card'&&event.retriggerDepth>0){
    start={windup:130,flight:110,impact:190,rest:90,strength:'retrigger'};fast={windup:80,flight:70,impact:130,rest:60,strength:'retrigger'};
  }else if(event.sourceType==='card'&&event.before.M.n===event.after.M.n&&event.before.M.d===event.after.M.d){
    start={windup:110,flight:110,impact:180,rest:100,strength:'light'};fast={windup:60,flight:70,impact:110,rest:60,strength:'light'};
  }else {
    start={windup:140,flight:120,impact:210,rest:130,strength:'medium'};fast={windup:90,flight:90,impact:140,rest:80,strength:'medium'};
  }
  const progress=Number.isFinite(ordinal)?Math.min(8,Math.max(0,Math.floor(ordinal)))/8:0;
  const mix=(a:number,b:number)=>Math.round(a+(b-a)*progress),total=(beat:ScoreBeat)=>beat.windup+beat.flight+beat.impact+beat.rest;
  const windup=mix(start.windup,fast.windup),flight=mix(start.flight,fast.flight),rest=mix(start.rest,fast.rest);
  const impact=mix(total(start),total(fast))-windup-flight-rest;
  const changed=event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d||event.before.M.n!==event.after.M.n||event.before.M.d!==event.after.M.d;
  return {windup,flight:changed?flight:0,impact,rest:rest+(changed?0:flight),strength:start.strength};
}

/** The provisional displayed product may fall later (e.g. wager ×0.75); no prediction or credit. */
export function scoreFireLevel(beforeHeat:string,displayedHandScore:string,targetHeat:string):0|1|2 {
  const total=BigInt(beforeHeat)+BigInt(displayedHandScore),target=BigInt(targetHeat);
  if(target<=0n||total<=target)return 0;
  return total>=target*2n?2:1;
}
