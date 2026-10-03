import type {Box} from './layout';

/** Translate a whole printed pip row past the measured index, in card CSS space.
 * Font fallback can make the index wider than the nominal symmetric pip lane.
 * Keep the row's glyph size and spacing; only rows alongside the index move.
 */
export function cardPipRowOffset(index:Box,row:readonly Box[],clearance=3):number {
  if(!row.length||!row.some(p=>p.y<index.y+index.height&&index.y<p.y+p.height))return 0;
  return Math.max(0,index.x+index.width+clearance-Math.min(...row.map(p=>p.x)));
}
