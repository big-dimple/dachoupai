import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';

// Offline only: no browser, saves, product-state patches, network or future-deck choices.
const count=Number(process.env.SUSHI_SAMPLES??16384),preparedCount=Number(process.env.SUSHI_PREPARED_SAMPLES??2048),discardCount=Number(process.env.SUSHI_DISCARD_SAMPLES??1024);
for(const n of [count,preparedCount,discardCount])assert.ok(Number.isSafeInteger(n)&&n>0&&n<=32768);
const out=process.env.SUSHI_OUT??'shots/sushi-balance',started=Date.now();await mkdir(out,{recursive:true});
const ssr=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'error'});
let m,officialAssist,definitions;try{m=await ssr.ssrLoadModule('/harness/fixtures/sushi-balance-model.ts');({assistCandidates:officialAssist}=await ssr.ssrLoadModule('/src/game/AssistSelection.ts'));({r2JokerDefinitionsFor:definitions}=await ssr.ssrLoadModule('/src/domain/r2ContentProfiles.ts'));}finally{await ssr.close();}
const {ROUTES,MODELS}=m,reference=m.freshSushi('sushi-balance/reference'),hash=createHash('sha256');
let audits=0,commands=0;
const mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
const quantile=(a,q)=>a.length?[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*q)]:null;
const ratio=(n,d)=>d?n/d:null;
const fresh=()=>Object.fromEntries(ROUTES.map(route=>[route,{n:0,main:0,plain:[],models:Object.fromEntries(MODELS.map(model=>[model,{eligible:0,positive:0,beatsGlobal:0,scores:[],effectiveLift:[],signedLift:[],sideCards:[],totalCards:[],multipliers:{},examples:[]}]))}]));
function add(stats,a,seed){for(const route of ROUTES){
 const row=stats[route],plain=a.plain[route];row.n++;if(!plain.main.length)continue;row.main++;row.plain.push(plain.score);
 for(const model of MODELS){const best=a.skill[model][route],r=row.models[model];r.effectiveLift.push(Math.max(0,best.score/plain.score-1));if(!best.main.length)continue;
  r.eligible++;r.positive+=Number(best.score>plain.score);r.beatsGlobal+=Number(best.score>a.plain.ANY.score);r.scores.push(best.score);r.signedLift.push(best.score/plain.score-1);r.sideCards.push(best.side.length);r.totalCards.push(best.main.length+best.side.length);r.multipliers[best.multiplier]=(r.multipliers[best.multiplier]??0)+1;
  if(r.examples.length<2&&best.score>plain.score)r.examples.push({seed,main:best.main,side:best.side,score:best.score,plainRoute:plain.score,plainGlobal:a.plain.ANY.score});
 }
}}
function summarize(stats){return Object.fromEntries(ROUTES.map(route=>{const r=stats[route];return [route,{samples:r.n,mainExists:r.main,mainRate:ratio(r.main,r.n),meanPlainScore:mean(r.plain),models:Object.fromEntries(MODELS.map(model=>{const s=r.models[model];return [model,{eligible:s.eligible,eligiblePerAll:ratio(s.eligible,r.n),eligibleGivenMain:ratio(s.eligible,r.main),positive:s.positive,positiveGivenMain:ratio(s.positive,r.main),beatsGlobal:s.beatsGlobal,beatsGlobalPerAll:ratio(s.beatsGlobal,r.n),meanAssistedScoreWhenEligible:mean(s.scores),meanSignedLiftWhenEligible:mean(s.signedLift),meanEffectiveLiftGivenMain:mean(s.effectiveLift),medianEffectiveLiftGivenMain:quantile(s.effectiveLift,.5),p90EffectiveLiftGivenMain:quantile(s.effectiveLift,.9),meanSideCardsWhenEligible:mean(s.sideCards),meanTotalConsumedWhenEligible:mean(s.totalCards),multipliers:s.multipliers,examples:s.examples}];}))}];}));}
const natural=fresh(),disabled=fresh();
for(let i=0;i<count;i++){
 const seed='sushi-balance/natural/'+i,state=m.freshSushi(seed),hand=m.visibleHand(state),a=m.analyze(hand);commands+=2;add(natural,a,seed);hash.update(seed+':'+hand.map(c=>c.id).join(',')+'\n');
 if(i<512)audits+=m.audit(hand,a,state);
 if(i<2048){const ids=hand.filter(c=>c.suit==='spades').map(c=>c.id),b=m.analyze(hand,1,'ANY',ids);add(disabled,b,seed);if(i<128)audits+=m.audit(hand,b,state,1,'ANY',ids);}
 if((i+1)%2048===0)console.log('natural',i+1,'/',count,'elapsed',Date.now()-started);
}
const prepared={};for(const [kind,route]of [['flush26','F'],['straight20','S'],['group12','G']]){
 const deck=m.preparedDeck(reference.deckInstances,kind),levels={};for(const level of [1,5]){
  const stats=fresh();for(let i=0;i<preparedCount;i++){
   const seed='sushi-balance/prepared/'+kind+'/'+i,hand=m.sampledHand(deck,seed),a=m.analyze(hand,level,route);add(stats,a,seed);hash.update(level+':'+seed+':'+hand.map(c=>c.id).join(',')+'\n');if(i<128)audits+=m.audit(hand,a,reference,level,route);
  }levels[level]=summarize(stats);
 }prepared[kind]={cards:deck.length,trainedRoute:route,levels};console.log('prepared',kind,'elapsed',Date.now()-started);
}
// One fixed visible-only route policy and common draw stream for every counterfactual.
// Record the first checkpoint where that model could act; never inspect unseen cards.
const discards={};for(const route of ['F','S','P','G']){
 const rows=Object.fromEntries(MODELS.map(model=>[model,{firstAt:[0,0,0,0],failed:0,costs:[],cards:[],effectiveLiftAtHit:[],beatsGlobalAtHit:0}]));let branchCommands=0;
 for(let i=0;i<discardCount;i++){
  let state=m.freshSushi('sushi-balance/discard/'+i),discarded=0;const hit=new Set();commands+=2;
  for(let step=0;step<=3;step++){
   const hand=m.visibleHand(state),a=m.analyze(hand);hash.update(route+':'+i+':'+step+':'+hand.map(c=>c.id).join(',')+'\n');if(i<8)audits+=m.audit(hand,a,state);
   for(const model of MODELS)if(!hit.has(model)&&a.skill[model][route].main.length){
    const r=rows[model],best=a.skill[model][route];r.firstAt[step]++;r.costs.push(step);r.cards.push(discarded);r.effectiveLiftAtHit.push(Math.max(0,best.score/a.plain[route].score-1));r.beatsGlobalAtHit+=Number(best.score>a.plain.ANY.score);hit.add(model);
   }
   // Once current can act, all hypotheses can act and no further search is necessary.
   if(step===3||hit.has('current'))break;
   const ids=m.routeDiscardIds(hand,route),before=state.stage.discardsLeft;state=m.send(state,{type:'DiscardHand',selectedIds:ids});assert.equal(state.stage.discardsLeft,before-1);assert.equal(state.handOrder.length,8);discarded+=ids.length;branchCommands++;commands++;
  }
  for(const model of MODELS)if(!hit.has(model))rows[model].failed++;
 }discards[route]={samples:discardCount,policy:'visible-route-plus-spare-pair; no future inspection; max three ordinary discards; all models share checkpoints',actualDiscardCommands:branchCommands,models:Object.fromEntries(MODELS.map(model=>{const r=rows[model],success=discardCount-r.failed;return [model,{firstAt:r.firstAt,failed:r.failed,success,successRate:success/discardCount,meanCostGivenSuccess:mean(r.costs),meanCardsDiscardedGivenSuccess:mean(r.cards),meanEffectiveLiftAtFirstHit:mean(r.effectiveLiftAtHit),beatsGlobalAtFirstHit:r.beatsGlobalAtHit}];}))};console.log('discard',route,'elapsed',Date.now()-started);
}
// Exact remaining-three enumeration for a nominated five-card flush or straight.
// This does NOT allow changing the nominated main and is not the eight-card best-selection rate.
const exact={};for(const kind of ['flush','straight']){
 const ranks=kind==='flush'?[2,4,6,8,10]:[2,3,4,5,6],main=ranks.map((rank,i)=>reference.deckInstances.find(c=>c.rank===rank&&c.suit===(kind==='flush'?'hearts':['spades','hearts','clubs','diamonds','spades'][i]))),rest=reference.deckInstances.filter(c=>!main.some(a=>a.id===c.id));let n=0,current=0,triple=0,echo=0;
 for(let a=0;a<rest.length;a++)for(let b=a+1;b<rest.length;b++)for(let c=b+1;c<rest.length;c++){
  const remaining=[rest[a],rest[b],rest[c]],hand=[...main,...remaining],facts=officialAssist({hand,selectedIds:main.map(c=>c.id),disabledIds:[],jokers:[],definitions:definitions(reference)},true);n++;current+=Number(facts.length>0);triple+=Number(facts.some(f=>f.assistIds.length===3));echo+=Number(facts.length>0||remaining.some(c=>main.some(a=>a.rank===c.rank)));
 }assert.equal(n,16215);assert.equal(current,2761);assert.equal(triple,37);assert.equal(echo,12631);exact[kind]={samples:n,current,triple,echo,currentRate:current/n,echoRate:echo/n};
}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const report={schemaVersion:1,source:git('rev-parse','HEAD'),sourceStatus:git('status','--short'),scope:'Deterministic offline counterfactual assessment only; formal Su Shi new-run natural draws, exhaustive visible main selection; no player experiment, product rules or saves changed.',models:{current:'actual assist contract: qualified main, separate healthy same-rank pair x2 / triple x4, once per stage', 'pair-main':'hypothesis A: additionally qualify ordinary pair main; unchanged side tiers', 'echo-single-1.25':'hypothesis B: existing qualified main only; when no pair/triple side, one healthy spare matching an actual scoring-core rank gives x1.25; pair/triple unchanged','charged-ceiling':'hypothesis C optimistic ceiling only: unchanged eligibility, two hypothetical missed-hand charges give existing assist x1.5; two prior plays NOT earned or simulated'},seedNamespace:'sushi-balance',natural:summarize(natural),disabledSpadesSensitivity:summarize(disabled),prepared,discards,exactFixedMain:exact,verification:{canonicalScoreAndAssistChecks:audits,mismatches:0,explicitSampleCommandCalls:commands,sampleFingerprint:hash.digest('hex')},elapsedMs:Date.now()-started};
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({report:out+'/report.json',verification:report.verification,elapsedMs:report.elapsedMs}));
