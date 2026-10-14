/** Independently re-evaluate stored native receipts, including fixed-candidate retries. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
const root='docs/production/evidence/hero-drag-integration-2026-10-14';
const read=async p=>JSON.parse(gunzipSync(await readFile(root+'/'+p)));
const server=await createServer({server:{middlewareMode:true},logLevel:'error'});
const {applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Offline audit of full snapshots captured by native browser runs. This supplements those observations; it is not another browser run.',reorders:[],coldRestores:[],nested:[],status:'RUNNING'};
const check=(before,after)=>{
 const command=after.journal.at(-1),result=applyCommand(before.state,command);assert.ok(result.ok,result.code);assert.equal(command.action.type,'ReorderJokers');assert.deepEqual(after.state,result.state);assert.deepEqual(after.journal,[...before.journal,command]);assert.deepEqual(after.slots.current,makeCheckpoint(after.state,after.journal));assert.equal(after.slots.revision,before.slots.revision+1);assert.deepEqual(after.storage,before.storage);assert.ok(readCheckpoint(after.slots.current).ok);return {command,beforeSeq:before.state.commandSeq,afterSeq:after.state.commandSeq,completeStateJournalIDB:'PASS',applicationLocalStorageExcludingLease:'PASS'};
};
try{
 const drag=await read('drag/full-state-journal-storage.json.gz');assert.equal(drag.status,'PASS');
 for(const row of drag.cases){
  for(const move of row.moves)report.reorders.push({viewport:row.name,kind:move.style,...check(move.before,move.after)});
  report.reorders.push({viewport:row.name,kind:'fast-delayed',...check(row.fastDelayed.before,row.fastDelayed.after)});
  assert.deepEqual(row.failure.after,row.failure.before);report.reorders.push({viewport:row.name,kind:'quota-fixed-candidate-retry',...check(row.failure.before,row.retry)});
  assert.deepEqual(row.restored,row.retry);report.coldRestores.push({viewport:row.name,fullStateJournalIDBAndApplicationLocalStorage:'PASS'});
 }
 const explanations=await read('explanations/full-state-journal-storage-localStorage.json.gz');assert.equal(explanations.status,'PASS');
 for(const row of explanations.rows.filter(r=>['shop-keepsake','finale-keepsake'].includes(r.scene))){
  assert.deepEqual(row.after,row.before);assert.equal(row.observations.length,2);for(const o of row.observations){assert.deepEqual(o.after,row.before);assert.equal(o.status,'PASS');}
  report.nested.push({hero:row.id,width:row.width,scene:row.scene,completeStateJournalIDBLocalStorageForCloseAndEscape:'PASS'});
 }
 assert.equal(report.reorders.length,15);assert.equal(report.coldRestores.length,3);assert.equal(report.nested.length,24);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e);process.exitCode=1;}
finally{await server.close();await writeFile(root+'/snapshot-audit.json',JSON.stringify(report,null,2)+'\n');console.log(report.status,report.reorders.length+' reorders',report.coldRestores.length+' cold restores',report.nested.length+' nested entries');}
