import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,point,waitScene,openSelector} from './ui.mjs';
const out=process.env.P1B_MAIN_OUT??'shots/p1b-main-integration';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5571,strictPort:true},logLevel:'error'});await server.listen();
const {heroStageFixture,heroSend}=await server.ssrLoadModule('/harness/fixtures/hero-stage-continuity.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {CHARACTER_IDS}=await server.ssrLoadModule('/src/domain/characters.ts');
const {heroExplanationCopy}=await server.ssrLoadModule('/src/game/HeroExplanation.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceTree:execFileSync('git',['rev-parse','HEAD:src'],{encoding:'utf8'}).trim(),browser:browser.version(),scope:'PC1366/390 software Chromium actual pointer/touch operations. Six heroes; controlled valid public-hand/cash saves, not natural acquisition or complete games. Only integrated result portraits and nested finale explanation, not table/skill claims. No human/device/audio/full experience acceptance.',rows:[],errors:[]};
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return c?{state:c.state,journal:c.journal,storage:await c.store.read(),localStorage:JSON.stringify(localStorage)}:null;});
const draft=p=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {selected:[...s.selectedIds],assist:[...s.assistIds],erxiang:s.erxiangTargetId,xiemu:s.xiemuBurn,azao:s.azaoRelease};});
const local=p=>p.evaluate(()=>JSON.stringify(localStorage));
async function imp(p,s,key){const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok);await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const event=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await event).setFiles({name:'hero-explanation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(p,key);await p.waitForFunction(k=>window.__harness.game.scene.getScene(k).ready,key);}
const shot=(p,name)=>p.screenshot({path:out+'/'+name+'.png',scale:'css'});
async function inspect(p,key,target,id,width,label,expected){
 const before=await saved(p),storage=await local(p);await tapUI(p,key,target,width===390);const d=p.locator('dialog.hero-explanation[open]');await d.waitFor();assert.equal(await d.getAttribute('data-hero'),id);assert.match(await d.locator('h2').innerText(),new RegExp(expected.hero.passiveName));assert.match(await d.innerText(),/何时能用/);assert.ok((await d.innerText()).includes(expected.now));assert.equal(await d.locator('.example-cards').count(),0);assert.equal(await d.locator('details').evaluateAll(es=>es.every(e=>!e.open)),true);await shot(p,width+'-'+id+'-'+label+'-first');
 const row={id,width,scene:key,target,before,firstText:await d.innerText(),beforeSHA256:createHash('sha256').update(JSON.stringify(before)).digest('hex')};report.rows.push(row);
 // Repeated original coordinate taps while modal is open must be contained by the modal.
 const origin=await point(p,key,target);if(width===390)await p.touchscreen.tap(origin.x,origin.y);else await p.mouse.click(origin.x,origin.y);assert.equal(await p.locator('dialog.hero-explanation[open]').count(),1);
 const close=d.locator('.dialog-close'),bounds=await close.boundingBox();assert.ok(bounds&&bounds.height>=44&&bounds.y>=0&&bounds.y+bounds.height<=p.viewportSize().height+1);row.closeBounds=bounds;

 const summary=d.locator('.hero-example > summary');if(await summary.count()){await summary.click();await d.locator('.example-cards').first().waitFor({state:'attached'});assert.equal(await d.locator('.hero-example li').count(),3);await shot(p,width+'-'+id+'-'+label+'-example');await summary.click();}
 await close.click();assert.equal(await p.locator('dialog.hero-explanation[open]').count(),0);assert.equal(await p.evaluate(()=>document.activeElement===window.__harness.game.canvas),true);assert.deepEqual(await saved(p),before);assert.equal(await local(p),storage);
 await tapUI(p,key,target,width===390);await p.locator('dialog.hero-explanation[open]').waitFor();await p.keyboard.press('Escape');assert.equal(await p.locator('dialog.hero-explanation[open]').count(),0);assert.equal(await p.evaluate(()=>document.activeElement===window.__harness.game.canvas),true);assert.deepEqual(await saved(p),before);assert.equal(await local(p),storage);row.after=await saved(p);row.afterSHA256=createHash('sha256').update(JSON.stringify(await saved(p))).digest('hex');row.openCloseRepeatEscapeFocusState='PASS';
}
async function nested(p,id,width,scene){
 const entry=p.getByRole('button',{name:'查看'+heroExplanationCopy(id).hero.name+'技能说明',exact:true});await entry.waitFor();
 const row={id,width,scene,before:await saved(p),observations:[]};report.rows.push(row);
 for(const mode of ['close','Escape']){
  await entry.click();const d=p.locator('dialog.hero-explanation[open]');await d.waitFor();assert.equal(await d.getAttribute('data-hero'),id);assert.equal(await p.locator('dialog[open]').count(),2);assert.equal(await d.locator('.example-cards').count(),0);assert.equal(await d.locator('details').evaluateAll(es=>es.every(e=>!e.open)),true);await shot(p,width+'-'+id+'-'+scene+'-'+mode);
  const r=await entry.boundingBox();if(width===390)await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);else await p.mouse.click(r.x+r.width/2,r.y+r.height/2);assert.equal(await p.locator('dialog[open]').count(),2);
  if(mode==='close')await d.getByRole('button',{name:'返回手记',exact:true}).click();else await p.keyboard.press('Escape');
  assert.equal(await entry.evaluate(e=>e===document.activeElement),true);assert.equal(await p.locator('dialog[open]').count(),1);const after=await saved(p);assert.deepEqual(after,row.before);row.observations.push({mode,after,focus:'same semantic portrait button',status:'PASS'});
 }
 await p.locator('dialog[open] .dialog-close').click();assert.deepEqual(await saved(p),row.before);row.after=await saved(p);row.nestedFocusFullStateJournalStorageLocalStorage='PASS';
}

try{for(const viewport of [{width:1366,height:768},{width:390,height:740}]){
 const width=viewport.width,c=await browser.newContext({viewport,hasTouch:width===390,reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(String(e)));p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:5571/?harness=1');await waitScene(p,'title');
 for(const id of CHARACTER_IDS){const f=heroStageFixture(id);await imp(p,f.cleared,'intermission');await p.waitForTimeout(1100);await inspect(p,'intermission','result/hero-details',id,width,'cleared',heroExplanationCopy(id,f.cleared));
 let lost=structuredClone(f.state);while(lost.phase==='await-input')lost=heroSend(lost,{type:'PlayHand',selectedIds:[lost.handOrder[0]]});assert.equal(lost.phase,'run-lost');await imp(p,lost,'intermission');await p.waitForTimeout(1100);await inspect(p,'intermission','result/hero-details',id,width,'lost',heroExplanationCopy(id,lost));
 await tapUI(p,'intermission','action/last-hand',width===390);await nested(p,id,width,'finale-keepsake');
 }
 await c.close();
}
// A held production asset request verifies both the initial avatar and replacement portrait hit.
for(const viewport of [{width:1366,height:768},{width:390,height:740}]){
 const c=await browser.newContext({viewport,hasTouch:viewport.width===390,reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(30000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>report.errors.push(String(e)));let release,heldResolve;const held=new Promise(r=>heldResolve=r),barrier=new Promise(r=>release=r);
 await p.route('**/assets/handdrawn-p08/characters/amo.selection.webp',async route=>{heldResolve();await barrier;await route.continue();});
 await p.goto('http://127.0.0.1:5571/?harness=1');await waitScene(p,'title');const f=heroStageFixture('amo');await imp(p,f.cleared,'intermission');await held;
 const before=await saved(p),hitCount=()=>p.evaluate(()=>{const walk=xs=>xs.flatMap(o=>[o,...(o.list?walk(o.list):[])]);return walk(window.__harness.game.scene.getScene('intermission').view.root.list).filter(o=>o.name==='result/hero-details').length;});
 assert.equal(await hitCount(),1,'initial actual avatar gets one entry');await inspect(p,'intermission','result/hero-details','amo',viewport.width,'late-avatar',heroExplanationCopy('amo',f.cleared));release();
 await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('intermission');return s.textures.exists('selection-portrait-amo')&&s.view.root.list.some(o=>o.list?.some(x=>x.name==='result-art/hero'&&x.texture?.key==='selection-portrait-amo'));});
 assert.equal(await hitCount(),1,'late repaint disposes old hit and binds exactly one new entry');await inspect(p,'intermission','result/hero-details','amo',viewport.width,'late-portrait',heroExplanationCopy('amo',f.cleared));assert.deepEqual(await saved(p),before);
 report.rows.push({id:'amo',width:viewport.width,scene:'intermission',case:'late-original-asset-request',before,after:await saved(p),uniqueHitBeforeAndAfter:true,status:'PASS'});await p.reload();await waitScene(p,'title');assert.deepEqual(await saved(p),before);await c.close();
}
assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await writeFile(out+'/full-state-journal-storage-localStorage.json.gz',gzipSync(JSON.stringify(report)));await writeFile(out+'/summary.json',JSON.stringify({head:report.head,sourceTree:report.sourceTree,status:report.status,failure:report.failure,errors:report.errors,rows:report.rows.map(r=>({hero:r.id,width:r.width,scene:r.scene,target:r.target,case:r.case,status:r.status??r.openCloseRepeatEscapeFocusState??r.nestedFocusFullStateJournalStorageLocalStorage}))},null,2));console.log(JSON.stringify({status:report.status,failure:report.failure,rows:report.rows.length}));await browser.close();await server.close();}
