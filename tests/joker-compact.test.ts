import {expect,it} from 'vitest';
import {R2_JOKERS,r2GrowthCaps,r2GrowthMinimums} from '../src/content/r2Schema';
import {r2CreateJoker} from '../src/domain/r2Run';
import {createRun,applyCommand,type Action as RunAction} from '../src/domain/run';
import {jokerMemory,jokerMemoryAbility,publicJokerMemoryContext,type JokerMemoryContext} from '../src/game/JokerMemory';
import {JOKER_COMPACT} from '../src/game/JokerCompact';
import {fitJokerLabel,jokerLabelRoom} from '../src/game/JokerLabel';
import {layout} from '../src/game/layout';
const ctx:JokerMemoryContext={inStage:true,hand:[],disabledIds:[],scoringLimited:false,gold:3,handsLeft:4,playIndex:0,discardsUsed:0,quadRefundUsed:false,previousHandType:null,stageHeat:'0',target:'1000',transaction:{gold:3,discarded:[],hasStage:true,handType:null,maxPlayedCount:0,ordinaryStraightSeen:false,ordinaryFlushSeen:false,jokerSold:false,traceType:null,heat:'0',target:'1000'},deckSize:40,jokerSlots:5,jokerCount:5};
const def=(id:string)=>R2_JOKERS.find(d=>d.id===id)!;
it('a07 used stage -> actual shop -> next EnterStage distinguishes old usage from next-stage budget',()=>{
 let state=createRun({seed:'a07-stage-reminder',runId:'fixture/a07-stage-reminder',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state.jokers=[r2CreateJoker('a07','owned/a07',0)];
 const command=(action:RunAction)=>{const r=applyCommand(state,{runId:state.runId,commandId:'test/'+state.commandSeq,expectedSeq:state.commandSeq,action});expect(r.ok).toBe(true);if(r.ok)state=r.state;};
 const memory=()=>{const context=publicJokerMemoryContext(state,{hand:[],scoringLimited:false,deckSize:state.deckInstances.length,jokerSlots:5,jokerCount:1});return{m:jokerMemory(def('a07'),state.jokers[0],context),copy:jokerMemoryAbility(def('a07'),state.jokers[0],context)};};
 command({type:'LeaveShop'});command({type:'EnterStage'});
 command({type:'DiscardHand',selectedIds:[state.handOrder[0]]});command({type:'DiscardHand',selectedIds:[state.handOrder[0]]});
 expect(state.jokers[0].counters?.singleDiscards).toBe(2);expect(memory().m.remainingUses).toBe(0);expect(memory().copy.state).toContain('本场余0次');
 // Explicit legal fixture reorders only live zones to make a same-suit winning hand.
 const available=state.deckInstances.filter(c=>!state.discardPile.includes(c.id)&&!state.playedPile.includes(c.id)),chosen=available.filter(c=>c.suit==='hearts').slice(0,5).map(c=>c.id),rest=available.filter(c=>!chosen.includes(c.id)).map(c=>c.id);
 state.handOrder=[...chosen,...rest.splice(0,state.stage!.handLimit-5)];state.drawPile=rest;
 command({type:'PlayHand',selectedIds:chosen});expect(state.phase).toBe('stage-cleared');command({type:'OpenShop'});expect(state.phase).toBe('shop');
 const before=structuredClone(state),shop=memory();expect(shop.m.remainingUses).toBe(2);expect(shop.copy.state).toContain('下场余2次');expect(shop.copy.state).not.toContain('下场余0次');expect(shop.copy.state).toContain('入场重置');expect(shop.copy.state).toContain('已保存使用记录 2 / 2');expect(state).toEqual(before);expect(state.jokers[0].counters?.singleDiscards).toBe(2);
 command({type:'LeaveShop'});command({type:'EnterStage'});expect(state.jokers[0].counters?.singleDiscards).toBe(0);expect(memory().m.remainingUses).toBe(2);expect(memory().copy.state).toContain('本场余2次');
 const fresh=jokerMemoryAbility(def('a07'),r2CreateJoker('a07','fresh',0),{...ctx,inStage:false});expect(fresh.state).toContain('尚无保存的使用计数');expect(fresh.state).toContain('下场余2次');expect(fresh.state).not.toContain('上场已用');
 const offer=jokerMemoryAbility(def('a07'),undefined,{...ctx,inStage:false});expect(offer.state).toContain('尚未购入；不代表已触发');expect(offer.state).not.toContain('已保存使用记录');
});
it('all72 have independent complete mechanism alternatives, not sliced shop conditions',()=>{
 expect(Object.keys(JOKER_COMPACT).sort()).toEqual(R2_JOKERS.map(d=>d.id).sort());
 for(const d of R2_JOKERS){const j=r2CreateJoker(d.id,'test/'+d.id,0),before=structuredClone(j),m=jokerMemory(d,j,ctx);expect(m.labelCandidates.length).toBeGreaterThan(0);expect(m.short).toBe(m.labelCandidates[0]);expect(m.labelCandidates.every(t=>t.length>0&&!t.includes('…'))).toBe(true);expect(j).toEqual(before);expect(jokerMemoryAbility(d,j,ctx).condition).toBeTruthy();}
 expect(JOKER_COMPACT.e04).toEqual(['利息上限','息上限']);expect(JOKER_COMPACT.c05).toEqual(['同花弃2+','同花弃']);
 expect(JOKER_COMPACT.d07).toEqual(['全计+倍','加倍率']);
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
