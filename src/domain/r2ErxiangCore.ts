import {RANKS,type Rank,type PlayingCard} from '../cards/types';
import {AMO_ASSIST_TYPES} from './r2QualifiedHands';
import type {R2SelectionFacts} from './r2SelectionFacts';
export interface ErxiangCoreIntent {targetId:string|null;previousRank:Rank|null}
export interface ErxiangCoreTrace extends ErxiangCoreIntent {targetRank:Rank|null;targetIds:string[];extraPerCard:0|1|2}
/** Only visible, actually active scoring cores qualify. Same rank, never same entity. */
export function erxiangCoreFacts(cards:readonly PlayingCard[],facts:Pick<R2SelectionFacts,'type'|'activeScoringIds'>,intent:ErxiangCoreIntent,enabled:boolean):ErxiangCoreTrace {
 if(intent.previousRank!==null&&!RANKS.includes(intent.previousRank))throw Error('invalid-core-previous-rank');
 if(intent.targetId===null)return {...intent,targetRank:null,targetIds:[],extraPerCard:0};
 const target=cards.find(c=>c.id===intent.targetId);
 if(!enabled||!target||!facts.activeScoringIds.includes(target.id)||!AMO_ASSIST_TYPES.includes(facts.type))throw Error('invalid-core-target');
 return {...intent,targetRank:target.rank,targetIds:cards.filter(c=>facts.activeScoringIds.includes(c.id)&&c.rank===target.rank).map(c=>c.id),extraPerCard:intent.previousRank===target.rank?2:1};
}
