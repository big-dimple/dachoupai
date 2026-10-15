import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const server=await createServer({server:{middlewareMode:true},logLevel:'error'});
try{
 const {resourceLossFixture}=await server.ssrLoadModule('/harness/fixtures/recommendation-resource-loss.ts');
 const {shopPurchaseValue}=await server.ssrLoadModule('/src/game/ShopPurchaseValue.ts');
 const {shopRecommendation}=await server.ssrLoadModule('/src/game/ShopRecommendation.ts');
 const {r2JokerDefinitionFor}=await server.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
 const rows=[];
 for(const id of ['d05','a07','f07','e12','b03','d07','e05']){
  const {state,offer,sold}=resourceLossFixture(id),before=structuredClone(state);
  const value=shopPurchaseValue(state,offer,'group',sold),rating=shopRecommendation(state,offer,'group',sold);
  assert.equal(value?.status,'assessed');assert.deepEqual(state,before);
  rows.push({donor:id,hooks:r2JokerDefinitionFor(state,id).hooks,value,stars:rating.stars,reason:rating.reason,stateUnchanged:true});
 }
 const sourceHashes=Object.fromEntries(await Promise.all(['src/game/ShopPurchaseValue.ts','src/game/ShopRecommendation.ts','harness/fixtures/recommendation-resource-loss.ts'].map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
 const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,scope:'Executed cloned public purchase evaluation, no browser or natural gameplay; source hashes identify working code.',rows};
 if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(rows.map(r=>({donor:r.donor,stars:r.stars,reason:r.reason,lostInvestment:r.value.lostInvestment,unmeasuredLoss:r.value.unmeasuredLoss,refund:r.value.refund,paid:r.value.paid,goldAfter:r.value.goldAfter,allPositive:r.value.allPositive,interestLoss:r.value.interestLoss}))));
}finally{await server.close();}
