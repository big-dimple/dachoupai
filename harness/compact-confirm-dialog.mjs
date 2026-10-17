import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter,tapUI,waitScene} from './ui.mjs';

const out='shots/compact-confirm-dialog';await mkdir(out,{recursive:true});
const outDir=out+'/build';await build({mode:'e2e',build:{outDir,emptyOutDir:true},logLevel:'error'});
const server=await preview({build:{outDir},preview:{host:'127.0.0.1',port:5593,strictPort:true}});
const browser=await chromium.launch({args:['--disable-gpu']});
const report={base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),cases:[],errors:[],scope:'Native UI creates an initial run and replacement confirmation. Supplementary controlled long text and catalog DOM check shared scrolling. Software browser only; no physical-device, source-screenshot pixel or long-run acceptance.'};
report.sourceSHA256=Object.fromEntries(await Promise.all(['src/game/DetailDialog.ts','src/game/DetailDialog.css'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const snapshot=p=>p.evaluate(async()=>{const run=window.__harness.game.registry.get('runController');return {state:run.state,journal:run.journal,slots:await run.store.read()};});
const click=async(p,locator,touch)=>touch?locator.tap():locator.click();
async function openConfirmation(p,touch){await tapUI(p,'character-select','action/confirm-character',touch);await p.getByRole('dialog',{name:'开始新局？',exact:true}).waitFor();await p.evaluate(()=>{window.confirmReturnFocus=window.__harness.game.scene.getScene('character-select').dialog.returnFocus;});}
async function returnedFocus(p){assert.ok(await p.evaluate(()=>document.activeElement===window.confirmReturnFocus),'dismissal restores the original focus');}
async function bounds(p){return p.locator('dialog[open]').evaluate(d=>{
 const rect=e=>e.getBoundingClientRect().toJSON(),body=d.querySelector('.dialog-body'),scroll=d.querySelector('.dialog-content'),actions=d.querySelector('.dialog-actions');
 return {dialog:rect(d),body:rect(body),actions:rect(actions),scroll:{height:scroll.clientHeight,total:scroll.scrollHeight},buttons:[...actions.children].map(b=>({label:b.textContent,...rect(b)})),focus:document.activeElement?.textContent,overflow:d.scrollWidth>d.clientWidth};
});}
try {
 for(const spec of [{name:'pc',width:1652,height:924},{name:'390',width:390,height:844,touch:true},{name:'320',width:320,height:568,touch:true},{name:'short',width:844,height:300,touch:true,safe:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:!!spec.touch,deviceScaleFactor:1}),p=await context.newPage();
  p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(45000);p.on('pageerror',e=>report.errors.push(spec.name+': '+e.message));
  console.log('Checking '+spec.name);await p.goto('http://127.0.0.1:5593/?harness=1');await chooseCharacter(p,'amo',!!spec.touch);
  await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');await section.locator('summary').click();
  p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'开始新局',exact:true}).click();await waitScene(p,'character-select');
  await tapUI(p,'character-select','character/touye',!!spec.touch);await tapUI(p,'character-select','action/confirm-character',!!spec.touch);await tapUI(p,'character-select','route/group',!!spec.touch);
  if(spec.safe)await p.evaluate(()=>{for(const [side,n] of Object.entries({top:12,bottom:34,left:18,right:10}))document.documentElement.style.setProperty('--safe-'+side,n+'px');});
  const before=await snapshot(p);await openConfirmation(p,!!spec.touch);const b=await bounds(p);
  assert.ok(b.dialog.width<=520&&b.dialog.height<360,JSON.stringify(b));assert.equal(b.overflow,false);assert.ok(b.actions.y-(b.body.y+b.body.height)<=24,'actions follow the message');
  const safe=spec.safe?{left:30,right:22,top:24,bottom:46}:{left:12,right:12,top:12,bottom:12};
  assert.ok(b.dialog.x>=safe.left-1&&b.dialog.y>=safe.top-1);assert.ok(b.dialog.right<=spec.width-safe.right+1&&b.dialog.bottom<=spec.height-safe.bottom+1);
  for(const button of b.buttons)assert.ok(button.height>=48&&button.y>=b.dialog.y&&button.bottom<=b.dialog.bottom);
  assert.equal(b.focus,'取消');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'确认开始新局');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'取消');
  await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'确认开始新局');await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'取消');
  await p.screenshot({path:out+'/'+spec.name+'.png'});
  await p.locator('dialog .dialog-body').evaluate(e=>{window.originalDialogBody=e.textContent;e.textContent=Array.from({length:65},(_,i)=>'第'+(i+1)+'条：保留完整说明，正文只在需要时滚动。').join('\n');});
  const long=await bounds(p);assert.ok(long.scroll.total>long.scroll.height,JSON.stringify(long));await p.locator('dialog .dialog-content').evaluate(e=>e.scrollTop=e.scrollHeight);assert.ok(await p.locator('dialog .dialog-content').evaluate(e=>e.scrollTop>0));
  assert.ok(long.buttons.every(b=>b.y>=long.dialog.y&&b.bottom<=long.dialog.bottom));
  await p.locator('dialog .dialog-scroll').evaluate(scroll=>{scroll.querySelector('.dialog-body').textContent=window.originalDialogBody;const list=document.createElement('section');list.className='controlled-catalog-list';list.style.whiteSpace='pre-line';list.textContent=Array.from({length:65},(_,i)=>'图鉴条目 '+i).join('\n');scroll.append(list);});
  const detail=await p.locator('dialog[open]').evaluate(d=>({height:d.getBoundingClientRect().height,scroll:d.querySelector('.dialog-scroll').scrollHeight,visible:d.querySelector('.dialog-scroll').clientHeight}));
  assert.ok(Math.abs(detail.height-Math.min(780,spec.height-(spec.safe?46:0)-24))<2,'catalog retains its detail workspace');assert.ok(detail.scroll>detail.visible);
  await p.locator('dialog .dialog-scroll').evaluate(e=>e.scrollTop=e.scrollHeight);assert.ok(await p.locator('dialog .dialog-scroll').evaluate(e=>e.scrollTop>0));await p.locator('.controlled-catalog-list').evaluate(e=>e.remove());
  await p.keyboard.press('Enter');assert.deepEqual(await snapshot(p),before,'Enter on focused cancel preserves complete progress');assert.equal(await p.locator('dialog[open]').count(),0);await returnedFocus(p);
  await openConfirmation(p,!!spec.touch);await p.keyboard.press('Escape');assert.deepEqual(await snapshot(p),before,'Escape preserves complete progress');assert.equal(await p.locator('dialog[open]').count(),0);await returnedFocus(p);
  await openConfirmation(p,!!spec.touch);await click(p,p.getByRole('button',{name:'取消',exact:true}),!!spec.touch);assert.deepEqual(await snapshot(p),before,'cancel preserves complete progress');
  await openConfirmation(p,!!spec.touch);assert.deepEqual(await snapshot(p),before,'opening never creates a run');
  const confirm=p.getByRole('button',{name:'确认开始新局',exact:true});if(spec.touch)await confirm.tap();else await confirm.dblclick({delay:80});await waitScene(p,'shop');const after=await snapshot(p);
  assert.notEqual(after.state.runId,before.state.runId);assert.deepEqual(after.slots.previous,before.slots.current,'replaced progress remains the backup');
  assert.equal(after.state.commandSeq,before.state.commandSeq,'rapid confirmation leaves the same initial command sequence as the untouched baseline');assert.deepEqual(after.journal,[]);
  await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',!!spec.touch);await waitScene(p,'shop');assert.deepEqual((await snapshot(p)).state,after.state,'confirmed replacement survives reload');
  const catalogBefore=await snapshot(p);await p.locator('.run-menu-toggle').click();await p.getByRole('button',{name:'图鉴查询',exact:true}).click();
  const catalog=await p.locator('dialog.catalog-dialog[open]').evaluate(d=>{const s=d.querySelector('.dialog-scroll');return {height:d.getBoundingClientRect().height,total:s.scrollHeight,visible:s.clientHeight};});
  assert.ok(Math.abs(catalog.height-Math.min(780,spec.height-24))<2,'real catalog keeps its full detail height');assert.ok(catalog.total>catalog.visible);await p.keyboard.press('Tab');assert.ok(await p.evaluate(()=>document.activeElement.matches('input[type=search]')),'catalog controls remain in the focus order');await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent),'关闭');await p.keyboard.press('Escape');assert.deepEqual(await snapshot(p),catalogBefore,'catalog stays read only');
  report.cases.push({viewport:spec,confirmation:b,longText:long,structuredDetail:detail,realCatalog:catalog,status:'PASS',checks:['keyboard focus cycles both ways and returns to its trigger','Enter/cancel/Escape preserve full state, journal and save slots','opening submits nothing','confirm creates and saves one new run with old checkpoint as backup; PC uses double click','reload restores confirmed state','long text, structured detail and real catalog scroll; catalog form focus works']});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error.stack??error);throw error;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
