import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const dirs=process.argv.slice(2);
assert.ok(dirs.length,'Usage: node harness/verify-hero-art-evidence.mjs <report-directory> [...]');
const sourceTree=execFileSync('git',['rev-parse','HEAD:src'],{encoding:'utf8'}).trim();
const checked=[];
for(const dir of dirs){
  const report=JSON.parse(await readFile(path.join(dir,'report.json'),'utf8'));
  assert.equal(report.status,'PASS',`${dir}: not a passing run`);
  assert.equal(report.sourceTree,sourceTree,'evidence must match current product source tree');
  assert.equal(execFileSync('git',['rev-parse',report.head+':src'],{encoding:'utf8'}).trim(),sourceTree);
  assert.ok(report.cases.length);
  for(const row of report.cases){
    assert.equal(row.status,'PASS');assert.deepEqual(row.errors,[]);
    let screenshots=0;
    for(const frame of row.frames){
      assert.equal(frame.rendererType,1,'explicit Canvas profile');
      assert.equal(frame.actualDPR,row.spec.dpr);
      if(!frame.png)continue;
      const data=await readFile(path.join(dir,frame.png)),metadata=await sharp(data).metadata();
      assert.equal(metadata.format,'png');
      assert.equal(metadata.width,row.spec.width*row.spec.dpr);
      assert.equal(metadata.height,row.spec.height*row.spec.dpr);
      await sharp(data).raw().toBuffer();screenshots++;
    }
    let receipt;
    if(row.stateEvidence){
      const raw=await readFile(path.join(dir,row.stateEvidence));
      const {before,expected,after}=JSON.parse(gunzipSync(raw));
      assert.deepEqual(before.state,before.stored.current.state);
      assert.deepEqual(before.journal,before.stored.current.journal);
      assert.deepEqual(after.state,expected);
      assert.deepEqual(after.stored.current.state,expected);
      assert.deepEqual(after.journal,after.stored.current.journal);
      const command={runId:before.state.runId,commandId:before.state.runId+'/command/'+(before.state.commandSeq+1),expectedSeq:before.state.commandSeq,action:row.beforePlay.assistIds.length?{type:'PlayAssistedHand',selectedIds:row.beforePlay.selectedIds,assistIds:row.beforePlay.assistIds}:{type:'PlayHand',selectedIds:row.beforePlay.selectedIds}};
      assert.deepEqual(after.journal,[...before.journal,command],'one exact native command');
      assert.equal(after.state.commandSeq,before.state.commandSeq+1);
      assert.equal(after.stored.revision,before.stored.revision+1,'one atomic storage revision');
      assert.deepEqual(after.stored.previous,before.stored.current,'previous checkpoint preserved');
      receipt={file:row.stateEvidence,sha256:createHash('sha256').update(raw).digest('hex'),stateJournalStorage:'PASS',canonicalFinalScore:expected.lastTrace.finalScore};
    }
    checked.push({directory:dir,key:row.key,screenshots,receipt});
  }
}
console.log(JSON.stringify({status:'PASS',sourceTree,cases:checked.length,screenshots:checked.reduce((n,r)=>n+r.screenshots,0),checked,scope:'Original PNG decode/pixels and complete controlled state/journal/storage receipts only; no art or whole-game acceptance.'},null,2));
