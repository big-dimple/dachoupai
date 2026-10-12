import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import {writeFile,mkdir} from 'node:fs/promises';
const out=process.env.TOUYE_CORE_EVIDENCE??'/tmp/touye-core-evidence';await mkdir(out,{recursive:true});
const current=await createServer({cacheDir:'/tmp/touye-core-export-current',server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'}),baseline=await createServer({root:'/tmp/dachoupai-touye-baseline',cacheDir:'/tmp/touye-core-export-base',server:{middlewareMode:true,hmr:false},appType:'custom',logLevel:'error'});
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
try{
 const fixture=await current.ssrLoadModule('/tests/fixtures/touye-new-core.ts'),run=await current.ssrLoadModule('/src/domain/run.ts'),baseRun=await baseline.ssrLoadModule('/src/domain/run.ts'),domain=await current.ssrLoadModule('/src/domain/r2Run.ts'),baseDomain=await baseline.ssrLoadModule('/src/domain/r2Run.ts'),wager=await current.ssrLoadModule('/src/domain/r2TouyeWager.ts'),identity=await current.ssrLoadModule('/src/domain/r2GroupUpgrade.ts'),cp=await current.ssrLoadModule('/src/application/checkpoint.ts'),baseCp=await baseline.ssrLoadModule('/src/application/checkpoint.ts'),copy=await current.ssrLoadModule('/src/game/TouyeWagerCopy.ts'),baseCopy=await baseline.ssrLoadModule('/src/game/TouyeWagerCopy.ts');
 const rows=[];
 for(const kind of ['mature-win','unformed-win','mature-old-core','mature-accompanying','target-miss','disabled-core','B02-zero','short','empty','duplicate-face','four-straight','four-flush','four-kind-flush','unformed-disabled','full-house-core','four-kind-core','all-disabled-flush']){
  const f=fixture.touyeFixture(kind),bet=fixture.touyeCommand(f.state,fixture.touyeBet(f.state,f.discard,f.target)),r=run.applyCommand(f.state,bet),row={kind,before:cp.makeCheckpoint(f.state,[]),bet};rows.push(row);
  if(!r.ok){row.rejected=r.code;assert.equal(kind,'empty');assert.deepEqual(r.state,f.state);continue;}
  row.pending=cp.makeCheckpoint(r.state,[bet]);assert.equal(cp.readCheckpoint(row.pending).ok,true);row.publicScoreContext=domain.r2ScoreContext(r.state,r.state.handOrder.map(id=>r.state.deckInstances.find(c=>c.id===id)),f.play);assert.doesNotMatch(JSON.stringify(row.publicScoreContext),/drawBefore|drawAfter|discardBefore|playedBefore|refillProof/);
  const play=fixture.touyeCommand(r.state,{type:'PlayHand',selectedIds:f.play}),after=run.applyCommand(r.state,play);assert.equal(after.ok,true,after.code);row.play=play;row.after=cp.makeCheckpoint(after.state,[bet,play]);assert.equal(cp.readCheckpoint(row.after).ok,true);row.result=after.state.lastTrace.touyeWager;row.score=after.state.lastTrace.finalScore;
 }
 const legacy=[];const viewKeys=['common','enabled','pending','used','choices','compact','settled','snapshotToken','status','details'];
 for(const p of baseDomain.R2_RULESETS){
  const profile={contentVersion:p.contentVersion,contentHash:p.contentHash};let f;
  try{f=fixture.touyeFixture('unformed-win',{identity:profile});}catch(error){legacy.push({identity:profile,unsupportedTouye:String(error)});continue;}
  const betting=wager.usesTouyeWager(f.state);
  for(const kind of betting?['ordinary','won','lost']:['ordinary','random-wager']){
   let old=f.state,now=f.state;const commands=[];
   const dispatch=action=>{const cmd=fixture.touyeCommand(now,action),a=baseRun.applyCommand(old,cmd),b=run.applyCommand(now,cmd);assert.equal(a.ok,true,a.code);assert.equal(b.ok,true,b.code);assert.deepEqual(b,a);old=a.state;now=b.state;commands.push(cmd);};
   if(kind==='lost'){
    // Same visible pre-bet state, explicit incoming high-card instead of the missing pair.
    const modified=structuredClone(f.state),incoming='hearts-4';modified.drawPile=[...modified.drawPile.filter(id=>id!==incoming),incoming];old=modified;now=modified;
   }
   if(kind==='random-wager')dispatch({type:'SetWager',enabled:true});
   if(kind==='won'||kind==='lost')dispatch(fixture.touyeBet(now,f.discard,f.target));
   dispatch({type:'PlayHand',selectedIds:kind==='lost'?['hearts-4']:kind==='ordinary'||kind==='random-wager'?['clubs-13','diamonds-13']:f.play});
   const oldCheckpoint=baseCp.makeCheckpoint(old,commands),newCheckpoint=cp.makeCheckpoint(now,commands);assert.deepEqual(newCheckpoint,oldCheckpoint);assert.equal(JSON.stringify(newCheckpoint),JSON.stringify(oldCheckpoint));
   const a=baseCopy.touyeChoice(old),b=copy.touyeChoice(now);for(const key of viewKeys)assert.deepEqual(a[key],b[key]);
   legacy.push({identity:profile,kind,checkpointSha256:digest(oldCheckpoint),currentCheckpointSha256:digest(newCheckpoint),finalScore:now.lastTrace.finalScore,completeStateEventsReceiptCheckpointAndVisibleCopyExact:true,commands});
  }
 }
 const hashes={baseRoute:{contentVersion:identity.R2_ROUTE_GROWTH_VERSION,contentHash:identity.R2_ROUTE_GROWTH_HASH},newCore:{contentVersion:identity.R2_TOUYE_CORE_VERSION,contentHash:identity.R2_TOUYE_CORE_HASH}};
 await writeFile(out+'/actual-and-legacy.json',JSON.stringify({scope:'seventeen controlled one-hand current branches, paired original-main legacy one-hand traces; no natural acquisition or seed search',hashes,rows,legacy},null,2)+'\n');
 console.log(JSON.stringify({hashes,current:rows.map(r=>({kind:r.kind,rejected:r.rejected,outcome:r.result?.outcome,core:r.result?.core,score:r.score})),legacySupportedBranches:legacy.filter(r=>r.kind).length,legacyUnsupported:legacy.filter(r=>!r.kind)},null,2));
}finally{await current.close();await baseline.close();}
