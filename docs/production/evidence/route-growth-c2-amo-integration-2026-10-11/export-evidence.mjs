import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
const output=path.dirname(fileURLToPath(import.meta.url));
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const run=await server.ssrLoadModule('/src/domain/run.ts'),domain=await server.ssrLoadModule('/src/domain/r2Run.ts'),launch=await server.ssrLoadModule('/src/game/RunLaunch.ts'),assist=await server.ssrLoadModule('/src/game/AssistRecommendation.ts'),profiles=await server.ssrLoadModule('/src/domain/r2GroupUpgrade.ts'),checkpoint=await server.ssrLoadModule('/src/application/checkpoint.ts');
 const main=['spades-9','hearts-9','clubs-13','diamonds-13'],side=['spades-12','hearts-12','clubs-12'];
 const commands=[];
 const send=(s,action)=>{const command={runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action};const r=run.applyCommand(s,command);assert.equal(r.ok,true,r.code);commands.push(command);return r.state;};
 const arrange=(s,ids)=>{s.handOrder=[...ids,...side,...s.deckInstances.filter(c=>!ids.includes(c.id)&&!side.includes(c.id)).map(c=>c.id)].slice(0,s.stage.handLimit);s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));domain.assertR2Invariants(s);return s;};
 const fixture=(n=4,profile=launch.newRunIdentity('amo','group'))=>{
  let s=run.createRun({rulesVersion:'r2',characterId:'amo',runId:'assist-c2',seed:'assist-c2',r2Identity:{contentVersion:profile.contentVersion,contentHash:profile.contentHash},...(profiles.isR2RouteStarter(profile)?{openingRoute:'group'}:{}),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  s=send(s,{type:'LeaveShop'});s.shop=null;
  if(profiles.isR2RouteGrowth(s))s.routeGrowth={clears:n,G:n,S:n,F:n,settlements:Array.from({length:n},(_,stageIndex)=>({stageIndex,families:['G','S','F']}))};
  s.stageIndex=n;s.chapter=Math.floor(n/3)+1;s.seenBossIds=['B01','B02'].slice(0,s.chapter);s.boss={definitionId:s.seenBossIds.at(-1),disabledSuit:null};
  return arrange(send(s,{type:'EnterStage'}),main);
 };
 const capture=(name,s,ids=main)=>{
  const before=JSON.stringify(s),input=assist.assistPublicInput(s,ids),r=assist.rankAssistOptions(input,true);
  assert.equal(checkpoint.readCheckpoint(checkpoint.makeCheckpoint(s,[])).ok,true);
  const rows=r.options.map(option=>{
   const actual=send(s,option.ids.length?{type:'PlayAssistedHand',selectedIds:ids,assistIds:option.ids}:{type:'PlayHand',selectedIds:ids}),trace=actual.lastTrace;
   assert(BigInt(trace.finalScore)>=BigInt(option.range.minimum)&&BigInt(trace.finalScore)<=BigInt(option.range.maximum));
   if(!r.random)assert.equal(trace.finalScore,option.range.minimum);
   return {option,finalScore:trace.finalScore,handType:trace.handType,routeGrowth:trace.routeGrowth??null,eligible:actual.stage.routeGrowth?.eligible??null,heldIds:trace.sets.heldIds,routeEventIndices:trace.events.flatMap((e,i)=>e.operation==='route-factor'?[i]:[]),amoEventIndex:trace.events.findIndex(e=>e.sourceDefinitionId==='amo'),phase:actual.phase,afterClear:actual.routeGrowth??null};
  });
  assert.equal(JSON.stringify(s),before);
  return {name,identity:{contentVersion:s.contentVersion,contentHash:s.contentHash},input,random:r.random,best:r.best,rows,stateUnchanged:true};
 };
 const cases=[capture('two-pair-G',fixture()),capture('straight-S',arrange(fixture(),['spades-3','hearts-4','clubs-5','diamonds-6','spades-7']),['spades-3','hearts-4','clubs-5','diamonds-6','spades-7']),capture('flush-F',arrange(fixture(),['hearts-2','hearts-5','hearts-8','hearts-10','hearts-13']),['hearts-2','hearts-5','hearts-8','hearts-10','hearts-13']),capture('straight-flush-SF',arrange(fixture(),['hearts-3','hearts-4','hearts-5','hearts-6','hearts-7']),['hearts-3','hearts-4','hearts-5','hearts-6','hearts-7'])];
 const held=fixture();held.jokers=['d01','d08'].map((id,i)=>domain.r2CreateJoker(id,'held/'+i,8,'none',held));held.stage.initialJokerIds=held.jokers.map(j=>j.instanceId);held.deckInstances.find(c=>c.id===side[2]).enhancement='voice-paper';cases.push(capture('held-three-kind-loss',held));
 const random=fixture();random.deckInstances.find(c=>c.id===main[0]).enhancement='lucky-paper';random.jokers=[domain.r2CreateJoker('f08','random/f08',8,'none',random)];random.stage.initialJokerIds=random.jokers.map(j=>j.instanceId);cases.push(capture('public-random',random));
 const legacy=domain.R2_RULESETS.find(p=>p.contentVersion==='quality-r2-basic-suit-choice-v1');cases.push(capture('legacy-before-C2',fixture(0,legacy)));
 fs.writeFileSync(path.join(output,'public-actual-comparisons.json'),JSON.stringify({scope:'seven controlled visible-hand branches; injected legal prior ledger, not natural acquisition or full playthrough',cases,commands},null,2)+'\n');
 console.log(JSON.stringify(cases.map(c=>({name:c.name,best:c.best,random:c.random,options:c.rows.length})),null,2));
} finally {await server.close();}
