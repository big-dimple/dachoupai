import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,point,waitScene} from './ui.mjs';
const dpr=Number(process.env.VIEWPORT_TOUCH_DPR??1);assert.ok([1,2,3].includes(dpr),'supported test DPR');
const out=process.env.VIEWPORT_TOUCH_OUTPUT??'shots/viewport-touch-resize';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5582,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const cards=['spades-8','hearts-8','clubs-7','diamonds-7','spades-13','hearts-13','clubs-2','diamonds-4'];
function fixture(){
 let s=createRun({rulesVersion:'r2',characterId:'touye',runId:'viewport-touch/controlled',seed:'group-natural-17',r2Identity:newRunIdentity('touye','group'),openingRoute:'group'});
 s.jokers=['b03','b10'].map((id,i)=>r2CreateJoker(id,'viewport-owned/'+i,4,'none',s));
 for(const action of [{type:'LeaveShop'},{type:'EnterStage'}]){const r=applyCommand(s,{runId:s.runId,commandId:'setup/'+s.commandSeq,expectedSeq:s.commandSeq,action});assert.ok(r.ok,r.code);s=r.state;}
 s.handOrder=[...cards];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!cards.includes(id));assert.ok(readCheckpoint(makeCheckpoint(s,[])).ok);return s;
}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD:src'),modified:git('status','--short','--','src','tests','harness'),deviceScaleFactor:dpr,browser:browser.version(),scope:'Controlled current-identity public hand/jokers; real native touch/mouse/DOM operations across live viewport changes, without page reload. Full state/journal/storage command oracle. Software Chromium with recorded page DPR and framebuffer; no natural play, physical orientation sensor, hardware/performance or whole-game acceptance.',cases:[],errors:[]};
const snap=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
const selected=p=>p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]);
const idle=p=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&s.ready&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
const frame=p=>p.evaluate(()=>new Promise(resolve=>window.__harness.game.events.once('poststep',()=>requestAnimationFrame(resolve))));
async function load(p){const s=fixture();await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'controlled-resize.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});await waitScene(p,'game');await p.waitForFunction(id=>window.__harness.game.scene.getScene('game').run.runId===id,s.runId);await idle(p);}
const metrics=p=>p.evaluate(()=>{
 const g=window.__harness.game,s=g.scene.getScene('game'),r=g.canvas.getBoundingClientRect(),scale=g.scale,rect=e=>e?.getBoundingClientRect().toJSON();
 const seats=s.view.layout.cards.filter(c=>c.visible),left=Math.min(...seats.map(c=>c.hit.x)),right=Math.max(...seats.map(c=>c.hit.x+c.hit.width)),hand=s.view.layout.hand;
 // Compare DOM with the actual drawn camera projection, including fractional 9MP density rounding.
 const a=s.cameras.main.matrix.transformPoint(left,hand.y),b=s.cameras.main.matrix.transformPoint(right,hand.y+hand.height);
 const projectedHand={x:r.left+a.x*r.width/scale.width,y:r.top+a.y*r.height/scale.height,width:(b.x-a.x)*r.width/scale.width,height:(b.y-a.y)*r.height/scale.height};
 return {viewport:{width:innerWidth,height:innerHeight},devicePixelRatio,backing:{width:g.canvas.width,height:g.canvas.height},canvas:r.toJSON(),base:{width:scale.baseSize.width,height:scale.baseSize.height},displayScale:{x:scale.displayScale.x,y:scale.displayScale.y},pointer:{x:g.input.activePointer.x,y:g.input.activePointer.y},pointerCSS:{x:r.left+g.input.activePointer.x*r.width/scale.baseSize.width,y:r.top+g.input.activePointer.y*r.height/scale.baseSize.height},hand:rect(s.handInput.surface),projectedHand,owned:rect(s.ownedInput.surface),layout:s.view.layout,enabled:s.input.enabled};
});
async function resize(p,size){await p.setViewportSize(size);await p.waitForFunction(size=>{const r=window.__harness.game.canvas.getBoundingClientRect();return r.width===size.width&&r.height===size.height;},size);await frame(p);await idle(p);}
async function shot(p,name){const file=name+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});return file;}
function aligned(m){assert.ok(Math.abs(m.displayScale.x-m.base.width/m.canvas.width)<1e-8,'final x mapping');assert.ok(Math.abs(m.displayScale.y-m.base.height/m.canvas.height)<1e-8,'final y mapping');for(const key of ['x','y','width','height'])assert.ok(Math.abs(m.hand[key]-m.projectedHand[key])<.1,'hand projected '+key);}
async function clearSelection(p,touch){for(const id of await selected(p))await tapUI(p,'game','card/'+id,touch);assert.deepEqual(await selected(p),[]);}
async function savedCommand(p,before,type){await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.state.commandSeq);const after=await snap(p),command=after.journal.at(-1),expected=applyCommand(before.state,command);assert.equal(command.action.type,type);assert.ok(expected.ok,expected.code);assert.deepEqual(after.state,expected.state);assert.equal(after.journal.length,before.journal.length+1);assert.deepEqual(after.storage.current,makeCheckpoint(after.state,after.journal));assert.deepEqual(after.storage.previous,before.storage.current);assert.equal(after.storage.revision,before.storage.revision+1);return {before,after,command,canonicalEqual:true};}
try{
 for(const spec of [{touch:true,start:{width:390,height:740},sizes:[{width:320,height:568},{width:740,height:320},{width:390,height:740},{width:1366,height:768},{width:320,height:568}]},{touch:false,start:{width:1366,height:768},sizes:[{width:390,height:740},{width:740,height:390},{width:1366,height:768}]}]){
  const context=await browser.newContext({viewport:spec.start,hasTouch:spec.touch,deviceScaleFactor:dpr,reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(String(e)));p.on('dialog',d=>d.accept());let navigations=0;p.on('framenavigated',f=>{if(f===p.mainFrame())navigations++;});await p.goto('http://127.0.0.1:5582/?harness=1');await waitScene(p,'title');await load(p);
  const cdp=spec.touch?await context.newCDPSession(p):undefined;let contact;
  const down=async at=>{contact={...at,id:1,radiusX:8,radiusY:8,force:1};if(spec.touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contact]});else {await p.mouse.move(at.x,at.y);await p.mouse.down();}};
  const move=async at=>{if(spec.touch){contact={...contact,...at};await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[contact]});}else await p.mouse.move(at.x,at.y);await frame(p);};
  const up=async()=>{if(spec.touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.mouse.up();await frame(p);};
  for(let i=0;i<spec.sizes.length;i++){
   const size=spec.sizes[i],name=(spec.touch?'touch':'mouse')+'-'+i+'-'+size.width+'x'+size.height,row={name,touch:spec.touch,size};report.cases.push(row);const unchanged=await snap(p),selectionBefore=await selected(p);await resize(p,size);row.metrics=await metrics(p);aligned(row.metrics);assert.deepEqual(await snap(p),unchanged);assert.deepEqual(await selected(p),selectionBefore);
   await clearSelection(p,spec.touch);
   // Native hand sweep after the active scene has resized, without re-importing or reloading.
   const from=await point(p,'game','card/'+cards[0]),to=await point(p,'game','card/'+cards[1]);await down(from);await move(to);await up();assert.deepEqual(await selected(p),cards.slice(0,2));assert.deepEqual(await snap(p),unchanged);row.handSweep=true;
   await tapUI(p,'game','hero/touye-wager',spec.touch);await p.locator('dialog[open]').waitFor();assert.deepEqual(await snap(p),unchanged);assert.deepEqual(await selected(p),cards.slice(0,2));row.modalShot=await shot(p,name+'-modal');await p.locator('dialog[open] .dialog-close').click();
   // Opening and closing another real modal must not trap the subsequent canvas input.
   await tapUI(p,'game','action/tool-inventory',spec.touch);await p.locator('dialog[open]').waitFor();await p.locator('dialog[open] .dialog-close').click();assert.deepEqual(await snap(p),unchanged);row.modalRecovery=true;
   await clearSelection(p,spec.touch);
   // Native held owned-card reorder; saves exactly one original command.
   const slot=async n=>p.evaluate(n=>{const s=window.__harness.game.scene.getScene('game'),b=s.view.layout.slots[n],r=s.game.canvas.getBoundingClientRect(),v=s.cameras.main.matrix.transformPoint(b.x+b.width/2,b.y+b.height/2);return {x:r.left+v.x*r.width/s.scale.width,y:r.top+v.y*r.height/s.scale.height};},n);
   const initialOrder=unchanged.state.jokers.map(j=>j.instanceId),a=await slot(0),b=await slot(1);await down(a);if(spec.touch)await p.waitForTimeout(400);await move(b);await up();row.ownedReorder=await savedCommand(p,unchanged,'ReorderJokers');assert.deepEqual(row.ownedReorder.after.state.jokers.map(j=>j.instanceId),[initialOrder[1],initialOrder[0]]);await idle(p);row.afterShot=await shot(p,name+'-after');
   row.status='PASS';console.log(name,'PASS');
  }
  // In-flight hand sweep interrupted by orientation change: no submission, then fresh input works.
  const before=await snap(p);await clearSelection(p,spec.touch);await down(await point(p,'game','card/'+cards[0]));await move(await point(p,'game','card/'+cards[1]));await resize(p,{width:390,height:740});await up();assert.deepEqual(await snap(p),before);await clearSelection(p,spec.touch);await tapUI(p,'game','card/'+cards[0],spec.touch);assert.deepEqual(await selected(p),[cards[0]]);
  // A held owned-card drag is cancelled by live orientation change, then the native input recovers.
  const ownedBefore=await snap(p),ownedAt=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),b=s.view.layout.slots[0];return {x:b.x+b.width/2,y:b.y+b.height/2};});
  await down(ownedAt);if(spec.touch)await p.waitForTimeout(400);else await move({x:ownedAt.x+12,y:ownedAt.y});assert.equal(await p.evaluate(()=>!!window.__harness.game.scene.getScene('game').ownedDrag),true);
  await resize(p,{width:740,height:320});await up();assert.deepEqual(await snap(p),ownedBefore);assert.equal(await p.evaluate(()=>window.__harness.game.scene.getScene('game').input.enabled),true);
  const modalBefore=await snap(p),modalSelection=await selected(p);await tapUI(p,'game','hero/touye-wager',spec.touch);await p.locator('dialog[open]').waitFor();await resize(p,{width:390,height:740});assert.equal(await p.locator('dialog[open]').count(),1);await p.locator('dialog[open] .dialog-close').click();assert.deepEqual(await selected(p),modalSelection);assert.deepEqual(await snap(p),modalBefore);await tapUI(p,'game','action/tool-inventory',spec.touch);await p.locator('dialog[open]').waitFor();await p.locator('dialog[open] .dialog-close').click();assert.deepEqual(await snap(p),modalBefore);
  // The original play path submits once after a further live narrow resize, with exact pointer mapping.
  await resize(p,{width:320,height:568});await tapUI(p,'game','card/'+cards[1],spec.touch);assert.deepEqual(await selected(p),cards.slice(0,2));const playBefore=await snap(p),at=await point(p,'game','action/play');assert.deepEqual({x:at.x,y:at.y},{x:220,y:507});await tapUI(p,'game','action/play',spec.touch);const result=await savedCommand(p,playBefore,'PlayHand');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return !s.presentation&&!s.playing;});const m=await metrics(p);assert.ok(Math.abs(m.pointerCSS.x-at.x)<.1&&Math.abs(m.pointerCSS.y-at.y)<.1);report.cases.push({name:(spec.touch?'touch':'mouse')+'-original-play',navigations,interruptedSweepNoSubmission:true,interruptedOwnedDragNoSubmission:true,resizeWhileModalOpenRecovery:true,point:at,pointer:m.pointer,pointerCSS:m.pointerCSS,...result,status:'PASS'});assert.equal(navigations,1,'all resize paths remain the original page');await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack??String(e);for(const c of browser.contexts())for(const p of c.pages()){report.failureMetrics=await metrics(p);report.failureSelected=await selected(p);report.failureShot=await shot(p,'FAIL');}process.exitCode=1;}
finally{await browser.close();await server.close();const full=JSON.stringify(report,null,2);await writeFile(out+'/report.json.gz',gzipSync(full));await writeFile(out+'/summary.json',JSON.stringify({...report,cases:report.cases.map(({before,after,...c})=>({...c,...(c.ownedReorder?{ownedReorder:{command:c.ownedReorder.command,canonicalEqual:c.ownedReorder.canonicalEqual}}:{})}))},null,2));console.log(report.status,report.error??'');}
