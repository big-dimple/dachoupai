import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const server=await createServer({server:{middlewareMode:true},logLevel:'error'});
try{
 const {fixture,held,stock,send}=await server.ssrLoadModule('/analysis/recommendation-cost-lifetime/model.ts');
 const {shopPurchaseValue}=await server.ssrLoadModule('/src/game/ShopPurchaseValue.ts');
 const {shopRecommendation}=await server.ssrLoadModule('/src/game/ShopRecommendation.ts');
 const {r2JokerDefinitionFor}=await server.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
 const s=held(fixture(),['b02','e05']);s.gold=40;const o=stock(s,'e08'),original=structuredClone(s),sold=s.jokers[1];
 const value=shopPurchaseValue(s,o,'group',sold),rating=shopRecommendation(s,o,'group',sold);
 assert.equal(value?.status,'assessed');assert.deepEqual(s,original);
 const afterSale=send(s,{type:'SellJoker',instanceId:sold.instanceId}),afterBuy=send(afterSale,{type:'BuyOffer',offerId:o.offerId});
 const keepAndBuy=send(s,{type:'BuyOffer',offerId:o.offerId});
 const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceSha256:createHash('sha256').update(await readFile('src/game/ShopPurchaseValue.ts')).digest('hex'),
  scope:'Executed controlled pure evaluation and cloned domain commands, not a browser or natural acquisition.',
  sold:{definitionId:sold.definitionId,growth:sold.growth,edition:sold.edition,paidPrice:sold.paidPrice,phases:r2JokerDefinitionFor(s,'e05').hooks.map(h=>h.phase)},
  cash:{before:s.gold,afterSale:afterSale.gold,afterBuy:afterBuy.gold},
  value,rating:{stars:rating.stars,reason:rating.reason},
  retainedPurchaseGrowth:keepAndBuy.jokers.find(j=>j.definitionId==='e05').growth,
  stateUnchanged:true};
 if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({stars:rating.stars,lostInvestment:value.lostInvestment,unmeasuredLoss:value.unmeasuredLoss,
  ceiling:value.ceiling,allPositive:value.allPositive,interestLoss:value.interestLoss,cash:report.cash,rows:value.rows,
  retainedPurchaseGrowth:report.retainedPurchaseGrowth,stateUnchanged:true}));
}finally{await server.close();}
