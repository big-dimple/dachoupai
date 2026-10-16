import {expect,it} from 'vitest';
import {heroFocusComposition,heroFocusCrop,heroFocusPose} from '../src/game/HeroClimaxFocus';
import {heroClimaxLayout,reserveHeroClimaxHeader} from '../src/game/HeroClimaxLayout';
import type {CharacterId} from '../src/domain/characters';
it.each(['amo','touye','laohuan','erxiang','azao','xiemu'] as CharacterId[])('%s eye strip keeps the reviewed pair of eyes in source bounds',id=>{
 const b=heroFocusCrop(id,600,600);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(600);expect(b.y+b.height).toBeLessThanOrEqual(600);expect(b.width/b.height).toBeGreaterThan(2);
});
it('new user-provided Su Shi strip includes both reviewed eye anchors without cutting through the smile',()=>{
 const b=heroFocusCrop('amo',480,480);
 for(const [x,y] of [[271,137],[339,165]]){expect(x).toBeGreaterThan(b.x);expect(x).toBeLessThan(b.x+b.width);expect(y).toBeGreaterThan(b.y);expect(y).toBeLessThan(b.y+b.height);}
 expect(b.y+b.height).toBeLessThan(205);
});
it.each([[320,740],[390,740],[568,320],[740,320],[740,300],[1366,768]])('focus and two number lanes stay separate at %ix%i',(w,h)=>{
 const l=heroClimaxLayout(w,h),c=heroFocusComposition(reserveHeroClimaxHeader(l,l.nameY+58),true);
 expect(c.local.x+c.local.width).toBeLessThan(c.total.x);expect(c.total.x+c.total.width).toBeLessThanOrEqual(l.panel.x+l.panel.width);
 expect(c.local.height).toBeGreaterThanOrEqual(30);expect(c.total.y+c.total.height).toBeLessThan(l.noteY);
 if(l.short)expect(c.eyes.x+c.eyes.width).toBeLessThan(c.local.x);else expect(c.eyes.y+c.eyes.height).toBeLessThan(c.labelY);
});
it('charges once then fades to a quiet edge; reduced motion has one static pose',()=>{
 expect(heroFocusPose(180,undefined).alpha).toBeGreaterThan(heroFocusPose(0,undefined).alpha);
 const release=[0,70,140,220,500].map(t=>heroFocusPose(180+t,t).alpha);expect(release).toEqual([...release].sort((a,b)=>b-a));
 expect(heroFocusPose(0,undefined,true)).toEqual(heroFocusPose(9999,9000,true));
});
