/** One validated hand, native touch/DOM inputs and read-only observations. No performance claim. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,point,waitScene} from './ui.mjs';
import {snapshotSource} from '../scripts/check-runner.mjs';
const dir='shots/p08-sort-return';await mkdir(dir,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});let fixture,fixtureIds;
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 let s=createRun({seed:'p08-sort-return',runId:'fixture/p08-sort-return',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s.jokers=['c08','c09','f09'].map(id=>r2CreateJoker(id,'sort/'+id,0));
 for(const type of ['LeaveShop','EnterStage']){const r=applyCommand(s,{runId:s.runId,commandId:type,expectedSeq:s.commandSeq,action:{type}});assert.ok(r.ok);s=r.state;}
 fixtureIds=[[7,'spades'],[7,'hearts'],[7,'clubs'],[2,'spades'],[4,'hearts']].map(([rank,suit])=>s.deckInstances.find(c=>c.rank===rank&&c.suit===suit).id);
 const rest=s.deckInstances.filter(c=>!fixtureIds.includes(c.id)).map(c=>c.id);s.handOrder=[...fixtureIds,...rest.splice(0,9-fixtureIds.length)];s.drawPile=rest;s.stage.initialHandLimit=9;s.stage.handLimit=9;
 const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok);fixture=JSON.stringify(cp);
}finally{await ssr.close();}
const frozen=snapshotSource(process.cwd());
await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({build:{outDir:dir+'/build'},preview:{port:5298,strictPort:true,host:'127.0.0.1'},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']}),context=await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:1,hasTouch:true,reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
const report={taskId:'P08',testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseCommit:'3938cee365994910d7d79f62fc91701273f2efe0',build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),browser:browser.version(),renderer:'Chromium software Canvas',viewport:{width:390,height:740},DPR:1,input:'native touchscreen.tap / DOM tap; read-only Phaser observers',fixture:'Validator-approved native checkpoint import: amo, c08/c09/f09 and known nine-card hand. Controlled input coverage, not natural acquisition.',physicalDevice:'NOT_RUN',GPU:'NOT_RUN',audio:'NOT_RUN',checks:[],sorts:[],errors};
const state=()=>page.evaluate(()=>window.__harness.game.registry.get('runController').state),selected=()=>page.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),ready=()=>page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
const fixedState=s=>{const {handOrder,commandSeq,receipts,...rest}=s;return rest;};
const geometry=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),l=s.view.layout;return {hand:l.hand,cards:l.cards,playedArea:l.playedArea,tableActions:l.tableActions,visibleCardCount:l.visibleCardCount};});
async function assertReturned(){
 const observed=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {selected:[...s.selectedIds],ghost:!!s.candidateGhost,undo:!!s.candidateUndo,status:s.statusMessage,cards:s.cardViews.map((v,i)=>({id:v.card.id,selected:v.container.getData('selected'),mark:v.selectionMark?.visible,y:v.container.y,restY:s.view.layout.cards[i].visual.y+s.view.layout.cards[i].visual.height/2,scaleX:v.container.scaleX,scaleY:v.container.scaleY}))};});
 assert.deepEqual(observed.selected,[]);assert.equal(observed.ghost,false);assert.equal(observed.undo,false);assert.doesNotMatch(observed.status,/已换组|已切换|撤销|选择已保留/);
 for(const c of observed.cards){assert.equal(c.selected,false);assert.equal(c.mark,false);assert.ok(Math.abs(c.y-c.restY)<.01,'every card returns to its ordinary seat');assert.equal(c.scaleX,1);assert.equal(c.scaleY,1);}return observed;
}
async function sort(mode,label){
 const before=await state(),selectedBefore=await selected(),beforeGeometry=await geometry(),focus=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.hand[s.focusIndex]?.id;}),suits=['spades','hearts','clubs','diamonds'],cards=before.handOrder.map(id=>before.deckInstances.find(c=>c.id===id));
 cards.sort((a,b)=>mode==='rank'?b.rank-a.rank||suits.indexOf(a.suit)-suits.indexOf(b.suit):suits.indexOf(a.suit)-suits.indexOf(b.suit)||b.rank-a.rank);
 await tapUI(page,'game','action/sort-'+mode,true);await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.commandSeq);await ready();
 const after=await state();assert.deepEqual(after.handOrder,cards.map(c=>c.id));assert.deepEqual(fixedState(after),fixedState(before),'sort consumes no hand/discard/gold and changes no rules/RNG/trace/deck');assert.deepEqual(after.receipts.slice(0,-1),before.receipts);assert.equal(after.receipts.length,before.receipts.length+1);assert.deepEqual(await geometry(),beforeGeometry,'sort preserves the complete hand/action footprints');
 assert.equal(await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.hand[s.focusIndex]?.id;}),focus,'existing focus follows card ID after reorder');
 report.sorts.push({mode,label,beforeSeq:before.commandSeq,afterSeq:after.commandSeq,selectedBefore,returned:await assertReturned()});
}
async function openCandidates(){await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').candidates.result?.status==='ready');await tapUI(page,'game','selection/facts',true);await page.getByRole('dialog',{name:'本轮可成牌型',exact:true}).waitFor();}
try{
 assert.equal(report.build.revision,report.testedCommit);assert.equal(report.build.modified,false);
 await page.goto('http://127.0.0.1:5298/?harness=1');await waitScene(page,'title');await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'sort-return-fixture.json',mimeType:'application/json',buffer:Buffer.from(fixture)});await waitScene(page,'game');await ready();
 assert.equal(await page.evaluate(()=>window.__harness.game.renderer.type),1);assert.equal((await state()).handOrder.length,9);
 for(const id of fixtureIds.slice(0,2))await tapUI(page,'game','card/'+id,true);assert.deepEqual(new Set(await selected()),new Set(fixtureIds.slice(0,2)));await sort('rank','manual two-card selection');
 await sort('rank','repeated rank with empty selection');await sort('suit','empty selection, suit order');
 await openCandidates();const example=page.locator('.candidate-choice[data-type="three-kind"]').first(),group=example.locator('..');if(!await group.evaluate(e=>e.open))await group.locator('summary').tap();await example.tap();const ids=JSON.parse(await example.getAttribute('data-ids'));assert.equal(ids.length,3);assert.deepEqual(await selected(),[]);assert.equal(await page.evaluate(()=>!!window.__harness.game.scene.getScene('game').candidateGhost),true);
 await page.getByRole('button',{name:'换为这组',exact:true}).tap();assert.deepEqual(new Set(await selected()),new Set(ids));assert.equal(await page.evaluate(()=>!!window.__harness.game.scene.getScene('game').candidateUndo),true);await sort('suit','explicit adviser-applied three-kind');
 await openCandidates();assert.equal(await page.getByRole('button',{name:'撤销换组',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'关闭',exact:true}).tap();assert.deepEqual(await selected(),[]);
 const beforeRules=await state();await tapUI(page,'game','selection/hand-rules',true);assert.match(await page.getByRole('dialog').innerText(),/同花五条/);await page.getByRole('button',{name:'关闭',exact:true}).tap();assert.deepEqual(await state(),beforeRules);await assertReturned();
 await page.screenshot({path:dir+'/390-returned-hand.png',scale:'css'});
 report.checks.push('manual/adviser selections return before rank/suit sort; repeated and empty sort stay empty; every card lowered, same9-card geometry and ID focus','one existing ReorderHand per tap: complete state unchanged apart from order/seq/receipt; no hands/discards/gold/RNG/trace/deck changes','fresh adviser catalog cannot undo the old extracted hand; all12 rule reference remains available');
 // Observe an actual saved play and tap the disabled controls during its ordinary presentation.
 const low=fixtureIds[3];await tapUI(page,'game','card/'+low,true);assert.deepEqual(await selected(),[low]);const beforePlay=await state(),points=await Promise.all(['action/sort-rank','action/sort-suit'].map(name=>point(page,'game',name)));
 await page.evaluate(()=>{const g=window.__harness.game;window.__sortBusyFrames=[];g.events.on('postrender',()=>{const s=g.scene.getScene('game');if(!s.playing&&!s.presentation)return;const walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),objects=walk(s.children.list);window.__sortBusyFrames.push({playing:s.playing,presentation:!!s.presentation,seq:g.registry.get('runController').state.commandSeq,enabled:['action/sort-rank','action/sort-suit'].map(name=>!!objects.find(o=>o.name===name)?.input?.enabled)});});});
 await tapUI(page,'game','action/play',true);await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.playing&&!!s.presentation;});const savedPlay=await state(),duringSelected=await selected();assert.equal(savedPlay.commandSeq,beforePlay.commandSeq+1);assert.ok(savedPlay.lastTrace);
 for(const p of points)await page.touchscreen.tap(p.x,p.y);assert.deepEqual(await state(),savedPlay,'disabled sort taps cannot add a reorder during settlement');assert.deepEqual(await selected(),duringSelected);await ready();assert.deepEqual(await state(),savedPlay);
 report.busyFrames=await page.evaluate(()=>window.__sortBusyFrames);assert.ok(report.busyFrames.some(f=>f.presentation));assert.ok(report.busyFrames.every(f=>f.enabled.every(e=>!e)));report.checks.push('real once-only saved play: rank/suit disabled through busy/presentation; native taps add no command or state change; next-hand click maps to the correct ID');
 assert.deepEqual(errors,[]);assert.deepEqual(snapshotSource(process.cwd()),frozen,'build/browser run retains source, index and HEAD');report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;console.error(e);}finally{await context.close();await browser.close();await server.httpServer.close();await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,testedCommit:report.testedCommit,checks:report.checks,sortCount:report.sorts.length},null,2));}
