import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from './ui.mjs';
const root=process.env.RECOMMENDATION_ROOT??process.cwd(),port=Number(process.env.RECOMMENDATION_PORT??5486),dir=process.env.RECOMMENDATION_OUTPUT??'/tmp/recommendation-evidence';
await mkdir(dir,{recursive:true});
const server=await createServer({root,mode:'e2e',cacheDir:`/tmp/recommendation-evidence-vite-${port}`,server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const {recommendationFiveStarFixture}=await server.ssrLoadModule('/harness/fixtures/recommendation-evidence.ts'),{shopOfferGuidance}=await server.ssrLoadModule('/src/game/ShopOfferGuidance.ts'),{makeCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const report={head:git(['rev-parse','HEAD']),sourceTree:git(['rev-parse','HEAD:src']),sourceChanges:git(['status','--short','--','src']),fixtureSha256:createHash('sha256').update(await readFile(root+'/harness/fixtures/recommendation-evidence.ts')).digest('hex'),harnessSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),scope:'OPTION A: CONTROLLED 20-card five-star fixture, retained original a06/b06/a11 rules. Mobile native read-only compare/detail/cancel. Not natural play, physical phone or cross-route five-star calibration.',cases:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const snapshot=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read(),localStorage:{...localStorage}};});
const frame=p=>p.evaluate(()=>new Promise(r=>window.__harness.game.events.once('poststep',r)));
async function importRun(p,s){await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'controlled-cash.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});await waitScene(p,'shop');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.ready&&s.view.root.alpha===1&&!s.tweens.isTweening(s.view.root)&&s.offerArts.every(a=>a.alpha===1&&!s.tweens.isTweening(a))&&s.run.jokers.every(j=>s.textures.exists('p08-joker-'+j.definitionId))&&s.run.shop.offers.every(o=>s.textures.exists('p08-joker-'+o.definitionId));});await frame(p);}
async function stars(p){return p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),rows=[];const walk=list=>{for(const o of list){if(o.name==='shop/offer-advice'){const area=o.getData('bounds');rows.push({offerId:o.getData('offerId'),stars:o.getData('stars'),area,children:o.list.map(c=>({text:c.text,bounds:c.getBounds(),fontSize:c.style.fontSize}))});}if(o.list)walk(o.list);}};walk(s.children.list);return rows;});}
try{
 for(const spec of [{width:390,height:844,touch:true},{width:320,height:640,touch:true}]){
  const p=await browser.newPage({viewport:{width:spec.width,height:spec.height},hasTouch:true});p.on('dialog',d=>d.accept());
  const row={...spec,errors:[],screenshots:[],offers:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');
  const s=recommendationFiveStarFixture();await importRun(p,s);row.before=await snapshot(p);assert.deepEqual(row.before.state,s);
  await p.evaluate(()=>{const scene=window.__harness.game.scene.getScene('shop'),send=scene.send;window.__recommendationSendCalls=[];scene.send=function(...args){window.__recommendationSendCalls.push(args[0]);return send.apply(this,args);};});
  const shot=async suffix=>{const name=`${spec.width}-${suffix}.png`;await frame(p);await p.screenshot({path:dir+'/'+name,scale:'css'});row.screenshots.push(name);};
  row.geometry=await stars(p);assert.equal(row.geometry.length,3);
  for(const r of row.geometry){assert.equal(r.stars,5);assert.equal(r.children.length,5);for(const c of r.children){assert.equal(c.text,'★');assert.equal(c.fontSize,'14px');assert.ok(c.bounds.x>=r.area.x-1&&c.bounds.x+c.bounds.width<=r.area.x+r.area.width+1);}}
  await shot('five-star-shelf');
  for(const o of s.shop.offers){
   const entry={id:o.definitionId,guidance:shopOfferGuidance(s,o),bySlot:s.jokers.map(j=>shopOfferGuidance(s,o,j))};row.offers.push(entry);assert.equal(entry.guidance.stars,5);
   await tapUI(p,'shop','offer/'+o.offerId,true);await p.getByRole('button',{name:'管理这张',exact:true}).first().waitFor();
   entry.compare=await p.locator('.detail-dialog[open]').innerText();assert.ok(entry.compare.includes('推荐指数 ★★★★★'));
   if(o.definitionId==='a06'){assert.equal(entry.bySlot[1].stars,4);assert.equal(entry.bySlot[3].stars,5);await p.locator('.experience-card').nth(1).scrollIntoViewIfNeeded();assert.ok(entry.compare.includes('推荐指数 ★★★★☆'));}
   await shot(o.definitionId+'-compare');
   if(o.definitionId==='b06'){await p.locator('.experience-card').nth(2).scrollIntoViewIfNeeded();assert.ok(entry.compare.includes('失去：系数×1.6'));await shot('growth-cost');}
   await p.getByRole('button',{name:'返回购买详情',exact:true}).click();entry.detail=await p.locator('.detail-dialog[open]').innerText();assert.ok(entry.detail.includes('推荐指数 ★★★★★'));assert.ok(entry.detail.includes('组合潜力：'));assert.ok(entry.detail.includes('组合记录：上手'));assert.ok(entry.detail.includes('新牌未参与'));
   await p.locator('.dialog-purchase-summary').scrollIntoViewIfNeeded();await shot(o.definitionId+'-detail');
   await p.getByRole('button',{name:'取消',exact:true}).click();await frame(p);assert.deepEqual(await snapshot(p),row.before);
  }
  row.after=await snapshot(p);row.sendCalls=await p.evaluate(()=>window.__recommendationSendCalls);assert.deepEqual(row.sendCalls,[]);assert.deepEqual(row.errors,[]);row.status='PASS';console.log(JSON.stringify({width:spec.width,offers:row.offers.map(o=>({id:o.id,stars:o.guidance.stars})),status:row.status}));await p.close();
 }report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);throw error;}
finally{await writeFile(dir+'/full-state-journal-storage.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report);for(const row of brief.cases){if(row.before)row.before={identity:{contentVersion:row.before.state.contentVersion,contentHash:row.before.state.contentHash},commandSeq:row.before.state.commandSeq};if(row.after)row.after='Equal to before; full data in gzip';}await writeFile(dir+'/report.json',JSON.stringify(brief,null,2));await browser.close();await server.close();}
