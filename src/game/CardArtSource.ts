import {GOODS_ART,goodsArtUrl} from './GoodsArt';
import {JOKER_ART,jokerArtUrl,jokerArtPreviewUrl} from './jokerArt';
import {cardDisplayName} from './tangsongCardNames';

export interface CardArtSource {id:string;name:string;detailUrl:string;thumbnailUrl:string}

/** Only registered illustrations with a distinct detail asset can be appreciated. */
export function cardArtSource(id:string,name?:string):CardArtSource|undefined {
  if(JOKER_ART.some(art=>art.id===id)){
    const detailUrl=jokerArtUrl(id),thumbnailUrl=jokerArtPreviewUrl(id);
    if(detailUrl&&thumbnailUrl&&detailUrl!==thumbnailUrl)return {id,name:cardDisplayName(id,name),detailUrl,thumbnailUrl};
  }
  const goods=GOODS_ART.find(art=>art.domainId===id);
  if(!goods||(goods.category!=='tool-card'&&goods.category!=='item-card'))return;
  const detail=goods.outputs.find(output=>output.purpose==='detail'),thumbnail=goods.outputs.find(output=>output.purpose==='thumbnail');
  if(!detail||!thumbnail||detail.width<=thumbnail.width||detail.height<=thumbnail.height)return;
  const detailUrl=goodsArtUrl(id,goods.category,'detail'),thumbnailUrl=goodsArtUrl(id,goods.category,'thumbnail');
  if(detailUrl&&thumbnailUrl&&detailUrl!==thumbnailUrl)return {id,name:name??id,detailUrl,thumbnailUrl};
}

/** Exact URLs preserve BASE_URL and version identity; no filename guesses or SVG snapshots. */
export function portraitCardArt(portrait:{url:string;thumbnailUrl?:string;alt:string}):CardArtSource|undefined {
  for(const id of [...JOKER_ART.map(art=>art.id),...GOODS_ART.map(art=>art.domainId)]){
    const source=cardArtSource(id,portrait.alt);
    if(source?.detailUrl===portrait.url&&(!portrait.thumbnailUrl||source.thumbnailUrl===portrait.thumbnailUrl))return source;
  }
}
