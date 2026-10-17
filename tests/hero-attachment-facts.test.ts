import {it,expect} from 'vitest';
import {heroAttachmentFixture} from '../harness/fixtures/hero-attachments';
import {energySend} from '../harness/fixtures/score-energy';
import {savedHeroAttachment} from '../src/game/HeroAttachmentFacts';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {HeroTargetAttachmentState} from '../src/game/HeroTargetAttachmentState';

it.each(['amo','erxiang','azao','xiemu','touye','laohuan'] as const)('%s projects only its actual saved target identity',hero=>{
  const f=heroAttachmentFixture(hero);expect(readCheckpoint(makeCheckpoint(f.state,[])).ok).toBe(true);
  const after=energySend(f.state,f.action),before=JSON.stringify(after);
  if(hero==='laohuan'){expect(after.handOrder.filter(id=>!f.state.handOrder.includes(id))).toEqual(f.selectedIds);expect(after.lastTrace).toEqual(f.state.lastTrace);return;}
  const trace=after.lastTrace!,cue=savedHeroAttachment(trace,hero)!;expect(cue).toBeDefined();
  if(hero==='amo'||hero==='erxiang')expect(cue.targetIds).toEqual(f.targetIds);
  if(hero==='azao'||hero==='xiemu')expect(cue.targetIds).toEqual(trace.sets.activeScoringIds);
  if(hero==='touye'){expect(cue.targetIds).toEqual(trace.touyeWager!.core!.activeNewIds);expect(cue.targetIds).toEqual(['clubs-8']);expect(cue.targetIds).not.toEqual(f.targetIds);}
  expect(savedHeroAttachment(trace,hero==='amo'?'erxiang':'amo')).toBeUndefined();expect(JSON.stringify(after)).toBe(before);
});
it('a losing wager fades pending ownership without inventing credited new cards or a positive receipt',()=>{
  const f=heroAttachmentFixture('touye'),after=energySend(f.state,{type:'PlayHand',selectedIds:['diamonds-6']}),trace=after.lastTrace!,cue=savedHeroAttachment(trace,'touye')!;
  expect(trace.touyeWager!.outcome).toBe('lost');expect(cue.targetIds).toBeUndefined();expect(cue.event.reasonKey).toContain('touye.lost.');
  const state=new HeroTargetAttachmentState(),ctx={generation:1,signal:new AbortController().signal};state.preview({key:'saved-bet',targetId:f.targetIds[0],targetIds:f.targetIds,kind:'wager',releaseReason:'touye.'});state.consume(f.targetIds[0],cue.event.eventId,ctx);expect(state.release(cue.event,ctx)).toBe(true);expect(state.value).toMatchObject({failed:true,resolvedLabel:'未成'});
});
