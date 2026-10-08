import type {ScoreEvent,ScorePreview} from '../domain/scoreR2';
import {HAND_LABELS} from '../content/handLabels';

export interface CardAbilityCopy {
  condition:string;value:string;state?:string;flavor:string;rules:string;
  /** Central player copy: main sentence first, decision limits always visible. */
  playerCopy?:boolean;
  plain?:import('./JokerPlainCopy').JokerPlainCopy;
  summary:string;compact:string;narrow:string;benefit:string;
  /** Actual ledger activity; absent without a ledger, except a known scoring ban. */
  bodyActive?:boolean;editionActive?:boolean;
}
export interface CardAbilityContext {
  gold:number;discardsUsed?:number;inStage?:boolean;disabledReason?:string;
  /** Successfully completed plays in this stage; the prospective play is playIndex + 1. */
  playIndex?:number;selectedCount?:number;instanceId?:string;
  preview?:ScorePreview;events?:readonly ScoreEvent[];
}
interface SampleCopy extends Omit<CardAbilityCopy,'bodyActive'|'editionActive'|'state'> {
  operation:'add-heat'|'add-multiplier'|'multiply-multiplier';
}
const samples:Record<string,SampleCopy>={
  f09:{condition:'这场还没成功弃牌？',value:'整手倍率 ×1.5',benefit:'倍率×1.5',summary:'这场没弃过牌，整手倍率×1.5',compact:'不弃×1.5',narrow:'×1.5',operation:'multiply-multiplier',
    flavor:'稿子不换，好戏照演。',rules:'每次出牌时，只要本场成功弃牌次数为0，整手倍率乘1.5。成功弃牌后，本场不再获得本体×1.5；特殊版次仍正常结算。返还弃牌次数也不能恢复本体资格，下一场重新判定。Boss计分封禁时，本体与版次均不计分。'},
  f04:{condition:'出牌开始时只剩 3 金币或更少？',value:'整手倍率 +3',benefit:'倍率+3',summary:'出牌时不超过3金，整手倍率+3',compact:'≤3金+3',narrow:'+3倍',operation:'add-multiplier',
    flavor:'钱包躺平，倍率上班。',rules:'本次出牌开始时金币≤3，整手倍率加3，不是乘3。读取本手开始时的金币快照；本手幸运牌等收入不会改变本手资格。之后的出牌按那一手开始时的金币重新判断。'},
  a03:{condition:'这手只打出 1 张牌？',value:'整手热度 +35',benefit:'热度+35',summary:'只出1张牌，整手热度+35',compact:'单张+35',narrow:'+35热',operation:'add-heat',
    flavor:'一张牌，也能独占舞台。',rules:'实际打出的牌恰好1张时，整手热度加35。看打出张数，不是参与计分的张数；打出多张高牌，即使只有一张提供点数，也不触发。本体每手判断一次，扑克重触发不重复整手能力。'},
  pengci:{condition:'这手牌型是高牌？',value:'整手倍率 +2',benefit:'倍率+2',summary:'打出高牌，整手倍率+2',compact:'高牌+2',narrow:'+2倍',operation:'add-multiplier',
    flavor:'牌型不凑巧，倍率来帮忙。',rules:'按实际打出牌组判定，牌型为高牌时，整手倍率加2。高牌不等于只打1张：打出多张但未组成更高牌型，也可能是高牌。读取正式牌型判定，不按有几张牌参与计分猜测。'},
  huimaqiang:{condition:'轮到本场第 3、6、9… 次出牌？',value:'整手倍率 ×2',benefit:'倍率×2',summary:'本场每第3手，整手倍率×2',compact:'每3手×2',narrow:'×2',operation:'multiply-multiplier',
    flavor:'好戏每到第三手，再杀个回马枪。',rules:'本场第3、6、9…次成功出牌时，整手倍率乘2。当前将要出的是已完成次数加1；弃牌不推进出牌序号，返还出牌机会也不回退序号。进入下一场从第1次重新计数。'},
};

