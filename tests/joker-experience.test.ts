import {it,expect} from 'vitest';
import {experiencePlan} from '../harness/fixtures/joker-experience';
import {stageGiftPlan,giftSend} from '../harness/fixtures/stage-gift';
import {selectionExperience,savedBenefit,savedExperienceCards,hasActualBenefit,experienceBeat} from '../src/game/JokerExperience';
import {publicJokerMemoryContext} from '../src/game/JokerMemory';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {scoreBeat} from '../src/game/scorePresentation';
import {stageGiftReceipt} from '../src/game/StageGiftReceipt';
const played=()=>{const p=experiencePlan();return giftSend(p.state,{type:'PlayHand',selectedIds:p.first});};
it('shared actual ledger distinguishes reads, saved growth and individual retrigger objects without writes',()=>{
 const s=played(),before=JSON.stringify(s),trace=s.lastTrace!,rows=trace.events.map(e=>savedBenefit(s,trace,e)).filter(Boolean);
 expect(rows.some(r=>r?.effect==='读取已有 10 热度')).toBe(true);expect(rows.some(r=>r?.effect==='读取已有 0.25 倍率')).toBe(true);
 expect(rows.some(r=>r?.destination.includes('该手后已存 20'))).toBe(true);expect(rows.filter(r=>r?.effect.includes('再计分 1 次'))).toHaveLength(2);
 expect(savedExperienceCards(s,trace).filter(r=>r.title==='再说一遍')).toHaveLength(1);expect(JSON.stringify(s)).toBe(before);
});
it('caps and zero reads produce no fake benefit, while source rules remain available',()=>{
 const p=experiencePlan(true),s=giftSend(p.state,{type:'PlayHand',selectedIds:p.first});
 expect(s.lastTrace!.events.filter(e=>e.operation==='add-growth')).toHaveLength(2);expect(s.lastTrace!.events.filter(e=>e.operation==='add-growth').every(e=>!hasActualBenefit(e))).toBe(true);
 const e={...s.lastTrace!.events.find(e=>e.operation==='read-growth')!,value:{n:'0',d:'1'}};e.after=e.before;expect(hasActualBenefit(e)).toBe(false);
});
it('selection readiness uses public shared conditions and limits, never forecasts the final score',()=>{
 const p=experiencePlan(),hand=p.state.handOrder.map(id=>p.state.deckInstances.find(c=>c.id===id)!),facts=r2SelectionFacts({hand,selectedIds:p.first,disabledIds:[],jokers:p.state.jokers,definitions:r2JokerDefinitionsFor(p.state)}),before=JSON.stringify(p.state);
 for(const joker of p.state.jokers){const ctx=publicJokerMemoryContext(p.state,{hand,facts,scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:4}),r=selectionExperience(p.state,joker,ctx);expect([r.body,r.details].join('\n')).toContain('成功出牌与保存');expect(r.body).not.toContain('预计总分');expect(selectionExperience(p.state,joker,{...ctx,scoringLimited:true}).readiness).toBe('limited');}
 expect(JSON.stringify(p.state)).toBe(before);
});
it('first transition is preparation, opposite ordinary type is eligible, special type is not a substitute',()=>{
 const p=stageGiftPlan(),joker={instanceId:'owned/c11',definitionId:'c11',paidPrice:8,growth:{}};p.state.jokers=[joker];
 const hand=p.state.deckInstances.slice(0,5);hand.forEach((c,i)=>Object.assign(c,{rank:i+2,suit:i%2?'hearts':'clubs'}));
 const ctx=publicJokerMemoryContext(p.state,{hand,facts:r2SelectionFacts({hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers:[joker],definitions:r2JokerDefinitionsFor(p.state)}),scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:1});
 expect(selectionExperience(p.state,joker,ctx).label).toBe('准备下手');expect(selectionExperience(p.state,joker,ctx).body).toContain('下一手同花');
 expect(selectionExperience(p.state,joker,{...ctx,previousHandType:'flush'}).readiness).toBe('ready');
 hand.forEach(c=>c.suit='hearts');const special={...ctx,facts:r2SelectionFacts({hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers:[joker],definitions:r2JokerDefinitionsFor(p.state)})};expect(selectionExperience(p.state,joker,special).readiness).toBe('unmet');
});
it('real gifts and overflow report acquired destination; normal and repeated source beats are bounded',()=>{
 for(const full of [false,true]){const p=stageGiftPlan(full),s=giftSend(giftSend(p.state,{type:'PlayHand',selectedIds:p.first}),{type:'PlayHand',selectedIds:p.second}),e=s.lastTrace!.events.find(e=>!!e.rewardDefinitionId)!,f=savedBenefit(s,s.lastTrace!,e)!;expect(f.effect).toContain('方片染');expect(f.destination).toContain(full?'金币余额':'工具包');expect(f.toolId).toBe(full?undefined:'T04');expect(stageGiftReceipt(s)).toBeDefined();}
 const s=played(),event=s.lastTrace!.events.find(e=>e.sourceDefinitionId==='b06')!,base=scoreBeat(event),first=experienceBeat(event,undefined,base),repeat=experienceBeat(event,event.sourceInstanceId,base),sum=(b:typeof base)=>b.windup+b.flight+b.impact+b.rest;expect(sum(first)).toBeLessThanOrEqual(520);expect(sum(repeat)).toBeLessThan(sum(first));
});

it('all gift sources preserve ordered distinct names and overflow destinations',()=>{
 const p=stageGiftPlan();p.state.jokers.push({instanceId:'owned/e10',definitionId:'e10',paidPrice:6,growth:{},counters:{stageClears:1}});p.state.stage!.initialJokerIds=p.state.jokers.map(j=>j.instanceId);
 const s=giftSend(giftSend(p.state,{type:'PlayHand',selectedIds:p.first}),{type:'PlayHand',selectedIds:p.second}),receipt=stageGiftReceipt(s)!;
 expect(receipt.title).toBe('过关赠品 · 已保存的来源');expect(receipt.body).toContain('换一身');expect(receipt.body).toContain('赠票');expect(receipt.body).toContain('每2次实际过关');expect(s.consumables).toHaveLength(2);
});
