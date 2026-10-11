/** Bounded native regression; controlled stage-seven inventory, never a user's save. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,point} from './ui.mjs';

const beforeMode=process.argv.includes('--before');
const sourceHash=createHash('sha256').update(await readFile('src/game/GameScene.ts')).digest('hex');
const out=process.env.INVENTORY_REFILL_OUTPUT??'/tmp/tool-inventory-refill';
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5586,strictPort:true},logLevel:'error'});
await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const send=(s,action)=>{const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});assert.ok(r.ok,r.code);return r.state;};
let fixture=createRun({seed:'inventory-refill-controlled',runId:'controlled/inventory-refill',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
// Public stage/inventory setup only. The four discards and choice below use production UI.
fixture=send(fixture,{type:'LeaveShop'});
fixture.stageIndex=6;fixture.chapter=3;fixture.shop=null;
fixture.seenBossIds=['B01','B02','B04'];fixture.boss={definitionId:'B04',disabledSuit:null};
fixture.longTermItems=['U02'];fixture.consumables=[{instanceId:'controlled/T17',definitionId:'T17'}];
fixture=send(fixture,{type:'EnterStage'});
const checkpoint=makeCheckpoint(fixture,[]);assert.ok(readCheckpoint(checkpoint).ok,'strict fixture validation');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),gameSceneSha256:sourceHash,mode:beforeMode?'before':'after',scope:'System Chromium software Canvas, DPR1, PC mouse/portrait touch; controlled validator-approved stage 7/U02/T17, four real discards before first play. No natural journey, physical device, user save or production writes.',cases:[]};
try {
 for(const viewport of [{width:1366,height:768},{width:390,height:740}]){
  const touch=viewport.width===390,context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(15000);
  const row={viewport,errors:[],checks:[],states:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
  const tap=name=>tapUI(p,'game',name,touch),dom=async locator=>touch?locator.tap():locator.click();
  const settle=()=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
  const snap=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),session=gameSession(),controller=window.__harness.game.registry.get('runController'),s=window.__harness.game.scene.getScene('game');return {state:controller.state,journal:controller.journal,storage:await session.storage.read(),entry:{phase:s.run.phase,ready:s.ready,playing:s.playing,presentation:!!s.presentation,pending:!!s.pendingRefill,enabled:s.inventoryButton.input.enabled,status:controller.status,writable:session.lease.writable}};});
  const saved=async()=>{const {state,journal,storage}=await snap();return {state,journal,storage};};
  const shot=name=>p.screenshot({path:out+'/'+viewport.width+'-'+name+'.png',scale:'css'});
  const close=async(label='关闭')=>{await dom(p.getByRole('button',{name:label,exact:true}));await p.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));};
  const open=async()=>{await tap('action/tool-inventory');await p.locator('.tool-inventory[open]').waitFor();};
  const detail=async()=>{await open();await dom(p.locator('.tool-inventory-card[data-item-id="controlled/T17"]'));await p.locator('.tool-detail[open]').waitFor();};
  const inspectLocked=async(status,before)=>{
   await detail();const confirm=p.getByRole('button',{name:'确认使用',exact:true});assert.ok(await confirm.isDisabled());assert.ok(await p.getByRole('button',{name:'销毁物品',exact:true}).isDisabled());
   row.inspections??=[];row.inspections.push({status,entry:(await snap()).entry,confirmDisabled:true,destroyDisabled:true,text:await p.locator('.tool-detail[open]').innerText()});await shot(status+'-view');
   const b=await confirm.boundingBox();assert.ok(b);if(touch)await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await p.mouse.click(b.x+b.width/2,b.y+b.height/2);assert.deepEqual(await saved(),before);await close('取消');assert.deepEqual(await saved(),before);
  };
  const imp=async cp=>{
   await dom(p.locator('.run-menu-toggle'));const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await dom(sec.locator('summary'));
   const event=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));await(await event).setFiles({name:'controlled-refill.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(p,'game');await settle();
  };
  try {
   await p.goto('http://127.0.0.1:5586/?harness=1');await waitScene(p,'title');
   await imp(checkpoint);
   let expected=fixture;assert.deepEqual((await snap()).state,expected);row.states.push({name:'initial',snapshot:await snap()});
   // A full discard budget makes T17 unavailable, but the box still opens for inspection.
   const initial=await saved();await detail();assert.ok(await p.getByRole('button',{name:'确认使用',exact:true}).isDisabled());await close('取消');assert.deepEqual(await saved(),initial);row.checks.push('unavailable T17 remains inspectable; cancel writes nothing');
   for(let i=0;i<3;i++){const id=expected.handOrder[0];await tap('card/'+id);await tap('action/discard');expected=send(expected,{type:'DiscardHand',selectedIds:[id]});await settle();assert.deepEqual((await snap()).state,expected);}
   const discard=expected.handOrder[0];await tap('card/'+discard);await tap('hero/laohuan-trick');await dom(p.getByRole('button',{name:/^戏法弃1张 · 留应补数$/,exact:true}));expected=send(expected,{type:'DiscardHand',selectedIds:[discard],laohuanTrick:true});await settle();
   assert.equal(expected.phase,'pending-refill');assert.equal(expected.stage.discardsLeft,0);assert.equal(expected.stage.playIndex,0);assert.deepEqual((await snap()).state,expected);
   row.states.push({name:'pending',snapshot:await snap()});const pending=await saved();assert.equal((await snap()).entry.enabled,false);await tap('action/tool-inventory');assert.equal(await p.locator('.tool-inventory[open]').count(),0);assert.deepEqual(await saved(),pending);
   await tap('action/discard');assert.deepEqual(await saved(),pending);await tap('action/discard');assert.deepEqual(await saved(),pending);row.checks.push('pending box blocked; hide/reopen preserves fixed candidates and complete save');
   const selected=expected.pendingRefill.candidateIds.slice(0,expected.pendingRefill.required);for(const id of selected)await tap('card/'+id);
   const playPoint=await point(p,'game','action/play');
   await tap('action/play');const repeated=touch?()=>p.touchscreen.tap(playPoint.x,playPoint.y):()=>p.mouse.click(playPoint.x,playPoint.y);await repeated();
   expected=send(expected,{type:'ChooseRefill',selectedIds:selected});await settle();assert.deepEqual((await snap()).state,expected);
   const chosen=await saved();assert.equal(chosen.journal.filter(c=>c.action.type==='ChooseRefill').length,1);row.states.push({name:'chosen',snapshot:await snap()});await shot('chosen');
   if(beforeMode){
    assert.equal((await snap()).entry.ready,true);assert.equal((await snap()).entry.enabled,false);await tap('action/tool-inventory');await tap('action/tool-inventory');assert.equal(await p.locator('.tool-inventory[open]').count(),0);assert.deepEqual(await saved(),chosen);row.checks.push('REPRODUCED: await-input/ready/zero discards/T17 but input.enabled=false; two real box taps do nothing');await shot('two-taps-no-dialog');
   }else{
    assert.equal((await snap()).entry.enabled,true);await detail();assert.equal(await p.getByRole('button',{name:'确认使用',exact:true}).isEnabled(),true);await shot('t17-restorable');await close('取消');assert.deepEqual(await saved(),chosen);await detail();await close('取消');assert.deepEqual(await saved(),chosen);row.checks.push('choice enables box without full render; two open/cancel cycles write nothing');
    // Actual save boundary: hold the next storage commit, then reject it as quota failure.
    await detail();await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),session=gameSession();window.__originalCommit=session.storage.commit.bind(session.storage);window.__commitAttempts=0;session.storage.commit=(...args)=>{window.__commitAttempts++;return new Promise((resolve,reject)=>{window.__rejectSave=()=>reject(new DOMException('controlled quota failure','QuotaExceededError'));window.__finishSave=()=>window.__originalCommit(...args).then(resolve,reject);});};});
    await dom(p.getByRole('button',{name:'确认使用',exact:true}));await p.waitForFunction(()=>window.__commitAttempts===1);row.states.push({name:'saving',snapshot:await snap()});assert.equal((await snap()).entry.enabled,false);assert.ok(await p.getByRole('button',{name:'正在保存…',exact:true}).isDisabled());
    await p.evaluate(()=>window.__rejectSave());await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused'&&!window.__harness.game.scene.getScene('game').playing);if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await close('取消');row.states.push({name:'paused',snapshot:await snap()});assert.equal((await snap()).entry.enabled,true);await inspectLocked('paused',chosen);await inspectLocked('paused-repeat',chosen);assert.equal(await p.evaluate(()=>window.__commitAttempts),1);assert.deepEqual(await saved(),chosen);row.checks.push('one held submission; stable paused normal entry opens T17 twice for inspection, use/destroy disabled and cancel/repeat writes nothing');
    // Retry the original candidate via production menu; no recalculation or second consumption.
    await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts');gameSession().storage.commit=window.__originalCommit;});await dom(p.locator('.run-menu-toggle'));await dom(p.getByRole('button',{name:'重试保存',exact:true}));await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='idle');if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await settle();
    expected=send(expected,{type:'UseConsumable',instanceId:'controlled/T17',targetIds:[]});assert.deepEqual((await snap()).state,expected);assert.equal(expected.stage.discardsLeft,1);assert.equal(expected.consumables.length,0);const restored=await saved();row.states.push({name:'retry-saved',snapshot:await snap()});assert.equal(restored.journal.filter(c=>c.action.type==='UseConsumable').length,1);assert.equal((await snap()).entry.enabled,true);await open();await close();assert.deepEqual(await saved(),restored);row.checks.push('native retry persists original T17 once; restored entry and empty box remain usable');
    // Re-import our own successful choice for a live T17 preview, then lose the real lease.
    await imp(chosen.storage.current);assert.deepEqual((await snap()).state,chosen.state);const readonlySaved=await saved();await detail();assert.ok(await p.getByRole('button',{name:'确认使用',exact:true}).isEnabled());
    await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),session=gameSession(),commit=session.storage.commit.bind(session.storage);window.__readonlyAttempts=0;session.storage.commit=(...args)=>{window.__readonlyAttempts++;return commit(...args);};session.lease.drop();});await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='readonly');row.states.push({name:'readonly',snapshot:await snap()});assert.equal((await snap()).entry.enabled,true);if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));
    await dom(p.getByRole('button',{name:'确认使用',exact:true}));assert.deepEqual(await saved(),readonlySaved);await close('取消');await inspectLocked('readonly',readonlySaved);await inspectLocked('readonly-repeat',readonlySaved);assert.equal(await p.evaluate(()=>window.__readonlyAttempts),0);assert.deepEqual(await saved(),readonlySaved);row.checks.push('stable readonly normal entry opens T17 twice, use/destroy disabled; pre-opened confirm rechecks lease with zero write attempts/state/journal/storage changes');
   }
   assert.deepEqual(row.errors,[]);row.status='PASS';
  }catch(e){row.status='FAIL';row.error=e.stack??String(e);await shot('FAIL');throw e;}finally{await context.close();}
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack??String(e);process.exitCode=1;}
finally{assert.equal(createHash('sha256').update(await readFile('src/game/GameScene.ts')).digest('hex'),sourceHash,'product source stayed frozen during native checks');await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.map(r=>({viewport:r.viewport,status:r.status,checks:r.checks,error:r.error}))}));}
