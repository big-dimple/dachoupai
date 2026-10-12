import type {R2RunState} from './r2Run';
import {usesTouyeNewCore,validTouyeCommit,validTouyeRefill} from './r2TouyeWager';
import {r2SelectionFacts} from './r2SelectionFacts';
import {R2_ROUTE_GROWTH_JOKERS} from '../content/r2RouteGrowthJokers';
import {r2DisabledCards} from './r2Chapter';
import {R2_RESOURCE_CONTRACT} from './r2Resources';
import {stableHash} from './hash';
const same=(a:unknown,b:unknown)=>stableHash(a)===stableHash(b);
const sameIds=(a:readonly string[],b:readonly string[])=>same([...a].sort(),[...b].sort());
/** Existing receipts and C2 main sources are independent of the refill claim.
 * Pending partitions close fake new IDs even with a recomputed save checksum.
 * A settled due hand is retained once; later hands cannot masquerade as it.
 */
export function assertTouyeCoreFacts(state:R2RunState):void {
 if(!usesTouyeNewCore(state)||!state.stage)return;
 const stage=state.stage,w=stage.touyeWager!;
 const check=(ok:unknown,label:string)=>{if(!ok)throw Error('Run invariant: touye core '+label);};
 check(!!w&&Object.hasOwn(w,'corePlay')&&Object.hasOwn(w,'refillProof'),'profile shape');
 const c=w.commit;
 if(!c){check(w.corePlay===null&&w.refillProof===null,'unused play');return;}
 check(validTouyeCommit(c,true)&&validTouyeRefill(c,w.refillProof),'refill proof');const p=c.refill!,proof=w.refillProof!;
 const limit=stage.boss?.definitionId==='B11'?Math.max(R2_RESOURCE_CONTRACT.handMinimum,stage.initialHandLimit-(c.duePlayIndex-1)):stage.initialHandLimit;
 check(p.handLimit===limit,'source hand limit');
 if(w.resolution==='pending'||w.resolution==='abandoned'){
  check(w.corePlay===null,'pending play');
  check(sameIds(state.handOrder,p.handAfter)&&same(state.drawPile,proof.drawAfter)&&same(state.playedPile,proof.playedBefore)&&same(state.discardPile,[...proof.discardBefore,...c.handBefore.filter(card=>c.selectedIds.includes(card.id)).map(card=>card.id)]),'pending partitions');
  return;
 }
 const play=w.corePlay;check(!!play,'missing due play');if(!play)return;
 const source=stage.routeGrowth?.sources[c.duePlayIndex-1];
 check(!!source&&same(source.command,play.command)&&same(source.rules,c.rules),'due main source');
 check(play.command.runId===state.runId&&play.command.action.type==='PlayHand'&&play.command.expectedSeq>c.expectedSeq,'due command');
 check(state.receipts.some(r=>r.commandId===play.command.commandId&&r.seq===play.command.expectedSeq+1&&r.fingerprint===stableHash(play.command)),'due receipt');
 check(sameIds(play.hand.map(card=>card.id),p.handAfter),'due hand ids');
 if(play.command.action.type!=='PlayHand')return;
 check(same(play.hand.filter(card=>play.command.action.type==='PlayHand'&&play.command.action.selectedIds.includes(card.id)),source!.cards),'due card facts');
 const disabled=stage.boss?r2DisabledCards(stage.boss,stage.index,play.hand):[];
 check(same(play.disabledIds,disabled),'due disabled facts');
 const facts=r2SelectionFacts({hand:play.hand,selectedIds:play.command.action.selectedIds,disabledIds:play.disabledIds,handRules:c.rules,jokers:[],definitions:R2_ROUTE_GROWTH_JOKERS});
 check(facts.type===stage.routeGrowth!.handTypes[c.duePlayIndex-1],'due type');
}
