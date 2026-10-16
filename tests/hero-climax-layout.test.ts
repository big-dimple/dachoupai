import {expect,it} from 'vitest';
import {heroClimaxLayout,reserveHeroClimaxHeader} from '../src/game/HeroClimaxLayout';
it.each([[320,568],[390,844],[1366,900]])('keeps every camera below a wrapped owner at %ix%i while preserving footer facts',(w,h)=>{
 const original=heroClimaxLayout(w,h),bottom=original.nameY+100,l=reserveHeroClimaxHeader(original,bottom);
 for(const box of [l.body,l.source,l.eyes,l.readout,l.landing]){expect(box.y).toBeGreaterThanOrEqual(bottom+12);expect(box.height).toBeGreaterThan(0);}
 expect(l.source.y+l.source.height).toBe(original.source.y+original.source.height);
 expect(l.noteY).toBe(original.noteY);expect(l.sourceCaption).toEqual(original.sourceCaption);expect(l.panel).toEqual(original.panel);
});
it('keeps a fitting header composition and rejects non-measurements without corrupting geometry',()=>{
 const l=heroClimaxLayout(1366,900);expect(reserveHeroClimaxHeader(l,l.body.y-20)).toBe(l);expect(reserveHeroClimaxHeader(l,NaN)).toBe(l);
});
