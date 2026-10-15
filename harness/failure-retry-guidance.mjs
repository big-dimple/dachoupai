/** Local controlled terminal QA; domain state is only read, inputs use real UI.
 * Fault probes wrap SaveStore.commit; they never apply commands or edit saved state. */
import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI,point,openSelector} from './ui.mjs';
const out=process.env.FAILURE_QA_OUT??'/tmp/failure-retry-guidance',port=Number(process.env.FAILURE_QA_PORT??4181);
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});
const {failureRetryFixture}=await server.ssrLoadModule('/harness/fixtures/failure-retry.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {createRun}=await server.ssrLoadModule('/src/domain/run.ts');
const fixtures=Object.fromEntries(['hands','cards','abandoned','boss'].map(kind=>[kind,failureRetryFixture(kind).after]));
for(const state of Object.values(fixtures)){assert.equal(state.phase,'run-lost');assert.ok(readCheckpoint(makeCheckpoint(state,[])).ok);}
await server.listen();
const browser=await chromium.launch({executablePath:process.env.SMOKE_CHROMIUM_EXECUTABLE_PATH??'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});
const report={startedAt:new Date().toISOString(),sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Local E2E build; controlled terminal fixtures end through original commands, strict production import, native clicks/taps, full state/journal/checkpoint/revision comparison. Not formal-site QA, natural runs, physical devices, hearing or balance acceptance.',cases:[],failures:[]},full=[];
const observe=page=>page.evaluate(async()=>{
 const {gameSession}=await import('/src/game/session.ts'),s=gameSession(),c=window.__harness.game.registry.get('runController');
 return {state:c.state,journal:c.journal,storage:await c.store.read(),status:c.status,pending:s.pendingRun?{state:s.pendingRun.state,journal:s.pendingRun.journal,json:s.pendingRun.exportJSON(),status:s.pendingRun.status}:null};
});
async function importState(page,state){
 await page.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(page,'title');
 await page.locator('.run-menu-toggle').click();const section=page.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'failure-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(state,[])))});
 await waitScene(page,'intermission');await page.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').ready);await page.waitForTimeout(1250);
}
async function shot(page,key){await page.screenshot({path:out+'/'+key+'.png',scale:'css',fullPage:true});}
async function same(page,initial){assert.deepEqual(await observe(page),initial);}
async function buttonBounds(page){
 return page.locator('.detail-dialog[open] .dialog-actions button').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,disabled:n.disabled,rect:{x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}})));
}
async function checkDialog(page,viewport){
 const d=page.locator('.detail-dialog[open]');assert.ok(await d.count());const bounds=await d.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=viewport.width+1);assert.ok(bounds.y>=0&&bounds.y+bounds.height<=viewport.height+1);
 const buttons=await buttonBounds(page);for(const b of buttons){assert.ok(b.rect.height>=44);assert.ok(b.rect.x>=0&&b.rect.x+b.rect.width<=viewport.width+1);assert.ok(b.rect.y>=0&&b.rect.y+b.rect.height<=viewport.height+1);}
 return {bounds,buttons,text:await d.innerText(),scroll:await d.evaluate(el=>({height:el.clientHeight,scrollHeight:el.scrollHeight}))};
}
async function armCommit(page,mode){
 await page.evaluate(mode=>{
  const c=window.__harness.game.registry.get('runController'),store=c.store,original=store.commit.bind(store);
  window.__failureProbe={calls:0,mode};store.commit=async(...args)=>{const p=window.__failureProbe;p.calls++;if(p.mode==='fault')throw new DOMException('controlled quota failure','QuotaExceededError');if(p.mode==='delay')await new Promise(resolve=>setTimeout(resolve,500));return original(...args);};
 },mode);
}
function expectedRestart(old){return createRun({r2Identity:{contentVersion:old.contentVersion,contentHash:old.contentHash},seed:old.seed,characterId:old.characterId,runId:`run/${old.seed}/${old.characterId}`,rulesVersion:'r2',openingRoute:old.openingRoute,modeConfig:{mode:old.mode,difficulty:old.difficulty,challengeId:old.challengeId,programsEnabled:old.programsEnabled}});}
async function retryFlow(page,row,initial,viewport,fault){
 await tapUI(page,'intermission','action/failure-guidance',viewport.width<700);await armCommit(page,fault?'fault':'delay');
 if(!fault){
  const button=page.getByRole('button',{name:'同局重试',exact:true}),p=await button.boundingBox();await page.mouse.click(p.x+p.width/2,p.y+p.height/2,{clickCount:3,delay:20});
 }else await page.getByRole('button',{name:'同局重试',exact:true}).tap();
 if(fault){
  await page.waitForFunction(async()=>{const {gameSession}=await import('/src/game/session.ts');return gameSession().pendingRun?.status==='paused'&&!gameSession().working;});
  const failed=await observe(page);assert.deepEqual(failed.state,initial.state);assert.deepEqual(failed.storage,initial.storage);assert.deepEqual(failed.pending.state,expectedRestart(initial.state));assert.equal(failed.pending.status,'paused');row.failed=failed;full.push({key:row.key+'/failed',saved:failed});
  await shot(page,row.key+'-save-failed');assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('intermission').ready),false);
  if(!await page.locator('.run-menu-modal').evaluate(el=>el.open))await page.locator('.run-menu-toggle').click();await page.getByRole('button',{name:'重试保存',exact:true}).click();const again=await observe(page);assert.equal(again.pending.json,failed.pending.json);assert.deepEqual(again.storage,initial.storage);row.fixedCandidateAfterRepeatedFault=true;
  await page.evaluate(()=>{window.__failureProbe.mode='delay';});await page.getByRole('button',{name:'重试保存',exact:true}).click();
 }
 await waitScene(page,'shop');await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);const after=await observe(page);
 assert.deepEqual(after.state,expectedRestart(initial.state));assert.equal(after.state.commandSeq,1);assert.deepEqual(after.journal,[]);assert.equal(after.pending,null);assert.equal(after.storage.revision,initial.storage.revision+1);assert.deepEqual(after.storage.previous,initial.storage.current);assert.equal(await page.evaluate(()=>window.__failureProbe.calls),fault?3:1);
 row.retry={status:'PASS',commitAttempts:await page.evaluate(()=>window.__failureProbe.calls),successfulRevisionDelta:1,singleNewState:true};full.push({key:row.key+'/retry',saved:after});await shot(page,row.key+'-retry-shop');
 await page.reload({waitUntil:'networkidle'});await waitScene(page,'title');await tapUI(page,'title','action/title-continue',viewport.width<700);await waitScene(page,'shop');await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);assert.deepEqual(await observe(page),after);row.coldRecovery='PASS';
}
try{
 const sizes=[{name:'pc',width:1366,height:768},{name:'390',width:390,height:844},{name:'320-short',width:320,height:568}];
 for(const viewport of sizes)for(const kind of ['hands','cards','abandoned']){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},hasTouch:viewport.width<700,deviceScaleFactor:1}),page=await context.newPage(),row={key:viewport.name+'-'+kind,kind,viewport,errors:[]};report.cases.push(row);page.on('pageerror',e=>row.errors.push(e.message));page.on('dialog',d=>d.accept());page.setDefaultTimeout(15000);
  try{
   await importState(page,fixtures[kind]);const initial=await observe(page);full.push({key:row.key+'/initial',saved:initial});await shot(page,row.key+'-failure');
   const hit=await point(page,'intermission','action/failure-guidance');assert.ok(hit.enabled&&hit.x>=0&&hit.x<=viewport.width&&hit.y>=0&&hit.y<=viewport.height);
   await tapUI(page,'intermission','action/failure-guidance',viewport.width<700);row.dialog=await checkDialog(page,viewport);await shot(page,row.key+'-advice');await same(page,initial);
   const review=page.getByRole('button',{name:'回看最后一手',exact:true});
   if(kind==='abandoned')assert.ok(await review.isDisabled());else{
    await review.click();await page.getByRole('button',{name:'返回再战建议',exact:true}).waitFor();await same(page,initial);await page.getByRole('button',{name:'返回再战建议',exact:true}).click();await same(page,initial);
   }
   await page.getByText('升级与做牌的实际规则',{exact:true}).click();await page.locator('.detail-dialog[open]').evaluate(el=>el.scrollTop=el.scrollHeight);assert.ok((await page.locator('.detail-dialog[open]').innerText()).includes('Lv.1原价4金'));row.expanded=await checkDialog(page,viewport);await same(page,initial);
   if(viewport.name==='320-short'&&kind==='hands')await shot(page,row.key+'-rules-bottom');
   await page.getByRole('button',{name:'返回失败页',exact:true}).click();await same(page,initial);
   await tapUI(page,'intermission','action/last-hand',viewport.width<700);await page.getByRole('button',{name:'再战建议',exact:true}).click();await same(page,initial);
   await page.getByRole('button',{name:'返回选角',exact:true}).click();await waitScene(page,'character-select');await same(page,initial);
   await tapUI(page,'character-select','action/cancel-character',viewport.width<700);await waitScene(page,'intermission');await same(page,initial);row.readOnlyFlow='PASS';
   if(kind==='hands')await retryFlow(page,row,initial,viewport,false);
   assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',row.key);
  }catch(e){row.status='FAIL';row.error=e.stack;await shot(page,row.key+'-FAIL').catch(()=>{});throw e;}finally{await context.close();}
 }
 for(const kind of ['boss','fault']){
  const viewport={width:390,height:568},context=await browser.newContext({viewport,hasTouch:true,deviceScaleFactor:1}),page=await context.newPage(),row={key:'390-short-'+kind,kind,viewport,errors:[]};report.cases.push(row);page.on('pageerror',e=>row.errors.push(e.message));page.on('dialog',d=>d.accept());
  try{
   await importState(page,fixtures[kind==='boss'?'boss':'hands']);const initial=await observe(page);full.push({key:row.key+'/initial',saved:initial});
   if(kind==='boss'){await tapUI(page,'intermission','action/failure-guidance',true);row.dialog=await checkDialog(page,viewport);assert.ok(row.dialog.text.includes('普通点数归零'));assert.ok(row.dialog.text.includes('前三张'));await shot(page,row.key+'-advice');await same(page,initial);await page.getByRole('button',{name:'返回失败页',exact:true}).click();await same(page,initial);}
   else await retryFlow(page,row,initial,viewport,true);
   assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',row.key);
  }catch(e){row.status='FAIL';row.error=e.stack;await shot(page,row.key+'-FAIL').catch(()=>{});throw e;}finally{await context.close();}
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.failures.push(e.stack);process.exitCode=1;console.error(e.stack);}
finally{report.completedAt=new Date().toISOString();await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await writeFile(out+'/full-state.json.gz',gzipSync(JSON.stringify({fixtures,observations:full})));console.log('Result:',report.status,'in',out);}
