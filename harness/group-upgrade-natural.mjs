/** Bounded natural candidates, not a strategy simulation or balance test. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {snapshotSource} from '../scripts/check-runner.mjs';
const out='shots/group-upgrade-natural';await mkdir(out,{recursive:true});const before=snapshotSource(process.cwd());
const server=await createServer({server:{host:'127.0.0.1',port:5344,strictPort:true},appType:'custom',logLevel:'error'});server.middlewares.use((req,res,next)=>{if(req.url==='/natural-proof')res.end('<!doctype html><title>Bounded natural group candidates</title>');else next();});await server.listen();
let browser;const report={before,limits:{seeds:24,profiles:2,routeSeedsMaximum:4,stageMaximum:1,actionsPerRouteMaximum:9},limitations:['Actual generated shops/decks and actual commands; no fixture injection, score prediction, future-deck or RNG inspection.','A fixed public classification policy is only a reproducible candidate, not optimal play or balance evidence.','Same seed does not align shop draws after b10 weight changes. Baseline routes classify their own visible hand.','No UI or physical-device acceptance. Missing acquisition or route transition remains NOT_OBSERVED.']};
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu']});const page=await browser.newPage();await page.goto('http://127.0.0.1:5344/natural-proof');
 const result=await page.evaluate(async()=>{
  const {createRun,applyCommand}=await import('/src/domain/run.ts'),{r2SelectionFacts}=await import('/src/domain/r2SelectionFacts.ts'),{r2JokerDefinitionsFor}=await import('/src/domain/r2ContentProfiles.ts'),{makeCheckpoint,readCheckpoint}=await import('/src/application/checkpoint.ts'),{stableHash}=await import('/src/domain/hash.ts');
  const profiles=['group-upgrade-v1','combo-growth-v1'],targets=['b03','b10','b08','b06'];
  const start=(seed,profile)=>createRun({seed,runId:`natural/${seed}/${profile}`,characterId:'erxiang',rulesVersion:'r2',r2Profile:profile});
  const scan=[];for(let i=0;i<24;i++){const seed=`group-natural-${i}`;scan.push({seed,profiles:profiles.map(profile=>{const s=start(seed,profile);return{profile,identity:[s.contentVersion,s.contentHash],gold:s.gold,offers:s.shop.offers};})});}
  const candidates=targets.map(id=>({id,entry:scan.find(row=>row.profiles[0].offers.some(o=>o.definitionId===id&&o.price<=row.profiles[0].gold))}));
  const selected=[...new Set(candidates.flatMap(c=>c.entry?[c.entry.seed]:[]))].slice(0,4),routes=[];
  for(const seed of selected)for(const profile of profiles){let s=start(seed,profile);const initial=makeCheckpoint(s,[]),commands=[],steps=[];
   const send=action=>{const command={runId:s.runId,commandId:`natural/${s.commandSeq+1}`,expectedSeq:s.commandSeq,action},r=applyCommand(s,command);if(!r.ok)throw Error(r.code);s=r.state;commands.push(command);makeCheckpoint(s,commands);steps.push({action,seq:s.commandSeq,phase:s.phase,visible:s.handOrder.map(id=>{const c=s.deckInstances.find(c=>c.id===id);return{id,rank:c.rank,suit:c.suit};}),handType:s.lastTrace?.handType??null,score:s.lastTrace?.finalScore??null,gold:s.gold,growth:s.jokers.map(j=>({id:j.definitionId,growth:j.growth})),stateHash:stableHash(s)});};
   const offer=targets.flatMap(id=>s.shop.offers.filter(o=>o.definitionId===id&&o.price<=s.gold))[0];if(offer)send({type:'BuyOffer',offerId:offer.offerId});send({type:'LeaveShop'});send({type:'EnterStage'});
   const priority=['flush-five','flush-house','five-kind','straight-flush','four-kind','full-house','three-kind','two-pair','flush','straight','pair','high-card'];
   while(s.phase==='await-input'&&commands.length<9){const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)),definitions=r2JokerDefinitionsFor(s),choices=[],chosen=[];
    const visit=start=>{if(chosen.length){const facts=r2SelectionFacts({hand,selectedIds:chosen.map(c=>c.id),jokers:s.jokers,definitions,disabledIds:s.stage.disabledIds});choices.push({ids:[...facts.playedIds],type:facts.type,priority:priority.indexOf(facts.type),rank:chosen.reduce((sum,c)=>sum+c.rank,0)});}if(chosen.length===5)return;for(let i=start;i<hand.length;i++){chosen.push(hand[i]);visit(i+1);chosen.pop();}};visit(0);
    choices.sort((a,b)=>a.priority-b.priority||a.ids.length-b.ids.length||b.rank-a.rank);const best=choices[0];
    // Seek an upgrade once using only visible main cards; high card never becomes a target.
    const discard=hand.filter(c=>!best.ids.includes(c.id)).slice(0,5).map(c=>c.id);
    if(['high-card','pair'].includes(best.type)&&s.stage.discardsLeft>0&&s.stage.discardsUsed<1&&discard.length&&commands.length<8)send({type:'DiscardHand',selectedIds:discard});else send({type:'PlayHand',selectedIds:best.ids});
   }
   const final=makeCheckpoint(s,commands);if(!readCheckpoint(final).ok)throw Error('natural final invalid');let replay=initial.state;for(const command of commands){const r=applyCommand(replay,command);if(!r.ok)throw Error('natural replay');replay=r.state;}if(stableHash(replay)!==stableHash(s))throw Error('natural replay mismatch');
   routes.push({seed,profile,purchased:offer?.definitionId??null,initial,commands,steps,final,passed:true});
  }
  return{scan,candidates:candidates.map(c=>({id:c.id,status:c.entry?'FOUND_AFFORDABLE':'NOT_OBSERVED',seed:c.entry?.seed??null})),routes};
 });Object.assign(report,result);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);throw error;}finally{if(browser)await browser.close();await server.close();report.after=snapshotSource(process.cwd());report.sourceUnchanged=JSON.stringify(before)===JSON.stringify(report.after);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,candidates:report.candidates,routes:report.routes?.map(r=>({seed:r.seed,profile:r.profile,purchased:r.purchased,phase:r.final.state.phase,hands:r.steps.filter(s=>s.action.type==='PlayHand').map(s=>({type:s.handType,score:s.score,growth:s.growth}))})),sourceUnchanged:report.sourceUnchanged},null,2));assert.ok(report.sourceUnchanged);}
