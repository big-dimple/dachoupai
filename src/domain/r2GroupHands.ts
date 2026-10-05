import type {PlayingCard} from '../cards/types';
import type {R2HandType} from './evaluateR2';
/** Exact evaluated types; a plain flush never becomes a group by inspecting ranks. */
export const R2_GROUP_HAND_TYPES:readonly R2HandType[]=Object.freeze(['pair','two-pair','three-kind','full-house','four-kind','five-kind','flush-house','flush-five']);
/** Original main scoring set, including disabled cards. Ties retain the first group in main-hand order. */
export function r2LargestScoringRankGroup(played:readonly PlayingCard[],scoringIds:readonly string[]):string[] {
 const groups=new Map<number,string[]>();
 for(const card of played)if(scoringIds.includes(card.id)){const group=groups.get(card.rank)??[];group.push(card.id);groups.set(card.rank,group);}
 let chosen:string[]=[];for(const ids of groups.values())if(ids.length>chosen.length)chosen=ids;
 return chosen;
}
