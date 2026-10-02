import {describe,expect,it,vi} from 'vitest';
import type {R2ChallengeId,R2ModeSelection} from '../src/content/r2Modes';
import {SeededRng} from '../src/core/SeededRng';
import {createRun,type Action,type Command,type DomainEvent,type R2RunState} from '../src/domain/run';
import {r2DiscardBudget,r2HandLimit,r2HandsBudget,r2InterestCap,r2JokerCapacity} from '../src/domain/r2Resources';
import {r2PaidRerollPrice,r2ToolAcquisitionPool,rerollPrice} from '../src/domain/r2Shop';
import {r2CardSpecialsAllowed,r2ToolAllowed,r2ToolSupported} from '../src/domain/r2ToolRuntime';
import {applyR2Tool} from '../src/domain/r2ToolCommands';
import {applyR2SpectralTool} from '../src/domain/r2SpectralTools';

type ModeRun=R2RunState&R2ModeSelection;
type Use=Extract<Action,{type:'UseConsumable'}>;
const standard=(difficulty:R2ModeSelection['difficulty']=0):R2ModeSelection=>({mode:'standard',difficulty,challengeId:null,programsEnabled:true});
const challenge=(challengeId:R2ChallengeId):R2ModeSelection=>({mode:'challenge',difficulty:0,challengeId,programsEnabled:true});
function fixture(selection:R2ModeSelection=standard(),tool?:string):ModeRun {
  // Explicit owned-inventory fixture. These unit contracts do not claim a natural challenge entry.
  const state=Object.assign(createRun({rulesVersion:'r2',characterId:'erxiang',seed:'c04-mode-resources',runId:'c04-mode-resources'}),selection);
  state.gold=20;state.consumables=tool?[{instanceId:'fixture/tool',definitionId:tool}]:[];
  return state;
}
const use=(patch:Partial<Use>={}):Use=>({type:'UseConsumable',instanceId:'fixture/tool',targetIds:[],...patch});
const command=(state:ModeRun,action:Use):Command=>({runId:state.runId,commandId:'c04-mode-resource/use',expectedSeq:state.commandSeq,action});
function rejected(state:ModeRun,action:Use,code:string,apply=applyR2Tool):void {
  const before=structuredClone(state),events:DomainEvent[]=[],next=vi.spyOn(SeededRng.prototype,'next');
  try{
    expect(apply(state,command(state,action),events)).toBe(code);
    expect(state).toEqual(before);expect(events).toEqual([]);expect(next).not.toHaveBeenCalled();
  }finally{next.mockRestore();}
}
const equip=(state:ModeRun,ids:readonly string[]):void=>{
  state.jokers=ids.map((definitionId,index)=>({definitionId,instanceId:`fixture/joker/${index}`,paidPrice:4,growth:{}}));
};
const budgets=(state:ModeRun)=>({hand:r2HandLimit(state),hands:r2HandsBudget(state),discards:r2DiscardBudget(state),interest:r2InterestCap(state),jokers:r2JokerCapacity(state)});

