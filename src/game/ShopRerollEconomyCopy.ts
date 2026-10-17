import type {R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {r2PaidRerollPrice,r2PurchasePrice} from '../domain/r2Shop';
import {r2RunModeConfig} from '../content/r2Modes';

/** T18 compares the real current payment paths; it changes neither path. */
export function shopRerollEconomyCopy(run:R2RunState,offer?:R2Offer){
 const allowed=r2RunModeConfig(run).reroll.allowed,free=(run.shop?.freeRerolls??0)>0;
 const direct=free?0:r2PaidRerollPrice(run),paid=offer?r2PurchasePrice(run,offer):0,saved=direct-paid;
 const summary=!allowed?'本模式不能换牌':offer?(saved<0?'立用比直刷多花'+(-saved)+'金':saved>0?'立用比直刷省'+saved+'金':'立用与直刷同价'):free?'已有免费换牌，可留着此工具':'已持有：本次可省'+direct+'金';
 const detail=(offer?'买来实付'+paid+'金，使用不另花金；当前直接换牌'+direct+'金。':'已在库存，不再计算购买价；当前直接换牌'+direct+'金。')+summary+'。'+(free?'本店已有免费换牌机会。':'')+'消耗此工具只刷新唐宋牌和工具各一次，本店换牌次数仍增加。未使用可带到以后商店，占1格库存。';
 return {summary,detail,direct,paid,saved,free,allowed};
}
