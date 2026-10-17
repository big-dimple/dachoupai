/** Native input acceptance for the footer; controlled nine-card public hand, no acquisition claim. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {point,tapUI,waitScene} from './ui.mjs';
const out=process.env.FOOTER_OUT??'shots/table-footer-regressions';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{port:5701,host:'127.0.0.1',strictPort:true},logLevel:'error'});await server.listen();
const domain=await server.ssrLoadModule('/src/domain/run.ts'),cp=await server.ssrLoadModule('/src/application/checkpoint.ts'),launch=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const baselineFile='/tmp/dachoupai-footer-layout-before.ts';await writeFile(baselineFile,execFileSync('git',['show','36ba1e41:src/game/layout.ts'],{encoding:'utf8'}));
const {layout:beforeLayout}=await server.ssrLoadModule(baselineFile);
const ids=['spades-8','hearts-8','clubs-7','diamonds-7','spades-13','hearts-13','clubs-2','diamonds-4','hearts-3'];
let fixture=domain.createRun({runId:'footer/controlled-nine',seed:'table-footer',characterId:'erxiang',rulesVersion:'r2',r2Identity:launch.newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
for(const type of ['LeaveShop','EnterStage']){const r=domain.applyCommand(fixture,{runId:fixture.runId,commandId:'setup/'+type,expectedSeq:fixture.commandSeq,action:{type}});assert.ok(r.ok);fixture=r.state;}
fixture=structuredClone(fixture);fixture.handOrder=ids;fixture.drawPile=fixture.deckInstances.filter(c=>!ids.includes(c.id)).map(c=>c.id);fixture.stage.handLimit=9;fixture.stage.initialHandLimit=9;
const checkpoint=cp.makeCheckpoint(fixture,[]);assert.ok(cp.readCheckpoint(checkpoint).ok);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),renderer:'Chromium software Canvas',fixture:'Current new-run identity, validator-approved curated nine visible cards / hand capacity; no natural draw/acquisition claim.',sourceHashes:Object.fromEntries(await Promise.all(['GameScene','layout','HeroActionShortcut'].map(async name=>[name,createHash('sha256').update(await readFile('src/game/'+name+'.ts')).digest('hex')]))),rows:[]};
const snap=p=>p.evaluate(async()=>{const r=window.__harness.game.registry.get('runController');return {state:r.state,journal:r.journal,storage:await r.store.read()};});
const intersect=(a,b)=>a.x<b.x+b.width-1e-6&&b.x<a.x+a.width-1e-6&&a.y<b.y+b.height-1e-6&&b.y<a.y+a.height-1e-6;
const inside=(a,b)=>a.x>=b.x-1&&a.y>=b.y-1&&a.x+a.width<=b.x+b.width+1&&a.y+a.height<=b.y+b.height+1;
async function load(p){
 await p.goto('http://127.0.0.1:5701/?harness=1');await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');await sec.locator('summary').click();
 const choose=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await choose).setFiles({name:'controlled-nine.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'game');await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').controlsLive);
 // Test setup enrolls the normal UI preference, never changes a game command/state.
 await p.evaluate(async()=>{const {enrollFirstChapterGuide}=await import('/src/game/FirstChapterGuide.ts');enrollFirstChapterGuide(window.__harness.game.registry.get('runController').state);});
}
async function geometry(p,safe,row,name){
 await p.evaluate(safe=>{for(const [side,n]of Object.entries(safe))document.documentElement.style.setProperty('--safe-'+side,n+'px');window.dispatchEvent(new Event('resize'));},safe);
 // Safe-area injection alone does not change the backing canvas size. Exercise
 // real resize events so the rendered view consumes the new CSS insets.
 const viewportSize=p.viewportSize();await p.setViewportSize({...viewportSize,width:viewportSize.width-1});await p.waitForTimeout(80);await p.setViewportSize(viewportSize);
 await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game'),b=s.discardButton.getBounds(),expected=s.view.layout.tableActions.discard;return Math.abs(b.x-expected.x)<.1&&Math.abs(b.y-expected.y)<.1;});
 const actual=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),l=s.view.layout,rect=b=>b&&({x:b.x,y:b.y,width:b.width,height:b.height}),boxes=[s.discardButton,s.rankButton,s.suitButton,s.aiButton,s.playButton,s.heroActionButton,s.inventoryButton].map(o=>({name:o.name,box:rect(o.getBounds()),label:o.getData('label')?.text,labelBox:rect(o.getData('label')?.getBounds())}));return {l,boxes,selected:[...s.selectedIds]};});
 const {l,boxes}=actual,baseline=beforeLayout({width:l.width,height:l.height},safe,undefined,{count:9});
 assert.deepEqual(l.hand,baseline.hand);assert.deepEqual(l.cards,baseline.cards);assert.deepEqual(l.scoreBoard,baseline.scoreBoard);assert.equal(l.visibleCardCount,9);assert.equal(l.handOverflow,false);
 const footer=boxes.slice(0,5);for(let i=1;i<footer.length;i++){assert.ok(footer[i].box.x>=footer[i-1].box.x+footer[i-1].box.width-1e-6);assert.equal(footer[i].box.y,footer[0].box.y);}
 const viewport={x:safe.left,y:safe.top,width:l.width-safe.left-safe.right,height:l.height-safe.top-safe.bottom};
 for(const b of boxes){assert.ok(b.box.width>=44&&b.box.height>=44,b.name+' minimum hit');assert.ok(inside(b.box,viewport),b.name+' safe viewport');assert.ok(!intersect(b.box,l.hand),b.name+' avoids hand');assert.ok(!intersect(b.box,l.scoreBoard),b.name+' avoids score');if(b.labelBox)assert.ok(inside(b.labelBox,b.box),b.name+' readable label');}
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.ok(!intersect(boxes[i].box,boxes[j].box),boxes[i].name+' avoids '+boxes[j].name);
 assert.match(boxes[5].label,/技能/);row.geometry??=[];row.geometry.push({name,...actual,handSeatsAndScoreExactToBefore:true});await p.screenshot({path:out+'/'+row.name+'-'+name+'.png'});return actual;
}
async function clear(p,touch){for(const id of await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]))await tapUI(p,'game','card/'+id,touch);}
async function selectPair(p,touch){await clear(p,touch);for(const id of ids.slice(0,2))await tapUI(p,'game','card/'+id,touch);}
async function swipe(p,context){
 const state=(await snap(p)).state,from=await point(p,'game','card/'+state.handOrder[0]),to=await point(p,'game','card/'+state.handOrder[2]),cdp=await context.newCDPSession(p);
 const touch=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:0,radiusX:1,radiusY:1,force:1}]});await touch('touchStart',from.x,from.y);for(let i=1;i<=8;i++)await touch('touchMove',from.x+(to.x-from.x)*i/8,from.y+(to.y-from.y)*i/8);await touch('touchEnd',to.x,to.y);await p.waitForTimeout(100);await cdp.detach();
 assert.deepEqual(await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),state.handOrder.slice(0,3));
}
async function verifyCommand(p,before,type){await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq,before.state.commandSeq);const after=await snap(p),command=after.journal.at(-1);assert.equal(command.action.type,type);assert.equal(after.journal.length,before.journal.length+1);const expected=domain.applyCommand(before.state,command);assert.ok(expected.ok);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.storage.current,cp.makeCheckpoint(after.state,after.journal));return after;}
const specs=[{name:'desktop',width:1366,height:768,touch:false,safe:{top:0,left:0,right:0,bottom:0}},{name:'phone-safe34',width:390,height:844,touch:true,safe:{top:12,left:0,right:0,bottom:34}},{name:'narrow',width:320,height:568,touch:true,safe:{top:0,left:0,right:0,bottom:0}},{name:'short-notch',width:740,height:320,touch:true,safe:{top:12,left:44,right:12,bottom:20}}];
try{
 for(const spec of specs){
  if(process.env.FOOTER_CASES&&!process.env.FOOTER_CASES.split(',').includes(spec.name))continue;
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.touch,reducedMotion:'reduce'}),p=await context.newPage(),row={name:spec.name,spec,status:'RUNNING',errors:[]};report.rows.push(row);p.setDefaultTimeout(12000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e)));
  try{
   await load(p);await geometry(p,spec.safe,row,'initial');
   for(const name of ['action/sort-rank','action/sort-suit']){const before=await snap(p);await tapUI(p,'game',name,spec.touch);await verifyCommand(p,before,'ReorderHand');}row.sortCommandsExact=true;
   const before=await snap(p);await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').aiCandidates.result?.status==='ready');await tapUI(p,'game','selection/switch-type',spec.touch);assert.ok(await p.evaluate(()=>window.__harness.game.scene.getScene('game').selectedIds.size>0));assert.deepEqual(await snap(p),before);row.aiSelectOnly=true;
   await clear(p,spec.touch);if(spec.touch){const beforeSwipe=await snap(p);await swipe(p,context);assert.deepEqual(await snap(p),beforeSwipe);row.realTouchSwipe=true;}
   if(spec.name==='phone-safe34'){const beforeRotate=await snap(p),selected=await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]);await p.setViewportSize({width:740,height:320});await geometry(p,{top:12,left:44,right:12,bottom:20},row,'rotated');assert.deepEqual(await snap(p),beforeRotate);assert.deepEqual(await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),selected);await p.setViewportSize({width:spec.width,height:spec.height});await geometry(p,spec.safe,row,'returned');assert.deepEqual(await snap(p),beforeRotate);row.rotationKeepsRunAndSelection=true;}
   await selectPair(p,spec.touch);const choiceBefore=await snap(p);await tapUI(p,'game','hero/action-shortcut',spec.touch);await p.locator('.detail-dialog[open]').waitFor();await p.keyboard.press('Escape');assert.deepEqual(await snap(p),choiceBefore);row.independentSkillEntryNoCommand=true;
   await tapUI(p,'game','action/play',spec.touch);await p.locator('.hero-play-reminder[open]').waitFor();assert.deepEqual(await snap(p),choiceBefore);row.reminder=await p.locator('.hero-play-reminder').innerText();await p.screenshot({path:out+'/'+row.name+'-reminder.png'});
   if(spec.name==='desktop'){await p.getByRole('button',{name:'返回用技能',exact:true}).click();await p.locator('.detail-dialog[open]').waitFor();assert.deepEqual(await snap(p),choiceBefore);await p.keyboard.press('Escape');row.returnToSkillNoCommand=true;}
   else if(spec.name==='narrow'){await p.getByRole('button',{name:'继续出牌',exact:true}).click({clickCount:2});const after=await verifyCommand(p,choiceBefore,'PlayHand');assert.equal(after.state.stage.erxiangHandoffUsed,false);row.explicitContinueOneCommand=true;}
   else{await p.getByRole('button',{name:'取消 · 返回选牌',exact:true}).click();assert.deepEqual(await snap(p),choiceBefore);assert.deepEqual(await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),ids.slice(0,2));row.cancelKeepsSelectionAndRun=true;}
   assert.deepEqual(row.errors,[]);row.status='PASS';
  }catch(e){row.status='FAIL';row.error=String(e.stack??e);await p.screenshot({path:out+'/'+row.name+'-FAIL.png'}).catch(()=>{});}
  finally{await context.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(row.name+': '+row.status+(row.error?' '+row.error.split('\n')[0]:''));}
 }
}finally{report.status=report.rows.every(r=>r.status==='PASS')?'PASS':'FAIL';await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();console.log(report.status);}
if(report.status==='FAIL')process.exitCode=1;
