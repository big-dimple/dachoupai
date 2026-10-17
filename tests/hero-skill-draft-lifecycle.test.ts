import {describe,it,expect} from 'vitest';
import {createRun,type R2RunState} from '../src/domain/run';
import {r2ScoreContext} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {r2SelectionFacts} from '../src/domain/r2SelectionFacts';
import {newRunIdentity} from '../src/game/RunLaunch';
import {retainChosenHeroDraft,type ChosenHeroDraft} from '../src/game/HeroSkillDraftLifecycle';
import {energySend} from '../harness/fixtures/score-energy';
import {liueAttachmentFixture} from '../harness/fixtures/liue-target-attachment';

const empty:ChosenHeroDraft={erxiangTargetId:null,azaoRelease:false,xiemuBurn:0};
function entered(characterId:'azao'|'xiemu'){
  let state=createRun({rulesVersion:'r2',runId:'draft-test/'+characterId,seed:'draft-test',characterId,r2Identity:newRunIdentity(characterId,'group'),openingRoute:'group'});
  state=energySend(energySend(state,{type:'LeaveShop'}),{type:'EnterStage'});
  state.handOrder=['clubs-6','hearts-6','clubs-5','hearts-5','spades-2','hearts-3','diamonds-4','diamonds-8'];
  state.drawPile=state.deckInstances.map(c=>c.id).filter(id=>!state.handOrder.includes(id));return state;
}
function facts(state:R2RunState,selectedIds:string[]){const hand=state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!),context=r2ScoreContext(state,hand,selectedIds);return r2SelectionFacts({hand,selectedIds,disabledIds:state.stage!.disabledIds,jokers:state.jokers,definitions:r2JokerDefinitionsFor(state),handRules:context.handRules,ordinaryPointsSuppressedIds:context.ordinaryPointsSuppressedIds});}

describe('adopting another hand keeps only existing valid hero choices',()=>{
  it('keeps the actual Liu E core across a compatible AI hand and consumes that same instance',()=>{
    const f=liueAttachmentFixture(),ids=['spades-2','hearts-3','diamonds-4','clubs-5',f.targetId],before=structuredClone(f.state);
    const draft=retainChosenHeroDraft(f.state,facts(f.state,ids),{...empty,erxiangTargetId:f.targetId});
    expect(draft.erxiangTargetId).toBe(f.targetId);expect(f.state).toEqual(before);
    const after=energySend(f.state,{type:'PlayHand',selectedIds:ids,erxiangTargetId:draft.erxiangTargetId!});expect(after.lastTrace!.erxiangHandoff?.targetId).toBe(f.targetId);
  });
  it('clears a removed, non-core or already-used Liu E target without choosing a replacement',()=>{
    const f=liueAttachmentFixture(),chosen={...empty,erxiangTargetId:f.targetId};
    expect(retainChosenHeroDraft(f.state,facts(f.state,['spades-2','hearts-3']),chosen)).toEqual(empty);
    expect(retainChosenHeroDraft(f.state,facts(f.state,[f.otherId]),chosen)).toEqual(empty);
    f.state.stage!.erxiangHandoffUsed=true;expect(retainChosenHeroDraft(f.state,facts(f.state,f.selectedIds),chosen)).toEqual(empty);
  });
  it('preserves an already-chosen valid release, but clears it for an incompatible hand or empty charge',()=>{
    const state=entered('azao'),ids=state.handOrder.slice(0,4);state.stage!.azaoCharge={charge:2,previousQualifiedType:'straight'};
    const draft=retainChosenHeroDraft(state,facts(state,ids),{...empty,azaoRelease:true});expect(draft.azaoRelease).toBe(true);
    expect(energySend(state,{type:'PlayHand',selectedIds:ids,azaoRelease:draft.azaoRelease}).lastTrace!.azaoCharge?.release).toBe(true);
    expect(retainChosenHeroDraft(state,facts(state,ids.slice(0,2)),draft).azaoRelease).toBe(false);
    state.stage!.azaoCharge.charge=0;expect(retainChosenHeroDraft(state,facts(state,ids),draft).azaoRelease).toBe(false);
  });
  it('preserves the explicit affordable payment and never silently lowers an invalid tier',()=>{
    const state=entered('xiemu'),ids=state.handOrder.slice(0,4);state.gold=20;const before=structuredClone(state),chosen={...empty,xiemuBurn:20 as const};
    const draft=retainChosenHeroDraft(state,facts(state,ids),chosen);expect(draft.xiemuBurn).toBe(20);expect(state).toEqual(before);
    const trace=energySend(state,{type:'PlayHand',selectedIds:ids,xiemuBurn:draft.xiemuBurn as 20}).lastTrace!.xiemuBurn!;expect(trace.cost).toBe(20);expect(trace.goldBefore-trace.goldAfter).toBe(20);
    state.gold=19;expect(retainChosenHeroDraft(state,facts(state,ids),chosen).xiemuBurn).toBe(0);state.gold=20;
    expect(retainChosenHeroDraft(state,facts(state,ids.slice(0,2)),chosen).xiemuBurn).toBe(0);
  });
  it('never invents an unchosen target, release or payment, including when abilities become available',()=>{
    const f=liueAttachmentFixture();expect(retainChosenHeroDraft(f.state,facts(f.state,f.selectedIds),empty)).toEqual(empty);
    for(const hero of ['azao','xiemu'] as const){const state=entered(hero);state.gold=30;if(hero==='azao')state.stage!.azaoCharge={charge:3,previousQualifiedType:'straight'};expect(retainChosenHeroDraft(state,facts(state,state.handOrder.slice(0,4)),empty)).toEqual(empty);expect(retainChosenHeroDraft(state,undefined,{...empty,azaoRelease:true,xiemuBurn:20})).toEqual(empty);}
  });
});
