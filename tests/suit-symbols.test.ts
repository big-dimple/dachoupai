import {describe,expect,it} from 'vitest';
import {suitTextParts,SUIT_TEXT_INK} from '../src/game/SuitSymbols';

describe('readable suit references',()=>{
 it('preserves copied rules and suit identities, including text/emoji selectors',()=>{
  const text='保留 ♠️A、♣︎K；♥Q / ♦J。花色本身不改变点数。';
  const parts=suitTextParts(text);
  expect(parts.map(p=>p.text).join('')).toBe(text);
  expect(parts.filter(p=>p.suit).map(p=>[p.text,p.suit])).toEqual([['♠️','spades'],['♣︎','clubs'],['♥','hearts'],['♦','diamonds']]);
  expect(suitTextParts('无花色的说明')).toEqual([{text:'无花色的说明'}]);
  expect(suitTextParts('')).toEqual([]);
 });
 it('keeps normal small symbols readable on the existing paper and primary-button colors',()=>{
  const luminance=(hex:string)=>{const rgb=hex.match(/[a-f\d]{2}/gi)!.map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const contrast=(a:string,b:string)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  for(const paper of ['#FFF9EE','#E2E8E5','#F0D3C7'])for(const ink of [SUIT_TEXT_INK.black,SUIT_TEXT_INK.red])expect(contrast(ink,paper)).toBeGreaterThanOrEqual(4.5);
  for(const ink of [SUIT_TEXT_INK.darkBlack,SUIT_TEXT_INK.darkRed])expect(contrast(ink,'#B8473A')).toBeGreaterThanOrEqual(4.5);
 });
});
