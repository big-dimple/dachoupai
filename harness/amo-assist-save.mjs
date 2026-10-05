/** Bounded native IndexedDB checks, deliberately no game UI, video, FPS or strategy simulation. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {snapshotSource} from '../scripts/check-runner.mjs';
const root=process.cwd(),out='shots/amo-assist-save';await mkdir(out,{recursive:true});
const before=snapshotSource(root),v10=JSON.parse(await readFile('tests/fixtures/r2-v10-amo-checkpoints.json','utf8')),v11=JSON.parse(await readFile('tests/fixtures/r2-v11-amo-checkpoints.json','utf8'));
const server=await createServer({server:{host:'127.0.0.1',port:5341,strictPort:true},appType:'custom',logLevel:'error'});
server.middlewares.use((req,res,next)=>{if(req.url==='/assist-proof'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Amo domain persistence proof</title>');}else next();});await server.listen();
let browser;const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before,checks:[],limitations:['Controlled legal public-hand fixtures; no natural acquisition, UI, balance or device acceptance.','Chromium native IndexedDB and production save adapter; injected quota abort is a transaction fault, not actual disk exhaustion.']};
try{
 browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu']});report.browser=browser.version();
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5341/assist-proof');
 const prepared=await page.evaluate(async({v10,v11})=>{
  const {createRun,applyCommand}=await import('/src/domain/run.ts'),{makeCheckpoint,readCheckpoint}=await import('/src/application/checkpoint.ts'),{SavedRun}=await import('/src/application/SavedRun.ts'),{IndexedDbSave}=await import('/src/platform/IndexedDbSave.ts');
  const check=(condition,label)=>{if(!condition)throw Error(label);},eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const storage=new IndexedDbSave(),mode={mode:'standard',difficulty:0,challengeId:null,programsEnabled:true};
  const old=await SavedRun.import(storage,v10.before,await storage.read());check(eq((await storage.readPartition(mode)).current.state,old.state),'v10 active');
  const prior=await SavedRun.import(storage,v11.before,await storage.read());check(eq((await storage.readPartition(mode)).current.state,prior.state),'v11 active');
  let state=createRun({seed:'assist-native',runId:'assist-native',characterId:'amo',rulesVersion:'r2',r2Profile:'amo-assist-v1',modeConfig:mode});
  for(const action of [{type:'LeaveShop'},{type:'EnterStage'}]){const r=applyCommand(state,{runId:state.runId,commandId:`entry/${state.commandSeq+1}`,expectedSeq:state.commandSeq,action});check(r.ok,'entry');state=r.state;}
  const main=['spades-9','hearts-9','clubs-13','diamonds-13'],assist=['spades-12','hearts-12'];state.handOrder=[...main,...assist,'clubs-6','diamonds-7'];state.drawPile=state.deckInstances.map(c=>c.id).filter(id=>!state.handOrder.includes(id));
  const initial=makeCheckpoint(state,[]),run=await SavedRun.import(storage,initial,await storage.read()),durable=await storage.read();check(eq((await storage.readPartition(mode)).current,initial),'assist active');
  const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='saves'&&args[1]==='meta')throw new DOMException('injected quota','QuotaExceededError');return Reflect.apply(put,this,args);};
  const action={type:'PlayAssistedHand',selectedIds:main,assistIds:assist};
  const failed=await run.dispatch(action);check(!failed.ok&&failed.code==='save-failed','quota failure');check(eq(run.state,initial.state),'unpublished state');check(eq(await storage.read(),durable),'atomic durable rollback');
  const pending=JSON.parse(run.exportJSON());check(readCheckpoint(pending).ok,'pending strict import');check(pending.state.stage.assistUsed,'candidate quota consumed');check((await run.dispatch(action)).code==='save-paused','paused new command');
  IDBObjectStore.prototype.put=put;check((await run.retry()).ok,'retry');check(eq(run.state,pending.state),'same candidate');
  const committed=await storage.read(),duplicate=await run.submit(pending.journal.at(-1));check(duplicate.ok&&duplicate.duplicate,'duplicate receipt');check(eq(await storage.read(),committed),'duplicate no write');
  check(eq((await storage.readPartition(v10.before.state)).current,v10.before),'v10 retained');check(eq((await storage.readPartition(v11.before.state)).current,v11.before),'v11 retained');
  let mixed=false;try{await storage.readPartition({...state,contentHash:v11.before.state.contentHash});}catch(e){mixed=e.message==='incompatible-version';}check(mixed,'mixed identity rejected');
  return {pending,initial,revision:committed.revision,mode};
 },{v10,v11});
 report.checks.push({name:'three-profile atomic quota/retry/duplicate/explicit-partition',status:'PASS',revision:prepared.revision});
 await page.reload();
 const restored=await page.evaluate(async({pending,initial,mode,v10,v11})=>{
  const {IndexedDbSave}=await import('/src/platform/IndexedDbSave.ts'),{SavedRun}=await import('/src/application/SavedRun.ts'),{restoreSlots}=await import('/src/application/checkpoint.ts'),{r2ModeStorageKey}=await import('/src/content/r2Modes.ts');
  const check=(c,l)=>{if(!c)throw Error(l);},eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),storage=new IndexedDbSave();
  const slots=await storage.readPartition(mode),run=SavedRun.restore(storage,slots);check(eq(run.state,pending.state),'reload state');check(eq(JSON.parse(run.exportJSON()),pending),'reload journal/checksum');
  for(const checkpoint of [v10.before,v11.before,pending]){await SavedRun.import(storage,checkpoint,await storage.read());check(eq((await storage.readPartition(mode)).current,checkpoint),'active mode priority');}
  const mutate=async(current,previous)=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('dachoupai-checkpoints',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves');store.put({current,previous},r2ModeStorageKey(pending.state,pending.state.contentHash));tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();};
  const damaged={...pending,checksum:'damaged-current'};await mutate(damaged,initial);const backup=await storage.readPartition(mode);check(eq(backup.current,damaged),'damaged active remains selected');check(restoreSlots(backup).status==='backup','same profile backup');check(eq(SavedRun.restore(storage,backup).state,initial.state),'backup exact');
  await mutate(damaged,{...initial,checksum:'damaged-previous'});const invalid=await storage.readPartition(mode);check(restoreSlots(invalid).status==='invalid','both damaged reject');check(eq(invalid.current,damaged),'no silent other-profile fallback');
  await mutate(damaged,v11.before);check(restoreSlots(await storage.readPartition(mode)).status==='invalid','cross profile backup rejected');
  await SavedRun.import(storage,pending,await storage.read());check(eq((await storage.readPartition(mode)).current,pending),'restored import');const retained=JSON.parse(await storage.exportRetained());check(retained.records.some(r=>String(r.key).startsWith('retained:')&&r.value.current.checksum==='damaged-current'),'raw damaged data retained');
  return {export:JSON.parse(SavedRun.restore(storage,await storage.read()).exportJSON()),revision:(await storage.read()).revision};
 },{...prepared,v10,v11});
 assert.deepEqual(restored.export,prepared.pending);report.checks.push({name:'reload/export/import/active-priority/corrupt-current+previous/retained-raw',status:'PASS',revision:restored.revision});report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);throw error;}
finally{if(browser)await browser.close();await server.close();report.after=snapshotSource(root);report.sourceUnchanged=JSON.stringify(before)===JSON.stringify(report.after);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));assert.ok(report.sourceUnchanged,'source/index/HEAD unchanged');}
