import type {CharacterId} from '../../src/domain/characters';
import {R2_S04_FINISH_VERSION,R2_S04_FINISH_HASH,type R2OpeningRoute} from '../../src/domain/r2GroupUpgrade';
export {launchIdentity} from '../../src/game/RunLaunch';
/** Frozen pre-exile identity for existing assist regressions; never the product new-run policy. */
export const newRunIdentity=(_id:CharacterId,_route?:R2OpeningRoute)=>({contentVersion:R2_S04_FINISH_VERSION,contentHash:R2_S04_FINISH_HASH});
