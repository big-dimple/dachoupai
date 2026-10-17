import {it,expect,vi} from 'vitest';
import {createRun,applyCommand,type Action,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {showPrograms,programEntryLabel,programPreparationFacts} from '../src/game/ProgramDialog';
import type {DetailDialog} from '../src/game/DetailDialog';
type Button={label:string;disabled?:boolean;run:()=>unknown};
class Dialog {
 current?:{title:string;body:string;actions:Button[];note:{textContent:string;hidden:boolean};querySelectorAll:()=>unknown[];querySelector:()=>unknown};
 open(title:string,body:string,actions:Button[]=[]){const note={textContent:'',hidden:true};return this.current={title,body,actions,note,querySelectorAll:()=>[],querySelector:()=>note};}
 active(modal:unknown){return this.current===modal;}
 close(modal?:unknown){if(!modal||this.active(modal))this.current=undefined;}
}
const asDialog=(d:Dialog)=>d as unknown as DetailDialog;
const fresh=()=>createRun({rulesVersion:'r2',seed:'program-entry',runId:'program-entry',characterId:'touye',r2Identity:newRunIdentity('touye','group'),openingRoute:'group'});
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,{runId:s.runId,commandId:'program/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);return r.state;};
it('cancel leaves a pending program unchanged; accept and decline submit only their actual choice',async()=>{
 for(const accept of [true,false]){let s=fresh();const d=new Dialog(),before=structuredClone(s),dispatch=vi.fn(async(action:Action,seq:number)=>{expect(seq).toBe(s.commandSeq);s=send(s,action);return true;});
  showPrograms(asDialog(d),s,true,dispatch);d.close();expect(s).toEqual(before);expect(dispatch).not.toHaveBeenCalled();expect(programEntryLabel(s)).toContain('待选');
  showPrograms(asDialog(d),s,true,dispatch);const action=d.current!.actions.find(a=>accept?a.label.startsWith('接受'):a.label==='本章不接')!;await action.run();expect(dispatch).toHaveBeenCalledTimes(1);expect(s.program?.choiceMade).toBe(true);expect(!!s.program?.selectedId).toBe(accept);expect(d.current).toBeUndefined();expect(programEntryLabel(s)).toContain(accept?'已接':'本章不接');
 }
});
it('stage-ready can choose, while the first EnterStage seals the choice and stale buttons do nothing',async()=>{
 let s=send(fresh(),{type:'LeaveShop'});const d=new Dialog(),snapshot=s,dispatch=vi.fn(async()=>true);
 showPrograms(asDialog(d),s,true,dispatch,{valid:()=>s===snapshot});expect(d.current!.actions.filter(a=>a.label.startsWith('接受')).every(a=>!a.disabled)).toBe(true);const old=d.current!.actions[0];
 s=send(s,{type:'EnterStage'});await old.run();expect(dispatch).not.toHaveBeenCalled();showPrograms(asDialog(d),s,true,dispatch);expect(d.current!.actions.some(a=>a.label.startsWith('接受'))).toBe(false);expect(programEntryLabel(s)).toContain('本章不接');
});
it('rejection preserves the snapshot and an old completion never closes a replacement dialog',async()=>{
 const s=fresh(),before=structuredClone(s),d=new Dialog();showPrograms(asDialog(d),s,true,async()=>false);await d.current!.actions[0].run();expect(d.current!.note.hidden).toBe(false);expect(s).toEqual(before);
 let finish!:(ok:boolean)=>void;showPrograms(asDialog(d),s,true,()=>new Promise(resolve=>finish=resolve));const pending=d.current!.actions[0].run();const next=d.open('other','');finish(true);await pending;expect(d.current).toBe(next);
});
it('closed programs and challenge bans stay truthful, and abandoning retains its loss confirmation',()=>{
 const s=fresh(),d=new Dialog(),dispatch=vi.fn(async()=>true);s.program=null;showPrograms(asDialog(d),s,true,dispatch);expect(programEntryLabel(s)).toContain('关闭');expect(d.current!.actions).toHaveLength(0);
 s.challengeId='Q11';s.chapterDisabledJokerId='c04';expect(programPreparationFacts(s)).toContain('每章封角');expect(programPreparationFacts(s)).toContain('步步高升');
 const chosen=fresh();chosen.program={...chosen.program!,selectedId:chosen.program!.offerIds[0],choiceMade:true};showPrograms(asDialog(d),chosen,true,dispatch);d.current!.actions.find(a=>a.label==='放弃本章节目单')!.run();expect(d.current!.title).toBe('放弃节目单');d.close();expect(dispatch).not.toHaveBeenCalled();expect(chosen.program.abandoned).toBe(false);
});
