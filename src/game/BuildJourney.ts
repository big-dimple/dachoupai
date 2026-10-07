import {R2_HAND_TYPES} from '../domain/evaluateR2';
import type {R2RunState} from '../domain/r2Run';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {R2_GROUP_HAND_TYPES} from '../domain/r2GroupHands';
import {r2PurchasePrice,type R2Offer} from '../domain/r2Shop';
import {r2InterestCap} from '../domain/r2Run';
import {r2ToolAllowed,r2ToolSupported} from '../domain/r2ToolRuntime';
import {R2_TOOLS,R2_TOOL_CATALOG} from '../content/r2Tools';
import {HAND_LABELS} from '../content/handLabels';
import {rankLabel,SUIT_SYMBOL,type Suit,type Rank} from '../cards/types';
import {jokerArtPreviewUrl} from './jokerArt';
import {r2JokerStateText} from './r2Help';
import {toolInfo,itemInfo} from './r2ToolInfo';
import {savedExperienceCards} from './JokerExperience';
export type BuildFocus='group'|'straight'|'flush';
export const BUILD_FOCUS:readonly BuildFocus[]=['group','straight','flush'];
export const BUILD_LABEL:Record<BuildFocus,string>={group:'同点成组',straight:'顺子接续',flush:'同花集中'};
// UI intent only. Keep one run, never add a save field or reuse the intent for a new run.
let intent:{runId:string;focus:BuildFocus}|undefined;
export const currentBuildFocus=(runId:string)=>intent?.runId===runId?intent.focus:undefined;
export function chooseBuildFocus(runId:string,focus:BuildFocus):void {if(BUILD_FOCUS.includes(focus))intent={runId,focus};}
export const buildHandTypes=(focus:BuildFocus)=>focus==='group'?R2_GROUP_HAND_TYPES:focus==='straight'?['straight','straight-flush']:['flush','straight-flush'];
export function jokerSupportsFocus(state:R2RunState,id:string,focus:BuildFocus):boolean {
 const d=r2JokerDefinitionFor(state,id),wanted=buildHandTypes(focus);
 return d.hooks.some(h=>h.condition.kind==='suit-in'?true:h.condition.kind==='scoring-position'?!h.condition.handTypes||h.condition.handTypes.some(t=>wanted.includes(t)):h.condition.kind==='all-played-active'?h.condition.minimum<=5:h.condition.kind==='discard-same-suit'?focus==='straight':h.condition.kind==='hand-type-in'?h.condition.values.some(t=>wanted.includes(t)):h.condition.kind==='hand-type-transition'?wanted.includes(h.condition.current)||wanted.includes(h.condition.previous):h.condition.kind==='hand-type-relation'?h.condition.values.some(t=>wanted.includes(t)):h.condition.kind==='largest-scoring-rank-group'?focus==='group':h.condition.kind==='always'&&h.operations.some(o=>o.kind==='read-growth'||o.kind==='consume-growth'?state.jokers.some(j=>j.definitionId===id&&BigInt(j.growth[o.key]?.n??'0')>0n):['read-coefficient','add-heat','add-multiplier','multiply-multiplier'].includes(o.kind)))||!!d.modifiers?.some(m=>focus==='straight'?m.kind==='four-straight':focus==='flush'?m.kind==='four-flush':false);
}
export function toolSupportsFocus(id:string,focus:BuildFocus):boolean {
 const op=R2_TOOLS.find(t=>t.id===id)!.operation;
 if(op.kind==='upgrade-hand')return !op.handType||buildHandTypes(focus).includes(op.handType);
 // Existing score-paper / repeat tools are optional bridges, never a required glass recipe.
 if(op.kind==='set-enhancement')return op.enhancement!=='voice-paper';
 if(op.kind==='add-gold'||op.kind==='restore-discard'||op.kind==='free-reroll')return true;
 return focus==='group'?['copy-card','shift-rank','delete-cards','exchange-hand-levels'].includes(op.kind):focus==='straight'?['shift-rank','copy-card','delete-cards','exchange-hand-levels'].includes(op.kind):['set-suit','set-deck-suit','copy-card','delete-cards','exchange-hand-levels'].includes(op.kind);
}
export function focusedUpgradeTypes(state:R2RunState,focus:BuildFocus|undefined){
 const discovered=R2_HAND_TYPES.filter(t=>state.handLevels[t]!==undefined);
 return discovered.filter(t=>state.handLevels[t]!<R2_TOOL_CATALOG.limits.handLevelMaximum).sort((a,b)=>Number(!!focus&&buildHandTypes(focus).includes(b))-Number(!!focus&&buildHandTypes(focus).includes(a)));
}
export function cashDecision(state:R2RunState,spend=0){
 const cap=r2InterestCap(state),before=state.gold,after=before-spend;
 return {before,after,cap,beforeTier:Math.min(cap,Math.floor(before/5)),afterTier:after<0?undefined:Math.min(cap,Math.floor(after/5)),body:after<0?'当前'+before+'金，尚差'+(-after)+'金。':`余额 ${before}→${after} 金；按当前持有上限对应利息档 ${Math.min(cap,Math.floor(before/5))}→${Math.min(cap,Math.floor(after/5))} 金。利息在成功过关时按届时余额计算，不是现在到账或下场保证收入。`};
}
/** Known deck composition only; no draw-pile order, RNG or projected score. */
export function buildJourneyFacts(state:R2RunState,focus:BuildFocus){
 const live=state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id)),counts=new Map<number,number>(),suits=new Map<Suit,number>();
 for(const card of live){counts.set(card.rank,(counts.get(card.rank)??0)+1);suits.set(card.suit,(suits.get(card.suit)??0)+1);}
 const rankCounts=[...counts].sort((a,b)=>a[0]-b[0]).map(([rank,count])=>rankLabel(rank as Rank)+'×'+count).join('、');
 const composition=focus==='flush'?[...suits].map(([s,n])=>SUIT_SYMBOL[s]+' '+n+'张').join(' · '):rankCounts;
 const guide=focus==='group'?'保留同点牌，尝试对子、两对或更大成组；改点、复制和删牌各有代价。':focus==='straight'?'用不同点数接连续牌；成长来源可能仍读旧值，但是否新增成长另按来源条件。':'先决定集中哪一花色；染色只改所选对象，不保证下一手抽到同花。';
 const owned=state.jokers.filter(j=>jokerSupportsFocus(state,j.definitionId,focus)).map(j=>{const d=r2JokerDefinitionFor(state,j.definitionId);return {id:j.instanceId,title:d.name,url:jokerArtPreviewUrl(d.id),body:d.description+'\n已保存：'+r2JokerStateText(j,d)+'\n来源是否实际生效，按选牌条件、封禁与保存事件核对。'};});
 const tools=state.consumables.filter(c=>toolSupportsFocus(c.definitionId,focus)).map(c=>{const d=R2_TOOLS.find(t=>t.id===c.definitionId)!,info=toolInfo(d.id),openable=d.phases.includes(state.phase as 'shop'|'await-input')&&r2ToolSupported(d.id)&&r2ToolAllowed(state,d.id);return {id:c.instanceId,title:info.name,url:info.artUrl,openable,body:info.description+'\n'+info.cost+'\n'+(openable?'打开后自己选择对象；确认前仍校验目标、余额和上限。':'当前时点不能用；查看完整工具规则或到商店再决定。')};});
 const shop=state.shop,offers: {id:string;kind:'jokers'|'tools'|'items';title:string;body:string;url?:string;affordable:boolean}[]=[];
 const add=(o:R2Offer,kind:'jokers'|'tools'|'items')=>{if(o.consumed)return;const price=r2PurchasePrice(state,o),d=kind==='jokers'?r2JokerDefinitionFor(state,o.definitionId):undefined,info=kind==='tools'?toolInfo(o.definitionId):kind==='items'?itemInfo(o.definitionId):undefined;offers.push({id:o.offerId,kind,title:(d?.name??info!.name)+' · 实付'+price+'金',url:d?jokerArtPreviewUrl(d.id):info?.artUrl,affordable:price<=state.gold,body:(d?.description??info!.description)+'\n'+cashDecision(state,price).body+'\n查看购买详情，容量/时点和最终购买条件以确认页为准。'});};
 if(state.phase==='shop'&&shop){for(const o of shop.offers)if(jokerSupportsFocus(state,o.definitionId,focus))add(o,'jokers');for(const o of shop.toolOffers)if(toolSupportsFocus(o.definitionId,focus))add(o,'tools');for(const o of shop.itemOffers)add(o,'items');}
 const discovered=Object.entries(state.handLevels).filter(([t])=>buildHandTypes(focus).includes(t as keyof typeof HAND_LABELS)).map(([t,l])=>HAND_LABELS[t as keyof typeof HAND_LABELS]+' Lv.'+l).join(' · ')||'该方向牌型尚未发现；工具升型资格以使用页为准。';
 const trace=state.lastTrace,saved=trace?savedExperienceCards(state,trace):[];
 return {focus,title:BUILD_LABEL[focus],guide,composition,deckSize:live.length,discovered,owned,tools,offers,cash:cashDecision(state),saved,gaps:[!owned.length?'尚无该方向对应的持有来源；先看公开可成牌型，也可换培养方向。':'',!tools.length?'当前没有对应改牌/升型工具；可用现有牌出场，或查看本店货架。':'',state.phase==='shop'&&!offers.length?'本店没有该方向对应商品；保留金币直接入场或换方向，不保证刷新补齐。':''].filter(Boolean)};
}
