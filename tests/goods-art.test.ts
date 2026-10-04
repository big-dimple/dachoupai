import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../public/assets/handdrawn-tools/manifest.json';
import {GOODS_ART,goodsArtUrl} from '../src/game/GoodsArt';
import {JOKER_ART} from '../src/game/jokerArt';
import {toolInfo,itemInfo,goodsArtPortrait} from '../src/game/r2ToolInfo';
it('binds all twelve approved items and twenty-seven tools to exact full-contain derivatives',()=>{
  expect(manifest.sourceCommit).toBe('11ae7a464fdcf54c4e338da9171d827265742e3c');
  const receipt=readFileSync(new URL('../art/sources/handdrawn-runtime-tools-20261004-s1/manifest.json',import.meta.url));
  expect(createHash('sha256').update(receipt).digest('hex')).toBe(manifest.sourceManifestSHA256);
  expect(GOODS_ART.map(a=>a.id)).toEqual(['tool-t12','item-u07','tool-p11','tool-s02',...Array.from({length:6},(_,i)=>'item-u0'+(i+1)),...Array.from({length:5},(_,i)=>'item-u'+String(i+8).padStart(2,'0')),...Array.from({length:6},(_,i)=>'tool-t'+String(i+6).padStart(2,'0')),...Array.from({length:6},(_,i)=>'tool-t'+String(i+13).padStart(2,'0')),...Array.from({length:5},(_,i)=>'tool-t'+String(i+1).padStart(2,'0')),'tool-p01',...Array.from({length:6},(_,i)=>'tool-p'+String(i+2).padStart(2,'0'))]);
  const sources=[['34dab048aea452e6e9175afa80878193be3bf1bc','c8cb24b8e1d50b173219cbf83cb118ca9da204347a6e64ecdcf5da2d9d3a26ed'],['e11f7f8efaf2114b1ef0b928855230cfdb5c4863','4ae735d35fada6777b3b4471ae730837780b1d7c53d763ca0ced37bd05a6d474'],['b25f00aaafbd79a475fa045eceea18a5d4df6b29','3bc142e8e050e220a29e1f98e90cb5d8fbeb6fcebbd77fd5d40c8b3983d7c215'],['a8cab71d56d24aeaef919e6c04c5c22bf0106da3','6c93741739a10ef676f2ba989988b70e580eecb16b51f6bfa45f867ad5bb7866'],['0df5c1afac5e07e439c0cb164a06896bba9608ab','092ec0b2bf83d2c566609598195e2abcfb09a1318966ac316d37f0afcae84207'],['c139d70f5411c4991a73ac9ed50fc8fc13f478a7','6690aff014c9298c1f558b6b8669341ecbf2e7e356858bc186dde800af38fc5e']];
  expect(manifest.additionalSources).toHaveLength(sources.length);
  for(const [index,extra] of manifest.additionalSources.entries()){
    const extraReceipt=readFileSync(new URL('../'+extra.sourceManifestPath,import.meta.url));
    expect(extra.sourceCommit).toBe(sources[index][0]);expect(extra.sourceManifestSHA256).toBe(sources[index][1]);expect(createHash('sha256').update(extraReceipt).digest('hex')).toBe(extra.sourceManifestSHA256);
    const incoming=JSON.parse(extraReceipt.toString());for(const a of incoming.assets){const runtime=GOODS_ART.find(row=>row.id===a.id)!;expect(runtime.domainId).toBe(a.domainId);expect(runtime.category).toBe(a.category);for(const o of a.outputs){const actual=runtime.outputs.find(row=>row.purpose===o.kind)!;expect(actual.sha256).toBe(o.sha256);expect(actual.bytes).toBe(o.bytes);}}
  }
  expect(JSON.parse(receipt.toString()).assets[0].sourceFilename).toBe('tool-t12-v2-original.png');
  const firstTools=JSON.parse(readFileSync(new URL('../art/sources/handdrawn-runtime-tools-20261004-t01-t05-p01/manifest.json',import.meta.url),'utf8'));
  expect(firstTools.assets.find((a:{domainId:string})=>a.domainId==='T02').sourceFilename).toBe('tool-t02-v2-original.png');
  expect(firstTools.assets.filter((a:{sourceAspectExceptionApproved:boolean})=>a.sourceAspectExceptionApproved).map((a:{domainId:string;sourceWidth:number;sourceHeight:number})=>[a.domainId,a.sourceWidth,a.sourceHeight])).toEqual([['T04',1073,1466],['T05',1060,1484]]);
  const planets=JSON.parse(readFileSync(new URL('../art/sources/handdrawn-runtime-tools-20261004-p02-p07/manifest.json',import.meta.url),'utf8'));
  expect(planets.assets.filter((a:{sourceAspectExceptionApproved:boolean})=>a.sourceAspectExceptionApproved).map((a:{domainId:string;sourceWidth:number;sourceHeight:number})=>[a.domainId,a.sourceWidth,a.sourceHeight])).toEqual([['P04',1060,1484]]);
  let bytes=0,count=0;for(const a of GOODS_ART){expect(a.category).toBe(a.domainId.startsWith('U')?'item-card':'tool-card');expect(JOKER_ART.some(j=>j.id===a.id||j.id===a.domainId)).toBe(false);
    expect(a.outputs.map(o=>[o.purpose,o.width,o.height])).toEqual([['thumbnail',128,160],['detail',615,768]]);
    for(const o of a.outputs){const b=readFileSync(new URL('../public/assets/handdrawn-tools/'+o.path,import.meta.url));expect(b.length).toBe(o.bytes);expect(createHash('sha256').update(b).digest('hex')).toBe(o.sha256);bytes+=b.length;count++;}
  }expect(bytes).toBe(1266494);expect(count).toBe(78);expect(manifest.runtimeBytes).toBe(bytes);expect(manifest.runtimeFileCount).toBe(count);
  expect(GOODS_ART.filter(a=>a.category==='item-card')).toHaveLength(12);expect(GOODS_ART.filter(a=>a.category==='tool-card')).toHaveLength(27);
});
it('keeps categories distinct and only requests HD via an illustrated detail descriptor',()=>{
  expect(goodsArtUrl('U07','tool-card','thumbnail')).toBeUndefined();expect(goodsArtUrl('T12','item-card','thumbnail')).toBeUndefined();expect(goodsArtUrl('T19','tool-card','thumbnail')).toBeUndefined();
  for(const id of ['T12','P11','S02',...Array.from({length:12},(_,i)=>'U'+String(i+1).padStart(2,'0')),...Array.from({length:6},(_,i)=>'T'+String(i+6).padStart(2,'0')),...Array.from({length:6},(_,i)=>'T'+String(i+13).padStart(2,'0')),...Array.from({length:5},(_,i)=>'T'+String(i+1).padStart(2,'0')),'P01',...Array.from({length:6},(_,i)=>'P'+String(i+2).padStart(2,'0'))]){const info=id.startsWith('U')?itemInfo(id):toolInfo(id),p=goodsArtPortrait(info);expect(info.artUrl).toContain('.thumbnail.webp');expect(p.url).toContain('.detail.webp');expect(p.thumbnailUrl).toBe(info.artUrl);expect(p.fallbackUrl).toMatch(/^data:image\/svg\+xml,/);expect(p.layout).toBe('card');}
  expect(goodsArtUrl('T01','item-card','thumbnail')).toBeUndefined();expect(goodsArtUrl('P01','item-card','thumbnail')).toBeUndefined();
  expect(toolInfo('T19').artUrl).toBe(toolInfo('T19').fallbackArtUrl);expect(toolInfo('T19').detailArtUrl).toBeUndefined();
});
it('uses authoritative text rather than inference from artwork',()=>{
  const glass=toolInfo('T12');expect(glass.description).toContain('倍率×1.5');expect(glass.description).toContain('1/4');
  expect(toolInfo('P11').description).toContain('同花葫芦');expect(toolInfo('P11').description).toContain('等级+1');
  expect(toolInfo('S02').risk).toMatch(/5\/10[\s\S]*3\/10[\s\S]*2\/10/);expect(toolInfo('S02').cost).toContain('5金');expect(itemInfo('U07').description).toContain('容量+1');
  const copy:Record<string,string[]>={T01:['选择一种已发现牌型','所选牌型等级+1','只影响未来出牌'],T02:['选择1–2张可见扑克','永久删除所选扑克','当前场不补抽被删掉的手牌'],T03:['永久改为红桃♥','保留点数、增强和版次'],T04:['永久改为方片♦','保留点数、增强和版次'],T05:['永久改为梅花♣','保留点数、增强和版次'],P01:['对象固定，须已发现该牌型','等级+1','只影响未来出牌'],T06:['永久改为黑桃♠','保留点数、增强和版次'],T07:['保留原牌','新建1张完整复制','真实抽牌堆底部','不洗牌、不立即补抽'],T08:['点数+1','不循环：A不能再升'],T09:['点数−1','不循环：2不能再降'],T10:['赋予热度纸','替换原增强，保留版次'],T11:['赋予倍率纸','替换原增强，保留版次'],T13:['赋予留声纸','有效持牌一次','替换原增强，保留版次'],T14:['赋予金纸','成功过关时','每场最多'],T15:['赋予返场纸','额外计分+1次','不递归触发'],T16:['金币+5','不增加本手热度或倍率'],T17:['本场剩余弃牌+1','最多恢复至入场弃牌预算','须实际用过弃牌'],T18:['不刷新长期道具货架','刷新次数照常增加','不触发付费刷新成长']};
  for(const [id,parts] of Object.entries(copy))for(const part of parts)expect(toolInfo(id).description).toContain(part);
  const planets:Record<string,string>={P02:'对子',P03:'两对',P04:'三条',P05:'顺子',P06:'同花',P07:'葫芦'};
  for(const [id,label] of Object.entries(planets)){const description=toolInfo(id).description;for(const part of ['对象固定，须已发现该牌型','固定升级'+label,'等级+1','上限30级','只影响未来出牌'])expect(description).toContain(part);}
});

