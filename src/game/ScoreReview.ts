import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {HAND_LABELS} from '../content/handLabels';
import {getCharacter} from './characters';
import {R2_BOSSES} from '../domain/r2Chapter';
import {R2_MODE_CATALOG} from '../content/r2Modes';
import {R2_ENHANCEMENTS,R2_LONG_TERM_ITEMS,R2_TOOLS} from '../content/r2Tools';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import type {R2RunState} from '../domain/r2Run';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import type {Fraction} from '../domain/rational';
import {editionLabel} from './r2ToolInfo';
import type {ExperienceCard} from './JokerExperience';
import {jokerArtPreviewUrl} from './jokerArt';
import {r2ScoreOperationText} from './r2Help';
import {exactFractionText,heatText,readableFractionText} from './scoreText';
import {savedAssistCopy} from './AssistSelection';
import {savedBossImpact} from './SavedBossImpact';

const familyNames={G:'成组',S:'顺子',F:'同花'} as const;
const laterPhases=new Set(['afterHand','beforeFailure','onStageClear']);
export interface ScoreReview {
  title:string;
  summary:string;
  cards:ExperienceCard[];
  diagnostics:string;
}
/** Display only. Keep the saved integer receipt separate from rounded H and M. */
export function reviewScoreText(score:string):string {
  return BigInt(score)>=10n**15n?readableFractionText({n:score,d:'1'}):heatText(score);
}
function displayFraction(value:Fraction):string {
  const text=readableFractionText(value);return text.includes('e')?text:text.replace(/\B(?=(\d{3})+(?!\d))/g,',');
}
function cardName(trace:ScoreTrace,id:string|undefined):string {
  const card=trace.cards.find(card=>card.id===id);
  return card?rankLabel(card.rank)+SUIT_SYMBOL[card.suit]:'计分牌';
}
function sourceName(run:R2RunState,trace:ScoreTrace,event:ScoreEvent):string {
  if(event.sourceDefinitionId==='route-growth')return '本局'+(event.routeFamily?familyNames[event.routeFamily]:'')+'清场加成';
  const edition=event.reasonKey.startsWith('edition.')?editionLabel(event.reasonKey.split('.')[1] as 'foil'|'holographic'|'polychrome')+'版次 · ':'';
  if(event.sourceType==='joker'){
    const definition=r2JokerDefinitionFor(run,event.sourceDefinitionId),same=trace.sourceJokers.filter(j=>j.definitionId===event.sourceDefinitionId);
    const instance=same.length>1?'（第'+(same.findIndex(j=>j.instanceId===event.sourceInstanceId)+1)+'张）':'';
    return edition+definition.name+instance;
  }
  if(event.sourceType==='character'){
    const hero=getCharacter(run.characterId).name;
    if(event.reasonKey.startsWith('touye.won.')||event.reasonKey.startsWith('touye.lost.'))return hero+' · 赌约'+(trace.touyeWager?.commit?'押'+HAND_LABELS[trace.touyeWager.commit.target]:'')+(event.reasonKey.startsWith('touye.won.')?' · 达成':' · 输约');
    if(event.sourceDefinitionId==='xiemu'&&event.operation==='multiply-multiplier'&&trace.xiemuBurn?.cost)return hero+' · 燃'+trace.xiemuBurn.cost+'金';
    if(event.sourceDefinitionId==='azao'&&event.operation==='multiply-multiplier'&&trace.azaoCharge?.release)return hero+' · 消耗'+trace.azaoCharge.before.charge+'层爆发';
    return hero+(event.reasonKey.startsWith('amo.assist.')?' · 助攻':event.reasonKey==='erxiang.handoff'?' · 交棒':'');
  }
  const enhancement=event.reasonKey.startsWith('enhancement.')?R2_ENHANCEMENTS.find(item=>item.id===event.reasonKey.split('.')[1])?.name:undefined;
  if(event.sourceType==='card')return enhancement??(edition?edition.slice(0,-3):'扑克普通点数');
  const known=R2_LONG_TERM_ITEMS.find(item=>item.id===event.sourceDefinitionId)?.name
    ??R2_TOOLS.find(item=>item.id===event.sourceDefinitionId)?.name
    ??R2_MODE_CATALOG.programs.find(item=>item.id===event.sourceDefinitionId)?.name
    ??R2_BOSSES.find(item=>item.id===event.sourceDefinitionId)?.name;
  return known??(event.targetCardId?cardName(trace,event.targetCardId):'牌型规则');
}
/** Reuse current identity-aware Chinese operation copy, shortening only its numbers.
 * The long exact tokens are replaced first; event data is never rewritten.
 */
