import type {CharacterId} from '../domain/characters';
import manifest from '../../public/assets/tangsong-portraits/manifest.json';
import eyes from '../../public/assets/tangsong-eyes/manifest.json';
import {assetUrl} from './theme';
export type CharacterArtPurpose='avatar'|'selection'|'portrait'|'focus'|'eyes';
export interface CharacterArtAsset {id:CharacterId;purpose:CharacterArtPurpose;key:string;path:string;url:string;width:number;height:number;bytes:number;sha256:string;format:string}
const prefixes={avatar:'avatar-',selection:'selection-portrait-',portrait:'opening-portrait-',focus:'portrait-focus-',eyes:'hero-eyes-'};
/** Portrait focus remains a legacy head crop; eyes are the separate user-delivered full strips. */
export const CHARACTER_ART:readonly CharacterArtAsset[]=[...manifest.assets,...eyes.assets].map(a=>({...a,id:a.id as CharacterId,purpose:a.purpose as CharacterArtPurpose,url:assetUrl(a.path)+'?v='+a.sha256.slice(0,12)}));
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
