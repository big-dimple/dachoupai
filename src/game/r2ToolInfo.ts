import {r2ToolPrice} from '../domain/r2Shop';
import type {R2ContentIdentity} from '../domain/r2ContentProfiles';
import {SUIT_SYMBOL,type PlayingCard,type Edition} from '../cards/types';
import {HAND_LABELS} from '../content/handLabels';
import {R2_TOOL_CATALOG,R2_ENHANCEMENTS,R2_EDITIONS,R2_LONG_TERM_ITEMS,getR2Tool,
  type R2ToolDefinition,type R2ToolFamily,type R2ToolCost,type R2EnhancementDefinition,
  type R2EnhancementEffect,type R2EditionDefinition,type R2LongTermDefinition} from '../content/r2Tools';
import type {R2HandType} from '../domain/evaluateR2';
import {SCORE_LIMITS} from '../domain/scoreR2';
import {fractionText} from './scoreText';
import {PAPER_CSS} from './theme';
import {goodsArtUrl} from './GoodsArt';

export interface ToolInfo {
  name:string;family:R2ToolFamily;label:string;summary:string;description:string;cost:string;risk:string;artUrl:string;detailArtUrl?:string;fallbackArtUrl:string;
}
export interface ItemInfo {name:string;summary:string;description:string;artUrl:string;detailArtUrl?:string;fallbackArtUrl:string}

export function goodsArtPortrait(info:ToolInfo|ItemInfo):{url:string;thumbnailUrl?:string;fallbackUrl:string;alt:string;layout:'card';caption?:string}{return {url:info.detailArtUrl??info.artUrl,thumbnailUrl:info.detailArtUrl?info.artUrl:undefined,fallbackUrl:info.fallbackArtUrl,alt:info.name,layout:'card' as const};}

const limits=R2_TOOL_CATALOG.limits;
const familyNames:Record<R2ToolFamily,string>={tarot:'塔罗',planet:'星球',spectral:'幻灵',utility:'补给'};
const suitNames={hearts:'红桃',diamonds:'方片',clubs:'梅花',spades:'黑桃'} as const;
const impossible=(value:never):never=>{throw Error(`unsupported-detail: ${JSON.stringify(value)}`);};
const range=(minimum:number,maximum:number)=>minimum===maximum?`${minimum}`:`${minimum}–${maximum}`;

export function toolFamilyLabel(family:R2ToolFamily):string {
  const label=familyNames[family];if(!label)throw Error(`unknown-r2-tool-family: ${family}`);return label;
}
function editionDefinition(edition:Edition='none'):R2EditionDefinition {
  const row=R2_EDITIONS.find(row=>row.id===edition);if(!row)throw Error(`unknown-edition: ${edition}`);return row;
}
export function editionLabel(edition?:Edition):string {return editionDefinition(edition).name;}
export function editionEffectText(edition?:Edition):string {
  const row=editionDefinition(edition);
  return `${row.name}${row.effect?`（${mathText(row.effect)}）`:'（无额外计分）'}。版次独立于增强和稀有度。扑克在该次增强后、大丑牌能力前触发；大丑牌在自身全部计分能力后逐槽触发，本体未命中仍有效。持牌或计分失效时不触发版次。`;
}
function enhancementDefinition(id:NonNullable<PlayingCard['enhancement']>):R2EnhancementDefinition {
  const row=R2_ENHANCEMENTS.find(row=>row.id===id);if(!row)throw Error(`unknown-enhancement: ${id}`);return row;
}
function mathText(effect:NonNullable<R2EditionDefinition['effect']>):string {
  const value=fractionText(effect.value);
  switch(effect.kind){
    case 'add-heat':return `热度+${value}`;
    case 'add-multiplier':return `倍率+${value}`;
    case 'multiply-multiplier':return `倍率×${value}`;
    default:return impossible(effect.kind);
  }
}
function effectText(effect:R2EnhancementEffect):string {
  switch(effect.kind){
    case 'add-heat':case 'add-multiplier':case 'multiply-multiplier':
      return `${effect.phase==='onHeldCard'?'有效持牌一次':'每次普通或额外计分'}${mathText(effect)}`;
    case 'chance-destroy':return `结算后每张原实例只判一次，${effect.probability.n}/${effect.probability.d}概率永久破碎，失败手也判定且可低于主动删牌下限`;
    case 'add-gold':return `成功过关时每张有效持牌金币+${effect.amount}，每场最多${effect.capPerStage}金`;
    case 'retrigger-card':return `有效计分时额外计分+${effect.count}次，不递归触发，与大丑牌共享每张最多${SCORE_LIMITS.extraRetriggers}次额外计分`;
    case 'chance-add-multiplier':return `${effect.probability.n}/${effect.probability.d}概率倍率+${fractionText(effect.value)}`;
    case 'chance-add-gold':return `${effect.probability.n}/${effect.probability.d}概率金币+${effect.amount}，整手最多${effect.capPerHand}金，达到上限仍判定，金币不增加热度或倍率`;
    default:return impossible(effect);
  }
}
/** Essential gains and destructive risk; ordering/qualification details stay expandable. */
function enhancementSummary(row:R2EnhancementDefinition):string {
 return row.effects.map(effect=>{
  switch(effect.kind){
  case 'add-heat':case 'add-multiplier':case 'multiply-multiplier':return `${effect.phase==='onHeldCard'?'选中牌留在手中，':'选中牌每次计分'}${mathText(effect)}`;
  case 'chance-destroy':return `结算后${effect.probability.n}/${effect.probability.d}概率永久破碎`;
  case 'add-gold':return `选中牌有效留在手中过关+${effect.amount}金，每场最多${effect.capPerStage}金`;
  case 'retrigger-card':return `选中计分牌额外计分${effect.count}次`;
  case 'chance-add-multiplier':return `选中牌每次计分${effect.probability.n}/${effect.probability.d}概率倍率+${fractionText(effect.value)}`;
  case 'chance-add-gold':return `${effect.probability.n}/${effect.probability.d}概率+${effect.amount}金，每手最多${effect.capPerHand}金`;
  default:return impossible(effect);
  }
 }).join('；');
}
function enhancementText(row:R2EnhancementDefinition):string {
  const prefix=row.id==='lucky-paper'?'每次普通或额外计分，两项独立判定，先倍率后金币，':'';
  return prefix+row.effects.map(effectText).join('，');
}
/** Independent visible layers; never inspect a future draw or a hidden card. */
export function cardSpecialText(card:PlayingCard):string {
  const enhancement=card.enhancement?enhancementDefinition(card.enhancement):undefined;
  const edition=editionDefinition(card.edition);
  return `增强：${enhancement?`${enhancement.name}（${enhancementText(enhancement)}）`:'无'}；版次：${edition.name}${edition.effect?`（${mathText(edition.effect)}）`:''}`;
}

