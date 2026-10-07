import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createRun,type R2RunState,type Action} from '../../src/domain/run';
import {journeySend} from './build-journey';
type Row={action?:Action;before?:R2RunState;after?:R2RunState;shelf?:unknown;stage?:number};
/** Fixed prior route only. Rebuild through legal commands and compare exact archived checkpoints. */
export function straightInvestmentRoute(){
 const report=JSON.parse(gunzipSync(readFileSync('docs/production/evidence/w5-growth-opportunities-2026-10-07/natural-three.json.gz')).toString());
 return report.cases.find((c:{seed:string})=>c.seed==='policy-valid-groups') as {initial:R2RunState;steps:Row[];final:R2RunState};
}
export function straightInvestmentShop(stage:2|4){
 const route=straightInvestmentRoute();let state=createRun({seed:'policy-valid-groups',runId:route.initial.runId,characterId:'erxiang',rulesVersion:'r2',r2Profile:'group-upgrade-v1',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}}) as R2RunState;
 if(JSON.stringify(state)!==JSON.stringify(route.initial))throw Error('original initial identity mismatch');
 for(const row of route.steps){if(!row.action)continue;if(row.before!.phase==='shop'&&row.before!.stageIndex===stage){if(JSON.stringify(state)!==JSON.stringify(row.before))throw Error('exact natural checkpoint mismatch');return state;}state=journeySend(state,row.action);}
 throw Error('missing declared shop');
}
export function straightInvestmentSegment(stage:2|4,investment=false){
 const route=straightInvestmentRoute(),initial=straightInvestmentShop(stage);let state=initial;const ledger:{action:Action;before:R2RunState;after:R2RunState}[]=[];
 const send=(action:Action)=>{const before=state;state=journeySend(state,action);ledger.push({action,before,after:state});};
 if(investment){const id=stage===2?'P05':'f03',offer=[...state.shop!.offers,...state.shop!.toolOffers].find(o=>o.definitionId===id)!;send({type:'BuyOffer',offerId:offer.offerId});if(stage===2)send({type:'UseConsumable',instanceId:state.consumables.find(t=>t.definitionId===id)!.instanceId,targetIds:[]});}
 const start=route.steps.findIndex(row=>row.action&&row.before!.phase==='shop'&&row.before!.stageIndex===stage);
 for(const row of route.steps.slice(start)){if(!row.action)continue;if(state.phase==='stage-cleared'||state.phase==='run-lost'||state.stageIndex!==stage)break;send(row.action);}
 return {initial,ledger,final:state};
}
