import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from './ui.mjs';

const out=process.env.RESOURCE_LOSS_OUTPUT??'/tmp/recommendation-resource-loss';await mkdir(out,{recursive:true});
const paths=['src/game/ShopPurchaseValue.ts','src/game/ShopRecommendation.ts','src/game/ShopScene.ts','src/game/ConsumableDialog.ts','src/game/ShopCardValueVisual.ts','src/game/ShopJokerPresentation.ts','src/game/ShopComparisonDialog.ts','harness/fixtures/recommendation-resource-loss.ts','harness/recommendation-resource-loss.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const sourceHashes=await hashes(),report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,scope:'Controlled readonly recommendation explanation controls at two Chromium viewports; no natural game, real device, sale or purchase.',cases:[]};
const server=await createServer({mode:'e2e',cacheDir:'/tmp/resource-loss-vite',server:{host:'127.0.0.1',port:5495,strictPort:true},logLevel:'error'});await server.listen();
const {resourceLossFixture}=await server.ssrLoadModule('/harness/fixtures/recommendation-resource-loss.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {shopOfferGuidance}=await server.ssrLoadModule('/src/game/ShopOfferGuidance.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{for(const [width,height] of [[1366,768],[390,844]]){
 const touch=width<500,context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
 p.on('dialog',d=>d.accept());p.on('pageerror',e=>errors.push(String(e)));
 const dom=loc=>touch?loc.tap():loc.click();
 const snap=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return{state:s.run.state,journal:s.run.journal,storage:await s.storage.read(),localStorage:{...localStorage}};});
 await p.goto('http://127.0.0.1:5495/?harness=1');await waitScene(p,'title');
 for(const [donor,label,stars] of [['d05','弃牌返还',2],['a07','弃牌收入',2],['f07','失败前救场',2],['e05',undefined,2],['d07',undefined,4]]){
  const {state,offer,sold}=resourceLossFixture(donor),cp=makeCheckpoint(state,[]);assert.ok(readCheckpoint(cp).ok);
  await dom(p.locator('.run-menu-toggle'));const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await dom(section.locator('summary'));
  const chooser=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));await(await chooser).setFiles({name:'resource-loss.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});
  await waitScene(p,'shop');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.ready&&s.view.root.alpha===1&&!s.tweens.isTweening(s.view.root);});
  const before=await snap();assert.deepEqual(before.state,state);
  await p.evaluate(()=>{const scene=window.__harness.game.scene.getScene('shop'),send=scene.send;window.__resourceSend=[];scene.send=function(...a){window.__resourceSend.push(a[0]);return send.apply(this,a);};});
  await tapUI(p,'shop','offer/'+offer.offerId,touch);await p.locator('.detail-dialog[data-shop-context=purchase][open]').waitFor();
  await dom(p.getByRole('button',{name:'比较替换',exact:true}));const dialog=p.locator('.shop-comparison-dialog[open]'),card=dialog.locator('.shop-compare-slot').nth(1),g=shopOfferGuidance(state,offer,sold);
  assert.equal(g.stars,stars);assert.equal(await card.locator('.shop-value-stars').getAttribute('data-stars'),String(stars));assert.equal(await card.locator('.shop-value-stars svg').count(),5);
  assert.deepEqual(await card.locator('.shop-value-stars svg').evaluateAll(nodes=>nodes.map(n=>n.dataset.filled)),Array.from({length:5},(_,i)=>String(i<stars)));
  if(label)assert.ok((await card.locator('.shop-offer-value').innerText()).includes('替换有未估代价'));
  await dom(card.locator('summary'));assert.ok(await card.locator('details').evaluate(e=>e.open));const text=await card.locator('details').innerText();
  assert.ok(text.includes('以保留不买为基线')&&text.includes('非下一手预测'));
  const row={width,height,donor,stars,text,errors:[],before};report.cases.push(row);
  if(label){
   assert.ok(text.includes(label)&&text.includes('是否兑现未知')&&text.includes('未纳入本手分差'));
   row.geometry=await card.locator('details p').evaluate(async e=>{
    const value=e.textContent,start=value.indexOf('未估代价：'),next=value.indexOf('\n',start),end=next<0?value.length:next;assertStart();
    function assertStart(){if(start<0)throw Error('missing unknown-loss explanation');}
    const point=index=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let offset=0;while(walker.nextNode()){const node=walker.currentNode;if(index<=offset+node.length)return[node,index-offset];offset+=node.length;}throw Error('text boundary');};
    const range=document.createRange();range.setStart(...point(start));range.setEnd(...point(end));
    const scroll=e.closest('.dialog-scroll'),candidate=document.querySelector('.shop-compare-candidate'),r=range.getBoundingClientRect(),c=candidate.getBoundingClientRect(),s=scroll.getBoundingClientRect();
    const overlapsX=r.left<c.right&&c.left<r.right,visibleTop=Math.max(s.top,overlapsX?c.bottom:s.top)+8;
    scroll.scrollTop+=r.top-visibleTop;await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done)));
    const actual=range.getBoundingClientRect();return{text:range.toString(),top:actual.top,bottom:actual.bottom,visibleTop,visibleBottom:scroll.getBoundingClientRect().bottom};
   });
   assert.ok(row.geometry.top>=row.geometry.visibleTop-1&&row.geometry.bottom<=row.geometry.visibleBottom,'whole explanation line visible');
   row.screenshot=width+'-'+donor+'-unknown-loss.png';await p.screenshot({path:out+'/'+row.screenshot,scale:'css'});
  }
  await dom(card.locator('summary'));assert.equal(await card.locator('details').evaluate(e=>e.open),false);
  await dom(card.getByRole('button',{name:'管理这张',exact:true}));const held=p.locator('.detail-dialog[data-shop-context=held][open]');await held.waitFor();
  assert.equal(await held.locator('.shop-value-stars').getAttribute('data-stars'),String(stars));
  if(label){const value=held.locator('.shop-offer-value');await value.scrollIntoViewIfNeeded();assert.ok(await value.isVisible());row.selectedScreenshot=width+'-'+donor+'-selected-recommendation.png';await p.screenshot({path:out+'/'+row.selectedScreenshot,scale:'css'});}
  await dom(held.locator('.dialog-close'));if(await dialog.count())await dom(dialog.locator('.dialog-close'));
  row.after=await snap();assert.deepEqual(row.after,before);row.send=await p.evaluate(()=>window.__resourceSend);assert.deepEqual(row.send,[]);assert.deepEqual(errors,[]);row.status='PASS';
 }
 await context.close();
}assert.deepEqual(await hashes(),sourceHashes);report.status='PASS';}
catch(e){report.status='FAIL';report.error=String(e.stack??e);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(out+'/full-state-journal-storage.json.gz',gzipSync(JSON.stringify(report)));for(const c of report.cases){delete c.before;delete c.after;}await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
console.log(report.status,out,report.error??'');
