import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../public/assets/handdrawn-tools/manifest.json';
import {GOODS_ART,goodsArtUrl} from '../src/game/GoodsArt';
import {JOKER_ART} from '../src/game/jokerArt';
import {toolInfo,itemInfo,goodsArtPortrait} from '../src/game/r2ToolInfo';
it('binds exactly four approved tool/item IDs and all eight exact full-contain derivatives',()=>{
  expect(manifest.sourceCommit).toBe('11ae7a464fdcf54c4e338da9171d827265742e3c');
  const receipt=readFileSync(new URL('../art/sources/handdrawn-runtime-tools-20261004-s1/manifest.json',import.meta.url));
  expect(createHash('sha256').update(receipt).digest('hex')).toBe(manifest.sourceManifestSHA256);
  expect(GOODS_ART.map(a=>a.id)).toEqual(['tool-t12','item-u07','tool-p11','tool-s02']);
  expect(JSON.parse(receipt.toString()).assets[0].sourceFilename).toBe('tool-t12-v2-original.png');
  let bytes=0,count=0;for(const a of GOODS_ART){expect(a.category).toBe(a.domainId==='U07'?'item-card':'tool-card');expect(JOKER_ART.some(j=>j.id===a.id||j.id===a.domainId)).toBe(false);
    expect(a.outputs.map(o=>[o.purpose,o.width,o.height])).toEqual([['thumbnail',128,160],['detail',615,768]]);
    for(const o of a.outputs){const b=readFileSync(new URL('../public/assets/handdrawn-tools/'+o.path,import.meta.url));expect(b.length).toBe(o.bytes);expect(createHash('sha256').update(b).digest('hex')).toBe(o.sha256);bytes+=b.length;count++;}
  }expect(bytes).toBe(123306);expect(count).toBe(8);
});
it('keeps categories distinct and only requests HD via an illustrated detail descriptor',()=>{
  expect(goodsArtUrl('U07','tool-card','thumbnail')).toBeUndefined();expect(goodsArtUrl('T12','item-card','thumbnail')).toBeUndefined();expect(goodsArtUrl('T01','tool-card','thumbnail')).toBeUndefined();
  for(const id of ['T12','P11','S02','U07']){const info=id==='U07'?itemInfo(id):toolInfo(id),p=goodsArtPortrait(info);expect(info.artUrl).toContain('.thumbnail.webp');expect(p.url).toContain('.detail.webp');expect(p.thumbnailUrl).toBe(info.artUrl);expect(p.fallbackUrl).toMatch(/^data:image\/svg\+xml,/);expect(p.layout).toBe('card');}
  expect(toolInfo('T01').artUrl).toBe(toolInfo('T01').fallbackArtUrl);expect(toolInfo('T01').detailArtUrl).toBeUndefined();
});
it('uses authoritative text rather than inference from artwork',()=>{
  const glass=toolInfo('T12');expect(glass.description).toContain('倍率×1.5');expect(glass.description).toContain('1/4');
  expect(toolInfo('P11').description).toContain('同花葫芦');expect(toolInfo('P11').description).toContain('等级+1');
  expect(toolInfo('S02').risk).toMatch(/5\/10[\s\S]*3\/10[\s\S]*2\/10/);expect(toolInfo('S02').cost).toContain('5金');expect(itemInfo('U07').description).toContain('容量+1');
});
