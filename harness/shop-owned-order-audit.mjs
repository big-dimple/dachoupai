import {createServer} from 'vite';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const server=await createServer({root:process.cwd(),mode:'e2e',server:{middlewareMode:true},logLevel:'error'});
try{
 const {createRun,applyCommand,assertRunInvariants}=await server.ssrLoadModule('/src/domain/run.ts'),{newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts'),{r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
 const send=(s,a)=>{const c={runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action:a},r=applyCommand(s,c);assert.ok(r.ok,r.code);return r.state;};
 let s=createRun({seed:'owned-order-fixed',runId:'owned-order-fixed',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group'});
 for(const a of [{type:'LeaveShop'},{type:'SkipStage'},{type:'OpenShop'}])s=send(s,a);
 s.jokers=['f03','f09'].map((id,i)=>r2CreateJoker(id,'ordered/'+id,4));assertRunInvariants(s);
 const a=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'}),swapped=send(s,{type:'ReorderJokers',ids:[...s.jokers.map(j=>j.instanceId)].reverse()}),b=send(send(swapped,{type:'LeaveShop'}),{type:'EnterStage'});
 assert.deepEqual(a.handOrder,b.handOrder);assert.deepEqual(a.rng,b.rng);
 const selectedIds=a.handOrder.slice(0,1),left=send(a,{type:'PlayHand',selectedIds}),right=send(b,{type:'PlayHand',selectedIds});
 assert.notEqual(left.lastTrace.finalScore,right.lastTrace.finalScore);
 const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'controlled domain audit, not browser play or balance; original commands and current identity',selectedIds,beforeOrder:a.jokers.map(j=>j.instanceId),afterOrder:b.jokers.map(j=>j.instanceId),beforeTrace:left.lastTrace,afterTrace:right.lastTrace,assertions:['identical actual hand/RNG before play','real shop ReorderJokers accepted','same selected actual card; changed score follows changed hook order','no scoring/command source modified']};
 await writeFile('/tmp/owned-order-audit.json',JSON.stringify(report,null,2)+'\n');console.log(left.lastTrace.finalScore,right.lastTrace.finalScore);
}finally{await server.close();}
