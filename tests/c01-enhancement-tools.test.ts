import {describe,expect,it,vi} from 'vitest';
import {applyCommand,createRun,stateHash,type Action,type Command,type R2RunState} from '../src/domain/run';
import {applyR2Tool} from '../src/domain/r2ToolCommands';
import {RunController} from '../src/application/RunController';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';

// Independent tool mappings and target caps; these expectations do not read the catalog.
const TOOLS=[
  ['T10','heat-paper',2],['T11','multiplier-paper',2],['T12','glass-paper',1],
  ['T13','voice-paper',2],['T14','gold-paper',2],['T15','encore-paper',1],['T19','lucky-paper',2],
] as const;
type Phase='shop'|'await-input';
const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`enhancement/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const send=(state:R2RunState,action:Action):R2RunState=>{
  const result=applyCommand(state,command(state,action));if(!result.ok)throw Error(result.code);return result.state;
};
function fixture(phase:Phase,definitionId:string):R2RunState {
  let state=createRun({seed:'c01-enhancement-tools',characterId:'amo',runId:`enhancement/${phase}/${definitionId}`,rulesVersion:'r2'});
  if(phase==='await-input'){
    state=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});
    state=send(state,{type:'PlayHand',selectedIds:[state.handOrder[0]]});
    expect(state.phase).toBe('await-input');expect(state.lastTrace).not.toBeNull();
  }
  // Explicit inventory fixtures after phase entry; this is not natural acquisition evidence.
  state.consumables=[{instanceId:'owned-enhancement',definitionId}];return state;
}
const known=(state:R2RunState)=>state.phase==='shop'?state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id)):state.handOrder.map(id=>state.deckInstances.find(card=>card.id===id)!);
const use=(targetIds:readonly string[]):Extract<Action,{type:'UseConsumable'}>=>({type:'UseConsumable',instanceId:'owned-enhancement',targetIds});
function rejected(state:R2RunState,action:Action,expectedSeq=state.commandSeq):void {
  const before=structuredClone(state),hash=stateHash(state),result=applyCommand(state,{...command(state,action),expectedSeq});
  expect(result.ok).toBe(false);if(result.ok)return;
  expect(result.code).not.toBe('consumable-not-enabled');
  expect(result.state).toBe(state);expect(stateHash(state)).toBe(hash);expect(state).toEqual(before);
}

describe.each(['shop','await-input'] as const)('C01 enhancement tool command goldens in %s',phase=>{
  it.each(TOOLS)('%s assigns %s to its legal maximum of %s known cards, replacing only enhancement',(definitionId,enhancement,maximum)=>{
    const state=fixture(phase,definitionId),targets=known(state).slice(0,maximum),ids=targets.map(card=>card.id);
    targets[0].enhancement=enhancement==='heat-paper'?'glass-paper':'heat-paper';targets[0].edition='holographic';
    const before=structuredClone(state),cmd=command(state,use(ids)),result=applyCommand(state,cmd);
    expect(result.ok).toBe(true);if(!result.ok)return;
    const expected=structuredClone(before);for(const card of expected.deckInstances)if(ids.includes(card.id))card.enhancement=enhancement;
    expected.consumables=[];expected.commandSeq=before.commandSeq+1;expected.receipts.push(result.receipt);
    expect(result.state).toEqual(expected);expect(state).toEqual(before);
    expect(Object.keys(result.state.rng).sort()).toEqual(['deck','reward','rule','shop']);expect(result.state.rng).toEqual(before.rng);
    expect(result.state.lastTrace).toEqual(before.lastTrace);
    expect(result.events).toEqual([{type:'consumable-used',definitionId,instanceId:'owned-enhancement',targetIds:ids,createdCardIds:[],destroyedCardIds:[]}]);
    let persisted=result.state;
    if(phase==='shop')persisted=send(send(persisted,{type:'LeaveShop'}),{type:'EnterStage'});
    for(const id of ids)expect(persisted.deckInstances.find(card=>card.id===id)?.enhancement).toBe(enhancement);
    expect(persisted.deckInstances.find(card=>card.id===ids[0])?.edition).toBe('holographic');
    const restored=readCheckpoint(JSON.parse(JSON.stringify(makeCheckpoint(persisted,[]))));
    expect(restored.ok&&restored.checkpoint.state).toEqual(persisted);
  });
  it.each(TOOLS)('%s rejects all-same %s, invalid counts, duplicate/unknown IDs and hidden targets',(definitionId,enhancement,maximum)=>{
    const same=fixture(phase,definitionId),sameTargets=known(same).slice(0,maximum);for(const card of sameTargets)card.enhancement=enhancement;
    const noop=applyCommand(same,command(same,use(sameTargets.map(card=>card.id))));expect(noop.ok).toBe(false);
    if(!noop.ok)expect(noop.code).toBe('no-effect');expect(noop.state).toBe(same);rejected(same,use(sameTargets.map(card=>card.id)));
    const state=fixture(phase,definitionId),ids=known(state).slice(0,maximum+1).map(card=>card.id);
    for(const targets of [[],ids,[ids[0],ids[0]],['missing-card']])rejected(state,use(targets));
    rejected(state,{...use([ids[0]]),handType:'high-card'});
    if(phase==='await-input'){
      rejected(state,use([state.drawPile.at(-1)!]));rejected(state,use([state.playedPile[0]]));
    }else{
      const destroyed=known(state).at(-1)!.id;state.destroyedIds.push(destroyed);state.drawPile=state.drawPile.filter(id=>id!==destroyed);
      rejected(state,use([destroyed]));
    }
  });
  it.each(TOOLS.filter(([, ,maximum])=>maximum===2))('%s accepts one unchanged %s target only when another actually changes',(definitionId,enhancement)=>{
    const state=fixture(phase,definitionId),targets=known(state).slice(0,2);targets[0].enhancement=enhancement;targets[1].edition='foil';
    const before=structuredClone(state),next=send(state,use(targets.map(card=>card.id)));
    expect(next.deckInstances.find(card=>card.id===targets[0].id)).toEqual(before.deckInstances.find(card=>card.id===targets[0].id));
    expect(next.deckInstances.find(card=>card.id===targets[1].id)).toEqual({...before.deckInstances.find(card=>card.id===targets[1].id),enhancement});
    expect(next.consumables).toEqual([]);expect(next.handOrder).toEqual(before.handOrder);expect(next.drawPile).toEqual(before.drawPile);
    expect(next.rng).toEqual(before.rng);expect(next.lastTrace).toEqual(before.lastTrace);
  });
});

describe('C01 enhancement confirmation transaction boundaries',()=>{
  it.each(TOOLS)('%s preserves %s resources on stale confirmation and an exact repeat never acts twice',(definitionId,enhancement)=>{
    let state=fixture('await-input',definitionId);const previewSeq=state.commandSeq,id=state.handOrder[0];
    state=send(state,{type:'ReorderHand',ids:[...state.handOrder].reverse()});rejected(state,use([id]),previewSeq);
    const cmd=command(state,use([id])),result=applyCommand(state,cmd);expect(result.ok).toBe(true);if(!result.ok)return;
    expect(result.state.deckInstances.find(card=>card.id===id)?.enhancement).toBe(enhancement);
    const duplicate=applyCommand(result.state,cmd);expect(duplicate.ok&&duplicate.duplicate).toBe(true);
    expect(duplicate.state).toBe(result.state);expect(duplicate.ok&&duplicate.events).toEqual([]);expect(result.state.rng).toEqual(state.rng);
  });
  it('discards a canceled caller clone without dispatching or changing the published run',()=>{
    const controller=new RunController(fixture('shop','T12')),published=controller.state,hash=stateHash(published),dispatch=vi.spyOn(controller,'dispatch');
    const candidate=structuredClone(published),id=candidate.deckInstances[0].id;
    expect(applyR2Tool(candidate,command(candidate,use([id])),[])).toBeUndefined();
    expect(candidate.deckInstances[0].enhancement).toBe('glass-paper');expect(candidate.consumables).toEqual([]);
    expect(dispatch).not.toHaveBeenCalled();expect(controller.state).toBe(published);expect(stateHash(controller.state)).toBe(hash);expect(controller.journal).toEqual([]);
    dispatch.mockRestore();
  });
  it('copies a newly enhanced permanent instance with its edition while preserving its source and the next draw',()=>{
    const state=fixture('await-input','T12'),source=known(state)[0];source.edition='polychrome';
    const enhanced=send(state,use([source.id])),top=enhanced.drawPile.at(-1),existing=new Set(enhanced.deckInstances.map(card=>card.id));
    enhanced.consumables=[{instanceId:'owned-enhancement',definitionId:'T07'}];const next=send(enhanced,use([source.id]));
    const copy=next.deckInstances.find(card=>!existing.has(card.id))!;
    expect(copy).toEqual({id:copy.id,suit:source.suit,rank:source.rank,enhancement:'glass-paper',edition:'polychrome'});
    expect(next.deckInstances.find(card=>card.id===source.id)).toEqual(enhanced.deckInstances.find(card=>card.id===source.id));
    expect(next.drawPile.at(-1)).toBe(top);expect(next.drawPile[0]).toBe(copy.id);expect(next.handOrder).toEqual(enhanced.handOrder);
    expect(next.rng).toEqual(enhanced.rng);expect(next.lastTrace).toEqual(enhanced.lastTrace);
  });
});
