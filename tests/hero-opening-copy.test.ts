import {it,expect} from 'vitest';
import {CHARACTER_IDS} from '../src/domain/characters';
import {HERO_OPENING,OPENING_ROUTES} from '../src/game/HeroOpeningCopy';
import {BUILD_FOCUS} from '../src/game/BuildJourney';
import {characterForNewRun} from '../src/game/CharacterRunCopy';
it('six short original voices accompany existing identities without strength or profession locks',()=>{
 expect(Object.keys(HERO_OPENING).sort()).toEqual([...CHARACTER_IDS].sort());
 expect(new Set(Object.values(HERO_OPENING).map(c=>c.taunt)).size).toBe(6);
 for(const id of CHARACTER_IDS){const c=HERO_OPENING[id];expect(c.story.length).toBeLessThanOrEqual(26);expect(c.taunt.length).toBeLessThanOrEqual(22);expect(characterForNewRun(id).openingPlay).not.toMatch(/保证|必胜|最强|只能选/);expect(c.accent).toMatch(/^#(26313A|B8473A|386D65)$/);expect(characterForNewRun(id).id).toBe(id);}
});
it('default promises share the current identity copy and describe actual operation timing',()=>{
 const copy=(id:typeof CHARACTER_IDS[number])=>characterForNewRun(id).openingPlay;
 for(const id of CHARACTER_IDS)expect(copy(id).length).toBeLessThanOrEqual(52);
 expect(copy('amo')).toMatch(/出牌前.*助攻.*真消耗/);
 expect(copy('erxiang')).toMatch(/出牌前.*交棒.*点数改加倍率/);expect(copy('erxiang')).not.toMatch(/对子、两对、三条/);
 expect(copy('laohuan')).toMatch(/弃牌前.*戏法.*自己留/);expect(copy('laohuan')).not.toMatch(/多添热度/);
 expect(copy('touye')).toMatch(/弃牌前.*下一手.*未成×0.85/);expect(copy('touye')).not.toMatch(/机会|随机/);
 expect(copy('azao')).toMatch(/先蓄势.*出牌前.*释放/);expect(copy('xiemu')).toMatch(/出牌前.*燃10／20／30金.*留钱/);
 expect(Object.keys(OPENING_ROUTES).sort()).toEqual([...BUILD_FOCUS].sort());
});
