import assert from 'node:assert/strict';
import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='/workspace/dachoupai',out='/tmp/w5-one-window';await mkdir(out,{recursive:true});
const head=()=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),status=()=>execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'});
const before={head:head(),status:status()},bytes=await readFile(root+'/docs/production/evidence/w5-natural-flush-midgame-2026-10-09/report.json.gz'),original=JSON.parse(gunzipSync(bytes));
// One predeclared existing shop: first open stageIndex4, chosen for public affordable discovered upgrade, not for future score.
const start=original.transactions.findIndex(t=>t.after.phase==='shop'&&t.after.stageIndex===4&&t.commands.some(c=>c.action.type==='OpenShop'));assert.ok(start>=0);
const initial=original.transactions[start].after;assert.equal(initial.commandSeq,33);assert.equal(initial.gold,29);assert.equal(initial.handLevels.flush,2);
const window=[];for(const t of original.transactions.slice(start+1)){if(t.commands.some(c=>c.action.type==='OpenShop'))break;window.push(t);if(t.after.phase==='stage-cleared')break;}assert.equal(window.at(-1).after.phase,'stage-cleared');
const v=await createServer({root,logLevel:'error'});const {applyCommand}=await v.ssrLoadModule('/src/domain/run.ts');const {readCheckpoint,makeCheckpoint}=await v.ssrLoadModule('/src/application/checkpoint.ts');
const publicHand=s=>s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id));
const report={source:before.head,scope:'ONE existing seq33 stageIndex4 shop; same29gold budget; A is original actually occurred upgrade, B is a headless counterfactual leave-cash branch. No new natural run, future-card selection, seed search, browser, tests or CI. Fixed same public actions isolate the upgrade, not optimal strategy.',origin:{path:'docs/production/evidence/w5-natural-flush-midgame-2026-10-09/report.json.gz',sha256:createHash('sha256').update(bytes).digest('hex'),runId:initial.runId,seed:initial.seed,contentVersion:initial.contentVersion,contentHash:initial.contentHash},publicShop:{gold:initial.gold,levels:initial.handLevels,jokers:initial.jokers,shop:initial.shop,liveDeckCounts:initial.deckInstances.filter(c=>!initial.destroyedIds.includes(c.id)).reduce((a,c)=>(a[c.suit]=(a[c.suit]??0)+1,a),{})},decisions:{A:'Buy actual available P064gold and use discovered flush2→3;25gold leaves current capped interest5. Does not guarantee a flush.',B:'Do not buy/use P06; retain29gold and flushLv2. Same observed public discard/play choices when revealed, no alternative hand optimizer.'},steps:[]};
let a=initial,b=structuredClone(initial),bCommands=[];
try{
 for(const t of window){
  for(const cmd of t.commands){
   const battle=['DiscardHand','PlayHand'].includes(cmd.action.type);if(battle){assert.deepEqual(publicHand(a),publicHand(b));assert.ok(cmd.action.selectedIds.every(id=>a.handOrder.includes(id)&&b.handOrder.includes(id)));}
   const ar=applyCommand(a,cmd);assert.ok(ar.ok,JSON.stringify(ar));a=ar.state;
   const skip=['BuyOffer','UseConsumable'].includes(cmd.action.type);assert.ok(!skip||cmd.action.type==='BuyOffer'&&initial.shop.toolOffers.find(o=>o.offerId===cmd.action.offerId)?.definitionId==='P06'||cmd.action.type==='UseConsumable');
   if(!skip){const bc={runId:b.runId,commandId:b.runId+'/counterfactual-cash/'+(b.commandSeq+1),expectedSeq:b.commandSeq,action:structuredClone(cmd.action)},br=applyCommand(b,bc);assert.ok(br.ok,JSON.stringify(br));b=br.state;bCommands.push(bc);}
   assert.deepEqual(a.rng,b.rng);report.steps.push({type:cmd.action.type,action:cmd.action,Bskipped:skip,samePublicHandBeforeBattle:battle||undefined,A:{seq:a.commandSeq,gold:a.gold,phase:a.phase,heat:a.stage?.heat,score:a.lastTrace?.finalScore,type:a.lastTrace?.handType,hands:a.stage?.handsLeft,discards:a.stage?.discardsLeft},B:{seq:b.commandSeq,gold:b.gold,phase:b.phase,heat:b.stage?.heat,score:b.lastTrace?.finalScore,type:b.lastTrace?.handType,hands:b.stage?.handsLeft,discards:b.stage?.discardsLeft}});
  }
  assert.deepEqual(a,t.after);
 }
 const summarize=s=>({gold:s.gold,phase:s.phase,stageHeat:s.stage.heat,stageTarget:s.stage.targetHeat,handsLeft:s.stage.handsLeft,discardsLeft:s.stage.discardsLeft,goldEarned:s.stage.goldEarned,flushLevel:s.handLevels.flush,c06:s.jokers.find(j=>j.definitionId==='c06').growth,finalHand:{type:s.lastTrace.handType,H:s.lastTrace.accumulator.H,M:s.lastTrace.accumulator.M,score:s.lastTrace.finalScore}});
 report.outcomes={A:summarize(a),B:summarize(b)};assert.equal(a.phase,'stage-cleared');assert.equal(b.phase,'stage-cleared');
 const prefix=original.transactions.slice(0,start+1).flatMap(t=>t.commands);const cp=makeCheckpoint(b,[...prefix,...bCommands]);assert.ok(readCheckpoint(cp).ok);report.Bcheckpoint=cp;report.AoriginalEveryTransactionFullEqual=true;report.allBattlePublicHandsEqual=true;report.allRngEqual=true;
 report.after={head:head(),status:status()};assert.deepEqual(report.after,before);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);report.stack=e.stack;process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,outcomes:report.outcomes,steps:report.steps.length}));await v.close();}
