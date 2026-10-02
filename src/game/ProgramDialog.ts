import {R2_MODE_CATALOG} from '../content/r2Modes';
import type {Action,R2RunState} from '../domain/run';
import {HAND_LABELS} from '../content/handLabels';
import {DetailDialog} from './DetailDialog';

const definitions=R2_MODE_CATALOG.programs;
export function programStatus(state:R2RunState):string {
  const program=state.program;
  if(!program)return '节目单关闭';
  if(program.abandoned)return '本章节目单已放弃';
  if(program.claimed)return '本章节目单已兑现';
  if(!program.selectedId)return program.choiceMade?'本章未接节目单':'本章可接节目单';
  const name=definitions.find(row=>row.id===program.selectedId)!.name;
  return name+' · 压轴过关兑现';
}
function programDescription(id:string):string {
  switch(id){
    case 'PG01':return '本章打出3种不同牌型，压轴过关额外获得4金。';
    case 'PG02':return '本章同一牌型打出3次，压轴过关额外获得4金。';
    case 'PG03':return '压轴赢手的过关奖励发放前持有至少15金，随机升级本章用过的一种牌型。满级牌型不参与。';
    case 'PG04':return '本章任一场用最后一次出牌过关；压轴过关后，下一家商店可免费换牌一次。离店未用即失效。';
    default:throw Error('unknown-program');
  }
}
export function showPrograms(dialog:DetailDialog,state:R2RunState,ready:boolean,send:(action:Action,seq:number)=>Promise<boolean>):void {
  const program=state.program,seq=state.commandSeq;
  if(!program){dialog.open('本章节目单','本局已关闭节目单，正常构筑与过关奖励照常。');return;}
  const usage=Object.entries(state.chapterHandUsage).filter(([,count])=>count!>0)
    .map(([type,count])=>HAND_LABELS[type as keyof typeof HAND_LABELS]+' '+count+'次').join(' · ')||'还未出牌';
  const prefix='第 '+state.chapter+' 章 · '+programStatus(state)+'\n\n';
  if(!program.choiceMade){
    const body=prefix+program.offerIds.map(id=>definitions.find(row=>row.id===id)!.name+'\n'+programDescription(id)).join('\n\n')+'\n\n任选一份，也可不接。第一次实际进场前可选择；接下后只可放弃，不能更换。';
    const canChoose=ready&&['shop','stage-ready'].includes(state.phase);
    const actions=program.offerIds.map(id=>({label:'接受 '+definitions.find(row=>row.id===id)!.name,disabled:!canChoose,
      run:async()=>{if(await send({type:'ChooseProgram',programId:id},seq))dialog.close();}}));
    dialog.open('选一份节目单',body,[...actions,{label:'本章不接',disabled:!canChoose,
      run:async()=>{if(await send({type:'ChooseProgram',programId:null},seq))dialog.close();}}]);return;
  }
  const condition=program.selectedId?programDescription(program.selectedId):'正常演出即可，本章不追节目单目标。';
  const body=prefix+condition+'\n\n本章实际出牌：'+usage+'\n当前金币：'+state.gold+'\n最后机会过关：'+(program.lastOpportunityClear?'已达成':'未达成')+'\n\n跳场不计入条件；暖场、正场达成时不会提前发奖。';
  dialog.open('本章节目单',body,program.selectedId&&!program.abandoned&&!program.claimed?[{
    label:'放弃本章节目单',disabled:!ready||['run-won','run-lost'].includes(state.phase),run:()=>{
      const confirm=dialog.open('放弃节目单','不扣金币，也不影响普通奖励。本章将不能重选节目单。',[{label:'确认放弃',run:async()=>{
        if(await send({type:'AbandonProgram'},seq))dialog.close(confirm);
      }}],{closeLabel:'保留'});
    },
  }]:[]);
}
