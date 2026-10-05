import {R2_PUBLISHED_CONTENT,R2_PUBLISHED_JOKERS} from './r2PublishedContent';
import {R2_ASSIST_HASH,R2_ASSIST_VERSION} from './r2Assist';
import {R2_ASSIST_JOKERS} from '../content/r2AssistJokers';

export interface R2ContentIdentity {contentVersion?:unknown;contentHash?:unknown}
/** Exact run identity; no global default or mixed-version fallback. */
export function r2JokerDefinitionsFor(identity:R2ContentIdentity) {
 if(identity.contentVersion===R2_ASSIST_VERSION&&identity.contentHash===R2_ASSIST_HASH)return R2_ASSIST_JOKERS;
 if([R2_PUBLISHED_CONTENT.v10,R2_PUBLISHED_CONTENT.v11].some(p=>p.version===identity.contentVersion&&p.hash===identity.contentHash))return R2_PUBLISHED_JOKERS;
 throw Error('incompatible-version');
}
export function r2JokerDefinitionFor(identity:R2ContentIdentity,id:string) {
 const definition=r2JokerDefinitionsFor(identity).find(d=>d.id===id);
 if(!definition)throw Error('unavailable-joker-definition');
 return definition;
}
