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
  accent: number;
  portrait: string;
  /** 立绘对焦锚点（0~1，相对原图宽/高），选角页 cover 裁切与 HUD 正方裁切共用 */
  portraitFocusX: number;
  portraitFocusY: number;
}

// 统一走 vite base 拼资源地址，部署到子目录（如 /dachoupai/）时不会 404
const characterAsset = (file: string): string => `${import.meta.env.BASE_URL}assets/characters/${file}`;

export const CHARACTERS: CharacterDefinition[] = [
  { id: 'amo', name: '阿默', title: '默剧王', quote: '一个人，也能把台子撑爆。', passiveName: '独角戏', passiveDescription: '只打出 1 张牌时，倍率 ×3。', accent: 0xd8d0ff, portrait: characterAsset('amo.png'), portraitFocusX: 0.62, portraitFocusY: 0.08 },
  { id: 'touye', name: '骰爷', title: '赌命客', quote: '别算了，下一把就翻。', passiveName: '再来一把', passiveDescription: '通常 ×1.15；每场可押一手，50% ×2 / 50% ×0.75。', accent: 0xffba66, portrait: characterAsset('touye.png'), portraitFocusX: 0.52, portraitFocusY: 0.07 },
  { id: 'laohuan', name: '老幻', title: '空袖', quote: '袖子是空的，分不是。', passiveName: '袖里有牌', passiveDescription: '顺子、同花、同花顺额外 +120 基础热度。', accent: 0x79e7ff, portrait: characterAsset('laohuan.png'), portraitFocusX: 0.55, portraitFocusY: 0.10 },
  { id: 'erxiang', name: '二响', title: '捧哏王', quote: '你出对子，我负责把场子接住。', passiveName: '接得漂亮', passiveDescription: '对子、两对、三条的倍率 +1.5。', accent: 0xff83b4, portrait: characterAsset('erxiang.png'), portraitFocusX: 0.52, portraitFocusY: 0.11 },
  { id: 'azao', name: '阿燥', title: '热场王', quote: '同一个包袱说两遍就凉了。', passiveName: '换个活儿', passiveDescription: '与本场上次牌型不同，倍率 +1；第一手不触发。', accent: 0x95ff8c, portrait: characterAsset('azao.png'), portraitFocusX: 0.57, portraitFocusY: 0.08 },
  { id: 'xiemu', name: '谢幕人', title: '压轴', quote: '最后一个包袱，才值票价。', passiveName: '最后一个包袱', passiveDescription: '最后可用出牌 ×2；该手过关额外 +2 金。', accent: 0xff5b5b, portrait: characterAsset('xiemu.png'), portraitFocusX: 0.52, portraitFocusY: 0.09 },
];

export function getCharacter(id: CharacterId): CharacterDefinition {
  const character = CHARACTERS.find((item) => item.id === id);
  if (!character) throw new Error(`Unknown character: ${id}`);
  return character;
}
