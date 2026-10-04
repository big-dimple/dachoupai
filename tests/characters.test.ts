import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CHARACTERS, resolveCharacterModifier } from '../src/game/characters';

describe('character portrait config', () => {
  it('六位角色的立绘路径均指向自己的资源文件', () => {
    expect(new Set(CHARACTERS.map(character=>character.portrait)).size).toBe(6);
    for (const character of CHARACTERS) {
      expect(character.portrait).toContain(`assets/handdrawn-p08/characters/${character.id}.portrait.webp`);
      const relative=character.portrait.slice(character.portrait.indexOf('assets/'));
      const bytes=readFileSync(new URL('../public/'+relative,import.meta.url));
      expect(bytes.subarray(8,12).toString()).toBe('WEBP');
    }
  });
  it('focal 对焦点都在 0~1 有效区间内', () => {
    for (const character of CHARACTERS) {
      expect(character.portraitFocusX).toBeGreaterThanOrEqual(0);
      expect(character.portraitFocusX).toBeLessThanOrEqual(1);
      expect(character.portraitFocusY).toBeGreaterThanOrEqual(0);
      expect(character.portraitFocusY).toBeLessThanOrEqual(1);
    }
  });
});


describe('character passives', () => {
  it('阿默 triples one-card plays', () => {
    const result = resolveCharacterModifier('amo', {
      cardCount: 1, handType: 'high-card', handsBeforePlay: 4, luckRoll: 0.9,
    });
    expect(result.finalMultiplier).toBe(3);
  });
  it('骰爷 uses the supplied deterministic roll', () => {
    expect(resolveCharacterModifier('touye', {
      cardCount: 5, handType: 'straight', handsBeforePlay: 4, luckRoll: 0.2,
    }).finalMultiplier).toBe(2);
  });
  it('阿燥 rewards changing hand type after the first play', () => {
    const result = resolveCharacterModifier('azao', {
      cardCount: 2, handType: 'pair', previousHandType: 'straight', handsBeforePlay: 3, luckRoll: 0.1,
    });
    expect(result.multiplierBonus).toBe(1);
  });
  it('谢幕人在最后一手翻倍', () => {
    const result = resolveCharacterModifier('xiemu', {
      cardCount: 5, handType: 'flush', handsBeforePlay: 1, luckRoll: 0.1,
    });
    expect(result.finalMultiplier).toBe(2);
  });
});
