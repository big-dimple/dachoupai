import type {CharacterId} from '../domain/characters';
export type CharacterArtPurpose='avatar'|'selection'|'portrait';
export interface CharacterArtAsset {id:CharacterId;purpose:CharacterArtPurpose;key:string;path:string;url:string;width:number;height:number;bytes:number;sha256:string;format:string}
const prefixes={avatar:'avatar-',selection:'selection-portrait-',portrait:'opening-portrait-'};
/** No approved named-person art has arrived. Missing art is typography, never a fabricated image or old face. */
export const CHARACTER_ART:readonly CharacterArtAsset[]=[];
export const characterArtKey=(id:CharacterId,purpose:CharacterArtPurpose)=>prefixes[purpose]+id;
export const characterArt=(id:CharacterId,purpose:CharacterArtPurpose)=>CHARACTER_ART.find(a=>a.id===id&&a.purpose===purpose);
const absoluteURL=(url:string)=>new URL(url,typeof document==='undefined'?'https://local.invalid/':document.baseURI||'https://local.invalid/').href;
export const characterArtByURL=(url:string)=>url?CHARACTER_ART.find(a=>absoluteURL(a.url)===absoluteURL(url)):undefined;
export const characterArtByKey=(key:string)=>CHARACTER_ART.find(a=>a.key===key);
export function assertCharacterArtReference(key:string,url:string):void {
 const expected=characterArtByKey(key),actual=characterArtByURL(url),reserved=Object.values(prefixes).some(prefix=>key.startsWith(prefix));
 if((reserved||expected||actual)&&(!expected||expected!==actual))throw Object.assign(Error('character-art-reference'),{retryable:false});
}
export function assertCharacterArtDimensions(url:string,width:number,height:number):void {
 const asset=characterArtByURL(url);if(asset&&(width!==asset.width||height!==asset.height))throw Object.assign(Error(`character-art-dimensions:${asset.id}/${asset.purpose}:${width}x${height}`),{retryable:false});
}
export function validCharacterImage(image:HTMLImageElement):boolean {try{assertCharacterArtDimensions(image.currentSrc||image.src,image.naturalWidth,image.naturalHeight);return true;}catch{return false;}}
