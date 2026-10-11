import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {point,waitScene,tapUI} from './ui.mjs';
const port=Number(process.env.DRAG_PORT??5462),baseline=process.env.DRAG_BASELINE==='1',dir=process.env.DRAG_OUTPUT??(baseline?'/tmp/shop-owned-drag-before':'/tmp/shop-owned-drag-after');await mkdir(dir,{recursive:true});
const server=await createServer({root:process.env.DRAG_ROOT,mode:'e2e',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand,assertRunInvariants}=await server.ssrLoadModule('/src/domain/run.ts'),{newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts'),{r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
let run=createRun({seed:'owned-drag-fixed',runId:'owned-drag-fixed',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group'});
for(const action of [{type:'LeaveShop'},{type:'SkipStage'},{type:'OpenShop'}]){const result=applyCommand(run,{runId:run.runId,commandId:run.runId+'/command/'+(run.commandSeq+1),expectedSeq:run.commandSeq,action});assert.ok(result.ok,result.code);run=result.state;}
run.jokers=['b03','b10','e01','e04','f12'].map((id,i)=>r2CreateJoker(id,'owned-drag/'+i,4));assertRunInvariants(run);const cp=makeCheckpoint(run,[]);assert.ok(readCheckpoint(cp).ok);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const gitRoot=process.env.DRAG_ROOT??process.cwd(),gitRead=args=>execFileSync('git',args,{encoding:'utf8',cwd:gitRoot}).trim();
const report={head:gitRead(['rev-parse','HEAD']),sourceTree:gitRead(['rev-parse','HEAD:src']),modified:gitRead(['status','--short','--','src','tests','harness']),baseline,scope:'Controlled current-identity five-owned checkpoint; real mouse/CDP touch/DOM inputs. Full state/journal/local storage vs actual applyCommand; no natural acquisition, 18-combination, physical device or human acceptance.',cases:[]};
const snapshot=p=>p.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:Object.fromEntries(Object.keys(localStorage).filter(k=>!k.includes('lease')).map(k=>[k,localStorage.getItem(k)]))};});
const frame=async p=>{await p.evaluate(()=>new Promise(resolve=>window.__harness.game.events.once('poststep',resolve)));await p.waitForTimeout(70);};
const idle=p=>p.waitForFunction(()=>window.__harness.game.scene.getScene('shop')?.ready);
const slot=(p,i)=>p.evaluate(i=>{const s=window.__harness.game.scene.getScene('shop'),b=s.geometry().slots[i],r=s.game.canvas.getBoundingClientRect(),q=s.cameras.main.matrix.transformPoint(b.x+b.width/2,b.y+b.height/2);return{x:r.left+q.x*r.width/s.scale.width,y:r.top+q.y*r.height/s.scale.height};},i);
const load=async p=>{await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'controlled-owned.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(p,'shop');await idle(p);await frame(p);await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.run.jokers.every(j=>s.textures.exists('p08-joker-'+j.definitionId))&&s.run.shop.offers.every(j=>s.textures.exists('p08-joker-'+j.definitionId));});};
try{
for(const {touch,width,height} of [{touch:false,width:1366,height:768},{touch:true,width:390,height:740},{touch:true,width:390,height:844},{touch:true,width:320,height:568}]){
 const name=width+'x'+height,p=await browser.newPage({viewport:{width,height},hasTouch:touch,reducedMotion:'no-preference'}),row={width,height,touch,checks:[],errors:[]};report.cases.push(row);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e)));await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');await load(p);const cdp=touch?await p.context().newCDPSession(p):undefined;
 const start=async at=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[at]});else{await p.mouse.move(at.x,at.y);await p.mouse.down();}await frame(p);};
 const move=async at=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[at]});else await p.mouse.move(at.x,at.y,{steps:3});await frame(p);};
 const end=async()=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await p.mouse.up();await idle(p);await frame(p);await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.run.jokers.every(j=>s.textures.exists('p08-joker-'+j.definitionId))&&s.run.shop.offers.every(j=>s.textures.exists('p08-joker-'+j.definitionId));});};
 const shot=async label=>{await p.screenshot({path:dir+'/'+name+'-'+label+'.png',scale:'css'});row.checks.push({screenshot:name+'-'+label+'.png'});};
 let before=await snapshot(p);row.initial=before;await shot('idle');await start(await slot(p,0));if(touch){await p.waitForTimeout(400);await shot('lifted');}await move(await slot(p,3));await shot('dragging');row.during=await snapshot(p);if(!baseline){row.preview=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');return {touchAction:getComputedStyle(s.ownedInput.surface).touchAction,sourceId:s.ownedDrag?.id,hint:s.ownedHint?.text,arts:[...s.ownedArts].map(([id,a])=>({id,x:a.x,y:a.y,scale:a.scaleX})),insertion:s.children.getByName('view').list.some(o=>o.name==='shop/owned-insertion')};});assert.equal(row.preview.touchAction,'pan-y');assert.ok(row.preview.insertion);assert.equal(row.preview.sourceId,before.state.jokers[0].instanceId);}assert.deepEqual(row.during,before,'drag preview has no saved side effects');await end();row.moved=await snapshot(p);await shot('dropped');assert.equal(await p.locator('.detail-dialog[open]').count(),0,'drag never opens details');
 const ids=before.state.jokers.map(j=>j.instanceId);ids.push(...ids.splice(0,1));const wanted=[...before.state.jokers.map(j=>j.instanceId)];wanted.splice(3,0,wanted.splice(0,1)[0]);const action={type:'ReorderJokers',ids:wanted},command={runId:before.state.runId,commandId:before.state.runId+'/command/'+(before.state.commandSeq+1),expectedSeq:before.state.commandSeq,action},expected=applyCommand(before.state,command);assert.ok(expected.ok);assert.deepEqual(row.moved.state,expected.state);assert.deepEqual(row.moved.journal,[...before.journal,command]);assert.equal(row.moved.state.commandSeq,before.state.commandSeq+1);row.checks.push({label:'single committed real reorder; exact full state/journal matches domain command',status:'PASS'});
 before=await snapshot(p);await start(await slot(p,0));if(touch)await p.waitForTimeout(400);const out=await slot(p,2);out.y+=190;await move(out);await end();row.outOfRow=await snapshot(p);if(!baseline)assert.deepEqual(row.outOfRow,before,'off-row release cancels');row.checks.push({label:'off-row release',status:JSON.stringify(row.outOfRow)===JSON.stringify(before)?'PASS':'BASELINE_FAIL'});
 if(!baseline){
  for(const cancel of ['same-slot','gap','prehold-vertical','long-hold-release','pointercancel','escape','blur','hidden','capture','multitouch','resize','modal']){
   before=await snapshot(p);const from=await slot(p,0);await start(from);if((touch&&cancel!=='prehold-vertical')||cancel==='long-hold-release')await p.waitForTimeout(400);
   if(cancel==='same-slot')await move({x:from.x+12,y:from.y});
   else if(cancel==='gap'){const b=await slot(p,1);await move({x:(from.x+b.x)/2,y:from.y});}
   else if(cancel==='prehold-vertical')await move({x:from.x,y:from.y+65});
   else if(cancel!=='long-hold-release')await move(await slot(p,2));
   if(cancel==='pointercancel'&&touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
   else if(cancel==='pointercancel')await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1})));
   else if(cancel==='escape')await p.keyboard.press('Escape');
   else if(cancel==='blur')await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
   else if(cancel==='hidden')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});});
   else if(cancel==='capture'){await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop').ownedInput;const id=s.owner?.pointerId;if(!s.surface.hasPointerCapture(id))throw Error('no actual capture');s.surface.releasePointerCapture(id);});await move(await slot(p,2));}
   else if(cancel==='multitouch')await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerdown',{pointerId:909,isPrimary:false,pointerType:'touch'})));
   else if(cancel==='resize')await p.setViewportSize({width:width-1,height});
   else if(cancel==='modal')await p.locator('.run-menu-toggle').click();
   if(cancel==='pointercancel'&&touch){await idle(p);await frame(p);}else await end();
   if(cancel==='modal')await p.locator('.run-menu-toggle').click();
   if(cancel==='multitouch')await p.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:909,pointerType:'touch'})));
   if(cancel==='resize')await p.setViewportSize({width,height});
   const after=await snapshot(p);
   if(cancel==='gap'){const ids=before.state.jokers.map(j=>j.instanceId);[ids[0],ids[1]]=[ids[1],ids[0]];const exp=applyCommand(before.state,{runId:before.state.runId,commandId:before.state.runId+'/command/'+(before.state.commandSeq+1),expectedSeq:before.state.commandSeq,action:{type:'ReorderJokers',ids}});assert.ok(exp.ok);assert.deepEqual(after.state,exp.state);}
   else assert.deepEqual(after,before,cancel+' preserves full saved state');
   assert.equal(await p.locator('.detail-dialog[open]').count(),0,cancel+' no accidental detail');row.checks.push({label:cancel,status:'PASS'});
  }
  before=await snapshot(p);await tapUI(p,'shop','joker/'+before.state.jokers[0].instanceId,touch);await p.locator('.detail-dialog[open]').waitFor();assert.deepEqual(await snapshot(p),before);assert.ok(await p.getByRole('button',{name:'左移',exact:true}).isDisabled());await p.getByRole('button',{name:'右移',exact:true}).click();await idle(p);await p.getByRole('button',{name:'关闭',exact:true}).click();row.checks.push({label:'ordinary tap inspects; left/right accessible fallback still saves',status:'PASS'});
  before=await snapshot(p);const offer=before.state.shop.offers[0];await start(await point(p,'shop','offer/'+offer.offerId));await move(await slot(p,2));await end();assert.deepEqual(await snapshot(p),before);assert.equal(await p.locator('.detail-dialog[open]').count(),0);row.checks.push({label:'unbought merchandise cannot reorder or buy on drag',status:'PASS'});
 }
 const saved=await snapshot(p);await p.reload();await waitScene(p,'title');const restored=await snapshot(p);assert.deepEqual(restored.state,saved.state);assert.deepEqual(restored.journal,saved.journal);row.checks.push({label:'reload restores full state and journal',status:'PASS'});assert.deepEqual(row.errors,[]);await p.close();row.status='PASS';
}
report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;console.error(e);}finally{await browser.close();await server.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report.status,dir);}
