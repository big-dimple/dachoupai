import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from './ui.mjs';

const root=process.cwd(),port=5471,dir=process.env.VALUE_REVIEW_OUTPUT??'/tmp/shop-full-slot-value-review';
await mkdir(dir,{recursive:true});
const server=await createServer({root,mode:'e2e',cacheDir:'/tmp/full-slot-value-review-vite',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand,assertRunInvariants}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {r2CreateJoker,r2ScoreContext}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {r2JokerDefinitionsFor}=await server.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
const {r2Price}=await server.ssrLoadModule('/src/domain/r2Shop.ts');
const {previewR2Hand}=await server.ssrLoadModule('/src/domain/scoreR2.ts');
const {shopOfferGuidance}=await server.ssrLoadModule('/src/game/ShopOfferGuidance.ts');
const {shopRouteAdvice,shopReplacementFacts}=await server.ssrLoadModule('/src/game/ShopRouteRelations.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const report={head:git(['rev-parse','HEAD']),sourceTree:git(['rev-parse','HEAD:src']),sourceChanges:git(['status','--short','--','src','tests','public']),harnessSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),scope:'Read-only controlled current-identity shop imports, actual mouse/touch UI and screenshots; paired real scorer counterexamples on public cards and clone-only real transaction commands. No product change, natural acquisition, natural games, physical-device acceptance or deployment.',cases:[],counterexamples:[]};
function send(s,action){const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/review/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});assert.ok(r.ok,r.code);return r.state;}
function base(){let s=createRun({seed:'full-slot-value-review',runId:'full-slot-value-review',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});for(const a of [{type:'LeaveShop'},{type:'SkipStage'},{type:'OpenShop'}])s=send(s,a);s.gold=40;s.purchaseCoupons=0;return s;}
function makeCase(key){const s=base();let ids=['mantangcai','b02','b03','e01','e04'],offers=['b04','e08','c08'];
 if(key==='open-same-role')ids=ids.slice(0,4);
 if(key==='protected-other'){ids=['b03','b08','e01','e04','c08'];offers=['b10','b04','e08'];}
 if(key.startsWith('cash-')){s.gold=21;ids=['e08','b03','b08','e01','c08'];offers=['b10','d07','f10'];}
 s.jokers=ids.map((id,i)=>r2CreateJoker(id,'value-held/'+i,key==='cash-loss'&&i===4?2:8,key==='protected-other'&&i===4?'foil':undefined,s));
 if(key==='full-same-role'||key==='open-same-role')s.jokers.find(j=>j.definitionId==='b03').growth.multiplier={n:'1',d:'1'};
 s.shop.offers=offers.map((definitionId,i)=>({offerId:'value-offer/'+i,definitionId,price:r2Price(definitionId,'none',s),consumed:false}));
 assertRunInvariants(s);assert.ok(readCheckpoint(makeCheckpoint(s,[])).ok);return s;}

// Finite paired examples show why a slot/role heuristic cannot stand for purchase value.
const origin=makeCase('full-same-role'),original=structuredClone(origin);
const pick=(rank,suit)=>origin.deckInstances.find(c=>c.rank===rank&&c.suit===suit);
const hand=[pick(7,'spades'),pick(7,'hearts'),pick(8,'clubs'),pick(8,'diamonds'),pick(10,'clubs'),pick(11,'diamonds'),pick(12,'spades'),pick(14,'hearts')];assert.ok(hand.every(Boolean));
function score(s,selectedIds){return previewR2Hand({rulesVersion:'r2',runId:s.runId,rootId:'value-review/public-example',hand,selectedIds,disabledIds:[],jokers:s.jokers,definitions:r2JokerDefinitionsFor(s),handLevels:s.handLevels,playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,...r2ScoreContext(s,hand,selectedIds)});}
for(const [offerIndex,soldIndex] of [[0,1],[1,3]]){const o=origin.shop.offers[offerIndex],sold=origin.jokers[soldIndex],afterSale=send(origin,{type:'SellJoker',instanceId:sold.instanceId}),after=send(afterSale,{type:'BuyOffer',offerId:o.offerId});
 for(const count of [2,4]){const selectedIds=hand.slice(0,count).map(c=>c.id),before=score(origin,selectedIds),changed=score(after,selectedIds);report.counterexamples.push({offerId:o.definitionId,soldId:sold.definitionId,originalGuidance:shopOfferGuidance(origin,o),hand,selectedIds,retainedInput:{jokers:origin.jokers,gold:origin.gold,handLevels:origin.handLevels,scoreContext:r2ScoreContext(origin,hand,selectedIds)},transaction:{afterSale:afterSale.jokers,goldAfterSale:afterSale.gold,afterPurchase:after.jokers,goldAfterPurchase:after.gold},replacementFacts:shopReplacementFacts(origin,o,sold,'group'),retainedPreview:before,replacedPreview:changed,delta:(BigInt(changed.scoreRange.minimum)-BigInt(before.scoreRange.minimum)).toString(),limitation:'Only this fixed public hand/context; no expected score, stage win, trigger frequency or global optimum claim.'});}}
