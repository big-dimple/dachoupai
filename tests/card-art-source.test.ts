import {describe,expect,it} from 'vitest';
import {cardArtSource,portraitCardArt} from '../src/game/CardArtSource';
import {GOODS_ART,goodsArtUrl} from '../src/game/GoodsArt';
import {JOKER_ART,jokerArtUrl,jokerArtPreviewUrl} from '../src/game/jokerArt';

describe('registered illustration zoom sources',()=>{
  it('keeps every current Joker mapped to its exact versioned asset pair',()=>{
    for(const {id} of JOKER_ART){const source=cardArtSource(id)!;expect(source.detailUrl).toBe(jokerArtUrl(id));expect(source.thumbnailUrl).toBe(jokerArtPreviewUrl(id));expect(portraitCardArt({url:source.detailUrl,thumbnailUrl:source.thumbnailUrl,alt:source.name})).toEqual(source);}
  });
  it('includes real tool, hand-upgrade and permanent-item detail variants',()=>{
    expect(GOODS_ART.some(art=>art.domainId.startsWith('P'))).toBe(true);
    expect(GOODS_ART.some(art=>art.category==='item-card')).toBe(true);
    for(const art of GOODS_ART){
      const source=cardArtSource(art.domainId,'原名')!,category=art.category as 'tool-card'|'item-card';
      expect(source.detailUrl).toBe(goodsArtUrl(art.domainId,category,'detail'));expect(source.thumbnailUrl).toBe(goodsArtUrl(art.domainId,category,'thumbnail'));expect(source.name).toBe('原名');
      expect(portraitCardArt({url:source.detailUrl,thumbnailUrl:source.thumbnailUrl,alt:'原名'})).toEqual(source);
      expect(portraitCardArt({url:source.thumbnailUrl,alt:'原名'})).toBeUndefined();
      expect(portraitCardArt({url:source.detailUrl,thumbnailUrl:source.detailUrl,alt:'原名'})).toBeUndefined();
    }
  });
  it('rejects absent, stale, borrowed and mechanism-only pictures',()=>{
    expect(cardArtSource('U99')).toBeUndefined();expect(cardArtSource('unknown')).toBeUndefined();
    const source=cardArtSource('T12')!,other=cardArtSource('P01')!;
    for(const portrait of [{url:'data:image/svg+xml,mechanism'}, {url:source.detailUrl+'?stale'}, {url:source.detailUrl,thumbnailUrl:other.thumbnailUrl}])expect(portraitCardArt({...portrait,alt:'示意'})).toBeUndefined();
  });
});
