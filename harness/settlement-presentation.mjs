/** Finite controlled scorer results and real UI actions. Never an 18-run or device claim. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,point} from './ui.mjs';
import {installOutputTap,startClip} from './native-clip.mjs';
const boundaryOnly=process.env.SETTLEMENT_BOUNDARIES?.split(',');
const port=Number(process.env.SETTLEMENT_PORT??5572);
const root=process.env.SETTLEMENT_ROOT??process.cwd(),out=process.env.SETTLEMENT_OUTPUT??'/tmp/settlement-after',baseline=!!process.env.SETTLEMENT_BEFORE,quick=!!process.env.SETTLEMENT_QUICK;
await mkdir(out,{recursive:true});
const loader=await createServer({root:process.cwd(),logLevel:'error'});
const {settlementReady,repeatedSettlementReady}=await loader.ssrLoadModule('/harness/fixtures/settlement.ts'),{energySend}=await loader.ssrLoadModule('/harness/fixtures/hero-climax.ts'),{makeCheckpoint,readCheckpoint}=await loader.ssrLoadModule('/src/application/checkpoint.ts'),{applyCommand}=await loader.ssrLoadModule('/src/domain/run.ts');
const fixtures=Object.fromEntries(['ordinary','chain','million','billion','long','boss-win','boss-loss'].map(kind=>{const f=settlementReady(kind),after=energySend(f.state,f.action);assert.ok(readCheckpoint(makeCheckpoint(f.state,[])).ok);assert.ok(readCheckpoint(makeCheckpoint(after,[])).ok);return [kind,{...f,after}];}));
if(process.env.SETTLEMENT_REPEATED){const f=repeatedSettlementReady(),after=energySend(f.state,f.action);assert.ok(readCheckpoint(makeCheckpoint(after,[])).ok);fixtures.repeated={...f,after};}
await writeFile(out+'/controlled-states.json',JSON.stringify(fixtures));await loader.close();
const server=await createServer({root,mode:'e2e',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']}),report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),baseline,scope:'Controlled inventory/levels/prior ledger -> unchanged real scorer. Same terminal states imported through production UI for before/after. Native command cases compare complete state, journal and IndexedDB. No natural acquisition, human aesthetic, hardware, FPS or hearing acceptance.',cases:[]};
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
async function imp(p,state,scene='intermission'){
 await p.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();
 const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'settlement-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(state,[])))});await waitScene(p,scene);
 await p.waitForFunction(scene=>window.__harness.game.scene.getScene(scene).ready,scene);
}
async function regions(p){return p.evaluate(()=>{const s=window.__harness.game.scene.getScene('intermission'),all=[],walk=list=>{for(const o of list){all.push(o);if(o.list)walk(o.list);}};walk(s.view.root.list);return {stage:all.find(o=>o.name==='result-art/stage')?.getData('bounds'),texts:all.filter(o=>o.type==='Text'&&/^result\//.test(o.name)).map(o=>({name:o.name,text:o.text,bounds:o.getBounds()})),art:all.filter(o=>/^result-art\/(hero|source)$/.test(o.name)).map(o=>({name:o.name,asset:o.getData('assetId'),bounds:o.getBounds()})),controls:all.filter(o=>o.input).map(o=>({name:o.name,enabled:o.input.enabled,bounds:o.getBounds()})),motion:all.filter(o=>/^result\/(victory|failure)-motion$/.test(o.name)).map(o=>({name:o.name,started:o.getData('startedAt')}))};});}
async function shot(p,row,key){await p.screenshot({path:out+'/'+key+'.png',scale:'css',fullPage:true});row.regions=await regions(p);if(!baseline){const r=row.regions,v=p.viewportSize();for(const t of [...r.texts,...r.art]){assert.ok(t.bounds.x>=-1&&t.bounds.x+t.bounds.width<=v.width+1,key+' horizontal '+t.name);assert.ok(t.bounds.y>=0&&t.bounds.y+t.bounds.height<=v.height+1,key+' vertical '+t.name);}
 for(const name of ['result/score','result/formula','result/gap','result/reward']){const t=r.texts.find(t=>t.name===name);if(t)assert.ok(t.bounds.y+t.bounds.height<=r.stage.y+r.stage.height+1,key+' stage '+name);}
 const score=r.texts.find(t=>t.name==='result/score');assert.ok(score);for(const c of r.controls){assert.ok(score.bounds.y+score.bounds.height<c.bounds.y||score.bounds.y>c.bounds.y+c.bounds.height,'score leaves controls clear');}
 assert.equal(r.controls.some(c=>c.name.includes('skip-celebration')),false);}
}
const sizes=quick?[{width:1366,height:768},{width:390,height:844}]:[{width:1180,height:757},{width:1366,height:768},{width:390,height:844}];
try{
 for(const kind of boundaryOnly?[]:process.env.SETTLEMENT_REPEATED?['repeated']:quick?['billion','ordinary','boss-loss']:Object.keys(fixtures))for(const viewport of sizes){
  const key=kind+'-'+viewport.width,p=await browser.newPage({viewport,hasTouch:viewport.width<700,deviceScaleFactor:1}),row={key,kind,viewport,errors:[],score:fixtures[kind].after.lastTrace.finalScore};report.cases.push(row);p.setDefaultTimeout(24000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(e.stack));
  try{await imp(p,fixtures[kind].after);const initial=await saved(p);await p.waitForTimeout(1250);await shot(p,row,key);assert.deepEqual(await saved(p),initial);row.saved=initial;assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',key,row.score);}catch(e){row.status='FAIL';row.error=e.stack;await p.screenshot({path:out+'/'+key+'-FAIL.png'});throw e;}finally{await p.close();}
 }
 if(!baseline&&!quick){
  for(const [kind,width] of boundaryOnly?[]:[['ordinary',1180],['chain',390],['billion',1366],['boss-win',1366],['boss-loss',390]]){
   const viewport={width,height:width<700?844:768},touch=width<700,key='native-'+kind+'-'+width,p=await browser.newPage({viewport,hasTouch:touch,deviceScaleFactor:1}),row={key,errors:[]};report.cases.push(row);p.setDefaultTimeout(40000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(e.stack));await installOutputTap(p,{music:.30,sfx:.80});await p.addInitScript(()=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:false})));
   try{const f=fixtures[kind];await imp(p,f.state,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.presentation&&!s.playing;});
    if(await p.getByRole('button',{name:'开始出牌',exact:true}).isVisible())await p.getByRole('button',{name:'开始出牌',exact:true}).click();if(await p.locator('.detail-dialog[open]').count())await p.getByRole('button',{name:'关闭',exact:true}).click();
    row.before=await saved(p);for(const id of f.action.selectedIds)await tapUI(p,'game','card/'+id,touch);
    if(f.action.xiemuBurn){await tapUI(p,'game','hero/xiemu-burn',touch);await p.getByRole('button',{name:'燃30金 ×4',exact:true}).click();}
    const clip=await startClip(p,out,key);await tapUI(p,'game','action/play',touch);await waitScene(p,'intermission');row.entry=await regions(p);await p.screenshot({path:out+'/'+key+'-entry.png',scale:'css'});await p.waitForTimeout(1300);row.clip=await clip.stop();await shot(p,row,key);row.after=await saved(p);
    const receipt=row.after.state.receipts.at(-1),command={runId:f.state.runId,commandId:receipt.commandId,expectedSeq:f.state.commandSeq,action:f.action},applied=applyCommand(f.state,command);assert.ok(applied.ok);assert.deepEqual(row.after.state,applied.state);assert.deepEqual(row.after.journal,[...row.before.journal,command]);assert.deepEqual(row.after.storage.current.state,row.after.state);assert.equal(row.regions.motion.length,0);assert.deepEqual(row.errors,[]);
    await tapUI(p,'intermission','action/last-hand',touch);await p.getByRole('button',{name:'关闭',exact:true}).click();assert.deepEqual(await saved(p),row.after);
    await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'intermission');await p.waitForTimeout(1200);assert.deepEqual(await saved(p),row.after);row.restored=await regions(p);row.status='PASS';console.log('PASS',key);
   }catch(e){row.status='FAIL';row.error=e.stack;await p.screenshot({path:out+'/'+key+'-FAIL.png'});throw e;}finally{await p.close();}
  }
  for(const mode of boundaryOnly??['repeat-continue','quick-return','blur','hidden','reduced','accelerated','slow-art','missing-art','late-exit','short','narrow']){
   const kind=mode==='repeat-continue'?'chain':'billion',width=['reduced','accelerated','missing-art','narrow'].includes(mode)?390:1366,viewport=mode==='short'?{width:740,height:390}:mode==='narrow'?{width:320,height:740}:{width,height:width<700?844:768},key='boundary-'+mode,p=await browser.newPage({viewport,hasTouch:viewport.width<700,deviceScaleFactor:1,reducedMotion:mode==='reduced'?'reduce':'no-preference'}),row={key,errors:[]};report.cases.push(row);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(e.stack));p.setDefaultTimeout(20000);
   if(mode==='accelerated')await p.addInitScript(()=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:false})));
   if(['slow-art','late-exit','missing-art'].includes(mode))await p.route('**/assets/handdrawn-p08/**/*.webp',async r=>{if(mode==='missing-art')await r.abort();else{await new Promise(resolve=>setTimeout(resolve,1700));await r.continue().catch(()=>{});}});
   try{await imp(p,fixtures[kind].after);const initial=await saved(p);row.beforeMotion=await regions(p);
    if(mode==='blur')await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
    if(mode==='hidden')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
    if(mode==='accelerated'){assert.equal(row.beforeMotion.motion.length,1);await p.waitForTimeout(400);assert.equal((await regions(p)).motion.length,1);}
    if(mode==='repeat-continue'){const hit=await point(p,'intermission','action/continue-stage');await p.mouse.click(hit.x,hit.y,{clickCount:3,delay:15});await waitScene(p,'shop');const after=await saved(p);assert.equal(after.state.commandSeq,initial.state.commandSeq+1);assert.equal(after.state.gold,initial.state.gold);row.after=after;}
    else if(['quick-return','late-exit'].includes(mode)){const hit=await point(p,'intermission','action/return-select');await p.mouse.click(hit.x,hit.y,{clickCount:2,delay:15});await waitScene(p,'character-select');await p.waitForTimeout(1900);assert.deepEqual(await saved(p),initial);row.active='character-select';}
    else{await p.waitForTimeout(mode==='slow-art'?2300:1250);await shot(p,row,key);assert.deepEqual(await saved(p),initial);assert.equal((await regions(p)).motion.length,0);if(mode==='missing-art')assert.equal(row.regions.art.length,0);}
    assert.deepEqual(row.errors,[]);row.saved=initial;row.status='PASS';console.log('PASS',key);
   }catch(e){row.status='FAIL';row.error=e.stack;await p.screenshot({path:out+'/'+key+'-FAIL.png'});throw e;}finally{await p.close();}
  }
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.length}));}
