import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {waitScene,tapUI,chooseCharacter} from './ui.mjs';
const out=process.env.TOUYE_CORE_OUTPUT??'/tmp/touye-new-core-native';await mkdir(out,{recursive:true});
const server=await createServer({cacheDir:'/tmp/touye-core-native-vite',mode:'e2e',server:{host:'127.0.0.1',port:5638,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const {touyeFixture,touyeSend,touyeBet,touyeCommand}=await server.ssrLoadModule('/tests/fixtures/touye-new-core.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {R2_ROUTE_GROWTH_VERSION,R2_ROUTE_GROWTH_HASH,R2_TOUYE_CORE_VERSION,R2_TOUYE_CORE_HASH}=await server.ssrLoadModule('/src/domain/r2GroupUpgrade.ts');
const {HAND_LABELS}=await server.ssrLoadModule('/src/content/handLabels.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={scope:'bounded planted legal states, actual UI actions and full state/journal/IndexedDB; no natural game/seed search or full18',identity:{contentVersion:R2_TOUYE_CORE_VERSION,contentHash:R2_TOUYE_CORE_HASH},rows:[],status:'RUNNING'};
try{
 for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
  const touch=viewport.width===390,ctx=await browser.newContext({viewport,hasTouch:touch,reducedMotion:'reduce'}),p=await ctx.newPage();p.setDefaultTimeout(20000);p.on('dialog',d=>d.accept());const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  const dom=l=>touch?l.tap():l.click(),tap=name=>tapUI(p,'game',name,touch);
  const settle=()=>p.waitForFunction(()=>{const s=window.__harness?.game.scene.getScene('game');return s?.ready&&!s.presentation&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
  const snap=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await gameSession().storage.read()};});
  const ui=()=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return{role:s.roleText.text,status:s.statusText.text,shortcut:s.heroActionButton.getData('label').text,enabled:s.heroActionButton.input.enabled};});
  const shot=async name=>{const file=viewport.width+'-'+name+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});return file;};
  const close=async()=>{await dom(p.locator('.detail-dialog[open] .dialog-close'));await p.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));};
  const imp=async s=>{assert.equal(readCheckpoint(makeCheckpoint(s,[])).ok,true);if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await dom(p.locator('.run-menu-toggle'));const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await dom(section.locator('summary'));const fc=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));await(await fc).setFiles({name:'controlled-touye-core.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});await waitScene(p,'game');await settle();assert.deepEqual((await snap()).state,s);};
  const select=async ids=>{for(const id of ids)await tap('card/'+id);await settle();};
  const retry=async()=>{if(!await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await dom(p.getByRole('button',{name:'重试保存',exact:true}));await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='idle');if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await settle();};
  await p.goto('http://127.0.0.1:5638/?harness=1');await waitScene(p,'title');await chooseCharacter(p,'touye',touch);const normal=await snap();assert.equal(normal.state.contentVersion,R2_TOUYE_CORE_VERSION);assert.equal(normal.state.contentHash,R2_TOUYE_CORE_HASH);
  for(const kind of ['mature-win','mature-old-core','mature-accompanying','short','disabled-core','legacy-mature']){
   const legacy=kind==='legacy-mature',f=touyeFixture(legacy?'mature-win':kind,legacy?{identity:{contentVersion:R2_ROUTE_GROWTH_VERSION,contentHash:R2_ROUTE_GROWTH_HASH},boss:{definitionId:'B05',disabledSuit:null}}:kind==='disabled-core'?{}:{boss:{definitionId:'B05',disabledSuit:null}});await imp(f.state);const row={viewport,kind,before:await snap()};report.rows.push(row);
   await select(f.discard);row.table=await ui();row.beforeShot=await shot(kind+'-selected');await tap('hero/action-shortcut');row.choiceText=await p.locator('.detail-dialog[open]').innerText();row.choiceShot=await shot(kind+'-choices');
   if(legacy){assert.equal(await p.getByRole('button',{name:'押'+HAND_LABELS[f.target],exact:true}).isEnabled(),false);await close();assert.deepEqual(await snap(),row.before);row.status='PASS';continue;}
   await dom(p.getByRole('button',{name:'押'+HAND_LABELS[f.target],exact:true}));row.confirmText=await p.locator('.detail-dialog[open]').innerText();assert.match(row.confirmText,/已成型也可押|新补/);if(kind==='short')assert.match(row.confirmText,/补1张/);row.confirmShot=await shot(kind+'-confirm');
   // A draft target/confirmation is a view. Cancel has no command or storage write.
   await dom(p.getByRole('button',{name:'取消 · 不弃牌',exact:true}));assert.deepEqual(await snap(),row.before);row.cancelUnchanged=true;
   await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),storage=gameSession().storage;window.__coreOriginalCommit=storage.commit.bind(storage);window.__coreWrites=[];window.__coreFail=false;storage.commit=(...args)=>{window.__coreWrites.push(JSON.stringify(args[1]));if(window.__coreFail){window.__coreFail=false;return Promise.reject(Error('controlled quota failure'));}return window.__coreOriginalCommit(...args);};});
   await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:'押'+HAND_LABELS[f.target],exact:true}));
   const failSave=viewport.width===1366&&kind==='mature-win';if(failSave)await p.evaluate(()=>window.__coreFail=true);
   await dom(p.getByRole('button',{name:'确认押'+HAND_LABELS[f.target]+'并弃'+f.discard.length+'张',exact:true}));
   if(failSave){await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused'&&!window.__harness.game.scene.getScene('game').playing);assert.deepEqual(await snap(),row.before);row.failedDiscardUnpublished=true;row.failedDiscardShot=await shot(kind+'-discard-paused');await retry();}
   await settle();row.afterBet=await snap();const expectedBet=touyeSend(f.state,touyeBet(f.state,f.discard,f.target));assert.deepEqual(row.afterBet.state,expectedBet);assert.deepEqual(row.afterBet.journal,[touyeCommand(f.state,touyeBet(f.state,f.discard,f.target))]);assert.deepEqual(row.afterBet.storage.current,makeCheckpoint(expectedBet,row.afterBet.journal));
   row.pending=await ui();row.pendingShot=await shot(kind+'-pending');await tap('hero/touye-wager');row.pendingDetails=await p.locator('.detail-dialog[open]').innerText();assert.match(row.pendingDetails,/新补/);await close();assert.deepEqual(await snap(),row.afterBet);
   row.publicScoreInput=await p.evaluate(()=>window.__harness.game.scene.getScene('game').aiInput().score.touyeWager);assert.doesNotMatch(JSON.stringify(row.publicScoreInput),/drawBefore|drawAfter|playedBefore|discardBefore|refillProof/);
   row.betWrites=await p.evaluate(()=>window.__coreWrites);if(failSave){assert.equal(row.betWrites[0],row.betWrites[1]);}
   // Cold restore must retain the same observed refill, never draw again.
   await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'game');await settle();assert.deepEqual(await snap(),row.afterBet);row.pendingRestoreExact=true;
   await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),storage=gameSession().storage;window.__coreOriginalCommit=storage.commit.bind(storage);window.__coreWrites=[];window.__coreFail=false;storage.commit=(...args)=>{window.__coreWrites.push(JSON.stringify(args[1]));if(window.__coreFail){window.__coreFail=false;return Promise.reject(Error('controlled quota failure'));}return window.__coreOriginalCommit(...args);};});
   await select(f.play);if(failSave)await p.evaluate(()=>window.__coreFail=true);await tap('action/play');
   if(failSave){await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused'&&!window.__harness.game.scene.getScene('game').playing);assert.deepEqual(await snap(),row.afterBet);row.failedPlayUnpublished=true;await retry();}
   await settle();row.afterPlay=await snap();const actualPlayIds=expectedBet.handOrder.filter(id=>f.play.includes(id)),expectedPlay=touyeSend(expectedBet,{type:'PlayHand',selectedIds:actualPlayIds});assert.deepEqual(row.afterPlay.state,expectedPlay);assert.deepEqual(row.afterPlay.journal,[...row.afterBet.journal,touyeCommand(expectedBet,{type:'PlayHand',selectedIds:actualPlayIds})]);assert.deepEqual(row.afterPlay.storage.current,makeCheckpoint(expectedPlay,row.afterPlay.journal));
   row.result=await ui();row.actual=expectedPlay.lastTrace.touyeWager;row.resultShot=await shot(kind+'-result');const writes=await p.evaluate(()=>window.__coreWrites);row.saveAttempts=writes.length;if(failSave){assert.equal(writes[0],writes[1]);row.retryCandidatesByteExact=true;}else assert.equal(writes.length,1); // reload created a fresh storage instance, only play is tracked after reload
   await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'game');await settle();assert.deepEqual(await snap(),row.afterPlay);row.playRestoreExact=true;row.status='PASS';console.log(viewport.width,kind,'PASS');
  }
  assert.deepEqual(errors,[]);await ctx.close();
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:report.rows.length,error:report.error}));}
