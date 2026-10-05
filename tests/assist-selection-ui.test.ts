import {expect,it} from 'vitest';
import {assistCandidates,validAssistDraft} from '../src/game/AssistSelection';
import {createRun,applyCommand} from '../src/domain/run';
import {r2AssistAvailability} from '../src/domain/r2Assist';
import {R2_JOKERS} from '../src/content/r2Schema';
const main=['spades-9','hearts-9','clubs-13','diamonds-13'],side=['spades-12','hearts-12','clubs-12'];
function fixture(){
 let state=createRun({seed:'assist-ui',runId:'assist-ui',characterId:'amo',rulesVersion:'r2',r2Profile:'amo-assist-v1'});
 for(const type of ['LeaveShop','EnterStage'] as const){const result=applyCommand(state,{runId:state.runId,commandId:type,expectedSeq:state.commandSeq,action:{type}});if(!result.ok)throw Error(result.code);state=result.state;}
 const hand=[...main,...side,'clubs-6','diamonds-7'].map(id=>state.deckInstances.find(c=>c.id===id)!);
 return {state,input:{hand,selectedIds:main,jokers:[],definitions:R2_JOKERS,disabledIds:[] as string[]}};
}
it('lists distinct visible remainder pairs and three-kind without mutating complete run or selection',()=>{
 const {state,input}=fixture(),before=JSON.stringify({state,input});
 const rows=assistCandidates(input,r2AssistAvailability(state).available);
 expect(rows.map(row=>row.assistIds)).toEqual([side.slice(0,2),side, [side[0],side[2]],side.slice(1)]);
 expect(rows.map(row=>row.assistMultiplier)).toEqual([2,4,2,2]);expect(JSON.stringify({state,input})).toBe(before);
 expect(rows[1].heldIds).toEqual(['clubs-6','diamonds-7']);expect(rows[1].playedIds).toEqual(main);
});
it('never offers unavailable, disabled, overlapping or unqualified groups',()=>{
 const {input}=fixture();expect(assistCandidates(input,false)).toEqual([]);
 expect(assistCandidates({...input,disabledIds:side},true)).toEqual([]);
 expect(assistCandidates({...input,selectedIds:main.slice(0,2)},true)).toEqual([]);
 expect(validAssistDraft(input,true,[main[0],side[0]])).toBeUndefined();
 expect(validAssistDraft(input,true,[side[0],'hidden-next-card'])).toBeUndefined();
});
it('manual main edits retain a still-valid group and reject conflicts or a lower main type',()=>{
 const {input}=fixture(),draft=side.slice(0,2);
 expect(validAssistDraft({...input,selectedIds:[...main,'clubs-6']},true,draft)?.assistIds).toEqual(draft);
 expect(validAssistDraft({...input,selectedIds:[...main,side[0]]},true,draft)).toBeUndefined();
 expect(validAssistDraft({...input,selectedIds:main.slice(0,2)},true,draft)).toBeUndefined();
});
