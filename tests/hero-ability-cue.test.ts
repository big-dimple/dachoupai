import {it,expect} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {CHARACTER_IDS,type CharacterId} from '../src/domain/characters';
import {heroAbilityCue} from '../src/game/HeroAbilityCue';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {savedBenefit} from '../src/game/JokerExperience';
const cards=['spades-8','hearts-8','clubs-7','diamonds-7','spades-13','hearts-13','clubs-2','diamonds-4'];
const main=cards.slice(0,4);
function send(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:'cue/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);expect(readCheckpoint(makeCheckpoint(r.state,[])).ok).toBe(true);return r.state;}
function arrange(s:R2RunState,ids=cards){s=structuredClone(s);s.handOrder=[...ids];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id));expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);return s;}
function entered(id:CharacterId){return arrange(send(send(createRun({rulesVersion:'r2',characterId:id,runId:'cue-'+id,seed:'group-natural-17',r2Identity:newRunIdentity(id,'group'),openingRoute:'group'}),{type:'LeaveShop'}),{type:'EnterStage'}));}
function facts(s:R2RunState,ids=main){return r2SelectionFacts({hand:s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)!),selectedIds:ids,disabledIds:s.stage!.disabledIds,jokers:s.jokers,definitions:r2JokerDefinitionsFor(s)});}
it('six public legal inputs only advertise the current valid operation, without mutation or guesses',()=>{
 for(const id of CHARACTER_IDS){let s=entered(id);if(id==='azao'){s=arrange(s,['spades-2','hearts-2','clubs-3','diamonds-3',...cards.slice(4)]);s=arrange(send(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4)}));}if(id==='xiemu'){s.gold=10;expect(readCheckpoint(makeCheckpoint(s,[])).ok).toBe(true);}
  const before=structuredClone(s),ids=id==='erxiang'?cards.slice(0,2):main;
  expect(heroAbilityCue(s,facts(s,ids),ids,id==='amo')?.available).toBe(true);
  expect(heroAbilityCue(s,facts(s,ids),ids,id==='amo')?.label).toContain(id==='touye'||id==='laohuan'?'弃前':'出前');
  expect(heroAbilityCue(s)?.available).toBe(false);expect(s).toEqual(before);
 }
});
it('money, qualification, no discard budget, used handoff and old identities never get a ready accent',()=>{
 const x=entered('xiemu');expect(heroAbilityCue(x,facts(x),main)).toMatchObject({available:false,label:'谢幕·不足10金'});
 const e=entered('erxiang');expect(heroAbilityCue(e,facts(e,[cards[0]]),[cards[0]])?.available).toBe(false);
 const a=send(e,{type:'PlayHand',selectedIds:cards.slice(0,2),erxiangTargetId:cards[0]});expect(heroAbilityCue(a)?.available).toBe(false);
 const l=entered('laohuan');l.stage!.discardsLeft=0;expect(heroAbilityCue(l,facts(l),[cards[0]])?.available).toBe(false);
 const legacy=structuredClone(e);delete legacy.stage!.erxiangHandoffUsed;legacy.contentVersion='legacy';expect(heroAbilityCue(legacy,facts(e),main)).toBeUndefined();
});
it('committed handoff and wager results explain actual sources; promises and altered events cannot become receipts',()=>{
 const s=entered('erxiang'),a=send(s,{type:'PlayHand',selectedIds:cards.slice(0,2),erxiangTargetId:cards[0]}),t=a.lastTrace!,e=t.events.find(e=>e.reasonKey==='erxiang.handoff')!;
 expect(savedBenefit(a,t,e)).toMatchObject({title:'二响 · 交棒已兑现',effect:'8点热度改加倍率（首次普通计分）'});
 expect(savedBenefit(a,t,{...e,eventId:'not-saved'})).toBeUndefined();
 const amo=entered('amo'),b=send(amo,{type:'PlayAssistedHand',selectedIds:main,assistIds:cards.slice(4,6)}),bt=b.lastTrace!,be=bt.events.find(e=>e.reasonKey==='amo.assist.pair')!;
 expect(savedBenefit(b,bt,be)?.effect).toBe('副组2张已用 · 实际×2');
});

it('B08 respects the non-scoring Laohuan exception and never advertises disabled scoring abilities',()=>{
 for(const id of CHARACTER_IDS){let s=createRun({rulesVersion:'r2',characterId:id,runId:'boss-cue-'+id,seed:'group-natural-17',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false},r2Identity:newRunIdentity(id,'group'),openingRoute:'group'});s.phase='stage-ready';s.chapter=3;s.stageIndex=8;s.shop!.visitIndex=8;s.seenBossIds=['B02','B03','B08'];s.boss={definitionId:'B08',disabledSuit:null};s=arrange(send(s,{type:'EnterStage'}));const cue=heroAbilityCue(s,facts(s),main,id==='amo');expect(cue?.available).toBe(id==='laohuan');if(id!=='laohuan')expect(cue?.label).toContain('停用');}
});
it('Q01 public current states disable every ability cue without a game mutation',()=>{
 for(const id of CHARACTER_IDS){const s=arrange(send(send(createRun({rulesVersion:'r2',characterId:id,runId:'q-cue-'+id,seed:'challenge/q01/0',r2Identity:newRunIdentity(id,'group'),openingRoute:'group',modeConfig:{mode:'challenge',difficulty:0,challengeId:'Q01',programsEnabled:false}}),{type:'LeaveShop'}),{type:'EnterStage'}));expect(heroAbilityCue(s,facts(s),main,id==='amo')).toMatchObject({available:false});}
});
