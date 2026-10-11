// Bounded original-fixture recovery and real commands, never a seed search or playthrough.
import {createServer} from 'vite';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true},appType:'custom'});
try {
 const [cp,hash,run,domain,launch,chapter]=await Promise.all(['application/checkpoint','domain/hash','domain/run','domain/r2Run','game/RunLaunch','domain/r2Chapter'].map(p=>server.ssrLoadModule('/src/'+p+'.ts')));
 const old=JSON.parse(readFileSync('docs/production/evidence/route-growth-c2-2026-10-11/p2-recovery.json','utf8'));
 const original=old.crossStage.before;
 const edit=(checkpoint,change)=>{const bad=structuredClone(checkpoint);change(bad.state);const {checksum,...payload}=bad;bad.checksum=hash.stableHash(payload);return bad;};
 const snapshot=state=>{const checkpoint=cp.makeCheckpoint(state,[]),read=cp.readCheckpoint(checkpoint);assert.ok(read.ok);return checkpoint;};
 const restore=checkpoint=>{const read=cp.readCheckpoint(checkpoint);assert.ok(read.ok);return read.checkpoint.state;};
 const send=(state,action)=>{const command={runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action},result=run.applyCommand(state,command);assert.ok(result.ok,result.code);return {command,events:result.events,checkpoint:snapshot(result.state)};};
 const checks=[];
 const cardEdit=s=>{const r=s.stage.routeGrowth;r.sources[0].cards.find(c=>c.id==='hearts-3').rank=2;r.handTypes[0]='pair';r.eligible=['G'];};
 for(const [kind,journal] of [['full',original.journal],['empty',[]],['last',[original.journal.at(-1)]]]){
  const baseline=cp.makeCheckpoint(restore(original),journal),forged=edit(baseline,cardEdit),read=cp.readCheckpoint(forged);assert.ok(!read.ok);checks.push({kind,baseline,forged,read});
 }
 const legalClear=send(restore(original),{type:'PlayHand',selectedIds:['spades-3','spades-4','spades-5','spades-6','spades-7']});
 assert.deepEqual(legalClear.checkpoint.state.routeGrowth,{clears:2,G:1,S:1,F:1,settlements:[{stageIndex:0,families:['G']},{stageIndex:1,families:['S','F']}]});
 let state=restore(original);state.consumables=[{instanceId:'rank-tool',definitionId:'T08'}];
 const beforeStageTool=snapshot(state),illegalTarget=run.applyCommand(state,{runId:state.runId,commandId:'unavailable-played-target',expectedSeq:state.commandSeq,action:{type:'UseConsumable',instanceId:'rank-tool',targetIds:['hearts-3']}});
 assert.ok(!illegalTarget.ok&&illegalTarget.code==='unavailable-target');assert.deepEqual(illegalTarget.state,state);
 const stageTool=send(state,{type:'UseConsumable',instanceId:'rank-tool',targetIds:['spades-9']}),stageToolClear=send(stageTool.checkpoint.state,{type:'PlayHand',selectedIds:['spades-3','spades-4','spades-5','spades-6','spades-7']});
 const shopEntry=send(legalClear.checkpoint.state,{type:'OpenShop'});state=shopEntry.checkpoint.state;state.consumables=[{instanceId:'rank-tool',definitionId:'T08'}];
 const beforeShopTool=snapshot(state),shopTool=send(state,{type:'UseConsumable',instanceId:'rank-tool',targetIds:['hearts-3']});
 assert.equal(shopTool.checkpoint.state.deckInstances.find(c=>c.id==='hearts-3').rank,4);assert.equal(shopTool.checkpoint.state.stage.routeGrowth.sources[0].cards.find(c=>c.id==='hearts-3').rank,3);
 state=run.createRun({seed:'route-rule-shop',runId:'rule-shop',characterId:'amo',rulesVersion:'r2',r2Identity:launch.newRunIdentity('amo','group'),openingRoute:'group'});
 state.jokers=[domain.r2CreateJoker('c08','four-straight',4,undefined,state)];state=send(send(state,{type:'LeaveShop'}).checkpoint.state,{type:'EnterStage'}).checkpoint.state;
 const selectedIds=['spades-2','hearts-3','clubs-4','diamonds-5'];
 const arrange=state=>{const available=state.deckInstances.filter(c=>!state.playedPile.includes(c.id)&&!state.discardPile.includes(c.id)&&!state.destroyedIds.includes(c.id));state.handOrder=[...selectedIds,...available.filter(c=>!selectedIds.includes(c.id)).slice(0,state.stage.handLimit-selectedIds.length).map(c=>c.id)];state.drawPile=available.map(c=>c.id).filter(id=>!state.handOrder.includes(id));state.stage.disabledIds=state.stage.boss?chapter.r2DisabledCards(state.stage.boss,state.stageIndex,state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id))):[];domain.assertR2Invariants(state);return state;};
 const beforeRuleHand=snapshot(arrange(state)),ruleClear=send(state,{type:'PlayHand',selectedIds});assert.equal(ruleClear.checkpoint.state.lastTrace.handType,'straight');assert.equal(ruleClear.checkpoint.state.phase,'stage-cleared');
 const ruleShop=send(ruleClear.checkpoint.state,{type:'OpenShop'}),ruleSale=send(ruleShop.checkpoint.state,{type:'SellJoker',instanceId:'four-straight'});
 const ruleNextEntry=send(send(ruleSale.checkpoint.state,{type:'LeaveShop'}).checkpoint.state,{type:'EnterStage'}),nextRuleHand=send(arrange(ruleNextEntry.checkpoint.state),{type:'PlayHand',selectedIds});
 assert.equal(nextRuleHand.checkpoint.state.lastTrace.handType,'high-card');assert.deepEqual(nextRuleHand.checkpoint.state.stage.routeGrowth.sources[0].rules,{fourStraight:false,fourFlush:false});
 const legacyAnomalies=[];
 for(const [label,before,change] of [['original411',old.before,s=>{s.stage.routeGrowth.handTypes[0]='flush';s.stage.routeGrowth.eligible=['F'];}],['oldSource',original,s=>{s.stage.routeGrowth.sources[0]=structuredClone(old.crossStage.oldSource);s.stage.routeGrowth.handTypes[0]='pair';s.stage.routeGrowth.eligible=['G'];}],['oldEntry',original,s=>{s.stage.routeGrowth.sources[0]=structuredClone(old.crossStage.oldSource);s.stage.routeGrowth.handTypes[0]='pair';s.stage.routeGrowth.eligible=['G'];s.stage.routeGrowth.entry=structuredClone(old.crossStage.oldEntry);}]]){
  for(const [kind,journal] of [['full',before.journal],['empty',[]],['last',[before.journal.at(-1)]]]){const baseline=cp.makeCheckpoint(restore(before),journal),read=cp.readCheckpoint(edit(baseline,change));assert.ok(!read.ok);legacyAnomalies.push({label,kind,read});}
 }
 const summary={status:'PASS',identity:launch.newRunIdentity('amo','group'),newCardFactAnomaliesRejected:checks.length,legacyAnomaliesRejected:legacyAnomalies.length,legitimateNextClear:legalClear.checkpoint.state.routeGrowth,stageUnplayedRank:stageTool.checkpoint.state.deckInstances.find(c=>c.id==='spades-9').rank,stagePlayedTargetRejected:illegalTarget.code,shopOldSourceRank:3,shopActualDeckRank:4,oldRuleSourcePreservedAfterSale:ruleSale.checkpoint.state.stage.routeGrowth.sources[0].rules,nextStageActualRules:nextRuleHand.checkpoint.state.stage.routeGrowth.sources[0].rules,sourceFieldsAdded:false,mathematicsOrIdentityChanged:false};
 const evidence={kind:'bounded-author-software-evidence-not-independent-or-natural-acquisition',summary,checks,legalClear,beforeStageTool,illegalTarget,stageTool,stageToolClear,shopEntry,beforeShopTool,shopTool,beforeRuleHand,ruleClear,ruleShop,ruleSale,ruleNextEntry,nextRuleHand,legacyAnomalies};
 writeFileSync('docs/production/evidence/route-growth-c2-p2-card-facts-2026-10-11/after-fix-evidence.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
}finally{await server.close();}
