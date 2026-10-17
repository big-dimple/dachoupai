import {expect,it} from 'vitest';
import {r2AssistFacts} from '../src/domain/r2Assist';
import type {R2SelectionInput} from '../src/domain/r2SelectionFacts';
import {assistCandidates} from '../src/game/AssistSelection';
import {assistRestrictionCopy} from '../src/game/AssistRestrictionCopy';
import type {PlayingCard} from '../src/cards/types';
import {createRun,applyCommand} from '../src/domain/run';
import {newRunIdentity} from '../harness/fixtures/legacy-assist-launch';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {heroAbilityCue} from '../src/game/HeroAbilityCue';
import {heroSkillGuide} from '../src/game/HeroSkillGuide';
const card=(id:string,rank:PlayingCard['rank'],suit:PlayingCard['suit']):PlayingCard=>({id,rank,suit});
const flush=[card('dQ',12,'diamonds'),card('dJ',11,'diamonds'),card('d10',10,'diamonds'),card('d6',6,'diamonds'),card('d2',2,'diamonds')];
const input=(main:PlayingCard[]=flush,disabledIds=['s10']):R2SelectionInput=>({hand:[...main,card('s10',10,'spades'),card('h10',10,'hearts'),card('cA',14,'clubs')],selectedIds:main.map(c=>c.id),disabledIds,jokers:[],definitions:[]});
it('names the screenshot’s actual disabled ten while the real rule still rejects the assist',()=>{
 const i=input(),before=JSON.stringify(i);expect(()=>r2AssistFacts({...i,assistIds:['s10','h10']})).toThrow('assist-disabled-card');expect(assistCandidates(i,true)).toEqual([]);
 expect(assistRestrictionCopy(i,true)).toEqual({blockedIds:['s10'],compact:'10♠失效',detail:'10♠计分失效，不能作副牌；换一组未失效的同点牌。'});expect(JSON.stringify(i)).toBe(before);
});
it('ordinary point suppression is not a scoring-disabled assist ban',()=>{
 const i={...input(flush,[]),ordinaryPointsSuppressedIds:['s10']};expect(r2AssistFacts({...i,assistIds:['s10','h10']}).assistMultiplier).toBe(2);expect(assistRestrictionCopy(i,true)).toBeUndefined();
});
it('straight/flush qualify with a healthy remainder pair, while an ordinary pair main does not',()=>{
 const straight=[card('a2',2,'hearts'),card('a3',3,'clubs'),card('a4',4,'diamonds'),card('a5',5,'hearts'),card('a6',6,'spades')];
 for(const main of [flush,straight]){expect(assistCandidates(input(main,[]),true)).toHaveLength(1);expect(assistRestrictionCopy(input(main),true)?.blockedIds).toEqual(['s10']);}
 const pair=[card('c2',2,'clubs'),card('h2',2,'hearts')];expect(()=>r2AssistFacts({...input(pair,[]),assistIds:['s10','h10']})).toThrow('assist-unqualified-main');expect(assistRestrictionCopy(input(pair),true)).toBeUndefined();
});
it('does not replace a real usable group or an unavailable/used ability with a ban message',()=>{
 const i=input();i.hand=[...i.hand,card('c10',10,'clubs')];expect(assistCandidates(i,true).length).toBeGreaterThan(0);expect(assistRestrictionCopy(i,true)).toBeUndefined();expect(assistRestrictionCopy(input(),false)).toBeUndefined();
});
it('the existing skill button status and guide expose the exact disabled card',()=>{
 let run=createRun({seed:'assist-copy-controlled',runId:'fixture/assist-copy',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group'});
 for(const action of [{type:'LeaveShop'},{type:'EnterStage'}] as const){const result=applyCommand(run,{runId:run.runId,commandId:run.runId+'/'+run.commandSeq,expectedSeq:run.commandSeq,action});if(!result.ok)throw Error(result.code);run=result.state;}
 // Explicit public screenshot arrangement for this UI-copy test, separate from six formal new-run tests.
 run.handOrder=['diamonds-12','diamonds-11','diamonds-10','diamonds-6','diamonds-2','spades-10','hearts-10','clubs-14'];run.stage!.disabledIds=['spades-10'];
 const ids=run.handOrder.slice(0,5),facts=r2SelectionFacts({hand:run.handOrder.map(id=>run.deckInstances.find(c=>c.id===id)!),selectedIds:ids,disabledIds:run.stage!.disabledIds,jokers:run.jokers,definitions:[]});
 expect(heroAbilityCue(run,facts,ids,false)).toMatchObject({state:'unavailable',status:'10♠失效',available:false,detail:expect.stringContaining('10♠计分失效，不能作副牌')});
 expect(heroSkillGuide(run,facts,ids,false).step).toContain('10♠计分失效，不能作副牌');
});
