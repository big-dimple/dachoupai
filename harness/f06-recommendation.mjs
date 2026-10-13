import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from './ui.mjs';
const root=process.env.F06_ROOT??process.cwd(),port=Number(process.env.F06_PORT??5492),dir=process.env.F06_OUTPUT??'/tmp/f06-recommendation',baseline=process.env.F06_BASELINE==='1';
await mkdir(dir,{recursive:true});
const server=await createServer({root,mode:'e2e',cacheDir:`/tmp/f06-vite-${port}`,server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const {f06RecommendationFixture}=await server.ssrLoadModule('/harness/fixtures/f06-recommendation.ts'),{shopOfferGuidance}=await server.ssrLoadModule('/src/game/ShopOfferGuidance.ts'),{makeCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const report={head:git(['rev-parse','HEAD']),sourceTree:git(['rev-parse','HEAD:src']),sourceChanges:git(['status','--short','--','src']),fixtureSha256:createHash('sha256').update(await readFile(root+'/harness/fixtures/f06-recommendation.ts')).digest('hex'),harnessSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),baseline,scope:'CONTROLLED chapter-six invariant-valid projection. Native checkpoint import then read-only shelf/detail/cancel on PC1366 and software mobile390/320. Not natural progress, physical-device or balance acceptance.',cases:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const snapshot=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read(),localStorage:{...localStorage}};});
const frame=p=>p.evaluate(()=>new Promise(r=>window.__harness.game.events.once('poststep',r)));
try{
 for(const spec of [{width:1366,height:768,touch:false},{width:390,height:844,touch:true},{width:320,height:640,touch:true}]){
  const p=await browser.newPage({viewport:{width:spec.width,height:spec.height},hasTouch:spec.touch});p.on('dialog',d=>d.accept());const row={...spec,errors:[],screenshots:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');const s=f06RecommendationFixture(),o=s.shop.offers[0];
  await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'controlled-f06.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});
  await waitScene(p,'shop');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.ready&&s.view.root.alpha===1&&!s.tweens.isTweening(s.view.root)&&s.offerArts.every(a=>a.alpha===1&&!s.tweens.isTweening(a))&&s.run.shop.offers.every(o=>s.textures.exists('p08-joker-'+o.definitionId));});await frame(p);
  row.before=await snapshot(p);assert.deepEqual(row.before.state,s);row.guidance=shopOfferGuidance(s,o);assert.equal(row.guidance.stars,baseline?3:2);assert.equal(row.guidance.reason,baseline?'短期爆发相乘':'限4次');
  await p.evaluate(()=>{const scene=window.__harness.game.scene.getScene('shop'),send=scene.send;window.__f06SendCalls=[];scene.send=function(...args){window.__f06SendCalls.push(args[0]);return send.apply(this,args);};});
  row.shelf=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),rows={stars:[],phrases:[]};const walk=list=>{for(const o of list){if(o.name==='shop/offer-advice')rows.stars.push({stars:o.getData('stars'),area:o.getData('bounds'),children:o.list.map(c=>({text:c.text,bounds:c.getBounds(),fontSize:c.style.fontSize}))});if(o.name==='shop/offer-operation')rows.phrases.push({text:o.text,bounds:o.getBounds()});if(o.list)walk(o.list);}};walk(s.children.list);return rows;});
  assert.equal(row.shelf.stars.length,1);const sr=row.shelf.stars[0];assert.equal(sr.children.length,5);assert.equal(sr.children.map(c=>c.text).join(''),baseline?'★★★☆☆':'★★☆☆☆');
  for(const c of sr.children){assert.equal(c.fontSize,'14px');assert.ok(c.bounds.x>=sr.area.x-1&&c.bounds.x+c.bounds.width<=sr.area.x+sr.area.width+1);}
  for(const phrase of row.shelf.phrases){assert.ok(phrase.bounds.x>=0&&phrase.bounds.x+phrase.bounds.width<=spec.width);if(!baseline)assert.equal(phrase.text,'限4次');}
  const shot=async suffix=>{const name=`${spec.width}-${suffix}.png`;await frame(p);await p.screenshot({path:dir+'/'+name,scale:'css'});row.screenshots.push(name);};await shot('shelf');
  await tapUI(p,'shop','offer/'+o.offerId,spec.touch);await p.locator('.detail-dialog[open]').waitFor();row.detail=await p.locator('.detail-dialog[open]').innerText();row.summary=await p.locator('.dialog-purchase-summary').innerText();assert.ok(row.summary.includes(baseline?'推荐指数 ★★★☆☆':'推荐指数 ★★☆☆☆'));assert.ok(row.summary.includes(baseline?'短期爆发相乘':'限4次'));assert.ok(row.summary.includes('第4次出牌后销毁'));await shot('purchase-first-screen');
  row.summaryGeometry=await p.locator('.dialog-purchase-summary').evaluate(e=>{const scroll=e.closest('.dialog-scroll'),pane=scroll.getBoundingClientRect();const text=e.firstChild;const end=text.textContent.indexOf('\n',text.textContent.indexOf('\n')+1),range=document.createRange();range.setStart(text,0);range.setEnd(text,end);const r=range.getBoundingClientRect();return {text:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},pane:{x:pane.x,y:pane.y,right:pane.right,bottom:pane.bottom}};});
  const g=row.summaryGeometry;assert.ok(g.text.x>=g.pane.x&&g.text.right<=g.pane.right,'complete stars and phrase horizontally');
  if(g.text.y<g.pane.y||g.text.bottom>g.pane.bottom){await p.locator('.dialog-purchase-summary').evaluate(e=>{const scroll=e.closest('.dialog-scroll');scroll.scrollTop+=e.getBoundingClientRect().top-scroll.getBoundingClientRect().top;});await shot('purchase-summary-scroll');}
  await p.getByRole('button',{name:'取消',exact:true}).click();await frame(p);row.after=await snapshot(p);assert.deepEqual(row.after,row.before);row.sendCalls=await p.evaluate(()=>window.__f06SendCalls);assert.deepEqual(row.sendCalls,[]);assert.deepEqual(row.errors,[]);row.status='PASS';console.log(JSON.stringify({width:spec.width,stars:row.guidance.stars,status:row.status}));await p.close();
 }report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);throw error;}
finally{await writeFile(dir+'/full-state-journal-storage.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report);for(const r of brief.cases){if(r.before)r.before={identity:{contentVersion:r.before.state.contentVersion,contentHash:r.before.state.contentHash},commandSeq:r.before.state.commandSeq};if(r.after)r.after='Equal to before; full data in gzip';}await writeFile(dir+'/report.json',JSON.stringify(brief,null,2));await browser.close();await server.close();}
