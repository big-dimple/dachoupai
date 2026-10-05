/** Diagnostic policies: no seed, deck order, hidden cards or RNG cursor is accepted. */
import type {Action} from '../domain/run';
import type {R2HandType} from '../domain/evaluateR2';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {previewR2Hand} from '../domain/scoreR2';
import {r2ScoreContext,r2DiscardCost} from '../domain/r2Run';
import {salePrice} from '../domain/r2Shop';
import {SUITS} from '../cards/types';
import type {publicR2View} from './r2Bot';
import {r2JokerCapacity} from '../domain/r2Resources';

export const V00_STYLES=['single-held','groups','suit'] as const;
export type V00Style=typeof V00_STYLES[number];
type View=ReturnType<typeof publicR2View>;
const priorities:Record<V00Style,readonly string[]>={
  'single-held':['a05','pengci','a03','d01','tiesuanpan','d03','e03','e08','d10','f09','f03','e05','f02','e01','d05'],
  groups:['b03','mantangcai','b02','b04','huimaqiang','e03','e08','f09','f03','d10','e05','c02','jiedongfeng','f02','e01','d05'],
  suit:['c06','c04','jiedongfeng','c02','e03','e08','f09','f03','d10','e05','huimaqiang','f02','e01','d05'],
};
const preferred=(style:V00Style,type:R2HandType)=>style==='single-held'?type==='high-card':style==='groups'?['pair','two-pair','three-kind','full-house','four-kind','five-kind'].includes(type):['straight','flush','straight-flush','flush-house','flush-five'].includes(type);
const points=(rank:number)=>rank===14?11:Math.min(rank,10);
export function chooseV00Action(view:View,style:V00Style):Action|null {
  const priority=priorities[style];
  if(view.phase==='shop'){
    const rank=(id:string)=>{const i=priority.indexOf(id);return i<0?100:i;};
    // Keep positive growth. A sold source never transfers its growth to its replacement.
    const weakest=[...view.jokers].sort((a,b)=>rank(b.definitionId)-rank(a.definitionId)).find(j=>!Object.values(j.growth).some(f=>BigInt(f.n)>0n));
    const reserve=view.jokers.length===0?0:view.jokers.some(j=>j.definitionId==='e08')?20:8;
    const offer=[...view.offers].sort((a,b)=>rank(a.definitionId)-rank(b.definitionId)).find(o=>rank(o.definitionId)<100&&o.price<=view.gold&&(!view.jokers.length||view.gold-o.price>=reserve||rank(o.definitionId)<5&&view.jokers.length<3));
    if(offer&&view.jokers.length<r2JokerCapacity(view))return {type:'BuyOffer',offerId:offer.offerId};
    if(offer&&weakest&&rank(offer.definitionId)+3<rank(weakest.definitionId)&&view.gold+salePrice(weakest.paidPrice)>=offer.price)return {type:'SellJoker',instanceId:weakest.instanceId};
    if(view.rerollCost!==null&&view.rerollCount<1&&view.gold>=view.rerollCost+4+reserve&&view.jokers.length<r2JokerCapacity(view))return {type:'RerollShop'};
    // Put +multiplier sources before ×multiplier sources, preserving order within each class.
    const tier=(id:string)=>r2JokerDefinitionsFor(view).find(d=>d.id===id)!.hooks.some(h=>h.operations.some(o=>o.kind==='multiply-multiplier'))?1:0;
    const sorted=[...view.jokers].sort((a,b)=>tier(a.definitionId)-tier(b.definitionId));
    if(sorted.some((j,i)=>j.instanceId!==view.jokers[i].instanceId))return {type:'ReorderJokers',ids:sorted.map(j=>j.instanceId)};
    return {type:'LeaveShop'};
  }
  if(view.phase==='stage-ready')return {type:'EnterStage'};
  if(view.phase==='stage-cleared')return {type:'OpenShop'};
  if(view.phase!=='await-input'||!view.stage)return null;
  const stage=view.stage,remaining=BigInt(stage.targetHeat)-BigInt(stage.heat);
  const levelItem=view.consumables.find(c=>c.definitionId==='T01'),learned=Object.keys(view.handLevels).find(t=>preferred(style,t as R2HandType)&&view.handLevels[t as R2HandType]!<30);
  if(levelItem&&learned)return {type:'UseConsumable',instanceId:levelItem.instanceId,targetIds:[],handType:learned as R2HandType};
  const restore=view.consumables.find(c=>c.definitionId==='T17');if(restore&&stage.discardsLeft===0)return {type:'UseConsumable',instanceId:restore.instanceId,targetIds:[]};
  const dye=view.consumables.find(c=>['T03','T04','T05','T06'].includes(c.definitionId));
  if(dye&&style==='suit'){const suit=({T03:'hearts',T04:'diamonds',T05:'clubs',T06:'spades'} as const)[dye.definitionId as 'T03'|'T04'|'T05'|'T06'];const same=view.hand.filter(c=>c.suit===suit).length,targets=view.hand.filter(c=>c.suit!==suit).slice(0,Math.min(3,5-same));if(same>=2&&same<5&&targets.length)return {type:'UseConsumable',instanceId:dye.instanceId,targetIds:targets.map(c=>c.id)};}
  const candidates:{ids:string[];score:bigint;type:R2HandType}[]=[];
  for(let mask=1;mask<1<<view.hand.length;mask++){
    const cards=view.hand.filter((_,i)=>mask&(1<<i));if(cards.length>5)continue;const ids=cards.map(c=>c.id);
    const p=previewR2Hand({rulesVersion:'r2',runId:'visible-policy',rootId:'preview',hand:view.hand,selectedIds:ids,disabledIds:stage.disabledIds,jokers:view.jokers,definitions:r2JokerDefinitionsFor(view),handLevels:view.handLevels,playIndex:stage.playIndex+1,handsBeforePlay:stage.handsLeft,previousHandType:stage.previousHandType,wager:false,...r2ScoreContext(view,view.hand,ids)});
    candidates.push({ids,score:p.possibleScores.map(BigInt).reduce((a,b)=>a<b?a:b),type:p.handType});
  }
  candidates.sort((a,b)=>a.score===b.score?a.ids.length-b.ids.length:a.score>b.score?-1:1);let best=candidates[0];if(!best)return {type:'AbandonRun'};
  // Favor the style only when its real score is close enough; survival still takes priority.
  const family=candidates.find(c=>preferred(style,c.type)&&c.score*5n>=best.score*4n);if(family)best=family;
  if(best.score>=remaining)return {type:'PlayHand',selectedIds:best.ids};
  const cost=r2DiscardCost(view),needed=remaining/BigInt(stage.handsLeft),canDiscard=stage.discardsLeft>=cost;
  if(canDiscard&&style!=='single-held'&&!preferred(style,best.type)&&best.score<needed){
    let keep:string[];
    if(style==='groups'){
      const counts=new Map(view.hand.map(c=>[c.rank,view.hand.filter(o=>o.rank===c.rank).length]));
      keep=view.hand.filter(c=>counts.get(c.rank)!>=2).map(c=>c.id);
      if(!keep.length)keep=[...view.hand].sort((a,b)=>points(b.rank)-points(a.rank)).slice(0,2).map(c=>c.id);
    }else{
      const suit=[...SUITS].sort((a,b)=>view.hand.filter(c=>c.suit===b).length-view.hand.filter(c=>c.suit===a).length)[0];
      keep=view.hand.filter(c=>c.suit===suit).map(c=>c.id);
    }
    const discard=view.hand.filter(c=>!keep.includes(c.id)).slice(0,5).map(c=>c.id);if(discard.length)return {type:'DiscardHand',selectedIds:discard};
  }
  return {type:'PlayHand',selectedIds:best.ids};
}
