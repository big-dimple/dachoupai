import {afterEach,expect,it,vi} from 'vitest';
import type {CharacterId} from '../src/domain/characters';
import {applyCommand,createRun,type Action,type R2RunState} from '../src/domain/run';
import {r2ScoreContext} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import * as scoring from '../src/domain/scoreR2';
import {SeededRng} from '../src/core/SeededRng';
import {newRunIdentity} from '../harness/fixtures/legacy-assist-launch';
import {aiHandKey,aiHandScoreInput,aiScoreContext,rankAiHandCandidates,AiHandCandidateCache,type AiHandInput,type AiSkillDraft} from '../src/game/AiHandCandidates';
import {touyeFixture,touyeBet,touyeSend} from './fixtures/touye-new-core';

const main=['spades-8','hearts-8','clubs-8'],pair=main.slice(0,2),assist=['spades-2','hearts-2'];
function send(state:R2RunState,action:Action):R2RunState {
 const result=applyCommand(state,{runId:state.runId,commandId:'ai-context/'+state.commandSeq,expectedSeq:state.commandSeq,action});
 if(!result.ok)throw Error(result.code);return result.state;
}
function ready(characterId:CharacterId):R2RunState {
 let state=createRun({seed:'ai-hero-context',runId:'ai-hero-context',characterId,rulesVersion:'r2',r2Identity:newRunIdentity(characterId,'group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state=structuredClone(send(send(state,{type:'LeaveShop'}),{type:'EnterStage'}));
 state.handOrder=[...main,...assist,'diamonds-4','clubs-6','hearts-9'];state.gold=35;
 state.drawPile=state.deckInstances.map(c=>c.id).filter(id=>!state.handOrder.includes(id));
 if(characterId==='azao')state.stage!.azaoCharge={charge:2,previousQualifiedType:'straight'};
 return state;
}
function input(state:R2RunState,draft:AiSkillDraft={}):AiHandInput {
 const stage=state.stage!,hand=state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!),context=r2ScoreContext(state,hand,[]);
 return {hand,jokers:state.jokers,definitions:r2JokerDefinitionsFor(state),handRules:context.handRules,disabledIds:stage.disabledIds,
  ordinaryPointsSuppressedIds:[],boss:context.boss,stageIndex:stage.index,sealedJokerIds:context.sealedJokerIds,challengeDisabledJokerId:context.challengeDisabledJokerId,
  resources:{gold:state.gold,handsLeft:stage.handsLeft,playIndex:stage.playIndex,discardsUsed:stage.discardsUsed,stageHeat:stage.heat,target:stage.targetHeat},contentVersion:state.contentVersion+'/'+state.contentHash,
  score:aiScoreContext({...context,handLevels:state.handLevels,previousHandType:stage.previousHandType,wager:stage.wagerSelected},draft)};
}
/** Constructed from the formal reducer's payment/context order, independently of the AI adapter. */
function formal(state:R2RunState,selectedIds:readonly string[],draft:AiSkillDraft={},preview=scoring.previewR2Hand) {
 const paid=structuredClone(state);paid.gold-=draft.xiemuBurn??0;
 const stage=paid.stage!,hand=paid.handOrder.map(id=>paid.deckInstances.find(c=>c.id===id)!),context=r2ScoreContext(paid,hand,selectedIds);
 return preview({rulesVersion:'r2',runId:'ai-public',rootId:'ai-public/selection',hand,selectedIds,disabledIds:stage.disabledIds,jokers:paid.jokers,definitions:r2JokerDefinitionsFor(paid),
  handLevels:paid.handLevels,playIndex:stage.playIndex+1,handsBeforePlay:stage.handsLeft,previousHandType:stage.previousHandType,wager:stage.wagerSelected,...context,
  ...(context.erxiangHandoff?{erxiangHandoff:{targetId:draft.erxiangTargetId??null,beforeUsed:stage.erxiangHandoffUsed!}}:{}),
  ...(context.xiemuBurn?{xiemuBurn:{cost:draft.xiemuBurn??0,goldBefore:state.gold,beforeUsed:stage.xiemuBurnUsed!}}:{}),
  ...(context.azaoCharge?{azaoCharge:{before:stage.azaoCharge!,release:draft.azaoRelease??false}}:{}),
  ...(draft.assistIds?.length?{assistIds:draft.assistIds}:{})});
}
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});

