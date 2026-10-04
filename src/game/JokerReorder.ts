import {insertIdAtIndex} from '../vendor/browslatro/reordering';

/** Move an owned instance to a final slot; unchanged/invalid moves keep the input reference. */
export function reorderJokerIds(ids:readonly string[],sourceId:string,to:number):readonly string[] {
  const from=ids.indexOf(sourceId);
  if(from<0||!Number.isInteger(to)||to<0||to>=ids.length||from===to)return ids;
  // Browslatro targets a gap before removal; this UI targets the final occupied slot.
  const destGap=to>from?to+1:to;
  return insertIdAtIndex(ids,sourceId,destGap);
}
