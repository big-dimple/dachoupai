import type {CharacterId} from '../domain/characters';
import type {R2RunState} from '../domain/r2Run';
import {r2RulesetFor,R2_CONTENT_VERSION,R2_CONTENT_HASH} from '../domain/r2Run';
import {R2_ASSIST_VERSION,R2_ASSIST_HASH} from '../domain/r2Assist';

export type RunLaunchIntent={kind:'new'}|{kind:'retry';run:R2RunState};
/** Only the normal new-game route follows this policy. Saved runs carry their own identity. */
export function newRunIdentity(characterId:CharacterId){
  return characterId==='amo'?{contentVersion:R2_ASSIST_VERSION,contentHash:R2_ASSIST_HASH}:{contentVersion:R2_CONTENT_VERSION,contentHash:R2_CONTENT_HASH};
}
export function launchIdentity(characterId:CharacterId,intent:RunLaunchIntent){
  if(intent.kind==='new')return newRunIdentity(characterId);
  if(intent.kind!=='retry'||intent.run.characterId!==characterId||!r2RulesetFor(intent.run))throw Error('invalid-retry-identity');
  return {contentVersion:intent.run.contentVersion,contentHash:intent.run.contentHash};
}
