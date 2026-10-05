import data from './r2PublishedContent.json';
import type {R2JokerDefinition} from '../content/r2Schema';
/** Published contracts are immutable, not recomputed from tomorrow's global definitions. */
function freeze<T>(value:T):T {
  if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}
  return value;
}
export const R2_PUBLISHED_CONTENT=freeze(data);
export const R2_PUBLISHED_JOKERS=R2_PUBLISHED_CONTENT.snapshot.jokers as unknown as readonly R2JokerDefinition[];
