import manifest from '../../public/assets/cast-placeholders/manifest.json';
import type {CharacterId} from '../domain/characters';

export type CharacterArtPurpose='avatar'|'selection'|'portrait';
const prefixes:Record<CharacterArtPurpose,string>={avatar:'avatar-',selection:'selection-portrait-',portrait:'opening-portrait-'};
/** Until approved named-person art arrives, every runtime role uses an explicit typographic placeholder. Legacy paintings stay archived. */
export function characterArt(id:CharacterId,purpose:CharacterArtPurpose){
  const output=manifest.assets.find(a=>a.id===id&&a.purpose===purpose);
  if(!output)throw Error(`character-art-missing:${id}/${purpose}`);
  const path='assets/cast-placeholders/'+output.path;
  return {...output,id,purpose,key:prefixes[purpose]+id,path,url:import.meta.env.BASE_URL+path};
}
const assets=manifest.assets.map(a=>characterArt(a.id as CharacterId,a.purpose as CharacterArtPurpose));
const absoluteURL=(url:string)=>new URL(url,typeof document==='undefined'?'https://local.invalid/':document.baseURI||'https://local.invalid/').href;
export function characterArtByURL(url:string){return assets.find(a=>absoluteURL(a.url)===absoluteURL(url));}
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
