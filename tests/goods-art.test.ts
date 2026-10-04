import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../public/assets/handdrawn-tools/manifest.json';
import {GOODS_ART,goodsArtUrl} from '../src/game/GoodsArt';
import {JOKER_ART} from '../src/game/jokerArt';
import {toolInfo,itemInfo,goodsArtPortrait} from '../src/game/r2ToolInfo';
it('binds the original four plus six approved item IDs to exact full-contain derivatives',()=>{
  expect(manifest.sourceCommit).toBe('11ae7a464fdcf54c4e338da9171d827265742e3c');
  const receipt=readFileSync(new URL('../art/sources/handdrawn-runtime-tools-20261004-s1/manifest.json',import.meta.url));
  expect(createHash('sha256').update(receipt).digest('hex')).toBe(manifest.sourceManifestSHA256);
  expect(GOODS_ART.map(a=>a.id)).toEqual(['tool-t12','item-u07','tool-p11','tool-s02',...Array.from({length:6},(_,i)=>'item-u0'+(i+1))]);
  const extra=manifest.additionalSources[0],extraReceipt=readFileSync(new URL('../'+extra.sourceManifestPath,import.meta.url));
  expect(extra.sourceCommit).toBe('34dab048aea452e6e9175afa80878193be3bf1bc');expect(createHash('sha256').update(extraReceipt).digest('hex')).toBe(extra.sourceManifestSHA256);
  const incoming=JSON.parse(extraReceipt.toString());for(const a of incoming.assets){const runtime=GOODS_ART.find(row=>row.id===a.id)!;expect(runtime.domainId).toBe(a.domainId);expect(runtime.category).toBe('item-card');for(const o of a.outputs){const actual=runtime.outputs.find(row=>row.purpose===o.kind)!;expect(actual.sha256).toBe(o.sha256);expect(actual.bytes).toBe(o.bytes);}}
  expect(JSON.parse(receipt.toString()).assets[0].sourceFilename).toBe('tool-t12-v2-original.png');
  let bytes=0,count=0;for(const a of GOODS_ART){expect(a.category).toBe(a.domainId.startsWith('U')?'item-card':'tool-card');expect(JOKER_ART.some(j=>j.id===a.id||j.id===a.domainId)).toBe(false);
    expect(a.outputs.map(o=>[o.purpose,o.width,o.height])).toEqual([['thumbnail',128,160],['detail',615,768]]);
    for(const o of a.outputs){const b=readFileSync(new URL('../public/assets/handdrawn-tools/'+o.path,import.meta.url));expect(b.length).toBe(o.bytes);expect(createHash('sha256').update(b).digest('hex')).toBe(o.sha256);bytes+=b.length;count++;}
  }expect(bytes).toBe(301526);expect(count).toBe(20);expect(manifest.runtimeBytes).toBe(bytes);expect(manifest.runtimeFileCount).toBe(count);
  expect(GOODS_ART.filter(a=>a.category==='item-card')).toHaveLength(7);expect(GOODS_ART.filter(a=>a.category==='tool-card')).toHaveLength(3);
});
it('keeps categories distinct and only requests HD via an illustrated detail descriptor',()=>{
  expect(goodsArtUrl('U07','tool-card','thumbnail')).toBeUndefined();expect(goodsArtUrl('T12','item-card','thumbnail')).toBeUndefined();expect(goodsArtUrl('T01','tool-card','thumbnail')).toBeUndefined();
  for(const id of ['T12','P11','S02','U07','U01','U02','U03','U04','U05','U06']){const info=id.startsWith('U')?itemInfo(id):toolInfo(id),p=goodsArtPortrait(info);expect(info.artUrl).toContain('.thumbnail.webp');expect(p.url).toContain('.detail.webp');expect(p.thumbnailUrl).toBe(info.artUrl);expect(p.fallbackUrl).toMatch(/^data:image\/svg\+xml,/);expect(p.layout).toBe('card');}
  expect(toolInfo('T01').artUrl).toBe(toolInfo('T01').fallbackArtUrl);expect(toolInfo('T01').detailArtUrl).toBeUndefined();
});
it('uses authoritative text rather than inference from artwork',()=>{
  const glass=toolInfo('T12');expect(glass.description).toContain('倍率×1.5');expect(glass.description).toContain('1/4');
  expect(toolInfo('P11').description).toContain('同花葫芦');expect(toolInfo('P11').description).toContain('等级+1');
  expect(toolInfo('S02').risk).toMatch(/5\/10[\s\S]*3\/10[\s\S]*2\/10/);expect(toolInfo('S02').cost).toContain('5金');expect(itemInfo('U07').description).toContain('容量+1');
});

it('keeps uncovered and unknown item art procedural and six new descriptions authoritative',()=>{
  for(const id of ['U08','U09','U10','U11','U12']){expect(goodsArtUrl(id,'item-card','thumbnail')).toBeUndefined();expect(itemInfo(id).artUrl).toBe(itemInfo(id).fallbackArtUrl);expect(itemInfo(id).detailArtUrl).toBeUndefined();}
  expect(goodsArtUrl('U99','item-card','thumbnail')).toBeUndefined();expect(goodsArtUrl('U01','tool-card','thumbnail')).toBeUndefined();
  const copy:Record<string,string[]>= {U01:['下一场','手牌上限','当前场不补手牌'],U02:['下一场','弃牌次数','当前场预算不增加'],U03:['下一场','出牌次数','当前场预算不增加'],U04:['利息上限','不会直接赠送金币'],U05:['大丑牌货位','当前已生成货架不补货'],U06:['付费刷新价格','免费刷新照常免费']};
  for(const [id,parts] of Object.entries(copy))for(const part of parts)expect(itemInfo(id).description).toContain(part);
});
