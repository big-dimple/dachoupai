import {assetUrl} from './theme';
import {HANDDRAWN_ART,handdrawnPath} from './HanddrawnArt';

interface JokerArt {id:string;key:string;path:string;detailPath:string;detailOnDemand?:boolean;alignedLayers?:boolean}
// These public files were replaced in place. Bind both Phaser and DOM requests to
// the manifest bytes so a warm browser cannot keep an earlier card illustration.
export const reviewedCardPath=(id:string,purpose:'thumbnail'|'detail'):string|undefined=>{
  const output=HANDDRAWN_ART.find(a=>a.id===id&&a.category==='functional-card')?.outputs.find(o=>o.purpose===purpose);
  return output?handdrawnPath(id,purpose)+'?v='+output.sha256:undefined;
};
const reviewed=HANDDRAWN_ART.filter(a=>a.category==='functional-card').map(a=>({id:a.id,key:'p08-joker-'+a.id,path:reviewedCardPath(a.id,'thumbnail')!,detailPath:reviewedCardPath(a.id,'detail')!,detailOnDemand:true,alignedLayers:false}));
export const JOKER_ART:readonly JokerArt[]=reviewed;
export const jokerArtAlignedLayers=(id:string):boolean=>JOKER_ART.find(a=>a.id===id)?.alignedLayers!==false;

export const jokerArtKey = (definitionId: string): string | undefined =>
  JOKER_ART.find(art => art.id === definitionId)?.key;

export function jokerArtUrl(definitionId: string): string | undefined {
  const art = JOKER_ART.find(candidate => candidate.id === definitionId);
  return art ? assetUrl(art.detailPath) : undefined;
}

export function jokerArtPreviewUrl(definitionId:string):string|undefined {
  const art=JOKER_ART.find(candidate=>candidate.id===definitionId);return art?assetUrl(art.path):undefined;
}
