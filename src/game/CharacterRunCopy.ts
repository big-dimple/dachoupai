import {getCharacter} from './characters';
import type {R2RunState} from '../domain/r2Run';
import {R2_ASSIST_VERSION,R2_ASSIST_HASH,R2_ASSIST_CONTRACT} from '../domain/r2Assist';
import {R2_PUBLISHED_CONTENT} from '../domain/r2PublishedContent';

/** Saved-run copy is scoped to its identity; character selection keeps the default. */
export function characterForRun(run:Pick<R2RunState,'characterId'|'contentVersion'|'contentHash'>){
 const character=getCharacter(run.characterId);
 if(run.characterId!=='amo')return character;
 if(run.contentVersion===R2_ASSIST_VERSION&&run.contentHash===R2_ASSIST_HASH)return {...character,passiveName:'主手＋助攻',passiveDescription:'两对、三条、顺子、同花及更高合格主手，可用剩余同点对子 ×'+R2_ASSIST_CONTRACT.pair+' 或三条 ×'+R2_ASSIST_CONTRACT.three+' 助攻；每场 '+R2_ASSIST_CONTRACT.usesPerStage+' 次。助攻会一同用掉，不算主手或留手牌。'};
 if(run.contentHash===R2_PUBLISHED_CONTENT.v10.hash)return {...character,passiveDescription:'高牌 Lv3 开局；只打出1张时，倍率 ×3，在整手大丑牌之前结算。'};
 return {...character,passiveDescription:'高牌 Lv3 开局；只打出1张时，整手大丑牌之后，最终倍率 ×3。'};
}
