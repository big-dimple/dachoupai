import type {R2RunState} from '../domain/r2Run';
import {r2RunModeConfig} from '../content/r2Modes';
import {characterForRun} from './CharacterRunCopy';
import {selectionPortraitURL} from './portraits';
import {buildGrowthProgress,type BuildGrowthProgress} from './BuildGrowthProgress';
export interface BuildKeepsake {
 hero:{name:string;ability:string;tip:string;details?:string;url:string;modeNote:string};
 growth:BuildGrowthProgress[];
}
/** Current identity and held instance ledger only; no command, forecast or invented history. */
export function buildKeepsake(state:R2RunState):BuildKeepsake {
 const hero=characterForRun(state),tip=hero.buildTip.split('。')[0]+'。';
 return {hero:{name:hero.name,ability:hero.passiveName,tip,details:tip===hero.buildTip?undefined:hero.buildTip,url:selectionPortraitURL(state.characterId),modeNote:r2RunModeConfig(state).characterAbilityEnabled?'打法提示 · 能否使用按本场条件':'本模式角色能力停用 · 不产生角色收益'},growth:buildGrowthProgress(state)};
}
