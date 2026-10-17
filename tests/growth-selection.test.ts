import {expect,it} from 'vitest';
import {growthSelectionPlan} from '../harness/fixtures/growth-selection';
import {r2CreateJoker} from '../src/domain/r2Run';
import {applyCommand} from '../src/domain/run';
import {r2JokerDefinitionsFor,r2JokerDefinitionFor} from '../src/domain/r2ContentProfiles';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2GrowthCaps} from '../src/content/r2Schema';
import {publicJokerMemoryContext} from '../src/game/JokerMemory';
import {selectionExperience} from '../src/game/JokerExperience';
import {isGrowthWrite} from '../src/game/GrowthOpportunity';
import {starterSelection} from '../src/game/RouteStarter';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
const ids=['a05','b03','c04','c06','d03','e05','a06','c05','e06','f05','b10','d09','e11','e12','f11','f12'];
function fixture(id='c06'){
 const p=growthSelectionPlan(),s=p.state;
 if(id!=='c06'){s.jokers=[r2CreateJoker(id,'controlled/'+id,4,'none',s)];const j=s.jokers[0];for(const key of Object.keys(r2GrowthCaps(r2JokerDefinitionFor(s,id))))j.growth[key]={n:key==='coefficient'?'2':'1',d:'1'};s.stage!.initialJokerIds=[j.instanceId];}
 const ctx=(selectedIds=p.fullHouse,limited=false)=>{const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);return publicJokerMemoryContext(s,{hand,facts:r2SelectionFacts({hand,selectedIds,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),disabledIds:[]}),scoringLimited:limited,deckSize:52,jokerSlots:5,jokerCount:1});};
 return {...p,s,j:s.jokers[0],ctx};
}
it('audits all 16 growth definitions against real scorer reads, independent of new growth eligibility',()=>{
 const base=growthSelectionPlan().state;
 expect(r2JokerDefinitionsFor(base).filter(d=>d.hooks.some(h=>h.operations.some(isGrowthWrite))).map(d=>d.id).sort()).toEqual([...ids].sort());
 for(const id of ids){const {s,j,ctx,fullHouse}=fixture(id),before=JSON.stringify(s),copy=selectionExperience(s,j,ctx());
  expect(copy.readiness,id).toBe('ready');expect(copy.label,id).toMatch(/^本手/);expect(copy.body,id).toContain('本手加成：');expect(copy.body,id).toContain('新增成长：');
  const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:{type:'PlayHand',selectedIds:fullHouse}});expect(r.ok,id).toBe(true);if(!r.ok)continue;
  const read=r.state.lastTrace!.events.find(e=>e.sourceInstanceId===j.instanceId&&['read-growth','consume-growth','read-coefficient'].includes(e.operation));expect(read,id).toBeDefined();const op=r2JokerDefinitionFor(s,id).hooks.flatMap(h=>h.operations).find(o=>['read-growth','consume-growth','read-coefficient'].includes(o.kind))!;if('key' in op)expect(read!.value,id).toEqual(j.growth[op.key]);
  const limited=selectionExperience(s,j,ctx(fullHouse,true));expect(limited.readiness,id).toBe('limited');expect(limited.label,id).toBe('计分停用');expect(limited.body,id).toContain('不计入');
  const other=structuredClone(s);other.drawPile.reverse();for(const rng of Object.values(other.rng))rng.state=(rng.state+17)>>>0;expect(selectionExperience(other,other.jokers[0],ctx())).toEqual(copy);expect(JSON.stringify(s)).toBe(before);
 }
});
it('Amo full house reads saved +1 multiplier but adds no flush growth; flush adds only after scoring',()=>{
 const {s,j,ctx,fullHouse,flush}=fixture(),copy=selectionExperience(s,j,ctx());
 expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);expect(ctx().facts!.type).toBe('full-house');expect(copy.label).toBe('本手倍+1');expect(copy.growth!.status).toBe('unmet');expect(copy.body).toContain('任意牌型');expect(copy.body).toContain('这组不增加成长');
 expect(starterSelection(s,j.instanceId,'full-house')).toEqual({ready:false,label:'不新增成长'});
 expect(selectionExperience(s,j,ctx(flush)).growth!.status).toBe('ready');expect(selectionExperience(s,j,ctx(flush)).label).toBe('本手倍+1');
 for(const selectedIds of [fullHouse,flush]){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:{type:'PlayHand',selectedIds}});expect(r.ok).toBe(true);if(!r.ok)continue;const trace=r.state.lastTrace!;expect(trace.events.find(e=>e.sourceDefinitionId==='c06'&&e.operation==='read-growth')!.value).toEqual({n:'1',d:'1'});expect(r.state.jokers[0].growth.multiplier).toEqual({n:selectedIds===flush?'3':'1',d:selectedIds===flush?'2':'1'});}
});
it('caps, repeat memory, used growth quota and broken sale eligibility never turn off existing reads',()=>{
 for(const id of ['a05','a06','b03','b10','c06','e11']){const {s,j,ctx}=fixture(id);j.growth={...r2GrowthCaps(r2JokerDefinitionFor(s,id))};j.counters={alternationUsed:true};s.stage!.jokerSold=true;const copy=selectionExperience(s,j,ctx());expect(copy.readiness,id).toBe('ready');expect(copy.label,id).toMatch(/^本手/);expect(copy.growth!.status).not.toBe('ready');}
});
it('Dujiaxi keeps its actual two-pair-or-higher read restriction, independent of alternation',()=>{
 const {s,j,ctx,fullHouse}=fixture('a06');for(const selected of [fullHouse.slice(0,1),fullHouse.slice(0,2)]){const copy=selectionExperience(s,j,ctx(selected));expect(copy.readiness).toBe('unmet');expect(copy.label).toBe('本手无加成');expect(copy.body).toContain('不满足读取条件');}
 expect(selectionExperience(s,j,ctx()).label).toBe('本手×2');expect(selectionExperience(s,j,ctx()).growth!.status).toBe('prepare');j.counters={alternationUsed:true};expect(selectionExperience(s,j,ctx()).readiness).toBe('ready');
});
it('Huabujing separates discard growth from next actual consuming read, including suppression',()=>{
 const {s,j,ctx,flush,fullHouse}=fixture('c05');j.growth.pendingHeat={n:'40',d:'1'};const copy=selectionExperience(s,j,ctx(fullHouse));expect(copy.label).toBe('本手热+40');expect(copy.growth!.status).toBe('unmet');expect(copy.body).toContain('下一次实际读取后消耗');expect(selectionExperience(s,j,ctx(flush.slice(0,2),true)).growth!.status).toBe('ready');
 const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:{type:'PlayHand',selectedIds:fullHouse}});expect(r.ok).toBe(true);if(r.ok){expect(r.state.jokers[0].growth.pendingHeat).toEqual({n:'0',d:'1'});expect(r.state.lastTrace!.events.some(e=>e.sourceDefinitionId==='c05'&&e.operation==='consume-growth'&&e.value.n==='40')).toBe(true);}
});
it('Dataijie keeps immediate +50 separate from always-read heat, and neutral new storage stays honest',()=>{
 const {s,j,ctx,flush}=fixture('c04');const no=selectionExperience(s,j,ctx());expect(no.body).toContain('即时效果：热度+50；所选不满足');expect(no.label).toBe('本手热+1');
 const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!);hand.slice(0,5).forEach((c,i)=>Object.assign(c,{rank:i+2,suit:i%2?'clubs':'hearts'}));const straight=selectionExperience(s,j,ctx(s.handOrder.slice(0,5)));expect(straight.body).toContain('即时效果：热度+50；所选满足');expect(straight.growth!.status).toBe('ready');
 const empty=fixture();empty.j.growth.multiplier={n:'0',d:'1'};const zero=selectionExperience(empty.s,empty.j,empty.ctx());expect(zero.label).toBe('本手倍+0');expect(zero.readiness).toBe('unmet');expect(selectionExperience(empty.s,empty.j,{...empty.ctx(),facts:undefined}).label).toBe('待选·倍+0');
});

