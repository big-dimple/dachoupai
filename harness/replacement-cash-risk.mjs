import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from './ui.mjs';
const root=process.env.REPLACEMENT_ROOT??process.cwd(),port=Number(process.env.REPLACEMENT_PORT??5496),dir=process.env.REPLACEMENT_OUTPUT??'/tmp/replacement-cash-risk',baseline=process.env.REPLACEMENT_BASELINE==='1';
await mkdir(dir,{recursive:true});const server=await createServer({root,mode:'e2e',cacheDir:`/tmp/replacement-risk-vite-${port}`,server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const {replacementCashRiskFixture,replacementCashRiskVectors}=await server.ssrLoadModule('/harness/fixtures/replacement-cash-risk.ts'),{shopOfferGuidance}=await server.ssrLoadModule('/src/game/ShopOfferGuidance.ts'),{makeCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim(),report={head:git(['rev-parse','HEAD']),sourceTree:git(['rev-parse','HEAD:src']),sourceChanges:git(['status','--short','--','src']),baseline,fixtureSha256:createHash('sha256').update(await readFile(root+'/harness/fixtures/replacement-cash-risk.ts')).digest('hex'),harnessSha256:createHash('sha256').update(await readFile(new URL(import.meta.url))).digest('hex'),scope:'CONTROLLED valid full shop. Native checkpoint import, compare specified donors, cancel. Not a purchase, natural play, probability or device acceptance.',cases:[]};
report.controlledVectors=replacementCashRiskVectors();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const snapshot=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read(),localStorage:{...localStorage}};});
const frame=p=>p.evaluate(()=>new Promise(r=>window.__harness.game.events.once('poststep',r)));
try{
 for(const spec of [{width:1366,height:768,touch:false},{width:390,height:844,touch:true},{width:320,height:640,touch:true}]){
  const p=await browser.newPage({viewport:{width:spec.width,height:spec.height},hasTouch:spec.touch});p.on('dialog',d=>d.accept());const row={...spec,errors:[],screenshots:[],offers:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));
  await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');const s=replacementCashRiskFixture(),o=s.shop.offers[0];
  await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'controlled-replacement.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});
  await waitScene(p,'shop');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return s.ready&&s.view.root.alpha===1&&!s.tweens.isTweening(s.view.root)&&s.offerArts.every(a=>a.alpha===1&&!s.tweens.isTweening(a))&&s.run.jokers.every(j=>s.textures.exists('p08-joker-'+j.definitionId))&&s.run.shop.offers.every(o=>s.textures.exists('p08-joker-'+o.definitionId));});await frame(p);row.before=await snapshot(p);assert.deepEqual(row.before.state,s);
  await p.evaluate(()=>{const scene=window.__harness.game.scene.getScene('shop'),send=scene.send;window.__replacementSendCalls=[];scene.send=function(...args){window.__replacementSendCalls.push(args[0]);return send.apply(this,args);};});
  await tapUI(p,'shop','offer/'+o.offerId,spec.touch);await p.getByRole('button',{name:'管理这张',exact:true}).first().waitFor();
  for(const [index,name,expected] of [[2,'cash-loss',baseline?4:2],[4,'cash-preserved',4]]){
   const g=shopOfferGuidance(s,o,s.jokers[index]),card=p.locator('.experience-card').nth(index);assert.equal(g.stars,expected);row.offers.push({index,guidance:g,text:await card.innerText()});
   const label=g.label,body=card.locator('div').first();await body.evaluate((e,label)=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())if(node.textContent.includes(label)){const r=document.createRange();r.setStart(node,node.textContent.indexOf(label));r.setEnd(node,node.textContent.indexOf(label)+label.length);const scroll=e.closest('.dialog-scroll'),b=r.getBoundingClientRect(),pane=scroll.getBoundingClientRect();scroll.scrollTop+=b.top-pane.top-pane.height*.5;break;}},label);
   row.offers.at(-1).geometry=await body.evaluate((e,label)=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())if(node.textContent.includes(label)){const r=document.createRange();r.setStart(node,node.textContent.indexOf(label));r.setEnd(node,node.textContent.indexOf(label)+label.length);const b=r.getBoundingClientRect(),pane=e.closest('.dialog-scroll').getBoundingClientRect();return {line:{x:b.x,y:b.y,right:b.right,bottom:b.bottom},pane:{x:pane.x,y:pane.y,right:pane.right,bottom:pane.bottom}};}},label);
   const b=row.offers.at(-1).geometry;assert.ok(b,'recommendation text exists');assert.ok(b.line.x>=b.pane.x&&b.line.right<=b.pane.right&&b.line.y>=b.pane.y&&b.line.bottom<=b.pane.bottom,'five complete stars in visible comparison');
   if(!baseline&&index===2)assert.ok((await card.innerText()).includes('推荐指数 ★★☆☆☆'));const file=`${spec.width}-${name}-compare.png`;await frame(p);await p.screenshot({path:dir+'/'+file,scale:'css'});row.screenshots.push(file);
  }
  await p.locator('.detail-dialog[open]').getByRole('button',{name:'关闭',exact:true}).click();await frame(p);row.after=await snapshot(p);assert.deepEqual(row.after,row.before);row.sendCalls=await p.evaluate(()=>window.__replacementSendCalls);assert.deepEqual(row.sendCalls,[]);assert.deepEqual(row.errors,[]);row.status='PASS';console.log(JSON.stringify({width:spec.width,status:row.status}));await p.close();
 }report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);throw error;}
finally{await writeFile(dir+'/full-state-journal-storage.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report);for(const c of brief.cases){if(c.before)c.before={identity:{contentVersion:c.before.state.contentVersion,contentHash:c.before.state.contentHash},commandSeq:c.before.state.commandSeq};if(c.after)c.after='Equal to before; full data in gzip';}await writeFile(dir+'/report.json',JSON.stringify(brief,null,2));await browser.close();await server.close();}
