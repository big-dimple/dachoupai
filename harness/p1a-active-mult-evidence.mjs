import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
const out=process.env.P1A_EVIDENCE??'/tmp/p1a-active-mult-evidence';await mkdir(out,{recursive:true});
const current=await createServer({cacheDir:'/tmp/p1a-export-current',server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'}),base=await createServer({root:'/tmp/dachoupai-p1a-baseline',cacheDir:'/tmp/p1a-export-base',server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
const load=(s,p)=>s.ssrLoadModule(p),digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const report={scope:'bounded actual scorer and saved domain commands, never natural play; baseline dc985f6, plan85050358',status:'RUNNING',scores:[],fourGrid:[],costs:[],windows:[],business:[],nonlinear:[],legacy:[]};
try{
 const f=await load(current,'/tests/fixtures/p1a-active-mult.ts'),tf=await load(current,'/tests/fixtures/touye-new-core.ts'),sc=await load(current,'/src/domain/scoreR2.ts'),run=await load(current,'/src/domain/run.ts'),domain=await load(current,'/src/domain/r2Run.ts'),cp=await load(current,'/src/application/checkpoint.ts'),identity=await load(current,'/src/domain/r2GroupUpgrade.ts'),w=await load(current,'/src/domain/r2TouyeWager.ts'),save=await load(current,'/src/application/SavedRun.ts'),launch=await load(current,'/src/game/RunLaunch.ts');
 const br=await load(base,'/src/domain/run.ts'),bd=await load(base,'/src/domain/r2Run.ts'),bc=await load(base,'/src/application/checkpoint.ts'),bl=await load(base,'/src/game/RunLaunch.ts'),bs=await load(base,'/src/application/SavedRun.ts');
 const late=i=>sc.scoreR2Hand({...i,activeMultTiming:'after-route-growth'});
 const retryEvidence=async(Class,checkpoint,action)=>{
  let slots={revision:1,current:checkpoint,previous:null},fail=true;const writes=[];
  const store={read:async()=>slots,commit:async(rev,cp,previous)=>{writes.push(JSON.stringify(cp));if(fail)throw Error('controlled quota');slots={revision:rev+1,current:cp,previous};return slots.revision;}};
  const saved=Class.restore(store,slots),before=JSON.stringify(saved.state),failed=await saved.dispatch(action);assert.equal(failed.ok,false);assert.equal(JSON.stringify(saved.state),before);assert.deepEqual(slots.current,checkpoint);fail=false;
  const success=await saved.retry();assert.equal(success.ok,true);assert.equal(writes[0],writes[1]);assert.equal(JSON.stringify(Class.restore(store,slots).state),JSON.stringify(saved.state));return {failed,success,slots,candidateSha256:createHash('sha256').update(writes[0]).digest('hex'),retryByteExact:true,coldRestoreExact:true};
 };

 for(const [name,i] of [['G14',f.g14Input()],['G15',f.g15Input()],['G18-won-reconstructed',f.g18Input()],['G18-lost-reconstructed',f.g18Input('straight')]]){
  const before=sc.scoreR2Hand(i),after=late(i),ordinary=late(name.startsWith('G18')?{...i,touyeWager:{commit:null}}:{...i,gold:i.xiemuBurn.goldBefore,xiemuBurn:{cost:0,goldBefore:i.xiemuBurn.goldBefore,beforeUsed:false}});
  report.scores.push({name,input:i,before,after,unused:ordinary,publicPreview:sc.previewR2Hand({...i,activeMultTiming:'after-route-growth'})});
 }
 // Same public hand, same real discard, qualification changes only core rule and timing only clock.
 for(const scenario of ['unformed-win','unformed-disabled','unformed-target-miss']){
  const x=tf.touyeFixture(scenario==='unformed-target-miss'?'unformed-win':scenario,{identity:f.activeIdentity,jokers:['c06','jiedongfeng']});if(scenario==='unformed-target-miss')x.play=['hearts-5'];x.state.jokers.find(j=>j.definitionId==='c06').growth.multiplier={n:'6',d:'1'};assert.equal(cp.readCheckpoint(cp.makeCheckpoint(x.state,[])).ok,true);const s=tf.touyeSend(x.state,tf.touyeBet(x.state,x.discard,x.target));
  const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)),i={rulesVersion:'r2',runId:s.runId,rootId:'same/four-grid',hand,selectedIds:x.play,disabledIds:s.stage.disabledIds,jokers:s.jokers,definitions:(await load(current,'/src/domain/r2ContentProfiles.ts')).r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:1,handsBeforePlay:s.stage.handsLeft,previousHandType:null,wager:false,rng:s.rng.rule,...domain.r2ScoreContext(s,hand,x.play)},commit=structuredClone(i.touyeWager.commit);delete commit.refill;
  const original={...i,activeMultTiming:undefined,touyeWager:{commit}},qual={...i,activeMultTiming:undefined},timing={...original,activeMultTiming:'after-route-growth'},combined=i;
  const unbet=tf.touyeSend(x.state,{type:'DiscardHand',selectedIds:x.discard}),unusedRun=tf.touyeSend(unbet,{type:'PlayHand',selectedIds:x.play});assert.equal(cp.readCheckpoint(cp.makeCheckpoint(unusedRun,[])).ok,true);
  report.fourGrid.push({scenario,before:cp.makeCheckpoint(x.state,[]),pending:cp.makeCheckpoint(s,[tf.touyeCommand(x.state,tf.touyeBet(x.state,x.discard,x.target))]),unusedReal:cp.makeCheckpoint(unusedRun,[tf.touyeCommand(x.state,{type:'DiscardHand',selectedIds:x.discard}),tf.touyeCommand(unbet,{type:'PlayHand',selectedIds:x.play})]),input:i,original:sc.scoreR2Hand(original),qualificationOnly:sc.scoreR2Hand(qual),timingOnly:sc.scoreR2Hand(timing),combined:sc.scoreR2Hand(combined),unused:sc.scoreR2Hand({...i,touyeWager:{commit:null,newCore:true}}),paidDiscard:s.stage.discardsUsed,goldBefore:x.state.gold,goldAfter:s.gold});
 }
 for(const gold of [39,40,49,50,59,60]){
  const x=f.activeRunFixture('xiemu',gold),a=tf.touyeSend(x.state,x.action),hold=tf.touyeSend(x.state,{type:'PlayHand',selectedIds:x.state.handOrder});
  assert.equal(cp.readCheckpoint(cp.makeCheckpoint(a,[])).ok,true);report.costs.push({gold,before:cp.makeCheckpoint(x.state,[]),action:x.action,used:cp.makeCheckpoint(a,[tf.touyeCommand(x.state,x.action)]),unused:cp.makeCheckpoint(hold,[tf.touyeCommand(x.state,{type:'PlayHand',selectedIds:x.state.handOrder})])});
 }
 for(const [hero,stageIndex] of [['xiemu',12],['azao',4]]){
  const x=f.activeRunFixture(hero,60,stageIndex),used=tf.touyeSend(x.state,x.action),unused=tf.touyeSend(x.state,{type:'PlayHand',selectedIds:x.state.handOrder});
  assert.equal(used.phase,'stage-cleared');assert.equal(unused.phase,'await-input');assert.equal(cp.readCheckpoint(cp.makeCheckpoint(used,[])).ok,true);assert.equal(cp.readCheckpoint(cp.makeCheckpoint(unused,[])).ok,true);
  report.windows.push({hero,stageIndex,before:cp.makeCheckpoint(x.state,[]),used:cp.makeCheckpoint(used,[tf.touyeCommand(x.state,x.action)]),unused:cp.makeCheckpoint(unused,[tf.touyeCommand(x.state,{type:'PlayHand',selectedIds:x.state.handOrder})])});
 }
 const wagerFixture=tf.touyeFixture('mature-win',{identity:f.activeIdentity}),paid=tf.touyeSend(wagerFixture.state,tf.touyeBet(wagerFixture.state,wagerFixture.discard,wagerFixture.target)),wagerUsed=tf.touyeSend(paid,{type:'PlayHand',selectedIds:wagerFixture.play}),normalDiscard=tf.touyeSend(wagerFixture.state,{type:'DiscardHand',selectedIds:wagerFixture.discard}),wagerUnused=tf.touyeSend(normalDiscard,{type:'PlayHand',selectedIds:wagerFixture.play});
 assert.equal(wagerUsed.lastTrace.finalScore,'412');assert.equal(wagerUnused.lastTrace.finalScore,'236');assert.equal(cp.readCheckpoint(cp.makeCheckpoint(wagerUsed,[])).ok,true);assert.equal(cp.readCheckpoint(cp.makeCheckpoint(wagerUnused,[])).ok,true);report.windows.push({hero:'touye',stageIndex:0,before:cp.makeCheckpoint(wagerFixture.state,[]),pending:cp.makeCheckpoint(paid,[]),used:cp.makeCheckpoint(wagerUsed,[]),unused:cp.makeCheckpoint(wagerUnused,[])});
 const g17=f.g17Input(),g17Replacement={...g17,jokers:g17.jokers.map(j=>j.definitionId==='d11'?f.activeJoker('f03'):j)};
 const mirror={...f.g14Input(),jokers:f.g14Input().jokers.map(j=>j.definitionId==='e10'?f.activeJoker('d07'):j),gold:158,xiemuBurn:{cost:30,goldBefore:188,beforeUsed:false}};
 for(const [id,replacement,inputBefore,inputAfter] of [['d11','f03',g17,g17Replacement],['e10','d07',f.g14Input(),mirror]]){
  const x=f.activeSwapFixture(id,replacement),sold=tf.touyeSend(x.state,x.sell),bought=tf.touyeSend(sold,x.buy);for(const s of [x.state,sold,bought])assert.equal(cp.readCheckpoint(cp.makeCheckpoint(s,[])).ok,true);
  report.business.push({scope:'controlled original price transaction and reconstructed terminal scorer; never naturally executed replacement',id,replacement,before:cp.makeCheckpoint(x.state,[]),sold:cp.makeCheckpoint(sold,[tf.touyeCommand(x.state,x.sell)]),bought:cp.makeCheckpoint(bought,[tf.touyeCommand(x.state,x.sell),tf.touyeCommand(sold,x.buy)]),inputBefore,inputAfter,scoreBefore:late(inputBefore),scoreAfter:late(inputAfter),...(id==='e10'?{earlyThreeLostUpgrades:late({...mirror,handLevels:{straight:16}})}:{})});
 }
 for(const identity of [f.routeIdentity,f.activeIdentity]){
  const x=f.activeRefundFixture(identity),result=tf.touyeSend(x.state,x.action);assert.equal(cp.readCheckpoint(cp.makeCheckpoint(result,[])).ok,true);report.nonlinear.push({identity,before:cp.makeCheckpoint(x.state,[]),after:cp.makeCheckpoint(result,[tf.touyeCommand(x.state,x.action)]),refund:result.lastTrace.events.filter(e=>e.operation==='refund-hand')});
 }
 const newSaved=report.costs[0].used;report.rollback={oldCodeCanReadCandidate:bc.readCheckpoint(newSaved),candidateCanRead:cp.readCheckpoint(newSaved).ok,policy:'retain candidate readers and timing contract, pause its new launches; never remove candidate identity or migrate/drop saves'};assert.equal(report.rollback.oldCodeCanReadCandidate.ok,false);assert.equal(report.rollback.candidateCanRead,true);
 // Every old profile, every supported hero, complete command results and checkpoint bytes.
 for(const profile of bd.R2_RULESETS){
  assert.deepEqual(domain.r2RulesetFor(profile),profile);
  const id={contentVersion:profile.contentVersion,contentHash:profile.contentHash};
  for(const hero of ['amo','touye','xiemu','azao','erxiang','laohuan']){
   const opts={rulesVersion:'r2',characterId:hero,seed:'p1a-legacy-fixed',runId:'p1a/legacy/'+hero,r2Identity:id,...(identity.isR2RouteStarter(id)?{openingRoute:'group'}:{}),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}};
   let a,b;try{a=br.createRun(opts);}catch{continue;}b=run.createRun(opts);assert.equal(JSON.stringify(a),JSON.stringify(b));const commands=[];
   const dispatch=action=>{const c=tf.touyeCommand(b,action),old=br.applyCommand(a,c),now=run.applyCommand(b,c);assert.equal(old.ok,true,old.code);assert.equal(JSON.stringify(now),JSON.stringify(old));a=old.state;b=now.state;commands.push(c);};
   dispatch({type:'LeaveShop'});dispatch({type:'EnterStage'});
   const main=['hearts-4','hearts-6','hearts-8','hearts-10','hearts-12'];a=f.arrangeActiveRun(a,main);b=f.arrangeActiveRun(b,main);a.gold=35;b.gold=35;
   const action={type:'PlayHand',selectedIds:main,...(hero==='xiemu'&&(await load(current,'/src/domain/r2XiemuBurn.ts')).usesXiemuBurn(b)?{xiemuBurn:10}:{})};
   const retryOld=await retryEvidence(bs.SavedRun,bc.makeCheckpoint(a,commands),action),retryNew=await retryEvidence(save.SavedRun,cp.makeCheckpoint(b,commands),action);assert.equal(JSON.stringify(retryOld),JSON.stringify(retryNew));
   dispatch(action);
   const old=bc.makeCheckpoint(a,commands),now=cp.makeCheckpoint(b,commands);assert.equal(JSON.stringify(now),JSON.stringify(old));assert.equal(cp.readCheckpoint(now).ok,true);assert.deepEqual(launch.launchIdentity(hero,{kind:'retry',run:b}),bl.launchIdentity(hero,{kind:'retry',run:a}));
   const duplicate=run.applyCommand(b,commands.at(-1)),baseDuplicate=br.applyCommand(a,commands.at(-1));assert.equal(JSON.stringify(duplicate),JSON.stringify(baseDuplicate));
   report.legacy.push({identity:id,hero,commands,finalScore:b.lastTrace.finalScore,checkpointSha256:digest(old),candidateSha256:digest(now),completeStateEventTraceReceiptRngCheckpointByteExact:true,retryIdentityExact:true,duplicateExact:true,failedSavePublicationExact:true,retryCandidateByteExact:true,coldRestoreExact:true,saveCandidateSha256:retryOld.candidateSha256});
  }
  if(w.usesTouyeWager({characterId:'touye',...id}))for(const scenario of ['unformed-win','target-miss']){
   const x=tf.touyeFixture('unformed-win',{identity:id,jokers:['c06','jiedongfeng']});if(scenario==='target-miss')x.play=['hearts-5'];const bet=tf.touyeCommand(x.state,tf.touyeBet(x.state,x.discard,x.target)),a=br.applyCommand(x.state,bet),b=run.applyCommand(x.state,bet);assert.equal(JSON.stringify(a),JSON.stringify(b));assert.equal(a.ok,true);assert.equal(JSON.stringify(bc.makeCheckpoint(a.state,[bet])),JSON.stringify(cp.makeCheckpoint(b.state,[bet])));
   const play=tf.touyeCommand(b.state,{type:'PlayHand',selectedIds:x.play}),old=br.applyCommand(a.state,play),now=run.applyCommand(b.state,play);assert.equal(JSON.stringify(old),JSON.stringify(now));assert.equal(now.ok,true);const oc=bc.makeCheckpoint(old.state,[bet,play]),nc=cp.makeCheckpoint(now.state,[bet,play]);assert.equal(JSON.stringify(oc),JSON.stringify(nc));
   report.legacy.push({identity:id,hero:'touye',scenario,commands:[bet,play],outcome:now.state.lastTrace.touyeWager.outcome,checkpointSha256:digest(oc),candidateSha256:digest(nc),completeStateEventTraceReceiptRngCheckpointByteExact:true,pendingCheckpointByteExact:true});
  }
 }
 report.identity=f.activeIdentity;report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}finally{await current.close();await base.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,identity:report.identity,scores:report.scores.map(x=>({name:x.name,before:x.before.finalScore,after:x.after.finalScore,unused:x.unused.finalScore})),fourGrid:report.fourGrid.map(x=>({scenario:x.scenario,original:x.original.finalScore,qualificationOnly:x.qualificationOnly.finalScore,timingOnly:x.timingOnly.finalScore,combined:x.combined.finalScore,unused:x.unused.finalScore})),legacy:report.legacy.length,error:report.error}));}