it.each([
 ['1587','800','×≈1.98','1,587/800'],
 ['36501','16000','×≈2.28','36,501/16,000'],
 ['1000000','1','×100万','1,000,000'],
])('offers short honest first-layer a06 reads for %s/%s and keeps the scorer and details exact',async(n,d,short,exact)=>{
 const {jokerMemory}=await import('../src/game/JokerMemory');
 const {s,j,ctx,fullHouse}=fixture('a06');j.growth.coefficient={n,d};const before=JSON.stringify(s);
 const selected=selectionExperience(s,j,ctx()),idle=jokerMemory(r2JokerDefinitionFor(s,'a06'),j,{...ctx(),facts:undefined});
 expect(selected.scoring!.labelCandidates).toContain(short);expect(idle.labelCandidates).toContain(short);
 expect(selected.label).toBe('本手×'+exact);expect(selected.body).toContain('本手加成：倍率×'+exact);expect(idle.saved).toContain(exact);
 expect(selectionExperience(s,j,ctx(fullHouse.slice(0,2))).scoring!.labelCandidates).toEqual(['本手无加成','不读取']);
 expect(selectionExperience(s,j,ctx(fullHouse,true)).scoring!.labelCandidates).toEqual(['计分停用','停用 ›']);
 const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:{type:'PlayHand',selectedIds:fullHouse}});
 expect(r.ok).toBe(true);if(r.ok)expect(r.state.lastTrace!.events.find(e=>e.sourceDefinitionId==='a06'&&e.operation==='read-coefficient')!.value).toEqual({n,d});
 expect(JSON.stringify(s)).toBe(before);
});
