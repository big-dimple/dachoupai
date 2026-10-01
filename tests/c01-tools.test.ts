import {describe,expect,it} from 'vitest';
import {applyCommand,assertRunInvariants,createRun,stateHash,type Action,type R2RunState} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {evaluateR2Hand} from '../src/domain/evaluateR2';

const start=()=>createRun({seed:'c01-tools',characterId:'amo',runId:'c01-tools',rulesVersion:'r2'});
const command=(state:R2RunState,action:Action)=>({runId:state.runId,commandId:`c01/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const send=(state:R2RunState,action:Action)=>{
  const result=applyCommand(state,command(state,action));
  if(!result.ok)throw Error(result.code);
  assertRunInvariants(result.state);return result.state;
};
const owned=(definitionId:string,state=start())=>{state.consumables=[{instanceId:'owned-tool',definitionId}];return state;};
const action=(targetIds:readonly string[]=[],handType?:'high-card'):Action=>({type:'UseConsumable',instanceId:'owned-tool',targetIds,...(handType?{handType}:{})});
const table=(definitionId:string)=>send(send(owned(definitionId),{type:'LeaveShop'}),{type:'EnterStage'});
const rejected=(state:R2RunState,a:Action)=>{
  const hash=stateHash(state),rng=JSON.stringify(state.rng),result=applyCommand(state,command(state,a));
  expect(result.ok).toBe(false);expect(result.state).toBe(state);expect(stateHash(state)).toBe(hash);expect(JSON.stringify(state.rng)).toBe(rng);
};
const setDeck=(state:R2RunState,count:number)=>{state.deckInstances=state.deckInstances.slice(0,count);state.drawPile=state.deckInstances.map(c=>c.id);return state;};
const bossTable=(definitionId:string,boss:'B03'|'B04',accept:(state:R2RunState)=>boolean)=>{
  for(let fixture=0;fixture<256;fixture++){
    let state=owned(definitionId,createRun({seed:`c01-boss-${boss}-${fixture}`,characterId:'erxiang',runId:'c01-boss',rulesVersion:'r2'}));
    if(state.boss.definitionId!==boss)continue;
    for(const a of [{type:'SkipStage'},{type:'OpenShop'},{type:'SkipStage'},{type:'OpenShop'},{type:'LeaveShop'},{type:'EnterStage'}] as const)state=send(state,a);
    if(accept(state))return state;
  }
  throw Error('missing natural boss tool fixture');
};

describe('C01 persistent tools use real commands and preserve source boundaries',()=>{
  it('T02 removes known persistent instances without replacing the standard deck next stage',()=>{
    const state=owned('T02'),ids=state.deckInstances.slice(0,2).map(c=>c.id),rng=JSON.stringify(state.rng);
    let next=send(state,action(ids));
    expect(next.destroyedIds).toEqual(ids);expect(next.drawPile.some(id=>ids.includes(id))).toBe(false);
    expect(next.deckInstances.length-next.destroyedIds.length).toBe(50);expect(next.consumables).toEqual([]);expect(JSON.stringify(next.rng)).toBe(rng);
    next=send(send(next,{type:'LeaveShop'}),{type:'EnterStage'});
    expect([...next.drawPile,...next.handOrder]).toHaveLength(50);expect(next.handOrder.some(id=>ids.includes(id))).toBe(false);
    const restored=readCheckpoint(makeCheckpoint(next,[]));expect(restored.ok&&restored.checkpoint.state).toEqual(next);
  });
  it('T02 respects the manual twenty-card floor and U08 changes it to sixteen',()=>{
    const state=setDeck(owned('T02'),20);rejected(state,action([state.deckInstances[0].id]));
    const smaller=setDeck(owned('T02'),18);smaller.longTermItems=['U08'];
    const ids=smaller.deckInstances.slice(0,2).map(c=>c.id),next=send(smaller,action(ids));
    expect(next.deckInstances.length-next.destroyedIds.length).toBe(16);
    const bottom=owned('T02',next);rejected(bottom,action([bottom.deckInstances.find(c=>!bottom.destroyedIds.includes(c.id))!.id]));
  });
  it('deleting two hand cards does not secretly refill, spend a play or rewrite an existing trace',()=>{
    let state=table('T02');state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    const trace=JSON.stringify(state.lastTrace),draw=[...state.drawPile],hands=state.stage!.handsLeft,ids=state.handOrder.slice(0,2),before=state.handOrder.length;
    const next=send(state,action(ids));
    expect(next.handOrder).toHaveLength(before-2);expect(next.drawPile).toEqual(draw);expect(next.stage!.handsLeft).toBe(hands);expect(JSON.stringify(next.lastTrace)).toBe(trace);
  });
  it('T07 creates a distinct ordinary copy at the bottom, preserving the next draw and the source',()=>{
    const state=table('T07'),source=state.deckInstances.find(c=>c.id===state.handOrder[0])!,top=state.drawPile.at(-1),ids=new Set(state.deckInstances.map(c=>c.id));
    const next=send(state,action([source.id])),copies=next.deckInstances.filter(c=>!ids.has(c.id));
    expect(copies).toHaveLength(1);expect(copies[0].id).not.toBe(source.id);expect(copies[0].rank).toBe(source.rank);expect(copies[0].suit).toBe(source.suit);
    expect(next.handOrder).toEqual(state.handOrder);expect(next.drawPile.at(-1)).toBe(top);expect(next.drawPile[0]).toBe(copies[0].id);
    expect(next.destroyedIds).toEqual([]);expect(JSON.stringify(next.rng)).toBe(JSON.stringify(state.rng));
  });
  it('T07 rejects a copy beyond eighty living instances without consuming the item or a random draw',()=>{
    const state=owned('T07');for(let i=0;i<28;i++)state.deckInstances.push({...state.deckInstances[0],id:`existing-copy/${i}`});state.drawPile=state.deckInstances.map(c=>c.id);
    rejected(state,action([state.deckInstances[0].id]));
  });
  it.each([['T08','spades-13',14],['T09','spades-14',13]] as const)('%s crosses K/A once and preserves identity/order',(id,target,rank)=>{
    const state=owned(id),draw=[...state.drawPile],next=send(state,action([target]));
    expect(next.deckInstances.find(c=>c.id===target)?.rank).toBe(rank);expect(next.drawPile).toEqual(draw);expect(next.consumables).toEqual([]);
    expect(JSON.stringify(next.rng)).toBe(JSON.stringify(state.rng));
  });
  it.each([['T08','spades-14'],['T09','spades-2']] as const)('%s rejects its no-change rank edge',(id,target)=>rejected(owned(id),action([target])));
  it.each(['T02','T07','T08','T09'])('%s rejects duplicate IDs, unknown and hidden in-stage targets',(id)=>{
    const state=table(id),target=state.handOrder[0];
    for(const ids of [[target,target],['not-a-card'],[state.drawPile.at(-1)!]])rejected(state,action(ids));
  });
  it('dedicated P01 upgrades its discovered high-card only; T01 retains its old generic meaning',()=>{
    const next=send(owned('P01'),action());expect(next.handLevels['high-card']).toBe(4);
    const generic=send(owned('T01'),action([],'high-card'));expect(generic.handLevels).toEqual(next.handLevels);
    const capped=owned('P01');capped.handLevels['high-card']=30;rejected(capped,action());
    rejected(owned('P12'),action());
  });
  it('a dedicated planet refuses a conflicting handType instead of silently upgrading another type',()=>rejected(owned('P01'),action([],'pair' as 'high-card')));
  it('a stale tool command and an exact duplicate never consume again or repeat a permanent change',()=>{
    const state=owned('T08'),cmd=command(state,action(['spades-13'])),result=applyCommand(state,cmd);expect(result.ok).toBe(true);if(!result.ok)return;
    const duplicate=applyCommand(result.state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);expect(duplicate.state).toBe(result.state);
    const later=owned('T09',result.state),before=stateHash(later),stale=applyCommand(later,{...command(later,action(['spades-14'])),expectedSeq:state.commandSeq});
    expect(stale.ok).toBe(false);expect(stateHash(later)).toBe(before);
  });
  it('clamps only an unchanged rank edge when another selected instance can still change',()=>{
    const before=owned('T08'),rng=JSON.stringify(before.rng),next=send(before,action(['spades-14','hearts-13']));
    expect(next.deckInstances.find(card=>card.id==='spades-14')?.rank).toBe(14);
    expect(next.deckInstances.find(card=>card.id==='hearts-13')?.rank).toBe(14);
    expect(next.drawPile).toEqual(before.drawPile);expect(JSON.stringify(next.rng)).toBe(rng);
  });
  it('rejects an already destroyed persistent target and excludes destroyed instances from the copy cap',()=>{
    const deleted=send(owned('T02'),action(['clubs-2']));rejected(owned('T08',deleted),action(['clubs-2']));
    const state=owned('T07');for(let i=0;i<29;i++)state.deckInstances.push({...state.deckInstances[0],id:`existing-copy/${i}`});
    state.destroyedIds=['clubs-2','hearts-2'];state.drawPile=state.deckInstances.map(card=>card.id).filter(id=>!state.destroyedIds.includes(id));
    const next=send(state,action(['spades-2']));expect(next.deckInstances.length-next.destroyedIds.length).toBe(80);
    expect(next.destroyedIds).toEqual(state.destroyedIds);expect(JSON.stringify(next.rng)).toBe(JSON.stringify(state.rng));
  });
  it('rejects deleting the last known hand even with living cards in played and discarded zones',()=>{
    let state=setDeck(owned('T02',createRun({seed:'c01-softlock',characterId:'erxiang',runId:'c01-softlock',rulesVersion:'r2'})),23);
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    for(let discard=0;discard<3;discard++)state=send(state,{type:'DiscardHand',selectedIds:state.handOrder.slice(0,5)});
    const weakHand=Array.from({length:1<<state.handOrder.length},(_,mask)=>state.handOrder.filter((_,index)=>!!(mask&(1<<index))))
      .find(ids=>ids.length===5&&evaluateR2Hand(ids.map(id=>state.deckInstances.find(card=>card.id===id)!),{}).type==='high-card');
    if(!weakHand)throw Error('softlock fixture requires a real low-scoring five-card play');
    state=send(state,{type:'PlayHand',selectedIds:weakHand});state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.phase).toBe('await-input');expect(state.handOrder).toHaveLength(2);expect(state.drawPile).toEqual([]);
    rejected(state,action(state.handOrder));
    const next=send(state,action([state.handOrder[0]]));expect(next.handOrder).toHaveLength(1);expect(next.drawPile).toEqual([]);
  });
  it('emits the confirmed tool instance and exact permanent lifecycle IDs, without replaying the source',()=>{
    const before=owned('T07'),cmd=command(before,action(['spades-2'])),result=applyCommand(before,cmd);expect(result.ok).toBe(true);if(!result.ok)return;
    const created=result.state.deckInstances.filter(card=>!before.deckInstances.some(source=>source.id===card.id)).map(card=>card.id);
    expect(result.events).toContainEqual({type:'consumable-used',definitionId:'T07',instanceId:'owned-tool',targetIds:['spades-2'],createdCardIds:created,destroyedCardIds:[]});
    const duplicate=applyCommand(result.state,cmd);expect(duplicate.ok&&duplicate.events).toEqual([]);
    const state=owned('T02',result.state),id=created[0],deleted=applyCommand(state,command(state,action([id])));expect(deleted.ok).toBe(true);
    if(deleted.ok)expect(deleted.events).toContainEqual({type:'consumable-used',definitionId:'T02',instanceId:'owned-tool',targetIds:[id],createdCardIds:[],destroyedCardIds:[id]});
  });
  it('refreshes a natural face-card Boss restriction when a known K changes to A and back',()=>{
    const state=bossTable('T08','B04',state=>state.handOrder.some(id=>state.deckInstances.find(card=>card.id===id)!.rank===13));
    const king=state.handOrder.find(id=>state.deckInstances.find(card=>card.id===id)!.rank===13)!;
    expect(state.stage!.disabledIds).toContain(king);
    const raised=send(state,action([king]));expect(raised.stage!.disabledIds).not.toContain(king);
    const lowered=send(owned('T09',raised),action([king]));expect(lowered.stage!.disabledIds).toContain(king);
    expect(lowered.handOrder).toEqual(state.handOrder);expect(JSON.stringify(lowered.rng)).toBe(JSON.stringify(state.rng));
  });
  it('refreshes a natural suit Boss restriction when dyeing into and out of the forbidden suit',()=>{
    const state=bossTable('T03','B03',state=>state.boss.disabledSuit==='hearts'&&state.handOrder.some(id=>state.deckInstances.find(card=>card.id===id)!.suit!=='hearts'));
    const id=state.handOrder.find(id=>state.deckInstances.find(card=>card.id===id)!.suit!=='hearts')!;
    expect(state.stage!.disabledIds).not.toContain(id);
    const dyed=send(state,action([id]));expect(dyed.stage!.disabledIds).toContain(id);
    const changed=send(owned('T05',dyed),action([id]));expect(changed.stage!.disabledIds).not.toContain(id);
    expect(changed.handOrder).toEqual(state.handOrder);expect(JSON.stringify(changed.rng)).toBe(JSON.stringify(state.rng));
  });
  it('accepts an explicit matching planet confirmation after a real play without changing its settled trace',()=>{
    let state=table('P01');state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    const trace=JSON.stringify(state.lastTrace),rng=JSON.stringify(state.rng),next=send(state,action([],'high-card'));
    expect(next.handLevels['high-card']).toBe(4);expect(next.consumables).toEqual([]);
    expect(JSON.stringify(next.lastTrace)).toBe(trace);expect(JSON.stringify(next.rng)).toBe(rng);
  });
});
