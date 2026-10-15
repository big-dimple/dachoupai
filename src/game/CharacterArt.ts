import manifest from '../../public/assets/handdrawn-p08/manifest.json';
import type {CharacterId} from '../domain/characters';

export type CharacterArtPurpose='avatar'|'selection'|'portrait';
const prefixes:Record<CharacterArtPurpose,string>={avatar:'avatar-',selection:'selection-portrait-',portrait:'opening-portrait-'};
/** One same-ID manifest owns every runtime face. Existing paintings are transitional, not the new cast approval. */
export function characterArt(id:CharacterId,purpose:CharacterArtPurpose){
  const output=manifest.assets.find(a=>a.category==='character'&&a.id===id)?.outputs.find(o=>o.purpose===purpose);
  if(!output)throw Error(`character-art-missing:${id}/${purpose}`);
  const path='assets/handdrawn-p08/'+output.path;
  return {...output,id,purpose,key:prefixes[purpose]+id,path,url:import.meta.env.BASE_URL+path};
}
const assets=manifest.assets.filter(a=>a.category==='character').flatMap(a=>(['avatar','selection','portrait'] as const).map(p=>characterArt(a.id as CharacterId,p)));
const pathname=(url:string)=>new URL(url,'https://local.invalid').pathname;
export function characterArtByURL(url:string){return assets.find(a=>pathname(a.url)===pathname(url));}
export function characterArtByKey(key:string){return assets.find(a=>a.key===key);}
/** Reject swapped roles/IDs before a transfer or cache hit; non-character textures retain their own contracts. */
export function assertCharacterArtReference(key:string,url:string):void {
  const expected=characterArtByKey(key),actual=characterArtByURL(url);
  if((expected||actual)&&expected!==actual)throw Object.assign(Error('character-art-reference'),{retryable:false});
}
/** A small but wrongly shaped/undersized image is not a valid face. Pixel-budget checks alone cannot detect it. */
export function assertCharacterArtDimensions(url:string,width:number,height:number):void {
  const asset=characterArtByURL(url);
  if(asset&&(width!==asset.width||height!==asset.height))throw Object.assign(Error(`character-art-dimensions:${asset.id}/${asset.purpose}:${width}x${height}`),{retryable:false});
}

/** DOM previews use the same dimensions; callers retain the hero's name/controls on rejection. */
export function validCharacterImage(image:HTMLImageElement):boolean {
  try{assertCharacterArtDimensions(image.currentSrc||image.src,image.naturalWidth,image.naturalHeight);return true;}catch{return false;}
}
