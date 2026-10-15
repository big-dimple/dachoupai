import {R2_S04_FINISH_VERSION,R2_S04_FINISH_HASH} from '../domain/r2GroupUpgrade';
import type {CharacterId} from '../domain/characters';
import type {R2RunState} from '../domain/r2Run';
import {r2RulesetFor} from '../domain/r2Run';
import {type R2OpeningRoute} from '../domain/r2GroupUpgrade';

export type RunLaunchIntent={kind:'new';openingRoute?:R2OpeningRoute}|{kind:'retry';run:R2RunState};
/** Only the normal new-game route follows this policy. Saved runs carry their own identity. */
export function newRunIdentity(_characterId:CharacterId,_route?:R2OpeningRoute){
  return {contentVersion:R2_S04_FINISH_VERSION,contentHash:R2_S04_FINISH_HASH};
}
export function launchIdentity(characterId:CharacterId,intent:RunLaunchIntent){
  if(intent.kind==='new')return newRunIdentity(characterId,intent.openingRoute);
  if(intent.kind!=='retry'||intent.run.characterId!==characterId||!r2RulesetFor(intent.run))throw Error('invalid-retry-identity');
  return {contentVersion:intent.run.contentVersion,contentHash:intent.run.contentHash};
}
