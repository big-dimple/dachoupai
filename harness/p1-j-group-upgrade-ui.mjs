/** Bounded normal-entry proof. Controlled rare-card saves are explicitly separated from natural deals. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter,openSelector,tapUI,waitScene,tapMenuAction} from './ui.mjs';
import {snapshotSource} from '../scripts/check-runner.mjs';
const dir=process.env.GROUP_UI_DIR||'shots/p1-j-group-upgrade-ui',before=snapshotSource(process.cwd());
await mkdir(dir,{recursive:true});
const version='quality-r2-group-upgrade-prototype-v1',hash='json-fnv-v1:5025cc23c013987f';
const report={source:before.head,before,scope:'Software Canvas; normal new runs and bounded natural public-hand route. Rare b06/B13 saves are controlled legal fixtures, not natural acquisition or balance proof.',limits:{additionalStages:2,actionsPerStage:9,newSeeds:0},cases:[],screenshots:[]};
const ssr=await createServer({server:{middlewareMode:true},logLevel:'error'}),fixtures=[];
let classify,definitions;
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts'),{r2DisabledCards}=await ssr.ssrLoadModule('/src/domain/r2Chapter.ts');
 classify=(await ssr.ssrLoadModule('/src/domain/r2SelectionFacts.ts')).r2SelectionFacts;definitions=(await ssr.ssrLoadModule('/src/domain/r2ContentProfiles.ts')).r2JokerDefinitionsFor;
 const send=(s,action)=>{const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});assert.ok(r.ok,r.code);return r.state;};
 const main=['spades-9','hearts-9','clubs-13','diamonds-13'],full=['spades-9','hearts-9','clubs-9','clubs-13','diamonds-13'];
 for(const spec of [
  {name:'b06-left-tie-disabled-assist',ids:['b06'],boss:{definitionId:'B03',disabledSuit:'spades'},chapter:1,index:2,seen:['B03'],hand:[...main,'clubs-12','hearts-12','clubs-6','diamonds-7'],main,assist:['clubs-12','hearts-12']},
  {name:'b06-plain-flush',ids:['b06'],hand:['spades-3','spades-7','spades-11','spades-12','spades-14','hearts-2','clubs-6','diamonds-9'],main:['spades-3','spades-7','spades-11','spades-12','spades-14']},
  {name:'B13-full-house',ids:['a11','b06'],boss:{definitionId:'B13',disabledSuit:null},chapter:7,index:20,seen:['B01','B02','B03','B04','B05','B06','B13'],hand:[...full,'spades-12','hearts-12','diamonds-7'],main:full}
 ]){
  let s=createRun({seed:'group-ui-fixture',runId:spec.name,characterId:'amo',rulesVersion:'r2',r2Profile:'group-upgrade-v1',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  s.jokers=spec.ids.map(id=>r2CreateJoker(id,id,8,spec.name==='B13-full-house'?'holographic':undefined,s));
  if(spec.boss)Object.assign(s,{chapter:spec.chapter,stageIndex:spec.index,phase:'stage-ready',shop:null,boss:spec.boss,seenBossIds:spec.seen});else s=send(s,{type:'LeaveShop'});
  s=send(s,{type:'EnterStage'});s.handOrder=spec.hand;s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));s.stage.disabledIds=r2DisabledCards(s.stage.boss,s.stageIndex,s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)));
  const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok,spec.name+' initial');
  const after=send(s,spec.assist?{type:'PlayAssistedHand',selectedIds:spec.main,assistIds:spec.assist}:{type:'PlayHand',selectedIds:spec.main});assert.ok(readCheckpoint(makeCheckpoint(after,[])).ok,spec.name+' result');
  fixtures.push({...spec,checkpoint:cp,expected:after.lastTrace});
 }
}finally{await ssr.close();}
const oldRoutes=JSON.parse(await readFile('docs/production/evidence/p1-j-group-upgrade-2026-10-05/final/natural-candidates-PASS.json','utf8'));
const legacy=oldRoutes.routes.find(r=>r.seed==='group-natural-17'&&r.initial.state.contentHash==='json-fnv-v1:e7d21fce68b80072');
assert.equal(legacy.initial.state.jokers.length,0,'legacy source is an empty-inventory natural initial save');
await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'error'});report.build=JSON.parse(await readFile(dir+'/build/build-info.json','utf8'));
const server=await preview({build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5371,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});report.browser=browser.version();
const state=p=>p.evaluate(()=>window.__harness.game.registry.get('runController').state),saved=p=>p.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,export:c.exportJSON()};});
const settled=p=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
const changed=(p,seq)=>p.waitForFunction(seq=>{const c=window.__harness.game.registry.get('runController');return c.status==='idle'&&c.state.commandSeq>seq;},seq);
const readyShop=async p=>{await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(370);};
const readyIntermission=async p=>{await waitScene(p,'intermission');await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').ready);};
const shot=async(p,name)=>{await p.screenshot({path:dir+'/'+name+'.png',scale:'css',fullPage:true});report.screenshots.push(name+'.png');};
const inspect=async(p,kind,id,name)=>{await tapUI(p,kind,id,true);const dialog=p.getByRole('dialog'),text=await dialog.innerText();for(const box of await dialog.getByRole('button').evaluateAll(bs=>bs.map(b=>b.getBoundingClientRect().toJSON())))assert.ok(box.width>=44&&box.height>=44,'detail control 44px');await shot(p,name);if(text.includes('本次最大同点组')){await dialog.locator('.card-ability small').scrollIntoViewIfNeeded();await shot(p,name+'-group');}await dialog.getByRole('button',{name:kind==='shop'&&id.startsWith('offer/')?'取消':'关闭',exact:true}).tap();await p.waitForTimeout(370);return text;};
const play=async(p,ids,assist)=>{await settled(p);const s=await state(p);for(const id of ids){assert.ok(s.handOrder.includes(id),'visible '+id);await tapUI(p,'game','card/'+id,true);}if(assist)await tapUI(p,'game','selection/assist-'+assist.join('+'),true);await tapUI(p,'game','action/play',true);await changed(p,s.commandSeq);if((await state(p)).phase==='await-input')await settled(p);else await readyIntermission(p);return saved(p);};
const importSave=async(p,cp,name)=>{await p.locator('.run-menu-toggle').tap();await p.getByText('进度与存档',{exact:true}).tap();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:name+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});};
const reloadAndReplay=async(p,after,name)=>{
 await p.reload();await waitScene(p,'title');assert.deepEqual(await state(p),after.state);await tapUI(p,'title','action/title-continue',true);
 if(after.state.phase==='await-input'){await waitScene(p,'game');await settled(p);await tapMenuAction(p,'回看上一手',true);await settled(p);}else await readyIntermission(p);
 assert.deepEqual(await saved(p),after,'refresh/replay never grows or pays again');
 if(after.state.phase==='await-input')await tapMenuAction(p,'上手详情',true);else await tapUI(p,'intermission','action/last-hand',true);
 const text=await p.getByRole('dialog').innerText();await shot(p,name);await p.getByRole('button',{name:'关闭',exact:true}).tap();assert.deepEqual(await saved(p),after,'ledger is read only');return text;
};
const runCase=async(name,scope,work,spec={width:390,height:740},seed='group-natural-17')=>{
 if(process.env.GROUP_CASES&&!process.env.GROUP_CASES.split(',').includes(name))return;
 const row={name,scope,spec,status:'RUNNING',errors:[]};report.cases.push(row);const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:true,reducedMotion:'reduce',deviceScaleFactor:1}),p=await ctx.newPage();p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
 try{await p.addInitScript(spec=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--safe-top',(spec.top||0)+'px');document.documentElement.style.setProperty('--safe-bottom',(spec.bottom||0)+'px');}),spec);await p.goto('http://127.0.0.1:5371/?harness=1&seed='+seed);await waitScene(p,'title');await work(p,row);assert.deepEqual(row.errors,[]);row.status='PASS';}catch(e){row.status='FAIL';row.error=String(e);row.stack=e.stack;row.observedFailure=await p.evaluate(()=>{const g=window.__harness.game,s=g.scene.getScene('game'),c=g.registry.get('runController');return{active:g.scene.getScenes(true).map(s=>s.scene.key),status:c.status,run:c.state,ready:s.ready,playing:s.playing,presentation:!!s.presentation};});await shot(p,name+'-FAIL').catch(()=>{});console.error(name,row.error);}finally{await ctx.close();await writeFile(dir+'/report-progress.json',JSON.stringify(report,null,2)+'\n');}
};
// Only visible hand classification is consulted; no future cards, RNG, or score simulation.
const publicChoice=s=>{const hand=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)),choices=[],ids=[];const visit=start=>{if(ids.length){const f=classify({hand,selectedIds:ids,jokers:s.jokers,definitions:definitions(s),handRules:s.handRules,disabledIds:s.stage.disabledIds});choices.push({ids:[...ids],type:f.type});}if(ids.length===5)return;for(let i=start;i<hand.length;i++){ids.push(hand[i].id);visit(i+1);ids.pop();}};visit(0);const order=['flush-five','flush-house','five-kind','four-kind','full-house','straight-flush','flush','straight','three-kind','two-pair','pair','high-card'];choices.sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type)||b.ids.length-a.ids.length);return choices[0];};
try{
 for(const spec of [{width:320,height:568},{width:390,height:740},{width:844,height:300,top:12,bottom:34}])await runCase('selector-'+spec.width,'normal selector geometry',async(p,row)=>{
  await openSelector(p,true);await tapUI(p,'character-select','character/amo',true);row.geometry=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),all=walk(s.children.list);return{texts:all.filter(o=>o.type==='Text'&&o.visible).map(o=>({text:o.text,font:o.style.fontSize,bounds:o.getBounds()})),controls:all.filter(o=>o.input?.enabled).map(o=>({name:o.name,bounds:o.getBounds()}))};});
  const title=row.geometry.texts.find(t=>t.text==='巡演选角'),intersects=(a,b)=>a.x<b.x+b.width-.1&&b.x<a.x+a.width-.1&&a.y<b.y+b.height-.1&&b.y<a.y+a.height-.1;assert.ok(title);assert.ok(row.geometry.texts.some(t=>t.text.includes('主手＋助攻（试行）')));assert.ok(!row.geometry.texts.some(t=>/单张|Lv3/.test(t.text)));for(const c of row.geometry.controls){assert.ok(c.bounds.width>=44&&c.bounds.height>=44,c.name);assert.ok(!intersects(title.bounds,c.bounds),c.name+' title overlap');}await shot(p,row.name);
 },spec);
 for(const id of ['amo','touye','laohuan','erxiang','azao','xiemu'])await runCase('normal-'+id,'ordinary Title → CharacterSelect → new run; natural first deal',async(p,row)=>{
  await chooseCharacter(p,id,true);await readyShop(p);let s=await state(p);assert.equal(s.contentVersion,version);assert.equal(s.contentHash,hash);assert.equal(s.characterId,id);row.identity={version:s.contentVersion,hash:s.contentHash};
  if(id==='erxiang'){
   const offer=s.shop.offers.find(o=>o.definitionId==='b10');assert.ok(offer);assert.equal(offer.price,4);row.offer=offer;row.shopCopy=await inspect(p,'shop','offer/'+offer.offerId,'natural-b10-shop-390');assert.match(row.shopCopy,/普通/);assert.match(row.shopCopy,/对子、两对、三条、葫芦/);assert.match(row.shopCopy,/下一次出牌/);
   await tapUI(p,'shop','offer/'+offer.offerId,true);await p.getByRole('button',{name:'确认购买',exact:true}).tap();await changed(p,s.commandSeq);s=await state(p);assert.equal(s.gold,2);row.ownedCopy=await inspect(p,'shop','joker/'+s.jokers[0].instanceId,'natural-b10-owned-390');
   row.labels=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]);return walk(s.children.list).filter(o=>o.name==='joker-ability').map(o=>({text:o.text,font:o.style.fontSize}));});assert.ok(row.labels.every(o=>parseFloat(o.font)>=14));
  }
  await tapUI(p,'shop','action/start-stage',true);await waitScene(p,'game');await settled(p);s=await state(p);row.assistUI=await p.evaluate(()=>window.__harness.game.scene.getScene('game').assistProfile);assert.equal(row.assistUI,id==='amo');assert.equal(Object.hasOwn(s.stage,'assistUsed'),id==='amo');row.initialHand=s.handOrder;
  if(id==='erxiang'){
   row.first=await play(p,['hearts-2','spades-2','clubs-14','diamonds-14']);assert.equal(row.first.state.lastTrace.finalScore,'318');assert.deepEqual(row.first.state.jokers[0].growth.heat,{n:'10',d:'1'});
   row.firstLedger=await reloadAndReplay(p,row.first,'natural-b10-first-restored');assert.match(row.firstLedger,/结算后保存热度成长：\+10/);
   row.second=await play(p,['diamonds-5','diamonds-4','spades-4','clubs-5']);assert.equal(row.second.state.lastTrace.finalScore,'325');assert.deepEqual(row.second.state.jokers[0].growth.heat,{n:'20',d:'1'});
   row.secondLedger=await reloadAndReplay(p,row.second,'natural-b10-second-restored');assert.match(row.secondLedger,/结算后保存热度成长：\+20/);assert.match(row.secondLedger,/本次读取成长：\+10/);
   row.extension=[];row.observed={fullHouse:false,carriedStraightOrFlush:false,naturalAffordableB03orB06:false};
   for(let stage=0;stage<2&&(await state(p)).phase==='stage-cleared';stage++){
    await tapUI(p,'intermission','action/continue-stage',true);await readyShop(p);s=await state(p);const extension={stage:s.stageIndex,offers:s.shop.offers,gold:s.gold,steps:[]};row.extension.push(extension);row.observed.naturalAffordableB03orB06||=s.shop.offers.some(o=>['b03','b06'].includes(o.definitionId)&&o.price<=s.gold);
    await tapUI(p,'shop','action/start-stage',true);await waitScene(p,'game');await settled(p);
    for(let n=0;n<9&&(await state(p)).phase==='await-input';n++){
     s=await state(p);const chosen=publicChoice(s);const a=await play(p,chosen.ids);extension.steps.push({visibleHand:s.handOrder,chosen,beforeHeat:s.jokers[0].growth.heat,trace:a.state.lastTrace,afterHeat:a.state.jokers[0].growth.heat});row.observed.fullHouse||=chosen.type==='full-house';row.observed.carriedStraightOrFlush||=['straight','flush','straight-flush'].includes(chosen.type)&&Number(s.jokers[0].growth.heat.n)>0;
    }
    extension.final=await saved(p);
   }
   row.extensionFinal=await saved(p);row.observations=Object.fromEntries(Object.entries(row.observed).map(([k,v])=>[k,v?'OBSERVED':'NOT_OBSERVED']));await shot(p,'natural-b10-extension-final');
  }
 });
 await runCase('natural-b08','normal new run, natural purchase/deal and saved income',async(p,row)=>{await chooseCharacter(p,'erxiang',true);await readyShop(p);const s=await state(p),o=s.shop.offers.find(o=>o.definitionId==='b08');assert.ok(o);assert.equal(o.price,6);row.offer=o;row.shopCopy=await inspect(p,'shop','offer/'+o.offerId,'natural-b08-shop');assert.match(row.shopCopy,/对子、两对、三条、葫芦/);await tapUI(p,'shop','offer/'+o.offerId,true);await p.getByRole('button',{name:'确认购买',exact:true}).tap();await changed(p,s.commandSeq);await tapUI(p,'shop','action/start-stage',true);await waitScene(p,'game');await settled(p);row.first=await play(p,['clubs-8','hearts-8','spades-6','diamonds-6']);assert.equal(row.first.state.lastTrace.finalScore,'325');row.second=await play(p,['diamonds-4','hearts-4','clubs-9','diamonds-9']);assert.equal(row.second.state.lastTrace.finalScore,'318');assert.equal(row.second.state.gold,9);row.ledger=await reloadAndReplay(p,row.second,'natural-b08-restored-income');assert.match(row.ledger,/同点组合过关收入 \+3金/);},undefined,'group-natural-6');
 await runCase('legacy-e7-b10','native import of unchanged empty-inventory natural old save; real purchase/deals',async(p,row)=>{
  await importSave(p,legacy.initial,'legacy-e7-natural');await readyShop(p);const s=await state(p),o=s.shop.offers.find(o=>o.definitionId==='b10');assert.equal(s.contentHash,'json-fnv-v1:e7d21fce68b80072');assert.ok(o);assert.equal(o.price,6);row.offer=o;row.copy=await inspect(p,'shop','offer/'+o.offerId,'legacy-e7-b10-shop');assert.match(row.copy,/特别/);assert.doesNotMatch(row.copy,/同点数组合/);await tapUI(p,'shop','offer/'+o.offerId,true);await p.getByRole('button',{name:'确认购买',exact:true}).tap();await changed(p,s.commandSeq);await tapUI(p,'shop','action/start-stage',true);await waitScene(p,'game');await settled(p);row.first=await play(p,['hearts-2','spades-2','clubs-14','diamonds-14']);assert.equal(row.first.state.lastTrace.finalScore,'318');row.second=await play(p,['diamonds-5','diamonds-4','spades-4','clubs-5']);assert.equal(row.second.state.lastTrace.finalScore,'290');assert.deepEqual(row.second.state.jokers[0].growth,{});row.ledger=await reloadAndReplay(p,row.second,'legacy-e7-b10-restored');assert.doesNotMatch(row.ledger,/结算后保存热度成长/);
 });
 for(const fixture of fixtures)await runCase(fixture.name,'controlled legal rare-card fixture; no natural acquisition claim',async(p,row)=>{
  await importSave(p,fixture.checkpoint,fixture.name);await waitScene(p,'game');await settled(p);for(const id of fixture.main)await tapUI(p,'game','card/'+id,true);if(fixture.assist)await tapUI(p,'game','selection/assist-'+fixture.assist.join('+'),true);
  row.targetCopy=await inspect(p,'game','joker/'+fixture.ids.at(-1),fixture.name+'-target');if(fixture.name==='b06-left-tie-disabled-assist'){assert.match(row.targetCopy,/本次最大同点组/);assert.match(row.targetCopy,/9♠.*9♥/);assert.match(row.targetCopy,/有效牌：9♥/);assert.doesNotMatch(row.targetCopy,/有效牌：.*Q/);}
  const s=await state(p);await tapUI(p,'game','action/play',true);await changed(p,s.commandSeq);if((await state(p)).phase==='await-input')await settled(p);else await readyIntermission(p);row.after=await saved(p);assert.deepEqual(row.after.state.lastTrace,fixture.expected,'UI score equals authoritative legal fixture trace');
  const es=row.after.state.lastTrace.events;if(fixture.name==='b06-left-tie-disabled-assist')assert.deepEqual(es.filter(e=>e.sourceDefinitionId==='b06'&&e.operation==='retrigger-card').map(e=>e.targetCardId),['hearts-9']);if(fixture.name==='b06-plain-flush')assert.ok(!es.some(e=>e.sourceDefinitionId==='b06'));
  if(fixture.name==='B13-full-house'){assert.deepEqual(es.filter(e=>e.phase==='onCardScore'&&e.targetCardId===fixture.main[0]&&e.sourceType==='joker').map(e=>e.sourceDefinitionId),['a11','b06']);assert.deepEqual(es.filter(e=>e.phase==='jokerScore').map(e=>e.sourceDefinitionId),['b06','a11']);}
  row.ledger=await reloadAndReplay(p,row.after,fixture.name+'-restored-ledger');if(fixture.name!=='b06-plain-flush')assert.match(row.ledger,/本次再次计分来源：再说一遍/);
 },fixture.name==='b06-left-tie-disabled-assist'?{width:320,height:568}:fixture.name==='B13-full-house'?{width:844,height:300,top:12,bottom:34}:undefined);
}finally{
 report.after=snapshotSource(process.cwd());report.unchanged=JSON.stringify(before)===JSON.stringify(report.after);await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await server.httpServer.close();
}
assert.ok(report.unchanged,'source/index/HEAD frozen');process.exitCode=report.cases.some(c=>c.status==='FAIL')?1:0;console.log(JSON.stringify({source:report.source,cases:report.cases.map(({name,status,error,observations})=>({name,status,error,observations})),unchanged:report.unchanged},null,2));
