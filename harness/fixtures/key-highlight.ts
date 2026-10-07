import {experiencePlan} from './joker-experience';
/** Explicit controlled inventory/public hand, successful native commands; not natural acquisition. */
export function keyHighlightPlan(){const p=experiencePlan();p.state.jokers.push({instanceId:'owned/f09',definitionId:'f09',paidPrice:6,growth:{}});p.state.stage!.initialJokerIds=p.state.jokers.map(j=>j.instanceId);return p;}

/** Controlled entry capacity snapshots, not natural resource acquisition; results use actual commands. */
export function keyHighlightCapacityPlan(count:9|14){const p=keyHighlightPlan();p.state.longTermItems=['U01'];p.state.stage!.handLimit=count;p.state.stage!.initialHandLimit=count;p.state.handOrder=p.state.deckInstances.slice(0,count).map(c=>c.id);p.state.drawPile=p.state.deckInstances.slice(count).map(c=>c.id);return p;}
