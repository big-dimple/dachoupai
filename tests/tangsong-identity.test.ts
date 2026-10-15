import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HERO_CAST,HERO_CAST_NOTICE,heroName,heroText} from '../src/game/HeroIdentity';
import {GAME_NAME} from '../src/game/Brand';
import {CHARACTERS,getCharacter} from '../src/game/characters';
import {characterArt,assertCharacterArtReference} from '../src/game/CharacterArt';
import {characterForNewRun} from '../src/game/CharacterRunCopy';

it('binds six displayed identities to the existing technical IDs with three young men and three young women',()=>{
 expect(CHARACTERS.map(c=>[c.id,c.name])).toEqual([['amo','苏轼'],['touye','秦琼'],['laohuan','辛弃疾'],['erxiang','刘娥'],['azao','文成公主'],['xiemu','花蕊夫人']]);
 expect(Object.values(HERO_CAST).filter(c=>c.gender==='male')).toHaveLength(3);expect(Object.values(HERO_CAST).filter(c=>c.gender==='female')).toHaveLength(3);
 expect(HERO_CAST_NOTICE).toContain('架空青年');
 for(const c of CHARACTERS){expect(c.intro).toContain('青年');expect(c.name).toBe(heroName(c.id));expect(c.intro).not.toContain('郭子仪');}
 expect(GAME_NAME).toBe('唐宋牌');expect(readFileSync('index.html','utf8')).toContain('<title>'+GAME_NAME+'</title>');
});
it('keeps the current skills and real costs while changing their displayed owner',()=>{
 expect(characterForNewRun('amo').passiveDescription).toContain('副组真消耗');
 expect(characterForNewRun('touye').passiveDescription).toContain('照常花弃牌次数');
 expect(characterForNewRun('laohuan').passiveDescription).toContain('照付实际弃牌成本');
 expect(characterForNewRun('erxiang').passiveDescription).toContain('首次普通点数');
 expect(characterForNewRun('azao').passiveDescription).toContain('1／2／3层');
 expect(characterForNewRun('xiemu').passiveDescription).toContain('10／20／30金');
 for(const c of CHARACTERS)expect(characterForNewRun(c.id).name).toBe(c.name);
 expect(heroText('二响 · 交棒已兑现')).toBe('刘娥 · 交棒已兑现');
 expect(heroText('谢幕·燃金↗')).toBe('花蕊夫人·燃金↗');expect(heroText('逐个谢幕 · 已封禁')).toBe('逐个谢幕 · 已封禁');
});
it('every visible face role points at a named typographic placeholder, never an old likeness',()=>{
 for(const c of CHARACTERS)for(const purpose of ['avatar','selection','portrait'] as const){
  const a=characterArt(c.id,purpose);expect(a.path).toBe(`assets/cast-placeholders/${c.id}.${purpose}.svg`);
  const svg=readFileSync('public/'+a.path,'utf8');expect(a.format).toBe('svg');expect(createHash('sha256').update(svg).digest('hex')).toBe(a.sha256);expect(svg).toContain(c.name);expect(svg).toContain('人物图待交付');expect(svg).toContain(`width="${a.width}" height="${a.height}"`);expect(svg).not.toContain('<image');
  expect(()=>assertCharacterArtReference(a.key,`/assets/handdrawn-p08/characters/${c.id}.${purpose}.webp`)).toThrow('character-art-reference');
 }
 expect(getCharacter('azao').name.length).toBe(4);
});
