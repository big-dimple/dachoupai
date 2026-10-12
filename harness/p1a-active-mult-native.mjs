import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {waitScene,tapUI,chooseCharacter} from './ui.mjs';
const sourceHash=()=>{const h=createHash('sha256');for(const p of execFileSync('git',['ls-files','-z','src'],{encoding:'utf8'}).split('\0').filter(Boolean).sort())h.update(p).update(readFileSync(p));return h.digest('hex');};
const sourceBefore=sourceHash();
const out=process.env.P1A_NATIVE??'/tmp/p1a-active-mult-native';await mkdir(out,{recursive:true});
const server=await createServer({cacheDir:'/tmp/p1a-native-vite',mode:'e2e',server:{host:'127.0.0.1',port:5648,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const f=await server.ssrLoadModule('/tests/fixtures/p1a-active-mult.ts'),tf=await server.ssrLoadModule('/tests/fixtures/touye-new-core.ts'),cp=await server.ssrLoadModule('/src/application/checkpoint.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={scope:'PC1366/390 controlled legal imports, native choice/cancel/bet/play/cold restore/failed save retry, real source trace captions; no natural runs, physical device or audio claim',identity:f.activeIdentity,sourceSha256:sourceBefore,rows:[],status:'RUNNING'};
try{
 for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
  const touch=viewport.width===390,ctx=await browser.newContext({viewport,hasTouch:touch,reducedMotion:'reduce'}),p=await ctx.newPage();p.setDefaultTimeout(25000);p.on('dialog',d=>d.accept());const errors=[];p.on('pageerror',e=>errors.push(String(e)));
  const dom=l=>touch?l.tap():l.click(),tap=name=>tapUI(p,'game',name,touch);
  const ready=()=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
  const finished=()=>p.waitForFunction(()=>{const h=window.__harness;if(h.game.scene.isActive('intermission'))return h.game.scene.getScene('intermission').ready;const s=h.game.scene.getScene('game');return s.ready&&!s.playing&&!s.presentation;});
  const snap=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});
  const shot=async name=>{const file=viewport.width+'-'+name+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});return file;};
  const imp=async s=>{assert.equal(cp.readCheckpoint(cp.makeCheckpoint(s,[])).ok,true);if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await dom(p.locator('.run-menu-toggle'));const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await dom(sec.locator('summary'));const fc=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));await(await fc).setFiles({name:'p1a-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp.makeCheckpoint(s,[])))});await waitScene(p,'game');await ready();assert.deepEqual((await snap()).state,s);};
  const select=async ids=>{for(const id of ids)await tap('card/'+id);await ready();};
  const cold=async expected=>{await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await finished();assert.deepEqual(await snap(),expected);};
  await p.goto('http://127.0.0.1:5648/?harness=1');await waitScene(p,'title');await chooseCharacter(p,'xiemu',touch);assert.deepEqual({contentVersion:(await snap()).state.contentVersion,contentHash:(await snap()).state.contentHash},f.activeIdentity);
  for(const kind of ['xiemu','azao','touye-won','touye-lost']){
   const isTouye=kind.startsWith('touye'),x=isTouye?tf.touyeFixture(kind==='touye-won'?'mature-win':'mature-old-core',{identity:f.activeIdentity,jokers:['c06','jiedongfeng']}):f.activeRunFixture(kind);
   if(isTouye){x.state.jokers.find(j=>j.definitionId==='c06').growth.multiplier={n:'6',d:'1'};x.state.jokers.find(j=>j.definitionId==='c06').edition='polychrome';}
   await imp(x.state);const row={viewport,kind,before:await snap(),status:'RUNNING'};report.rows.push(row);
   if(isTouye){
    await select(x.discard);await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:'押两对',exact:true}));await dom(p.getByRole('button',{name:'取消 · 不弃牌',exact:true}));assert.deepEqual(await snap(),row.before);row.cancelUnchanged=true;
    await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:'押两对',exact:true}));await dom(p.getByRole('button',{name:'确认押两对并弃'+x.discard.length+'张',exact:true}));await ready();row.pending=await snap();const expected=tf.touyeSend(x.state,tf.touyeBet(x.state,x.discard,x.target));assert.deepEqual(row.pending.state,expected);await cold(row.pending);await ready();row.pendingColdRestoreExact=true;
    await select(x.play);
   }else{
    await select(x.action.selectedIds);await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:kind==='xiemu'?'燃30金 ×4':/^本手释放 ×1\.5/,exact:kind==='xiemu'}));assert.deepEqual(await snap(),row.before);
    await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:kind==='xiemu'?'取消本手燃金':/^取消本手释放/,exact:kind==='xiemu'}));assert.deepEqual(await snap(),row.before);row.cancelUnchanged=true;
    await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:kind==='xiemu'?'燃30金 ×4':/^本手释放 ×1\.5/,exact:kind==='xiemu'}));assert.deepEqual(await snap(),row.before);
   }
   row.beforePlay=await snap();const chosen=isTouye?x.play:x.action.selectedIds,ids=row.beforePlay.state.handOrder.filter(id=>chosen.includes(id)),action=isTouye?{type:'PlayHand',selectedIds:ids}:x.action,expected=tf.touyeSend(row.beforePlay.state,action),event=expected.lastTrace.events.find(e=>e.sourceType==='character'&&e.phase==='characterScore');
   row.action=action;row.expectedEvent=event;assert.equal(expected.lastTrace.events.indexOf(event),expected.lastTrace.events.findIndex(e=>e.phase==='finalScore')-1);
   row.publicInput=await p.evaluate(()=>window.__harness.game.scene.getScene('game').aiInput().score);assert.equal(row.publicInput.activeMultTiming,'after-route-growth');
   await p.evaluate(()=>{window.__p1aOrder=[];window.__harness.game.events.on('poststep',()=>{const s=window.__harness.game.scene.getScene('game'),id=s.scoreTotal?.getData('eventId');if(id&&window.__p1aOrder.at(-1)!==id)window.__p1aOrder.push(id);});});
   await tap('action/play');await p.waitForFunction(id=>{const s=window.__harness.game.scene.getScene('game');return s.scoreTotal.getData('eventId')===id&&s.scoreTotal.getData('eventPhase')==='impact'&&s.resultText.getData('exactMultiplierCaption')?.eventId===id;},event.eventId);
   row.caption=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),b=s.resultText.getBounds();return {text:s.resultText.text,exact:s.resultText.getData('exactMultiplierCaption')?.eventId===s.scoreTotal.getData('eventId')?s.resultText.getData('exactMultiplierCaption'):undefined,eventId:s.scoreTotal.getData('eventId'),bounds:{x:b.x,y:b.y,width:b.width,height:b.height},visible:s.resultText.visible,hero:s.heroClimax?.group.getData('eventId')};});
   assert.equal(row.caption.eventId,event.eventId);if(row.caption.exact)assert.equal(row.caption.exact.eventId,event.eventId);assert.match(row.caption.text,kind==='xiemu'?/谢幕.*×4/:kind==='azao'?/阿燥.*×1.5/:kind==='touye-won'?/骰爷.*×2/:/骰爷.*×0.85/);assert.ok(row.caption.bounds.x>=0&&row.caption.bounds.x+row.caption.bounds.width<=viewport.width+1);row.sourceShot=await shot(kind+'-source');
   await finished();row.after=await snap();assert.deepEqual(row.after.state,expected);assert.deepEqual(row.after.journal,[...row.beforePlay.journal,tf.touyeCommand(row.beforePlay.state,action)]);assert.deepEqual(row.after.storage.current,cp.makeCheckpoint(expected,row.after.journal));row.seenOrder=await p.evaluate(()=>window.__p1aOrder);
   const roleIndex=row.seenOrder.indexOf(event.eventId);for(const e of expected.lastTrace.events.filter(e=>e.phase==='jokerScore'||e.phase==='routeGrowth')){assert.ok(row.seenOrder.includes(e.eventId));assert.ok(row.seenOrder.indexOf(e.eventId)<roleIndex);}row.resultShot=await shot(kind+'-saved');await cold(row.after);row.coldRestoreExact=true;
   // Actual failure and retry is a second controlled transaction from the same checkpoint.
   await imp(row.beforePlay.state);await select(ids);if(!isTouye){await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:kind==='xiemu'?'燃30金 ×4':/^本手释放 ×1\.5/,exact:kind==='xiemu'}));}
   const beforeFailure=await snap();await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),st=gameSession().storage,commit=st.commit.bind(st);window.__p1aWrites=[];window.__p1aFail=true;st.commit=(...args)=>{window.__p1aWrites.push(JSON.stringify(args[1]));if(window.__p1aFail){window.__p1aFail=false;return Promise.reject(Error('controlled quota failure'));}return commit(...args);};});
   await tap('action/play');await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused');assert.deepEqual(await snap(),beforeFailure);row.failedSaveUnpublished=true;
   if(!await p.locator('.run-menu-modal').evaluate(e=>e.open))await dom(p.locator('.run-menu-toggle'));await dom(p.getByRole('button',{name:'重试保存',exact:true}));await finished();row.retried=await snap();assert.deepEqual(row.retried.state,expected);const writes=await p.evaluate(()=>window.__p1aWrites);assert.equal(writes.length,2);assert.equal(writes[0],writes[1]);row.retryCandidateByteExact=true;row.retryCold=await snap();await cold(row.retryCold);row.status='PASS';console.log(viewport.width,kind,'PASS');
  }
  assert.deepEqual(errors,[]);await ctx.close();
 }
 assert.equal(sourceHash(),sourceBefore);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);const p=browser.contexts().at(-1)?.pages().at(-1);if(p){await p.screenshot({path:out+'/FAIL.png',scale:'css'}).catch(()=>{});report.diagnostic=await p.evaluate(()=>({scenes:window.__harness?.game.scene.getScenes(true).map(s=>({key:s.scene.key,ready:s.ready,playing:s.playing,presentation:!!s.presentation})),dialogs:[...document.querySelectorAll('dialog[open]')].map(e=>e.innerText)})).catch(()=>null);}throw error;}finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:report.rows.map(r=>({width:r.viewport.width,kind:r.kind,status:r.status,caption:r.caption?.text})),error:report.error}));}
