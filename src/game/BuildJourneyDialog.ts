import type {R2RunState} from '../domain/r2Run';
import {DetailDialog} from './DetailDialog';
import {BUILD_FOCUS,BUILD_LABEL,buildJourneyFacts,currentBuildFocus,chooseBuildFocus,type BuildFocus} from './BuildJourney';
import {jokerArtPreviewUrl} from './jokerArt';
interface JourneyActions {onFocus?:()=>void;tools:()=>void;tool:(id:string)=>void;source:(id:string)=>void;deck:()=>void;offers?:(id:string,kind:'jokers'|'tools'|'items')=>void;continue:()=>void;continueLabel:string;ready:boolean;publicHands?:()=>void;manage?:()=>void;chapter?:()=>void}
/** Player chooses a direction, then takes an existing validated action. No command is submitted here. */
export function showBuildJourney(dialog:DetailDialog,state:R2RunState,actions:JourneyActions,choose=false):void {
 const focus=choose?undefined:currentBuildFocus(state.runId);
 if(!focus){
  const art:Record<BuildFocus,string>={group:'b10',straight:'c11',flush:'c09'};
  dialog.open('选择培养方向','方向整理已有来源、工具和货架；相关现货在货架描边，其他现货照常可选，不锁定玩法、不保证抽牌或得分。本次页面会话记住选择，刷新后重新选。',[...(actions.chapter?[{label:'本章节目',run:actions.chapter}]:[]),...(actions.manage?[{label:'持有牌管理',run:actions.manage}]:[])],{cards:BUILD_FOCUS.map(f=>({title:BUILD_LABEL[f],url:jokerArtPreviewUrl(art[f]),body:buildJourneyFacts(state,f).guide+'\n路线示意卡面，不代表已持有该牌。',action:{label:'选择'+BUILD_LABEL[f],run:()=>{chooseBuildFocus(state.runId,f);actions.onFocus?.();showBuildJourney(dialog,state,actions);}}}))});return;
 }
 const facts=buildJourneyFacts(state,focus),cards=[...facts.owned.map(o=>({...o,action:{label:'查看来源与成长',run:()=>actions.source(o.id)}})),...facts.tools.map(t=>({...t,action:{label:t.openable?'选择工具与目标':'查看工具规则',run:()=>actions.tool(t.id)}})),...facts.offers.map(o=>({...o,action:{label:o.affordable?'比较并查看购买':'查看差额与条件',run:()=>actions.offers?.(o.id,o.kind)}})),...facts.saved.map(s=>({...s,title:'上手实际 · '+s.title}))];
 dialog.open('培养路线 · '+facts.title,facts.guide+'\n\n公开牌组 '+facts.deckSize+'张：'+facts.composition+'\n'+facts.discovered+'\n\n'+facts.cash.body+'\n\n'+facts.gaps.join('\n')+'\n\n下场：用现有牌找合法组合；实际读取/成长/工具收益只在成功保存后出现，查看上手来源再决定继续或转向。',[
  {label:'更换方向',run:()=>showBuildJourney(dialog,state,actions,true)},
  {label:'查看公开牌组',run:actions.deck},
  ...(actions.chapter?[{label:'本章节目',run:actions.chapter}]:[]),
  ...(actions.manage?[{label:'持有牌管理',run:actions.manage}]:[]),
  ...(actions.publicHands?[{label:'当前手牌可成型',run:actions.publicHands}]:[]),
  {label:'打开工具包',disabled:!actions.ready||!state.consumables.length,run:actions.tools},
  {label:actions.continueLabel,primary:true,disabled:!actions.ready,run:actions.continue},
 ],{summaryBody:facts.guide+'\n'+facts.discovered+'\n\n'+facts.cash.body+(facts.gaps.length?'\n'+facts.gaps.join('\n'):''),cards,collapseRules:true,rulesLabel:'公开牌组与后续说明'});
}