assert.deepEqual(origin,original,'clone-only real transaction and public preview leave the input unchanged');
assert.ok(report.counterexamples.some(r=>r.offerId==='b04'&&BigInt(r.delta)>0n));assert.ok(report.counterexamples.some(r=>r.offerId==='b04'&&BigInt(r.delta)<0n));

const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const snapshot=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return{state:s.run.state,journal:s.run.journal,slots:await s.storage.read()};});
const idle=p=>p.waitForFunction(()=>{const s=window.__harness?.game.scene.getScene('shop');return s?.ready&&s.view.root.alpha===1&&!s.tweens.isTweening(s.view.root)&&s.offerArts.every(a=>a.alpha===1&&!s.tweens.isTweening(a));});
const frame=p=>p.evaluate(()=>new Promise(r=>window.__harness.game.events.once('poststep',r)));
async function importRun(p,s){await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'controlled-full-slot-value.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});await waitScene(p,'shop');await idle(p);await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.run.jokers.every(j=>s.textures.exists('p08-joker-'+j.definitionId))&&s.run.shop.offers.every(o=>s.textures.exists('p08-joker-'+o.definitionId));});await frame(p);}
async function rendered(p){return p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),rows=[];const walk=list=>{for(const o of list){if(o.getData?.('offerId')&&['shop/offer-advice','shop/offer-routes','shop/offer-purpose','shop/offer-reason'].includes(o.name)){const b=o.getBounds();let alpha=o.alpha;for(let a=o.parentContainer;a;a=a.parentContainer)alpha*=a.alpha;rows.push({name:o.name,offerId:o.getData('offerId'),text:o.text,stars:o.getData('stars'),reason:o.getData('reason'),bounds:{x:b.x,y:b.y,width:b.width,height:b.height},visible:o.visible,effectiveAlpha:alpha});}if(o.list)walk(o.list);}};walk(s.children.list);return rows;});}
try{for(const spec of [{width:1180,height:757,touch:false},{width:390,height:844,touch:true}]){const p=await browser.newPage({viewport:{width:spec.width,height:spec.height},hasTouch:spec.touch});p.on('dialog',d=>d.accept());await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');
 for(const key of ['full-same-role','open-same-role','protected-other','cash-preserved','cash-loss']){const row={...spec,key,errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));const s=makeCase(key);await importRun(p,s);row.before=await snapshot(p);assert.deepEqual(row.before.state,s);row.advice=shopRouteAdvice(s,'group');row.offers=s.shop.offers.map(o=>({offer:o,name:r2JokerDefinitionsFor(s).find(d=>d.id===o.definitionId).name,guidance:shopOfferGuidance(s,o)}));row.rendered=await rendered(p);row.screenshot=`${spec.width}x${spec.height}-${key}.png`;await p.screenshot({path:dir+'/'+row.screenshot,scale:'css'});
  if(['full-same-role','protected-other'].includes(key))assert.ok(row.offers.every(o=>o.guidance.stars===1));
  if(key==='open-same-role')assert.equal(row.offers[0].guidance.stars,2);
  if(key==='cash-preserved')assert.equal(row.offers[0].guidance.stars,2);
  if(key==='cash-loss'){assert.equal(row.offers[0].guidance.stars,1);assert.ok(row.offers[0].guidance.detail.includes('21→18'));}
  if(key==='full-same-role'||key==='cash-loss'){await tapUI(p,'shop','offer/'+s.shop.offers[0].offerId,spec.touch);await p.locator('.detail-dialog[open]').waitFor();row.detailText=await p.locator('.detail-dialog[open]').innerText();row.detailScreenshot=`${spec.width}x${spec.height}-${key}-detail.png`;await frame(p);await p.screenshot({path:dir+'/'+row.detailScreenshot,scale:'css'});assert.ok(row.detailText.includes('槽位已满'));assert.ok(await p.getByRole('button',{name:/^邀请 · \d+ 金$/}).isDisabled());await p.getByText('规则与操作',{exact:true}).click();row.expandedDetailText=await p.locator('.detail-dialog[open]').innerText();row.expandedScreenshot=`${spec.width}x${spec.height}-${key}-expanded.png`;await p.screenshot({path:dir+'/'+row.expandedScreenshot,scale:'css'});await p.getByRole('button',{name:'取消',exact:true}).click();}
  assert.deepEqual(await snapshot(p),row.before,'shelf and native detail/cancel preserve full state/journal/IndexedDB');assert.deepEqual(row.errors,[]);row.status='REPRODUCED';
 }await p.close();}report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e);throw e;}
finally{await writeFile(dir+'/full-state-journal-idb.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report);for(const r of brief.cases)if(r.before)r.before={gold:r.before.state.gold,contentVersion:r.before.state.contentVersion,contentHash:r.before.state.contentHash,commandSeq:r.before.state.commandSeq,held:r.before.state.jokers,journalLength:r.before.journal.length};await writeFile(dir+'/report.json',JSON.stringify(brief,null,2));await browser.close();await server.close();}
