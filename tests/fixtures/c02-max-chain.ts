import {RunController} from '../../src/application/RunController';
import {makeCheckpoint} from '../../src/application/checkpoint';
import {createRun,type Action,type Command,type R2RunState} from '../../src/domain/run';
import {r2CreateJoker} from '../../src/domain/r2Run';

// Prepared current72 event maximum: real preparation commands plus an explicit artificial acquisition/draw fixture.
// Expectations come from c01_goldens' independent arithmetic and Mulberry vector.
export const C02_MAX_CHAIN_EXPECTED={
  score:'1334525',heat:'1335071',gold:136,goldDelta:20,
  accumulator:{H:{n:'1740',d:'1'},M:{n:'24543',d:'32'}},
  pureEvents:88,sharedEvents:91,scoringPasses:10,highCardLevel:2,
  rule:{algorithm:'fnv1a-mulberry32-v1' as const,state:3031312653},
};
export const C02_MAX_CHAIN_PROOF={
  status:'attained-current72-event-maximum',maximumProvedForScope:true,
  scope:'Current72, command-reachable entry resources and B01–B04: 91 trace events. Score size and natural acquisition probability are separate.',
  provenance:'Artificial acquisition, card modifications and draw order; preparation uses real shared commands. Not a natural run or a device test.',
  handLimit:10,jokerCount:5,distinctJokers:['d04','b02','b05','tiesuanpan','c02'],
  warmupScores:['167','197','182'],warmupHeat:'546',targetHeat:'800',
  ruleStart:16697,independentRuleUintVector:[260915538,34794290,382425058,142180176],
  enhancementLayout:['lucky-paper','encore-paper','encore-paper','encore-paper','encore-paper'],
  ruleProbabilityOrder:['1/5','1/15','1/5','1/15'],
};

export function makeC02MaxChainFixture():{state:R2RunState;selectedIds:string[];journal:Command[]} {
  const state=createRun({rulesVersion:'r2',seed:'c02-max-chain',runId:'c02-max-chain',characterId:'xiemu'});
  state.boss={definitionId:'B02',disabledSuit:null};state.seenBossIds=['B02'];
  state.gold=100;state.longTermItems=['U01','U04','U09','U12'];state.spectralModifiers.cleanSlateBonus=1;
  state.jokers=C02_MAX_CHAIN_PROOF.distinctJokers.map(id=>r2CreateJoker(id,`${state.runId}/joker/${id}`,8,'polychrome'));
  const route=new RunController(state);
  const submit=(run:RunController<R2RunState>,action:Action):void=>{
    const result=run.dispatch(action);if(!result.ok)throw Error(`C02 fixture ${action.type}: ${result.code}`);
  };
  for(const type of ['SkipStage','OpenShop','SkipStage','OpenShop','LeaveShop','EnterStage'] as const)submit(route,{type});
  const staged=structuredClone(route.state);
  const selectedIds=['hearts-10','hearts-11','hearts-12','hearts-13','hearts-14'];
  const warmup=['spades-2','spades-3','spades-4'],filler=['spades-5','spades-6'],incoming=['spades-7','spades-8','spades-9'];
  const voices=['diamonds-2','diamonds-3','diamonds-4','diamonds-5','diamonds-6'];
  selectedIds.forEach((id,index)=>Object.assign(staged.deckInstances.find(card=>card.id===id)!,{rank:12,suit:'hearts',enhancement:index===0?'lucky-paper':'encore-paper',edition:'holographic'}));
  for(const id of voices)staged.deckInstances.find(card=>card.id===id)!.enhancement='voice-paper';
  staged.handOrder=[...warmup,...selectedIds,...filler];
  const reserved=new Set([...staged.handOrder,...incoming,...voices]);
  staged.drawPile=[...staged.deckInstances.filter(card=>!reserved.has(card.id)).map(card=>card.id),...[...voices].reverse(),...[...incoming].reverse()];
  staged.rng.rule={algorithm:'fnv1a-mulberry32-v1',state:C02_MAX_CHAIN_PROOF.ruleStart};
  makeCheckpoint(staged,route.journal);
  const prepared=new RunController(staged);
  for(const id of warmup)submit(prepared,{type:'PlayHand',selectedIds:[id]});
  submit(prepared,{type:'DiscardHand',selectedIds:[...filler,...incoming]});
  const journal=[...route.journal,...prepared.journal];
  makeCheckpoint(prepared.state,journal);
  return {state:prepared.state,selectedIds,journal};
}