describe('C04.2 D31 mode resources and finite acquisition/use guards',()=>{
  it.each([
    [0,{hand:8,hands:4,discards:3,interest:5,jokers:5},[2,3,10,10]],
    [1,{hand:8,hands:4,discards:3,interest:5,jokers:5},[2,3,10,10]],
    [2,{hand:8,hands:4,discards:2,interest:5,jokers:5},[2,3,10,10]],
    [3,{hand:8,hands:4,discards:2,interest:5,jokers:5},[3,4,11,11]],
  ] as const)('uses independent final resource and refresh goldens for D%i',(difficulty,expected,prices)=>{
    const state=fixture(standard(difficulty));expect(budgets(state)).toEqual(expected);
    for(const [index,count] of [0,1,8,50].entries()){
      state.shop!.rerollCount=count;expect(r2PaidRerollPrice(state)).toBe(prices[index]);
    }
  });
  it.each([
    ['Q02',{hand:8,hands:4,discards:3,interest:5,jokers:3}],
    ['Q03',{hand:8,hands:4,discards:3,interest:0,jokers:5}],
    ['Q07',{hand:6,hands:4,discards:3,interest:5,jokers:5}],
    ['Q08',{hand:8,hands:4,discards:1,interest:5,jokers:5}],
  ] as const)('applies the single adopted %s base override',(id,expected)=>expect(budgets(fixture(challenge(id)))).toEqual(expected));
  it('adds later Joker and item interest caps to Q03 zero rather than removing those sources',()=>{
    const state=fixture(challenge('Q03'));state.longTermItems=['U04'];expect(r2InterestCap(state)).toBe(2);
    equip(state,['e04']);expect(r2InterestCap(state)).toBe(4);
  });
  it('combines Q07 base resources with items, static sources, permanent costs and the same Boss floor',()=>{
    const state=fixture(challenge('Q07'));state.longTermItems=['U01','U02','U03','U04'];equip(state,['d06']);
    state.stageIndex=2;state.boss={definitionId:'B10',disabledSuit:null};
    state.spectralModifiers={cleanSlateBonus:1,handPenalty:1,handsPenalty:2};
    expect(budgets(state)).toEqual({hand:6,hands:3,discards:4,interest:7,jokers:5});
    state.jokers=[];state.longTermItems=[];state.spectralModifiers.cleanSlateBonus=0;
    expect(r2HandLimit(state)).toBe(5);expect(r2HandsBudget(state)).toBe(2);
  });
  it('keeps D3 refresh discount and final minimum while the old single-argument API remains D0',()=>{
    const state=fixture(standard(3));state.longTermItems=['U06'];
    state.shop!.rerollCount=0;expect(r2PaidRerollPrice(state)).toBe(2);
    state.shop!.rerollCount=8;expect(r2PaidRerollPrice(state)).toBe(10);
    expect([0,1,8,50].map(count=>rerollPrice(count))).toEqual([2,3,10,10]);
    const d0=fixture();d0.longTermItems=['U06'];d0.shop!.rerollCount=0;expect(r2PaidRerollPrice(d0)).toBe(1);
  });
  it('removes the free refresh tool from Q06 acquisition without consuming a rule or shop draw',()=>{
    const state=fixture(challenge('Q06')),before=structuredClone(state),next=vi.spyOn(SeededRng.prototype,'next');
    try{
      expect(r2ToolAcquisitionPool(state).map(tool=>tool.id)).not.toContain('T18');
      expect(r2ToolAllowed(state,'T18')).toBe(false);expect(state).toEqual(before);expect(next).not.toHaveBeenCalled();
    }finally{next.mockRestore();}
  });
  it('rejects an already-held free refresh in Q06 before changing the shelf, count or inventory',()=>{
    rejected(fixture(challenge('Q06'),'T18'),use(),'reroll-disabled');
  });
  it('filters all seven enhancement assignments and random enhancement in Q10, retaining plain copy and editions',()=>{
    const state=fixture(challenge('Q10')),ids=r2ToolAcquisitionPool(state).map(tool=>tool.id);
    for(const id of ['T10','T11','T12','T13','T14','T15','T19','S01'])expect(ids).not.toContain(id);
    expect(ids).toContain('T07');expect(ids).toContain('S03');expect(ids).toContain('S02');
    expect(r2ToolSupported('T10')).toBe(true);expect(r2ToolAllowed(state,'T10')).toBe(false);
    expect(r2CardSpecialsAllowed(state,{id:'plain-edition',rank:2,suit:'hearts',edition:'foil'})).toBe(true);
    expect(r2CardSpecialsAllowed(state,{id:'enhanced',rank:2,suit:'hearts',enhancement:'lucky-paper'})).toBe(false);
    for(const card of state.deckInstances)card.enhancement='heat-paper';
    const enhancedPool=r2ToolAcquisitionPool(state).map(tool=>tool.id);
    expect(enhancedPool).not.toContain('T07');expect(enhancedPool).not.toContain('S03');
  });
  it('rejects all seven already-held enhancement assignments in Q10 without consuming a tool',()=>{
    for(const id of ['T10','T11','T12','T13','T14','T15','T19']){
      const state=fixture(challenge('Q10'),id);rejected(state,use({targetIds:[state.deckInstances[0].id]}),'enhancements-disabled');
    }
  });
  it('rejects Q10 random enhancement in both tool entry points before sacrifice or RNG use',()=>{
    for(const apply of [applyR2Tool,applyR2SpectralTool]){
      const state=fixture(challenge('Q10'),'S01');
      rejected(state,use({sacrificeId:state.deckInstances[0].id,targetIds:[state.deckInstances[1].id]}),'enhancements-disabled',apply);
    }
  });
  it.each(['T07','S03'])('rejects %s copying an enhanced source in Q10 without stripping it or charging its permanent cost',id=>{
    const state=fixture(challenge('Q10'),id),card=state.deckInstances[0];card.enhancement='encore-paper';card.edition='foil';
    rejected(state,use({targetIds:[card.id]}),'enhancements-disabled');
  });
  it.each(['card','joker'] as const)('allows an independent random edition on a Q10 %s with the exact one-draw cursor',targetKind=>{
    const state=fixture(challenge('Q10'),'S02');equip(state,['pengci']);
    state.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:0};const before=structuredClone(state);
    const targetId=targetKind==='card'?state.deckInstances[0].id:state.jokers[0].instanceId,events:DomainEvent[]=[];
    expect(applyR2Tool(state,command(state,use({targetKind,targetIds:[targetId]})),events)).toBeUndefined();
    expect(targetKind==='card'?state.deckInstances[0].edition:state.jokers[0].edition).toBe('foil');
    expect(state.rng.rule).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1831565813});
    for(const stream of ['shop','deck','reward'] as const)expect(state.rng[stream]).toEqual(before.rng[stream]);
    expect(state.gold).toBe(15);expect(state.consumables).toEqual([]);expect(state.destroyedIds).toEqual([]);
    expect(state.deckInstances.every(card=>card.enhancement===undefined)).toBe(true);
  });
  it('removes and atomically rejects a rare reward at three occupied Q02 slots in either tool entry point',()=>{
    for(const apply of [applyR2Tool,applyR2SpectralTool]){
      const state=fixture(challenge('Q02'),'S06');equip(state,['pengci','mantangcai','tiesuanpan']);
      expect(r2ToolAcquisitionPool(state).map(tool=>tool.id)).not.toContain('S06');
      rejected(state,use(),'joker-slots-full',apply);
    }
  });
  it('accepts one rare reward into the third Q02 slot, preserving the exact one reward draw',()=>{
    const state=fixture(challenge('Q02'),'S06');equip(state,['pengci','mantangcai']);
    state.rng.reward={algorithm:'fnv1a-mulberry32-v1',state:0};const before=structuredClone(state),events:DomainEvent[]=[];
    expect(r2ToolAcquisitionPool(state).map(tool=>tool.id)).toContain('S06');
    expect(applyR2Tool(state,command(state,use()),events)).toBeUndefined();
    expect(state.jokers).toHaveLength(3);expect(state.jokers[2]).toMatchObject({paidPrice:0,edition:'none'});
    expect(state.gold).toBe(0);expect(state.consumables).toEqual([]);
    expect(state.rng.reward).toEqual({algorithm:'fnv1a-mulberry32-v1',state:1831565813});
    for(const stream of ['shop','deck','rule'] as const)expect(state.rng[stream]).toEqual(before.rng[stream]);
  });
  it('rejects Q07 permanent hand cost when the second penalty would be swallowed by the unchanged floor',()=>{
    const state=fixture(challenge('Q07'),'S04');state.spectralModifiers.handPenalty=1;
    expect(r2HandLimit(state)).toBe(5);expect(r2ToolAcquisitionPool(state).map(tool=>tool.id)).not.toContain('S04');
    rejected(state,use({suit:'hearts'}),'resource-floor');
  });
  it('does not silently supply D0 for missing or incompatible live mode selections',()=>{
    const state=fixture();delete (state as unknown as {mode?:unknown}).mode;
    expect(()=>r2HandLimit(state)).toThrow();expect(()=>r2JokerCapacity(state)).toThrow();expect(()=>r2PaidRerollPrice(state)).toThrow();
    const incompatible=fixture({...challenge('Q02'),difficulty:3});expect(()=>r2HandLimit(incompatible)).toThrow('incompatible-mode-config');
  });
});
