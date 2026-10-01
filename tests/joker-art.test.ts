import {it,expect} from 'vitest';
import {R2_JOKERS} from '../src/content/r2Schema';
import {JOKER_ART,jokerArtKey,jokerArtUrl} from '../src/game/jokerArt';

const approvedPool=['pengci','tiesuanpan','a03','a05','mantangcai','b02','b03','b04','jiedongfeng','c02','c04','c06','d01','d03','d05','d10','e01','e03','e05','e08','huimaqiang','f02','f03','f09'];
const c00Pool=['a04','a06','a07','a08','b05','b06','b07','b08','c03','c05','c07','c08','d02','d04','d06','d07','e02','e04','e06','e07','f04','f05','f06','f07'];

it('retains every accepted 24-card illustration without sharing their runtime images',()=>{
  const ids=JOKER_ART.map(a=>a.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect([...ids].sort()).toEqual([...approvedPool].sort());
  expect(new Set(JOKER_ART.map(art=>art.path)).size).toBe(approvedPool.length);
  expect(new Set(JOKER_ART.map(art=>art.detailPath)).size).toBe(approvedPool.length);
  for(const id of approvedPool)expect(R2_JOKERS.some(joker=>joker.id===id)).toBe(true);
});

it('keeps C00 additions on the mechanism fallback instead of borrowing accepted illustrations',()=>{
  for(const id of c00Pool){expect(jokerArtKey(id)).toBeUndefined();expect(jokerArtUrl(id)).toBeUndefined();}
  for(const joker of R2_JOKERS)expect([...approvedPool,...c00Pool]).toContain(joker.id);
});
