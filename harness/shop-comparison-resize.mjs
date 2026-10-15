import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from './ui.mjs';
const out=process.env.RESIZE_OUTPUT??'/tmp/shop-comparison-resize',before=process.argv.includes('--before');await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:'/tmp/shop-comparison-resize-vite',server:{host:'127.0.0.1',port:5491,strictPort:true},logLevel:'error'});await server.listen();
const {recommendationEvidenceFixture,recommendationFiveStarFixture}=await server.ssrLoadModule('/harness/fixtures/recommendation-evidence.ts');
const {r2Price}=await server.ssrLoadModule('/src/domain/r2Shop.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),before,cases:[]};
try{for(const kind of ['regular','long-combination','five-star']){
 const s=kind==='five-star'?recommendationFiveStarFixture():recommendationEvidenceFixture('group');
 if(kind==='regular')s.shop.offers[0]={offerId:'resize/b10',definitionId:'b10',price:r2Price('b10','none',s),edition:'none',consumed:false};
 const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok);
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),p=await context.newPage(),row={kind,checks:[],steps:[],errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
 const snap=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read(),localStorage:{...localStorage}};});
 const dialog=p.locator('.detail-dialog[data-shop-context=compare][open]'),scroll=dialog.locator('.dialog-scroll'),fifth=dialog.locator('.shop-compare-slot').nth(4).getByRole('button',{name:'管理这张',exact:true});
 const shot=async label=>{await p.waitForFunction(()=>[...document.querySelectorAll('.shop-comparison-dialog[open] img')].every(e=>e.complete&&e.naturalWidth>0));await p.screenshot({path:out+'/'+kind+'-'+label+'.png',scale:'css'});};
 const metrics=()=>dialog.evaluate(d=>{const s=d.querySelector('.dialog-scroll'),c=d.querySelector('.shop-compare-candidate'),content=d.querySelector('.dialog-content');return {height:innerHeight,compact:d.classList.contains('shop-comparison-compact'),candidateInScroll:c.parentElement===s,scrollTop:s.scrollTop,scrollHeight:s.scrollHeight,clientHeight:s.clientHeight,contentHeight:content.clientHeight,actions:[...d.querySelectorAll('.dialog-actions button')].map(b=>({label:b.textContent,rect:b.getBoundingClientRect().toJSON()}))};});
 await p.goto('http://127.0.0.1:5491/?harness=1');await waitScene(p,'title');await p.locator('.run-menu-toggle').tap();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'resize.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),run=gameSession().run,dispatch=run.dispatch.bind(run);window.__resizeDispatch=[];run.dispatch=(a,...args)=>{window.__resizeDispatch.push(a);return dispatch(a,...args);};});row.initial=await snap();
 await tapUI(p,'shop','offer/'+s.shop.offers[0].offerId,true);await dialog.waitFor();await shot('844-open');
 for(const [height,label]of [[568,'568-shrunk'],[844,'844-restored']]){
  await p.setViewportSize({width:390,height});await p.waitForTimeout(150);await shot(label);const m=await metrics();row.steps.push({label,...m});
  if(before){if(m.clientHeight<80){row.confirmedFailure='slots scroll area collapsed after resize: '+m.clientHeight+'px';break;}continue;}
  assert.ok(m.clientHeight>=100,'slots keep usable native scroll after resize');assert.equal(m.candidateInScroll,height===568,'candidate follows current viewport, not initial open size');
  for(const a of m.actions)assert.ok(a.rect.y>=0&&a.rect.bottom<=height,'fixed footer button fully visible');
  await fifth.scrollIntoViewIfNeeded();row.steps.push({label:label+'-fifth-visible',focus:await fifth.evaluate(e=>({active:document.activeElement===e,rect:e.getBoundingClientRect().toJSON(),scroll:e.closest('.dialog-scroll').getBoundingClientRect().toJSON()}))});assert.ok(await fifth.evaluate(e=>{const r=e.getBoundingClientRect(),s=e.closest('.dialog-scroll').getBoundingClientRect();return r.top>=s.top-1&&r.bottom<=s.bottom+1;}));await shot(label+'-fifth');const at=await scroll.evaluate(e=>e.scrollTop);await fifth.tap();await p.getByRole('button',{name:'返回现货比较',exact:true}).tap();await dialog.waitFor();assert.equal(await scroll.evaluate(e=>e.scrollTop),at);assert.ok(await fifth.evaluate(e=>document.activeElement===e));
  await fifth.tap();await p.locator('.detail-dialog[open] .dialog-close').tap();await dialog.waitFor();assert.equal(await scroll.evaluate(e=>e.scrollTop),at);assert.ok(await fifth.evaluate(e=>document.activeElement===e));await scroll.evaluate(e=>e.scrollTop=0);await shot(label+'-candidate-return');assert.ok(await dialog.locator('.shop-compare-candidate').isVisible());assert.deepEqual(await snap(),row.initial);
  row.checks.push(label+': candidate/fifth/native scroll/manage return/close/focus/footer and full save unchanged');
 }
 if(!before){
  await fifth.scrollIntoViewIfNeeded();await fifth.focus();
  for(const height of [568,844]){
   await p.setViewportSize({width:390,height});await p.waitForTimeout(150);
   await shot(height+'-resize-at-fifth');row.steps.push({label:height+'-focused-fifth',...(await metrics()),focus:await fifth.evaluate(e=>({active:document.activeElement===e,rect:e.getBoundingClientRect().toJSON(),scroll:e.closest('.dialog-scroll').getBoundingClientRect().toJSON()}))});
   assert.ok(await fifth.evaluate(e=>{const r=e.getBoundingClientRect(),s=e.closest('.dialog-scroll').getBoundingClientRect();return document.activeElement===e&&r.top>=s.top-1&&r.bottom<=s.bottom+1;}),'resizing while focused on fifth keeps that control in view');
   await shot(height+'-resize-at-fifth');
  }
  assert.deepEqual(await snap(),row.initial);
  row.checks.push('resize at focused fifth slot preserves visible control and focus in both directions');
  await dialog.getByRole('button',{name:'返回购买详情',exact:true}).tap();await p.locator('.detail-dialog[data-shop-context=purchase][open]').waitFor();await p.locator('.detail-dialog[open] .dialog-close').tap();await tapUI(p,'shop','offer/'+s.shop.offers[0].offerId,true);await dialog.waitFor();await dialog.locator('.dialog-close').tap();assert.equal(await p.locator('.detail-dialog[open]').count(),0);assert.deepEqual(await snap(),row.initial);assert.deepEqual(await p.evaluate(()=>window.__resizeDispatch),[]);assert.deepEqual(row.errors,[]);row.status='PASS';}
 else row.status=row.confirmedFailure?'REPRODUCED':'OBSERVED';await context.close();
}report.status=before?'OBSERVED':'PASS';}catch(e){report.status='FAIL';report.error=e.stack??String(e);process.exitCode=1;console.error(e);}finally{await browser.close();await server.close();await writeFile(out+'/full-state-journal-storage.json.gz',gzipSync(JSON.stringify(report)));for(const r of report.cases)delete r.initial;await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report.status,out);}
