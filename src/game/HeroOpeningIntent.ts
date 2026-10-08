import type {R2RunState} from '../domain/r2Run';
import {chooseBuildFocus,type BuildFocus} from './BuildJourney';
import {enrollFirstChapterGuide} from './FirstChapterGuide';
interface Candidate {state:R2RunState;status:string}
interface OpeningSession {run?:Candidate;pendingRun?:Candidate;subscribe:(listener:()=>void)=>()=>void}
/** A failed save retains one exact candidate. Publish UI intent only if that object becomes saved. */
export function deferOpeningIntent(session:OpeningSession,candidate:Candidate,focus:BuildFocus):void {
 const stop=session.subscribe(()=>{
  if(session.pendingRun===candidate)return;
  stop();
  if(session.run===candidate&&candidate.status==='idle'){
   chooseBuildFocus(candidate.state,focus);enrollFirstChapterGuide(candidate.state);
  }
 });
}
