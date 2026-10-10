import {expect,it} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {savedToolFacts} from '../src/game/SavedToolResult';
import {toolPurpose,routeFitCue} from '../src/game/RouteFitCue';
const start=()=>createRun({rulesVersion:'r2',seed:'tool-result',runId:'tool-result',characterId:'erxiang',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
const send=(state:R2RunState,action:Action)=>{const r=applyCommand(state,{runId:state.runId,commandId:'result/'+state.commandSeq,expectedSeq:state.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
it('sacrifice result projects actual independent enhancements and one permanent removal from a saved command',()=>{
 const before=start();before.consumables=[{instanceId:'sacrifice',definitionId:'S01'}];const [donor,a,b]=before.deckInstances;a.edition='foil';b.edition='holographic';
 const snapshot=structuredClone(before),action={type:'UseConsumable' as const,instanceId:'sacrifice',sacrificeId:donor.id,targetIds:[a.id,b.id]},after=send(before,action),facts=savedToolFacts(before,after,action)!;
 expect(before).toEqual(snapshot);expect(facts.deckAfter).toBe(facts.deckBefore-1);expect(facts.sacrifice?.before).toEqual(donor);expect(facts.sacrifice?.after).toBeUndefined();expect(facts.beneficiaries).toHaveLength(2);
 for(const change of facts.beneficiaries){expect(change.after).toEqual(after.deckInstances.find(c=>c.id===change.before.id));expect(change.after?.enhancement).toBeTruthy();expect(change.after?.rank).toBe(change.before.rank);expect(change.after?.suit).toBe(change.before.suit);expect(change.after?.edition).toBe(change.before.edition);}
 expect(savedToolFacts(before,before,action)).toBeUndefined();expect(savedToolFacts(after,after,action)).toBeUndefined();expect(savedToolFacts(before,{...after,commandSeq:after.commandSeq+1},action)).toBeUndefined();
});
it('all deterministic enhancement replacements report each actual card and preserve its other properties',()=>{
 for(const id of ['T10','T11','T12','T13','T14','T15','T19']){const before=start(),item='owned/'+id;before.consumables=[{instanceId:item,definitionId:id}];const card=before.deckInstances[0];card.enhancement=id==='T10'?'multiplier-paper':'heat-paper';card.edition='foil';const action={type:'UseConsumable' as const,instanceId:item,targetIds:[card.id]},after=send(before,action),facts=savedToolFacts(before,after,action)!;
 expect(facts.changes).toHaveLength(1);expect(facts.changes[0].after).toEqual(after.deckInstances[0]);expect(facts.changes[0].after).toMatchObject({rank:card.rank,suit:card.suit,edition:'foil'});expect(facts.changes[0].note).toContain('→');}
});
it('resource results describe saved gold or discard changes without inventing changed card faces',()=>{
 const before=start();before.consumables=[{instanceId:'gold',definitionId:'T16'}];const action={type:'UseConsumable' as const,instanceId:'gold',targetIds:[]},after=send(before,action),facts=savedToolFacts(before,after,action)!;
 expect(facts.goldAfter).toBeGreaterThan(facts.goldBefore);expect(facts.changes).toEqual([]);expect(facts.added).toEqual([]);
});
it('purpose follows actual operations and distinguishes held from scoring enhancements',()=>{
 const state=start();expect(toolPurpose(state,'T08')).toContain('不必等复制');expect(toolPurpose(state,'T11')).toContain('对子');expect(toolPurpose(state,'T13')).toContain('留在手中');expect(routeFitCue(state,'tools','S01')?.focus).toBe('group');expect(routeFitCue(state,'tools','T11')?.label).toBe('契合同点成组路线');
});
it('route wording keeps the actual fit predicate and excludes neutral items',()=>{
 const state=start();expect(routeFitCue(state,'items','U01')).toBeUndefined();
 expect(routeFitCue(state,'tools','T08')?.label).toBe('契合同点成组路线');
});
