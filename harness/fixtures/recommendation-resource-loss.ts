import {fixture,held,stock} from '../../analysis/recommendation-cost-lifetime/model';

/** Controlled public input, not natural acquisition or a predicted future hand. */
export function resourceLossFixture(donor:string){
 const state=held(fixture(),['b02',donor]);state.gold=40;
 const offer=stock(state,'e08');return {state,offer,sold:state.jokers[1]};
}
