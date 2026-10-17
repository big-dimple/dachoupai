import type {R2RunState} from '../domain/run';
import {bossPreparationFacts} from './BossPreparationPresentation';
export const SHOP_BOSS_WARNING='前方压轴强敌将至，请备足牌组与工具！';
/** Current saved preparation only; previous Boss identities and a completed stage do not own shop UI/audio. */
export function shopBossPreparation(run:R2RunState){
 if(run.phase!=='shop'||run.shop?.visitIndex!==run.stageIndex)return;
 return bossPreparationFacts(run);
}
export const shopBossWarning=(run:R2RunState)=>shopBossPreparation(run)?SHOP_BOSS_WARNING:undefined;
/** Drop a formerly cached Boss sentence; ordinary transaction feedback retains its existing lifetime. */
export const currentShopNotice=(run:R2RunState,notice:string)=>notice&&notice!==SHOP_BOSS_WARNING?notice:shopBossWarning(run);
