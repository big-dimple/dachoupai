import {R2_MODE_CATALOG} from '../content/r2Modes';
import type {Action,R2RunState} from '../domain/run';
import {HAND_LABELS} from '../content/handLabels';
import {DetailDialog} from './DetailDialog';
import {cardDisplayName} from './tangsongCardNames';

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
export function programEntryLabel(state:R2RunState):string {
  const p=state.program;return !p?'节目单 · 关闭':!p.choiceMade?'节目单 · 待选':p.abandoned?'节目单 · 已放弃':p.claimed?'节目单 · 已兑现':p.selectedId?'节目单 · 已接':'节目单 · 本章不接';
}
export function programPreparationFacts(state:R2RunState):string {
  const challenge=R2_MODE_CATALOG.challenges.find(row=>row.id===state.challengeId);
  return [challenge?'挑战 · '+challenge.name+'：'+challenge.description:'',state.chapterDisabledJokerId?'本章封角 · 「'+cardDisplayName(state.chapterDisabledJokerId)+'」计分与版次停用；其他效果按条件执行。':''].filter(Boolean).join('\n');
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
export function showPrograms(dialog:DetailDialog,state:R2RunState,ready:boolean,send:(action:Action,seq:number)=>Promise<boolean>,options:{directory?:()=>void;valid?:()=>boolean}={}):void {
  const program=state.program,seq=state.commandSeq;
  const extra=options.directory?[{label:'本章对手与规则',run:options.directory}]:[],facts=programPreparationFacts(state),valid=()=>options.valid?.()??true;
  if(!program){dialog.open('本章节目单','本局已关闭节目单，普通奖励照常。'+(facts?'\n\n'+facts:''),extra);return;}
  const usage=Object.entries(state.chapterHandUsage).filter(([,count])=>count!>0)
    .map(([type,count])=>HAND_LABELS[type as keyof typeof HAND_LABELS]+' '+count+'次').join(' · ')||'还未出牌';
  const prefix='第 '+state.chapter+' 章 · '+programStatus(state)+(facts?'\n'+facts:'')+'\n\n';
  if(!program.choiceMade){
    const canChoose=ready&&['shop','stage-ready'].includes(state.phase);
    const body=prefix+program.offerIds.map(id=>definitions.find(row=>row.id===id)!.name+'\n'+programDescription(id)).join('\n\n')+'\n\n'+(canChoose?'任选一份，也可不接；首次进场后封口。接下后只能放弃。':'当前不能选择节目单；首次进场后封口。');
    let busy=false;
    const failed=()=>{const note=modal.querySelector<HTMLElement>('.dialog-status');if(note){note.textContent='选择未完成，请返回查看当前状态；保存暂停可在菜单重试。';note.hidden=false;}};
    const choose=async(programId:typeof program.selectedId)=>{
      if(busy||!canChoose||!valid()||!dialog.active(modal))return;
      busy=true;modal.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=true);
      try{if(await send({type:'ChooseProgram',programId},seq)){dialog.close(modal);return;}failed();}catch{if(dialog.active(modal))failed();}
      finally{busy=false;if(dialog.active(modal))modal.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=button.classList.contains('dialog-close')?false:!valid());}
    };
    const actions=program.offerIds.map(id=>({label:'接受 '+definitions.find(row=>row.id===id)!.name,disabled:!canChoose,
      run:()=>choose(id)}));
    const modal=dialog.open('本章节目单',body,[...actions,{label:'本章不接',disabled:!canChoose,run:()=>choose(null)},...extra],{closeLabel:'暂不选择'});return;
  }
  const condition=program.selectedId?programDescription(program.selectedId):'正常演出即可，本章不追节目单目标。';
  const body=prefix+condition+'\n\n本章实际出牌：'+usage+'\n当前金币：'+state.gold+'\n最后机会过关：'+(program.lastOpportunityClear?'已达成':'未达成')+'\n\n跳场不计入条件；暖场、正场达成时不会提前发奖。';
  dialog.open('本章节目单',body,[...(program.selectedId&&!program.abandoned&&!program.claimed?[{
    label:'放弃本章节目单',disabled:!ready||['run-won','run-lost'].includes(state.phase),run:()=>{
      const confirm=dialog.open('放弃节目单','不扣金币，也不影响普通奖励。本章将不能重选节目单。',[{label:'确认放弃',run:async()=>{
        if(valid()&&dialog.active(confirm)&&await send({type:'AbandonProgram'},seq))dialog.close(confirm);
      }}],{closeLabel:'保留'});
    },
  }]:[]),...extra]);
}
