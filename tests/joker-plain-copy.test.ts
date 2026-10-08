import {it,expect} from 'vitest';
import {R2_JOKERS} from '../src/content/r2Schema';
import {r2CreateJoker} from '../src/domain/r2Run';
import {jokerMemoryAbility,jokerAbilityCopyForRun,type JokerMemoryContext} from '../src/game/JokerMemory';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {R2_PUBLISHED_CONTENT} from '../src/domain/r2PublishedContent';
import {R2_GROUP_UPGRADE_VERSION,R2_GROUP_UPGRADE_HASH} from '../src/domain/r2GroupUpgrade';
import {R2_COMBO_GROWTH_VERSION,R2_COMBO_GROWTH_HASH} from '../src/domain/r2ComboGrowth';
import {R2_ASSIST_VERSION,R2_ASSIST_HASH} from '../src/domain/r2AssistIdentity';
import {scoreR2Hand} from '../src/domain/scoreR2';
const hand=[{id:'a',rank:7 as const,suit:'spades' as const},{id:'b',rank:7 as const,suit:'hearts' as const},{id:'c',rank:7 as const,suit:'clubs' as const},{id:'d',rank:2 as const,suit:'spades' as const},{id:'e',rank:4 as const,suit:'hearts' as const}];
const ctx=(patch:Partial<JokerMemoryContext>={}):JokerMemoryContext=>({inStage:true,hand,facts:r2SelectionFacts({hand,selectedIds:hand.map(c=>c.id),jokers:[],definitions:R2_JOKERS,disabledIds:[]}),disabledIds:[],scoringLimited:false,gold:3,handsLeft:4,playIndex:0,discardsUsed:0,quadRefundUsed:false,previousHandType:null,stageHeat:'0',target:'1000',transaction:{gold:3,handsAfter:4,playIndex:0,discardsUsed:0,handType:null,discarded:[],hasStage:true,maxPlayedCount:0,ordinaryStraightSeen:false,ordinaryFlushSeen:false,jokerSold:false,traceType:null,heat:'0',target:'1000'},deckSize:40,entryHandLimit:10,jokerSlots:5,jokerCount:2,...patch});
const def=(id:string)=>R2_JOKERS.find(d=>d.id===id)!;
const copy=(id:string,patch:Partial<JokerMemoryContext>={})=>jokerMemoryAbility(def(id),r2CreateJoker(id,id,0),ctx(patch)).plain!;
const identities=[R2_PUBLISHED_CONTENT.v10,R2_PUBLISHED_CONTENT.v11,{version:R2_ASSIST_VERSION,hash:R2_ASSIST_HASH},{version:R2_COMBO_GROWTH_VERSION,hash:R2_COMBO_GROWTH_HASH},{version:R2_GROUP_UPGRADE_VERSION,hash:R2_GROUP_UPGRADE_HASH}].map(i=>({contentVersion:i.version,contentHash:i.hash}));
it('all72 in each exact identity have one shared public copy and an explicit safe fallback',()=>{
 for(const identity of identities){const defs=r2JokerDefinitionsFor(identity);expect(defs).toHaveLength(72);let short=0;for(const d of defs){const j=r2CreateJoker(d.id,d.id,0,undefined,identity),c=ctx(),before=JSON.stringify({d,j,c});const full=jokerAbilityCopyForRun(identity,d.id,j,c),p=full.plain!;expect(p).toBeDefined();expect(p.line.length).toBeGreaterThan(4);expect(p.line).not.toContain('整手');expect(p.details).toContain(full.condition);expect(p.details).toContain(full.value);expect([p.line,p.essential,p.status,p.details].join('\n')).not.toMatch(/\{\w+\}|NaN|undefined/);expect(JSON.stringify({d,j,c})).toBe(before);if(!p.fallback)short++;}expect(short).toBeGreaterThan(48);}
});
it('short numeric effects bind to definitions and retain plus versus multiplication and per-card scope',()=>{
 const d=structuredClone(def('e08'));d.hooks[0].operations=[{kind:'multiply-multiplier',value:{n:'7',d:'4'}}];const p=jokerMemoryAbility(d,undefined,ctx()).plain!;expect(p.line).toContain('倍率×1.75');expect(copy('f04').line).toContain('倍率+3');expect(copy('tiesuanpan').line).toContain('每张有效牌热度+');expect(copy('b02').essential).toContain('附带牌和停用牌');
});
it('current missing gold is adjacent without claiming activation, and too much gold is not called insufficient',()=>{
 const p=copy('e08',{gold:17});expect(p.status).toContain('还差3金');expect(p.status).not.toMatch(/已触发|已获得/);const max=copy('f04',{gold:21});expect(max.status).toContain('未满足');expect(max.line).toContain('≤3金');expect(copy('a03').status).toContain('需只出1张');
});
it('selection gaps identify the actual type and count while bans take precedence',()=>{
 const p=copy('c07');expect(p.line).toContain('同花/同花顺');expect(p.status).toContain('三条、5张');expect(p.essential).toContain('同花葫芦、同花五条不算');expect(copy('c07',{scoringLimited:true}).status).toContain('计分暂停');expect(copy('d11').essential).toContain('第四张不会补上');
});
it('four-card cardinality exceptions, entry snapshot and shared lifetime remain upfront',()=>{
 for(const id of ['c08','c09']){const p=copy(id);expect(p.tile).toContain('同花顺5张');expect(p.essential).toContain('不能多带第 5 张');}
 const p=copy('d06');expect(p.line).toContain('进场');expect(p.essential).toContain('进场');const j=r2CreateJoker('f06','life',0);j.counters={...j.counters,handsScored:3};const life=jokerMemoryAbility(def('f06'),j,ctx()).plain!;expect(life.tile).toContain('总共4手');expect(life.status).toContain('还可用1手');expect(life.essential).toContain('换场不重置');
});
it('new growth is for later plays while already saved growth is the current contribution',()=>{
 const identity=identities.at(-1)!,d=r2JokerDefinitionsFor(identity).find(d=>d.id==='b10')!,j=r2CreateJoker('b10','grow',4,undefined,identity);j.growth.heat={n:'40',d:'1'};const p=jokerAbilityCopyForRun(identity,'b10',j,ctx()).plain!;expect(p.line).toContain('成长+10');expect(p.status).toContain('本次用已存热度+40');expect(p.line).toContain('新增下次用');expect(p.essential).toContain('普通顺子、普通同花不增长');expect(p.details).toContain('出售后丢失');
});
it('complex rescue, reset and reward rotation keep complete main and essential timing by default',()=>{
 const identity=identities.at(-1)!;for(const id of ['f10','a06','e11','c12','e10','f05']){const c=jokerAbilityCopyForRun(identity,id,r2CreateJoker(id,id,0,undefined,identity),ctx()),p=c.plain!;expect(p.fallback).toBe(true);expect(p.line).toBe(c.condition);expect(p.essential).toBe(c.value);}
 expect(jokerAbilityCopyForRun(identity,'f10',r2CreateJoker('f10','f10',0,undefined,identity),ctx()).plain!.essential).toContain('必消耗');expect(copy('e11').essential).toContain('卖出其他');expect(copy('e10').essential).toContain('放满');
});
it('an unsupported hook combination falls back without silently dropping part of its contract',()=>{
 const d=structuredClone(def('e08'));d.hooks.push(structuredClone(def('d05').hooks[0]));const c=jokerMemoryAbility(d,r2CreateJoker('e08','held',0),ctx());expect(c.plain!.fallback).toBe(true);expect(c.plain!.details).toContain(c.condition);expect(c.plain!.essential).toBe(c.value);
});
it('actual records distinguish zero read, growth timing, and ignore another instance or edition as body gain',()=>{
 const identity=identities.at(-1)!,defs=r2JokerDefinitionsFor(identity),j=r2CreateJoker('b10','grow',4,undefined,identity),trace=scoreR2Hand({rulesVersion:'r2',runId:'plain-actual',rootId:'plain-actual/1',hand,disabledIds:[],selectedIds:hand.map(c=>c.id),jokers:[j],definitions:defs,characterId:'neutral',handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:{algorithm:'fnv1a-mulberry32-v1',state:41}});
 const c=jokerAbilityCopyForRun(identity,'b10',j,ctx(),trace.events);expect(c.plain!.status).toContain('本次读取热度+0');expect(c.plain!.status).toContain('成长 +10');expect(c.plain!.status).toContain('后续出牌用');expect(c.plain!.status).not.toContain('所选符合');expect(jokerAbilityCopyForRun(identity,'b10',{...j,instanceId:'another'},ctx(),trace.events).plain!.status).not.toContain('成长 +10');
});
it('random and next-stage counters do not become promised earnings',()=>{
 const p=copy('f08');expect(p.line).toContain('出牌时揭晓');expect(p.status).not.toMatch(/已抽中|已获得/);const j=r2CreateJoker('a07','limited',0);j.counters={...j.counters,singleDiscards:2};const next=jokerMemoryAbility(def('a07'),j,ctx({inStage:false,facts:undefined})).plain!;expect(next.status).toContain('下场还可用2次');expect(next.essential).toContain('每场');
});
it('compact exclusions bind to the complete type set and probabilities remain explicit',()=>{
 const identity=identities.at(-1)!,c=jokerAbilityCopyForRun(identity,'a03',undefined,ctx()).plain!;
 expect(c.line).toContain('除高牌/对子外');expect(c.tile).toContain('首计分牌');expect(c.tile).toContain('热度+15');
 const d=structuredClone(r2JokerDefinitionsFor(identity).find(d=>d.id==='a03')!);const h=d.hooks[0];if(h.condition.kind!=='scoring-position')throw Error('expected scoring-position');h.condition.handTypes=['two-pair','three-kind'];
 expect(jokerMemoryAbility(d,undefined,ctx()).plain!.line).toContain('两对/三条');expect(jokerMemoryAbility(d,undefined,ctx()).plain!.line).not.toContain('除高牌');
 expect(copy('f08').tile).toContain('1/3机会');expect(copy('f08').tile).toContain('出牌揭晓');
});
it('old growth identities keep their three exact types instead of adopting the new group rule',()=>{
 for(const identity of identities.slice(0,-1)){
  const c=jokerAbilityCopyForRun(identity,'b03',undefined,ctx()).plain!;
  expect(c.line).toContain('对子/两对/三条');expect(c.line).toContain('新增下次用');expect(c.tile).toContain('特定牌型成长');expect(c.fallback).toBe(true);expect(c.line).not.toContain('对子等同点组合');
 }
});
