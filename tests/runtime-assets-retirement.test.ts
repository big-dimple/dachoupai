import {expect, it} from 'vitest';
import fs from 'node:fs';
import {P00_ASSETS} from '../src/game/theme';
import {JOKER_ART} from '../src/game/jokerArt';
import {COURT_ART} from '../src/game/HanddrawnArt';
import {CHARACTER_ART} from '../src/game/CharacterArt';
import {GOODS_ART, goodsArtUrl} from '../src/game/GoodsArt';
import {CLIMAX_SOURCE_ART, climaxSourceAsset} from '../src/game/ClimaxSourceArt';
import {REWARD_COIN} from '../src/game/RewardCoin';
import {FOLEY_SAMPLES} from '../src/audio/foley';
import bgm from '../public/assets/audio/bgm/manifest.json';
import gamefeel from '../public/assets/audio/gamefeel-rfc/sources.json';
import recording from '../public/assets/audio/p06/recording.json';
import cleanup from '../docs/production/evidence/runtime-asset-cleanup-2026-10-17/cleanup.json';

function runtimeFiles():Set<string> {
  const files=new Set<string>();
  const add=(url:string)=>{
    if(url.startsWith('data:'))return;
    const start=url.indexOf('assets/');expect(start).toBeGreaterThanOrEqual(0);
    files.add('public/'+url.slice(start).split(/[?#]/)[0]);
  };
  for(const asset of P00_ASSETS)add(asset.path);
  for(const asset of JOKER_ART){add(asset.path);add(asset.detailPath);}
  for(const asset of COURT_ART)add(asset.path);
  for(const asset of CHARACTER_ART)add(asset.url);
  for(const asset of GOODS_ART)for(const purpose of ['thumbnail','detail'] as const)
    add(goodsArtUrl(asset.domainId,asset.category as 'tool-card'|'item-card',purpose)!);
  for(const asset of CLIMAX_SOURCE_ART){const current=climaxSourceAsset(asset.id);expect(current,asset.id).toBeDefined();add(current!.url);}
  for(const track of bgm.tracks)add(track.runtimePath);add(recording.runtimePath);
  for(const sample of FOLEY_SAMPLES)add(sample.runtimePath);
  add('assets/audio/score-impact/cloth2.ogg');add(REWARD_COIN.image);
  add('assets/fonts/score/dachoupai-score-numbers.woff');
  return files;
}

it('keeps every current card, tool, portrait, eye strip, head fallback and support URL loadable',()=>{
  expect(JOKER_ART).toHaveLength(72);expect(GOODS_ART).toHaveLength(51);
  expect(CHARACTER_ART).toHaveLength(30);expect(CHARACTER_ART.filter(a=>a.purpose==='eyes')).toHaveLength(6);
  expect(CHARACTER_ART.filter(a=>a.purpose==='focus')).toHaveLength(6);
  const files=runtimeFiles();expect(files.size).toBe(cleanup.protected.runtimeFiles+gamefeel.assets.length);
  for(const file of files){expect(fs.existsSync(file),file).toBe(true);expect(fs.statSync(file).size,file).toBeGreaterThan(0);}
});

it('does not publish retired copies or leave them selectable through the current registry',()=>{
  const live=runtimeFiles();
  for(const retired of cleanup.removed){expect(live.has(retired.file),retired.file).toBe(false);expect(fs.existsSync(retired.file),retired.file).toBe(false);}
  expect(P00_ASSETS.find(a=>a.key==='p00-card-back')?.path).toMatch(/^data:image\/svg\+xml;base64,/);
  expect(JOKER_ART.every(a=>a.path.includes('/handdrawn-p08/'))).toBe(true);
});

it('keeps the offline source models self-contained without the retired prototype texture copies',()=>{
  const models=fs.readdirSync('public/assets/models').filter(f=>f.endsWith('.glb'));
  expect(models).toHaveLength(39);
  for(const model of models){
    const bytes=fs.readFileSync('public/assets/models/'+model),length=bytes.readUInt32LE(12);
    const gltf=JSON.parse(bytes.subarray(20,20+length).toString());
    for(const ref of [...(gltf.images??[]),...(gltf.buffers??[])])expect(!ref.uri||ref.uri.startsWith('data:'),model).toBe(true);
  }
});
