import {heroSkillName} from './HeroSkillPresentation';
import {cardDisplayName} from './tangsongCardNames';
import {HERO_CAST} from './HeroIdentity';
import {characterArt} from './CharacterArt';
import type { CharacterId } from '../domain/characters';
export { resolveCharacterModifier } from '../domain/characters';
export type { CharacterId, CharacterContext, CharacterModifier } from '../domain/characters';

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  intro: string;
  title: string;
  quote: string;
  passiveName: string;
  passiveDescription: string;
  buildTip: string;
  accent: number;
  portrait: string;
  /** 选角矩形按人脸焦点裁切；HUD 使用独立头像，详情完整展示。 */
  portraitFocusX: number;
  portraitFocusY: number;
}

export const CHARACTERS: CharacterDefinition[] = [
  { id: 'amo', name: HERO_CAST.amo.name, intro: HERO_CAST.amo.intro, title: HERO_CAST.amo.title, quote: HERO_CAST.amo.quote, passiveName: heroSkillName('amo'), passiveDescription: '高牌 Lv3 开局；只打出1张时，最终倍率 ×3。旧局沿用原计分顺序。',
    buildTip: ("新局单张出牌先结算唐宋牌，再乘角色 ×3；「"+cardDisplayName('pengci')+"」「"+cardDisplayName('a09')+"」更好起势，持有 J/Q/K 配「"+cardDisplayName('d01')+"」，「"+cardDisplayName('a05')+"」与高牌升级持续成长。"),
    accent: 0xd8d0ff, portrait: (characterArt('amo','portrait')?.url??''), portraitFocusX: 0.47, portraitFocusY: 0.22 },
  { id: 'touye', name: HERO_CAST.touye.name, intro: HERO_CAST.touye.intro, title: HERO_CAST.touye.title, quote: HERO_CAST.touye.quote, passiveName: heroSkillName('touye'), passiveDescription: '通常 ×1.15；每场可押一手，50% ×2 / 50% ×0.75。',
    buildTip: '先用稳定牌型和唐宋牌打牢基础，再比较押注 ×2 的收益与 ×0.75 的风险；别把过关全押在一次翻倍上。',
    accent: 0xffba66, portrait: (characterArt('touye','portrait')?.url??''), portraitFocusX: 0.53, portraitFocusY: 0.22 },
  { id: 'laohuan', name: HERO_CAST.laohuan.name, intro: HERO_CAST.laohuan.intro, title: HERO_CAST.laohuan.title, quote: HERO_CAST.laohuan.quote, passiveName: heroSkillName('laohuan'), passiveDescription: '顺子、同花、同花顺额外 +120 基础热度。',
    buildTip: ("用弃牌找顺子或同花；「"+cardDisplayName('c04')+"」补顺子热度，「"+cardDisplayName('c02')+"」补红色计分牌热度，「"+cardDisplayName('c06')+"」靠同花成长。"),
    accent: 0x79e7ff, portrait: (characterArt('laohuan','portrait')?.url??''), portraitFocusX: 0.52, portraitFocusY: 0.23 },
  { id: 'erxiang', name: HERO_CAST.erxiang.name, intro: HERO_CAST.erxiang.intro, title: HERO_CAST.erxiang.title, quote: HERO_CAST.erxiang.quote, passiveName: heroSkillName('erxiang'), passiveDescription: '对子、两对、三条的倍率 +1.5。',
    buildTip: ("用对子、两对、三条配「"+cardDisplayName('mantangcai')+"」「"+cardDisplayName('b02')+"」「"+cardDisplayName('b03')+"」；葫芦、四条不会获得角色 +1.5。"),
    accent: 0xff83b4, portrait: (characterArt('erxiang','portrait')?.url??''), portraitFocusX: 0.57, portraitFocusY: 0.23 },
  { id: 'azao', name: HERO_CAST.azao.name, intro: HERO_CAST.azao.intro, title: HERO_CAST.azao.title, quote: HERO_CAST.azao.quote, passiveName: heroSkillName('azao'), passiveDescription: '与本场上次牌型不同，倍率 +1；第一手不触发。',
    buildTip: '准备两种能得分的牌型轮换，先比较总分；不要为了 +1 倍率，硬打更弱的牌。',
    accent: 0x95ff8c, portrait: (characterArt('azao','portrait')?.url??''), portraitFocusX: 0.61, portraitFocusY: 0.25 },
  { id: 'xiemu', name: HERO_CAST.xiemu.name, intro: HERO_CAST.xiemu.intro, title: HERO_CAST.xiemu.title, quote: HERO_CAST.xiemu.quote, passiveName: heroSkillName('xiemu'), passiveDescription: '最后可用出牌 ×2；该手过关额外 +2 金。',
    buildTip: ("强牌留给最后可用出牌，配「"+cardDisplayName('f02')+"」；「回马枪」每第 3 手翻倍，先核对它是否与最后一手重合，再权衡提前过关的余次金币。"),
    accent: 0xff5b5b, portrait: (characterArt('xiemu','portrait')?.url??''), portraitFocusX: 0.5, portraitFocusY: 0.22 },
];

export function getCharacter(id: CharacterId): CharacterDefinition {
  const character = CHARACTERS.find((item) => item.id === id);
  if (!character) throw new Error(`Unknown character: ${id}`);
  return character;
}
