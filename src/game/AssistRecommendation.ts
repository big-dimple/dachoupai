import {previewR2Hand} from '../domain/scoreR2';
import {r2ScoreContext,type R2RunState} from '../domain/r2Run';
import {r2AssistAvailability} from '../domain/r2Assist';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {assistCandidates} from './AssistSelection';

export interface AssistOption {ids:string[];multiplier:1|2|4;range:{minimum:string;maximum:string}}
type PublicScoreInput=Parameters<typeof previewR2Hand>[0];
export interface AssistRecommendation {key:string;options:AssistOption[];best:AssistOption;random:boolean}
/** Only explicit public scoring fields enter the preview and its cache key. */
export function assistPublicInput(run:R2RunState,selectedIds:readonly string[]):PublicScoreInput {
 const hand=run.handOrder.map(id=>run.deckInstances.find(c=>c.id===id)!);
 return structuredClone({rulesVersion:'r2',runId:'assist-public',rootId:'assist-public/selection',hand,selectedIds,
  disabledIds:run.stage!.disabledIds,jokers:run.jokers,definitions:r2JokerDefinitionsFor(run),handLevels:run.handLevels,
  playIndex:run.stage!.playIndex+1,handsBeforePlay:run.stage!.handsLeft,previousHandType:run.stage!.previousHandType,
  wager:run.stage!.wagerSelected,...r2ScoreContext(run,hand,selectedIds)});
}
export function rankAssistOptions(input:PublicScoreInput,available:boolean):AssistRecommendation {
 const candidates=assistCandidates(input,available),seat=new Map(input.hand.map((c,i)=>[c.id,i]));
 let random=false;
 const score=(ids:string[],multiplier:1|2|4):AssistOption=>{const preview=previewR2Hand({...input,...(ids.length?{assistIds:ids}:{})});random ||= preview.scoreRange.minimum!==preview.scoreRange.maximum;return {ids,multiplier,range:preview.scoreRange};};
 const options=[score([],1),...candidates.map(c=>score(c.assistIds,c.assistMultiplier))];
 options.sort((a,b)=>{
  const left=BigInt(a.range.minimum),right=BigInt(b.range.minimum);if(left!==right)return left>right?-1:1;
  if(a.ids.length!==b.ids.length)return a.ids.length-b.ids.length;
  for(let i=0;i<a.ids.length;i++){const delta=seat.get(a.ids[i])!-seat.get(b.ids[i])!;if(delta)return delta;}return 0;
 });
 return {key:JSON.stringify([input,available]),options,best:options[0],random};
}
export class AssistRecommendationCache {
 private result?:AssistRecommendation;
 get(run:R2RunState,ids:readonly string[]):AssistRecommendation|undefined {
  if(run.phase!=='await-input'||!run.stage||!ids.length)return;
  const input=assistPublicInput(run,ids),available=r2AssistAvailability(run).available,key=JSON.stringify([input,available]);
  if(this.result?.key===key)return this.result;
  try{return this.result=rankAssistOptions(input,available);}catch{return;}
 }
}
