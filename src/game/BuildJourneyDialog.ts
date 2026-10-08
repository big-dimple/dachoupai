import {attachFirstChapterGuide} from './FirstChapterGuide';
import type {R2RunState} from '../domain/r2Run';
import {DetailDialog} from './DetailDialog';
import {BUILD_FOCUS,BUILD_LABEL,buildJourneyFacts,currentBuildFocus,chooseBuildFocus,type BuildFocus} from './BuildJourney';
import {jokerArtPreviewUrl} from './jokerArt';
interface JourneyActions {onFocus?:()=>void;tools:()=>void;tool:(id:string)=>void;source:(id:string)=>void;deck:()=>void;offers?:(id:string,kind:'jokers'|'tools'|'items')=>void;continue:()=>void;continueLabel:string;ready:boolean;publicHands?:()=>void;manage?:()=>void;chapter?:()=>void}
/** Player chooses a direction, then takes an existing validated action. No command is submitted here. */
export function showBuildJourney(dialog:DetailDialog,state:R2RunState,actions:JourneyActions,choose=false):void {
 const focus=choose?undefined:currentBuildFocus(state.runId);
 const shortGuide:Record<BuildFocus,string>={group:'保留同点牌，试两对、三条等成组。',straight:'用不同点数接出连续牌。',flush:'选一种花色，集中成同花。'};
 if(!focus){
  const art:Record<BuildFocus,string>={group:'b10',straight:'c11',flush:'c09'};
  dialog.open('你想怎样组牌？','方向只整理货架，不锁玩法；随时可换。',[
   ...(actions.chapter?[{label:'本章节目',run:actions.chapter}]:[]),...(actions.manage?[{label:'持有牌管理',run:actions.manage}]:[])
  ],{summaryBody:'选一个想试的方向',collapseRules:true,rulesLabel:'路线与使用说明',cards:BUILD_FOCUS.map(f=>{const facts=buildJourneyFacts(state,f),stock=facts.offers.find(o=>o.kind==='jokers'&&o.relation?.kind==='direct')??facts.offers.find(o=>o.kind==='jokers'&&o.relation?.kind==='support'),owned=facts.owned.find(o=>o.relation.kind==='direct')??facts.owned.find(o=>o.relation.kind==='support');return {title:BUILD_LABEL[f],url:stock?.url??owned?.url??jokerArtPreviewUrl(art[f]),body:shortGuide[f]+'\n'+(stock?'现货 · '+stock.relation!.label+'：'+stock.title:owned?'持有 · '+owned.relation.label+'：'+owned.title+'\n本店暂无对应直接/辅助现货':'路线示意 · 暂无对应直接/辅助现货或持牌；进入后可比较其它路线机会'),action:{label:'选择'+BUILD_LABEL[f],run:()=>{chooseBuildFocus(state.runId,f);actions.onFocus?.();showBuildJourney(dialog,state,actions);}}};})});attachFirstChapterGuide(state,actions.onFocus);return;
 }
 const facts=buildJourneyFacts(state,focus);
 const offers=facts.offers.map(o=>({title:o.title,url:o.url,stat:o.decision,body:o.brief,action:{label:o.affordable?'查看并选择这件':'查看差额与条件',run:()=>actions.offers?.(o.id,o.kind)}}));
 const owned=facts.owned.map(o=>{const p=facts.progress.find(p=>p.instanceId===o.id);return {title:o.title,url:o.url,stat:p?.metric,body:o.body+'\n'+(p?p.cause+'\n'+p.next:''),action:{label:'查看来源与成长',run:()=>actions.source(o.id)}};});
 const tools=facts.tools.map(t=>({...t,action:{label:t.openable?'选择工具与目标':'查看工具规则',run:()=>actions.tool(t.id)}}));
 const cards=state.phase==='shop'?[...offers,...owned,...tools]:[...owned,...tools];
 const summary=state.phase==='shop'?'手头 '+state.gold+' 金 · 买组件或留金入场':facts.progress[0]?.metric??'用已有牌继续尝试';
 dialog.open('培养路线 · '+facts.title,[facts.guide,facts.cash.body,facts.composition,facts.discovered,...facts.gaps,'完整持有规则：',...facts.owned.map(o=>o.title+'\n'+o.body)].join('\n\n'),[
  {label:'更换方向',run:()=>showBuildJourney(dialog,state,actions,true)},
  {label:'查看公开牌组',run:actions.deck},
  ...(actions.chapter?[{label:'本章节目',run:actions.chapter}]:[]),
  ...(actions.manage?[{label:'持有牌管理',run:actions.manage}]:[]),
  ...(actions.publicHands?[{label:'当前手牌可成型',run:actions.publicHands}]:[]),
  {label:'打开工具包',disabled:!actions.ready||!state.consumables.length,run:actions.tools},
  {label:actions.continueLabel,primary:true,disabled:!actions.ready,run:actions.continue},
 ],{summaryBody:summary+'\n'+shortGuide[focus]+(state.phase==='shop'&&!offers.length?'\n本店无对应现货，可留金或换方向':''),cards,collapseRules:true,rulesLabel:'利息、牌组与完整来源规则'});attachFirstChapterGuide(state,actions.onFocus);
}
