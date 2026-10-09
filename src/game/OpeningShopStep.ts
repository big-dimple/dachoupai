import type {R2RunState} from '../domain/r2Run';
import {r2ConsumableCapacity} from '../domain/r2Run';
import {r2JokerCapacity} from '../domain/r2Resources';
import {r2PurchasePrice} from '../domain/r2Shop';
import {starterOffer} from './RouteStarter';
import {currentBuildFocus,toolSupportsFocus} from './BuildJourney';
import {toolInfo} from './r2ToolInfo';
import {r2ToolAllowed} from '../domain/r2ToolRuntime';
import {R2_TOOLS} from '../content/r2Tools';
/** One optional next operation from actual shelf/owned facts; never fabricates supply. */
export function openingShopStep(s:R2RunState){
 if(s.phase!=='shop'||s.stageIndex!==0||!s.openingRoute)return;
 const offer=s.shop?.offers.find(o=>starterOffer(s,o));
 if(offer&&s.jokers.length<r2JokerCapacity(s))return {kind:'jokers' as const,offerId:offer.offerId,text:starterOffer(s,offer)!.name+' · '+r2PurchasePrice(s,offer)+'金，查看后再决定',action:'看起手'};
 if(!s.routeStarter?.instanceId||!s.jokers.some(j=>j.instanceId===s.routeStarter?.instanceId))return;
 const focus=currentBuildFocus(s,s.openingRoute),owned=s.consumables.find(c=>r2ToolAllowed(s,c.definitionId)&&R2_TOOLS.find(t=>t.id===c.definitionId)!.phases.includes('shop')&&toolSupportsFocus(c.definitionId,focus!));
 if(owned)return {kind:'inventory' as const,instanceId:owned.instanceId,text:'起手已收入 · '+toolInfo(owned.definitionId,s).name+'在库存，查看目标与代价',action:'看工具'};
 const choice=basicChoiceSeat(s),price=choice&&r2PurchasePrice(s,choice);
 if(choice&&!choice.consumed&&price!==undefined&&s.gold>=price&&s.consumables.length<r2ConsumableCapacity(s)&&r2BasicChoicePool(s).length)return {kind:'basic-tools' as const,text:`起手已收入 · 改点／删牌或增强，自选1件实付${price}金`,action:'选基础改牌'};
 const tool=s.consumables.length<r2ConsumableCapacity(s)?s.shop?.toolOffers.find(o=>!o.consumed&&r2ToolAllowed(s,o.definitionId)&&r2PurchasePrice(s,o)<=s.gold&&toolSupportsFocus(o.definitionId,focus!)&&['shift-rank','set-suit','set-enhancement','upgrade-hand','copy-card'].includes(R2_TOOLS.find(t=>t.id===o.definitionId)!.operation.kind)):undefined;
 if(tool)return {kind:'tools' as const,offerId:tool.offerId,text:'起手已收入 · '+toolInfo(tool.definitionId,s).name+' '+r2PurchasePrice(s,tool)+'金可做牌',action:'看工具'};
 return {kind:'hand' as const,text:'起手已收入 · 留钱也能入场，按当前牌找'+(focus==='group'?'两对／三条':focus==='straight'?'顺子':'同花'),action:'看用途'};
}
import {basicChoiceSeat} from './BasicToolChoice';
import {r2BasicChoicePool} from '../domain/r2Shop';
