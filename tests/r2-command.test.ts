import { describe, expect, it } from 'vitest';
import { applyCommand, createRun, stateHash, type Command, type R2RunState } from '../src/domain/run';
import { scoreR2Hand, previewR2Hand } from '../src/domain/scoreR2';
import { R2_JOKERS } from '../src/content/r2Schema';

const started = (characterId: 'amo'|'touye'|'xiemu' = 'amo') => createRun({ seed:'r2-command',characterId,runId:'r2-fixture',rulesVersion:'r2' });
function table(characterId?: 'amo'|'touye'|'xiemu') {
  const shop = started(characterId);
  const leave=applyCommand(shop,{runId:shop.runId,commandId:'leave',expectedSeq:shop.commandSeq,action:{type:'LeaveShop'}});
  if(!leave.ok)throw new Error(leave.code);
  const run = leave.state;
  const result = applyCommand(run, {runId:run.runId,commandId:'enter',expectedSeq:run.commandSeq,action:{type:'EnterStage'}});
  if (!result.ok) throw new Error(result.code);
  return result.state;
}
describe('explicit r2 commands, G10–G14', () => {
  it('isolates r1/r2 versions and rejects mismatched content hashes', () => {
    const old = createRun({seed:'r2-command',characterId:'amo',runId:'r1-fixture'});
    const run = started();
    expect(old.rulesVersion).toBe('r1');
    expect(run.rulesVersion).toBe('r2');
    expect(run.schemaVersion).toBe(2);
    expect(run.contentHash).not.toBe(old.contentHash);
    const wrong = {...run,contentHash:old.contentHash};
    const result = applyCommand(wrong,{runId:run.runId,commandId:'bad-version',expectedSeq:run.commandSeq,action:{type:'EnterStage'}});
    expect(result.ok).toBe(false);
    expect(result.state).toBe(wrong);
  });
  it('G10/G13 clears on the fourth hand, then never repeats score/resource/reward effects', () => {
    const run = table('xiemu');
    run.stage!.handsLeft = 1;run.stage!.playIndex=3;run.stage!.previousHandType='high-card';
    const card = run.deckInstances.find(c=>c.id===run.handOrder[0])!;
    const expected = 2 * (20 + (card.rank===14 ? 11 : Math.min(card.rank,10)));
    run.stage!.heat = String(BigInt(run.stage!.targetHeat)-BigInt(expected)); // Last-hand boundary at the unchanged contractual target.
    const command:Command = {runId:run.runId,commandId:'last-hand',expectedSeq:run.commandSeq,action:{type:'PlayHand',selectedIds:[card.id]}};
    const result = applyCommand(run,command);
    if (!result.ok) throw new Error(result.code);
    expect(result.state.phase).toBe('stage-cleared');
    expect(result.state.stage?.heat).toBe('400');expect(result.state.lastTrace?.finalScore).toBe(String(expected));
    expect(result.state.stage?.handsLeft).toBe(0);
    expect(result.state.gold).toBe(13); // base 4 + interest 1 + xiemu 2, no unused hands.
    expect(result.state.stage?.goldEarned).toBe(7);
    expect(result.state.handOrder).toHaveLength(7); // Success does not draw extra cards.
    expect(result.state.playedPile).toEqual([card.id]);
    const retry = applyCommand(result.state,command);
    expect(retry.ok && retry.duplicate).toBe(true);
    expect(retry.state).toBe(result.state);
    if (retry.ok) expect(retry.events).toEqual([]);
    const again = applyCommand(result.state,{...command,commandId:'later',expectedSeq:result.state.commandSeq});
    expect(again.ok).toBe(false);
    expect(again.state).toBe(result.state);
  });
  it('G11/G12 makes 100 public previews without reading RNG, then exactly replays a wager', () => {
    let run = table('touye');
    const wager = applyCommand(run,{runId:run.runId,commandId:'choose-wager',expectedSeq:run.commandSeq,action:{type:'SetWager',enabled:true}});
    if (!wager.ok) throw new Error(wager.code);
    run = wager.state;
    const command:Command = {runId:run.runId,commandId:'wager-play',expectedSeq:run.commandSeq,action:{type:'PlayHand',selectedIds:[run.handOrder[0]]}};
    const input = {rulesVersion:'r2' as const,runId:run.runId,rootId:`${run.runId}/hand/${command.commandId}`,characterId:run.characterId,
      hand:run.handOrder.map(id=>run.deckInstances.find(c=>c.id===id)!),selectedIds:command.action.type==='PlayHand'?command.action.selectedIds:[],
      disabledIds:[],jokers:run.jokers,definitions:R2_JOKERS,handLevels:run.handLevels,playIndex:1,handsBeforePlay:4,previousHandType:null,wager:true};
    const checkpoint = JSON.stringify(run);
    for(let i=0;i<100;i++) {
      const preview = previewR2Hand(input); // API has no real rule RNG parameter.
      expect(preview.possibleScores).toHaveLength(2);
      expect(preview).not.toHaveProperty('rng');
    }
    expect(JSON.stringify(run)).toBe(checkpoint);
    const pure = scoreR2Hand({...input,rng:run.rng.rule});
    const first = applyCommand(run,command), replay = applyCommand(JSON.parse(checkpoint) as R2RunState,command);
    if (!first.ok || !replay.ok) throw new Error('r2 play rejected');
    expect(first.state.lastTrace).toEqual(pure);
    expect(first.state.lastTrace?.events).toEqual(replay.state.lastTrace?.events);
    expect(first.state.rng).toEqual(replay.state.rng);
    expect(stateHash(first.state)).toBe(stateHash(replay.state));
    expect(first.state.stage?.wagerUsed).toBe(true);
    expect(first.state.stage?.wagerSelected).toBe(false);
    const again = applyCommand(first.state,{runId:run.runId,commandId:'wager-again',expectedSeq:first.state.commandSeq,action:{type:'SetWager',enabled:true}});
    expect(again.ok).toBe(false);
    expect(again.state).toBe(first.state);
  });
  it('G14 invalid and duplicate IDs reject without consuming a wager or RNG', () => {
    const run = table('touye');
    const checkpoint=JSON.stringify(run);
    for(const selectedIds of [[run.handOrder[0],run.handOrder[0]],['unknown']]) {
      const result=applyCommand(run,{runId:run.runId,commandId:'invalid',expectedSeq:run.commandSeq,action:{type:'PlayHand',selectedIds}});
      expect(result.ok).toBe(false);expect(result.state).toBe(run);
      expect(JSON.stringify(run)).toBe(checkpoint);
    }
  });
  it('rolls back numeric overflow with recoverable diagnostics instead of zero/Infinity',()=>{
    const run=table();run.stage!.heat='9'.repeat(4096);run.stage!.targetHeat='9'.repeat(4096);
    const before=JSON.stringify(run);
    const result=applyCommand(run,{runId:run.runId,commandId:'overflow',expectedSeq:run.commandSeq,action:{type:'PlayHand',selectedIds:[run.handOrder[0]]}});
    expect(result.ok).toBe(false);expect(result.state).toBe(run);
    if(!result.ok){expect(result.code).toBe('score-diagnostic');expect(result.diagnostic?.code).toBe('numeric-length-limit');expect(result.diagnostic?.events.length).toBeGreaterThan(0);}
    expect(JSON.stringify(run)).toBe(before);
  });
});
