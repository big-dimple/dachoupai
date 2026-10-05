import {expect,it} from 'vitest';
import {createRun,applyCommand,type R2RunState} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionFor,r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2AssistFacts} from '../src/domain/r2Assist';
import {r2Price} from '../src/domain/r2Shop';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from '../src/game/JokerMemory';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
const main=['spades-9','hearts-9','clubs-13','diamonds-13'],side=['spades-12','hearts-12'];
const send=(s:R2RunState,action:any)=>{const r=applyCommand(s,{runId:s.runId,commandId:String(s.commandSeq+1),expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
function fixture(id:string){let s=createRun({runId:'group-ui',seed:'group-ui',characterId:'amo',rulesVersion:'r2',r2Profile:'group-upgrade-v1'});s.jokers=[r2CreateJoker(id,'owned',0,undefined,s)];s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});s.handOrder=[...main,...side,'clubs-6','diamonds-7'];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));return s;}
const context=(s:R2RunState,facts?:ReturnType<typeof r2SelectionFacts>)=>publicJokerMemoryContext(s,{hand:s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),facts,scoringLimited:false,deckSize:s.deckInstances.length,jokerSlots:5,jokerCount:s.jokers.length});
it('defines groups in each main sentence and resolves the new/old b10 rarity and purchase price',()=>{
 const current=fixture('b10'),old=createRun({runId:'old',seed:'old',characterId:'erxiang',rulesVersion:'r2',r2Profile:'combo-growth-v1'});
 expect(r2JokerDefinitionFor(current,'b10').rarity).toBe('common');expect(r2Price('b10','none',current)).toBe(4);
 expect(r2JokerDefinitionFor(old,'b10').rarity).toBe('uncommon');expect(r2Price('b10','none',old)).toBe(6);
 for(const id of ['b03','b06','b08','b10']){const s=fixture(id),copy=jokerAbilityCopyForRun(s,id,s.jokers[0],context(s));expect(copy.condition).toContain('对子、两对、三条、葫芦等同点数组合');expect(copy.rules).toContain('同花五条');}
});
it('describes the original leftmost tied b06 group, filters disabled targets without switching, and excludes assist',()=>{
 const s=fixture('b06'),hand=context(s).hand,defs=r2JokerDefinitionsFor(s),facts=r2AssistFacts({hand,jokers:s.jokers,definitions:defs,selectedIds:main,assistIds:side,disabledIds:['spades-9']});
 const ctx=context(s,facts),before=JSON.stringify({rng:s.rng,hand:s.handOrder,jokers:s.jokers});
 const copy=jokerAbilityCopyForRun(s,'b06',s.jokers[0],ctx);
 expect(copy.state).toContain('本次最大同点组：9♠、9♥；其中有效牌：9♥');expect(copy.state).not.toContain('本次最大同点组：K');expect(copy.state).not.toContain('Q♠');
 expect(JSON.stringify({rng:s.rng,hand:s.handOrder,jokers:s.jokers})).toBe(before);
});
it('saved growth explains the actual zero read, after-hand increase, resulting saved value, and next-play timing',()=>{
 const s=fixture('b10'),source=s.jokers[0],after=send(s,{type:'PlayHand',selectedIds:main});
 const copy=jokerAbilityCopyForRun(s,'b10',source,context(s),after.lastTrace!.events);
 expect(copy.state).toContain('本次按+0结算');expect(copy.state).toContain('出牌结算后成长 +10');expect(copy.state).toContain('结算后保存热度成长：+10');expect(copy.state).toContain('本次读取成长：+0');
 expect(after.jokers[0].growth.heat).toEqual({n:'10',d:'1'});
});
it('saved b06 copy reports the actual requests from the saved body events',()=>{
 const s=fixture('b06'),after=send(s,{type:'PlayHand',selectedIds:main}),copy=jokerAbilityCopyForRun(s,'b06',s.jokers[0],context(s),after.lastTrace!.events);
 expect(copy.state).toContain('本次再次计分来源：再说一遍 → 9♠ ×1、9♥ ×1');
});
it.each(['b03','b10'] as const)('%s recorded growth distinguishes actual reads from sealed score slots, including restored copy',id=>{
 for(const limited of [false,true]){
  let s=createRun({runId:'growth-read-'+id,seed:'growth-read',characterId:'amo',rulesVersion:'r2',r2Profile:'group-upgrade-v1',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  s.jokers=[r2CreateJoker('pengci','first',4,undefined,s),r2CreateJoker(id,'owned',id==='b10'?4:6,undefined,s)];s.jokers[1].growth=id==='b10'?{heat:{n:'20',d:'1'}}:{multiplier:{n:'1',d:'1'}};
  if(limited)Object.assign(s,{chapter:3,stageIndex:8,phase:'stage-ready',shop:null,boss:{definitionId:'B06',disabledSuit:null},seenBossIds:['B01','B02','B06']});else s=send(s,{type:'LeaveShop'});
  s=send(s,{type:'EnterStage'});s.handOrder=[...main,...side,'clubs-6','diamonds-7'];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);
  const after=send(s,{type:'PlayHand',selectedIds:main}),restored=readCheckpoint(JSON.parse(JSON.stringify(makeCheckpoint(after,[]))));if(!restored.ok)throw Error(restored.code);
  for(const run of [after,restored.checkpoint.state as R2RunState]){
   const trace=run.lastTrace!,source=trace.sourceJokers.find(j=>j.instanceId==='owned')!,own=trace.events.filter(e=>e.sourceInstanceId==='owned'),ctx=publicJokerMemoryContext(run,{hand:trace.cards,scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:trace.sourceJokers.length});
   expect(own.some(e=>e.operation==='read-growth')).toBe(!limited);expect(own.some(e=>e.operation==='add-growth')).toBe(true);
   const copy=jokerAbilityCopyForRun(run,id,source,ctx,trace.events),before=id==='b10'?'20':'1',result=id==='b10'?'30':'1.25';
   expect(copy.state).toContain('结算后保存'+(id==='b10'?'热度':'倍率')+'成长：+'+result);
   if(limited){expect(copy.state).not.toContain('本次读取成长');expect(copy.state).toContain('结算前保存成长：+'+before);expect(copy.state).toContain('本次未读取成长加成');expect(copy.state).not.toContain('本次按+0结算');}
   else{expect(copy.state).toContain('本次读取成长：+'+before);expect(copy.state).not.toContain('本次未读取成长加成');}
  }
 }
});
