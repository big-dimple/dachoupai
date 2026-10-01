/** Fixed small diagnostic cohort; selected representative wins are never the denominator. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'vite';
const root=process.cwd(),dir=path.resolve(process.env.V00_SAMPLE_DIR||'shots/v00-sample');fs.mkdirSync(dir,{recursive:true});
const count=Number(process.env.V00_SAMPLE_COUNT||20);assert.ok(Number.isInteger(count)&&count>0&&count<=100);
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const report={testedCommit:git('rev-parse','HEAD'),dirtyState:git('status','--porcelain=v1'),cohort:{seeds:Array.from({length:count},(_,i)=>'v00-sample-'+String(i).padStart(3,'0')),characters:['amo','erxiang'],styles:['single-held','groups','suit']},runs:[],representatives:[],limitations:['Small deterministic public-information policy diagnosis, not a target balance win rate or human experience approval.','Full B00 18,000-run training/holdout protocol NOT_RUN.','Physical device and human/art acceptance NOT_RUN.']};
const server=await createServer({root,cacheDir:path.join(root,'shots/v00-sample-cache'),optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false},appType:'custom'});
const preferred={ 'single-held':t=>t.ids.length===1,groups:t=>['pair','two-pair','three-kind','full-house','four-kind','five-kind'].includes(t.handType),suit:t=>['straight','flush','straight-flush','flush-house','flush-five'].includes(t.handType)};
const sources={'single-held':['a05','pengci','a03','d01','tiesuanpan','d03'],groups:['b03','mantangcai','b02','b04'],suit:['c06','c04','jiedongfeng','c02']};
try{
  const domain=await server.ssrLoadModule('/src/domain/run.ts'),{publicR2View}=await server.ssrLoadModule('/src/testing/r2Bot.ts'),{chooseV00Action}=await server.ssrLoadModule('/src/testing/v00Bot.ts');
  for(const style of report.cohort.styles)for(const characterId of report.cohort.characters)for(const seed of report.cohort.seeds){
    const runId=[style,characterId,seed].join('/');let state=domain.createRun({runId,seed,characterId,rulesVersion:'r2'});const journal=[],plays=[],transactions=[],commands={};let lastShop=null;
    for(let step=0;step<160;step++){
      const action=chooseV00Action(publicR2View(state),style);if(!action)break;const command={runId,commandId:'natural-'+step,expectedSeq:state.commandSeq,action},before=state;
      const result=domain.applyCommand(state,command);assert.ok(result.ok,`${runId} ${action.type}: ${result.code}`);state=result.state;journal.push(command);commands[action.type]=(commands[action.type]||0)+1;
      if(action.type==='LeaveShop')lastShop={stage:before.stageIndex,gold:before.gold,build:before.jokers.map(j=>j.definitionId),unboughtOffers:publicR2View(before).offers.map(o=>({id:o.definitionId,price:o.price,affordable:o.price<=before.gold}))};
      if(action.type==='PlayHand'){const trace=state.lastTrace;plays.push({stage:before.stageIndex,index:trace.rootId,ids:trace.sets.playedIds,handType:trace.handType,score:trace.finalScore,heat:state.stage.heat,target:state.stage.targetHeat,goldBefore:before.gold,remainingHands:state.stage.handsLeft,discardsUsed:state.stage.discardsUsed,build:before.jokers.map(j=>({id:j.definitionId,growth:j.growth})),triggered:trace.events.filter(e=>e.sourceType==='joker').map(e=>({id:e.sourceDefinitionId,phase:e.phase,operation:e.operation,value:e.value})),boss:before.stageIndex%3===2?before.boss:null});}
      if(['BuyOffer','SellJoker','RerollShop','ReorderJokers','UseConsumable'].includes(action.type))transactions.push({seq:state.commandSeq,stage:before.stageIndex,action,goldBefore:before.gold,goldAfter:state.gold,build:state.jokers.map(j=>j.definitionId),events:result.events});
    }
    assert.ok(['run-won','run-lost'].includes(state.phase),'policy terminates within ordinary command budget');
    const familyHands=plays.filter(preferred[style]).length,familyTriggers=plays.flatMap(p=>p.triggered).filter(t=>sources[style].includes(t.id)).length;
    const last=plays.at(-1),record={seed,characterId,style,outcome:state.phase,reason:state.outcome?.reason,deathStage:state.phase==='run-lost'?state.stageIndex:null,stageIndex:state.stageIndex,heat:state.stage.heat,target:state.stage.targetHeat,shortfall:state.phase==='run-lost'?(BigInt(state.stage.targetHeat)-BigInt(state.stage.heat)).toString():'0',gold:state.gold,handsLeft:state.stage.handsLeft,discardsLeft:state.stage.discardsLeft,discardsUsed:state.stage.discardsUsed,build:state.jokers.map(j=>j.definitionId),commands,handTypes:plays.reduce((map,p)=>({...map,[p.handType]:(map[p.handType]||0)+1}),{}),familyHands,familyTriggers,lastShop,diagnostic:{lastHandType:last.handType,lastHandScore:last.score,lastHandFamilySources:last.triggered.filter(t=>sources[style].includes(t.id)).map(t=>t.id),unusedDiscards:state.stage.discardsLeft,unspentGold:state.gold,emptyJokerSlots:5-state.jokers.length,boss:state.stage.index%3===2?state.boss:null},stateHash:domain.stateHash(state)};
    report.runs.push(record);
    if(state.phase==='run-won'&&characterId===(style==='single-held'?'amo':'erxiang')&&familyHands>=3&&familyTriggers>0&&!report.representatives.some(r=>r.style===style)){
      let replay=domain.createRun({seed,characterId,runId,rulesVersion:'r2'});for(const command of journal){const r=domain.applyCommand(replay,command);assert.ok(r.ok);replay=r.state;}assert.deepEqual(replay,state,'representative exact replay');
      report.representatives.push({style,seed,characterId,selection:'First qualifying win in this fixed cohort; >=3 style hands and an actual family trigger. Selected wins are illustrative, not a win-rate sample.',journal,plays,transactions,finalState:state,stateHash:record.stateHash});
    }
    console.log(`${style}/${characterId}/${seed}: ${state.phase} stage=${state.stageIndex} gold=${state.gold} hands=${familyHands}/${plays.length} sources=${familyTriggers}`);
  }
  report.summary=report.cohort.styles.flatMap(style=>report.cohort.characters.map(characterId=>{const runs=report.runs.filter(r=>r.style===style&&r.characterId===characterId);return {style,characterId,total:runs.length,wins:runs.filter(r=>r.outcome==='run-won').length,deathStages:runs.filter(r=>r.outcome==='run-lost').reduce((m,r)=>({...m,[r.deathStage]:(m[r.deathStage]||0)+1}),{}),averageRemainingGold:runs.reduce((n,r)=>n+r.gold,0)/runs.length,unusedDiscardsAtDeath:runs.filter(r=>r.outcome==='run-lost').filter(r=>r.discardsLeft>0).length,allFiveSlots:runs.filter(r=>r.build.length===5).length};}));
  assert.equal(report.representatives.length,3,'three genuinely different natural strategies need actual representative wins');report.status='PASS';console.log(JSON.stringify(report.summary,null,2));
}catch(error){report.status='FAIL';report.error=String(error);console.error(error);process.exitCode=1;}
finally{await server.close();fs.writeFileSync(path.join(dir,'natural-report.json'),JSON.stringify(report,null,2)+'\n');console.log('public graybox cohort: '+report.status+'; runs='+report.runs.length);}
