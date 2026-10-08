import type {R2RunState} from './r2Run';
import type {Command} from './run';
import type {ScoreTrace} from './scoreR2';
import {R2_ROUTE_STARTERS} from './r2GroupUpgrade';
import {Rational} from './rational';
export interface R2StarterRecord {instanceId:string|null;rootId:string|null;eventId:string|null}
/** Canonical initialization lets the original start receipt protect the saved route. */
export function routeStarterStartCommand(s:Pick<R2RunState,'runId'|'seed'|'characterId'|'contentVersion'|'contentHash'|'openingRoute'|'mode'|'difficulty'|'challengeId'|'programsEnabled'>):Command {
 return {runId:s.runId,commandId:s.runId+'/start',expectedSeq:0,action:{type:'StartRun',seed:s.seed,characterId:s.characterId,rulesVersion:'r2',r2Identity:{contentVersion:s.contentVersion,contentHash:s.contentHash},openingRoute:s.openingRoute,modeConfig:{mode:s.mode,difficulty:s.difficulty,challengeId:s.challengeId,programsEnabled:s.programsEnabled}}};
}
/** Only a positive, real event from the purchased first-shelf instance earns its first cue. */
export function routeStarterScoreEvent(s:Pick<R2RunState,'openingRoute'|'routeStarter'>,trace:ScoreTrace){
 if(!s.openingRoute||!s.routeStarter?.instanceId)return;
 return trace.events.find(e=>e.sourceType==='joker'&&e.sourceInstanceId===s.routeStarter!.instanceId&&e.sourceDefinitionId===R2_ROUTE_STARTERS[s.openingRoute!]&&(
  e.operation==='add-growth'?Rational.fromJSON(e.value).compare(new Rational(0n))>0:
  Rational.fromJSON(e.after.H).compare(Rational.fromJSON(e.before.H))>0||Rational.fromJSON(e.after.M).compare(Rational.fromJSON(e.before.M))>0));
}
