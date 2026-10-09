import original from '../../docs/production/evidence/basic-tool-choice-2026-10-09/window.json';
import {makeCheckpoint,readCheckpoint} from '../../src/application/checkpoint';
import {applyCommand,type R2RunState,type Action} from '../../src/domain/run';
export function missingSend(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;}
/** Original bounded stage3 shop, then disclosed public rank/suit/cash/inventory controls. No seed search. */
export function missingCoreFixture(kind:'group'|'straight'|'flush'|'hold'|'generic'){
 const read=readCheckpoint(original);if(!read.ok)throw Error(read.code);const s=structuredClone(read.checkpoint.state) as R2RunState;s.gold=kind==='hold'?1:5;
 if(kind==='group'){
  for(const c of s.deckInstances.filter(c=>c.rank===7&&c.id!=='clubs-7'))c.rank=9;
  for(const c of s.deckInstances.filter(c=>c.rank===8&&!['clubs-8','diamonds-8'].includes(c.id)))c.rank=10;
 }else if(kind==='straight'){
  for(const c of s.deckInstances.filter(c=>c.rank===7))c.rank=10;
 }else if(kind==='flush'){
  const hearts=s.deckInstances.filter(c=>c.suit==='hearts');for(const c of hearts.slice(4))c.suit='spades';
  s.consumables.push({instanceId:'controlled/missing-core/T03',definitionId:'T03'});
 }
 const cp=makeCheckpoint(s,[]),valid=readCheckpoint(cp);if(!valid.ok)throw Error(valid.code);return s;
}