export function reviewOperationText(run:R2RunState,event:ScoreEvent):string {
  const value=displayFraction(event.value);
  if(event.operation==='route-factor')return '此前'+event.resourceBefore+'场'+(event.routeFamily?familyNames[event.routeFamily]:'')+'有效清场 · 本手倍率 ×'+value+'\n加成归本局，不属于某张丑牌；初选路线不限制读取。';
  if(event.operation==='route-clear')return '本局有效清场 '+event.resourceBefore+' → '+event.resourceAfter+' · 新记录下手起读取';
  if(event.operation==='route-clear-family')return (event.routeFamily?familyNames[event.routeFamily]:'本族')+'有效清场 '+event.resourceBefore+' → '+event.resourceAfter+' · 新记录下手起读取';
  if(event.reasonKey==='erxiang.handoff')return value+'点普通热度改加倍率（首次计分）';
  if(event.operation==='retrigger-card')return '额外再计分 '+value+' 次';
  if(event.operation==='read-growth')return '读取已攒'+(event.before.H.n!==event.after.H.n||event.before.H.d!==event.after.H.d?'热度':'倍率')+' +'+value;
  if(event.operation==='add-heat-per-gold')return '按当时金币加入热度 +'+value;
  if(event.operation==='add-heat-per-empty-slot')return '按当时空槽加入热度 +'+value;
  let text=r2ScoreOperationText(event,event.sourceType==='joker'?r2JokerDefinitionFor(run,event.sourceDefinitionId):undefined);
  const replacements=[event.value,event.growthBefore,event.growthAfter].filter((f):f is Fraction=>!!f)
    .map(f=>({exact:exactFractionText(f),readable:displayFraction(f)})).filter(f=>f.exact!==f.readable)
    .sort((a,b)=>b.exact.length-a.exact.length);
  for(const number of replacements)text=text.split(number.exact).join(number.readable);
  return text;
}
function timing(event:ScoreEvent):string {
  return event.phase==='afterHand'?'结算后记录':event.phase==='onStageClear'?'过关时记录':event.phase==='beforeFailure'?'失败前记录':'本手计分';
}
function countLabel(event:ScoreEvent):string {
  if(event.operation==='route-factor'||event.operation==='read-growth'||event.operation==='read-coefficient')return '实际读取';
  if(event.operation.endsWith('-check'))return '实际检查';
  if(laterPhases.has(event.phase)||['ordinary-points-suppressed','retrigger-cap','lucky-gold-cap','seal-joker'].includes(event.operation))return '实际记录';
  return '实际触发';
}
/** Only saved event executions count, separately by instance, operation and timing.
 * Multiple operations in one hook are never presented as multiple source triggers.
 * Distinct exact values stay distinct even if their rounded text is equal.
 */
export function formatScoreReview(run:R2RunState,trace:ScoreTrace):ScoreReview {
  const first=trace.events.find(event=>event.phase==='base')?.after;
  const impact=savedBossImpact(run,trace);
  const summary=[
    '本手入账 '+reviewScoreText(trace.finalScore),
    '最终热度 '+displayFraction(trace.accumulator.H)+' × 倍率 '+displayFraction(trace.accumulator.M),
    first?'牌型基础 '+displayFraction(first.H)+' 热度 × '+displayFraction(first.M)+' 倍率':'',
    '实际计分 '+trace.sets.activeScoringIds.length+' 张 · 打出 '+trace.sets.playedIds.length+' 张',
    trace.assist?savedAssistCopy(trace):'',impact,
    '≈ 表示显示近似值；入账按精确计算向下取整。',
  ].filter(Boolean).join('\n');
  const groups=new Map<string,{title:string;url?:string;cardSource:boolean;rows:Map<string,{event:ScoreEvent;count:number}>}>();
  for(const event of trace.events){
    if(event.phase==='base'||event.phase==='finalScore')continue;
    const title=sourceName(run,trace,event),key=JSON.stringify([event.sourceType,event.sourceType==='card'?'poker':event.sourceInstanceId,title,timing(event)]);
    let group=groups.get(key);
    if(!group){group={title:title+' · '+timing(event),url:event.sourceType==='joker'?jokerArtPreviewUrl(event.sourceDefinitionId):undefined,cardSource:event.sourceType==='card',rows:new Map()};groups.set(key,group);}
    // Preserve separate checks/outcomes and changing resource/growth receipts.
    const rowKey=JSON.stringify([event.sourceType==='card'?event.targetCardId:undefined,event.operation,event.reasonKey,event.value,event.resourceBefore,event.resourceAfter,event.growthBefore,event.growthAfter,event.rewardDefinitionId,event.targetHandType]);
    const row=group.rows.get(rowKey);if(row)row.count++;else group.rows.set(rowKey,{event,count:1});
  }
  const cards=[...groups.values()].sort((a,b)=>Number(a.cardSource)-Number(b.cardSource)).map(group=>({title:group.title,url:group.url,body:[...group.rows.values()].map(({event,count})=>(event.sourceType==='card'?cardName(trace,event.targetCardId??event.sourceInstanceId)+'：':'')+reviewOperationText(run,event)+' · '+countLabel(event)+' '+count+' 次').join('\n')}));
  const diagnostics=[
    '精确热度 '+exactFractionText(trace.accumulator.H),
    '精确倍率 '+exactFractionText(trace.accumulator.M),
    '入账 = floor(精确热度 × 精确倍率) = '+trace.finalScore,
    '原始事件（保存顺序，含事件键、精确分数及前后值）',
    ...trace.events.map(event=>JSON.stringify(event)),
  ].join('\n\n');
  return {title:'上手已入账 · '+HAND_LABELS[trace.handType]+' +'+reviewScoreText(trace.finalScore),summary,cards,diagnostics};
}
