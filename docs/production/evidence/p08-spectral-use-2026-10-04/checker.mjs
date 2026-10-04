/** Eight spectral fixtures, fixed clean1c, one390 software Canvas. Native inputs only. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from '../../harness/ui.mjs';
import {snapshotSource} from '../../scripts/check-runner.mjs';

const dir='shots/p08-spectral-use',base='1c103de6957eb3fd4c17d94d8f68c5a4d5466ca9';
await mkdir(dir,{recursive:true});
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(commit,base);assert.equal(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'');
const frozen=snapshotSource(process.cwd()),json=x=>JSON.parse(JSON.stringify(x)),digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const ids=['hearts-13','spades-14','clubs-3','diamonds-2','clubs-9','hearts-10','diamonds-11','spades-12'];
const tools=['S01','S02','S03','S04','S05','S06','S07','S08'],shopOnly=['S03','S04','S06','S07','S08'],fixtures={};
const caseIds=process.env.SPECTRAL_CASES?process.env.SPECTRAL_CASES.split(','):tools;
assert.ok(caseIds.every(id=>tools.includes(id))&&new Set(caseIds).size===caseIds.length);
let applyCommand,SeededRng,r2Pool,r2CreateJoker,readCheckpoint,makeCheckpoint,r2HandsBudget,r2HandLimit,editionNames;
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});
try{
  const d=await ssr.ssrLoadModule('/src/domain/run.ts'),r=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),cp=await ssr.ssrLoadModule('/src/application/checkpoint.ts'),rng=await ssr.ssrLoadModule('/src/core/SeededRng.ts'),shop=await ssr.ssrLoadModule('/src/domain/r2Shop.ts'),catalog=await ssr.ssrLoadModule('/src/content/r2Tools.ts');
  ({applyCommand}=d);({r2CreateJoker,r2HandsBudget,r2HandLimit}=r);({readCheckpoint,makeCheckpoint}=cp);({SeededRng}=rng);({r2Pool}=shop);editionNames=Object.fromEntries(catalog.R2_EDITIONS.map(x=>[x.id,x.name]));
  function fixture(id){
    let s=d.createRun({seed:'p08-spectral-use/'+id,runId:'fixture/p08-spectral-use/'+id,characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
    s.gold=id==='S02'?5:id==='S05'?3:20;
    s.consumables=[{instanceId:'fixture/use/'+id,definitionId:id},{instanceId:'fixture/sentinel/T12',definitionId:'T12'}];
    s.jokers=[r2CreateJoker('e05','fixture/donor',17),r2CreateJoker('b03','fixture/recipient',11),r2CreateJoker('e06','fixture/watcher',6,'polychrome')];
    s.jokers[0].growth={heat:{n:'16',d:'1'}};s.jokers[1].growth={multiplier:{n:'3',d:'2'}};s.jokers[2].growth={multiplier:{n:'1',d:'2'}};
    const card=id=>s.deckInstances.find(c=>c.id===id);
    Object.assign(card('hearts-13'),{enhancement:'glass-paper',edition:'foil'});
    if(id==='S01'){card('spades-14').enhancement='heat-paper';card('clubs-3').edition='holographic';}
    if(id==='S02'){s.jokers[0].edition='holographic';card('clubs-3').enhancement='gold-paper';}
    if(id==='S03')while(s.deckInstances.length<78){const n=s.deckInstances.length;s.deckInstances.push({...card('clubs-4'),id:'fixture/existing-copy/'+n});s.drawPile.push(s.deckInstances.at(-1).id);}
    if(id==='S04'||id==='S08'){
      const dead=card('spades-2');Object.assign(dead,{enhancement:'gold-paper',edition:'polychrome'});s.destroyedIds=[dead.id];s.drawPile=s.drawPile.filter(x=>x!==dead.id);
      if(id==='S04')for(const c of s.deckInstances)if(c.id!==dead.id)c.suit='hearts';
      if(id==='S08'){card('clubs-3').edition='holographic';card('diamonds-2').enhancement='heat-paper';card('clubs-9').edition='polychrome';}
    }
    if(id==='S05')s.handLevels={...s.handLevels,straight:27,pair:2};
    if(id==='S06')s.jokers=[r2CreateJoker('f06','fixture/owned-rare',8),r2CreateJoker('e05','fixture/watcher',6)];
    if(id==='S06')s.jokers[1].growth={heat:{n:'16',d:'1'}};
    if(!shopOnly.includes(id)){
      for(const type of ['LeaveShop','EnterStage']){const result=applyCommand(s,{runId:s.runId,commandId:type,expectedSeq:s.commandSeq,action:{type}});assert.ok(result.ok,JSON.stringify(result));s=result.state;}
      s.handOrder=[...ids];s.drawPile=s.deckInstances.filter(c=>!ids.includes(c.id)&&!s.destroyedIds.includes(c.id)).map(c=>c.id);s.stage.disabledIds=[];
    }
    const c=cp.makeCheckpoint(s,[]),valid=cp.readCheckpoint(c);assert.ok(valid.ok,JSON.stringify(valid));
    return{state:s,text:JSON.stringify(c),checkpointSHA256:digest(c),validator:'PASS',definition:catalog.R2_TOOLS.find(t=>t.id===id)};
  }
  for(const id of tools)fixtures[id]=fixture(id);
  await writeFile(dir+'/fixtures.json',JSON.stringify(fixtures,null,2)+'\n');
}finally{await ssr.close();}
console.log(JSON.stringify({fixtures:8,validator:'PASS',source:commit}));
if(process.env.SPECTRAL_SKIP_BUILD!=='1')await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({build:{outDir:dir+'/build'},preview:{port:5311,strictPort:true,host:'127.0.0.1'},logLevel:'error'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={taskId:'P08',testedCommit:commit,build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),browser:browser.version(),renderer:'Chromium software Canvas',viewport:{width:390,height:740},DPR:1,motion:'reduce',fixture:'Eight unique validator-approved synthetic checkpoints. Five shop-only tools are also entered into the table via real LeaveShop/EnterStage UI, rejected there, then the same original checkpoint is reimported. No natural acquisition/full run.',fixtureCount:8,caseIds,buildReused:process.env.SPECTRAL_SKIP_BUILD==='1',sourceFreeze:{before:frozen},device:'NOT_RUN',GPU:'NOT_RUN',audio:'NOT_RUN',cases:[],errors:[],screenshots:[]};
if(report.buildReused){const initial=JSON.parse(await readFile(dir+'/first/browser.json','utf8'));assert.deepEqual(report.build,initial.build);}
const ctx=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await ctx.newPage();
page.on('pageerror',e=>report.errors.push(String(e)));page.on('dialog',d=>d.accept());
const state=()=>page.evaluate(()=>window.__harness.game.registry.get('runController').state);
const selected=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s?.scene.isActive()?[...s.selectedIds]:[];});
const scene=()=>page.evaluate(()=>window.__harness.game.scene.isActive('shop')?'shop':'game');
async function ready(){await page.waitForFunction(()=>{const g=window.__harness?.game,shop=g?.scene.getScene('shop');if(shop?.scene.isActive())return shop.ready;const s=g?.scene.getScene('game');return s?.scene.isActive()&&s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});}
async function install(f){
  await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'spectral-fixture.json',mimeType:'application/json',buffer:Buffer.from(f.text)});
  await waitScene(page,f.state.phase==='shop'?'shop':'game');await page.waitForFunction(id=>window.__harness.game.registry.get('runController').state.runId===id,f.state.runId);await ready();assert.deepEqual(await state(),json(f.state));
}
async function open(id){await tapUI(page,await scene(),'action/tool-inventory',true);await page.getByRole('dialog',{name:'工具包',exact:true}).waitFor();await page.locator('.tool-inventory-card[data-item-id="fixture/use/'+id+'"]').tap();await page.locator('.tool-detail[open]').waitFor();}
const confirm=()=>page.getByRole('button',{name:'确认使用',exact:true});
const target=(id,role='target')=>page.locator('.tool-target-panel input[name$="/'+role+'"][value="'+id+'"]');
async function choose(id,role='target'){const input=target(id,role);assert.equal(await input.isDisabled(),false,id+' selectable '+role);await input.tap();}
async function close(label='取消'){await page.getByRole('button',{name:label,exact:true}).tap();await page.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));await ready();}
async function disabledConfirm(out,before,pattern){
  const b=confirm();assert.equal(await b.isDisabled(),true);const hint=await page.locator('.tool-validation').innerText();assert.match(hint,pattern);
  await b.scrollIntoViewIfNeeded();const p=await b.boundingBox();await page.touchscreen.tap(p.x+p.width/2,p.y+p.height/2);assert.deepEqual(await state(),before);
  out.invalid.push({hint,confirmDisabled:true,nativeDisabledTap:'NO_COMMAND_NO_COST_NO_RNG',beforeRunSHA256:digest(before),afterRunSHA256:digest(await state())});
}
async function disabledTarget(out,id,before,role='target'){
  const input=target(id,role);assert.equal(await input.isDisabled(),true);const checked=await page.locator('.tool-target-panel input:checked').evaluateAll(inputs=>inputs.map(x=>({name:x.name,value:x.value})));await input.scrollIntoViewIfNeeded();const p=await input.boundingBox();await page.touchscreen.tap(p.x+p.width/2,p.y+p.height/2);
  assert.deepEqual(await page.locator('.tool-target-panel input:checked').evaluateAll(inputs=>inputs.map(x=>({name:x.name,value:x.value}))),checked);assert.deepEqual(await state(),before);out.disabledTargets.push({id,role,nativeTap:'NO_SELECTION_NO_COMMAND_NO_COST_NO_RNG',status:'PASS'});
}
async function selectLegal(id){
  if(id==='S01'){await choose('hearts-13','donor');await choose('diamonds-2');await choose('clubs-3');}
  if(id==='S02'){await page.getByLabel('改造对象',{exact:true}).selectOption('joker');await choose('fixture/recipient');}
  if(id==='S03')await choose('hearts-13');
  if(id==='S04')await page.getByLabel('全副花色',{exact:true}).selectOption('clubs');
  if(id==='S05'){await page.getByLabel('收益牌型',{exact:true}).selectOption('straight');await page.getByLabel('遗忘牌型',{exact:true}).selectOption('pair');}
  if(id==='S07'){await choose('fixture/donor','donor');await choose('fixture/recipient');}
}
async function capturePreview(id){
  const text={body:await page.locator('.tool-detail .dialog-body').innerText(),preview:await page.locator('.tool-preview').innerText(),hint:await page.locator('.tool-validation').innerText(),probability:await page.locator('.tool-public-probability').count()?await page.locator('.tool-public-probability').innerText():null};
  assert.equal(await confirm().isDisabled(),false);assert.match(text.hint,/目标有效/);
  const patterns={S01:[/独立随机/,/永久牺牲1张扑克/,/公开受益顺序/,/不作为出售，不退款/],S02:[/随机获得/,/额外使用代价：5金/,/金币 5 → 0/],S03:[/下一场起永久出牌次数−1/,/下一场起出牌预算：4 → 3/,/复制 2 张/],S04:[/下一场起永久手牌上限−1/,/下一场起手牌容量：8 → 7/,/整副 51 张改为梅花/],S05:[/牺牲方等级−1/,/Lv.27 → 30/,/遗忘：[\s\S]*Lv.2 → 1/,/额外使用代价：3 金；金币 3 → 0/],S06:[/全部金币（至少5金）/,/清空全部金币：20 → 0/,/等概率/,/每张概率 1\//],S07:[/永久牺牲1张大丑牌/,/永久牺牲：/,/不作为出售，不退款/,/原支付 11 金与已有成长保留/],S08:[/清除全牌组全部增强与特殊版次/,/所有增强与特殊版次都将清除/,/下一场起手牌容量：8 → 9/]};
  const all=[text.body,text.preview].join('\n');for(const pattern of patterns[id])assert.match(all,pattern,id+' before-confirm disclosure');
  if(id==='S01'){assert.match(text.probability,/使用后揭晓结果/);assert.equal((text.probability.match(/1\/7/g)??[]).length,7);}
  if(id==='S02')for(const fraction of ['5/10','3/10','2/10'])assert.ok(text.probability.includes(fraction));
  const overflow=await page.locator('.tool-detail .dialog-scroll').evaluate(e=>({clientWidth:e.clientWidth,scrollWidth:e.scrollWidth}));assert.ok(overflow.scrollWidth<=overflow.clientWidth+1,JSON.stringify(overflow));text.horizontalOverflow=overflow;return text;
}
function actionFor(id){
  const action={type:'UseConsumable',instanceId:'fixture/use/'+id,targetIds:[]};
  if(id==='S01')Object.assign(action,{targetIds:['clubs-3','diamonds-2'],sacrificeId:'hearts-13'});
  if(id==='S02')Object.assign(action,{targetIds:['fixture/recipient'],targetKind:'joker'});
  if(id==='S03')action.targetIds=['hearts-13'];
  if(id==='S04')action.suit='clubs';
  if(id==='S05')Object.assign(action,{handType:'straight',secondaryHandType:'pair'});
  if(id==='S07')Object.assign(action,{targetIds:['fixture/recipient'],sacrificeId:'fixture/donor'});
  return action;
}
function verifyResult(id,before,after,out){
  const cards=new Map(before.deckInstances.map(c=>[c.id,c])),get=id=>after.deckInstances.find(c=>c.id===id),changedStream=id==='S01'||id==='S02'?'rule':id==='S06'?'reward':null;
  for(const stream of ['deck','shop','rule','reward'])if(stream!==changedStream)assert.deepEqual(after.rng[stream],before.rng[stream]);
  assert.deepEqual(after.consumables,[before.consumables[1]]);assert.equal(after.commandSeq,before.commandSeq+1);assert.deepEqual(after.lastTrace,before.lastTrace);
  if(id==='S01'){
    const rng=SeededRng.restore(before.rng.rule),pool=['heat-paper','multiplier-paper','glass-paper','voice-paper','gold-paper','encore-paper','lucky-paper'],assignments=['clubs-3','diamonds-2'].map(id=>({id,expectedEnhancement:pool[rng.integer(0,6)]}));
    for(const a of assignments)assert.deepEqual(get(a.id),{...cards.get(a.id),enhancement:a.expectedEnhancement});assert.deepEqual(after.rng.rule,rng.snapshot());
    assert.deepEqual(after.destroyedIds,[...before.destroyedIds,'hearts-13']);for(const zone of ['handOrder','drawPile','playedPile','discardPile'])assert.deepEqual(after[zone],before[zone].filter(x=>x!=='hearts-13'));
    for(const c of after.deckInstances)if(!assignments.some(x=>x.id===c.id))assert.deepEqual(c,cards.get(c.id));assert.equal(after.gold,before.gold);assert.equal(after.deckInstances.length-after.destroyedIds.length,before.deckInstances.length-before.destroyedIds.length-1);out.effect={sacrifice:'hearts-13',independentRuleDraws:2,publicOrderNotClickOrder:true,assignments,unrelatedFields:'PASS'};
  }
  if(id==='S02'){
    const rng=SeededRng.restore(before.rng.rule),edition=['foil','foil','foil','foil','foil','holographic','holographic','holographic','polychrome','polychrome'][rng.integer(0,9)];
    assert.deepEqual(after.rng.rule,rng.snapshot());assert.equal(after.gold,0);assert.deepEqual(after.deckInstances,before.deckInstances);assert.deepEqual(after.jokers,before.jokers.map(j=>j.instanceId==='fixture/recipient'?{...j,edition}:j));out.effect={additionalGold:[5,0],ruleDraws:1,edition,paidPriceGrowthCounters:'EXACTLY_PRESERVED'};
  }
  if(id==='S03'){
    const copies=after.deckInstances.filter(c=>!cards.has(c.id));assert.equal(copies.length,2);assert.equal(new Set(copies.map(c=>c.id)).size,2);for(const c of copies)assert.deepEqual({...c,id:'hearts-13'},cards.get('hearts-13'));assert.deepEqual(after.deckInstances.slice(0,before.deckInstances.length),before.deckInstances);assert.deepEqual(after.drawPile,[...copies.map(c=>c.id),...before.drawPile]);assert.equal(after.spectralModifiers.handsPenalty,before.spectralModifiers.handsPenalty+1);assert.equal(after.gold,before.gold);assert.equal(after.deckInstances.length,80);out.effect={copies,originalRetained:true,drawPile:'two new IDs at bottom; no shuffle',nextHands:[r2HandsBudget(before),r2HandsBudget(after)],effective:'next-stage permanent, not current-stage deduction'};
  }
  if(id==='S04'){
    assert.deepEqual(after.deckInstances,before.deckInstances.map(c=>before.destroyedIds.includes(c.id)?c:{...c,suit:'clubs'}));assert.deepEqual(after.drawPile,before.drawPile);assert.deepEqual(after.destroyedIds,before.destroyedIds);assert.equal(after.spectralModifiers.handPenalty,before.spectralModifiers.handPenalty+1);assert.equal(after.gold,before.gold);out.effect={livingCardsChanged:51,deadCardPreserved:'spades-2',nextHandLimit:[r2HandLimit(before),r2HandLimit(after)],rankEnhancementEditionAndOrder:'EXACTLY_PRESERVED',effective:'next-stage permanent'};
  }
  if(id==='S05'){
    assert.deepEqual(after.handLevels,{...before.handLevels,straight:30,pair:1});assert.equal(after.gold,0);assert.deepEqual(after.stage,before.stage);assert.deepEqual(after.chapterHandUsage,before.chapterHandUsage);out.effect={levels:{straight:[27,30],pair:[2,1]},additionalGold:[3,0],discoveryAndCurrentStage:'PRESERVED'};
  }
  if(id==='S06'){
    const pool=r2Pool(before.jokers.map(j=>j.definitionId),before.safetyNetUsed?['f07']:[]).filter(d=>d.rarity==='rare'),rng=SeededRng.restore(before.rng.reward),definition=pool[rng.integer(0,pool.length-1)];
    assert.equal(after.gold,0);assert.deepEqual(after.jokers.slice(0,before.jokers.length),before.jokers);const reward=after.jokers.at(-1);assert.equal(reward.definitionId,definition.id);assert.equal(reward.paidPrice,0);assert.equal(reward.edition??'none','none');assert.deepEqual(reward,r2CreateJoker(definition.id,reward.instanceId,0,'none'));assert.deepEqual(after.rng.reward,rng.snapshot());out.effect={allGold:[20,0],poolSize:pool.length,uniformRewardDraws:1,reward,unownedRare:true,purchaseOrSaleGrowth:'NOT_TRIGGERED',observedResult:'one seeded observation, no guarantee of this Joker'};
  }
  if(id==='S07'){
    assert.deepEqual(after.jokers,before.jokers.filter(j=>j.instanceId!=='fixture/donor').map(j=>j.instanceId==='fixture/recipient'?{...j,edition:'polychrome'}:j));assert.equal(after.gold,before.gold);out.effect={donor:'fixture/donor',recipient:'fixture/recipient',distinctInstances:true,recipientEdition:'polychrome',refund:0,paidPriceGrowthAndWatcher:'EXACTLY_PRESERVED'};
  }
  if(id==='S08'){
    const living=before.deckInstances.filter(c=>!before.destroyedIds.includes(c.id)),modified=living.filter(c=>c.enhancement!==undefined||(c.edition??'none')!=='none');assert.equal(modified.length,4);
    for(const c of after.deckInstances){const old=cards.get(c.id);if(before.destroyedIds.includes(c.id))assert.deepEqual(c,old);else{const expected={...old};delete expected.enhancement;delete expected.edition;assert.deepEqual(c,expected);}}
    assert.deepEqual(after.drawPile,before.drawPile);assert.equal(after.spectralModifiers.cleanSlateBonus,1);assert.equal(after.gold,before.gold);out.effect={distinctModifiedCards:4,livingDeckCardsCleared:51,deadCardUnchanged:'spades-2',nextHandLimit:[r2HandLimit(before),r2HandLimit(after)],oncePerRunModifier:1,rankSuitIdentityOrder:'EXACTLY_PRESERVED'};
  }
  out.RNG={changedStream:changedStream??'NONE',before:before.rng,after:after.rng,otherStreams:'UNCHANGED'};
}
async function observe(expected){
  const ui=await page.evaluate(()=>{
    const g=window.__harness.game,key=g.scene.isActive('shop')?'shop':'game',s=g.scene.getScene(key),objects=[];const walk=list=>{for(const o of list){objects.push(o);if(o.list)walk(o.list);}};walk(s.children.list);
    const inventory=objects.find(o=>o.name==='action/tool-inventory');return{scene:key,renderer:g.renderer.type,width:g.scale.width,height:g.scale.height,inventoryLabel:inventory?.getData('label')?.text,goldText:s.goldText?.text,jokerHitNames:objects.filter(o=>o.input?.enabled&&o.name?.startsWith('joker/')).map(o=>o.name),hand:key==='game'?s.cardViews.filter(v=>v.container.visible).map(v=>({card:v.card,index:v.container.list.find(o=>o.name==='rank-index')?.text})):null,handsLeft:key==='game'?s.handsLeft:null,handCount:key==='game'?s.handCountText?.text:null};
  });assert.equal(ui.renderer,1);assert.equal(ui.width,390);assert.equal(ui.height,740);assert.equal(ui.inventoryLabel,'工具包 1/2');assert.match(ui.goldText,new RegExp('金币\\s*'+expected.gold+'(?:\\D|$)'));
  for(const j of expected.jokers)assert.ok(ui.jokerHitNames.includes('joker/'+j.instanceId));if(ui.hand)assert.deepEqual(ui.hand.map(x=>x.card),expected.handOrder.map(id=>expected.deckInstances.find(c=>c.id===id)));return ui;
}
async function deckView(expected){await page.locator('.run-menu-toggle').tap();await page.getByRole('button',{name:'查看牌组',exact:true}).tap();await page.getByRole('dialog',{name:'牌组查看',exact:true}).waitFor();await page.getByLabel('牌组范围',{exact:true}).selectOption('all');const text=await page.getByRole('dialog',{name:'牌组查看',exact:true}).locator('.dialog-copy').innerText();await close('关闭');assert.deepEqual(await state(),expected);return text;}
async function shopBuild(expected){await tapUI(page,'shop','action/build',true);await page.getByRole('dialog',{name:'当前构筑 · 从左至右触发',exact:true}).waitFor();const text=await page.locator('.detail-dialog[open] .dialog-copy').innerText();assert.ok(text.includes('有效牌组 '+(expected.deckInstances.length-expected.destroyedIds.length)+' 张'));await close('关闭');assert.deepEqual(await state(),expected);return text;}
async function inspectJoker(expected,id){await tapUI(page,await scene(),'joker/'+id,true);await page.locator('.detail-dialog[open]').waitFor();const text=await page.locator('.detail-dialog[open]').innerText(),j=expected.jokers.find(j=>j.instanceId===id);assert.ok(text.includes(editionNames[j.edition??'none']));await close('关闭');assert.deepEqual(await state(),expected);return text;}
async function enterStage(before){await tapUI(page,'shop','action/start-stage',true);await waitScene(page,'game');await ready();const entered=await state();assert.equal(entered.phase,'await-input');let reference=before;const receipts=entered.receipts.slice(-2);for(const [index,type]of ['LeaveShop','EnterStage'].entries()){const r=applyCommand(reference,{runId:reference.runId,commandId:receipts[index].commandId,expectedSeq:reference.commandSeq,action:{type}});assert.ok(r.ok);reference=r.state;}assert.deepEqual(entered,json(reference));return entered;}
async function reload(expected){await page.reload();await waitScene(page,'title');await tapUI(page,'title','action/title-continue',true);await waitScene(page,expected.phase==='shop'?'shop':'game');await ready();assert.deepEqual(await state(),expected);return{status:'PASS',beforeRunSHA256:digest(expected),afterRunSHA256:digest(await state()),ui:await observe(expected)};}
async function shot(name){await page.screenshot({path:dir+'/'+name,fullPage:true,scale:'css'});report.screenshots.push(name);}
async function run(id){
  const f=fixtures[id],out={id,definition:f.definition,fixture:{runId:f.state.runId,phase:f.state.phase,checkpointSHA256:f.checkpointSHA256,validator:f.validator},invalid:[],disabledTargets:[],cancellation:[],screenshots:[]};report.cases.push(out);
  try{
    await install(f);
    if(shopOnly.includes(id)){
      const entered=await enterStage(await state());await open(id);await disabledConfirm(out,entered,/请在商店使用/);await close();assert.deepEqual(await state(),entered);out.phaseRejection={nativeEnterStage:true,inventoryRetained:true,allCostAndRNGUnchanged:true,status:'PASS'};await install(f);
    }
    if(f.state.phase==='await-input')await tapUI(page,'game','card/hearts-13',true);
    const before=await state(),selectedBefore=await selected();await open(id);
    if(['S01','S02','S03','S04','S05','S07'].includes(id))await disabledConfirm(out,before,id==='S04'?/请选择全副/:id==='S05'?/请选择收益牌型/:id==='S07'?/请选择牺牲/:/请选择/);
    if(id==='S01'){await choose('hearts-13','donor');await disabledTarget(out,'hearts-13',before);await disabledTarget(out,'spades-14',before);await disabledConfirm(out,before,/请选择/);}
    if(id==='S02'){
      await disabledTarget(out,'hearts-13',before);await choose('clubs-3');assert.equal(await confirm().isDisabled(),false);out.cardTargetPreview=await page.locator('.tool-preview').innerText();assert.match(out.cardTargetPreview,/金币 5 → 0/);await page.getByLabel('改造对象',{exact:true}).selectOption('joker');assert.equal(await page.locator('.tool-target-panel input:checked').count(),0);await disabledTarget(out,'fixture/donor',before);await disabledTarget(out,'fixture/watcher',before);await disabledConfirm(out,before,/请选择一个普通版次/);
    }
    if(id==='S04'){await page.getByLabel('全副花色',{exact:true}).selectOption('hearts');await disabledConfirm(out,before,/有效牌组已全部是该花色/);}
    if(id==='S05'){await page.getByLabel('收益牌型',{exact:true}).selectOption('pair');await page.getByLabel('遗忘牌型',{exact:true}).selectOption('pair');await disabledConfirm(out,before,/两个不同牌型/);out.handOptions=await page.locator('.tool-field select').evaluateAll(selects=>selects.map(s=>({label:s.getAttribute('aria-label'),options:[...s.options].map(o=>({value:o.value,text:o.textContent}))})));for(const [label,test]of [['遗忘牌型',n=>n>=2],['收益牌型',n=>n<=27]])assert.deepEqual(new Set(out.handOptions.find(x=>x.label===label).options.map(x=>x.value)),new Set(['',...Object.keys(before.handLevels).filter(x=>test(before.handLevels[x]))]));}
    if(id==='S07'){
      await choose('fixture/recipient');await choose('fixture/recipient','donor');assert.equal(await target('fixture/recipient').isChecked(),false);await disabledTarget(out,'fixture/recipient',before);await disabledTarget(out,'fixture/watcher',before);await disabledConfirm(out,before,/请选择受益大丑牌/);out.independentSacrificeSelection='Selecting same donor clears that recipient and disables self-recipient';
    }
    await close();assert.deepEqual(await state(),before);assert.deepEqual(await selected(),selectedBefore);
    await open(id);await selectLegal(id);out.beforeConfirm=await capturePreview(id);await page.locator('.tool-preview').scrollIntoViewIfNeeded();
    if(['S05','S07'].includes(id)||id==='S03'&&!report.buildReused){const name='390-'+id.toLowerCase()+'-cost-preview.png';await shot(name);out.screenshots.push(name);}
    if(id==='S03'&&report.buildReused)out.sameBuildPriorCostPreview='first/390-s03-cost-preview.png';
    await close();assert.deepEqual(await state(),before);assert.deepEqual(await selected(),selectedBefore);out.cancellation.push({kind:'legal selected targets/cost disclosure then native Cancel',beforeRunSHA256:digest(before),afterRunSHA256:digest(await state()),beforeSelection:selectedBefore,afterSelection:await selected(),status:'PASS'});
    await open(id);await selectLegal(id);await capturePreview(id);await confirm().scrollIntoViewIfNeeded();const p=await confirm().boundingBox();await page.touchscreen.tap(p.x+p.width/2,p.y+p.height/2);await page.touchscreen.tap(p.x+p.width/2,p.y+p.height/2);
    await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.commandSeq);await ready();await page.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));
    const after=await state(),command={runId:before.runId,commandId:after.receipts.at(-1).commandId,expectedSeq:before.commandSeq,action:actionFor(id)},reference=applyCommand(before,command);assert.ok(reference.ok,JSON.stringify(reference));assert.deepEqual(after,json(reference.state));
    assert.equal(reference.events.filter(e=>e.type==='consumable-used').length,1);assert.equal(reference.events.filter(e=>e.type==='joker-transaction'&&(e.phase==='onBuyOffer'||e.phase==='onSellJoker')).length,0);
    verifyResult(id,before,after,out);const replay=applyCommand(after,command);assert.ok(replay.ok);assert.deepEqual(replay.state,after);assert.deepEqual(replay.events,[]);const checkpoint=readCheckpoint(json(makeCheckpoint(after,[])));assert.ok(checkpoint.ok);assert.deepEqual(checkpoint.checkpoint.state,after);
    out.confirmation={nativeAttempts:2,committedUseEvents:1,commandSeq:[before.commandSeq,after.commandSeq],consumables:[before.consumables.length,after.consumables.length],sentinelRetained:true,completeSavedStateVsAuthoritativeCommand:'PASS',sameCommandReplay:'PASS_IDENTICAL_STATE_NO_EVENTS',checkpointRead:'PASS',beforeRunSHA256:digest(before),afterRunSHA256:digest(after),events:json(reference.events)};
    out.returned=await observe(after);if(await scene()==='game')out.deckViewText=await deckView(after);else out.shopBuildText=await shopBuild(after);
    if(id==='S01')assert.ok(!out.deckViewText.includes('K♥'));
    if(id==='S02'||id==='S07')out.returnedJokerDetail=await inspectJoker(after,'fixture/recipient');if(id==='S06')out.returnedJokerDetail=await inspectJoker(after,after.jokers.at(-1).instanceId);
    out.reload=await reload(after);
    if(['S03','S04','S08'].includes(id)){
      const entered=await enterStage(after);assert.equal(entered.stage.initialHands,r2HandsBudget(after));assert.equal(entered.stage.handLimit,r2HandLimit(after));assert.equal(entered.handOrder.length,entered.stage.handLimit);out.nextStage={initialHands:entered.stage.initialHands,handsLeft:entered.stage.handsLeft,handLimit:entered.stage.handLimit,handCount:entered.handOrder.length,ui:await observe(entered),status:'PASS'};out.nextStage.deckViewText=await deckView(entered);if(id==='S03')assert.ok((out.nextStage.deckViewText.match(/K♥/g)??[]).length>=3);out.nextStage.reload=await reload(entered);
    }
    out.status='PASS';console.log(JSON.stringify({id,status:'PASS',invalid:out.invalid.length,disabledTargets:out.disabledTargets.length,gold:out.effect.additionalGold??out.effect.allGold??'unchanged',nextStage:out.nextStage?{hands:out.nextStage.initialHands,handLimit:out.nextStage.handLimit}:null,reload:true}));
  }catch(e){out.status='FAIL';out.error=String(e);const name='390-'+id.toLowerCase()+'-failure.png';await shot(name).catch(()=>{});throw e;}
}
try{
  assert.equal(report.build.revision,base);assert.equal(report.build.modified,false);await page.goto('http://127.0.0.1:5311/?harness=1');await waitScene(page,'title');for(const id of caseIds)await run(id);assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;console.error(e);}
finally{
  report.sourceFreeze.after=snapshotSource(process.cwd());assert.deepEqual(report.sourceFreeze.after,frozen);report.sourceFreeze.status='PASS';await ctx.close();await browser.close();await server.httpServer.close();await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.map(c=>({id:c.id,status:c.status,error:c.error})),screenshots:report.screenshots,source:commit}));
}
