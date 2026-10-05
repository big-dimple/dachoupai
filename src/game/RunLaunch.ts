import type {CharacterId} from '../domain/characters';
import type {R2RunState} from '../domain/r2Run';
import {r2RulesetFor} from '../domain/r2Run';
import {R2_COMBO_GROWTH_VERSION,R2_COMBO_GROWTH_HASH} from '../domain/r2ComboGrowth';

export type RunLaunchIntent={kind:'new'}|{kind:'retry';run:R2RunState};
/** Only the normal new-game route follows this policy. Saved runs carry their own identity. */
export function newRunIdentity(_characterId:CharacterId){
  return {contentVersion:R2_COMBO_GROWTH_VERSION,contentHash:R2_COMBO_GROWTH_HASH};
}
export function launchIdentity(characterId:CharacterId,intent:RunLaunchIntent){
  if(intent.kind==='new')return newRunIdentity(characterId);
  if(intent.kind!=='retry'||intent.run.characterId!==characterId||!r2RulesetFor(intent.run))throw Error('invalid-retry-identity');
  return {contentVersion:intent.run.contentVersion,contentHash:intent.run.contentHash};
}
