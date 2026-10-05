/** Bounded explicit-profile domain calls in native IndexedDB; no production entry or UI. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {snapshotSource} from '../scripts/check-runner.mjs';
const root=process.cwd(),out='shots/combo-growth-save';await mkdir(out,{recursive:true});
const before=snapshotSource(root),frozen=await Promise.all(['v10','v11','843f'].map(async id=>JSON.parse(await readFile(`tests/fixtures/r2-${id}-amo-checkpoints.json`,'utf8'))));
const server=await createServer({server:{host:'127.0.0.1',port:5342,strictPort:true},appType:'custom',logLevel:'error'});
server.middlewares.use((req,res,next)=>{if(req.url==='/combo-proof'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Shared combo persistence proof</title>');}else next();});await server.listen();
let browser;const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before,checks:[],limitations:['Controlled legal public-hand, ordered draw and owned-Joker fixtures; not natural acquisition, balance, UI or device acceptance.','Native Chromium IndexedDB, actual SavedRun commands and production adapter; quota abort is an injected transaction fault, not physical disk exhaustion.']};
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu']});report.browser=browser.version();const page=await browser.newPage();await page.goto('http://127.0.0.1:5342/combo-proof');
 const prepared=await page.evaluate(async frozen=>{
  const {createRun,applyCommand}=await import('/src/domain/run.ts'),{r2CreateJoker,assertR2Invariants}=await import('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await import('/src/application/checkpoint.ts'),{SavedRun}=await import('/src/application/SavedRun.ts'),{IndexedDbSave}=await import('/src/platform/IndexedDbSave.ts'),{stableHash}=await import('/src/domain/hash.ts'),{CHARACTER_IDS}=await import('/src/domain/characters.ts');
  const check=(condition,label)=>{if(!condition)throw Error(label);},eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const storage=new IndexedDbSave(),mode={mode:'standard',difficulty:0,challengeId:null,programsEnabled:true},checks=[],comparisons=[];
  const send=(state,action)=>{const command={runId:state.runId,commandId:`proof/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action},r=applyCommand(state,command);check(r.ok,'command '+action.type+': '+r.code);makeCheckpoint(r.state,[command]);return r.state;};
  const start=(ids,characterId='amo')=>{let s=createRun({seed:'combo-native',runId:'combo-native-'+characterId,characterId,rulesVersion:'r2',r2Profile:'combo-growth-v1',modeConfig:mode});s.jokers=ids.map((id,i)=>r2CreateJoker(id,'j/'+i,8,undefined,s));return s;};
  const enter=(state,ids,drawFirst=[])=>{let s=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});s.handOrder=[...ids];s.drawPile=[...s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!drawFirst.includes(id)),...drawFirst.toReversed()];assertR2Invariants(s);makeCheckpoint(s,[]);return s;};
  const main=['spades-9','hearts-9','clubs-13','diamonds-13'],visible=[...main,'spades-12','hearts-12','clubs-6','diamonds-7'],cold=['spades-2','hearts-4','clubs-6','diamonds-8','spades-10','hearts-12','clubs-14','diamonds-3'];
  const summary=s=>({phase:s.phase,score:s.lastTrace?.finalScore,gold:s.gold,handsLeft:s.stage.handsLeft,discardsUsed:s.stage.discardsUsed,handType:s.lastTrace?.handType,held:s.lastTrace?.sets.heldIds,coefficient:s.jokers.find(j=>j.definitionId==='a06')?.growth.coefficient,rescueArmed:s.jokers.find(j=>j.definitionId==='f10')?.counters.rescueArmed,clearCapital:s.lastTrace?.combo.goldBeforeRewards,income:s.lastTrace?.events.filter(e=>['add-gold-per-held','add-gold-per-capital'].includes(e.operation)).map(e=>({source:e.sourceDefinitionId,amount:e.value.n})),stateHash:stableHash(s)});
  for(const entry of frozen){check(readCheckpoint(entry.before).ok,'old before');check(eq(applyCommand(entry.before.state,entry.command).state,entry.after.state),'old replay');await SavedRun.import(storage,entry.before,await storage.read());check(eq((await storage.readPartition(mode)).current,entry.before),'old active');}
  for(const character of CHARACTER_IDS){const s=enter(start(['a06','f10'],character),visible);await SavedRun.import(storage,makeCheckpoint(s,[]),await storage.read());check((await storage.readPartition(mode)).current.state.characterId===character,'six role partition');}
  const transactions=[];
  // Same hand, inventory and future draw: immediate full house versus two-play alternation.
  const full=['spades-9','hearts-9','clubs-9','clubs-13','diamonds-13','spades-12','hearts-12','clubs-6'];
  const growStart=enter(start(['a06']),full,['diamonds-12','spades-2','hearts-2','spades-3']),fast=send(growStart,{type:'PlayHand',selectedIds:full.slice(0,5)}),one=send(growStart,{type:'PlayHand',selectedIds:main});
  check(one.phase==='await-input'&&fast.phase==='stage-cleared','growth comparison clear timing');
  const growthAction={type:'PlayHand',selectedIds:['spades-12','hearts-12','diamonds-12']},grown=send(one,growthAction);check(grown.jokers[0].counters.alternationUsed&&eq(grown.jokers[0].growth.coefficient,{n:'69',d:'40'}),'actual growth');
  comparisons.push({card:'a06',sameInitialState:stableHash(growStart),immediateFullHouse:summary(fast),twoQualifiedTypes:summary(grown)});transactions.push({name:'a06-winning-growth',state:one,action:growthAction,expected:grown});
  // Same cold hand: first discard arms; spending a weak play first loses eligibility.
  const fireStart=enter(start(['f10']),cold,['spades-12','hearts-14','clubs-9','diamonds-7','spades-5']),discard={type:'DiscardHand',selectedIds:cold.slice(0,5)},armed=send(fireStart,discard),fireAction={type:'PlayHand',selectedIds:['hearts-12','spades-12','clubs-14','hearts-14']},rescued=send(armed,fireAction);
  const weak=send(fireStart,{type:'PlayHand',selectedIds:['diamonds-3']}),late=send(weak,discard),wasted=send(late,fireAction);check(armed.jokers[0].counters.rescueArmed&&!late.jokers[0].counters.rescueArmed,'first discard provenance');
  comparisons.push({card:'f10',sameInitialState:stableHash(fireStart),discardFirst:summary(rescued),weakPlayFirst:summary(wasted)});transactions.push({name:'f10-arm',state:fireStart,action:discard,expected:armed},{name:'f10-consume',state:armed,action:fireAction,expected:rescued});
  const heldStart=enter(start(['d12','b04']),visible),keepAction={type:'PlayHand',selectedIds:main},keep=send(heldStart,keepAction),assist=send(heldStart,{type:'PlayAssistedHand',selectedIds:main,assistIds:visible.slice(4,6)});check(keep.phase==='stage-cleared'&&assist.phase==='stage-cleared','held comparison clear');
  comparisons.push({card:'d12',sameInitialState:stableHash(heldStart),retainFour:summary(keep),consumePairForAssist:summary(assist)});transactions.push({name:'d12-income',state:heldStart,action:keepAction,expected:keep});
  const bankShop=start(['e04']);bankShop.gold=30;bankShop.shop.offers[0]={...bankShop.shop.offers[0],definitionId:'c07',edition:'foil',price:10,consumed:false};makeCheckpoint(bankShop,[]);
  const bought=send(bankShop,{type:'BuyOffer',offerId:bankShop.shop.offers[0].offerId});check(bought.gold===20,'real 10-gold purchase');
  const flush=['spades-3','spades-7','spades-11','spades-12','spades-14','hearts-2','clubs-6','diamonds-9'],bank=enter(bankShop,flush),engine=enter(bought,flush),capitalAction={type:'PlayHand',selectedIds:flush.slice(0,5)},banked=send(bank,capitalAction),spent=send(engine,capitalAction);check(banked.phase==='stage-cleared'&&spent.phase==='stage-cleared','capital comparison clear');
  comparisons.push({card:'e04',sameInitialShop:stableHash(bankShop),keepThirty:summary(banked),buyTenGoldComponent:summary(spent)});transactions.push({name:'e04-income',state:bank,action:capitalAction,expected:banked});
  let last;
  for(const {name,state,action,expected} of transactions){const initial=makeCheckpoint(state,[]),run=await SavedRun.import(storage,initial,await storage.read()),durable=await storage.read(),put=IDBObjectStore.prototype.put;
   let failed,pending;try{IDBObjectStore.prototype.put=function(...args){if(this.name==='saves'&&args[1]==='meta')throw new DOMException('injected quota','QuotaExceededError');return Reflect.apply(put,this,args);};failed=await run.dispatch(action);check(!failed.ok&&failed.code==='save-failed',name+' quota');check(eq(run.state,initial.state)&&eq(await storage.read(),durable),name+' atomic rollback');pending=JSON.parse(run.exportJSON());check(readCheckpoint(pending).ok,name+' pending strict');check(eq(pending.state.jokers,expected.jokers)&&eq(pending.state.rng,expected.rng)&&pending.state.gold===expected.gold,name+' candidate counters/rng/gold');check((await run.dispatch(action)).code==='save-paused',name+' no new command');}finally{IDBObjectStore.prototype.put=put;}
   check((await run.retry()).ok,name+' retry');check(eq(run.state,pending.state),name+' same candidate');const committed=await storage.read(),duplicate=await run.submit(pending.journal.at(-1));check(duplicate.ok&&duplicate.duplicate&&eq(await storage.read(),committed),name+' duplicate no write');checks.push({name,status:'PASS',pendingChecksum:pending.checksum,stateHash:stableHash(run.state),revision:committed.revision});last={pending,initial};
  }
  for(const entry of frozen)check(eq((await storage.readPartition(entry.before.state)).current,entry.before),'old partition retained');
  let mixed=false;try{await storage.readPartition({...last.pending.state,contentHash:frozen[1].before.state.contentHash});}catch(e){mixed=e.message==='incompatible-version';}check(mixed,'mixed partition rejection');
  return {...last,mode,checks,comparisons,contentHash:last.pending.state.contentHash};
 },frozen);
 report.checks.push(...prepared.checks);report.comparisons=prepared.comparisons;report.contentHash=prepared.contentHash;await page.reload();
 const restored=await page.evaluate(async({pending,initial,mode,frozen})=>{
  const {IndexedDbSave}=await import('/src/platform/IndexedDbSave.ts'),{SavedRun}=await import('/src/application/SavedRun.ts'),{restoreSlots}=await import('/src/application/checkpoint.ts'),{r2ModeStorageKey}=await import('/src/content/r2Modes.ts');
  const check=(c,l)=>{if(!c)throw Error(l);},eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),storage=new IndexedDbSave();let slots=await storage.readPartition(mode),run=SavedRun.restore(storage,slots);check(eq(run.state,pending.state)&&eq(JSON.parse(run.exportJSON()),pending),'reload full state/journal/checksum');
  for(const checkpoint of [...frozen.map(f=>f.before),pending]){await SavedRun.import(storage,checkpoint,await storage.read());check(eq((await storage.readPartition(mode)).current,checkpoint),'active mode priority');}
  const mutate=async(current,previous)=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('dachoupai-checkpoints',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');store.put({current,previous},r2ModeStorageKey(pending.state,pending.state.contentHash));tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();};
  const damaged={...pending,checksum:'damaged-current'};await mutate(damaged,initial);slots=await storage.readPartition(mode);check(eq(slots.current,damaged)&&restoreSlots(slots).status==='backup'&&eq(SavedRun.restore(storage,slots).state,initial.state),'exact same-profile backup');
  await mutate(damaged,{...initial,checksum:'damaged-previous'});slots=await storage.readPartition(mode);check(restoreSlots(slots).status==='invalid'&&eq(slots.current,damaged),'both damaged, no silent cross-profile fallback');
  await mutate(damaged,frozen[2].before);check(restoreSlots(await storage.readPartition(mode)).status==='invalid','843f is not combo backup');
  await SavedRun.import(storage,pending,await storage.read());const retained=JSON.parse(await storage.exportRetained());check(retained.records.some(r=>String(r.key).startsWith('retained:')&&r.value.current.checksum==='damaged-current'),'raw damaged export retained');
  return{export:JSON.parse(SavedRun.restore(storage,await storage.read()).exportJSON()),revision:(await storage.read()).revision};
 },{...prepared,frozen});
 assert.deepEqual(restored.export,prepared.pending);report.checks.push({name:'six-role/four-identity/discovery/reload/export/import/corrupt-current+previous/retained-raw',status:'PASS',revision:restored.revision});report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);throw error;}
finally{if(browser)await browser.close();await server.close();report.after=snapshotSource(root);report.sourceUnchanged=JSON.stringify(before)===JSON.stringify(report.after);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));assert.ok(report.sourceUnchanged,'source/index/HEAD unchanged');}
