import type {PlayingCard} from '../cards/types';
import {R2_ENHANCEMENTS,type R2ToolDefinition} from '../content/r2Tools';
import {HAND_LABELS} from '../content/handLabels';
import type {R2HandType} from '../domain/evaluateR2';
import {R2_BASE_SCORES} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {cardSpecialText,editionLabel} from './r2ToolInfo';
import {renderToolCard} from './CandidateCardPreview';

export interface CardChange {before:PlayingCard;after?:PlayingCard;label:string;note:string}
/** Concrete public changes only. No generated identity, RNG, scoring prediction or mutation. */
export function toolCardChange(tool:R2ToolDefinition,card:PlayingCard):CardChange|undefined {
 const operation=tool.operation,before={...card};let after:PlayingCard|undefined={...card},label='使用后',note='';
 switch(operation.kind){
  case 'shift-rank':after.rank=Math.max(operation.minimum,Math.min(operation.maximum,card.rank+operation.delta)) as PlayingCard['rank'];break;
  case 'set-suit':after.suit=operation.suit;break;
  case 'set-enhancement':after.enhancement=operation.enhancement;note=R2_ENHANCEMENTS.find(e=>e.id===operation.enhancement)!.name+(card.enhancement&&card.enhancement!==operation.enhancement?' · 替换原增强':'');break;
  case 'delete-cards':after=undefined;label='永久删除';note='该实例从有效牌组移除';break;
  case 'copy-card':label=`复制 ×${operation.copies}`;note='原牌保留；新实例确认后生成';break;
  default:return undefined;
 }
 if(after&&operation.kind!=='copy-card'&&JSON.stringify(before)===JSON.stringify(after))label='不变';
 return {before,after,label,note};
}
export function handLevelFacts(type:R2HandType,level:number):{level:number;heat:number;mult:string} {
 const [heat,mult,heatStep,multStep]=R2_BASE_SCORES[type];
 return {level,heat:heat+heatStep*(level-1),mult:rationalText(Rational.fromJSON(mult).add(Rational.fromJSON(multStep).multiply(new Rational(BigInt(level-1)))))};
}
export function rationalText(value:Rational):string {
 if(value.d===1n)return value.n.toString();
 if(value.n*100n%value.d===0n){const hundredths=value.n*100n/value.d;return `${hundredths/100n}.${String(hundredths%100n).padStart(2,'0')}`.replace(/0+$/,'');}
 return `${value.n}/${value.d}`;
}
export function handLevelChangeText(type:R2HandType,before:number,after:number):string {
 const a=handLevelFacts(type,before),b=handLevelFacts(type,after);
 return `${HAND_LABELS[type]} · Lv.${before} → ${after}\n基础热度 ${a.heat} → ${b.heat}；基础倍率 ${a.mult} → ${b.mult}`;
}
export function renderCardChange(host:HTMLElement,change:CardChange,index:number):void {
 const row=document.createElement('figure'),caption=document.createElement('figcaption'),pair=document.createElement('div');row.className='tool-change-card';row.dataset.sourceId=change.before.id;caption.textContent=`${index+1}. 确认前 → ${change.label}`;pair.className='tool-change-pair';
 const before=document.createElement('span'),arrow=document.createElement('span'),after=document.createElement('span');renderToolCard(before,change.before);appendAttributes(before,change.before);arrow.textContent='→';arrow.className='tool-change-arrow';
 if(change.after){renderToolCard(after,change.after);appendAttributes(after,change.after);after.className='tool-change-after';}else{after.className='tool-change-removed';after.textContent='移除';}
 pair.setAttribute('aria-label',cardSpecialText(change.before)+' → '+(change.after?cardSpecialText(change.after):'永久删除'));
 const note=document.createElement('small');note.textContent=change.note;row.append(caption,pair,note);pair.append(before,arrow,after);host.append(row);
}
export function renderHandChange(host:HTMLElement,type:R2HandType,before:number,after:number):void {
 const row=document.createElement('article'),name=document.createElement('strong'),pair=document.createElement('div');row.className='tool-change-level';name.textContent=HAND_LABELS[type]+' · 基础数值';pair.className='tool-change-level-pair';
 for(const [index,level] of [before,after].entries()){const facts=handLevelFacts(type,level),side=document.createElement('div');if(index){const arrow=document.createElement('span');arrow.textContent='→';pair.append(arrow);}const heading=document.createElement('b'),detail=document.createElement('span');heading.textContent=(index?'使用后':'当前')+` Lv.${level}`;detail.textContent=`热度 ${facts.heat} · 倍率 ${facts.mult}`;side.append(heading,detail);pair.append(side);}
 row.append(name,pair);host.append(row);
}

function appendAttributes(host:HTMLElement,card:PlayingCard):void {
 const label=document.createElement('small');label.className='tool-change-attributes';label.textContent=[R2_ENHANCEMENTS.find(e=>e.id===card.enhancement)?.name??'无增强',editionLabel(card.edition)].join(' · ');host.append(label);
}