it('keeps unknown/category mismatch unregistered and all item descriptions authoritative',()=>{
  for(const id of ['U08','U09','U10','U11','U12'])expect(goodsArtUrl(id,'tool-card','thumbnail')).toBeUndefined();
  expect(goodsArtUrl('U99','item-card','thumbnail')).toBeUndefined();expect(goodsArtUrl('U01','tool-card','thumbnail')).toBeUndefined();
  expect(()=>itemInfo('U99')).toThrow('unknown-r2-item: U99');
  const copy:Record<string,string[]>= {U01:['下一场','手牌上限','当前场不补手牌'],U02:['下一场','弃牌次数','当前场预算不增加'],U03:['下一场','出牌次数','当前场预算不增加'],U04:['利息上限','不会直接赠送金币'],U05:['大丑牌货位','当前已生成货架不补货'],U06:['付费刷新价格','免费刷新照常免费'],U08:['下限降为16张','合法行动','玻璃破碎'],U09:['本章使用最多','升1级','已到30级则跳过、不重选'],U10:['第一次成功购买价格−1金','至少1金','自身这次购买不享受自身优惠','取消与失败不占用首购资格'],U11:['长期道具货位1→2','当前货架不补货','刷新也不重抽'],U12:['每章首次普通场','金币+3','未持有时也如此','之后购买不追补']};
  for(const [id,parts] of Object.entries(copy))for(const part of parts)expect(itemInfo(id).description).toContain(part);
});
