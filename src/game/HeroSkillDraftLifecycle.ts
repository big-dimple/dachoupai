import type {R2RunState} from '../domain/r2Run';
import type {R2SelectionFacts} from '../domain/r2SelectionFacts';
import type {XiemuBurnCost} from '../domain/r2XiemuBurn';
import {erxiangChoice} from './ErxiangHandoffCopy';
import {azaoChoice} from './AzaoChargeCopy';
import {xiemuChoice} from './XiemuBurnCopy';

export interface ChosenHeroDraft {erxiangTargetId:string|null;azaoRelease:boolean;xiemuBurn:XiemuBurnCost}
/** Keep only the user's existing choices that remain legal for the newly selected hand. */
export function retainChosenHeroDraft(run:R2RunState,facts:R2SelectionFacts|undefined,draft:ChosenHeroDraft):ChosenHeroDraft {
  return {
    erxiangTargetId:erxiangChoice(run,facts,draft.erxiangTargetId).selected?.card.id??null,
    azaoRelease:draft.azaoRelease&&azaoChoice(run,facts?.type).available,
    xiemuBurn:draft.xiemuBurn&&xiemuChoice(run,facts?.type).choices.some(c=>c.cost===draft.xiemuBurn&&c.available)?draft.xiemuBurn:0,
  };
}
