import{it,expect}from'vitest';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';import manifest from'../public/assets/handdrawn-p08/manifest.json';import{HANDDRAWN_ART,HANDDRAWN_SOURCE,handdrawnPath,COURT_ART,courtArtKey}from'../src/game/HanddrawnArt';import{JOKER_ART,jokerArtAlignedLayers,jokerArtKey}from'../src/game/jokerArt';import{CHARACTERS}from'../src/game/characters';
it('pins exact authorized24 artwork51 runtime hashes/sizes and purpose mapping',()=>{expect(HANDDRAWN_SOURCE).toBe('c618cee93089bb2e556f16567709b0ea23abbcb9');expect(HANDDRAWN_ART).toHaveLength(24);let n=0,total=0;for(const a of manifest.assets)for(const o of a.outputs){const b=readFileSync(new URL('../public/assets/handdrawn-p08/'+o.path,import.meta.url));expect(b.length).toBe(o.bytes);expect(createHash('sha256').update(b).digest('hex')).toBe(o.sha256);expect(handdrawnPath(a.id,o.purpose)).toBe('assets/handdrawn-p08/'+o.path);n++;total+=b.length;}expect(n).toBe(51);expect(total).toBe(1455792);});
it('six role IDs own their portrait/avatar/selection; JQK are rank-specific independent faces',()=>{for(const c of CHARACTERS){expect(c.portrait).toContain(handdrawnPath(c.id,'portrait'));for(const purpose of['avatar','selection','portrait'])expect(handdrawnPath(c.id,purpose)).toBeTruthy();}expect(COURT_ART.map(a=>a.rank)).toEqual([11,12,13]);for(const rank of[11,12,13])expect(courtArtKey(rank)).toBe('p08-court-'+(['j','q','k'][rank-11]));expect(courtArtKey(10)).toBeUndefined();});
it('exact15 functional replacements retain all other old IDs; new flat f09 never claims aligned layers',()=>{const changed=HANDDRAWN_ART.filter(a=>a.category==='functional-card');expect(changed).toHaveLength(15);for(const a of changed){const r=JOKER_ART.find(r=>r.id===a.id)!;expect(r.path).toBe(handdrawnPath(a.id,'thumbnail'));expect(r.detailPath).toBe(handdrawnPath(a.id,'detail'));expect(r.detailOnDemand).toBe(true);}expect(JOKER_ART).toHaveLength(37);expect(jokerArtKey('f09')).toBe('p08-joker-f09');expect(jokerArtAlignedLayers('f09')).toBe(false);expect(JOKER_ART.find(a=>a.id==='pengci')?.path).toBe('assets/jokers-p07/pengci.webp');expect(jokerArtKey('c11')).toBeUndefined();});

it('batch2 binds only approved tiesuanpan/f10 to exact source receipt and on-demand complete faces',()=>{
 expect(manifest.sourceCommits).toEqual(['c618cee93089bb2e556f16567709b0ea23abbcb9','3284505ad86e4e216343aa873719d20524f9a4ce','b0394efd921fc05d936ea3519d2b401a1cba9abd']);
 for(const id of ['tiesuanpan','f10']){const asset=HANDDRAWN_ART.find(a=>a.id===id)!;
  expect(asset).toMatchObject({sourceCommit:'3284505ad86e4e216343aa873719d20524f9a4ce',sourceManifestSHA256:'c00c8942d75e023da38930d95be9492ce63b55342f2633031662d9217403deeb'});
  expect(jokerArtKey(id)).toBe('p08-joker-'+id);expect(jokerArtAlignedLayers(id)).toBe(false);
  expect(asset.outputs.map(o=>[o.purpose,o.width,o.height])).toEqual([['thumbnail',128,160],['detail',615,768]]);
 }
 expect(jokerArtKey('c11')).toBeUndefined();expect(jokerArtKey('d08')).toBeUndefined();
});

it('batch3 consumes only the approved four-rung c08 receipt and c09, with complete on-demand faces',()=>{
 const receipt=JSON.parse(readFileSync(new URL('../art/sources/handdrawn-runtime-20261004-b3/manifest.json',import.meta.url),'utf8'));
 expect(receipt.assets.find((a:{id:string})=>a.id==='c08')).toMatchObject({sourceFilename:'c08-four-rung-candidate.png',sourceSHA256:'b8812aa031a8079bea91d3c0a86bd725594eec1d24480de7bfbe79bf446bace4'});
 for(const id of ['c08','c09']){const asset=HANDDRAWN_ART.find(a=>a.id===id)!;
  expect(asset).toMatchObject({sourceCommit:'b0394efd921fc05d936ea3519d2b401a1cba9abd',sourceManifestSHA256:'b39553ee11e7f774952d79f8fd10f149e429fb0fd0636a1f61cd7155ebf96bd8'});
  expect(jokerArtKey(id)).toBe('p08-joker-'+id);expect(jokerArtAlignedLayers(id)).toBe(false);
  expect(asset.outputs.map(o=>[o.purpose,o.width,o.height])).toEqual([['thumbnail',128,160],['detail',615,768]]);
  expect(asset.outputs.map(o=>o.sha256)).toEqual(receipt.assets.find((a:{id:string})=>a.id===id).outputs.map((o:{sha256:string})=>o.sha256));
 }
});
