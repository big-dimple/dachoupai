import type {BuildFocus} from './BuildJourney';
import type {CharacterId} from './characters';
import {R2_ROUTE_STARTERS} from '../domain/r2GroupUpgrade';
import {newRunIdentity} from './RunLaunch';
import {fractionText} from './scoreText';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
/** Route examples teach shape and real operations, never promise a next draw. */
export function openingRouteDemo(focus:BuildFocus,id:CharacterId){
 const starter=r2JokerDefinitionFor(newRunIdentity(id,focus),R2_ROUTE_STARTERS[focus]);
 const shape={group:['7♠','7♥','Q♣','Q♦'],straight:['3♠','4♥','5♣','6♦','7♠'],flush:['3♥','5♥','8♥','Q♥','A♥']}[focus];
 const method={group:'改点数凑同点，再升两对／三条',straight:'微调缺口点数，再升顺子',flush:'染成同花色，再升同花'}[focus];
 const operations=starter.hooks.flatMap(h=>h.operations),heat=operations.find(op=>op.kind==='add-heat'),growth=operations.find(op=>op.kind==='add-growth');
 const payoff=heat?.kind==='add-heat'?(focus==='group'?'成组':'顺子')+'后热度 +'+fractionText(heat.value):growth?.kind==='add-growth'?'同花 +'+fractionText(growth.value)+'成长 · 下手生效':'完整条件见起手详情';
 return {shape,method,payoff,starter:starter.name,id:starter.id};
}
