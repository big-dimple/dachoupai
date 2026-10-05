import type {R2RunState} from '../domain/run';
import {r2ConsumableCapacity} from '../domain/r2Resources';
import {playedFootprint,type Box,type TableLayout} from './layout';

export const toolInventoryLabel=(state:Pick<R2RunState,'consumables'|'longTermItems'|'jokers'>):string=>`工具包 ${state.consumables.length}/${r2ConsumableCapacity(state)}`;
/** Reuse spare table/sidebar space; hand seats and the main action row stay unchanged. */
export function gameToolInventoryBox(l:TableLayout):Box {
  if(l.mode==='portrait')return {x:l.hand.x+l.hand.width-112,y:l.hand.y-48,width:112,height:44};
  if(l.mode==='landscape')return {x:l.hud.x+4,y:l.status.y-45,width:112,height:44};
  return {x:l.hud.x+12,y:l.hud.y+380,width:l.hud.width-24,height:44};
}
/** Only expanded portrait hands need to reserve the entry below their preview. */
export function toolInventoryPlayedArea(l:TableLayout):Box {
  const area=l.playedArea;if(l.mode!=='portrait')return area;
  const entry=gameToolInventoryBox(l),mat=playedFootprint(area,true);
  return mat.y+mat.height<=entry.y-4?area:{...area,height:Math.min(area.height,entry.y-4-area.y)};
}
export function toolInventoryProgressY(l:TableLayout,original:number):number {
  return l.mode==='landscape'?Math.min(original,gameToolInventoryBox(l).y-9):original;
}
/** The existing shop tab row owns both shopping tabs and the direct inventory entry. */
export function shopToolInventoryRow(tabs:Box){
  const inventory={x:tabs.x+tabs.width-88,y:tabs.y,width:88,height:44};
  return {inventory,shelves:{...tabs,width:tabs.width-94}};
}
