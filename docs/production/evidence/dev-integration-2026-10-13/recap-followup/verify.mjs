import assert from 'node:assert/strict';
import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
import {chromium} from '/workspace/dachoupai/node_modules/playwright/index.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from '/workspace/dachoupai/harness/ui.mjs';
const out='/tmp/integration-five/recap-followup';await mkdir(out,{recursive:true});
const port=Number(process.env.RECAP_FOLLOWUP_PORT??5677),server=await createServer({root:'/workspace/dachoupai',mode:'e2e',cacheDir:'/tmp/integration-five/recap-followup-vite',server:{host:'127.0.0.1',port,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const sourceClear='docs/production/evidence/p1a-active-mult-timing-2026-10-12/native/report.json',sourceGame='docs/production/evidence/touye-new-core-2026-10-12/native-final/report.json',sourceLoss='docs/production/evidence/pc-shop-2026-10-07/controlled-lose.json';
const clear=(JSON.parse(await readFile(sourceClear,'utf8'))).rows.find(r=>r.kind==='xiemu'&&r.viewport.width===1366).after;
const game=(JSON.parse(await readFile(sourceGame,'utf8'))).rows.find(r=>r.kind==='mature-win'&&r.viewport.width===1366).afterPlay;
const loss=JSON.parse(await readFile(sourceLoss,'utf8'));
const fixtures=[{kind:'ordinary',checkpoint:makeCheckpoint(game.state,game.journal),source:sourceGame},{kind:'clear',checkpoint:makeCheckpoint(clear.state,clear.journal),source:sourceClear},{kind:'loss',checkpoint:loss,source:sourceLoss}];for(const f of fixtures)assert.equal(readCheckpoint(f.checkpoint).ok,true);
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Existing valid checkpoints, actual mouse/touch after recap close. Only one OpenShop transaction per clear fixture, no PlayHand, no whole run.',rows:[],status:'RUNNING'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{for(const viewport of [{width:1366,height:768},{width:390,height:844}])for(const f of fixtures){
 if(process.env.RECAP_FOLLOWUP_CASES&&!process.env.RECAP_FOLLOWUP_CASES.split(',').includes(f.kind+'-'+viewport.width))continue;
 const row={viewport,kind:f.kind,source:f.source,images:[]};report.rows.push(row);
 const touch=viewport.width===390,context=await browser.newContext({viewport,hasTouch:touch,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(40000);page.on('dialog',d=>d.accept());const dom=l=>touch?l.tap():l.click();
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const snap=()=>page.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return{state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});
 const shot=async name=>{const file=`${viewport.width}-${f.kind}-${name}.png`;await page.screenshot({path:out+'/'+file,scale:'css'});row.images.push(file);};
 const close=()=>dom(page.locator('.detail-dialog[open] .dialog-close'));
 const key=f.kind==='ordinary'?'game':'intermission';
 await page.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(page,'title');await dom(page.locator('.run-menu-toggle'));const saves=page.getByText('进度与存档',{exact:true}).locator('..');if(!await saves.evaluate(e=>e.open))await dom(saves.locator('summary'));const choose=page.waitForEvent('filechooser');await dom(page.getByRole('button',{name:'导入本局',exact:true}));await(await choose).setFiles({name:'existing-recap-followup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(f.checkpoint))});await waitScene(page,key);
 await page.waitForFunction(key=>{const s=window.__harness.game.scene.getScene(key);return s.ready&&!s.playing&&!s.presentation;},key);
 const before=await snap();row.before=before;
 if(f.kind==='ordinary'){await dom(page.locator('.run-menu-toggle'));await dom(page.getByRole('button',{name:'上手详情',exact:true}));}
 else {await tapUI(page,'intermission','action/last-hand',touch);if(f.kind==='loss')await dom(page.getByRole('button',{name:'回看最后一手',exact:true}));}
 const rules=page.locator('.detail-dialog[open] .dialog-copy > details.card-rules');assert.equal(await rules.evaluate(e=>e.open),false);await rules.locator('summary').evaluate(e=>e.scrollIntoView({block:'center'}));await dom(rules.locator('summary'));assert.equal(await rules.evaluate(e=>e.open),true);await dom(rules.locator('summary'));assert.equal(await rules.evaluate(e=>e.open),false);await close();assert.deepEqual(await snap(),before);row.diagnosticOpenRecloseAndCloseSavedExact=true;
 if(f.kind==='ordinary'){
  const id=before.state.handOrder[0];assert.ok(id);await tapUI(page,'game','card/'+id,touch);assert.deepEqual(await page.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),[id]);await tapUI(page,'game','card/'+id,touch);assert.deepEqual(await page.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),[]);assert.deepEqual(await snap(),before);row.actualCardSelectDeselectAfterCloseSavedExact=true;await shot('after-select-deselect');
 }else if(f.kind==='clear'){
  await tapUI(page,'intermission','action/last-hand',touch);await dom(page.getByRole('button',{name:'查看培养路线',exact:true}));await page.locator('.detail-dialog[open] .build-keepsake').waitFor();await shot('journey-reachable');await close();assert.deepEqual(await snap(),before);row.journeyAfterRecapSavedExact=true;
  await tapUI(page,'intermission','action/last-hand',touch);await dom(page.getByRole('button',{name:'前往筹备商店继续培养',exact:true}));await waitScene(page,'shop');await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
  const after=await snap(),command=after.journal.at(-1);assert.deepEqual(command.action,{type:'OpenShop'});assert.equal(after.journal.length,before.journal.length+1);assert.deepEqual(after.journal.slice(0,-1),before.journal);const expected=applyCommand(before.state,command);assert.ok(expected.ok,expected.code);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.storage.current.state,expected.state);row.after=after;row.actualRecapToShopFullStateEqualsOriginalDomainCommand=true;await shot('shop-reachable');
 }else {
  await tapUI(page,'intermission','action/continue-stage',touch);await waitScene(page,'character-select');assert.deepEqual(await snap(),before);row.actualReturnSelectAfterCloseSavedExact=true;await shot('select-reachable');
 }
 assert.deepEqual(errors,[]);row.status='PASS';await context.close();
}report.status='PASS';}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:report.rows.length,error:report.error}));}
