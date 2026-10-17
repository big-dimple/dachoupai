import type {R2RunState} from '../domain/run';
import {r2JokerDefinitionsForContext} from '../domain/r2ContentProfiles';
import type {R2JokerInstance} from '../content/r2Schema';

export interface ShopSynergyResult {
  hasSynergy: boolean;
  heldInstanceIds: string[];
  heroSynergy: boolean;
  tag: string;
  reason: string;
}

/** Keywords associated with different poker routes / families */
const ROUTE_KEYWORDS: Record<string, string[]> = {
  group: ['对子', '两对', '三条', '葫芦', '四条', '成组', '同点', 'group', 'pair'],
  straight: ['顺子', '同花顺', 'straight', '连号'],
  flush: ['同花', '同花顺', 'flush', '花色', '单色'],
  face: ['人头', 'J/Q/K', 'JQK', 'face', '雅集'],
  ace: ['A', '条目A', 'ace', '首领'],
  discard: ['弃牌', 'discard', '换牌'],
  gold: ['金币', '利息', '购买', 'gold', 'economy', '财富'],
  mult: ['×M', '乘倍率', '加倍率', '+M', 'multiply', '连击'],
};

/** Character specific affinities */
const HERO_AFFINITIES: Record<string, string[]> = {
  erxiang: ['group', 'pair', '对子', '成组', '副手'],
  sushi: ['group', 'pair', '对子', '成组', '副手'],
  touye: ['discard', '弃牌', '单张', '残局', '高牌'],
  qinqiong: ['discard', '弃牌', '单张', '残局', '高牌'],
  laohuan: ['straight', 'flush', '顺子', '同花', '换留'],
  xinqiji: ['straight', 'flush', '顺子', '同花', '换留'],
  amo: ['face', 'ace', '人头', '点数', '乘倍率'],
  liue: ['face', 'ace', '人头', '点数', '乘倍率'],
  azao: ['mult', '连续', '蓄力', '连击', '长局'],
  wencheng: ['mult', '连续', '蓄力', '连击', '长局'],
  xiemu: ['gold', '金币', '利息', '燃金', '重赏'],
  huarui: ['gold', '金币', '利息', '燃金', '重赏'],
};

/** Checks if text matches any keyword from a given family */
function matchesFamily(text: string, family: string): boolean {
  const words = ROUTE_KEYWORDS[family] ?? [];
  return words.some(w => text.includes(w));
}

/**
 * Finds synergy between an offer (candidate) and currently held jokers or hero.
 */
export function findShopSynergy(run: R2RunState, candidateDefId: string): ShopSynergyResult {
  const result: ShopSynergyResult = {
    hasSynergy: false,
    heldInstanceIds: [],
    heroSynergy: false,
    tag: '✨ 可联动',
    reason: '',
  };

  if (!candidateDefId || !run) return result;

  let definitions;
  try {
    definitions = r2JokerDefinitionsForContext(run);
  } catch {
    return result;
  }

  const candidateDef = definitions.find(d => d.id === candidateDefId);
  if (!candidateDef) return result;

  const candidateText = `${candidateDef.name} ${candidateDef.description} ${candidateDef.rarity}`;

  // 1. Check Hero Synergy
  const charId = (run.characterId ?? '').toLowerCase();
  const heroAffinities = HERO_AFFINITIES[charId] ?? [];
  const heroMatched = heroAffinities.some(aff => candidateText.includes(aff) || matchesFamily(candidateText, aff));
  if (heroMatched) {
    result.heroSynergy = true;
    result.hasSynergy = true;
    result.reason = `契合当前英雄玩法特长`;
  }

  // 2. Check Synergy with currently held Jokers
  const heldJokers = run.jokers ?? [];
  for (const joker of heldJokers) {
    const heldDef = definitions.find(d => d.id === joker.definitionId);
    if (!heldDef) continue;

    const heldText = `${heldDef.name} ${heldDef.description}`;

    // Family match checks
    const routeFamilies = ['group', 'straight', 'flush', 'face', 'discard', 'gold', 'mult'];
    for (const fam of routeFamilies) {
      if (matchesFamily(candidateText, fam) && matchesFamily(heldText, fam)) {
        result.heldInstanceIds.push(joker.instanceId);
        result.hasSynergy = true;
        const famName = fam === 'group' ? '成组' : fam === 'straight' ? '顺子' : fam === 'flush' ? '同花' : fam === 'face' ? '人头牌' : fam === 'discard' ? '弃牌' : fam === 'gold' ? '经济' : '倍率';
        result.tag = `✨ 联动+${famName}`;
        result.reason = `与已持「${heldDef.name}」协同强化【${famName}】`;
        break;
      }
    }

    // Chips + Mult synergy (one adds heat, the other multiplies)
    const candidateHasMult = candidateText.includes('×') || candidateText.includes('倍率');
    const heldHasHeat = heldText.includes('+H') || heldText.includes('热度') || heldText.includes('点数');
    const candidateHasHeat = candidateText.includes('+H') || candidateText.includes('热度') || candidateText.includes('点数');
    const heldHasMult = heldText.includes('×') || heldText.includes('倍率');

    if ((candidateHasMult && heldHasHeat) || (candidateHasHeat && heldHasMult)) {
      if (!result.heldInstanceIds.includes(joker.instanceId)) {
        result.heldInstanceIds.push(joker.instanceId);
        result.hasSynergy = true;
        result.tag = '✨ 联动+乘倍率';
        result.reason = `与已持「${heldDef.name}」形成底数×倍率强力反应`;
      }
    }
  }

  // Deduplicate instance IDs
  result.heldInstanceIds = [...new Set(result.heldInstanceIds)];
  return result;
}
