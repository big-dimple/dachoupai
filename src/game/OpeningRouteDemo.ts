import type {BuildFocus} from './BuildJourney';
import type {CharacterId} from './characters';
import {R2_ROUTE_STARTERS} from '../domain/r2GroupUpgrade';
import {newRunIdentity} from './RunLaunch';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
/** Route examples teach shape and real operations, never promise a next draw. */
export function openingRouteDemo(focus:BuildFocus,id:CharacterId){
 const starter=r2JokerDefinitionFor(newRunIdentity(id,focus),R2_ROUTE_STARTERS[focus]);
 const shape={group:['7♠','7♥','Q♣','Q♦'],straight:['3♠','4♥','5♣','6♦','7♠'],flush:['3♥','5♥','8♥','Q♥','A♥']}[focus];
 const method={group:'改点数凑同点，再升两对／三条',straight:'微调缺口点数，再升顺子',flush:'染成同花色，再升同花'}[focus];
 const payoff={group:'两对／三条／葫芦加倍率',straight:'成顺子，路线牌加倍率',flush:'成同花，存成长下手生效'}[focus];
 return {shape,method,payoff,starter:starter.name,id:starter.id};
}
