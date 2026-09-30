import type { HandType } from '../cards/handEvaluator';

export const CHARACTER_IDS = ['amo', 'touye', 'laohuan', 'erxiang', 'azao', 'xiemu'] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

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
