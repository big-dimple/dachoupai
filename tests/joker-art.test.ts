import {it,expect} from 'vitest';
import {R2_JOKERS} from '../src/content/r2Schema';
import {JOKER_ART,jokerArtKey,jokerArtUrl} from '../src/game/jokerArt';

const approvedPool=['pengci','tiesuanpan','a03','a05','mantangcai','b02','b03','b04','jiedongfeng','c02','c04','c06','d01','d03','d05','d10','e01','e03','e05','e08','huimaqiang','f02','f03','f09'];
const handdrawnPool=['f04','e07','f09','f07','d07','a07','a08','c03','d02','e02','e09','tiesuanpan','f10','c08','c09','pengci','mantangcai','huimaqiang','jiedongfeng','b07','a09','d06','a04','e04','c05','c02','f03','a03','b02','b04','c04','d01','f02','d10','e01','b05','b10','b08','d05','e03','e06','f05','f11','b06','a11','d04','c07','d11','d08','d09','b12'];
const combined=[...new Set([...approvedPool,...handdrawnPool])];
const c00Pool=['a04','a06','a07','a08','b05','b06','b07','b08','c03','c05','c07','c08','d02','d04','d06','d07','e02','e04','e06','e07','f04','f05','f06','f07'];
const c02Pool=['a09','a10','a11','a12','b09','b10','b11','b12','c09','c10','c11','c12','d08','d09','d11','d12','e09','e10','e11','e12','f08','f10','f11','f12'];

it('retains legacy IDs and adds exact reviewed replacements without borrowing images',()=>{
  const ids=JOKER_ART.map(a=>a.id);
  expect(new Set(ids).size).toBe(ids.length);
  expect([...ids].sort()).toEqual([...combined].sort());
  expect(new Set(JOKER_ART.map(art=>art.path)).size).toBe(combined.length);
  expect(new Set(JOKER_ART.map(art=>art.detailPath)).size).toBe(combined.length);
  for(const id of approvedPool)expect(R2_JOKERS.some(joker=>joker.id===id)).toBe(true);
});

it('keeps C00/C02 additions on the mechanism fallback instead of borrowing accepted illustrations',()=>{
  for(const id of [...c00Pool,...c02Pool].filter(id=>!handdrawnPool.includes(id))){expect(jokerArtKey(id)).toBeUndefined();expect(jokerArtUrl(id)).toBeUndefined();}
  for(const joker of R2_JOKERS)expect([...approvedPool,...c00Pool,...c02Pool]).toContain(joker.id);
});
