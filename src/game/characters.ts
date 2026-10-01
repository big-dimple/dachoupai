import type { CharacterId } from '../domain/characters';
export { resolveCharacterModifier } from '../domain/characters';
export type { CharacterId, CharacterContext, CharacterModifier } from '../domain/characters';

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
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

// 统一走 vite base 拼资源地址，部署到子目录（如 /dachoupai/）时不会 404
const characterAsset = (file: string): string => `${import.meta.env.BASE_URL}assets/characters-p07/${file}`;

export const CHARACTERS: CharacterDefinition[] = [
  { id: 'amo', name: '阿默', title: '默剧王', quote: '一个人，也能把台子撑爆。', passiveName: '独角戏', passiveDescription: '高牌 Lv3 开局；只打出 1 张牌时，倍率 ×3。',
    buildTip: '保留手中的 J/Q/K 配「候场席」，持牌先加倍率，再乘角色 ×3；「一束光」补热度，「熟面孔」靠单张出牌成长。',
    accent: 0xd8d0ff, portrait: characterAsset('amo.portrait.webp'), portraitFocusX: 0.47, portraitFocusY: 0.22 },
  { id: 'touye', name: '骰爷', title: '赌命客', quote: '别算了，下一把就翻。', passiveName: '再来一把', passiveDescription: '通常 ×1.15；每场可押一手，50% ×2 / 50% ×0.75。',
    buildTip: '先用稳定牌型和大丑牌打牢基础，再比较押注 ×2 的收益与 ×0.75 的风险；别把过关全押在一次翻倍上。',
    accent: 0xffba66, portrait: characterAsset('touye.portrait.webp'), portraitFocusX: 0.53, portraitFocusY: 0.22 },
  { id: 'laohuan', name: '老幻', title: '空袖', quote: '袖子是空的，分不是。', passiveName: '袖里有牌', passiveDescription: '顺子、同花、同花顺额外 +120 基础热度。',
    buildTip: '用弃牌找顺子或同花；「搭台阶」补顺子热度，「红线」补红色计分牌热度，「越染越深」靠同花成长。',
    accent: 0x79e7ff, portrait: characterAsset('laohuan.portrait.webp'), portraitFocusX: 0.52, portraitFocusY: 0.23 },
  { id: 'erxiang', name: '二响', title: '捧哏王', quote: '你出对子，我负责把场子接住。', passiveName: '接得漂亮', passiveDescription: '对子、两对、三条的倍率 +1.5。',
    buildTip: '用对子、两对、三条配「满堂彩」「对上眼」「老搭档」；葫芦、四条不会获得角色 +1.5。',
    accent: 0xff83b4, portrait: characterAsset('erxiang.portrait.webp'), portraitFocusX: 0.57, portraitFocusY: 0.23 },
  { id: 'azao', name: '阿燥', title: '热场王', quote: '同一个包袱说两遍就凉了。', passiveName: '换个活儿', passiveDescription: '与本场上次牌型不同，倍率 +1；第一手不触发。',
    buildTip: '准备两种能得分的牌型轮换，先比较总分；不要为了 +1 倍率，硬打更弱的牌。',
    accent: 0x95ff8c, portrait: characterAsset('azao.portrait.webp'), portraitFocusX: 0.61, portraitFocusY: 0.25 },
  { id: 'xiemu', name: '谢幕人', title: '压轴', quote: '最后一个包袱，才值票价。', passiveName: '最后一个包袱', passiveDescription: '最后可用出牌 ×2；该手过关额外 +2 金。',
    buildTip: '强牌留给最后可用出牌，配「最后一句」；「回马枪」每第 3 手翻倍，先核对它是否与最后一手重合，再权衡提前过关的余次金币。',
    accent: 0xff5b5b, portrait: characterAsset('xiemu.portrait.webp'), portraitFocusX: 0.5, portraitFocusY: 0.22 },
];

export function getCharacter(id: CharacterId): CharacterDefinition {
  const character = CHARACTERS.find((item) => item.id === id);
  if (!character) throw new Error(`Unknown character: ${id}`);
  return character;
}
