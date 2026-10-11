import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const server=await createServer({server:{middlewareMode:true},logLevel:'error'});
const baseline=await createServer({root:'/tmp/dachoupai-c2-before',cacheDir:'/tmp/c2-facts-baseline-vite',server:{middlewareMode:true},logLevel:'error'});
const load=p=>server.ssrLoadModule(p);
try {
 const f=await load('/harness/fixtures/shop-c2-align.ts');
 const {shopRecommendation,SHOP_C2_RECOMMENDATION_SEMANTICS,SHOP_RECOMMENDATION_SEMANTICS}=await load('/src/game/ShopRecommendation.ts');
 const {shopRouteGrowthFacts}=await load('/src/game/ShopRouteGrowthFacts.ts');
 const relations=await load('/src/game/ShopRouteRelations.ts');
 const {r2CreateJoker}=await load('/src/domain/r2Run.ts');
 const {r2Price}=await load('/src/domain/r2Shop.ts');
 const {makeCheckpoint,readCheckpoint}=await load('/src/application/checkpoint.ts');
 const {r2ColdOpening}=await load('/src/domain/r2ComboGrowth.ts');
 const {stableHash}=await load('/src/domain/hash.ts');
 const offer=(s,id)=>({offerId:'public/'+id,definitionId:id,price:r2Price(id,'none',s),edition:'none',consumed:false});
 const recommendation=(s,id,focus='group')=>shopRecommendation(s,offer(s,id),focus);
 const prior=(await baseline.ssrLoadModule('/src/game/ShopRecommendation.ts')).shopRecommendation;
 const definitions=(await load('/src/domain/r2ContentProfiles.ts')).r2JokerDefinitionsFor;
 const legacyState=f.shopC2Fixture([],true),legacyRegression=[];
 for(const d of definitions(legacyState))for(const focus of ['group','straight','flush']) {const old=prior(legacyState,offer(legacyState,d.id),focus),now=recommendation(legacyState,d.id,focus);assert.deepEqual(now,old);legacyRegression.push({id:d.id,focus,before:old,after:now});}
 const six=['mantangcai','c04','c06','jiedongfeng','e11','f10'];
 const rows=[];
 for(const legacy of [true,false]) {
  const s=f.shopC2Fixture([],legacy),before=structuredClone(s);
  rows.push({identity:{contentVersion:s.contentVersion,contentHash:s.contentHash},legacy,six:six.map(id=>({id,recommendation:recommendation(s,id)}))});
  assert.deepEqual(s,before);
 }
 const scores=[];
 for(const [label,s,ids] of [
  ['mantang90',f.shopC2Fixture(['mantangcai']),['spades-7','hearts-7']],
  ['c04-four-straight',f.shopC2Fixture(['c04','c08']),['spades-2','hearts-3','clubs-4','diamonds-5']],
  ['flush-house',f.shopC2PublicDeck(f.shopC2Fixture(['c06','jiedongfeng','c07']),{7:10,8:10}),['public/7/0','public/7/1','public/7/2','public/8/0','public/8/1']],
  ['flush-five',f.shopC2PublicDeck(f.shopC2Fixture(['c06','jiedongfeng','c07']),{7:10,8:10}),Array.from({length:5},(_,i)=>'public/7/'+i)]
 ]) {
  const before=structuredClone(s),score=f.shopC2Score(s,ids);
  scores.push({label,state:s,...score,recommendations:s.jokers.map(j=>({id:j.definitionId,recommendation:recommendation(s,j.definitionId,'flush')})),d09:recommendation(s,'d09','flush')});
  assert.deepEqual(s,before);
 }
 let rescue=f.shopC2Fixture(['f10']);const rescueCommands=[];
 const rescueSend=action=>{const r=f.shopC2Send(rescue,action);rescue=r.state;rescueCommands.push(r.command);};
 rescueSend({type:'LeaveShop'});rescueSend({type:'EnterStage'});
 const formed=['spades-7','hearts-7','clubs-8','diamonds-8','spades-2'];
 rescue.handOrder=[...formed,...rescue.deckInstances.filter(c=>!formed.includes(c.id)).slice(0,rescue.stage.handLimit-formed.length).map(c=>c.id)];rescue.drawPile=rescue.deckInstances.map(c=>c.id).filter(id=>!rescue.handOrder.includes(id));
 const beforeDiscard=structuredClone(rescue);rescueSend({type:'DiscardHand',selectedIds:['spades-2']});const armed=structuredClone(rescue);
 assert.equal(r2ColdOpening(rescue.stage.openingDiscard),false);assert.equal(rescue.jokers[0].counters.rescueArmed,true);
 rescueSend({type:'PlayHand',selectedIds:formed.slice(0,4)});assert.equal(rescue.jokers[0].counters.rescueArmed,false);
 assert.ok(rescue.lastTrace.events.some(e=>e.sourceInstanceId==='held/f10'&&e.operation==='rescue-multiplier'&&e.value.n==='3'));
 const history=f.shopC2EarnedHistory(),s=structuredClone(history.state);
 s.jokers=['e11','e06','e05','b10','c08'].map(id=>r2CreateJoker(id,'retained/'+id,8,'none',s));s.gold=40;
 s.jokers[0].growth.coefficient={n:'3',d:'2'};s.jokers[3].growth.heat={n:'20',d:'1'};s.shop.offers=[offer(s,'c04')];
 assert.ok(readCheckpoint(makeCheckpoint(s,[])).ok);
 const before=structuredClone(s),facts=shopRouteGrowthFacts(s),transaction=relations.shopReplacementTransactionFacts(s,s.shop.offers[0],s.jokers[3]);
 const compact=relations.shopReplacementCompactFacts(s,s.jokers[3],transaction),sale=relations.shopSaleConsequences(s,s.jokers[3]);assert.deepEqual(s,before);
 const sold=f.shopC2Send(s,{type:'SellJoker',instanceId:s.jokers[3].instanceId});
 const bought=f.shopC2Send(sold.state,{type:'BuyOffer',offerId:s.shop.offers[0].offerId});
 assert.deepEqual(bought.state.routeGrowth,s.routeGrowth);assert.deepEqual(bought.state.jokers[0].growth.coefficient,{n:'3',d:'2'});assert.ok(readCheckpoint(makeCheckpoint(bought.state,[])).ok);
 const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),semantics:{legacy:SHOP_RECOMMENDATION_SEMANTICS,c2:SHOP_C2_RECOMMENDATION_SEMANTICS},legacyRegression,scope:'Controlled public fixtures plus actual commands/scorer; no natural acquisition, future draws, EV or synthetic saved trace/history.',rows,scores,rescue:{beforeDiscard,armed,after:rescue,commands:rescueCommands,coldOpening:false},history,transaction:{before,facts,transaction,compact,sale,sold,bought,freshGrowth:bought.state.jokers.find(j=>j.definitionId==='c04').growth,readOnlyHash:stableHash(before)},status:'PASS'};
 const dir=process.env.C2_FACT_OUTPUT??'/tmp/shop-c2-facts';await mkdir(dir,{recursive:true});await writeFile(dir+'/facts.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({head:result.head,status:result.status,sixRows:rows.length,scoreInputs:scores.length,actualClears:history.clears.length,rescueCold:false,transactionRouteUnchanged:true}));
} finally {await server.close();await baseline.close();}
