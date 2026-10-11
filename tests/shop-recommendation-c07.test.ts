import {describe,it,expect} from 'vitest';
import {createRun,assertRunInvariants,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {shopRecommendation} from '../src/game/ShopRecommendation';

function publicDeck(counts:Record<number,number>,fourFlush=false):R2RunState {
 const s=createRun({seed:'c07-public',runId:'c07-public',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 const original=s.deckInstances;
 s.deckInstances=Object.entries(counts).flatMap(([rank,count])=>Array.from({length:count},(_,i)=>({...original.find(c=>c.rank===Number(rank)&&c.suit==='hearts')!,id:`public/${rank}/${i}`})));
 s.drawPile=s.deckInstances.map(c=>c.id);s.handOrder=[];s.playedPile=[];s.discardPile=[];s.destroyedIds=[];
 s.jokers=['c07',...(fourFlush?['c09']:[])].map(id=>r2CreateJoker(id,'held/'+id,8,'none',s));
 assertRunInvariants(s);return s;
}
function recommendation(s:R2RunState){return shopRecommendation(s,{offerId:'public/d09',definitionId:'d09',price:6,edition:'none',consumed:false},'group');}
function score(s:R2RunState,ranks:number[]){
 const used=new Map<number,number>();const cards=ranks.map(rank=>{const i=used.get(rank)??0;used.set(rank,i+1);return s.deckInstances.filter(c=>c.rank===rank)[i];});
 return scoreR2Hand({rulesVersion:'r2',runId:s.runId,rootId:'public-c07/'+ranks.join('-'),characterId:s.characterId,hand:cards,selectedIds:cards.map(c=>c.id),disabledIds:[],jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:s.rng.rule,gold:s.gold});
}
const sourceEvents=(t:ReturnType<typeof score>)=>t.events.filter(e=>e.sourceInstanceId==='held/c07');
describe('c07 sources require its actual ordinary flush or straight-flush family',()=>{
 it('legal20 same-suit two-rank deck has no source across all six five-card rank distributions',()=>{
  const s=publicDeck({7:10,8:10}),before=JSON.stringify(s);
  for(let sevens=0;sevens<=5;sevens++){
   const t=score(s,[...Array(sevens).fill(7),...Array(5-sevens).fill(8)]);
   expect(['flush-five','four-kind','flush-house']).toContain(t.handType);expect(sourceEvents(t)).toHaveLength(0);
  }
  expect(sourceEvents(score(s,[7,7,8,8]))).toHaveLength(0);
  expect(recommendation(s)).toMatchObject({stars:2,facts:{ordinaryFlushPossible:false,retriggerSource:false}});expect(JSON.stringify(s)).toBe(before);
 });
 it('actual ordinary flush source supports d09 even when the opening focus is group',()=>{
  const s=publicDeck({7:8,8:8,9:4}),before=JSON.stringify(s),t=score(s,[7,7,7,8,9]);
  expect(t.handType).toBe('flush');expect(sourceEvents(t).length).toBeGreaterThan(0);expect(recommendation(s)).toMatchObject({stars:4,facts:{ordinaryFlushPossible:true,retriggerSource:true}});expect(JSON.stringify(s)).toBe(before);
 });
 it('actual five-card straight-flush source remains eligible',()=>{
  const s=publicDeck({6:4,7:4,8:4,9:4,10:4}),before=JSON.stringify(s),t=score(s,[6,7,8,9,10]);
  expect(t.handType).toBe('straight-flush');expect(sourceEvents(t).length).toBeGreaterThan(0);expect(recommendation(s)).toMatchObject({stars:4,facts:{retriggerSource:true}});expect(JSON.stringify(s)).toBe(before);
 });
 it('the real c09 four-flush modifier admits a source that five-card high types alone do not',()=>{
  const s=publicDeck({7:10,8:10},true),before=JSON.stringify(s),t=score(s,[7,7,8,8]);
  expect(t.handType).toBe('flush');expect(sourceEvents(t).length).toBeGreaterThan(0);expect(recommendation(s)).toMatchObject({stars:4,facts:{ordinaryFlushPossible:true,retriggerSource:true}});expect(JSON.stringify(s)).toBe(before);
 });
});
