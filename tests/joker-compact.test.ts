import {expect,it} from 'vitest';
import {R2_JOKERS,r2GrowthCaps,r2GrowthMinimums} from '../src/content/r2Schema';
import {r2CreateJoker} from '../src/domain/r2Run';
import {jokerMemory,jokerMemoryAbility,type JokerMemoryContext} from '../src/game/JokerMemory';
import {JOKER_COMPACT} from '../src/game/JokerCompact';
import {fitJokerLabel,jokerLabelRoom} from '../src/game/JokerLabel';
import {layout} from '../src/game/layout';
const ctx:JokerMemoryContext={inStage:true,hand:[],disabledIds:[],scoringLimited:false,gold:3,handsLeft:4,playIndex:0,discardsUsed:0,quadRefundUsed:false,previousHandType:null,stageHeat:'0',target:'1000',transaction:{gold:3,discarded:[],hasStage:true,handType:null,maxPlayedCount:0,ordinaryStraightSeen:false,ordinaryFlushSeen:false,jokerSold:false,traceType:null,heat:'0',target:'1000'},deckSize:40,jokerSlots:5,jokerCount:5};
const def=(id:string)=>R2_JOKERS.find(d=>d.id===id)!;
it('all72 have independent complete mechanism alternatives, not sliced shop conditions',()=>{
 expect(Object.keys(JOKER_COMPACT).sort()).toEqual(R2_JOKERS.map(d=>d.id).sort());
 for(const d of R2_JOKERS){const j=r2CreateJoker(d.id,'test/'+d.id,0),before=structuredClone(j),m=jokerMemory(d,j,ctx);expect(m.labelCandidates.length).toBeGreaterThan(0);expect(m.short).toBe(m.labelCandidates[0]);expect(m.labelCandidates.every(t=>t.length>0&&!t.includes('…'))).toBe(true);expect(j).toEqual(before);expect(jokerMemoryAbility(d,j,ctx).condition).toBeTruthy();}
 expect(JOKER_COMPACT.e04).toEqual(['利息上限','息上限']);expect(JOKER_COMPACT.c05).toEqual(['同花弃2+','同花弃']);
});
it('additive zero shows mechanism only; every real saved growth value takes priority and full details retain zero',()=>{
 const growthIds=[];
 for(const d of R2_JOKERS){const keys=Object.keys(r2GrowthCaps(d));if(!keys.length)continue;growthIds.push(d.id);
  const j=r2CreateJoker(d.id,'growth/'+d.id,0),min=r2GrowthMinimums(d);
  for(const key of keys){const copy=structuredClone(j);copy.growth={...min,[key]:{n:'0',d:'1'}};
   const zero=jokerMemory(d,copy,ctx);if(key!=='coefficient')expect(zero.labelCandidates).toEqual(JOKER_COMPACT[d.id]);expect(zero.saved).toMatch(/(?:成长|热度|系数).*(?:0)/);
   copy.growth[key]={n:'2',d:'1'};const before=structuredClone(copy),m=jokerMemory(d,copy,ctx);expect(m.stateLabel).toBe(true);expect(m.short).toContain('2');expect(m.short).not.toBe(JOKER_COMPACT[d.id][0]);expect(copy).toEqual(before);
  }
 }expect(growthIds).toHaveLength(14);
});
it('saved coefficient1 is visible; large exact numbers fall back to state, not truncated numbers/mechanisms',()=>{
 const j=r2CreateJoker('e11','coefficient',0),m=jokerMemory(def('e11'),j,ctx);expect(m.labelCandidates).toEqual(['系数×1','×1']);
 j.growth.coefficient={n:'123456789012345678901234567890',d:'1'};const big=jokerMemory(def('e11'),j,ctx);
 expect(big.short).toContain(j.growth.coefficient.n);expect(fitJokerLabel(big.labelCandidates,s=>s.length<=4,big.stateLabel)).toBe('状态 ›');expect(big.saved).toBeTruthy();
});
it('actual lifetime/used counts and discarded history outrank mechanism and remain public facts after refunds',()=>{
 for(const id of ['f06','d05','b12','f09']){const j=r2CreateJoker(id,id,0);j.counters={...(j.counters??{}),handsScored:4};const used={...ctx,quadRefundUsed:true,discardsUsed:1};const m=jokerMemory(def(id),j,used);expect(m.short).toBe(id==='f06'?'余0手':id==='f09'?'已弃牌':'余0次');expect(m.stateLabel).toBe(true);}
 expect(jokerMemoryAbility(def('f09'),r2CreateJoker('f09','x',0),{...ctx,discardsUsed:1}).state).toContain('返次不清除历史');
 expect(jokerMemory(def('f08'),r2CreateJoker('f08','random',0),ctx).status).toBe('事件时检查');
 const cycle=r2CreateJoker('e10','cycle',0);expect(jokerMemory(def('e10'),cycle,ctx).savedShort).toBe('再2关赠票');cycle.counters!.stageClears=1;expect(jokerMemory(def('e10'),cycle,ctx).savedShort).toBe('下关赠票');
 for(const d of R2_JOKERS){const j=r2CreateJoker(d.id,d.id,0),restricted=jokerMemory(d,j,{...ctx,scoringLimited:true});expect(restricted.status).toBe('计分受限');expect(jokerMemoryAbility(d,j,{...ctx,scoringLimited:true}).state).toContain('仅计分与版次停用');expect(restricted.labelCandidates).toEqual(jokerMemory(d,j,ctx).labelCandidates);}
});
it('ordered real width fitting never truncates; short landscape uses the same side-label room on mount/refresh',()=>{
 for(const viewport of [{width:320,height:740},{width:360,height:740},{width:390,height:740},{width:844,height:300}]){
 const l=layout(viewport,{top:viewport.width===844?12:0,right:0,bottom:0,left:0},undefined,{count:9});
 for(let i=0;i<5;i++)expect(jokerLabelRoom(l,i)).toBe(l.mode==='landscape'?l.jokerLabels[i].width:l.slots[i].width-6);
 }expect(fitJokerLabel(['同花弃2+','同花弃'],s=>s.length<=3)).toBe('同花弃');expect(fitJokerLabel(['蓄热123456'],s=>s.length<=4,true)).toBe('状态 ›');
});
