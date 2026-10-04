import{scoreR2Hand}from'../src/domain/scoreR2';
import{expect,it}from'vitest';
import{R2_JOKERS}from'../src/content/r2Schema';
import{r2CreateJoker}from'../src/domain/r2Run';
import{r2SelectionFacts}from'../src/domain/r2SelectionFacts';
import{jokerMemoryAbility,recordedJokerMemoryContext,type JokerMemoryContext}from'../src/game/JokerMemory';
import templates from'../src/game/JokerPlayerTemplates.json';
import{readFileSync}from'node:fs';
const hand=[{id:'a',rank:7 as const,suit:'spades' as const},{id:'b',rank:7 as const,suit:'hearts' as const},{id:'c',rank:7 as const,suit:'clubs' as const},{id:'d',rank:2 as const,suit:'spades' as const},{id:'e',rank:4 as const,suit:'hearts' as const}];
const ctx=(patch:Partial<JokerMemoryContext>={}):JokerMemoryContext=>({inStage:true,hand,facts:r2SelectionFacts({hand,selectedIds:hand.map(c=>c.id),jokers:[],definitions:R2_JOKERS,disabledIds:[]}),disabledIds:[],scoringLimited:false,gold:3,handsLeft:4,playIndex:0,discardsUsed:0,quadRefundUsed:false,previousHandType:null,stageHeat:'0',target:'1000',transaction:{gold:3,handsAfter:4,playIndex:0,discardsUsed:0,handType:null,discarded:[],hasStage:true,maxPlayedCount:0,ordinaryStraightSeen:false,ordinaryFlushSeen:false,jokerSold:false,traceType:null,heat:'0',target:'1000'},deckSize:40,entryHandLimit:10,jokerSlots:5,jokerCount:2,...patch});
const def=(id:string)=>R2_JOKERS.find(d=>d.id===id)!;
const copy=(id:string,patch:Partial<JokerMemoryContext>={})=>jokerMemoryAbility(def(id),r2CreateJoker(id,id,0),ctx(patch));
it('all72 central copies render without placeholders, internal vocabulary, baseline snapshots or mutation',()=>{
 expect(Object.keys(templates).sort()).toEqual(R2_JOKERS.map(d=>d.id).sort());
 for(const d of R2_JOKERS){const j=r2CreateJoker(d.id,d.id,0),context=ctx(),before=JSON.stringify({d,j,context});const c=jokerMemoryAbility(d,j,context);expect(c.playerCopy).toBe(true);expect(c.condition.length).toBeGreaterThan(5);expect(c.summary).toBe(c.condition);expect([c.condition,c.value,c.state,c.rules].join('\n')).not.toMatch(/\{\w+\}|phase|hook|请求|深度|payload|单项|见完整规则/);expect(JSON.stringify({d,j,context})).toBe(before);for(const field of ['rng','events','scoreRange','finalScore','accumulator'])expect(c).not.toHaveProperty(field);const unowned=jokerMemoryAbility(d,undefined,context);expect(unowned.state).toBe('尚未购买，买入后才会生效');expect(unowned.bodyActive).toBeUndefined();}
 const thin=JSON.stringify(templates);expect(thin).not.toMatch(/baseline_|definition_snapshot|evidence_paths/);
 const source=readFileSync('src/game/JokerPlayerCopy.ts','utf8');expect(source).not.toMatch(/previewR2Hand|scoreR2Hand\(|r2ScoreConditionMatches\(|Math.random\(|drawPile|journal|save\(/);
});
it('numeric bindings use changed authoritative definitions, not draft values',()=>{
 let checked=0;for(const d of R2_JOKERS){const t=templates[d.id as keyof typeof templates];for(const binding of Object.values(t.bindings) as {source:string;format:string}[]){if(!binding.source.startsWith('definition.'))continue;const altered=structuredClone(d),path=binding.source.replace(/ × 100$/,'').slice(11).match(/[A-Za-z][A-Za-z0-9]*|\d+/g)!;let parent:any=altered;for(const k of path.slice(0,-1))parent=parent[k];const key=path.at(-1)!,v=parent[key];let expected:string;
 if(typeof v==='number'){parent[key]=v+2;expected=String(v+2);}else if(v&&typeof v==='object'&&'n'in v){parent[key]={n:'19',d:'2'};expected=binding.format==='probability n/d'?'19/2':binding.format==='Rational percent'?'950':'9.5';}else if(Array.isArray(v)){parent[key]=typeof v[0]==='number'?[14]:v[0]==='hearts'||v[0]==='spades'||v[0]==='clubs'||v[0]==='diamonds'?['spades']:['high-card'];expected=typeof v[0]==='number'?'A':parent[key][0]==='spades'?'♠':'高牌';}else continue;
 const c=jokerMemoryAbility(altered,undefined,ctx());expect([c.condition,c.value,c.rules].join('\n')).toContain(expected);checked++;}}
 expect(checked).toBeGreaterThan(110);
});
it('four-card decision limits and lifetime remain default-visible, entry snapshot is not a fixed current cap',()=>{
 for(const id of ['c08','c09']){expect(copy(id).condition).toContain('同花顺仍要 5 张');expect(copy(id).value).toContain('用 4 张规则时，不能多带第 5 张牌');}
 const life=r2CreateJoker('f06','life',0);life.counters={...life.counters,handsScored:3};const c=jokerMemoryAbility(def('f06'),life,ctx({scoringLimited:true}));expect(c.condition).toContain('共可用 4 手');expect(c.state).toContain('还可用 1 手');expect(c.value).toContain('计分加成暂停时仍扣剩余手数；换场不重置');expect(c.state).toContain('当前计分加成暂停');expect(c.state).not.toContain('本场计分加成暂停');
 const entry=copy('d06',{entryHandLimit:11});expect(entry.state).toContain('本场入场时手牌上限：11');expect(entry.state).not.toContain('锁定');expect(entry.rules).toContain('不会返还已经消耗的牌或机会');
});
it('random pending, limited next-stage budget and saved coefficient never become claimed rewards',()=>{
 for(const facts of [undefined,ctx().facts]){const c=copy('f08',{facts});expect(c.state).toContain('出牌时揭晓，每手抽一次');expect(c.state).not.toMatch(/已触发|抽中|符合条件/);}
 expect(copy('f08',{scoringLimited:true}).state).not.toContain('出牌时揭晓');
 const a07=r2CreateJoker('a07','a07',0);a07.counters={...a07.counters,singleDiscards:2};const next=jokerMemoryAbility(def('a07'),a07,ctx({inStage:false,facts:undefined}));expect(next.state).toContain('下场还可用 2 次');expect(next.state).toContain('进场重置');
 const e11=r2CreateJoker('e11','e11',0);e11.growth.coefficient={n:'7',d:'4'};expect(jokerMemoryAbility(def('e11'),e11,ctx()).state).toContain('当前倍率：×1.75');
});
it('owned/unowned and paused state precedence is uniform across72, no activity asserted before a real record',()=>{
 for(const d of R2_JOKERS){for(const facts of [undefined,ctx().facts]){const context=ctx({facts,scoringLimited:true}),j=r2CreateJoker(d.id,d.id,0),unowned=jokerMemoryAbility(d,undefined,context),owned=jokerMemoryAbility(d,j,context);expect(unowned.state).toBe('尚未购买，买入后才会生效');expect(owned.state).toContain('当前计分加成暂停');expect(owned.state).not.toMatch(/这手符合条件|出牌时揭晓|已触发/);expect(owned.value).toContain('只暂停计分与版次效果，其他效果仍按各自规则');expect(owned.bodyActive).toBeUndefined();expect(owned.editionActive).toBeUndefined();}}
});
it('saved lifetime0/1/4 and stage-used0/1 facts have no promise of another reward',()=>{
 for(const used of [0,3,4]){const j=r2CreateJoker('f06','life',0);j.counters={...j.counters,handsScored:used};const c=jokerMemoryAbility(def('f06'),j,ctx());expect(c.condition).toContain('共可用 4 手');expect(c.state).toContain('还可用 '+(4-used)+' 手');expect(c.condition).not.toContain('接下来的 4');}
 for(const id of ['d05','b12'])for(const used of [false,true]){expect(copy(id,{discardsUsed:used?1:0,quadRefundUsed:used}).state).toContain('本场还可用 '+(used?0:1)+' 次');expect(copy(id,{discardsUsed:used?1:0,quadRefundUsed:used}).state).not.toMatch(/已返还|将返还/);}
});
it('audited entry snapshot and economy details contain rules, never implementation instructions',()=>{
 const d06=copy('d06');expect(d06.rules).not.toContain('锁定');expect(d06.rules).toContain('扩容在进场时计算');
 for(const id of ['e03','d10'])expect(copy(id).rules).not.toMatch(/函数|另写|展示函数|计算器|读取/);
 expect(copy('e03').rules).toContain('不花费金币');expect(copy('d10').rules).toContain('自身占一槽');
});
it('c11 actual transition details use recorded prior type, retain first-hand null and old-record unknown',()=>{
 const flush=[2,5,8,11,13].map((rank,i)=>({id:'flush/'+i,rank:rank as 2|5|8|11|13,suit:'hearts' as const})),straight=[8,9,10,11,12].map((rank,i)=>({id:'straight/'+i,rank:rank as 8|9|10|11|12,suit:(i%2?'hearts':'spades') as 'hearts'|'spades'})),j=r2CreateJoker('c11','transition',0);
 for(const [cards,previous,current]of [[flush,'straight','flush'],[straight,'flush','straight'],[flush,null,'flush']]as const){const trace=scoreR2Hand({rulesVersion:'r2',runId:'copy-clock',rootId:'copy-clock/'+previous,hand:cards,disabledIds:[],selectedIds:cards.map(c=>c.id),jokers:[j],definitions:R2_JOKERS,characterId:'neutral',handLevels:{},playIndex:previous===null?1:2,handsBeforePlay:4,previousHandType:previous,wager:false,rng:{algorithm:'fnv1a-mulberry32-v1',state:41}}),after=ctx({previousHandType:current}),recorded=recordedJokerMemoryContext(after,trace.bossContext),c=jokerMemoryAbility(def('c11'),j,recorded,trace.events);expect(recorded.previousHandType).toBe(previous);expect(c.state).toContain('上一手牌型：'+(previous===null?'没有上一手':previous==='straight'?'顺子':'同花'));expect(c.bodyActive).toBe(previous!==null);expect(c.state).not.toContain('出牌后才会生效');expect(after.previousHandType).toBe(current);}
 for(const record of [undefined,{}, {previousHandType:undefined}]){const recorded=recordedJokerMemoryContext(ctx({previousHandType:'flush'}),record);expect(recorded.previousHandTypeKnown).toBe(false);expect(jokerMemoryAbility(def('c11'),j,recorded,[]).state).toContain('上一手牌型：未知（旧记录未保存）');}
});
