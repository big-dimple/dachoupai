import manifest from '../../public/assets/handdrawn-tools/manifest.json';
import {assetUrl} from './theme';
/** Tools and permanent items are independent of the 72 functional Joker cards. */
export const GOODS_ART=manifest.assets;
export function goodsArtUrl(id:string,category:'tool-card'|'item-card',purpose:'thumbnail'|'detail'):string|undefined {
  const output=GOODS_ART.find(a=>a.domainId===id&&a.category===category)?.outputs.find(o=>o.purpose===purpose);
  return output?assetUrl('assets/handdrawn-tools/'+output.path):undefined;
}
