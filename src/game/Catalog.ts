import type {R2RunState} from '../domain/r2Run';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {readR2Modifiers,type R2JokerDefinition} from '../content/r2Schema';
import {R2_TOOLS,R2_LONG_TERM_ITEMS} from '../content/r2Tools';
import {R2_HAND_TYPES} from '../domain/evaluateR2';
import {HAND_LABELS} from '../content/handLabels';
import {handTypeRuleReference} from './HandRuleReference';
import {newRunIdentity} from './RunLaunch';
import {r2JokerExtraHelp,r2JokerStateText,r2MechanismBadge} from './r2Help';
import {toolInfo,itemInfo,goodsArtPortrait} from './r2ToolInfo';
import {jokerArtUrl,jokerArtPreviewUrl} from './jokerArt';
export const CATALOG_KINDS={joker:'大丑牌',tool:'道具',item:'长期道具',hand:'牌型'} as const;
export const CATALOG_USES=['计分','成长','重触','资源','改牌','扩容'] as const;
export type CatalogKind=keyof typeof CATALOG_KINDS;
export type CatalogSource='持有'|'现货'|'上手来源';
export interface CatalogEntry {key:string;id:string;kind:CatalogKind;name:string;summary:string;rules:string;current:string;sources:CatalogSource[];uses:string[];thumbnail?:string;portrait?:Omit<ReturnType<typeof goodsArtPortrait>,'fallbackUrl'>&{fallbackUrl?:string};rarity?:R2JokerDefinition['rarity']}
function jokerUses(d:R2JokerDefinition):string[]{
 const kinds=d.hooks.flatMap(h=>h.operations.map(o=>o.kind)),mods=d.modifiers?.map(m=>m.kind)??[],uses:string[]=[];
 if(kinds.some(k=>['add-heat','add-multiplier','multiply-multiplier','read-growth','read-coefficient','consume-growth','chance-add-heat','add-heat-per-gold','add-heat-per-empty-slot','rescue-multiplier'].includes(k))||mods.some(m=>['four-straight','four-flush'].includes(m)))uses.push('计分');
 if(kinds.some(k=>['add-growth','add-coefficient','multiply-coefficient-once','update-score-growth'].includes(k)))uses.push('成长');
 if(kinds.includes('retrigger-card'))uses.push('重触');
 if(kinds.some(k=>/gold|refund|reward|rescue/.test(k))||mods.some(m=>/discount|interest/.test(m)))uses.push('资源');
 if(mods.some(m=>m==='hand-limit'||m==='consumable-capacity'))uses.push('扩容');
 return uses;
}
function operationUses(kind:string):string[]{
 if(/upgrade-hand|exchange-hand-levels|boss-most-used-hand-upgrade/.test(kind))return ['计分'];
 if(/hand-limit|slots|capacity|offer-count/.test(kind))return ['扩容'];
 if(/gold|discard|hands-limit|reroll|discount|interest|reward|first-normal-clear-per-chapter/.test(kind))return ['资源'];
 if(kind==='clear-deck-specials')return ['改牌','资源'];
 return ['改牌'];
}
/** Public definitions and committed visible sources only; no RNG, commands or storage. */
export function catalogFacts(run?:R2RunState){
 const identity=run?{contentVersion:run.contentVersion,contentHash:run.contentHash}:newRunIdentity('erxiang','group'),definitions=r2JokerDefinitionsFor(identity),entries:CatalogEntry[]=[];
 const sources=(kind:CatalogKind,id:string):CatalogSource[]=>{
  if(!run)return [];const result:CatalogSource[]=[];
  if(kind==='joker'?run.jokers.some(j=>j.definitionId===id):kind==='tool'?run.consumables.some(c=>c.definitionId===id):kind==='item'?run.longTermItems.includes(id):run.handLevels[id as keyof typeof run.handLevels]!==undefined)result.push('持有');
  const offers=run.phase==='shop'?(kind==='joker'?run.shop?.offers:kind==='tool'?run.shop?.toolOffers:kind==='item'?run.shop?.itemOffers:[]):[];
  if(offers?.some(o=>!o.consumed&&o.definitionId===id))result.push('现货');
  if(kind==='joker'&&run.lastTrace?.events.some(e=>e.sourceType==='joker'&&e.sourceDefinitionId===id&&run.lastTrace!.sourceJokers.some(j=>j.instanceId===e.sourceInstanceId&&j.definitionId===id))||kind==='hand'&&run.lastTrace?.handType===id)result.push('上手来源');
  return result;
 };
 for(const d of definitions){
  const owned=run?.jokers.filter(j=>j.definitionId===d.id)??[],preview=jokerArtPreviewUrl(d.id),url=jokerArtUrl(d.id);
  const current=owned.length?owned.map(j=>'当前持有 · 第'+(run!.jokers.indexOf(j)+1)+'槽\n现存：'+r2JokerStateText(j,d)+'\n实际买价 '+j.paidPrice+' 金').join('\n\n'):run?'未持有当前实例；以下仅为规则资料。':'没有当前保存局；以下仅为规则资料。';
  entries.push({key:'joker/'+d.id,id:d.id,kind:'joker',name:d.name,summary:r2MechanismBadge(d).label+' · '+d.description,rules:d.description+r2JokerExtraHelp(d),current,sources:sources('joker',d.id),uses:jokerUses(d),thumbnail:preview,rarity:d.rarity,portrait:url?{url,thumbnailUrl:preview,alt:d.name,layout:'card',caption:d.name}:undefined});
 }
 for(const d of R2_TOOLS){const info=toolInfo(d.id,identity),count=run?.consumables.filter(c=>c.definitionId===d.id).length??0;entries.push({key:'tool/'+d.id,id:d.id,kind:'tool',name:info.name,summary:info.summary,rules:[info.description,info.cost,info.risk].filter(Boolean).join('\n\n'),current:count?'当前道具箱持有 '+count+' 件；这里只查询，不使用。':run?'当前道具箱未持有；以下仅为规则资料。':'没有当前保存局；以下仅为规则资料。',sources:sources('tool',d.id),uses:operationUses(d.operation.kind),thumbnail:info.artUrl,portrait:goodsArtPortrait(info)});}
 for(const d of R2_LONG_TERM_ITEMS){const info=itemInfo(d.id);entries.push({key:'item/'+d.id,id:d.id,kind:'item',name:info.name,summary:info.summary,rules:info.description,current:run?.longTermItems.includes(d.id)?'当前持有长期道具；作用按原规则时点。':run?'未持有当前实例；以下仅为规则资料。':'没有当前保存局；以下仅为规则资料。',sources:sources('item',d.id),uses:operationUses(d.operation.kind),thumbnail:info.artUrl,portrait:goodsArtPortrait(info)});}
 const mods=run?readR2Modifiers(run.jokers,definitions):{};
 for(const id of R2_HAND_TYPES){const rules=handTypeRuleReference(id,run?.handLevels??{},mods);entries.push({key:'hand/'+id,id,kind:'hand',name:HAND_LABELS[id],summary:rules.split('\n')[1],rules,current:run?.handLevels[id]!==undefined?'本局已发现 · 当前保存Lv'+run.handLevels[id]:run?'本局尚无发现记录；以下仅为Lv1规则参考。':'没有当前保存局；以下仅为Lv1规则参考。',sources:sources('hand',id),uses:['计分']});}
 return {identity,label:run?'当前保存局规则':'当前新局规则资料',entries};
}
export interface CatalogQuery {name:string;kind:CatalogKind|'';use:string;source:CatalogSource|'公开内容'|''}
export function queryCatalog(entries:readonly CatalogEntry[],query:CatalogQuery){
 const needle=query.name.trim().normalize('NFKC').toLocaleLowerCase();
 return entries.filter(e=>(!needle||e.name.normalize('NFKC').toLocaleLowerCase().includes(needle))&&(!query.kind||e.kind===query.kind)&&(!query.use||e.uses.includes(query.use))&&(!query.source||query.source==='公开内容'&&e.sources.length>0||e.sources.includes(query.source as CatalogSource)));
}
