import type { HandType } from '../cards/handEvaluator';

export type CharacterId = 'amo' | 'touye' | 'laohuan' | 'erxiang' | 'azao' | 'xiemu';

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
  { id: 'touye', name: '骰爷', title: '赌命客', quote: '别算了，下一把就翻。', passiveName: '再来一把', passiveDescription: '每次出牌：50% 倍率 ×2，否则 ×0.75。', accent: 0xffba66, portrait: characterAsset('touye.png'), portraitFocusX: 0.52, portraitFocusY: 0.07 },
  { id: 'laohuan', name: '老幻', title: '空袖', quote: '袖子是空的，分不是。', passiveName: '袖里有牌', passiveDescription: '顺子、同花、同花顺额外 +120 基础热度。', accent: 0x79e7ff, portrait: characterAsset('laohuan.png'), portraitFocusX: 0.55, portraitFocusY: 0.10 },
  { id: 'erxiang', name: '二响', title: '捧哏王', quote: '你出对子，我负责把场子接住。', passiveName: '接得漂亮', passiveDescription: '对子、两对、三条的倍率 +1.5。', accent: 0xff83b4, portrait: characterAsset('erxiang.png'), portraitFocusX: 0.52, portraitFocusY: 0.11 },
  { id: 'azao', name: '阿燥', title: '热场王', quote: '同一个包袱说两遍就凉了。', passiveName: '换个活儿', passiveDescription: '本次牌型与上次不同，倍率 +1。', accent: 0x95ff8c, portrait: characterAsset('azao.png'), portraitFocusX: 0.57, portraitFocusY: 0.08 },
  { id: 'xiemu', name: '谢幕人', title: '压轴', quote: '最后一个包袱，才值票价。', passiveName: '最后一个包袱', passiveDescription: '本场最后一次出牌，最终倍率 ×2。', accent: 0xff5b5b, portrait: characterAsset('xiemu.png'), portraitFocusX: 0.52, portraitFocusY: 0.09 },
];

export interface CharacterContext {
  cardCount: number;
  handType: HandType;
  previousHandType?: HandType;
  handsBeforePlay: number;
  luckRoll: number;
}

export interface CharacterModifier {
  heatBonus: number;
  multiplierBonus: number;
  finalMultiplier: number;
  triggered: boolean;
  note?: string;
}

export function getCharacter(id: CharacterId): CharacterDefinition {
  const character = CHARACTERS.find((item) => item.id === id);
  if (!character) throw new Error(`Unknown character: ${id}`);
  return character;
}

export function resolveCharacterModifier(id: CharacterId, context: CharacterContext): CharacterModifier {
  const base: CharacterModifier = { heatBonus: 0, multiplierBonus: 0, finalMultiplier: 1, triggered: false };

  switch (id) {
    case 'amo':
      return context.cardCount === 1 ? { ...base, finalMultiplier: 3, triggered: true, note: '独角戏 ×3' } : base;
    case 'touye':
      return context.luckRoll < 0.5
        ? { ...base, finalMultiplier: 2, triggered: true, note: '赌中了 ×2' }
        : { ...base, finalMultiplier: 0.75, triggered: true, note: '赌歪了 ×0.75' };
    case 'laohuan':
      return ['straight', 'flush', 'straight-flush'].includes(context.handType)
        ? { ...base, heatBonus: 120, triggered: true, note: '袖里有牌 +120' }
        : base;
    case 'erxiang':
      return ['pair', 'two-pair', 'three-kind'].includes(context.handType)
        ? { ...base, multiplierBonus: 1.5, triggered: true, note: '接得漂亮 +1.5 倍率' }
        : base;
    case 'azao':
      return context.previousHandType !== undefined && context.previousHandType !== context.handType
        ? { ...base, multiplierBonus: 1, triggered: true, note: '换个活儿 +1 倍率' }
        : base;
    case 'xiemu':
      return context.handsBeforePlay === 1
        ? { ...base, finalMultiplier: 2, triggered: true, note: '压轴 ×2' }
        : base;
  }
}
