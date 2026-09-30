import data from './r2-jokers.json';
import { R2_HAND_TYPES, type R2HandType } from '../domain/evaluateR2';
import { Rational, type Fraction } from '../domain/rational';

export type ScorePhase = 'base' | 'onCardScore' | 'onHeldCard' | 'characterScore' | 'jokerScore' | 'finalScore' | 'afterHand';
export type HookPhase = 'onCardScore' | 'onHeldCard' | 'jokerScore' | 'afterHand';
export type Condition =
  | { kind: 'always' }
  | { kind: 'hand-type-in'; values: readonly R2HandType[] }
  | { kind: 'rank-in'; values: readonly number[] }
  | { kind: 'played-count'; equals: number }
  | { kind: 'held-count'; minimum: number }
  | { kind: 'play-modulo'; divisor: number; remainder: number };
export type Operation =
  | { kind: 'add-heat' | 'add-multiplier' | 'multiply-multiplier'; value: Fraction }
  | { kind: 'read-growth'; key: string; target: 'heat' | 'multiplier' }
  | { kind: 'add-growth'; key: string; value: Fraction; cap: Fraction }
  | { kind: 'retrigger-card'; count: number };
export interface R2JokerDefinition {
  id: string; name: string; rarity: 'common' | 'uncommon' | 'rare'; description: string;
  hooks: { phase: HookPhase; condition: Condition; operations: readonly Operation[] }[];
}
export interface R2JokerInstance { instanceId: string; definitionId: string; paidPrice: number; growth: Record<string, Fraction> }

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(k => keys.includes(k));
const integer = (value: unknown, min: number, max: number) => Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max;
const fraction = (value: unknown, positive = false): boolean => {
  try {
    if (!object(value) || !exact(value, ['n', 'd'])) return false;
    const parsed = Rational.fromJSON(value);
    return positive ? parsed.n > 0n : parsed.n >= 0n;
  } catch { return false; }
};
const key = (value: unknown) => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);

export function validateR2Content(input: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(input) || input.length > 72) return ['content: expected up to 72 definitions'];
  const ids = new Set<string>();
  for (const [index, definition] of input.entries()) {
    const path = `content[${index}]`;
    if (!object(definition) || !exact(definition, ['id', 'name', 'rarity', 'description', 'hooks']) || !key(definition.id) || ids.has(definition.id as string) || typeof definition.name !== 'string' || !definition.name || typeof definition.description !== 'string' || !definition.description || !['common', 'uncommon', 'rare'].includes(definition.rarity as string)) { errors.push(`${path}: invalid identity/rarity/fields`); continue; }
    ids.add(definition.id as string);
    if (!Array.isArray(definition.hooks) || !definition.hooks.length || definition.hooks.length > 8) { errors.push(`${path}: invalid hooks`); continue; }
    for (const [h, hook] of definition.hooks.entries()) {
      const at = `${path}.hooks[${h}]`;
      if (!object(hook) || !exact(hook, ['phase', 'condition', 'operations']) || !['onCardScore', 'onHeldCard', 'jokerScore', 'afterHand'].includes(hook.phase as string)) { errors.push(`${at}: unknown phase/fields`); continue; }
      const c = hook.condition;
      let valid = false;
      if (object(c)) switch (c.kind) {
        case 'always': valid = exact(c, ['kind']); break;
        case 'hand-type-in': valid = exact(c, ['kind', 'values']) && Array.isArray(c.values) && c.values.length > 0 && c.values.every(v => R2_HAND_TYPES.includes(v)); break;
        case 'rank-in': valid = exact(c, ['kind', 'values']) && ['onCardScore', 'onHeldCard'].includes(hook.phase as string) && Array.isArray(c.values) && c.values.length > 0 && c.values.every(v => integer(v, 2, 14)); break;
        case 'played-count': valid = exact(c, ['kind', 'equals']) && integer(c.equals, 1, 5); break;
        case 'held-count': valid = exact(c, ['kind', 'minimum']) && integer(c.minimum, 0, 14); break;
        case 'play-modulo': valid = exact(c, ['kind', 'divisor', 'remainder']) && integer(c.divisor, 1, 100) && integer(c.remainder, 0, (c.divisor as number) - 1); break;
      }
      if (!valid) errors.push(`${at}: unknown/invalid condition`);
      if (!Array.isArray(hook.operations) || !hook.operations.length || hook.operations.length > 8) { errors.push(`${at}: invalid operations`); continue; }
      for (const [o, op] of hook.operations.entries()) {
        let accepted = false;
        if (object(op)) switch (op.kind) {
          case 'add-heat': case 'add-multiplier': case 'multiply-multiplier': accepted = hook.phase !== 'afterHand' && exact(op, ['kind', 'value']) && fraction(op.value, op.kind === 'multiply-multiplier'); break;
          case 'read-growth': accepted = hook.phase === 'jokerScore' && exact(op, ['kind', 'key', 'target']) && key(op.key) && ['heat', 'multiplier'].includes(op.target as string); break;
          case 'add-growth': accepted = hook.phase === 'afterHand' && exact(op, ['kind', 'key', 'value', 'cap']) && key(op.key) && fraction(op.value, true) && fraction(op.cap, true); break;
          case 'retrigger-card': accepted = hook.phase === 'onCardScore' && exact(op, ['kind', 'count']) && integer(op.count, 1, 4); break;
        }
        if (!accepted) errors.push(`${at}.operations[${o}]: unknown/invalid operation or timing`);
      }
    }
    // A reference to growth must have a finite, declared writer on the same definition.
    const hooks = definition.hooks as R2JokerDefinition['hooks'];
    const writers = new Set(hooks.flatMap(h => Array.isArray(h?.operations) ? h.operations.filter(o => o?.kind === 'add-growth').map(o => (o as Extract<Operation, {kind:'add-growth'}>).key) : []));
    if (hooks.some(h => Array.isArray(h?.operations) && h.operations.some(o => o?.kind === 'read-growth' && !writers.has(o.key)))) errors.push(`${path}: missing growth writer`);
  }
  return errors;
}

const errors = validateR2Content(data);
if (errors.length) throw new Error(errors.join('\n'));
export const R2_JOKERS = data as R2JokerDefinition[];
