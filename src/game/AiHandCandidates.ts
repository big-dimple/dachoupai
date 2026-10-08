import {validateCardInstances} from '../domain/evaluateR2';
import {r2CandidateKey,type R2CandidateInput} from '../domain/r2HandCandidates';
import {r2SelectionFacts,type R2SelectionFacts} from '../domain/r2SelectionFacts';
import {r2OrdinarySuppression} from '../domain/r2Chapter';
import {previewR2Hand,type ScoreInput} from '../domain/scoreR2';

export const AI_HAND_POLICY='成牌优先，高牌仅兜底。按当前规则的稳妥得分从高到低选牌；随机效果按保底比较，实际结果可能不同。平分先少出牌，再按当前座位顺序。只选牌，仍需自己出牌。';
export type AiScoreContext=Pick<ScoreInput,'touyeWager'|'laohuanTrick'|'xiemuBurn'|'azaoCharge'|'characterId'|'amoScoreTiming'|'handLevels'|'previousHandType'|'wager'|'jokerSlots'|'previousHandScore'>;
export interface AiHandInput extends R2CandidateInput {score:AiScoreContext}
export interface AiHandResult {key:string;status:'working'|'ready'|'unsupported';ordered:R2SelectionFacts[];examined:number;reason?:string}
export interface AiHandCursor {key:string;index:number;selection:string}
export function nextAiHand(result:AiHandResult|undefined,key:string,selected:readonly string[],cursor?:AiHandCursor):{facts:R2SelectionFacts;cursor:AiHandCursor}|undefined {
 if(result?.status!=='ready'||result.key!==key||!result.ordered.length)return;
 const selection=JSON.stringify([...selected].sort()),index=cursor?.key===key&&cursor.selection===selection?(cursor.index+1)%result.ordered.length:0,facts=result.ordered[index];
 return{facts,cursor:{key,index,selection:JSON.stringify([...facts.playedIds].sort())}};
}
const scoreContext=(s:AiScoreContext):AiScoreContext=>({... (s.touyeWager?{touyeWager:s.touyeWager}:{}),... (s.laohuanTrick?{laohuanTrick:s.laohuanTrick}:{}),... (s.xiemuBurn?{xiemuBurn:s.xiemuBurn}:{}),... (s.azaoCharge?{azaoCharge:s.azaoCharge}:{}),characterId:s.characterId,amoScoreTiming:s.amoScoreTiming,handLevels:s.handLevels,previousHandType:s.previousHandType,wager:s.wager,jokerSlots:s.jokerSlots,previousHandScore:s.previousHandScore});
/** Explicit public fields only: callers cannot smuggle an RNG or future pile into the key/snapshot. */
export function aiHandKey(input:AiHandInput):string {return JSON.stringify([r2CandidateKey(input),scoreContext(input.score)]);}
function publicSnapshot(input:AiHandInput):AiHandInput {
 return structuredClone({hand:input.hand,jokers:input.jokers,definitions:input.definitions,handRules:input.handRules,disabledIds:input.disabledIds,ordinaryPointsSuppressedIds:input.ordinaryPointsSuppressedIds,boss:input.boss,stageIndex:input.stageIndex,sealedJokerIds:input.sealedJokerIds,challengeDisabledJokerId:input.challengeDisabledJokerId,resources:input.resources,contentVersion:input.contentVersion,score:scoreContext(input.score)});
}
function* subsets(hand:AiHandInput['hand']):Generator<string[]> {
 function* choose(size:number,start:number,ids:string[]):Generator<string[]> {if(!size){yield ids;return;}for(let i=start;i<=hand.length-size;i++)yield*choose(size-1,i+1,[...ids,hand[i].id]);}
 for(let size=1;size<=Math.min(5,hand.length);size++)yield*choose(size,0,[]);
}
interface Ranked {facts:R2SelectionFacts;lower:bigint}
function collector(input:AiHandInput,key:string){
 validateCardInstances(input.hand);if(!input.hand.length||input.hand.length>14)throw Error('AI仅支持当前1–14张可见手牌');
 const iterator=subsets(input.hand),best=new Map<R2SelectionFacts['type'],Ranked>(),seat=new Map(input.hand.map((c,i)=>[c.id,i]));let examined=0;
 const compare=(a:Ranked,b:Ranked)=>{
  if(a.lower!==b.lower)return a.lower>b.lower?-1:1;
  if(a.facts.playedIds.length!==b.facts.playedIds.length)return a.facts.playedIds.length-b.facts.playedIds.length;
  for(let i=0;i<a.facts.playedIds.length;i++){const delta=seat.get(a.facts.playedIds[i])!-seat.get(b.facts.playedIds[i])!;if(delta)return delta;}return 0;
 };
 return {next(){const next=iterator.next();if(next.done)return false;const ids=next.value;
  const suppression=input.boss?r2OrdinarySuppression(input.boss,input.stageIndex,input.hand,ids):[],ordinaryPointsSuppressedIds=[...new Set([...(input.ordinaryPointsSuppressedIds??[]).filter(id=>ids.includes(id)),...suppression])];
  const facts=r2SelectionFacts({...input,selectedIds:ids,ordinaryPointsSuppressedIds});
  const preview=previewR2Hand({... (input.score.touyeWager?{touyeWager:input.score.touyeWager}:{}),... (input.score.laohuanTrick?{laohuanTrick:input.score.laohuanTrick}:{}),... (input.score.xiemuBurn?{xiemuBurn:input.score.xiemuBurn}:{}),... (input.score.azaoCharge?{azaoCharge:input.score.azaoCharge}:{}),rulesVersion:'r2',runId:'ai-public',rootId:'ai-public/selection',hand:input.hand,selectedIds:ids,disabledIds:input.disabledIds,jokers:input.jokers,definitions:input.definitions,handRules:input.handRules,handLevels:input.score.handLevels,characterId:input.score.characterId,amoScoreTiming:input.score.amoScoreTiming,playIndex:input.resources.playIndex+1,handsBeforePlay:input.resources.handsLeft,previousHandType:input.score.previousHandType,wager:input.score.wager,jokerSlots:input.score.jokerSlots,previousHandScore:input.score.previousHandScore,gold:input.resources.gold,discardsUsed:input.resources.discardsUsed,stageHeatBefore:input.resources.stageHeat,stageTargetHeat:input.resources.target,boss:input.boss,sealedJokerIds:input.sealedJokerIds,challengeDisabledJokerId:input.challengeDisabledJokerId,ordinaryPointsSuppressedIds});
  const row={facts,lower:BigInt(preview.scoreRange.minimum)},prior=best.get(facts.type);if(!prior||compare(row,prior)<0)best.set(facts.type,row);examined++;return true;
 },result():AiHandResult {const rows=[...best.values()].sort((a,b)=>Number(a.facts.type==='high-card')-Number(b.facts.type==='high-card')||compare(a,b));return{key,status:'ready',examined,ordered:rows.map(r=>r.facts)};}};
}
/** Comparison scores and traces are transient; only ranked visible selection facts leave the collector. */
export function rankAiHandCandidates(input:AiHandInput):AiHandResult {
 const key=aiHandKey(input);try{const c=collector(publicSnapshot(input),key);while(c.next()){}return c.result();}catch(e){return{key,status:'unsupported',ordered:[],examined:0,reason:String(e)};}
}
export class AiHandCandidateCache {
 private generation=0;private timer?:ReturnType<typeof setTimeout>;private current?:AiHandResult;
 get result():AiHandResult|undefined{return this.current;}
 update(input:AiHandInput,ready:(result:AiHandResult)=>void):AiHandResult {
  const key=aiHandKey(input);if(this.current?.key===key)return this.current;this.dispose();const generation=this.generation;this.current={key,status:'working',ordered:[],examined:0};let c:ReturnType<typeof collector>;
  try{c=collector(publicSnapshot(input),key);}catch(e){return this.current={key,status:'unsupported',ordered:[],examined:0,reason:String(e)};}
  const tick=()=>{this.timer=undefined;if(generation!==this.generation)return;const start=performance.now();try{for(let i=0;i<8&&performance.now()-start<4;i++){if(!c.next()){this.current=c.result();ready(this.current);return;}}}catch(e){this.current={key,status:'unsupported',ordered:[],examined:0,reason:String(e)};ready(this.current);return;}this.timer=setTimeout(tick,0);};this.timer=setTimeout(tick,0);return this.current;
 }
 dispose():void {this.generation++;if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;this.current=undefined;}
}
