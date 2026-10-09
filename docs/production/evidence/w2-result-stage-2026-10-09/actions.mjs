import assert from 'node:assert/strict';
import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
import {chromium} from '/workspace/dachoupai/node_modules/playwright/index.mjs';
import {waitScene,point,tapUI} from '/workspace/dachoupai/harness/ui.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root='/workspace/dachoupai',out='/tmp/intermission-stage-actions';await mkdir(out,{recursive:true});
const v=await createServer({root,mode:'e2e',server:{host:'127.0.0.1',port:5503,strictPort:true},logLevel:'error'});await v.listen();
const {readCheckpoint}=await v.ssrLoadModule('/src/application/checkpoint.ts'),{applyCommand,createRun}=await v.ssrLoadModule('/src/domain/run.ts');
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'Finite native actions on the same three pre-existing saved results. No new PlayHand or journey. Software browser only; heard:false.',cases:[],errors:[]};let p;
const saved=()=>p.evaluate(()=>JSON.parse(window.__harness.game.registry.get('runController').exportJSON()));
async function load(name,w,motion='no-preference',missing=false){
 p=await b.newPage({viewport:{width:w,height:740},hasTouch:w<700,reducedMotion:motion});p.setDefaultTimeout(15000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>report.errors.push(String(e)));
 if(missing)await p.route('**/c06.thumbnail.webp',r=>r.abort());
 await p.goto('http://127.0.0.1:5503/?harness=1');await waitScene(p,'title');
 const cp=JSON.parse(await readFile('/tmp/intermission-stage-after/'+name+'-checkpoint.json'));assert.ok(readCheckpoint(cp).ok);
 await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:name+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});
 await waitScene(p,'intermission');await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').ready);assert.deepEqual((await saved()).state,cp.state);return cp;
}
async function persisted(){
 const cp=await saved();assert.ok(readCheckpoint(cp).ok);
 const slot=await p.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('dachoupai-checkpoints',1);req.onsuccess=()=>{const db=req.result,tx=db.transaction('saves','readonly'),store=tx.objectStore('saves'),m=store.get('meta');m.onsuccess=()=>{const q=store.get(m.result.slotKey);q.onsuccess=()=>{resolve(q.result.current);db.close();};};tx.onerror=()=>reject(tx.error);};req.onerror=()=>reject(req.error);}));assert.deepEqual(slot,cp);return cp;
}
try{
 // Default visual is skipped natively, then repeated continue saves exactly one canonical OpenShop.
 const cp=await load('ordinary',1366),primary=await point(p,'intermission','action/continue-stage');assert.equal(primary.enabled,true);
 const active=await p.evaluate(()=>!!window.__harness.game.scene.getScene('intermission').celebrationTimer);assert.equal(active,true);
 await tapUI(p,'intermission','action/skip-celebration');assert.deepEqual((await saved()).state,cp.state);
 const c=await point(p,'intermission','action/continue-stage');await p.mouse.click(c.x,c.y,{clickCount:2,delay:5});await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='idle');
 const next=await persisted(),commands=next.journal.slice(cp.journal.length);assert.equal(commands.length,1);assert.equal(commands[0].action.type,'OpenShop');const canonical=applyCommand(cp.state,commands[0]);assert.equal(canonical.ok,true);assert.deepEqual(next.state,canonical.state);
 await p.evaluate(()=>new Promise(r=>setTimeout(r,1100)));assert.deepEqual((await saved()).state,next.state);await p.reload();await waitScene(p,'title');assert.deepEqual((await saved()).state,next.state);await p.screenshot({path:out+'/ordinary-continued-reload.png'});
 report.cases.push({name:'ordinary',animationActive:true,primaryEnabledDuringAnimation:true,skipStateUnchanged:true,duplicateContinueCommands:commands,fullCanonicalEqual:true,indexedDbEqual:true,reloadEqual:true,lateCallbackStateUnchanged:true});await p.close();
 // Reduced motion and one missing existing thumbnail fall back to readable actual source facts.
 const high=await load('high-growth',390,'reduce',true);assert.equal(await p.evaluate(()=>!!window.__harness.game.scene.getScene('intermission').celebrationTimer),false);
 const fallback=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('intermission'),walk=xs=>xs.flatMap(o=>[o,...(o.list?walk(o.list):[])]),list=walk(s.children.list);return {art:list.filter(o=>o.name==='result-art/source').length,source:list.find(o=>o.name==='result/source-continuity')?.text,score:list.find(o=>o.name==='result/score')?.text};});assert.equal(fallback.art,0);assert.equal(fallback.source,'越染越深');assert.ok(fallback.score.includes('3,802'));
 await p.setViewportSize({width:320,height:740});await p.waitForFunction(()=>window.__harness.game.scale.width===320);assert.deepEqual((await saved()).state,high.state);await p.screenshot({path:out+'/high-growth-missing-art-320.png'});
 report.cases.push({name:'high-growth',reducedMotionNoCelebration:true,missingThumbnailFallback:fallback,resizeStateUnchanged:true,indexedDbEqual:!!await persisted()});await p.close();
 // Existing explicit controlled loss only: same seed/character/profile retry is one saved new run.
 const loss=await load('failure',320),r=await point(p,'intermission','action/retry-seed');assert.equal(r.enabled,true);await p.mouse.click(r.x,r.y,{clickCount:2,delay:5});await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='idle');
 const retry=await persisted(),old=loss.state,expected=createRun({seed:old.seed,characterId:old.characterId,runId:`run/${old.seed}/${old.characterId}`,rulesVersion:'r2',r2Identity:{contentVersion:old.contentVersion,contentHash:old.contentHash},...(old.openingRoute===undefined?{}:{openingRoute:old.openingRoute}),modeConfig:{mode:old.mode,difficulty:old.difficulty,challengeId:old.challengeId,programsEnabled:old.programsEnabled}});
 assert.deepEqual(retry.state,expected);assert.deepEqual(retry.journal,[]);await p.screenshot({path:out+'/failure-retry-320.png'});report.cases.push({name:'failure',source:'pre-existing explicitly controlled loss; not natural',sameSeedCharacterIdentity:true,duplicateRetrySingleCanonicalRun:true,fullCanonicalEqual:true,indexedDbEqual:true,retryState:retry.state});await p.close();
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);report.stack=e.stack;await p?.screenshot({path:out+'/FAIL.png'}).catch(()=>{});process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,head:report.head,cases:report.cases.length,error:report.error}));await b.close();await v.close();}
