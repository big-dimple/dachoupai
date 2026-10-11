import {it,expect} from 'vitest';
import {readableMultiplierFixture} from '../harness/fixtures/readable-multiplier';
import {energySend} from '../harness/fixtures/score-energy';
import {r2JokerDefinitionFor} from '../src/domain/r2ContentProfiles';
import {publicJokerMemoryContext} from '../src/game/JokerMemory';
import {jokerMemory} from '../src/game/JokerMemory';
import {r2JokerStateText} from '../src/game/r2Help';
import {buildGrowthProgress} from '../src/game/BuildGrowthProgress';
import {growthPayoffs} from '../src/game/GrowthPayoff';
it('controlled native scoring keeps the reported fraction and floor receipt exact',()=>{
 const f=readableMultiplierFixture('group'),before=JSON.stringify(f.state),s=energySend(f.state,{type:'PlayHand',selectedIds:f.selectedIds});
 expect(s.lastTrace!.accumulator).toEqual({H:{n:'781',d:'1'},M:{n:'36639',d:'64'}});expect(s.lastTrace!.finalScore).toBe('447110');expect(JSON.stringify(f.state)).toBe(before);
});
it('the actual held-label and growth consumers read the saved coefficient; existing rules remain exact',()=>{
 const f=readableMultiplierFixture('straight'),before=JSON.stringify(f.state),j=f.state.jokers[0],d=r2JokerDefinitionFor(f.state,j.definitionId);
 const memory=jokerMemory(d,j,publicJokerMemoryContext(f.state,{hand:f.state.handOrder.map(id=>f.state.deckInstances.find(c=>c.id===id)!),scoringLimited:false,deckSize:f.state.deckInstances.length,jokerSlots:5,jokerCount:f.state.jokers.length}));
 expect(memory.short).toBe('系数×≈2.62');expect(memory.saved).toContain('839,523/320,000');
 expect(r2JokerStateText(j,d)).toContain('839,523/320,000');expect(buildGrowthProgress(f.state)[0].current).toBe('≈2.62');
 const s=energySend(f.state,{type:'PlayHand',selectedIds:f.selectedIds}),p=growthPayoffs(s)[0];expect(p.readValue).toBe('×≈2.62');expect(p.change).toBe('same');
 expect(s.jokers[0].growth.coefficient).toEqual({n:'839523',d:'320000'});expect(JSON.stringify(f.state)).toBe(before);
});
