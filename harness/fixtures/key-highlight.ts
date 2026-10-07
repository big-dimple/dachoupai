import {experiencePlan} from './joker-experience';
/** Explicit controlled inventory/public hand, successful native commands; not natural acquisition. */
export function keyHighlightPlan(){const p=experiencePlan();p.state.jokers.push({instanceId:'owned/f09',definitionId:'f09',paidPrice:6,growth:{}});p.state.stage!.initialJokerIds=p.state.jokers.map(j=>j.instanceId);return p;}
