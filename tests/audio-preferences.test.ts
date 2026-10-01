import {describe,it,expect} from 'vitest';
import {readAudioPreferences} from '../src/audio/preferences';

describe('the two user-facing audio sliders',()=>{
  it('starts with quiet background and clear effects',()=>{
    expect(readAudioPreferences(null)).toEqual({music:.22,sfx:1});
  });
  it('preserves independent exact zero and positive values on reload',()=>{
    expect(readAudioPreferences({version:2,music:0,sfx:.63},{master:1})).toEqual({music:0,sfx:.63});
    expect(readAudioPreferences({version:2,music:.35,sfx:0})).toEqual({music:.35,sfx:0});
  });
  it('makes old global mute visible as both sliders at zero',()=>{
    expect(readAudioPreferences(null,{master:.8},{muted:true})).toEqual({music:0,sfx:0});
  });
  it('maps old background mute only to the background slider',()=>{
    expect(readAudioPreferences(null,{master:.75,musicMuted:true})).toEqual({music:0,sfx:.75});
  });
  it('keeps the old master preference while adopting the quieter music default',()=>{
    const p=readAudioPreferences(null,{master:.4});
    expect(p.music).toBeCloseTo(.088);expect(p.sfx).toBe(.4);
  });
  it('bounds numeric settings and does not accept invalid gain values',()=>{
    expect(readAudioPreferences({version:2,music:2,sfx:-1})).toEqual({music:1,sfx:0});
    expect(readAudioPreferences({version:2,music:NaN,sfx:Infinity})).toEqual({music:.22,sfx:1});
    expect(readAudioPreferences({version:2,music:'0',sfx:null})).toEqual({music:.22,sfx:1});
  });
});