function targetText(tool:R2ToolDefinition):string {
  const target=tool.target;
  switch(target.kind){
    case 'none':return '无需选择对象。';
    case 'discovered-hand':return target.selection==='fixed'?'对象固定，须已发现该牌型。':'选择一种已发现牌型。';
    case 'cards':return `选择${range(target.minimum,target.maximum)}张可见扑克。`;
    case 'card-sacrifice':return `牺牲${target.donors}张扑克，再选${range(target.minimum,target.maximum)}张未增强扑克，牺牲者与受赠者必须不同。`;
    case 'card-or-joker':return '选择一张普通版次的扑克或大丑牌。';
    case 'suit':return '选择一种花色，作用于整个有效牌组。';
    case 'hand-exchange':return '选择两种不同、已发现的牌型，分别作为受益方和牺牲方。';
    case 'joker-sacrifice':return `牺牲${target.donors}张大丑牌，选另一张非${editionLabel(target.excludedEdition)}大丑牌受赠。`;
    case 'whole-deck':return '作用于整个有效牌组，无需逐张选择。';
    default:return impossible(target);
  }
}
/** First layer: purpose and actual effect only; full targeting and costs stay in confirmation. */
export function toolSummary(tool:R2ToolDefinition):string {
 const op=tool.operation;
 switch(op.kind){
 case 'upgrade-hand':return op.handType?`给${HAND_LABELS[op.handType]}升级`:'给一种牌型升级';
 case 'delete-cards':return '永久删掉选中的扑克';
 case 'set-suit':return `把选中的扑克改成${suitNames[op.suit]}${SUIT_SYMBOL[op.suit]}`;
 case 'copy-card':return `复制选中的扑克${op.copies}张，原牌保留`;
 case 'shift-rank':return `选中的扑克点数${op.delta>0?'+':'−'}${Math.abs(op.delta)}`;
 case 'set-enhancement':return enhancementSummary(enhancementDefinition(op.enhancement));
 case 'add-gold':return `获得${op.amount}金`;
 case 'restore-discard':return `恢复本场${op.amount}次弃牌，最多到入场次数`;
 case 'free-reroll':return '免费刷新一次大丑牌和工具货架';
 case 'random-enhancement':return '牺牲一张扑克，给受赠扑克随机增强';
 case 'random-edition':return '给选中的牌随机增加闪箔、全息或多彩版次';
 case 'set-deck-suit':return '把整个牌组改成一种花色';
 case 'exchange-hand-levels':return `一种牌型升${op.gain}级，另一种降${op.loss}级`;
 case 'rare-joker-reward':{const edition=op.edition;return `随机获得一张${edition==='none'?'':editionLabel(edition)}稀有大丑牌`;}
 case 'set-joker-edition':return `牺牲一张大丑牌，让受赠牌变为${editionLabel(op.edition)}（${mathText(editionDefinition(op.edition).effect!)}）`;
 case 'clear-deck-specials':return `清除全牌组增强和特殊版次；下一场起，永久手牌上限+${op.handBonus}`;
 default:return impossible(op);
 }
}
function operationText(tool:R2ToolDefinition):string {
  const op=tool.operation;
  switch(op.kind){
    case 'upgrade-hand':return `${op.handType?`固定升级${HAND_LABELS[op.handType]}`:'所选牌型'}等级+${op.levels}，上限${limits.handLevelMaximum}级。只影响未来出牌，已确定的计分与回看保持原结果。`;
    case 'delete-cards':return '永久删除所选扑克，随后各场也不再出现。当前场不补抽被删掉的手牌。';
    case 'set-suit':return `所选扑克永久改为${suitNames[op.suit]}${SUIT_SYMBOL[op.suit]}，保留点数、增强和版次。`;
    case 'copy-card':return `保留原牌，新建${op.copies}张完整复制，复制点数、花色、增强和版次，不复制本场临时失效。新牌置于真实抽牌堆底部，不洗牌、不立即补抽，牌组最多${limits.deckMaximum}张。`;
    case 'shift-rank':return `所选扑克点数${op.delta>0?'+':'−'}${Math.abs(op.delta)}，保持花色、增强和版次。点数范围${op.minimum}至${op.maximum}（A），不循环：${op.delta>0?'A不能再升':'2不能再降'}。`;
    case 'set-enhancement':{
      const enhancement=enhancementDefinition(op.enhancement);
      return `赋予${enhancement.name}：${enhancementText(enhancement)}。替换原增强，保留版次。`;
    }
    case 'add-gold':return `金币+${op.amount}，不增加本手热度或倍率。`;
    case 'restore-discard':return `本场剩余弃牌+${op.amount}，最多恢复至入场弃牌预算，保留已用弃牌记录；须实际用过弃牌。`;
    case 'free-reroll':return '本次免费刷新大丑牌和工具货架，不刷新长期道具货架。刷新次数照常增加，但不触发付费刷新成长，也不支付付费刷新价格。';
    case 'random-enhancement':return '每张受赠扑克独立随机获得一种增强，保留原版次。按商店可见有效牌组顺序，或待出牌时当前手牌顺序分配，不按目标点击顺序分配。';
    case 'random-edition':return '随机获得闪箔、全息或多彩版次，增强与版次各占一层。扑克保留点数、花色和增强；大丑牌保留稀有度、购入价、成长与计数。';
    case 'set-deck-suit':return '整个有效牌组永久改为所选花色，保留点数、增强、版次以及各牌堆顺序；须至少一张确实改变花色。';
    case 'exchange-hand-levels':return `受益牌型+${op.gain}级、牺牲牌型−${op.loss}级，均保留发现状态。受益方原等级最多${op.targetMaximumBefore}，牺牲方至少${op.donorMinimumBefore}级。已确定的计分与回看保持原结果。`;
    case 'rare-joker-reward':return `从当前可用且未持有的稀有大丑牌中等概率获得一张：${editionLabel(op.edition)}版次、初始成长与计数、购入价${op.paidPrice}。属于奖励，不触发购买成长或首购优惠。`;
    case 'set-joker-edition':return `受赠大丑牌变为${editionLabel(op.edition)}（${mathText(editionDefinition(op.edition).effect!)}），保留稀有度、购入价、成长与计数。牺牲不算出售，无返金或出售成长。`;
    case 'clear-deck-specials':return `有效牌组须至少${op.minimumModifiedCards}张带增强或特殊版次，双层均有的牌每张只计一次。清除全部扑克的增强与特殊版次，下一场起永久手牌上限+${op.handBonus}，最多${limits.handMaximum}，本局一次。`;
    default:return impossible(op);
  }
}
function costText(cost:R2ToolCost):string {
  switch(cost.kind){
    case 'gold':return `${cost.amount}金`;
    case 'all-gold':return `全部金币（至少${cost.minimum}金）`;
    case 'sacrifice-card':return `永久牺牲${cost.count}张扑克`;
    case 'sacrifice-joker':return `永久牺牲${cost.count}张大丑牌`;
    case 'permanent-hands-penalty':return `下一场起永久出牌次数−${cost.amount}，累计最多${limits.spectralHandsPenaltyMaximum}次，下一场须确实少${cost.amount}次且至少${limits.handsMinimum}次`;
    case 'permanent-hand-penalty':return `下一场起永久手牌上限−${cost.amount}，累计最多${limits.spectralHandPenaltyMaximum}张，下一场须确实少${cost.amount}张且至少${limits.handMinimum}张`;
    default:return impossible(cost);
  }
}
function toolCost(tool:R2ToolDefinition,price=tool.price):string {
  const purchase=tool.shopWeight===0?'仅公开奖励，不可购买':`商店基准售价：${price}金`;
  const costs=tool.costs.map(costText);
  if(tool.operation.kind==='exchange-hand-levels')costs.push(`牺牲方等级−${tool.operation.loss}`);
  if(tool.operation.kind==='clear-deck-specials')costs.push('清除全牌组全部增强与特殊版次');
  return `${purchase}\n额外使用代价：${costs.length?costs.join('，'):'无额外金币或牺牲代价'}。成功后消耗${limits.singleUse}件工具。`;
}
function toolRisk(tool:R2ToolDefinition):string {
  const risks:string[]=[];
  if(tool.target.kind==='cards'||tool.target.kind==='card-sacrifice'){
    risks.push(tool.phases.includes('await-input')?'商店只选有效牌组，待出牌时只选当前可见手牌。':'仅商店选择有效牌组。');
  }
  if(tool.operation.kind==='random-enhancement'){
    const total=tool.operation.choices.reduce((sum,choice)=>sum+choice.weight,0);
    risks.push('公开概率：'+tool.operation.choices.map(choice=>{
      const enhancement=enhancementDefinition(choice.id);
      return `${enhancement.name}${choice.weight}/${total}（${enhancementText(enhancement)}）`;
    }).join('、')+'。增强结果使用后才揭晓。');
  }
  if(tool.operation.kind==='random-edition'){
    const total=tool.operation.choices.reduce((sum,choice)=>sum+choice.weight,0);
    risks.push('公开概率：'+tool.operation.choices.map(choice=>`${editionLabel(choice.id)}${choice.weight}/${total}（${mathText(editionDefinition(choice.id).effect!)}）`).join('、')+'。结果使用后才揭晓，版次不改变稀有度。扑克版次在增强后、大丑牌逐牌效果在自身能力后触发；仅有效计分来源触发，持牌不触发版次。');
  }
  if(tool.caps.includes('deckDeletionFloor'))risks.push(`主动删除或牺牲后牌组至少${limits.deckDeletionFloor}张，持有极简手册时至少${limits.minimalDeckFloor}张，当前场须仍有合法行动。此下限不保护玻璃破碎。`);
  if(tool.caps.includes('actualResourceChange'))risks.push('须存在下一场且实际资源变化完整生效，达到上限或下限后被抵消的变化不能使用；当前场资源保持入场预算。');
  if(tool.caps.includes('jokerMaximum'))risks.push(`须有空大丑牌槽，最多${limits.jokerMaximum}张；奖池为空时不能使用。`);
  if(tool.caps.includes('postConsumptionCapacity'))risks.push('牺牲后按真实剩余大丑牌重算库存容量，消费此工具后其余工具仍须装得下。');
  if(tool.operation.kind==='set-enhancement')risks.push('每张只有一个增强层，替换会永久失去原增强；确认页须核对被替换的效果。失效牌不触发增强。');
  const firstBoss=tool.rewardSources.find(source=>source.source==='first-boss-clear');
  if(firstBoss)risks.push(`仅本局首次Boss成功过关赠送一件，工具库存满则转${firstBoss.overflowGold}金，本局只发一次。`);
  risks.push('取消、过期、非法目标、没有变化或代价不足均不消费工具与资源。');
  return risks.join('');
}

