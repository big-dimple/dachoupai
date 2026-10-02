import {describe,expect,it} from 'vitest';
import {applyCommand,assertRunInvariants,createRun,type Action,type Command,type R2RunState} from '../src/domain/run';
import {r2ConsumableCapacity} from '../src/domain/r2Resources';

const command=(state:R2RunState,action:Action):Command=>({runId:state.runId,commandId:`c02-resource/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});
const send=(state:R2RunState,action:Action):R2RunState=>{
  const result=applyCommand(state,command(state,action));expect(result.ok,result.ok?'':result.code).toBe(true);
  if(!result.ok)throw Error(result.code);assertRunInvariants(result.state);return result.state;
};
function fixture(ids:readonly string[],items:readonly string[]=[],tools:readonly string[]=[]):R2RunState {
  const state=createRun({seed:'c02-resources',runId:'c02-resources',characterId:'erxiang',rulesVersion:'r2'});
  // Explicit owned-instance fixture, not a claim of natural acquisition.
  state.gold=20;state.longTermItems=[...items];
  state.jokers=ids.map(id=>{
    const growth:R2RunState['jokers'][number]['growth']=id==='e11'?{coefficient:{n:'13',d:'10'}}:{};
    return {instanceId:`owned/${id}`,definitionId:id,paidPrice:id==='e11'?8:4,growth};
  });
  state.consumables=tools.map((id,index)=>({instanceId:`tool/${index}`,definitionId:id}));return state;
}
function rejectUnchanged(state:R2RunState,action:Action,code:string):void {
  const before=structuredClone(state),result=applyCommand(state,command(state,action));
  expect(result.ok).toBe(false);if(result.ok)return;expect(result.code).toBe(code);expect(result.state).toBe(state);expect(state).toEqual(before);
}

describe('C02 E09 finite inventory capacity and removal transactions',()=>{
  it.each([
    [[],[],2],
    [[],['U07'],3],
    [['e09'],[],3],
    [['e09'],['U07'],4],
  ] as const)('owned %j / items %j has %i shared tool slots',(ids,items,capacity)=>{
    expect(r2ConsumableCapacity(fixture(ids,items))).toBe(capacity);
  });
  it('refuses an E09 sale with three retained tools before any refund, source reset or RNG use',()=>{
    const state=fixture(['e09','e11'],[],['T01','T17','T18']);
    rejectUnchanged(state,{type:'SellJoker',instanceId:'owned/e09'},'over-capacity-after-sale');
    expect(state.jokers.find(j=>j.definitionId==='e11')!.growth.coefficient).toEqual({n:'13',d:'10'});
  });
  it('after explicit inventory cleanup, E09 sale refunds two and retains all remaining items',()=>{
    let state=fixture(['e09'],[],['T01','T17','T18']);state=send(state,{type:'DestroyConsumable',instanceId:'tool/2'});
    const before=structuredClone(state);state=send(state,{type:'SellJoker',instanceId:'owned/e09'});
    expect(state.gold).toBe(22);expect(state.jokers).toEqual([]);expect(state.consumables).toEqual(before.consumables);
    expect(r2ConsumableCapacity(state)).toBe(2);expect(state.rng).toEqual(before.rng);
    expect(state.shop).toMatchObject({soldJoker:true});
  });
  it('E09 with U07 cannot shrink four retained tools to three until one is explicitly removed',()=>{
    let state=fixture(['e09'],['U07'],['T01','T17','T18','T03']);
    rejectUnchanged(state,{type:'SellJoker',instanceId:'owned/e09'},'over-capacity-after-sale');
    state=send(state,{type:'DestroyConsumable',instanceId:'tool/3'});state=send(state,{type:'SellJoker',instanceId:'owned/e09'});
    expect(r2ConsumableCapacity(state)).toBe(3);expect(state.consumables).toHaveLength(3);expect(state.gold).toBe(22);
  });
  it('selling a different Joker while E09 remains does not unnecessarily require inventory cleanup',()=>{
    const state=fixture(['e09','pengci'],[],['T01','T17','T18']),before=structuredClone(state);
    const next=send(state,{type:'SellJoker',instanceId:'owned/pengci'});
    expect(next.consumables).toEqual(before.consumables);expect(next.gold).toBe(22);expect(r2ConsumableCapacity(next)).toBe(3);
  });
  it.each([false,true])('S07 consumes its own slot before E09 sacrifice, U07=%s, and does not count as sale',(withItem)=>{
    const state=fixture(['e09','pengci','e11'],withItem?['U07']:[],withItem?['S07','T01','T17','T03']:['S07','T01','T17']),before=structuredClone(state);
    const action:Action={type:'UseConsumable',instanceId:'tool/0',targetIds:['owned/pengci'],sacrificeId:'owned/e09'};
    const result=applyCommand(state,command(state,action));expect(result.ok,result.ok?'':result.code).toBe(true);if(!result.ok)return;
    assertRunInvariants(result.state);expect(result.state.consumables).toHaveLength(withItem?3:2);
    expect(r2ConsumableCapacity(result.state)).toBe(withItem?3:2);expect(result.state.gold).toBe(before.gold);expect(result.state.rng).toEqual(before.rng);
    expect(result.state.jokers.some(j=>j.definitionId==='e09')).toBe(false);
    expect(result.state.jokers.find(j=>j.definitionId==='pengci')).toMatchObject({edition:'polychrome',paidPrice:4});
    expect(result.state.jokers.find(j=>j.definitionId==='e11')!.growth.coefficient).toEqual({n:'13',d:'10'});
    expect(result.state.shop).toMatchObject({soldJoker:false});expect(result.events.some(e=>e.type==='joker-transaction'&&e.phase==='onSellJoker')).toBe(false);
    expect(result.events).toContainEqual(expect.objectContaining({type:'consumable-used',destroyedJokerIds:['owned/e09']}));
  });
});
