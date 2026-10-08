import {it,expect} from 'vitest';
import {CHARACTER_IDS} from '../src/domain/characters';
import {HERO_OPENING,OPENING_ROUTES} from '../src/game/HeroOpeningCopy';
import {BUILD_FOCUS} from '../src/game/BuildJourney';
import {characterForNewRun} from '../src/game/CharacterRunCopy';
it('six short original voices accompany existing identities without strength or profession locks',()=>{
 expect(Object.keys(HERO_OPENING).sort()).toEqual([...CHARACTER_IDS].sort());
 expect(new Set(Object.values(HERO_OPENING).map(c=>c.taunt)).size).toBe(6);
 for(const id of CHARACTER_IDS){const c=HERO_OPENING[id];expect(c.story.length).toBeLessThanOrEqual(26);expect(c.taunt.length).toBeLessThanOrEqual(22);expect(c.play).not.toMatch(/保证|必胜|最强|只能选/);expect(c.accent).toMatch(/^#(26313A|B8473A|386D65)$/);expect(characterForNewRun(id).id).toBe(id);}
});
it('default promises keep ability eligibility, cost and risk instead of inventing a balance claim',()=>{
 expect(characterForNewRun('amo').passiveDescription).toContain('两对及以上');expect(HERO_OPENING.amo.play).toMatch(/两对或更大/);expect(HERO_OPENING.amo.play).toMatch(/每场一次.*副组会消耗/);
 expect(HERO_OPENING.touye.play).toMatch(/可能变弱/);expect(HERO_OPENING.erxiang.play).toMatch(/对子、两对、三条.*不享受/);
 expect(HERO_OPENING.azao.play).toMatch(/第一手和重复牌型不触发/);expect(HERO_OPENING.xiemu.play).toMatch(/最后可用出牌.*这一手过关/);
 expect(Object.keys(OPENING_ROUTES).sort()).toEqual([...BUILD_FOCUS].sort());
});