const toolCache=new Map<string,ToolInfo>();
export function toolInfo(id:string,identity:R2ContentIdentity={}):ToolInfo {
  const tool=getR2Tool(id),price=r2ToolPrice(id,identity),cacheKey=id+'/'+price;
  const cached=toolCache.get(cacheKey);if(cached)return cached;
  const family=toolFamilyLabel(tool.family);
  const info=Object.freeze({name:tool.name,family:tool.family,label:`${family} · ${tool.name}`,
    summary:toolSummary(tool),description:`${tool.phases.map(phase=>phase==='shop'?'商店':'待出牌').join(' / ')}可用。${targetText(tool)}${operationText(tool)}`,
    cost:toolCost(tool,price),risk:toolRisk(tool),artUrl:goodsArtUrl(id,'tool-card','thumbnail')??toolArt(tool),detailArtUrl:goodsArtUrl(id,'tool-card','detail'),fallbackArtUrl:toolArt(tool)});
  toolCache.set(cacheKey,info);return info;
}
function itemDescription(item:R2LongTermDefinition):string {
  const op=item.operation;let effect:string;
  switch(op.kind){
    case 'hand-limit':effect=`下一场入场手牌上限+${op.amount}，最多${limits.handMaximum}张，当前场不补手牌。`;break;
    case 'discard-limit':effect=`下一场入场弃牌次数+${op.amount}，当前场预算不增加。`;break;
    case 'hands-limit':effect=`下一场入场出牌次数+${op.amount}，当前场预算不增加。`;break;
    case 'interest-cap':effect=`每次过关结算利息上限+${op.amount}金，在奖励前读取；不会直接赠送金币，须有足够存款产生利息。`;break;
    case 'joker-offer-count':effect=`后续开店与刷新时大丑牌货位${op.base}→${op.base+op.amount}，当前已生成货架不补货。`;break;
    case 'paid-reroll-discount':effect=`后续付费刷新价格−${op.amount}金，至少${op.minimum}金；免费刷新照常免费。`;break;
    case 'consumable-slots':effect=`工具库存容量+${op.amount}，最多${limits.consumableSlotsMaximum}格；立即按真实容量生效，失去其他扩容来源时须仍装得下。`;break;
    case 'deletion-floor':effect=`主动删牌与幻灵牺牲的牌组下限降为${op.floor}张；仍须保留当前场合法行动。玻璃破碎可以继续低于此下限。`;break;
    case 'boss-most-used-hand-upgrade':effect=`Boss成功过关时，将本章使用最多的已发现牌型升${op.levels}级；并列按牌型表从低到高选择，已到${limits.handLevelMaximum}级则跳过、不重选，已确定的计分保持原结果。`;break;
    case 'first-purchase-discount':effect=`每间商店第一次成功购买价格−${op.amount}金，至少${op.minimum}金，可与大丑牌优惠叠加。采购证自身这次购买不享受自身优惠；取消与失败不占用首购资格。`;break;
    case 'item-offer-count':effect=`后续开店长期道具货位${op.base}→${op.base+op.amount}；当前货架不补货，刷新也不重抽该货架。`;break;
    case 'first-normal-clear-per-chapter':effect=`每章首次普通场成功过关时，若已持有此道具则金币+${op.gold}；跳过普通场不占资格。首次成功过关即消耗该章资格，未持有时也如此，之后购买不追补。`;break;
    default:return impossible(op);
  }
  return `商店基准售价${item.price}金。${effect}本局持续生效，每种不可重复持有、不可出售，共最多${limits.longTermSlots}件长期道具。`;
}
const itemCache=new Map<string,ItemInfo>();
export function itemInfo(id:string):ItemInfo {
  const cached=itemCache.get(id);if(cached)return cached;
  const item=R2_LONG_TERM_ITEMS.find(row=>row.id===id);if(!item)throw Error(`unknown-r2-item: ${id}`);
  const info=Object.freeze({name:item.name,summary:itemDescription(item).replace(/^商店基准售价[^。]*。/,'').split('。')[0],description:itemDescription(item),artUrl:goodsArtUrl(id,'item-card','thumbnail')??itemArt(item),detailArtUrl:goodsArtUrl(id,'item-card','detail'),fallbackArtUrl:itemArt(item)});
  itemCache.set(id,info);return info;
}

