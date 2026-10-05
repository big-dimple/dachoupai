/** Bounded explicit-profile domain calls in native IndexedDB; no production entry or UI. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {snapshotSource} from '../scripts/check-runner.mjs';
const root=process.cwd(),out='shots/group-upgrade-save';await mkdir(out,{recursive:true});
const before=snapshotSource(root),frozen=await Promise.all(['v10','v11','843f','e7d'].map(async id=>JSON.parse(await readFile(`tests/fixtures/r2-${id}-${id==='e7d'?'group':'amo'}-checkpoints.json`,'utf8'))));
const server=await createServer({server:{host:'127.0.0.1',port:5343,strictPort:true},appType:'custom',logLevel:'error'});
server.middlewares.use((req,res,next)=>{if(req.url==='/group-proof'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Group upgrade persistence proof</title>');}else next();});await server.listen();
let browser;const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before,checks:[],limitations:['Controlled legal public-hand, ordered draw and owned-Joker fixtures; not natural acquisition, balance, UI or device acceptance.','Native Chromium IndexedDB, actual SavedRun commands and production adapter; quota abort is an injected transaction fault, not physical disk exhaustion.']};
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu']});report.browser=browser.version();const page=await browser.newPage();await page.goto('http://127.0.0.1:5343/group-proof');
 const prepared=await page.evaluate(async frozen=>{
  const {createRun,applyCommand}=await import('/src/domain/run.ts'),{r2CreateJoker,assertR2Invariants}=await import('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await import('/src/application/checkpoint.ts'),{SavedRun}=await import('/src/application/SavedRun.ts'),{IndexedDbSave}=await import('/src/platform/IndexedDbSave.ts'),{stableHash}=await import('/src/domain/hash.ts'),{CHARACTER_IDS}=await import('/src/domain/characters.ts');
  const check=(condition,label)=>{if(!condition)throw Error(label);},eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const storage=new IndexedDbSave(),mode={mode:'standard',difficulty:0,challengeId:null,programsEnabled:true},checks=[],observations=[];
  const send=(state,action)=>{const command={runId:state.runId,commandId:`proof/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action},r=applyCommand(state,command);check(r.ok,'command '+action.type+': '+r.code);makeCheckpoint(r.state,[command]);return r.state;};
  const start=(ids,characterId='amo')=>{let s=createRun({seed:'group-native',runId:'group-native-'+characterId,characterId,rulesVersion:'r2',r2Profile:'group-upgrade-v1',modeConfig:mode});s.jokers=ids.map((id,i)=>r2CreateJoker(id,'j/'+i,8,undefined,s));return s;};
  const enter=(state,ids,drawFirst=[])=>{let s=send(send(state,{type:'LeaveShop'}),{type:'EnterStage'});s.handOrder=[...ids];s.drawPile=[...s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!drawFirst.includes(id)),...drawFirst.toReversed()];assertR2Invariants(s);makeCheckpoint(s,[]);return s;};
  const main=['spades-9','hearts-9','clubs-13','diamonds-13'],visible=[...main,'spades-12','hearts-12','clubs-6','diamonds-7'];
  const summary=s=>({phase:s.phase,score:s.lastTrace?.finalScore,gold:s.gold,handsLeft:s.stage.handsLeft,handType:s.lastTrace?.handType,growth:s.jokers.map(j=>({id:j.definitionId,growth:j.growth})),clearCapital:s.lastTrace?.combo.goldBeforeRewards,assistUsed:s.stage.assistUsed,income:s.lastTrace?.events.filter(e=>e.phase==='onStageClear'&&e.operation==='add-gold').map(e=>({source:e.sourceDefinitionId,amount:e.value.n})),stateHash:stableHash(s)});
  for(const entry of frozen){check(readCheckpoint(entry.before).ok,'old before');check(eq(applyCommand(entry.before.state,entry.command).state,entry.after.state),'old replay');await SavedRun.import(storage,entry.before,await storage.read());check(eq((await storage.readPartition(mode)).current,entry.before),'old active');}
  for(const character of CHARACTER_IDS){const s=enter(start(['b03','b06','b08','b10'],character),visible);await SavedRun.import(storage,makeCheckpoint(s,[]),await storage.read());check((await storage.readPartition(mode)).current.state.characterId===character,'six role partition');}
  const transactions=[];
  const training=enter(start(['b03','b10']),visible),pairAction={type:'PlayHand',selectedIds:main.slice(0,2)},trained=send(training,pairAction);
  check(trained.phase==='await-input'&&eq(trained.jokers.map(j=>j.growth),[{multiplier:{n:'1',d:'4'}},{heat:{n:'10',d:'1'}}]),'first pair grows once after reading zero');
  transactions.push({name:'b03+b10-nonwinning-growth',state:training,action:pairAction,expected:trained});
  const full=['spades-9','hearts-9','clubs-9','clubs-13','diamonds-13','spades-12','hearts-12','diamonds-7'],clear=enter(start(['b03','b06','b08','b10']),full),clearAction={type:'PlayHand',selectedIds:full.slice(0,5)},cleared=send(clear,clearAction);
  check(cleared.phase==='stage-cleared'&&cleared.lastTrace.events.filter(e=>e.sourceDefinitionId==='b06').length===3&&cleared.lastTrace.events.find(e=>e.sourceDefinitionId==='b08').value.n==='3','full-house targets and income');
  transactions.push({name:'b06-three-targets+b03+b10-growth+b08-clear',state:clear,action:clearAction,expected:cleared});
  const straight=['spades-2','hearts-3','clubs-4','diamonds-5','spades-6','hearts-9','clubs-12','diamonds-14'],switchState=enter(send(cleared,{type:'OpenShop'}),straight),switchAction={type:'PlayHand',selectedIds:straight.slice(0,5)},switched=send(switchState,switchAction);
  check(eq(switched.jokers.map(j=>j.growth),cleared.jokers.map(j=>j.growth))&&!switched.lastTrace.events.some(e=>e.operation==='add-growth'),'cross-stage straight carries but does not grow');
  transactions.push({name:'cross-stage-straight-carried-growth',state:switchState,action:switchAction,expected:switched});
  const assistedStart=enter(start(['b03','b06','b08','b10']),visible),assistAction={type:'PlayAssistedHand',selectedIds:main,assistIds:visible.slice(4,6)},assisted=send(assistedStart,assistAction);
  check(assisted.stage.assistUsed&&visible.slice(4,6).every(id=>assisted.playedPile.includes(id))&&assisted.lastTrace.events.filter(e=>e.sourceDefinitionId==='b06').every(e=>main.slice(0,2).includes(e.targetCardId)),'assist consumption distinct from largest group');
  transactions.push({name:'assisted-clear-one-growth+reward+consumption',state:assistedStart,action:assistAction,expected:assisted});
  for(const row of transactions)observations.push({name:row.name,result:summary(row.expected)});
  let last;
  for(const {name,state,action,expected} of transactions){const initial=makeCheckpoint(state,[]),run=await SavedRun.import(storage,initial,await storage.read()),durable=await storage.read(),put=IDBObjectStore.prototype.put;
   let failed,pending;try{IDBObjectStore.prototype.put=function(...args){if(this.name==='saves'&&args[1]==='meta')throw new DOMException('injected quota','QuotaExceededError');return Reflect.apply(put,this,args);};failed=await run.dispatch(action);check(!failed.ok&&failed.code==='save-failed',name+' quota');check(eq(run.state,initial.state)&&eq(await storage.read(),durable),name+' atomic rollback');pending=JSON.parse(run.exportJSON());check(readCheckpoint(pending).ok,name+' pending strict');check(eq(pending.state.jokers,expected.jokers)&&eq(pending.state.rng,expected.rng)&&pending.state.gold===expected.gold,name+' candidate counters/rng/gold');check((await run.dispatch(action)).code==='save-paused',name+' no new command');}finally{IDBObjectStore.prototype.put=put;}
   check((await run.retry()).ok,name+' retry');check(eq(run.state,pending.state),name+' same candidate');const committed=await storage.read(),duplicate=await run.submit(pending.journal.at(-1));check(duplicate.ok&&duplicate.duplicate&&eq(await storage.read(),committed),name+' duplicate no write');checks.push({name,status:'PASS',pendingChecksum:pending.checksum,stateHash:stableHash(run.state),revision:committed.revision});last={pending,initial};
  }
  for(const entry of frozen)check(eq((await storage.readPartition(entry.before.state)).current,entry.before),'old partition retained');
  let mixed=false;try{await storage.readPartition({...last.pending.state,contentHash:frozen[1].before.state.contentHash});}catch(e){mixed=e.message==='incompatible-version';}check(mixed,'mixed partition rejection');
  return {...last,mode,checks,observations,contentHash:last.pending.state.contentHash};
 },frozen);
 report.checks.push(...prepared.checks);report.observations=prepared.observations;report.contentHash=prepared.contentHash;await page.reload();
 const restored=await page.evaluate(async({pending,initial,mode,frozen})=>{
  const {IndexedDbSave}=await import('/src/platform/IndexedDbSave.ts'),{SavedRun}=await import('/src/application/SavedRun.ts'),{restoreSlots}=await import('/src/application/checkpoint.ts'),{r2ModeStorageKey}=await import('/src/content/r2Modes.ts');
  const check=(c,l)=>{if(!c)throw Error(l);},eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),storage=new IndexedDbSave();let slots=await storage.readPartition(mode),run=SavedRun.restore(storage,slots);check(eq(run.state,pending.state)&&eq(JSON.parse(run.exportJSON()),pending),'reload full state/journal/checksum');
  for(const checkpoint of [...frozen.map(f=>f.before),pending]){await SavedRun.import(storage,checkpoint,await storage.read());check(eq((await storage.readPartition(mode)).current,checkpoint),'active mode priority');}
  const mutate=async(current,previous)=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('dachoupai-checkpoints',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');store.put({current,previous},r2ModeStorageKey(pending.state,pending.state.contentHash));tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();};
  const damaged={...pending,checksum:'damaged-current'};await mutate(damaged,initial);slots=await storage.readPartition(mode);check(eq(slots.current,damaged)&&restoreSlots(slots).status==='backup'&&eq(SavedRun.restore(storage,slots).state,initial.state),'exact same-profile backup');
  await mutate(damaged,{...initial,checksum:'damaged-previous'});slots=await storage.readPartition(mode);check(restoreSlots(slots).status==='invalid'&&eq(slots.current,damaged),'both damaged, no silent cross-profile fallback');
  await mutate(damaged,frozen[3].before);check(restoreSlots(await storage.readPartition(mode)).status==='invalid','e7d is not group-upgrade backup');
  await SavedRun.import(storage,pending,await storage.read());const retained=JSON.parse(await storage.exportRetained());check(retained.records.some(r=>String(r.key).startsWith('retained:')&&r.value.current.checksum==='damaged-current'),'raw damaged export retained');
  return{export:JSON.parse(SavedRun.restore(storage,await storage.read()).exportJSON()),revision:(await storage.read()).revision};
 },{...prepared,frozen});
 assert.deepEqual(restored.export,prepared.pending);report.checks.push({name:'six-role/five-identity/discovery/reload/export/import/corrupt-current+previous/retained-raw',status:'PASS',revision:restored.revision});report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);throw error;}
finally{if(browser)await browser.close();await server.close();report.after=snapshotSource(root);report.sourceUnchanged=JSON.stringify(before)===JSON.stringify(report.after);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));assert.ok(report.sourceUnchanged,'source/index/HEAD unchanged');}
