import type {CharacterId} from '../domain/characters';
import type {R2RunState} from '../domain/r2Run';
import {r2RulesetFor} from '../domain/r2Run';
import {R2_GROUP_UPGRADE_VERSION,R2_GROUP_UPGRADE_HASH,R2_ERXIANG_CORE_VERSION,R2_ERXIANG_CORE_HASH,type R2OpeningRoute} from '../domain/r2GroupUpgrade';

export type RunLaunchIntent={kind:'new';openingRoute?:R2OpeningRoute}|{kind:'retry';run:R2RunState};
/** Only the normal new-game route follows this policy. Saved runs carry their own identity. */
export function newRunIdentity(_characterId:CharacterId,route?:R2OpeningRoute){
  if(route)return {contentVersion:R2_ERXIANG_CORE_VERSION,contentHash:R2_ERXIANG_CORE_HASH};
  return {contentVersion:R2_GROUP_UPGRADE_VERSION,contentHash:R2_GROUP_UPGRADE_HASH};
}
export function launchIdentity(characterId:CharacterId,intent:RunLaunchIntent){
  if(intent.kind==='new')return newRunIdentity(characterId,intent.openingRoute);
  if(intent.kind!=='retry'||intent.run.characterId!==characterId||!r2RulesetFor(intent.run))throw Error('invalid-retry-identity');
  return {contentVersion:intent.run.contentVersion,contentHash:intent.run.contentHash};
}