it.each(['amo','erxiang','laohuan','touye','xiemu','azao'] as const)('%s current unchosen context matches formal preview for every candidate',hero=>{
 const state=ready(hero),before=structuredClone(state),candidate=input(state),real=scoring.previewR2Hand;
 const spy=vi.spyOn(scoring,'previewR2Hand').mockImplementation(request=>{const actual=real(request);expect(actual).toEqual(formal(state,request.selectedIds,{},real));return actual;});
 expect(rankAiHandCandidates(candidate).status).toBe('ready');expect(spy).toHaveBeenCalled();expect(state).toEqual(before);
});

it('Liu E unchosen / chosen / cancelled previews retain102 /430 /102 instead of legacy178',()=>{
 const state=ready('erxiang'),unchosen=input(state),chosen=input(state,{erxiangTargetId:pair[0]}),cancelled=input(state,{erxiangTargetId:null});
 for(const [candidate,draft,score] of [[unchosen,{},'102'],[chosen,{erxiangTargetId:pair[0]},'430'],[cancelled,{erxiangTargetId:null},'102']] as const){
  const preview=scoring.previewR2Hand(aiHandScoreInput(candidate,pair));expect(preview).toEqual(formal(state,pair,draft));expect(preview.scoreRange).toEqual({minimum:score,maximum:score});
 }
 expect(aiHandKey(chosen)).not.toBe(aiHandKey(unchosen));expect(aiHandKey(cancelled)).toBe(aiHandKey(unchosen));
 const legacy=aiHandScoreInput(unchosen,pair);delete legacy.erxiangHandoff;expect(scoring.previewR2Hand(legacy).scoreRange.minimum).toBe('178');
});
it('Liu E B08 carries the null contract, never spends or revives the old passive',()=>{
 const state=ready('erxiang');state.stage!.boss={definitionId:'B08',disabledSuit:null};state.boss=state.stage!.boss;
 const candidate=input(state),before=structuredClone(state);expect(scoring.previewR2Hand(aiHandScoreInput(candidate,pair))).toEqual(formal(state,pair));
 expect(scoring.previewR2Hand(aiHandScoreInput(candidate,pair)).scoreRange.minimum).toBe('102');expect(rankAiHandCandidates(candidate).status).toBe('ready');
 const invalid=input(state,{erxiangTargetId:pair[0]});expect(()=>scoring.previewR2Hand(aiHandScoreInput(invalid,pair))).toThrow('erxiang-disabled');expect(rankAiHandCandidates(invalid).status).toBe('unsupported');expect(state).toEqual(before);
});
it.each([
 ['erxiang',{erxiangTargetId:pair[0]},pair],['amo',{assistIds:assist},main],['xiemu',{xiemuBurn:10},main],['azao',{azaoRelease:true},main],
] as const)('%s preserves the explicit current choice and skips only incompatible subsets', (hero,draft,ids)=>{
 const state=ready(hero),before=structuredClone(state),candidate=input(state,draft),beforeInput=structuredClone(candidate),preview=scoring.previewR2Hand(aiHandScoreInput(candidate,ids));
 expect(preview).toEqual(formal(state,ids,draft));const result=rankAiHandCandidates(candidate);expect(result.status).toBe('ready');expect(result.examined).toBe(218);
 expect(result.ordered.length).toBeGreaterThan(0);for(const row of result.ordered)expect(scoring.previewR2Hand(aiHandScoreInput(candidate,row.playedIds))).toEqual(formal(state,row.playedIds,draft));
 expect(result.ordered.some(row=>row.type==='high-card')).toBe(false);expect(state).toEqual(before);expect(candidate).toEqual(beforeInput);
 if(hero==='amo')expect(result.ordered.every(row=>assist.every(id=>!row.heldIds.includes(id)&&!row.playedIds.includes(id)))).toBe(true);
});
it('Touye pending new-core wager uses the actual saved refill commit for every preview without choosing a bet',()=>{
 const f=touyeFixture('mature-win'),state=touyeSend(f.state,touyeBet(f.state,f.discard,f.target)),before=structuredClone(state),candidate=input(state);
 expect(candidate.score.touyeWager?.commit).toEqual(state.stage!.touyeWager!.commit);expect(scoring.previewR2Hand(aiHandScoreInput(candidate,f.play))).toEqual(formal(state,f.play));
 const result=rankAiHandCandidates(candidate);expect(result.status).toBe('ready');for(const row of result.ordered)expect(scoring.previewR2Hand(aiHandScoreInput(candidate,row.playedIds))).toEqual(formal(state,row.playedIds));expect(state).toEqual(before);
});
it('Laohuan already-used refill keeps the current contract and never restores the old straight/flush passive',()=>{
 const state=ready('laohuan');state.stage!.laohuanTrickUsed=true;state.handOrder=['spades-4','hearts-5','clubs-6','diamonds-7','hearts-8'];
 const candidate=input(state),before=structuredClone(state),preview=scoring.previewR2Hand(aiHandScoreInput(candidate,state.handOrder));expect(preview).toEqual(formal(state,state.handOrder));
 expect(preview.breakdown.events.some(event=>event.sourceType==='character')).toBe(false);expect(rankAiHandCandidates(candidate).status).toBe('ready');expect(state).toEqual(before);
});
it('explicit cancellation restores default intents and invalidates keys without inventing skills in historical contexts',()=>{
 for(const [hero,draft] of [['amo',{assistIds:assist}],['erxiang',{erxiangTargetId:pair[0]}],['xiemu',{xiemuBurn:10}],['azao',{azaoRelease:true}]] as const){const state=ready(hero),chosen=input(state,draft),cancelled=input(state,{assistIds:[],erxiangTargetId:null,xiemuBurn:0,azaoRelease:false});expect(aiHandKey(chosen)).not.toBe(aiHandKey(cancelled));expect(cancelled.score).toEqual(input(state).score);}
 const historical=input(ready('erxiang'));delete historical.score.erxiangHandoff;expect(aiScoreContext(historical.score,{erxiangTargetId:pair[0]})).not.toHaveProperty('erxiangHandoff');
});
it('B02 recomputes suppression per subset and rejects a zero-point handoff without dropping the choice',()=>{
 const state=ready('erxiang');state.handOrder=['spades-4','hearts-5','clubs-6','diamonds-7','hearts-8'];state.stage!.boss={definitionId:'B02',disabledSuit:null};state.boss=state.stage!.boss;state.stage!.index=2;
 const candidate=input(state,{erxiangTargetId:'diamonds-7'}),request=aiHandScoreInput(candidate,state.handOrder);expect(request.ordinaryPointsSuppressedIds).toEqual(['diamonds-7','hearts-8']);
 expect(()=>scoring.previewR2Hand(request)).toThrow('erxiang-zero-points');expect(rankAiHandCandidates(candidate).status).toBe('unsupported');expect(candidate.score.erxiangHandoff?.targetId).toBe('diamonds-7');
});
it('invalid payments and spent skills fail visibly instead of becoming an unchosen candidate',()=>{
 const spent=input(ready('erxiang'),{erxiangTargetId:pair[0]});spent.score.erxiangHandoff!.beforeUsed=true;expect(rankAiHandCandidates(spent)).toMatchObject({status:'unsupported',reason:expect.stringContaining('erxiang-already-used')});
 const poor=input(ready('xiemu'),{xiemuBurn:10});poor.resources.gold=3;poor.score.xiemuBurn!.goldBefore=3;expect(rankAiHandCandidates(poor)).toMatchObject({status:'unsupported',reason:expect.stringContaining('invalid-score-resources')});
});
it('chosen skills keep random lower-bound comparisons public and cancellation discards stale idle work',async()=>{
 const state=ready('erxiang'),candidate=input(state,{erxiangTargetId:pair[0]});candidate.hand= candidate.hand.map(c=>c.id===pair[0]?{...c,enhancement:'lucky-paper'}:c);
 const before=structuredClone(candidate);Object.defineProperties(candidate,{rng:{get(){throw Error('private RNG');}},drawPile:{get(){throw Error('future deck');}}});
 vi.spyOn(SeededRng,'restore').mockImplementation(()=>{throw Error('restore');});vi.spyOn(SeededRng.prototype,'next').mockImplementation(()=>{throw Error('advance');});
 expect(rankAiHandCandidates(candidate).status).toBe('ready');expect(candidate.hand).toEqual(before.hand);
 vi.useFakeTimers();const cache=new AiHandCandidateCache(),done=vi.fn();cache.update(candidate,done);const cancelled={...candidate,score:aiScoreContext(candidate.score,{erxiangTargetId:null})};cache.update(cancelled,done);await vi.runAllTimersAsync();expect(done).toHaveBeenCalledOnce();expect(cache.result?.key).toBe(aiHandKey(cancelled));cache.dispose();
});
