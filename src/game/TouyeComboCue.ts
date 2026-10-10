import type {R2RunState} from '../domain/r2Run';
import {r2JokerDefinitionsFor} from '../domain/r2ContentProfiles';
import {fractionText} from './scoreText';
/** Owned public source and successful-play counter only; never forecasts the draw or total score. */
export function touyeComboCue(run:R2RunState):string|undefined {
 const owned=run.jokers.find(j=>j.definitionId==='huimaqiang');if(!owned||!run.stage)return;
 const d=r2JokerDefinitionsFor(run).find(d=>d.id===owned.definitionId),h=d?.hooks.find(h=>h.phase==='jokerScore'&&h.condition.kind==='play-modulo'&&h.condition.remainder===0),op=h?.operations.find(o=>o.kind==='multiply-multiplier');
 if(!h||h.condition.kind!=='play-modulo'||op?.kind!=='multiply-multiplier')return;
 const next=run.stage.playIndex+1,due=Math.ceil(next/h.condition.divisor)*h.condition.divisor,remaining=due-next;
 return '回马枪：第'+due+'手'+(remaining?'，还隔'+remaining+'手':'，就是下一手')+'倍率×'+fractionText(op.value)+'。\n押中同花且两项实际生效，英雄×2与回马枪×'+fractionText(op.value)+'相乘；封禁时不生效。';
}
