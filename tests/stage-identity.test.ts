import {describe,expect,it} from 'vitest';
import {SUITS,SUIT_SYMBOL} from '../src/cards/types';
import {createRun,applyCommand,assertRunInvariants,type R2RunState,type Action} from '../src/domain/run';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {newRunIdentity} from '../src/game/RunLaunch';
import {stageNotice} from '../src/game/stageNotice';
import {bossIdentity,bossScope,stageIdentity,stageSuitLabel} from '../src/game/StageIdentity';

function send(state:R2RunState,action:Action):R2RunState {
 const result=applyCommand(state,{runId:state.runId,commandId:state.runId+'/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});
 if(!result.ok)throw Error(result.code);assertRunInvariants(result.state);return result.state;
}
describe('locked Boss identity across preview, entry and recovery',()=>{
 it.each(SUITS)('%s remains exactly the announced parameter through shop and restored entry',suit=>{
  let run=createRun({seed:'stage-identity-fixed',runId:'identity/'+suit,characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  run=send(send(send(run,{type:'LeaveShop'}),{type:'SkipStage'}),{type:'OpenShop'});
  run=send(send(run,{type:'LeaveShop'}),{type:'SkipStage'});
  // Explicit valid controlled plan; no claim of natural suit acquisition or seed reproduction.
  run.boss={definitionId:'B03',disabledSuit:suit};run.seenBossIds=['B03'];
  const before=JSON.stringify(run),ruleCursor=structuredClone(run.rng.rule),preview=stageIdentity(run.stageIndex,run.boss)!;
  expect(preview.title).toContain(stageSuitLabel(suit));expect(preview.title).toContain(SUIT_SYMBOL[suit]);expect(JSON.stringify(run)).toBe(before);
  run=send(send(send(run,{type:'OpenShop'}),{type:'LeaveShop'}),{type:'EnterStage'});
  expect(run.stage!.boss).toEqual({definitionId:'B03',disabledSuit:suit});expect(run.rng.rule).toEqual(ruleCursor);
  const restored=readCheckpoint(makeCheckpoint(run,[]));expect(restored.ok).toBe(true);if(!restored.ok)throw Error(restored.code);
  expect(stageIdentity(restored.checkpoint.state.stage!.index,restored.checkpoint.state.stage!.boss)!.title).toBe(preview.title);
  expect(stageNotice(restored.checkpoint.state)!.description).toContain(stageSuitLabel(suit));
  expect(stageNotice(restored.checkpoint.state)!.disabledCardIds).toEqual(run.handOrder.filter(id=>run.deckInstances.find(c=>c.id===id)!.suit===suit));
 });
 it('ordinary stages never inherit a chapter Boss restriction',()=>{
  expect(stageIdentity(1,{definitionId:'B03',disabledSuit:'clubs'})).toMatchObject({title:'正场',isBoss:false,scope:'按当前牌型与来源正常计分'});
 });
 it('retains ordinary-point-only scope separately from card scoring failure',()=>{
  expect(bossScope({definitionId:'B02',disabledSuit:null})).toBe('第4/5张仅普通点数0；仍成型、触发大丑牌');
  expect(bossScope({definitionId:'B03',disabledSuit:'clubs'})).toContain('不加点数或计分牌效果');
 });
 it('uses the completed stage snapshot even after the next chapter plan changes',()=>{
  const old={definitionId:'B03',disabledSuit:'hearts'} as const,next={definitionId:'B03',disabledSuit:'clubs'} as const;
  expect(stageIdentity(17,old)!.title).toBe(bossIdentity(old));expect(stageIdentity(20,next)!.title).toBe(bossIdentity(next));
  expect(stageIdentity(24,null,'endless')!.stageName).toContain('第 9 章');expect(stageIdentity(24,null)).toBeUndefined();
 });
});
