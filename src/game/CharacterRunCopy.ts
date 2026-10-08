import {usesR2ErxiangCore} from '../domain/r2GroupUpgrade';
import {newRunIdentity} from './RunLaunch';
import type {CharacterId} from '../domain/characters';
import {getCharacter} from './characters';
import type {R2RunState} from '../domain/r2Run';
import {R2_ASSIST_CONTRACT} from '../domain/r2Assist';
import {r2UsesAssist} from '../domain/r2Run';
import {R2_PUBLISHED_CONTENT} from '../domain/r2PublishedContent';

/** Saved-run copy is scoped to its identity; character selection uses the actual new-game identity. */
export function characterForRun(run:Pick<R2RunState,'characterId'|'contentVersion'|'contentHash'>){
 const character=getCharacter(run.characterId);
 if(usesR2ErxiangCore(run))return {...character,passiveName:'同点核心（候选）',buildTip:'两对及以上：长按已选计分牌，指定其点数的全部可用核心；每张额外计分1次，连续两手接同点则2次。可以取消或换点；高牌、对子不发动。',passiveDescription:'两对及以上可指定同点计分核心：每张额外计分1次，连续接同点则2次（总额外上限4）。未指定或不成型出牌清连锁；弃牌保留，入场重置。'};
 if(run.characterId!=='amo')return character;
 if(r2UsesAssist(run))return {...character,passiveName:'主手＋助攻（试行）',buildTip:'先凑两对、三条、顺子、同花或更高主手，再决定是否用剩余同点对子／三条助攻。每场一次，可留到关键手；高牌和对子仅兜底，不能助攻。副组会真消耗，不算主手或留手。',passiveDescription:'每场'+R2_ASSIST_CONTRACT.usesPerStage+'次：两对及以上主手＋剩余对子×'+R2_ASSIST_CONTRACT.pair+'／三条×'+R2_ASSIST_CONTRACT.three+'。副组真消耗，不算主手或留手；高牌、对子不能助攻。'};
 if(run.contentHash===R2_PUBLISHED_CONTENT.v10.hash)return {...character,passiveDescription:'高牌 Lv3 开局；只打出1张时，倍率 ×3，在整手大丑牌之前结算。'};
 return {...character,passiveDescription:'高牌 Lv3 开局；只打出1张时，整手大丑牌之后，最终倍率 ×3。'};
}

export function characterForNewRun(characterId:CharacterId){return characterForRun({characterId,...newRunIdentity(characterId,'group')});}