// Mechanism emblems for C01 details, within the accepted printed-card palette.
// These small self-contained vectors are engineering candidates, not A03 illustrations.
const xml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]!));
const colors=PAPER_CSS;
const star=(x:number,y:number,size=8)=>`<path d="M${x-size} ${y}Q${x} ${y-2} ${x} ${y-size}Q${x+2} ${y} ${x+size} ${y}Q${x} ${y+2} ${x} ${y+size}Q${x-2} ${y} ${x-size} ${y}Z" fill="${colors.paperLight}" stroke="${colors.brass}" stroke-width="1.2"/>`;
const circle=(x:number,y:number,r:number)=>`<circle cx="${x}" cy="${y}" r="${r}"/>`;
const text=(x:number,y:number,value:string,size=24,fill=colors.paperLight)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Microsoft YaHei,PingFang SC,sans-serif" font-size="${size}" fill="${fill}" stroke="none">${xml(value)}</text>`;
const cardShape=(x:number,y:number,w=68,h=98)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${colors.paperLight}" stroke="${colors.brass}" stroke-width="2.4"/><path d="M${x+9} ${y+22}h12m-12 7h8M${x+w-21} ${y+h-20}h12" opacity=".65"/>`;
const arrow=(x:number,y:number,right=true)=>`<path d="M${x} ${y}h${right?40:-40}m${right?-12:12} -10l${right?12:-12} 10 ${right?-12:12} 10" fill="none" stroke="${colors.brass}" stroke-width="4" stroke-linejoin="round"/>`;
function framedArt(id:string,name:string,family:string,body:string):string {
  const ticks=Array.from({length:15},(_,i)=>`<path d="M${44+i*21} 70v${i%3===0?7:3}M${44+i*21} 462v${i%3===0?-7:-3}"/>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="384" height="536" viewBox="0 0 384 536"><title>${xml(name)} · ${xml(family)}</title><desc>${xml(name)}的机制纹章与纸牌边框</desc><defs><linearGradient id="paper" x2=".8" y2="1"><stop stop-color="${colors.paperLight}"/><stop offset="1" stop-color="${colors.paperEdge}"/></linearGradient><radialGradient id="field" cx=".28" cy=".2" r=".95"><stop stop-color="${colors.jade}"/><stop offset="1" stop-color="${colors.ink}"/></radialGradient></defs><rect x="8" y="8" width="368" height="520" rx="24" fill="url(#paper)" stroke="${colors.ink}" stroke-width="3"/><rect x="18" y="18" width="348" height="500" rx="18" fill="none" stroke="${colors.brass}" stroke-width="1.3"/><path d="M32 82V45q0-13 13-13h36M352 82V45q0-13-13-13h-36M32 454v37q0 13 13 13h36M352 454v37q0 13-13 13h-36" fill="none" stroke="${colors.jade}" stroke-width="2"/>${text(192,52,family,15,colors.jade)}<g fill="none" stroke="${colors.brass}" stroke-width="1">${ticks}</g><rect x="40" y="86" width="304" height="346" rx="80" fill="url(#field)"/><path d="M52 259a140 140 0 0 1 280 0" fill="none" stroke="${colors.paperLight}" opacity=".15"/><ellipse cx="192" cy="259" rx="121" ry="151" fill="none" stroke="${colors.brass}" opacity=".65"/><g fill="none" stroke="${colors.paperLight}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g>${star(81,153,4)}${star(303,360,4)}${text(192,464,name,23,colors.ink)}${text(192,491,id,11,colors.mutedInk)}<path d="M125 505h134" stroke="${colors.brass}" stroke-width="1.2"/></svg>`;
  return 'data:image/svg+xml,'+encodeURIComponent(svg);
}
type Constellation={points:readonly (readonly [number,number])[];edges:readonly (readonly [number,number])[]};
const constellations:Record<R2HandType,Constellation>={
  'high-card':{points:[[192,257]],edges:[]},
  pair:{points:[[145,258],[239,258]],edges:[[0,1]]},
  'two-pair':{points:[[135,216],[135,295],[249,216],[249,295]],edges:[[0,1],[2,3]]},
  'three-kind':{points:[[192,193],[126,304],[258,304]],edges:[[0,1],[1,2],[2,0]]},
  straight:{points:[[110,313],[151,285],[192,258],[233,230],[274,201]],edges:[[0,1],[1,2],[2,3],[3,4]]},
  flush:{points:[[120,243],[147,199],[201,189],[250,218],[267,265]],edges:[[0,1],[1,2],[2,3],[3,4]]},
  'full-house':{points:[[131,219],[192,190],[253,219],[155,301],[229,301]],edges:[[0,1],[1,2],[0,2],[3,4]]},
  'four-kind':{points:[[135,201],[249,201],[249,315],[135,315]],edges:[[0,1],[1,2],[2,3],[3,0]]},
  'straight-flush':{points:[[111,304],[151,254],[192,278],[233,203],[273,225]],edges:[[0,1],[1,2],[2,3],[3,4]]},
  'five-kind':{points:[[192,183],[270,238],[240,325],[144,325],[114,238]],edges:[[0,2],[2,4],[4,1],[1,3],[3,0]]},
  'flush-house':{points:[[132,243],[172,196],[212,243],[212,307],[264,281]],edges:[[0,1],[1,2],[2,0],[3,4]]},
  'flush-five':{points:[[192,178],[120,258],[192,258],[264,258],[192,338]],edges:[[0,1],[0,2],[0,3],[1,4],[2,4],[3,4]]},
};
function planetArt(hand:R2HandType):string {
  const constellation=constellations[hand];
  const links=constellation.edges.map(([a,b])=>{const p=constellation.points[a],q=constellation.points[b];return `<path d="M${p[0]} ${p[1]}L${q[0]} ${q[1]}"/>`;}).join('');
  const stars=constellation.points.map(([x,y])=>circle(x,y,14)+star(x,y,10)).join('');
  return `<ellipse cx="192" cy="259" rx="104" ry="61" transform="rotate(-24 192 259)" stroke="${colors.brass}" opacity=".23"/><g id="constellation"><g stroke="${colors.brass}" stroke-width="2.1">${links}</g><g stroke="${colors.brass}" stroke-width=".8">${stars}</g></g>${text(192,377,HAND_LABELS[hand],17)}`;
}
function enhancementGlyph(id:NonNullable<PlayingCard['enhancement']>):string {
  switch(id){
    case 'heat-paper':return '<path d="M191 216c-30 19-5 32-29 49-18-17-18-30-19-30-36 58-8 102 44 102 56 0 79-63 48-98-3 29-17 27-16 15 2-27-25-37-28-38Z" fill="'+colors.red+'" stroke="'+colors.brass+'"/>';
    case 'multiplier-paper':return `<path d="M174 251h36m-18-18v36M142 310h100" stroke="${colors.brass}" stroke-width="7"/>`;
    case 'glass-paper':return `<path d="M192 194l62 57-62 86-62-86Z" fill="${colors.jadeSoft}" fill-opacity=".16"/><path d="M130 251h124M192 194l-21 57 21 86 21-86ZM180 273l15 11-12 20" stroke="${colors.brass}" stroke-width="2"/>`;
    case 'voice-paper':return `<path d="M146 242v67M133 256v40M122 269v15M240 242v67M253 256v40M264 269v15" stroke="${colors.brass}"/><path d="M175 215v94c-29-12-47 20-16 27 19 5 37-10 37-25v-72l32-12v-28Z" fill="${colors.paperLight}"/>`;
    case 'gold-paper':return `<g stroke="${colors.brass}" stroke-width="3">${circle(192,266,51)}${circle(192,266,40)}<path d="M183 248h18v35h-18ZM153 320h78"/></g>${text(192,379,'持牌',15)}`;
    case 'encore-paper':return `<path d="M141 251a57 57 0 0 1 106-10m-20-3 22 6 4-22M244 284a57 57 0 0 1-106 10m20 3-22-6-4 22" stroke="${colors.brass}" stroke-width="6"/>${text(192,281,'+1',28)}`;
    case 'lucky-paper':return `<path d="M192 266c-69-49-39-88-8-69 9 5 8 18 8 18s0-36 29-24c34 15 12 41-18 62 46-15 67 19 41 39-24 19-40-6-43-14 6 25 22 30 9 51-27 30-47-10-30-47-25 39-62 24-63 4 0-32 35-23 57-17Z" fill="${colors.jade}" stroke="${colors.brass}" stroke-width="2.5"/><path d="M193 269l-9 66"/>`;
    default:return impossible(id);
  }
}
function toolArt(tool:R2ToolDefinition):string {
  const op=tool.operation;let body:string;
  switch(op.kind){
    case 'upgrade-hand':body=op.handType?planetArt(op.handType):`${cardShape(155,197,74,109)}${text(192,276,`+${op.levels}`,30,colors.jade)}${arrow(168,338)}`;break;
    case 'delete-cards':body=`${cardShape(171,191)}<path d="M134 304l103-93M145 303l-22-8M137 316l104 25M137 305l-8 22" stroke="${colors.brass}" stroke-width="4"/>${circle(118,289,12)}${circle(119,329,12)}`;break;
    case 'set-suit':body=`${cardShape(158,190,78,123)}${text(197,273,SUIT_SYMBOL[op.suit],51,op.suit==='hearts'||op.suit==='diamonds'?colors.red:colors.ink)}<path d="M137 301l-23 40 17 8 25-40" fill="${colors.brass}"/>`;break;
    case 'copy-card':body=`${cardShape(123,178)}${cardShape(155,204)}${op.copies===2?cardShape(192,232):''}${arrow(214,338)}${text(145,369,`+${op.copies}`,22)}`;break;
    case 'shift-rank':body=`${cardShape(154,201,77,108)}${text(192,271,`${op.delta>0?'+':'−'}${Math.abs(op.delta)}`,33,colors.jade)}<path d="M252 ${op.delta>0?309:211}v${op.delta>0?-92:92}m-10 ${op.delta>0?12:-12}l10 ${op.delta>0?-12:12} 10 ${op.delta>0?12:-12}" stroke="${colors.brass}" stroke-width="5"/>`;break;
    case 'set-enhancement':body=enhancementGlyph(op.enhancement);break;
    case 'add-gold':body=`<path d="M121 213h142v107H121ZM121 213l71 64 71-64" fill="${colors.red}" stroke="${colors.brass}"/><g stroke="${colors.brass}">${circle(229,318,31)}${circle(229,318,23)}</g>${text(229,326,`+${op.amount}`,17)}`;break;
    case 'restore-discard':body=`${cardShape(156,205,72,106)}<path d="M242 319a71 71 0 1 0-106-88m1-21-4 24 24-4" stroke="${colors.brass}" stroke-width="5"/>${text(193,278,`+${op.amount}`,27,colors.jade)}`;break;
    case 'free-reroll':body=`<path d="M119 240h146v95H119ZM112 240l17-42h127l16 42M139 247v81m35-81v81m35-81v81m35-81v81" stroke="${colors.brass}"/><path d="M161 176a49 49 0 0 1 72-2m-18-4 20 7 3-20"/>${text(192,362,'免费',19)}`;break;
    case 'random-enhancement':body=`${cardShape(132,209)}${cardShape(211,209)}<path d="M111 217l30-41-26-12 31-27m-36 185 24 13-9 26" stroke="${colors.brass}"/>${star(167,260,15)}${star(246,260,15)}${text(190,354,'七种机缘',16)}`;break;
    case 'random-edition':body=`<path d="M190 173l-68 126h135ZM190 173l-10 126M148 250l121-43M160 276l127-3M155 300l121 46" stroke="${colors.brass}"/><path d="M270 203l14-4M285 271l13 0M276 346l12 6" stroke="${colors.red}" stroke-width="6"/>${text(192,379,'三种版次',16)}`;break;
    case 'set-deck-suit':body=`<g transform="rotate(-20 191 300)">${cardShape(135,200)}</g>${cardShape(158,193)}<g transform="rotate(20 191 300)">${cardShape(183,200)}</g>${text(192,276,'♠',38,colors.ink)}${text(192,357,'全牌组',17)}`;break;
    case 'exchange-hand-levels':body=`<path d="M118 203h63v113l-31-22-32 22ZM204 203h63v113l-31-22-32 22" fill="${colors.jade}" stroke="${colors.brass}"/>${text(150,265,`−${op.loss}`,27)}${text(236,265,`+${op.gain}`,27)}${arrow(143,352)}${arrow(238,332,false)}`;break;
    case 'rare-joker-reward':body=`<path d="M192 182l60 39 15 51-75 74-75-74 15-51ZM132 221h120l-60 125ZM117 272h150" fill="${colors.jade}" stroke="${colors.brass}"/>${star(192,249,18)}${text(192,379,'稀有机缘',17)}`;break;
    case 'set-joker-edition':body=`<path d="M120 222l18-24 17 27 13-22 14 41-6 77-27 15-28-29Z" stroke="${colors.brass}" stroke-dasharray="4 5" opacity=".5"/><path d="M207 210l18-24 17 27 14-22 13 41-6 81-27 18-28-29Z" fill="${colors.jade}" stroke="${colors.brass}"/><path d="M224 249l13-4 11 4m-18 31 16 0"/>${star(236,363,13)}`;break;
    case 'clear-deck-specials':body=`${cardShape(144,203)}${cardShape(189,216)}<path d="M132 327l109-97 17 19-109 97ZM131 329l-20 16 9 24 27-23" fill="${colors.brass}" stroke="${colors.paperLight}"/>${star(269,298,11)}${star(238,349,8)}${text(192,384,'净台',16)}`;break;
    default:return impossible(op);
  }
  return framedArt(tool.id,tool.name,toolFamilyLabel(tool.family),body);
}
function itemArt(item:R2LongTermDefinition):string {
  const op=item.operation;let glyph:string;
  switch(op.kind){
    case 'hand-limit':glyph=`<path d="M119 297h146v25H119Zm15 25v28m117-28v28"/>${cardShape(151,191,62,91)}${text(244,230,`+${op.amount}`,25)}`;break;
    case 'discard-limit':glyph=`<path d="M124 209h136v106H124Zm20-13v132m96-132v132" stroke="${colors.brass}"/>${text(192,276,`+${op.amount}`,35)}`;break;
    case 'hands-limit':glyph=`<path d="M125 207h134v113H125Zm12 11h109v24H137Z" fill="${colors.jade}" stroke="${colors.brass}"/>${text(192,292,`+${op.amount}`,36)}`;break;
    case 'interest-cap':glyph=`<path d="M128 201h60l5 18 6-18h57v119h-57l-6 13-5-13h-60ZM193 219v100" stroke="${colors.brass}"/>${circle(222,277,25)}${text(222,285,`+${op.amount}`,20)}`;break;
    case 'joker-offer-count':case 'item-offer-count':glyph=`<path d="M115 225l17-28h120l17 28M124 231h136v105H124ZM132 258h120M132 289h120M162 225v111m59-111v111" stroke="${colors.brass}"/>${text(192,369,`${op.base}→${op.base+op.amount}`,26)}`;break;
    case 'paid-reroll-discount':glyph=`${circle(192,260,61)}${circle(192,260,49)}<path d="M158 217l34-12 34 12v67l-34 29-34-29Z" fill="${colors.jade}" stroke="${colors.brass}"/>${text(192,272,`−${op.amount}`,31)}`;break;
    case 'consumable-slots':glyph=`<path d="M131 217h122v49H131Zm-7 55h136v49H124ZM146 206v-11h92v11" fill="${colors.jade}" stroke="${colors.brass}"/>${text(192,251,`+${op.amount}`,24)}<path d="M159 286h66"/>`;break;
    case 'deletion-floor':glyph=`<path d="M141 195h105v132H141ZM151 207v105m8-86h73m-73 24h54m-54 24h62" stroke="${colors.brass}"/>${text(194,307,String(op.floor),25)}`;break;
    case 'boss-most-used-hand-upgrade':glyph=`<path d="M129 201h112v125H129ZM141 211v106m16-79 16 13 36-35m-50 61 15 12 41-38" stroke="${colors.brass}"/>${star(243,317,22)}`;break;
    case 'first-purchase-discount':glyph=`<path d="M129 208h94l30 52-30 51h-94Z" fill="${colors.jade}" stroke="${colors.brass}"/>${circle(236,260,6)}${text(178,271,`−${op.amount}`,31)}`;break;
    case 'first-normal-clear-per-chapter':glyph=`<path d="M128 225h128v99H128ZM120 218l17-22 26 13 29-16 28 16 29-13 16 22" fill="${colors.red}" stroke="${colors.brass}"/>${circle(191,271,33)}${text(191,281,`+${op.gold}`,28)}`;break;
    default:return impossible(op);
  }
  return framedArt(item.id,item.name,'长期道具',glyph);
}
