import {expect,it} from 'vitest';
import {R2_JOKERS,r2GrowthCaps,type R2JokerInstance} from '../src/content/r2Schema';
import {R2_ASSIST_JOKERS} from '../src/content/r2AssistJokers';
import {R2_PUBLISHED_CONTENT} from '../src/domain/r2PublishedContent';
import {scoreR2Hand,type ScoreInput} from '../src/domain/scoreR2';
import {r2CreateJoker} from '../src/domain/r2Run';
import {createRun,applyCommand,type Action} from '../src/domain/run';
import {jokerMemory,jokerMemoryAbility,jokerAbilityCopyForRun,publicJokerMemoryContext,type JokerMemoryContext} from '../src/game/JokerMemory';
import {JOKER_COMPACT} from '../src/game/JokerCompact';
import {fitJokerLabel} from '../src/game/JokerLabel';
const ctx:JokerMemoryContext={inStage:true,hand:[],disabledIds:[],scoringLimited:false,gold:3,handsLeft:4,playIndex:0,discardsUsed:0,quadRefundUsed:false,previousHandType:null,stageHeat:'0',target:'1000',transaction:{gold:3,discarded:[],hasStage:true,handType:null,maxPlayedCount:0,ordinaryStraightSeen:false,ordinaryFlushSeen:false,jokerSold:false,traceType:null,heat:'0',target:'1000'},deckSize:52,jokerSlots:5,jokerCount:1};
const hand=[{id:'a',rank:7 as const,suit:'spades' as const},{id:'b',rank:7 as const,suit:'hearts' as const}];
const def=(id:string)=>R2_JOKERS.find(d=>d.id===id)!;
function record(jokers:R2JokerInstance[],extra:Partial<ScoreInput>={}){
 return scoreR2Hand({rulesVersion:'r2',runId:'copy',rootId:'copy/hand',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers,definitions:R2_JOKERS,characterId:'neutral',handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:{algorithm:'fnv1a-mulberry32-v1',state:41},...extra});
}
function actual(id:string,j=r2CreateJoker(id,id,0),extra:Partial<ScoreInput>={},limited=false){
 const trace=record([j],extra),before=JSON.stringify(trace),copy=jokerMemoryAbility(def(id),trace.jokers.find(v=>v.instanceId===j.instanceId)??j,{...ctx,scoringLimited:limited},trace.events);
 expect(JSON.stringify(trace)).toBe(before);return{trace,copy};
}
it('complete conditional compact phrases survive fitting, or expose a conditions entry',()=>{
 expect(JOKER_COMPACT.c07).toEqual(['同花/同花顺末牌再计','条件 ›']);
 expect(JOKER_COMPACT.d07).toEqual(['全计分+0.5','条件 ›']);
 expect(JOKER_COMPACT.huimaqiang).toEqual(['每3次×2','每3次×2']);
 for(const id of ['c07','d07'])expect(fitJokerLabel(JOKER_COMPACT[id],s=>s.length<=5)).toBe('条件 ›');
 expect(jokerMemoryAbility(def('c07'),undefined,ctx).condition).toContain('同花、同花顺');
 expect(jokerMemoryAbility(def('c07'),undefined,ctx).value).toContain('同花葫芦、同花五条不算');
});
it.each(['e11','f12','d09','b03'])('%s neutral growth read records no score gain, separately explains new afterHand growth',id=>{
 const {trace,copy}=actual(id);expect(copy.bodyActive).toBe(true);
 expect(copy.state).toContain(id==='e11'||id==='f12'?'本次按×1结算':'本次按+0结算');
 expect(copy.state).not.toMatch(/已有实际效果|已有计分增益/);
 const growth=trace.events.find(e=>e.sourceDefinitionId===id&&e.operation==='add-growth');
 if(id==='b03'){expect(growth?.phase).toBe('afterHand');expect(copy.state).toContain('出牌结算后成长 +0.25，新增从下一次出牌生效');}
});
it('positive current score growth and capped zero growth are distinct',()=>{
 const j=r2CreateJoker('b03','b03',0);j.growth.multiplier={n:'1',d:'1'};
 expect(actual('b03',j).copy.state).toContain('本手本体已有计分增益');
 j.growth.multiplier=r2GrowthCaps(def('b03')).multiplier;const {trace,copy}=actual('b03',j);
 expect(trace.events.find(e=>e.sourceDefinitionId==='b03'&&e.operation==='add-growth')?.value.n).toBe('0');
 expect(copy.state).toContain('出牌结算后成长 +0，本次未增加');
 expect(copy.state).not.toContain('新增从下一次');
});
it('edition alone is never attributed to the body; sealing and probability miss remain factual',()=>{
 const j={...r2CreateJoker('a06','a06',0),edition:'foil' as const};
 const only=actual('a06',j);expect(only.copy.editionActive).toBe(true);expect(only.copy.bodyActive).toBe(false);expect(only.copy.state).toContain('没有本体计分加成记录');expect(only.copy.state).toContain('版次效果单独结算');
 const sealed=actual('a06',j,{challengeDisabledJokerId:j.instanceId},true);expect(sealed.copy.bodyActive).toBe(false);expect(sealed.copy.editionActive).toBe(false);expect(sealed.copy.state).toContain('当前计分加成暂停');
 let miss;for(let state=1;state<100;state++){const result=actual('f08',undefined,{rng:{algorithm:'fnv1a-mulberry32-v1',state}});if(result.copy.state?.includes('没抽中')){miss=result;break;}}
 expect(miss?.copy.bodyActive).toBe(false);expect(miss?.copy.state).not.toContain('计分增益');
});
it('a retrigger request capped at zero and a lifetime destruction still retain recorded activity',()=>{
 const jokers=Array.from({length:5},(_,i)=>r2CreateJoker('a11','repeat/'+i,0)),trace=record(jokers,{selectedIds:[hand[0].id]});
 const capped=trace.events.filter(e=>e.sourceInstanceId===jokers[4].instanceId);expect(capped.find(e=>e.operation==='retrigger-card')?.value.n).toBe('0');
 const copy=jokerMemoryAbility(def('a11'),jokers[4],ctx,trace.events);expect(copy.bodyActive).toBe(true);expect(copy.state).toContain('本牌本次未增加次数');expect(copy.state).not.toContain('已有计分增益');
 const life=r2CreateJoker('f06','life',0);life.counters={handsScored:3};const destroyed=actual('f06',life,{challengeDisabledJokerId:life.definitionId},true);
 expect(destroyed.trace.events.some(e=>e.operation==='destroy-joker')).toBe(true);expect(destroyed.copy.bodyActive).toBe(true);expect(destroyed.copy.state).toContain('本手有本体结算记录');
});
it('real clear transactions distinguish coefficient growth for next play from current x1 and keep economy events',()=>{
 let state=createRun({runId:'clear-copy',seed:'clear-copy',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:3,challengeId:null,programsEnabled:false}});
 state.jokers=['e11','f12','e07'].map(id=>r2CreateJoker(id,id,0));
 const send=(action:Action)=>{const r=applyCommand(state,{runId:state.runId,commandId:'copy/'+state.commandSeq,expectedSeq:state.commandSeq,action});expect(r.ok).toBe(true);if(r.ok)state=r.state;};
 send({type:'LeaveShop'});send({type:'EnterStage'});
 while(state.stage!.handsLeft>1){send({type:'PlayHand',selectedIds:state.handOrder.slice(0,2)});expect(state.phase).toBe('await-input');}
 state.handLevels={'high-card':30};send({type:'PlayHand',selectedIds:[state.handOrder[0]]});expect(state.phase).toBe('stage-cleared');
 const context=publicJokerMemoryContext(state,{hand:[],scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:3});
 for(const id of ['e11','f12']){const j=state.jokers.find(j=>j.definitionId===id)!,copy=jokerMemoryAbility(def(id),j,context,state.lastTrace!.events);expect(copy.state).toContain('本次按×1结算');expect(copy.state).toContain('过关后成长 +');expect(copy.state).toContain('新增从下一次出牌生效');expect(copy.state).not.toContain('已有计分增益');}
 const economy=jokerMemoryAbility(def('e07'),state.jokers[2],context,state.lastTrace!.events);expect(economy.bodyActive).toBe(true);expect(economy.state).toContain('本手有本体结算记录');
});
it('all72 render for all three exact profiles, with adapted thresholds only in 843f',()=>{
 const prototype=createRun({runId:'assist-copy',seed:'assist-copy',characterId:'amo',rulesVersion:'r2',r2Profile:'amo-assist-v1'});
 expect(prototype.contentHash).toBe('json-fnv-v1:843f02356211cb91');
 for(const identity of [{contentVersion:R2_PUBLISHED_CONTENT.v10.version,contentHash:R2_PUBLISHED_CONTENT.v10.hash},{contentVersion:R2_PUBLISHED_CONTENT.v11.version,contentHash:R2_PUBLISHED_CONTENT.v11.hash},prototype]){
  for(const d of R2_JOKERS){const copy=jokerAbilityCopyForRun(identity,d.id,r2CreateJoker(d.id,d.id,0),ctx);expect(JSON.stringify(copy)).not.toMatch(/\{\w+\}|见完整规则/);expect(copy.condition).not.toContain('整手倍率');}
  for(const id of ['a03','a05','a06']){const copy=jokerAbilityCopyForRun(identity,id,undefined,ctx);if(identity===prototype){expect(copy.condition).toContain('两对及以上牌型');expect(copy.rules).toContain('两对、三条、顺子、同花、葫芦、四条、同花顺、五条、同花葫芦、同花五条');const d=R2_ASSIST_JOKERS.find(d=>d.id===id)!;expect(fitJokerLabel(jokerMemory(d,r2CreateJoker(id,id,0),ctx).labelCandidates,s=>s.length<=5)).toBe('条件 ›');}else{expect(copy.condition).toContain(id==='a06'?'打出高牌':id==='a03'?'只打出 1 张':'只出 1 张');expect(copy.condition).not.toContain('两对及以上');}}
 }
});