/** Five curated presentations; actual hand activity comes from the shared public/recorded ledger. */
export function cardAbilityCopy(id:string,context:CardAbilityContext):CardAbilityCopy|undefined {
  const sample=samples[id];if(!sample)return undefined;
  const {operation,...copy}=sample,result:CardAbilityCopy={...copy};
  const ledger=context.events??context.preview?.breakdown.events;
  if(ledger&&context.instanceId){
    const own=ledger.filter(event=>event.phase==='jokerScore'&&event.sourceType==='joker'&&event.sourceDefinitionId===id&&event.sourceInstanceId===context.instanceId);
    result.bodyActive=own.some(event=>event.operation===operation&&event.reasonKey===`${id}.${operation}`);
    result.editionActive=own.some(event=>event.reasonKey.startsWith('edition.'));
  }
  if(context.disabledReason){
    return {...result,condition:'本场计分被封禁',value:'本体与版次均不计分',state:context.disabledReason,compact:'计分封禁',narrow:'封禁',bodyActive:false,editionActive:false};
  }
  // A shop may still carry the previous stage in the save; its counters are not a promise for the next stage.
  if(!context.inStage){
    result.state=id==='f04'?`现在 ${context.gold} 金币 · ${context.gold<=3?'满足条件':'尚未满足'}，以出牌开始时为准`
      :id==='f09'?'进场后，守住不弃牌就生效':id==='huimaqiang'?'每场重新计数 · 第3、6、9…次出牌触发':'进场选牌后判断';
    return result;
  }
  if(id==='f09'){
    if((context.discardsUsed??0)>0){result.condition='已弃牌';result.value='本场不再×1.5';result.state='本体下场恢复 · 特殊版次仍正常结算';result.compact='不再×1.5';result.narrow='已弃';}
    else {result.state='每次出牌都能触发';result.compact='未弃×1.5';}
  }else if(id==='f04'){
    result.state=`现在 ${context.gold} 金币 · ${context.gold<=3?'满足条件':'尚未满足'}，以出牌开始时为准`;
    result.compact=context.gold<=3?'≤3金+3倍':'金币未满足';result.narrow=context.gold<=3?sample.narrow:'未触发';
  }else if(id==='huimaqiang'){
    if(context.playIndex===undefined){result.state='按本场出牌次数判断';result.compact='等待出牌次数';result.narrow='待定';}
    else {
      const next=context.playIndex+1,target=Math.ceil(next/3)*3;
      result.state=`下一手是本场第 ${next} 次出牌 · ${next===target?'本体倍率×2':`第 ${target} 次触发倍率×2`}`;
      result.compact=next===target?`第${next}手×2`:`待第${target}手`;result.narrow=next===target?sample.narrow:`待${target}`;
    }
  }else {result.state='选牌后判断';result.compact='待选牌';result.narrow='待选';}
  if(result.bodyActive!==undefined){
    if(result.bodyActive){result.condition=sample.condition;result.value=sample.value;result.state=context.events?'本手已触发':'本手会触发';result.compact='本手'+sample.narrow;result.narrow=sample.narrow;}
    else if(!(id==='f09'&&!context.events&&(context.discardsUsed??0)>0)){
      if(context.events){result.condition=sample.condition;result.value=sample.value;}
      result.state='本手未触发本体';result.compact='本手未触发';result.narrow='未触发';
      // Explain current selection only with a preview, never post-hand values paired with a recorded trace.
      if(!context.events&&context.preview){
        if(id==='a03')result.state=`本手打出 ${context.preview.sets.playedIds.length} 张 · 需要恰好 1 张`;
        if(id==='pengci')result.state=`本手牌型：${HAND_LABELS[context.preview.handType]} · 需要高牌`;
        if(id==='f04')result.state=`本手开始 ${context.gold} 金币 · 需要≤3金币`;
        if(id==='huimaqiang'&&context.playIndex!==undefined){
          const target=Math.ceil((context.playIndex+1)/3)*3;
          result.state=`本手是本场第 ${context.playIndex+1} 次 · 需要第3、6、9…次`;result.compact=`待第${target}手`;result.narrow=`待${target}`;
        }
      }
    }
  }else if((id==='a03'||id==='pengci')&&(context.selectedCount??0)>0){result.state=`已选 ${context.selectedCount} 张 · 条件见选择说明`;}
  return result;
}
