import {expect,it} from 'vitest';
import {applyCommand,createRun} from '../src/domain/run';
import {R2_TOOLS} from '../src/content/r2Tools';
import {toolCardChange,handLevelFacts} from '../src/game/ToolChangePreview';
const tool=(id:string)=>R2_TOOLS.find(t=>t.id===id)!;
it.each(['T03','T08','T09','T11'])('%s preview agrees with a saved tool command and does not mutate its source',id=>{
 const state=createRun({rulesVersion:'r2',seed:'tool-change',runId:'preview/'+id,characterId:'amo'});
 state.consumables=[{instanceId:'owned',definitionId:id}];const card=state.deckInstances.find(c=>c.rank===9&&c.suit==='clubs')!;card.enhancement='heat-paper';card.edition='foil';const before=structuredClone(state),preview=toolCardChange(tool(id),card)!;
 const result=applyCommand(state,{runId:state.runId,commandId:'use',expectedSeq:state.commandSeq,action:{type:'UseConsumable',instanceId:'owned',targetIds:[card.id]}});expect(result.ok).toBe(true);if(!result.ok)return;
 expect(result.state.deckInstances.find(c=>c.id===card.id)).toEqual(preview.after);expect(state).toEqual(before);expect(preview.after?.id).toBe(card.id);expect(preview.after?.edition).toBe('foil');
 if(id==='T11')expect(preview.note).toContain('替换原增强');else expect(preview.after?.enhancement).toBe('heat-paper');
});
it('clamped ranks show unchanged, and unknown random outcomes have no fabricated after face',()=>{
 const card={id:'ace',rank:14 as const,suit:'hearts' as const};expect(toolCardChange(tool('T08'),card)?.label).toBe('不变');expect(toolCardChange(tool('S01'),card)).toBeUndefined();expect(toolCardChange(tool('S02'),card)).toBeUndefined();
});
it('delete never displays a surviving copy, while copying preserves properties without inventing IDs',()=>{
 const card={id:'public',rank:9 as const,suit:'clubs' as const,enhancement:'glass-paper' as const,edition:'foil' as const},before=structuredClone(card);
 expect(toolCardChange(tool('T02'),card)).toMatchObject({before,after:undefined,label:'永久删除'});const copied=toolCardChange(tool('T07'),card)!;expect(copied.after).toEqual(card);expect(copied.label).toBe('复制 ×1');expect(copied.note).toContain('确认后生成');expect(card).toEqual(before);
});
it('upgraded and exchanged levels expose exact base heat and rational multiplier, never final score',()=>{
 expect(handLevelFacts('pair',1)).toEqual({level:1,heat:35,mult:'2'});expect(handLevelFacts('pair',2)).toEqual({level:2,heat:50,mult:'2.5'});expect(handLevelFacts('high-card',1)).toEqual({level:1,heat:20,mult:'1'});
});

it('level-change facts follow actual upgrade and exchange commands rather than a projected score',()=>{
 for(const id of ['T01','S05']){const state=createRun({rulesVersion:'r2',seed:'level-change',runId:'level/'+id,characterId:'amo'});state.consumables=[{instanceId:'level-tool',definitionId:id}];state.handLevels.pair=1;state.handLevels['high-card']=5;
 const result=applyCommand(state,{runId:state.runId,commandId:'upgrade',expectedSeq:state.commandSeq,action:{type:'UseConsumable',instanceId:'level-tool',handType:'pair',...(id==='S05'?{secondaryHandType:'high-card'}:{})}});expect(result.ok).toBe(true);if(!result.ok)return;
 expect(result.state.handLevels.pair).toBe(id==='T01'?2:3);expect(handLevelFacts('pair',result.state.handLevels.pair!)).toEqual(id==='T01'?{level:2,heat:50,mult:'2.5'}:{level:3,heat:65,mult:'3'});if(id==='S05')expect(result.state.handLevels['high-card']).toBe(3);
 }
});
