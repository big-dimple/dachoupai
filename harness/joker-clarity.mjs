/** D39: serial natural experience plus explicitly labelled, validated save fixtures. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createServer,preview} from 'vite';
import {chooseCharacter,tapUI,waitScene} from './ui.mjs';

const dir=path.resolve(process.env.JOKER_CLARITY_EVIDENCE_DIR||'shots/joker-clarity/after');
const outDir=path.resolve(process.env.JOKER_CLARITY_BUILD_DIR||path.join(dir,'build')),port=5215;
const ids=['f09','f04','a03','pengci','huimaqiang'];
const effects={f09:'×1.5',f04:'+3',a03:'+35',pengci:'+2',huimaqiang:'×2'};
const operations={f09:'multiply-multiplier',f04:'add-multiplier',a03:'add-heat',pengci:'add-multiplier',huimaqiang:'multiply-multiplier'};
const sha=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const report={status:'IN_PROGRESS',head:git('rev-parse','HEAD'),dirty:git('status','--porcelain=v1'),node:process.version,
  scope:'Natural f09 acquisition/preview/play/recap, followed by separate imported five-Joker boundary fixtures.',
  build:'Existing frozen e2e bundle; this harness never rebuilds.',
  limits:['Linux Chromium Canvas with GPU/software rasterization disabled; physical phones and WebGL NOT_RUN.',
    'Fixture cards/resources/owned Jokers are explicitly enriched test inputs, not natural acquisitions or replay-reachable claims.',
    'Fixture state and checksum are validated, imported through the real menu, and played through the shared command path.',
    'Lucky hand-start income and stage reset boundaries belong to the focused core tests, not this browser route.'],runs:[]};
await mkdir(dir,{recursive:true});
let browser,server,ssr,domain,r2,checkpoint;
const state=p=>p.evaluate(()=>window.__harness.game.registry.get('runController').state);
async function persisted(page){return page.evaluate(async()=>{
  const c=window.__harness.game.registry.get('runController');
  const storage=await new Promise((resolve,reject)=>{const request=indexedDB.open('dachoupai-checkpoints');request.onerror=()=>reject(request.error);request.onupgradeneeded=()=>{request.transaction.abort();reject(Error('Expected existing checkpoint database'));};request.onsuccess=()=>{const db=request.result,tx=db.transaction('saves','readonly'),cursor=tx.objectStore('saves').openCursor(),records=[];cursor.onsuccess=()=>{const row=cursor.result;if(row){records.push({key:row.key,value:row.value});row.continue();}};tx.oncomplete=()=>{db.close();resolve(records);};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};};});
  return {state:c.state,journal:c.journal,status:c.status,exportJSON:c.exportJSON(),storage};
});}
async function settle(page,touch){
  if(!touch)await page.mouse.move(3,200);
  await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.length&&s.cardViews.every(v=>!v.dealing&&!v.back?.visible&&!s.tweens.isTweening(v.container));});
}
async function table(page){return page.evaluate(()=>{
  const g=window.__harness.game,s=g.scene.getScene('game'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),bounds=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
  const source=walk(s.previewCards?.list??[]).find(o=>o.name==='selection-joker-benefits');
  const preview=s.selectedIds.size?s.preview():null;
  return {selected:[...s.selectedIds],score:[s.scoreHeat.text,s.scoreMult.text,s.scoreTotal.text],result:s.resultText.text,
    benefits:source?{text:source.text,width:source.width,height:source.height,area:s.view.layout.playedArea}:null,
    handType:preview?.handType,played:preview?.sets.playedIds,scoring:preview?.sets.scoringIds,events:preview?.breakdown.events,
    jokers:[...s.jokerViews].map(([instanceId,v],index)=>{
      const label=v.getData('valueLabel'),items=walk(v.list),rarity=items.find(o=>o.name==='rarity-badge'),edition=items.find(o=>o.name==='edition-badge');
      const max=label.style.maxLines||Infinity,lines=label.getWrappedText(label.text),slot=s.view.layout.slots[index],labelBox=s.view.layout.jokerLabels[index];
      return {instanceId,definitionId:s.run.jokers.find(j=>j.instanceId===instanceId).definitionId,text:label.text,width:label.width,height:label.height,
        wrapWidth:label.style.wordWrapWidth,maxLines:max,wrappedLines:lines.length,bounds:bounds(label),slot,labelBox,
        rarity:rarity?{value:rarity.getData('rarity'),visible:rarity.visible,alpha:rarity.alpha,bounds:bounds(rarity)}:null,
        edition:edition?{text:edition.text,visible:edition.visible,bounds:bounds(edition)}:null};}),
    layout:{mode:s.view.layout.mode,short:s.view.layout.shortLandscape},renderer:g.renderer.gl?'WebGL':'Canvas',fps:g.loop.actualFps};
});}
async function detail(page){return page.locator('.detail-dialog').evaluate(d=>{
  const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
  const rules=d.querySelector('.card-rules'),ability=d.querySelector('.card-ability'),edition=d.querySelector('.dialog-edition-summary');
  return {title:d.querySelector('h2').textContent,text:d.innerText,ability:ability?.innerText,abilityBox:box(ability),edition:edition?.innerText,editionBox:box(edition),
    body:d.querySelector('.dialog-body')?.textContent,rules:rules?{open:rules.open,text:rules.textContent}:null,
    rarity:[...d.querySelectorAll('.joker-rarity-badge')].map(e=>({text:e.textContent,rarity:e.dataset.rarity,box:box(e)})),
    footer:box(d.querySelector('.dialog-actions')),art:box(d.querySelector('.dialog-card-art')),width:innerWidth,height:innerHeight};
});}
const overlaps=(a,b)=>Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+.5&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+.5;
function assertTable(o,expectedCount){
  assert.equal(o.renderer,'Canvas');assert.equal(o.jokers.length,expectedCount);
  for(const j of o.jokers){
    assert.ok(j.width<=j.wrapWidth+1,j.definitionId+': value text fits allocated width');
    assert.ok(j.wrappedLines<=j.maxLines,j.definitionId+': no maxLines truncation');
    assert.ok(j.height<=j.slot.height+1&&j.bounds.y>=j.slot.y-1&&j.bounds.y+j.bounds.height<=j.slot.y+j.slot.height+1,j.definitionId+': value text fits slot height');
    assert.ok(j.rarity?.visible&&j.rarity.alpha===1,j.definitionId+': permanent rarity visible');
    assert.equal(overlaps(j.bounds,j.rarity.bounds),false,j.definitionId+': value does not overlap rarity');
    if(j.edition){assert.equal(j.edition.visible,true);assert.equal(overlaps(j.edition.bounds,j.rarity.bounds),false,j.definitionId+': edition distinct from rarity');assert.equal(overlaps(j.bounds,j.edition.bounds),false,j.definitionId+': value distinct from edition');}
  }
  if(o.benefits){assert.ok(o.benefits.height<=44.5,'selected source summary stays within two-line budget');assert.ok(o.benefits.width<=o.benefits.area.width-23,'selected source fits its area');}
}
function assertDetail(o,id){
  assert.ok(o.ability?.includes(effects[id]),id+': main ability includes complete numeric effect');
  assert.equal(o.rules?.open,false,'secondary rules collapsed by default');
  assert.match(o.edition??'',/版次/,'edition has its own visible summary');
  assert.ok(o.rarity.length,'rarity remains independently visible');
  assert.ok(o.footer.bottom<=o.height+.5,'footer fits viewport');
  if(o.art)assert.ok(o.abilityBox.bottom<=o.art.y+.5,'ability precedes artwork');
  assert.equal(overlaps(o.abilityBox,o.editionBox),false,'edition does not cover main ability');
}
function assertActivity(o,active){
  for(const id of ids){
    const events=o.events.filter(e=>e.sourceDefinitionId===id&&e.sourceType==='joker');
    const body=events.some(e=>e.reasonKey===`${id}.${operations[id]}`);
    assert.equal(body,active.includes(id),id+': actual public preview body event');
    const label=o.jokers.find(j=>j.definitionId===id).text;
    if(body)assert.ok(label.includes(effects[id]),id+': active compact keeps numeric effect');
    else assert.match(label,/未触发|未中|待|已弃|不再|未满足/,id+': compact states inactive');
  }
}
async function scenario(spec,body){
  const context=await browser.newContext({viewport:spec.viewport,hasTouch:spec.touch,deviceScaleFactor:spec.touch?3:1}),page=await context.newPage();
  const run={...spec,checks:[],screenshots:[],observations:[],errors:[]};report.runs.push(run);page.on('pageerror',e=>run.errors.push(String(e)));
  const click=locator=>spec.touch?locator.tap():locator.click();
  const shot=async label=>{const file=spec.name+'-'+label+'.png';await page.screenshot({path:path.join(dir,file)});run.screenshots.push(file);};
  const check=async(label,before)=>{const after=await persisted(page);assert.deepEqual(after,before,label+': full state/RNG/journal/export/IndexedDB unchanged');run.checks.push({name:label,sha256:sha(after)});};
  const close=async()=>{await click(page.getByRole('button',{name:'关闭',exact:true}));};
  try{await body({page,run,click,shot,check,close,touch:spec.touch});assert.deepEqual(run.errors,[]);run.status='PASS';}
  catch(error){run.status='FAIL';run.error=String(error);run.stack=error.stack;await shot('failure').catch(()=>{});process.exitCode=1;}
  finally{await context.close();await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({name:run.name,status:run.status,checks:run.checks.length,error:run.error}));}
  if(run.status==='FAIL')throw Error(run.name+': '+run.error);
}
async function natural({page,run,click,shot,check,close,touch}){
  await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=f09-sample-30`);await chooseCharacter(page,'amo',touch);
  await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.ready&&!s.tweens.isTweening(s.view.root);});
  let s=await state(page);const offer=s.shop.offers.find(o=>o.definitionId==='f09');assert.ok(offer);
  await tapUI(page,'shop','offer/'+offer.offerId,touch);await page.waitForFunction(()=>document.querySelector('.dialog-card-image')?.naturalWidth>0);
  const shop=await detail(page);assertDetail(shop,'f09');run.observations.push({label:'shop',...shop});await shot('shop-detail');
  const beforeBuy=await persisted(page);await click(page.locator('.card-rules summary'));await click(page.locator('.card-rules summary'));await check('shop-rules-read-only',beforeBuy);
  await click(page.getByRole('button',{name:'确认购买',exact:true}));await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready&&window.__harness.game.registry.get('runController').state.jokers.some(j=>j.definitionId==='f09'));
  await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await settle(page,touch);s=await state(page);
  const joker=s.jokers.find(j=>j.definitionId==='f09'),before=await persisted(page);
  await tapUI(page,'game','joker/'+joker.instanceId,touch);assertDetail(await detail(page),'f09');await shot('equipped-detail');await close();await check('equipped-detail-read-only',before);
  await tapUI(page,'game','card/'+s.handOrder[0],touch);await settle(page,touch);const selection=await table(page);assertTable(selection,1);assert.deepEqual(selection.score,['49','× 6.75','330']);assert.match(selection.benefits.text,/不换词.*×1.5/);run.observations.push({label:'selection',...selection});await shot('current-selection');
  await tapUI(page,'game','score/sources',touch);const sources=await detail(page);assert.equal(sources.rules.open,false);assert.match(sources.text,/不换词.*×1.5/);assert.match(sources.text,/本手(?:会|已)?触发/);run.observations.push({label:'preview-sources',...sources});await shot('preview-sources');await close();await check('selection-and-sources-read-only',before);
  await page.waitForTimeout(370);await tapUI(page,'game','action/play',touch);
  await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.playing&&!!s.presentation&&window.__harness.game.registry.get('runController').state.stage.playIndex===1;});
  const duringPlay=await persisted(page);await tapUI(page,'game','joker/'+joker.instanceId,touch);const playingDetail=await detail(page);assertDetail(playingDetail,'f09');assert.match(playingDetail.ability,/本手已触发/);run.observations.push({label:'detail-during-score',...playingDetail});await shot('detail-during-score');await close();await check('detail-during-committed-presentation-read-only',duringPlay);
  await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').resultText.text.includes('不换词'));await shot('f09-trigger');
  await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing);await settle(page,touch);s=await state(page);assert.equal(s.lastTrace.finalScore,'330');assert.ok(s.lastTrace.events.some(e=>e.reasonKey==='f09.multiply-multiplier'));run.trace={score:s.lastTrace.finalScore,events:s.lastTrace.events.filter(e=>e.sourceType==='joker')};
  const afterPlay=await persisted(page);await click(page.locator('.run-menu-toggle'));await click(page.getByRole('button',{name:'上手详情',exact:true}));const recap=await detail(page);assert.match(recap.text,/不换词.*×1.5/);assert.equal(recap.rules.open,false);run.observations.push({label:'last-hand-recap',...recap});await shot('last-hand-recap');await close();await check('committed-recap-read-only',afterPlay);
  await tapUI(page,'game','card/'+s.handOrder[0],touch);await page.waitForTimeout(370);await tapUI(page,'game','action/discard',touch);await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing&&window.__harness.game.registry.get('runController').state.stage.discardsUsed===1);await settle(page,touch);
  assert.match((await table(page)).jokers[0].text,/已弃|不再/);await tapUI(page,'game','joker/'+joker.instanceId,touch);const inactive=await detail(page);assert.match(inactive.ability,/本场不再×1.5/);assert.match(inactive.edition,/版次/);await shot('inactive-detail');await close();run.checks.push({name:'natural330-and-real-discard-inactive'});
}

/** Enriched legal inputs, never presented as a natural acquisition history. */
function fixtures(){
  const apply=(s,action)=>{const c={runId:s.runId,commandId:`${s.runId}/command/${s.commandSeq+1}`,expectedSeq:s.commandSeq,action},result=domain.applyCommand(s,c);assert.ok(result.ok,result.code);return result.state;};
  let shop=domain.createRun({seed:'d39-clarity-fixture',runId:'d39-clarity-fixture',characterId:'erxiang',rulesVersion:'r2'});
  shop=structuredClone(shop);shop.gold=3;shop.jokers=ids.map(id=>r2.r2CreateJoker(id,'fixture/'+id,0,id==='f09'?'holographic':'none'));
  const probe=apply(apply(shop,{type:'LeaveShop'}),{type:'EnterStage'}),warmupIds=probe.handOrder.slice(0,4);
  warmupIds.forEach((id,index)=>{const card=shop.deckInstances.find(c=>c.id===id);card.rank=index%2?3:2;card.suit=index%2?'hearts':'spades';});
  // Keep a concrete pair for the high-card versus pair browser comparison.
  probe.handOrder.slice(4,6).forEach((id,index)=>{const c=shop.deckInstances.find(c=>c.id===id);c.rank=7;c.suit=index?'clubs':'diamonds';});
  const first=apply(apply(shop,{type:'LeaveShop'}),{type:'EnterStage'}),gold4=structuredClone(first);gold4.gold=4;
  let third=apply(first,{type:'PlayHand',selectedIds:warmupIds.slice(0,2)});assert.equal(third.lastTrace.finalScore,'195');
  third=apply(third,{type:'PlayHand',selectedIds:warmupIds.slice(2,4)});assert.equal(third.lastTrace.finalScore,'195');assert.equal(third.phase,'await-input');assert.equal(third.stage.playIndex,2);
  third=apply(third,{type:'DiscardHand',selectedIds:[third.handOrder.at(-1)]});assert.equal(third.stage.discardsUsed,1);
  const make=(name,s)=>{r2.assertR2Invariants(s);const cp=checkpoint.makeCheckpoint(s,[]),read=checkpoint.readCheckpoint(cp);assert.equal(read.ok,true,read.code);return{name,checkpoint:cp};};
  return{first:make('first-gold3',first),gold4:make('first-gold4',gold4),third:make('third-after-discard',third),single:[warmupIds[0]],high:warmupIds.slice(0,2),pair:probe.handOrder.slice(4,6)};
}
async function importFixture(page,click,fixture){
  if(!await page.locator('.run-menu-modal').evaluate(e=>e.open))await click(page.locator('.run-menu-toggle'));
  const summary=page.locator('.run-menu-modal summary').filter({hasText:'进度与存档'});
  if(!await summary.evaluate(e=>e.parentElement.open))await click(summary);
  const chooserPromise=page.waitForEvent('filechooser');await click(page.getByRole('button',{name:'导入本局',exact:true}));
  const chooser=await chooserPromise;await chooser.setFiles({name:fixture.name+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture.checkpoint))});
  await page.waitForFunction(checksum=>{const c=window.__harness.game.registry.get('runController');return c?.status==='idle'&&JSON.parse(c.exportJSON()).checksum===checksum;},fixture.checkpoint.checksum);
  await waitScene(page,'game');
}
async function fixtureRoute({page,run,click,shot,check,close,touch}){
  const f=fixtures();run.fixture={label:'Explicit validated input, not natural acquisition',checksums:Object.fromEntries(['first','gold4','third'].map(k=>[k,f[k].checkpoint.checksum]))};
  page.on('dialog',d=>d.accept());await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=d39-fixture-context`);await waitScene(page,'title');
  const select=async chosen=>{const current=await page.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]);for(const id of current.filter(id=>!chosen.includes(id)))await tapUI(page,'game','card/'+id,touch);for(const id of chosen.filter(id=>!current.includes(id)))await tapUI(page,'game','card/'+id,touch);await settle(page,touch);};
  await importFixture(page,click,f.first);await settle(page,touch);let before=await persisted(page);
  for(const [label,chosen,active,handType] of [['single',f.single,['f09','f04','a03','pengci'],'high-card'],['two-unmatched',f.high,['f09','f04','pengci'],'high-card'],['pair',f.pair,['f09','f04'],'pair']]){
    await select(chosen);const o=await table(page);assertTable(o,5);assertActivity(o,active);assert.equal(o.handType,handType);run.observations.push({label,...o});await shot(label);await check(label+'-preview-read-only',before);
  }
  await select(f.single);
  for(const id of ids){await tapUI(page,'game','joker/fixture/'+id,touch);const o=await detail(page);assertDetail(o,id);run.observations.push({label:'detail-'+id,...o});if(['f04','a03','huimaqiang'].includes(id))await shot('detail-'+id);await close();}
  await check('all-five-details-read-only',before);
  const resizeTo=async size=>{await page.setViewportSize(size);await page.waitForFunction(({width,height})=>{const g=window.__harness.game,s=g.scene.getScene('game'),l=s.view.layout,v=[...s.jokerViews.values()][0],b=l.slots[0],canvas=g.canvas.getBoundingClientRect();return l.width===width&&l.height===height&&Math.abs(canvas.width-width)<1&&Math.abs(canvas.height-height)<1&&v?.getData('baseX')===b.x+b.width/2&&v?.getData('baseY')===b.y+b.height/2;},size);await settle(page,touch);};
  // One resize exercises narrow landscape labels; no new gameplay route.
  if(touch){const original=page.viewportSize();await resizeTo({width:844,height:390});const o=await table(page);assertTable(o,5);assert.ok(o.jokers.some(j=>j.labelBox.width<60),'narrow side labels are actually exercised');run.observations.push({label:'narrow-landscape',...o});await shot('narrow-landscape');await check('landscape-read-only',before);await resizeTo(original);}
  await importFixture(page,click,f.gold4);await settle(page,touch);before=await persisted(page);await select(f.single);const gold4=await table(page);assertActivity(gold4,['f09','a03','pengci']);assertTable(gold4,5);await tapUI(page,'game','joker/fixture/f04',touch);const goldDetail=await detail(page);assert.match(goldDetail.ability,/4.*金币/);assert.match(goldDetail.ability,/需要≤3/);await shot('gold4-inactive');await close();await check('gold4-preview-and-detail-read-only',before);
  await importFixture(page,click,f.third);await settle(page,touch);before=await persisted(page);const s=await state(page),chosen=[s.handOrder[0]];await select(chosen);const third=await table(page);assertActivity(third,['f04','a03','pengci','huimaqiang']);assertTable(third,5);
  assert.ok(third.events.some(e=>e.sourceDefinitionId==='f09'&&e.reasonKey.startsWith('edition.holographic.')),'inactive f09 body retains actual edition event');
  await tapUI(page,'game','score/sources',touch);const sources=await detail(page);assert.match(sources.text,/不换词.*本体未触发/);assert.match(sources.text,/版次/);assert.match(sources.text,/本手生效/);assert.match(sources.text,/回马枪.*×2/);await shot('third-edition-only-sources');await close();await check('third-play-preview-read-only',before);
  await page.waitForTimeout(370);await tapUI(page,'game','action/play',touch);await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.state.commandSeq);
  const committed=await state(page);r2.assertR2Invariants(committed);assert.equal(checkpoint.readCheckpoint(checkpoint.makeCheckpoint(committed,[])).ok,true);
  const trace=committed.lastTrace;assert.equal(trace.events.some(e=>e.reasonKey==='f09.multiply-multiplier'),false);assert.ok(trace.events.some(e=>e.sourceDefinitionId==='f09'&&e.reasonKey.startsWith('edition.holographic.')));assert.ok(trace.events.some(e=>e.reasonKey==='huimaqiang.multiply-multiplier'));run.actualFixturePlay={score:trace.finalScore,events:trace.events.filter(e=>e.sourceType==='joker')};
  await page.waitForFunction(()=>{const g=window.__harness.game;return g.scene.isActive('intermission')||!g.scene.getScene('game').playing;});
  const after=await persisted(page);if(await page.evaluate(()=>window.__harness.game.scene.isActive('intermission')))await tapUI(page,'intermission','action/last-hand',touch);else{await click(page.locator('.run-menu-toggle'));await click(page.getByRole('button',{name:'上手详情',exact:true}));}const recap=await detail(page);assert.match(recap.text,/不换词/);assert.match(recap.text,/版次/);run.observations.push({label:'fixture-committed-recap',...recap});await shot('fixture-committed-recap');await close();await check('fixture-committed-recap-read-only',after);
  run.checks.push({name:'one-real-fixture-play-body-versus-edition'});
}
try{
  report.buildInfo=JSON.parse(await readFile(path.join(outDir,'build-info.json'),'utf8'));
  report.bundles=await Promise.all((await readdir(path.join(outDir,'assets'))).filter(f=>/\.(js|css)$/.test(f)).map(async file=>({file,sha256:sha(await readFile(path.join(outDir,'assets',file),'utf8'))})));
  ssr=await createServer({server:{middlewareMode:true},logLevel:'error'});
  domain=await ssr.ssrLoadModule('/src/domain/run.ts');r2=await ssr.ssrLoadModule('/src/domain/r2Run.ts');checkpoint=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
  // Validate all fixtures before launching a browser or visiting the frozen build.
  fixtures();await ssr.close();ssr=undefined;
  server=await preview({build:{outDir},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'warn'});
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});report.browser=browser.version();
  for(const kind of ['natural','fixture'])for(const touch of [false,true])await scenario({name:(touch?'touch':'desktop')+'-'+kind,touch,viewport:touch?{width:412,height:820}:{width:1280,height:800}},kind==='natural'?natural:fixtureRoute);
  report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);report.stack=error.stack;process.exitCode=1;}
finally{await browser?.close();await ssr?.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('joker clarity: '+report.status);}
