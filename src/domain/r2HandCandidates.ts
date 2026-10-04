import {R2_HAND_TYPES,validateCardInstances,type R2HandType} from './evaluateR2';
import {r2SelectionFacts,type R2SelectionInput,type R2SelectionFacts} from './r2SelectionFacts';
import {r2OrdinarySuppression,type R2BossPlan} from './r2Chapter';
export interface R2CandidateInput extends Omit<R2SelectionInput,'selectedIds'> {
 boss:R2BossPlan|null;stageIndex:number;sealedJokerIds:readonly string[];challengeDisabledJokerId:string|null;
 resources:{gold:number;handsLeft:number;playIndex:number;discardsUsed:number;stageHeat:string;target:string};
 contentVersion:string;
}
export interface R2HandCandidate {type:R2HandType;playedCounts:number[];examples:R2SelectionFacts[]}
export interface R2CandidateResult {key:string;status:'working'|'ready'|'unsupported';groups:R2HandCandidate[];examined:number;reason?:string}
const versions=new WeakMap<object,string>();
function contentKey(definitions:R2SelectionInput['definitions']):string {
 let key=versions.get(definitions);if(key)return key;
 const text=JSON.stringify(definitions);let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
 key=(hash>>>0).toString(16);versions.set(definitions,key);return key;
}
/** Only current public cards/rules/resources; no deck future, RNG, command, save or score. */
export function r2CandidateKey(input:R2CandidateInput):string {
 return JSON.stringify({hand:input.hand,jokers:input.jokers,rules:input.handRules,disabled:input.disabledIds,suppressed:input.ordinaryPointsSuppressedIds,boss:input.boss,index:input.stageIndex,sealed:input.sealedJokerIds,challenge:input.challengeDisabledJokerId,resources:input.resources,version:[input.contentVersion,contentKey(input.definitions)]});
}
/** Undo can survive a reorder/resize; actual card/rule/resource revisions cannot. */
export function r2HandRevision(input:R2CandidateInput):string {
 return r2CandidateKey({...input,hand:[...input.hand].sort((a,b)=>a.id.localeCompare(b.id))});
}
function* subsets(hand:R2CandidateInput['hand']):Generator<string[]> {
 function* choose(size:number,start:number,ids:string[]):Generator<string[]> {if(!size){yield ids;return;}for(let i=start;i<=hand.length-size;i++)yield*choose(size-1,i+1,[...ids,hand[i].id]);}
 for(let size=1;size<=Math.min(5,hand.length);size++)yield*choose(size,0,[]);
}
function createCollector(input:R2CandidateInput,key:string){
 validateCardInstances(input.hand);if(!input.hand.length||input.hand.length>14)throw Error('仅支持当前1–14张可见手牌');
 const iterator=subsets(input.hand),groups=new Map<R2HandType,R2HandCandidate>();let examined=0;
 return {next(){const n=iterator.next();if(n.done)return false;const suppression=input.boss?r2OrdinarySuppression(input.boss,input.stageIndex,input.hand,n.value):[];
  const facts=r2SelectionFacts({...input,selectedIds:n.value,ordinaryPointsSuppressedIds:[...new Set([...(input.ordinaryPointsSuppressedIds??[]),...suppression])]});examined++;
  let group=groups.get(facts.type);if(!group){group={type:facts.type,playedCounts:[],examples:[]};groups.set(facts.type,group);}
  if(!group.playedCounts.includes(n.value.length))group.playedCounts.push(n.value.length);
  // Generator order is minimal count, then current seat order. Never rank by points.
  if(!group.examples.some(example=>example.playedIds.length===facts.playedIds.length))group.examples.push(facts);return true;
 },result():R2CandidateResult{return{key,status:'ready',examined,groups:R2_HAND_TYPES.flatMap(type=>{const g=groups.get(type);return g?[g]:[];})};}};
}
export function enumerateR2HandCandidates(input:R2CandidateInput):R2CandidateResult {
 const key=r2CandidateKey(input);try{const c=createCollector(input,key);while(c.next()){}return c.result();}catch(e){return{key,status:'unsupported',groups:[],examined:0,reason:String(e)};}
}
/** Bounded idle slices; these are protection budgets, not target-device timing claims. */
export class R2HandCandidateCache {
 private generation=0;private timer?:ReturnType<typeof setTimeout>;private current?:R2CandidateResult;
 get result():R2CandidateResult|undefined{return this.current;}
 update(input:R2CandidateInput,ready:(result:R2CandidateResult)=>void):R2CandidateResult {
  const key=r2CandidateKey(input);if(this.current?.key===key)return this.current;
  this.dispose();const generation=this.generation;this.current={key,status:'working',groups:[],examined:0};
  const snapshot=structuredClone(input);let collector:ReturnType<typeof createCollector>;
  try{collector=createCollector(snapshot,key);}catch(e){return this.current={key,status:'unsupported',groups:[],examined:0,reason:String(e)};}
  const tick=()=>{this.timer=undefined;if(generation!==this.generation)return;
   const start=performance.now();try{for(let i=0;i<128&&performance.now()-start<4;i++){if(!collector.next()){this.current=collector.result();ready(this.current);return;}}}
   catch(e){this.current={key,status:'unsupported',groups:[],examined:0,reason:String(e)};ready(this.current);return;}
   this.timer=setTimeout(tick,0);
  };this.timer=setTimeout(tick,0);return this.current;
 }
 dispose():void {this.generation++;if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;this.current=undefined;}
}
