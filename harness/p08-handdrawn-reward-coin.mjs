/** Bounded single-image coin check. Public-input fixtures; no video, FPS or hardware claims. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build,createServer,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene,tapMenuAction} from './ui.mjs';
const dir='shots/p08-handdrawn-coin',base='/coin-review/',port=5321,key='reward-coin-handdrawn-v1';
await mkdir(dir,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});let checkpoint,pre,expected;
try{
 const run=await ssr.ssrLoadModule('/src/domain/run.ts'),resource=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),cp=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 const send=(s,action)=>{const r=run.applyCommand(s,{runId:s.runId,commandId:'coin-fixture/'+s.commandSeq,expectedSeq:s.commandSeq,action});assert.ok(r.ok);return r.state;};
 pre=run.createRun({rulesVersion:'r2',seed:'coin-source',runId:'fixture/handdrawn-coin',characterId:'amo'});pre.jokers=[resource.r2CreateJoker('e07','coin/e07',0)];pre=send(send(pre,{type:'LeaveShop'}),{type:'EnterStage'});
 // Explicit legal last-hand boundary fixture, not a naturally acquired Joker or played history.
 pre.stage.handsLeft=1;pre.stage.playIndex=3;pre.stage.previousHandType='high-card';pre.stage.maxPlayedCount=1;pre.stage.heat='399';
 const fixtureCheckpoint=cp.makeCheckpoint(pre,[]);assert.ok(cp.readCheckpoint(fixtureCheckpoint).ok);checkpoint=JSON.stringify(fixtureCheckpoint);
 expected=send(pre,{type:'PlayHand',selectedIds:[pre.handOrder[0]]});assert.equal(expected.phase,'stage-cleared');assert.equal(expected.lastTrace.events.filter(e=>e.sourceDefinitionId==='e07'&&e.operation==='add-gold').length,1);
}finally{await ssr.close();}
const fingerprint=createHash('sha256');for(const p of execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src'],{encoding:'utf8'}).trim().split('\n').sort()){fingerprint.update(p+'\0');fingerprint.update(await readFile(p));fingerprint.update('\0');}
await build({mode:'e2e',base,build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({base,build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={taskId:'P08',testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFingerprint:fingerprint.digest('hex'),build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),renderer:'Chromium software Canvas',DPR:1,safeInset:{top:0,bottom:0},sourceDeliveryCommit:'f44320be03cf650bbf122d2764d669d00eeae1ff',fixture:'Validator-approved explicit pre-clear e07 fixture imported through public menu; actual native PlayHand commits reward. Not natural acquisition, main deployment or hardware acceptance.',checkpointSHA256:createHash('sha256').update(checkpoint).digest('hex'),runs:[],images:[],targetDevice:'NOT_RUN',GPU:'NOT_RUN',audio:'NOT_RUN',independentAesthetic:'PENDING'};
const saved=p=>p.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,export:c.exportJSON()};});
const observe=p=>p.evaluate(()=>{const g=window.__harness.game,s=g.scene.getScene('intermission'),all=s.children.list.flatMap(function walk(o){return[o,...(o.list?o.list.flatMap(walk):[])];}),find=name=>all.find(o=>o.name===name),bounds=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};},coin=find('result/reward-coin'),reward=find('result/reward'),total=find('result/gap'),button=find('action/continue-stage');
 let visible=null;if(coin){const m=coin.getWorldTransformMatrix(),xs=[],ys=[];for(const x of [37,219])for(const y of [38,218]){const q=m.transformPoint(x-coin.displayOriginX,y-coin.displayOriginY);xs.push(q.x);ys.push(q.y);}visible={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};}
 return{renderer:g.renderer.type,coin:coin?{key:coin.texture.key,frame:coin.frame.name,state:coin.getData('rewardState'),started:coin.getData('rewardStartedAt')??null,ended:coin.getData('rewardEndedAt')??null,clearId:coin.getData('clearId'),x:coin.x,y:coin.y,scaleX:coin.scaleX,scaleY:coin.scaleY,rotation:coin.rotation,bounds:bounds(coin),visible,interactive:!!coin.input?.enabled}:null,reward:reward?{text:reward.text,bounds:bounds(reward)}:null,total:total?bounds(total):null,button:button?{enabled:!!button.input?.enabled,bounds:bounds(button)}:null,requests:window.__coinFetch};});
const intersect=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
function clearBounds(o){assert.equal(o.renderer,1);assert.equal(o.coin.interactive,false);assert.equal(o.coin.key,key);assert.equal(o.coin.frame,'__BASE');for(const b of [o.total,o.reward.bounds,o.button.bounds])assert.ok(!intersect(o.coin.visible,b),'actual nonzero-alpha footprint avoids text/buttons');assert.ok(o.button.enabled);}
async function shot(p,name,observation){await p.screenshot({path:dir+'/'+name});report.images.push({path:name,viewport:p.viewportSize(),DPR:1,safeInset:{top:0,bottom:0},observation});}
try{
 for(const variant of ['normal','reduced','failure','loading-exit','skip']){
  const context=await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:1,hasTouch:true,reducedMotion:variant==='reduced'?'reduce':'no-preference'}),p=await context.newPage(),r={variant,checks:[],errors:[]};report.runs.push(r);let release;
  p.on('pageerror',e=>r.errors.push(String(e)));p.on('dialog',d=>d.accept());
  await p.addInitScript(reduced=>{localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:reduced}));window.__coinFetch=[];const original=window.fetch;window.fetch=function(input,init){const url=typeof input==='string'?input:input.url;if(url.includes('/coin-reward/')){const row={path:new URL(url,location.href).pathname,aborted:false};window.__coinFetch.push(row);init?.signal?.addEventListener('abort',()=>row.aborted=true,{once:true});}return original.apply(this,arguments);};},variant==='reduced');
  if(variant==='failure')await p.route('**/coin-reward/coin-reward-handdrawn.webp',route=>route.fulfill({status:404,body:''}));
  if(variant==='loading-exit')await p.route('**/coin-reward/coin-reward-handdrawn.webp',async route=>{await new Promise(r=>release=r);await route.continue().catch(()=>{});});
  try{
   await p.goto('http://127.0.0.1:'+port+base+'?harness=1');await waitScene(p,'title');await p.locator('.run-menu-toggle').tap();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').tap();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'explicit-pre-clear.json',mimeType:'application/json',buffer:Buffer.from(checkpoint)});await waitScene(p,'game');
   await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.length&&s.cardViews.every(c=>!c.dealing&&!c.back?.visible);});assert.equal((await p.evaluate(()=>window.__coinFetch)).length,0);
   await tapUI(p,'game','card/'+pre.handOrder[0],true);await tapUI(p,'game','action/play',true);await waitScene(p,'intermission');const committed=await saved(p);
   assert.equal(committed.state.phase,'stage-cleared');assert.equal(committed.state.gold-pre.gold,committed.state.stage.goldEarned);assert.equal(committed.state.stage.goldEarned,expected.stage.goldEarned);assert.equal(committed.state.lastTrace.events.filter(e=>e.sourceDefinitionId==='e07'&&e.operation==='add-gold').length,1);r.reward={clearId:committed.state.stage.clearId,total:committed.state.stage.goldEarned,goldBefore:pre.gold,goldAfter:committed.state.gold};
   if(variant==='loading-exit'){
    await p.waitForFunction(()=>window.__coinFetch.length===1);r.loading=await observe(p);assert.equal(r.loading.coin,null);assert.ok(r.loading.button.enabled);await tapUI(p,'intermission','action/continue-stage',true);await waitScene(p,'shop');await p.waitForFunction(()=>window.__coinFetch[0].aborted);release();release=undefined;await p.waitForTimeout(100);assert.equal(await p.evaluate(key=>window.__harness.game.textures.exists(key),key),false);r.checks.push('one held fetch aborted on native Continue; late response cannot cache');
   }else if(variant==='failure'){
    await p.waitForFunction(()=>window.__coinFetch.length===1);await p.waitForTimeout(100);r.failed=await observe(p);assert.equal(r.failed.coin,null);assert.ok(r.failed.reward.text.includes('+'+r.reward.total));assert.ok(r.failed.button.enabled);assert.deepEqual(await saved(p),committed);r.checks.push('404 keeps only real reward text and Continue; save/RNG/journal unchanged');
   }else{
    await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').view.root.list.some(o=>o.name==='result/reward-coin'));r.initial=await observe(p);clearBounds(r.initial);assert.ok(r.initial.reward.text.includes('+'+r.reward.total));assert.equal(r.initial.coin.clearId,r.reward.clearId);assert.equal(r.initial.requests.length,1);assert.ok(r.initial.requests[0].path.endsWith('/coin-review/assets/effects/coin-reward/coin-reward-handdrawn.webp'));
    if(variant==='reduced'){assert.equal(r.initial.coin.started,null);assert.equal(r.initial.coin.rotation,0);assert.equal(r.initial.coin.state,'settled');}
    if(variant==='skip'){await tapUI(p,'intermission','action/skip-celebration',true);r.settled=await observe(p);assert.equal(r.settled.coin.started,null);assert.equal(r.settled.coin.state,'settled');}
    else{await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').view.root.list.find(o=>o.name==='result/reward-coin')?.getData('rewardState')==='settled');r.settled=await observe(p);clearBounds(r.settled);if(variant==='normal'){assert.ok(r.settled.coin.ended-r.settled.coin.started>=790&&r.settled.coin.ended-r.settled.coin.started<1100);await shot(p,'390-settled.png',r.settled);r.sizes=[];for(const viewport of [{width:390,height:580},{width:390,height:540},{width:1280,height:720}]){await p.setViewportSize(viewport);await p.waitForTimeout(100);const o=await observe(p);clearBounds(o);assert.equal(o.coin.started,null);assert.equal(o.requests.length,1);assert.equal(o.coin.rotation,0);r.sizes.push({viewport,observation:o});if(viewport.width===1280)await shot(p,'1280-settled.png',o);}assert.deepEqual([r.settled,...r.sizes.map(x=>x.observation)].map(x=>Math.round(x.coin.bounds.width)),[96,72,56,96]);}}
    assert.deepEqual(await saved(p),committed);r.checks.push('single image; no atlas; one800ms wall-clock settle/static reduced; same receipt and full saved state');
    if(variant==='normal'){await p.reload();await waitScene(p,'title');assert.equal((await p.evaluate(()=>window.__coinFetch)).length,0);await tapUI(p,'title','action/title-continue',true);await waitScene(p,'intermission');await p.waitForTimeout(100);r.restored=await observe(p);assert.equal(r.restored.coin,null);assert.equal(r.restored.requests.length,0);assert.deepEqual((await saved(p)).state,committed.state);r.checks.push('refresh of committed result does not request, replay or reaward');}
   }
   assert.deepEqual(r.errors,[]);r.status='PASS';
  }catch(e){r.status='FAIL';r.error=String(e);console.error(variant,e);process.exitCode=1;}
  finally{release?.();await context.close();await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');}
  if(r.status==='FAIL')break;
 }
 report.status=report.runs.every(r=>r.status==='PASS')?'PASS':'FAIL';
}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,runs:report.runs.map(r=>({variant:r.variant,status:r.status,error:r.error,checks:r.checks}))}));}
