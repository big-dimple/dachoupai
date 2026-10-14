import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {point,waitScene,tapUI} from './ui.mjs';
const port=Number(process.env.TABLE_DRAG_PORT??5478),baseline=process.env.TABLE_DRAG_BASELINE==='1',dir=process.env.TABLE_DRAG_OUTPUT??(baseline?'/tmp/table-owned-before':'/tmp/table-owned-after');await mkdir(dir,{recursive:true});
const smoke=process.env.TABLE_DRAG_SMOKE==='1';
const server=await createServer({root:process.env.TABLE_DRAG_ROOT,cacheDir:`/tmp/table-drag-vite-${port}`,mode:'e2e',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand,assertRunInvariants}=await server.ssrLoadModule('/src/domain/run.ts'),{newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts'),{r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
let run=createRun({seed:'owned-drag-fixed',runId:'owned-drag-fixed',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group'});
run.jokers=['b03','b10','e01','e04','f12'].map((id,i)=>r2CreateJoker(id,'owned-drag/'+i,4));assertRunInvariants(run);
for(const action of [{type:'LeaveShop'},{type:'EnterStage'}]){const result=applyCommand(run,{runId:run.runId,commandId:run.runId+'/command/'+(run.commandSeq+1),expectedSeq:run.commandSeq,action});assert.ok(result.ok,result.code);run=result.state;}
assertRunInvariants(run);const cp=makeCheckpoint(run,[]);assert.ok(readCheckpoint(cp).ok);
const {touyeChoice}=await server.ssrLoadModule('/src/game/TouyeWagerCopy.ts');
function lockedCheckpoint(hero){
 let state=createRun({seed:'table-lock-'+hero,runId:'table-lock-'+hero,characterId:hero,rulesVersion:'r2',r2Identity:newRunIdentity(hero,'group'),openingRoute:'group'});
 state.jokers=['b03','b10','e01','e04','f12'].map((id,i)=>r2CreateJoker(id,'lock/'+hero+'/'+i,4));
 const send=action=>{const result=applyCommand(state,{runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});assert.ok(result.ok,result.code);state=result.state;};
 send({type:'LeaveShop'});send({type:'EnterStage'});const selectedIds=state.handOrder.slice(0,1);
 if(hero==='laohuan')send({type:'DiscardHand',selectedIds,laohuanTrick:true});
 else {const copy=touyeChoice(state,selectedIds),choice=copy.choices.find(c=>c.available);assert.ok(choice);send({type:'DiscardHand',selectedIds,touyeBet:{target:choice.target,snapshotToken:copy.snapshotToken}});}
 const checkpoint=makeCheckpoint(state,[]);assert.ok(readCheckpoint(checkpoint).ok);return checkpoint;
}
const locks=baseline?[]:[{name:'pending-refill',checkpoint:lockedCheckpoint('laohuan')},{name:'pending-touye',checkpoint:lockedCheckpoint('touye')}];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const gitRead=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const report={head:process.env.TABLE_DRAG_SOURCE_SHA??gitRead(['rev-parse','HEAD']),sourceTree:gitRead(['rev-parse',(process.env.TABLE_DRAG_SOURCE_SHA??'HEAD')+':src']),modified:gitRead(['status','--short','--','src','tests','harness']),baseline,scope:'Controlled current-identity five-owned checkpoint; real mouse/CDP touch/DOM inputs. Full state/journal/local storage vs actual applyCommand; no natural acquisition, 18-combination, physical device or human acceptance.',cases:[]};
const snapshot=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,slots:await s.storage.read(),storage:Object.fromEntries(Object.keys(localStorage).filter(k=>!k.includes('lease')).map(k=>[k,localStorage.getItem(k)]))};});
const frame=async p=>{await p.evaluate(()=>new Promise(resolve=>window.__harness.game.events.once('poststep',resolve)));await p.waitForTimeout(70);};
const idle=p=>p.waitForFunction(()=>window.__harness.game.scene.getScene('game')?.ready);
const slot=(p,i)=>p.evaluate(i=>{const s=window.__harness.game.scene.getScene('game'),b=s.view.layout.slots[i],r=s.game.canvas.getBoundingClientRect(),q=s.cameras.main.matrix.transformPoint(b.x+b.width/2,b.y+b.height/2);return{x:r.left+q.x*r.width/s.scale.width,y:r.top+q.y*r.height/s.scale.height};},i);
const load=async (p,checkpoint=cp)=>{await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'controlled-owned.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'game');await idle(p);await frame(p);await p.waitForTimeout(350);await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.run.jokers.every(j=>s.textures.exists('p08-joker-'+j.definitionId));});};
const visual=p=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),d=s.ownedDrag;return {drag:!!d,saving:d?.saving??false,inputEnabled:s.input.enabled,hint:s.statusText?.text,slots:s.view.layout.slots,arts:[...s.jokerViews].map(([id,a])=>({id,x:a.x,y:a.y,scale:a.scaleX,active:a.active,bounds:{x:a.getBounds().x,y:a.getBounds().y,width:a.getBounds().width,height:a.getBounds().height}})),surfaceTouchAction:s.ownedInput?.surface.style.touchAction,dispatch:window.__feedbackDispatch??[]};});
try{
 for(const spec of [{width:390,height:844,touch:true},{width:1366,height:900,touch:false},...(!baseline?[{width:390,height:844,touch:true,reduced:true,dpr:2}]:[])].filter(s=>!smoke||!s.reduced)){
  const {width,height,touch}=spec,name=width+'x'+height+(spec.reduced?'-reduce-dpr2':''),context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,deviceScaleFactor:spec.dpr??1,reducedMotion:spec.reduced?'reduce':'no-preference'}),p=await context.newPage(),row={...spec,name,checks:[],errors:[],moves:[],cancellations:[]};report.cases.push(row);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e)));await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');await load(p);
  await p.evaluate(()=>{const c=window.__harness.game.registry.get('runController'),dispatch=c.dispatch;window.__feedbackDispatch=[];c.dispatch=function(...args){window.__feedbackDispatch.push(structuredClone(args));return dispatch.apply(this,args);};});
  const cdp=touch?await context.newCDPSession(p):undefined;
  let touchAt;
  const raw=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const start=async at=>{touchAt={...at,id:1,radiusX:8,radiusY:8,force:1};if(touch)await raw('touchStart',[touchAt]);else{await p.mouse.move(at.x,at.y);await p.mouse.down();}};
  const move=async at=>{if(touch){touchAt={...touchAt,...at};await raw('touchMove',[touchAt]);}else await p.mouse.move(at.x,at.y);await frame(p);};
  const up=async()=>{if(touch)await raw('touchEnd',[]);else await p.mouse.up();};
  const shot=async suffix=>{const file=name+'-'+suffix+'.png';await p.screenshot({path:dir+'/'+file,scale:'css'});return file;};
  if(touch&&!baseline){
   const stable=await snapshot(p);await p.locator('.run-menu-toggle').click();await p.locator('.run-menu-panel').evaluate(e=>{for(const d of e.querySelectorAll('details'))d.open=true;e.scrollTop=0;});const b=await p.locator('.run-menu-panel').boundingBox(),at={x:b.x+b.width-6,y:b.y+Math.min(300,b.height-30)};
   const before=await p.locator('.run-menu-panel').evaluate(e=>({top:e.scrollTop,height:e.scrollHeight,client:e.clientHeight,touchAction:getComputedStyle(e).touchAction}));await start(at);for(let i=1;i<=4;i++)await move({x:at.x,y:at.y-40*i});await up();await p.waitForTimeout(100);const after=await p.locator('.run-menu-panel').evaluate(e=>({top:e.scrollTop,touchAction:getComputedStyle(e).touchAction}));assert.ok(after.top>before.top,'native outside-rail DOM scroll remains available');assert.deepEqual(await snapshot(p),stable);
   const scaleBefore=await p.evaluate(()=>visualViewport.scale);await cdp.send('Input.synthesizePinchGesture',{x:b.x+b.width/2,y:b.y+8,scaleFactor:1.15,relativeSpeed:400,gestureSourceType:'touch'});await p.waitForTimeout(100);const scaleAfter=await p.evaluate(()=>visualViewport.scale);row.outsideRail={scrollBefore:before,scrollAfter:after,scaleBefore,scaleAfter,nativePinchChanged:scaleAfter>scaleBefore+.02,meta:await p.locator('meta[name=viewport]').getAttribute('content'),body:await p.evaluate(()=>({overflow:getComputedStyle(document.body).overflow,touchAction:getComputedStyle(document.body).touchAction,canvasTouchAction:getComputedStyle(document.querySelector('canvas')).touchAction}))};assert.deepEqual(await snapshot(p),stable);await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await p.locator('.run-menu-toggle').click();await frame(p);
  }
  if(process.env.TABLE_DRAG_BOUNDARY_ONLY==='1'){row.initial=await snapshot(p);row.status=touch?'OBSERVED':'NOT_APPLICABLE';await context.close();continue;}
  row.initial=await snapshot(p);row.initialVisual=await visual(p);row.idleShot=await shot('idle');
  for(const [from,to,style] of [[0,4,'slow'],[4,0,'fast'],[1,3,'middle']].slice(0,smoke?1:3)){
   const before=await snapshot(p),at=await slot(p,from),target=await slot(p,to),id=before.state.jokers[from].instanceId,v0=await visual(p),calls=v0.dispatch.length,m={from,to,style,before};row.moves.push(m);
   await start(at);await p.waitForTimeout(touch?420:30);
   if(!touch)await move({x:at.x+12,y:at.y});
   m.held=await visual(p);m.heldShot=await shot(style+'-held');assert.deepEqual(await snapshot(p),before);
   if(!baseline){const a=m.held.arts.find(a=>a.id===id),original=v0.arts.find(a=>a.id===id);assert.ok(m.held.drag);assert.ok(Math.abs(a.y-(original.y-16))<1);assert.ok(Math.abs(a.scale-1.06)<.001);}
   if(style==='slow')for(let t=1;t<=6;t++)await move({x:at.x+(target.x-at.x)*t/6,y:at.y+8});
   else await move(target);
   m.mid=await visual(p);m.midShot=await shot(style+'-mid');assert.deepEqual(await snapshot(p),before,'preview preserves full published state/journal/IDB/local storage');
   if(!baseline){const original=v0.arts.find(a=>a.id===id),a=m.mid.arts.find(a=>a.id===id);assert.ok(Math.abs(a.x-(original.x+target.x-at.x))<1,'card follows horizontal native contact');assert.ok(Math.abs(a.y-(original.y+(style==='slow'?8:0)-16))<1,'card follows vertical native contact with lift');assert.match(m.mid.hint,new RegExp('第 '+(to+1)+' 位'));}
   // Persist delay is controlled at the real store; no state is rewritten.
   if(!baseline&&style==='slow')await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession(),commit=s.storage.commit;window.__feedbackCommitCalls=0;window.__feedbackRestoreCommit=()=>s.storage.commit=commit;s.storage.commit=async(...args)=>{window.__feedbackCommitCalls++;await new Promise(resolve=>window.__feedbackReleaseSave=resolve);return commit.apply(s.storage,args);};});
   await up();
   if(!baseline&&style==='slow'){
    await p.waitForFunction(()=>window.__feedbackCommitCalls===1);await frame(p);m.pending=await visual(p);m.pendingShot=await shot('saving-delay');assert.ok(m.pending.saving);assert.match(m.pending.hint,/保存/);assert.deepEqual(await snapshot(p),before,'pending save remains unpublished and IDB unchanged');
    const a=m.pending.arts.find(a=>a.id===id),b=m.pending.slots[to];assert.ok(Math.abs(a.x-(b.x+b.width/2))<1);assert.ok(Math.abs(a.y-(b.y+b.height/2-16))<1);assert.equal(m.pending.inputEnabled,false);
    // New touch on merchandise cannot buy while the reorder is pending.
    const offer=await point(p,'game','action/tool-inventory');if(touch)await p.touchscreen.tap(offer.x,offer.y);else await p.mouse.click(offer.x,offer.y);assert.equal((await visual(p)).dispatch.length,calls+1);
    await p.setViewportSize({width:width-1,height});await frame(p);m.resizedPending=await visual(p);assert.ok(m.resizedPending.saving);assert.deepEqual(await snapshot(p),before);assert.equal(m.resizedPending.dispatch.length,calls+1);await p.setViewportSize({width,height});await frame(p);await p.evaluate(seq=>{const g=window.__harness.game;window.__feedbackLandingFrames=[];const record=()=>{const s=g.scene.getScene('game');if(s.run.commandSeq===seq&&!s.busy)window.__feedbackLandingFrames.push({arts:[...s.jokerViews].map(([id,a])=>({id,x:a.x,y:a.y,scale:a.scaleX})),slots:s.view.layout.slots});};g.events.on('poststep',record);setTimeout(()=>g.events.off('poststep',record),300);window.__feedbackReleaseSave();window.__feedbackRestoreCommit();},before.state.commandSeq+1);
   }
   await idle(p);await p.waitForTimeout(210);m.after=await snapshot(p);m.dropped=await visual(p);m.dropShot=await shot(style+'-dropped');if(!baseline&&style==='slow'){m.firstSavedFrames=await p.evaluate(()=>window.__feedbackLandingFrames);assert.ok(m.firstSavedFrames.length);for(const f of m.firstSavedFrames)for(const [i,j] of m.after.state.jokers.entries())if(j.instanceId!==id){const a=f.arts.find(a=>a.id===j.instanceId),b=f.slots[i];assert.ok(Math.abs(a.x-(b.x+b.width/2))<1,'other cards never jump back after a delayed save');assert.ok(Math.abs(a.y-(b.y+b.height/2))<1);}}
   const ids=before.state.jokers.map(j=>j.instanceId);ids.splice(to,0,ids.splice(from,1)[0]);const action={type:'ReorderJokers',ids},command={runId:before.state.runId,commandId:before.state.runId+'/command/'+(before.state.commandSeq+1),expectedSeq:before.state.commandSeq,action},expected=applyCommand(before.state,command);assert.ok(expected.ok,expected.code);assert.deepEqual(m.after.state,expected.state);assert.deepEqual(m.after.journal,[...before.journal,command]);assert.deepEqual(m.after.slots.current,makeCheckpoint(m.after.state,m.after.journal));assert.equal(m.after.slots.revision,before.slots.revision+1);assert.equal(m.dropped.dispatch.length,calls+1);assert.deepEqual(m.after.storage,before.storage);assert.equal(await p.locator('.detail-dialog[open]').count(),0);if(!baseline)assert.match(m.dropped.hint,/顺序已保存/);
   for(const [i,j] of m.after.state.jokers.entries()){const a=m.dropped.arts.find(a=>a.id===j.instanceId),b=m.dropped.slots[i];assert.ok(Math.abs(a.x-(b.x+b.width/2))<1);assert.ok(Math.abs(a.y-(b.y+b.height/2))<1);assert.equal(a.scale,1);}
   m.status='PASS';
  }
  if(!baseline&&!smoke){
   const before=await snapshot(p),id=before.state.jokers[0].instanceId,calls=(await visual(p)).dispatch.length,delayed={before};row.fastDelayed=delayed;
   await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession(),commit=s.storage.commit;window.__feedbackRestoreCommit=()=>s.storage.commit=commit;s.storage.commit=async(...args)=>{await new Promise(resolve=>window.__feedbackReleaseSave=resolve);return commit.apply(s.storage,args);};});
   await start(await slot(p,0));await p.waitForTimeout(420);const dest=await slot(p,4);
   if(touch){touchAt={...touchAt,...dest};await raw('touchMove',[touchAt]);}else await p.mouse.move(dest.x,dest.y);
   await up();await p.waitForTimeout(250);delayed.pending=await visual(p);delayed.pendingShot=await shot('fast-delay-saving');assert.deepEqual(await snapshot(p),before);assert.ok(delayed.pending.saving);
   await p.evaluate(seq=>{const g=window.__harness.game;window.__feedbackLandingFrames=[];const record=()=>{const s=g.scene.getScene('game');if(s.run.commandSeq===seq&&!s.busy)window.__feedbackLandingFrames.push({arts:[...s.jokerViews].map(([id,a])=>({id,x:a.x,y:a.y})),slots:s.view.layout.slots});};g.events.on('poststep',record);setTimeout(()=>g.events.off('poststep',record),300);window.__feedbackReleaseSave();window.__feedbackRestoreCommit();},before.state.commandSeq+1);
   await idle(p);await p.waitForTimeout(210);delayed.after=await snapshot(p);delayed.firstSavedFrames=await p.evaluate(()=>window.__feedbackLandingFrames);assert.ok(delayed.firstSavedFrames.length);
   for(const f of delayed.firstSavedFrames)for(const [i,j] of delayed.after.state.jokers.entries())if(j.instanceId!==id){const a=f.arts.find(a=>a.id===j.instanceId),b=f.slots[i];assert.ok(Math.abs(a.x-(b.x+b.width/2))<1,'fast release plus delayed save cannot jump other cards back');assert.ok(Math.abs(a.y-(b.y+b.height/2))<1);}
   const ids=before.state.jokers.map(j=>j.instanceId);ids.push(ids.shift());const command={runId:before.state.runId,commandId:before.state.runId+'/command/'+(before.state.commandSeq+1),expectedSeq:before.state.commandSeq,action:{type:'ReorderJokers',ids}},expected=applyCommand(before.state,command);assert.ok(expected.ok);assert.deepEqual(delayed.after.state,expected.state);assert.deepEqual(delayed.after.journal,[...before.journal,command]);assert.deepEqual(delayed.after.slots.current,makeCheckpoint(delayed.after.state,delayed.after.journal));assert.equal((await visual(p)).dispatch.length,calls+1);delayed.status='PASS';
  }
  // Long-held vertical follow reproduces Chromium's pan-y cancellation, independent of pixels.
  let before=await snapshot(p),at=await slot(p,0);await start(at);await p.waitForTimeout(420);await move({x:at.x+5,y:at.y+20});row.vertical=await visual(p);row.verticalShot=await shot('vertical');await up();await frame(p);assert.deepEqual(await snapshot(p),before);
  if(!baseline){assert.ok(row.vertical.drag,'held vertical native move still follows');const a=row.vertical.arts.find(a=>a.id===before.state.jokers[0].instanceId),b=row.vertical.slots[0];assert.ok(Math.abs(a.y-(b.y+b.height/2+20-16))<1);}
  if(!baseline&&!smoke){
   for(const mode of ['stationary','same-slot','outside','pointercancel',...(touch?['prehold','multitouch']:[]),'hidden-signal','resize','escape','blur','lock-mid-drag']){
    before=await snapshot(p);const calls=(await visual(p)).dispatch.length;at=await slot(p,0);await start(at);
    if(mode!=='prehold')await p.waitForTimeout(420);
    if(mode==='same-slot')await move({x:at.x+12,y:at.y});
    else if(mode==='outside')await move({x:at.x,y:at.y+170});
    else if(mode==='prehold')await move({x:at.x,y:at.y+50});
    else if(mode!=='stationary')await move(await slot(p,3));
    if(mode==='pointercancel'){if(touch)await raw('touchCancel',[]);else await p.evaluate(()=>{const o=window.__harness.game.scene.getScene('game').ownedInput.owner;window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:o.pointerId,pointerType:'mouse'}));});}
    if(mode==='multitouch'){const second={...touchAt,x:touchAt.x+24,id:2};await raw('touchStart',[touchAt,second]);await raw('touchEnd',[second]);await raw('touchEnd',[]);}
    if(mode==='hidden-signal')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});});
    if(mode==='resize')await p.setViewportSize({width:width-1,height});
    if(mode==='escape')await p.keyboard.press('Escape');
    if(mode==='blur')await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
    if(mode==='lock-mid-drag')await p.evaluate(()=>window.__harness.game.registry.get('runController').setReadOnly());
    if(mode!=='pointercancel'&&mode!=='multitouch')await up();await frame(p);assert.deepEqual(await snapshot(p),before,mode+' must preserve complete save');assert.equal((await visual(p)).dispatch.length,calls,mode+' never submits');assert.equal(await p.locator('.detail-dialog[open]').count(),0);
    row.cancellations.push({mode,status:'PASS',before,after:await snapshot(p)});
    if(mode==='resize'){await p.setViewportSize({width,height});await frame(p);}
   }
   // Read-only fresh hold cannot lift or submit; ordinary tap keeps the detail fallback.
   if(await p.locator('.run-menu-modal').evaluate(d=>d.open))await p.locator('.run-menu-toggle').click();before=await snapshot(p);at=await slot(p,0);await start(at);await p.waitForTimeout(420);assert.equal((await visual(p)).drag,false);await move(await slot(p,4));await up();await frame(p);assert.deepEqual(await snapshot(p),before);
   await tapUI(p,'game','joker/'+before.state.jokers[0].instanceId,touch);await p.locator('.detail-dialog[open]').waitFor();for(const label of ['左移','右移'])assert.ok(await p.getByRole('button',{name:label,exact:true}).isDisabled());assert.deepEqual(await snapshot(p),before);await p.getByRole('button',{name:'关闭',exact:true}).click();
   // Use real lease takeover to restore, then test failed atomic commit and menu retry.
   if(!await p.locator('.run-menu-modal').evaluate(d=>d.open))await p.locator('.run-menu-toggle').click();await p.getByRole('button',{name:'接管写入',exact:true}).click();await waitScene(p,'game');await idle(p);await p.waitForTimeout(350);await p.evaluate(()=>{const c=window.__harness.game.registry.get('runController'),dispatch=c.dispatch;c.dispatch=function(...args){window.__feedbackDispatch.push(structuredClone(args));return dispatch.apply(this,args);};});
   before=await snapshot(p);const calls=(await visual(p)).dispatch.length;at=await slot(p,0);await start(at);await p.waitForTimeout(420);if(!touch)await move({x:at.x+12,y:at.y});await move(await slot(p,4));
   await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession(),commit=s.storage.commit;window.__feedbackFailCalls=0;window.__feedbackRestoreCommit=()=>s.storage.commit=commit;s.storage.commit=async()=>{window.__feedbackFailCalls++;throw new DOMException('controlled drag quota','QuotaExceededError');};});
   await up();await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused');await frame(p);row.failure={before,after:await snapshot(p),visual:await visual(p),shot:await shot('save-failure')};assert.deepEqual(row.failure.after,before);for(const [i,j] of before.state.jokers.entries()){const a=row.failure.visual.arts.find(a=>a.id===j.instanceId),b=row.failure.visual.slots[i];assert.ok(Math.abs(a.x-(b.x+b.width/2))<1);assert.ok(Math.abs(a.y-(b.y+b.height/2))<1);assert.equal(a.scale,1);}assert.equal(await p.evaluate(()=>window.__feedbackFailCalls),1);assert.equal(row.failure.visual.dispatch.length,calls+1);
   assert.ok(await p.getByRole('button',{name:'重试保存',exact:true}).isVisible());assert.match(await p.locator('.run-menu-modal').innerText(),/未保存|存储空间不足/);
   await p.evaluate(()=>window.__feedbackRestoreCommit());await p.getByRole('button',{name:'重试保存',exact:true}).click();await waitScene(p,'game');await idle(p);await p.waitForTimeout(220);row.retry=await snapshot(p);assert.equal(row.retry.state.commandSeq,before.state.commandSeq+1);assert.equal(row.retry.journal.length,before.journal.length+1);const ids=before.state.jokers.map(j=>j.instanceId);ids.push(ids.shift());assert.deepEqual(row.retry.state.jokers.map(j=>j.instanceId),ids);assert.deepEqual(row.retry.slots.current,makeCheckpoint(row.retry.state,row.retry.journal));row.retryShot=await shot('save-retry');
  }
  const saved=await snapshot(p);await p.reload();await waitScene(p,'title');row.restored=await snapshot(p);assert.deepEqual(row.restored,saved);
  if(!baseline&&!smoke){
   row.sceneLocks=[];
   for(const lock of locks){
    await load(p,lock.checkpoint);await p.evaluate(()=>{const c=window.__harness.game.registry.get('runController'),dispatch=c.dispatch;window.__feedbackDispatch=[];c.dispatch=function(...args){window.__feedbackDispatch.push(structuredClone(args));return dispatch.apply(this,args);};});
    const before=await snapshot(p);await start(await slot(p,0));await p.waitForTimeout(420);await move(await slot(p,4));await up();await frame(p);
    assert.deepEqual(await snapshot(p),before);assert.equal((await visual(p)).drag,false);assert.equal((await visual(p)).dispatch.length,0);row.sceneLocks.push({name:lock.name,before,after:await snapshot(p),visual:await visual(p),status:'PASS'});
    if(await p.locator('.detail-dialog[open]').count())await p.locator('.detail-dialog[open]').getByRole('button',{name:'关闭',exact:true}).click();
   }
   await load(p);await tapUI(p,'game','card/'+run.handOrder[0],touch);await tapUI(p,'game','action/play',touch);
   await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').isPresenting);const before=await snapshot(p),seq=before.state.commandSeq;
   await start(await slot(p,0));await p.waitForTimeout(420);await move(await slot(p,4));await up();assert.equal((await visual(p)).drag,false);assert.equal((await snapshot(p)).state.commandSeq,seq);row.sceneLocks.push({name:'real-score-presentation',before,after:await snapshot(p),status:'PASS'});
  }
  row.status='PASS';assert.deepEqual(row.errors,[]);await context.close();
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;console.error(e);}
finally{await browser.close();await server.close();await writeFile(dir+'/full-state-journal-storage.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report);for(const row of brief.cases){for(const key of ['initial','restored','retry'])if(row[key])row[key]={seq:row[key].state.commandSeq,ids:row[key].state.jokers.map(j=>j.instanceId),revision:row[key].slots.revision};for(const move of row.moves??[])for(const key of ['before','after'])if(move[key])move[key]={seq:move[key].state.commandSeq,ids:move[key].state.jokers.map(j=>j.instanceId),revision:move[key].slots.revision};for(const c of row.cancellations??[]){c.before='Full saved snapshot in gzip';c.after='Equal full saved snapshot in gzip';}if(row.tableIdle){row.tableIdle.before='Full saved snapshot in gzip';row.tableIdle.after='Equal full saved snapshot in gzip';row.tableIdle.sampleCount=row.tableIdle.samples.length;row.tableIdle.yRanges=row.tableIdle.samples[0].map(a=>({id:a.id,min:Math.min(...row.tableIdle.samples.map(f=>f.find(b=>b.id===a.id).y)),max:Math.max(...row.tableIdle.samples.map(f=>f.find(b=>b.id===a.id).y))}));delete row.tableIdle.samples;}if(row.tableReorder){row.tableReorder.before='Full saved snapshot in gzip';row.tableReorder.after='Full saved snapshot in gzip';}if(row.fastDelayed){row.fastDelayed.before='Full saved snapshot in gzip';if(row.fastDelayed.after)row.fastDelayed.after='Full saved snapshot in gzip';}if(row.failure){row.failure.before='Full saved snapshot in gzip';row.failure.after='Equal full saved snapshot in gzip';}}await writeFile(dir+'/report.json',JSON.stringify(brief,null,2)+'\n');console.log(report.status,dir);}
