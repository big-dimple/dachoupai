import {describe,it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {erxiangChoice} from '../src/game/ErxiangHandoffCopy';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import type {PlayingCard} from '../src/cards/types';

const ids=['diamonds-9','hearts-9','spades-9','clubs-9'];
const order=[ids[0],'clubs-2',ids[1],'clubs-4',ids[2],ids[3],'hearts-6','spades-7'];
function send(s:R2RunState,action:Action){const result=applyCommand(s,{runId:s.runId,commandId:'g04/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!result.ok)throw Error(result.code);return result.state;}
function fixture(){
 let s=createRun({seed:'group-natural-17',runId:'g04/test',rulesVersion:'r2',characterId:'erxiang',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group'});
 s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
 const specials:Partial<PlayingCard>[]=[{}, {enhancement:'heat-paper',edition:'foil'}, {enhancement:'glass-paper',edition:'polychrome'}, {enhancement:'heat-paper',edition:'foil'}];
 ids.forEach((id,i)=>Object.assign(s.deckInstances.find(c=>c.id===id)!,{rank:9,suit:'clubs'},specials[i]));
 s.handOrder=[...order];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!order.includes(id));return s;
}
const facts=(s:R2RunState)=>r2SelectionFacts({hand:s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),selectedIds:ids,disabledIds:s.stage!.disabledIds,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s)});
describe('G04 same-name handoff candidates',()=>{
 it('distinguishes actual hand seats, enhancement and edition including identical copies without mutation',()=>{
  const s=fixture(),before=structuredClone(s),f=facts(s),choices=erxiangChoice(s,f).candidates;
  expect(new Set(choices.map(c=>c.label)).size).toBe(4);
  for(const [i,id] of ids.entries()){
   const c=choices.find(c=>c.card.id===id)!;expect(c.card).toBe(s.deckInstances.find(c=>c.id===id));expect(c.label).toBe('第'+(order.indexOf(id)+1)+'张 · 9♣');
   expect(c.points).toBe(9);expect(c.detail).toContain('首次普通9点热度 → 倍率');
   expect(erxiangChoice(s,f,id).selected?.card.id).toBe(id);
   if(i===0)expect(c.detail).toContain('无增强；版次：普通');
   if(i===1||i===3){expect(c.detail).toContain('热度纸 · 热+20');expect(c.detail).toContain('版次：闪箔');expect(c.detail).not.toContain('首次普通29点');}
   if(i===2){expect(c.detail).toContain('玻璃纸');expect(c.detail).toContain('版次：多彩');}
  }
  expect(erxiangChoice(s,f).selected).toBeUndefined();expect(s).toEqual(before);
 });
 it('ordinary and enhanced actual commands retain their exact target and redirect only nine ordinary points',()=>{
  for(const target of ids.slice(0,2)){
   const s=fixture(),a=send(s,{type:'PlayHand',selectedIds:ids,erxiangTargetId:target}),b=send(s,{type:'PlayHand',selectedIds:ids});
   const t=a.lastTrace!,base=b.lastTrace!;expect(t.erxiangHandoff?.targetId).toBe(target);expect(t.erxiangHandoff?.points).toBe(9);
   expect(t.events.filter(e=>e.reasonKey==='erxiang.handoff')).toHaveLength(1);
   // Enhancements retain the playing-card source ID; their identity is in reasonKey.
   const specials=(trace:typeof t)=>trace.events.filter(e=>e.reasonKey.startsWith('edition.')||e.reasonKey.startsWith('enhancement.'));
   for(const trace of [t,base])expect(specials(trace)).toEqual(expect.arrayContaining([
    expect.objectContaining({reasonKey:'enhancement.heat-paper.add-heat',targetCardId:ids[1],operation:'add-heat',value:{n:'20',d:'1'}}),
    expect.objectContaining({reasonKey:'enhancement.glass-paper.multiply-multiplier',targetCardId:ids[2],operation:'multiply-multiplier',value:{n:'3',d:'2'}}),
   ]));
   const values=(trace:typeof t)=>specials(trace).map(e=>[e.reasonKey,e.sourceInstanceId,e.targetCardId,e.operation,e.value]);
   expect(values(t)).toEqual(values(base));
  }
 });
 it('used, hero ban, high card, disabled and zero ordinary points produce no invalid candidate',()=>{
  const s=fixture(),f=facts(s);s.stage!.erxiangHandoffUsed=true;expect(erxiangChoice(s,f).candidates).toEqual([]);s.stage!.erxiangHandoffUsed=false;
  s.stage!.boss={definitionId:'B08',disabledSuit:null};expect(erxiangChoice(s,f).candidates).toEqual([]);s.stage!.boss=null;
  expect(erxiangChoice(s,{...f,type:'high-card'}).candidates).toEqual([]);
  const changed={...f,activeScoringIds:ids.slice(1),ordinaryPointsSuppressedIds:[ids[1]]};expect(erxiangChoice(s,changed,ids[0]).selected).toBeUndefined();expect(erxiangChoice(s,changed).candidates.map(c=>c.card.id).sort()).toEqual(ids.slice(2).sort());
 });
});
