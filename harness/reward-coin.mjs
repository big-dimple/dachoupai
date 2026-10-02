/** D41: actual input and committed reward; imported checkpoints are explicitly labelled. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {chooseCharacter,buyOffer,tapUI,waitScene,tapMenuAction} from './ui.mjs';
const dir=process.env.COIN_EVIDENCE_DIR||'shots/reward-runtime/after',build=process.env.COIN_BUILD_DIR||'shots/reward-runtime/build',baseline=process.env.COIN_BASELINE==='1',port=5223;
await mkdir(dir,{recursive:true});
const report={scope:'D41 reward presentation only',baseline,browser:null,build:JSON.parse(await readFile(build+'/build-info.json','utf8')),runs:[],limits:['Linux Chromium Canvas; no hardware WebGL or physical OnePlus acceptance.','Local network timings and separately held/failed requests are not mobile-network measurements.','Restore/fast-exit/reduced/failure routes import the unchanged naturally produced pre-clear checkpoint through the real menu.']};
const server=await preview({build:{outDir:build},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'warn'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});report.browser=browser.version();
let checkpoint;
const state=p=>p.evaluate(()=>window.__harness.game.registry.get('runController').state);
async function persisted(p){return p.evaluate(async()=>{
 const c=window.__harness.game.registry.get('runController'),storage=await new Promise((resolve,reject)=>{const q=indexedDB.open('dachoupai-checkpoints');q.onsuccess=()=>{const db=q.result,tx=db.transaction('saves','readonly'),req=tx.objectStore('saves').getAll();tx.oncomplete=()=>{db.close();resolve(req.result);};tx.onerror=()=>reject(tx.error);};q.onerror=()=>reject(q.error);});
 return {state:c.state,journal:c.journal,export:c.exportJSON(),storage};
});}
async function observation(p){return p.evaluate(()=>{
 const g=window.__harness.game,s=g.scene.getScene('intermission'),walk=(list,name)=>{for(const o of list){if(o.name===name)return o;const f=o.list&&walk(o.list,name);if(f)return f;}},coin=walk(s.children.list,'result/reward-coin'),reward=walk(s.children.list,'result/reward'),button=walk(s.children.list,'action/continue-stage'),total=walk(s.children.list,'result/gap'),score=walk(s.children.list,'result/score');
 const bounds=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
 return {scene:g.scene.getScenes(true).map(s=>s.sys.settings.key),renderer:g.renderer.gl?'WebGL':'Canvas',fps:g.loop.actualFps,coin:coin?{frame:coin.frame.name,state:coin.getData('rewardState'),started:coin.getData('rewardStartedAt')??null,ended:coin.getData('rewardEndedAt')??null,clearId:coin.getData('clearId'),bounds:bounds(coin),interactive:!!coin.input?.enabled}:null,reward:reward?{text:reward.text,bounds:bounds(reward)}:null,total:total?bounds(total):null,score:score?bounds(score):null,button:button?{enabled:!!button.input?.enabled,bounds:bounds(button)}:null};
});}
async function importCheckpoint(p,touch){
 const click=l=>touch?l.tap():l.click();await click(p.locator('.run-menu-toggle'));const summary=p.locator('.run-menu-modal summary').filter({hasText:'进度与存档'});await click(summary);
 const chooserPromise=p.waitForEvent('filechooser');await click(p.getByRole('button',{name:'导入本局',exact:true}));const chooser=await chooserPromise;await chooser.setFiles({name:'natural-pre-clear.json',mimeType:'application/json',buffer:Buffer.from(checkpoint)});await waitScene(p,'game');
 await p.waitForFunction(checksum=>JSON.parse(window.__harness.game.registry.get('runController').exportJSON()).checksum===checksum,JSON.parse(checkpoint).checksum);
}
async function play(p,touch){
 await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.length&&s.cardViews.every(c=>!c.dealing&&!c.back?.visible);});
 const s=await state(p);await tapUI(p,'game','card/'+s.handOrder[0],touch);await tapUI(p,'game','action/play',touch);
}
async function run(name,touch,variant='natural'){
 const viewport=touch?{width:412,height:820}:{width:1280,height:800},context=await browser.newContext({viewport,deviceScaleFactor:touch?3:1,hasTouch:touch,...(variant==='os-reduce'?{reducedMotion:'reduce'}:{}),...(variant==='natural'&&!baseline?{recordVideo:{dir:dir+'/video',size:viewport}}:{})}),p=await context.newPage(),r={name,variant,viewport,dpr:touch?3:1,requests:[],checks:[],errors:[]};report.runs.push(r);let phase='boot',held=[],signals=[];
 p.on('pageerror',e=>r.errors.push(String(e)));p.on('dialog',d=>d.accept());p.on('request',req=>{if(req.url().includes('/coin-reward/'))r.requests.push({path:new URL(req.url()).pathname,phase});});
 await p.addInitScript(({reduced})=>{localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:reduced}));window.__coinFetch=[];const fetch=window.fetch;window.fetch=function(input,init){const url=typeof input==='string'?input:input.url;if(url.includes('/coin-reward/')){const record={url,aborted:false};window.__coinFetch.push(record);init?.signal?.addEventListener('abort',()=>record.aborted=true,{once:true});}return fetch.apply(this,arguments);};},{reduced:variant==='app-reduce'});
 if(variant==='loading-exit')await p.route('**/coin-reward/*',async route=>{await new Promise(resolve=>held.push(resolve));await route.continue().catch(()=>{});});
 if(variant==='failure')await p.route('**/coin-reward/*',route=>route.fulfill({status:404,body:''}));
 const shot=async suffix=>p.screenshot({path:`${dir}/${name}-${suffix}.png`});
 try{
  await p.goto(`http://127.0.0.1:${port}/?harness=1&seed=f09-sample-30`);await waitScene(p,'title');assert.equal((await observation(p)).renderer,'Canvas');
  if(variant==='natural'){
   await chooseCharacter(p,'amo',touch);const s=await state(p);await buyOffer(p,s.shop.offers.find(o=>o.definitionId==='f09').offerId,touch);await tapUI(p,'shop','action/start-stage',touch);await waitScene(p,'game');
   await play(p,touch);await p.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing&&window.__harness.game.registry.get('runController').state.stage.heat==='330');
   checkpoint=await p.evaluate(()=>window.__harness.game.registry.get('runController').exportJSON());r.input='Natural seed → amo → buy f09 → first 9♥ = 330 → second actual winning hand';
  }else{assert.ok(checkpoint);await importCheckpoint(p,touch);r.input='Unmodified naturally produced pre-clear checkpoint imported through public file menu';}
  assert.equal(r.requests.length,0,'no coin request until an actual clear');r.checks.push('No boot/selector/shop/stage coin downloads');phase='winning-hand';
  const before=await state(p);await play(p,touch);if(variant==='hand-fastforward'){await tapMenuAction(p,'快进当前手',touch);r.checks.push('Public fast-forward completes committed winning hand once');}await waitScene(p,'intermission');const committed=await persisted(p);assert.equal(committed.state.phase,'stage-cleared');assert.ok(committed.state.stage.goldEarned>0);r.reward={goldBefore:before.gold,goldAfter:committed.state.gold,total:committed.state.stage.goldEarned,clearId:committed.state.stage.clearId};assert.equal(r.reward.goldAfter-r.reward.goldBefore,r.reward.total);
  r.checks.push('Displayed reward originates from exactly one committed total; no reward command in presentation');
  if(baseline){await p.waitForTimeout(1100);r.settled=await observation(p);assert.equal(r.settled.coin,null);await shot('result');}
  else if(variant==='loading-exit'){
   await p.waitForFunction(()=>window.__coinFetch.length===2);r.loading=await observation(p);assert.equal(r.loading.coin,null);assert.equal(r.loading.button.enabled,true);await shot('loading');await tapUI(p,'intermission','action/continue-stage',touch);await waitScene(p,'shop');await p.waitForFunction(()=>window.__coinFetch.every(x=>x.aborted));held.forEach(f=>f());held=[];await p.waitForTimeout(200);signals=await p.evaluate(()=>window.__coinFetch);assert.equal(await p.evaluate(()=>window.__harness.game.textures.exists('reward-coin')),false);r.checks.push('Continue immediately aborts both held transfers; no late texture or scene sprite');
  }else if(variant==='failure'){
   await p.waitForFunction(()=>window.__coinFetch.length===2);await p.waitForTimeout(200);r.settled=await observation(p);assert.equal(r.settled.coin,null);assert.equal(r.settled.button.enabled,true);await shot('result');assert.deepEqual(await persisted(p),committed);await tapUI(p,'intermission','action/continue-stage',touch);await waitScene(p,'shop');r.checks.push('404 keeps reward text and continue usable; state/save unchanged until intentional OpenShop');
  }else{
   const reduced=['app-reduce','os-reduce'].includes(variant);await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('intermission');return s.view.root.list.some(o=>o.name==='result/reward-coin');});r.initial=await observation(p);assert.equal(r.initial.button.enabled,true);assert.ok(r.initial.reward.text.includes('+'+r.reward.total));assert.equal(r.initial.coin.clearId,r.reward.clearId);await shot('playing');
   if(reduced){assert.equal(r.initial.coin.frame,'coin-015');assert.equal(r.initial.coin.started,null);r.checks.push('Reduced motion uses static final frame without playback');}
   else{assert.equal(r.initial.coin.state,'playing');r.checks.push('Controls remain enabled during actual playback');}
   if(variant==='playing-exit'){await tapUI(p,'intermission','action/continue-stage',touch);await waitScene(p,'shop');await p.waitForTimeout(900);r.checks.push('Continue during playback cancels promptly without a repeated reward');}
   else if(variant==='skip'){await tapUI(p,'intermission','action/skip-celebration',touch);r.settled=await observation(p);assert.equal(r.settled.coin.started,null);assert.equal(r.settled.coin.frame,'coin-015');assert.deepEqual(await persisted(p),committed);r.checks.push('Skip settles static frame and cannot replay or mutate save');}
   else{
    await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('intermission');return s.view.root.list.find(o=>o.name==='result/reward-coin')?.getData('rewardState')==='settled';});r.settled=await observation(p);
    if(!reduced)assert.ok(r.settled.coin.ended-r.settled.coin.started>=790&&r.settled.coin.ended-r.settled.coin.started<1100,'800ms one-shot wall-clock duration');
    const layout=o=>{assert.ok(o.coin.bounds.y+o.coin.bounds.height*20/256>=o.total.y+o.total.height+2,'all atlas poses leave text gap');assert.equal(o.coin.interactive,false,'decorative coin has no input hit area');assert.ok(o.total.y>=o.score.y+o.score.height+2,'total does not cover score');assert.ok(o.reward.bounds.y+o.reward.bounds.height<o.button.bounds.y,'reward does not cover continue');};
    layout(r.settled);await shot('settled');assert.deepEqual(await persisted(p),committed,'animation cannot change state/RNG/journal/export/IndexedDB');
    // Actual resize reuses the scene, showing only a static frame from the cached atlas.
    await p.setViewportSize({width:viewport.width,height:viewport.height-100});await p.waitForTimeout(100);r.resized=await observation(p);layout(r.resized);assert.equal(r.resized.coin.frame,'coin-015');assert.equal(r.resized.coin.started,null);assert.equal(r.requests.length,2);await shot('short-viewport');assert.deepEqual(await persisted(p),committed);
    await p.setViewportSize(touch?{width:390,height:540}:{width:1280,height:500});await p.waitForTimeout(100);r.compact=await observation(p);layout(r.compact);await shot('compact');assert.deepEqual(await persisted(p),committed);r.checks.push('Whole atlas motion bounds and compact/browser-bar layouts leave text/control gaps; sprite is noninteractive');await p.setViewportSize(viewport);
    await p.reload();await waitScene(p,'title');const count=r.requests.length;await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'intermission');await p.waitForTimeout(150);r.restored=await observation(p);assert.equal(r.restored.coin,null);assert.equal(r.requests.length,count);assert.deepEqual((await persisted(p)).state,committed.state);assert.equal(r.restored.button.enabled,true);r.checks.push('Resize cache reuse and refreshed saved-result entry never replay/request the atlas or reaward');
    await tapUI(p,'intermission','action/continue-stage',touch);await waitScene(p,'shop');
   }
  }
  if(!baseline&&['playing-exit','loading-exit','failure','natural','app-reduce','os-reduce','hand-fastforward'].includes(variant)){const end=await state(p);assert.equal(end.gold,r.reward.goldAfter);assert.equal(end.commandSeq,committed.state.commandSeq+1);r.checks.push('Intentional OpenShop is the only new command; balance unchanged');}
  assert.deepEqual(r.errors,[]);r.status='PASS';
 }catch(e){r.status='FAIL';r.error=String(e);r.stack=e.stack;process.exitCode=1;await shot('failure').catch(()=>{});}
 finally{held.forEach(f=>f());r.fetchSignals=signals.length?signals:await p.evaluate(()=>window.__coinFetch).catch(()=>[]);const video=p.video();await context.close();if(video){r.video=`${dir}/${name}.webm`;await video.saveAs(r.video);}await writeFile(`${dir}/${name}.json`,JSON.stringify(r,null,2));await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({name,status:r.status,error:r.error,checks:r.checks.length,reward:r.reward,initial:r.initial?.coin,settled:r.settled?.coin}));}
}
try{for(const spec of [['desktop-natural',false],['touch-natural',true],...(!baseline?[['touch-reduced',true,'app-reduce'],['desktop-os-reduced',false,'os-reduce'],['touch-loading-exit',true,'loading-exit'],['desktop-playing-exit',false,'playing-exit'],['touch-skip',true,'skip'],['desktop-failure',false,'failure'],['desktop-hand-fastforward',false,'hand-fastforward']]:[])])await run(...spec);}
finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));report.status=report.runs.every(r=>r.status==='PASS')?'PASS':'FAIL';report.checks=report.runs.reduce((n,r)=>n+r.checks.length,0);await writeFile(dir+'/report.json',JSON.stringify(report,null,2));}
