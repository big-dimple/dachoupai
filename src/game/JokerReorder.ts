import {insertIdAtIndex} from '../vendor/browslatro/reordering';
import type {Box} from './layout';

/** Nearest occupied final seat, including the small paper gaps; never goods or empty seats. */
export function ownedJokerDropIndex(slots:readonly Box[],count:number,x:number,y:number):number {
  const occupied=slots.slice(0,count),first=occupied[0],last=occupied.at(-1);
  if(!first||!last||!Number.isFinite(x)||!Number.isFinite(y)||x<first.x||x>last.x+last.width||y<first.y||y>first.y+first.height)return -1;
  let to=0;
  for(let i=1;i<occupied.length;i++)if(x>=(occupied[i-1].x+occupied[i-1].width/2+occupied[i].x+occupied[i].width/2)/2)to=i;
  return to;
}

/** Move an owned instance to a final slot; unchanged/invalid moves keep the input reference. */
export function reorderJokerIds(ids:readonly string[],sourceId:string,to:number):readonly string[] {
  const from=ids.indexOf(sourceId);
  if(from<0||!Number.isInteger(to)||to<0||to>=ids.length||from===to)return ids;
  // Browslatro targets a gap before removal; this UI targets the final occupied slot.
  const destGap=to>from?to+1:to;
  return insertIdAtIndex(ids,sourceId,destGap);
}
