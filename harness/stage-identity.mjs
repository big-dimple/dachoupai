import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene} from './ui.mjs';

const output=process.env.STAGE_IDENTITY_OUTPUT??'/tmp/stage-identity-before';
const entryOnly=!!process.env.STAGE_IDENTITY_ENTRY_ONLY;
await mkdir(output,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5447,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand,assertRunInvariants}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {R2_HAND_TYPES}=await server.ssrLoadModule('/src/domain/evaluateR2.ts');
const send=(state,action)=>{const result=applyCommand(state,{runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});assert.ok(result.ok,result.code);return result.state;};
function fixture(boss){
 let run=createRun({seed:'stage-identity-fixed',runId:'stage-identity/'+boss.definitionId,characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 // Controlled valid checkpoint, not natural acquisition: public chapter plan and discovered levels.
 run=send(send(run,{type:'LeaveShop'}),{type:'SkipStage'});run=send(run,{type:'OpenShop'});run=send(run,{type:'LeaveShop'});
 run.boss=structuredClone(boss);run.seenBossIds=[boss.definitionId];
 for(const type of R2_HAND_TYPES)run.handLevels[type]=30;
 assertRunInvariants(run);assert.ok(readCheckpoint(makeCheckpoint(run,[])).ok);
 const entered=send(run,{type:'EnterStage'}),action={type:'PlayHand',selectedIds:entered.handOrder.slice(0,5)},cleared=send(entered,action);
 assert.equal(cleared.phase,'stage-cleared');return {entered,action,cleared};
}
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),modified:!!execFileSync('git',['status','--porcelain','--','src','tests'],{encoding:'utf8'}).trim(),scope:'Controlled mature public checkpoint, current Amo/group identity, no target/probability/difficulty modification. Native Play → result → shop → Boss entry → Play → result → reload. Software Canvas, no natural acquisition/human/device/audio acceptance.',cases:[]};
try{
 for(const width of [1366,390])for(const boss of [{definitionId:'B03',disabledSuit:'clubs'},{definitionId:'B02',disabledSuit:null}]){
  const f=fixture(boss),row={width,boss,errors:[]};report.cases.push(row);
  const imported=entryOnly?send(send(f.cleared,{type:'OpenShop'}),{type:'LeaveShop'}):f.entered;
  const page=await browser.newPage({viewport:{width,height:width===390?844:768},hasTouch:width===390,reducedMotion:'reduce'});page.on('pageerror',e=>row.errors.push(String(e)));page.on('dialog',d=>d.accept());
  const name=width+'-'+boss.definitionId,touch=width===390;
  await page.goto('http://127.0.0.1:5447/?harness=1');await waitScene(page,'title');
  await page.locator('.run-menu-toggle').click();const details=page.getByText('进度与存档',{exact:true}).locator('..');if(!await details.evaluate(e=>e.open))await details.locator('summary').click();
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(imported,[])))});await waitScene(page,'game');
  if(entryOnly){
   const expected=send(imported,{type:'EnterStage'});await page.waitForFunction(()=>!!document.querySelector('.stage-identity-entry[open]'));assert.deepEqual(await page.evaluate(()=>window.__harness.game.registry.get('runController').state),expected);
   row.entry=await page.locator('dialog[open]').innerText();row.geometry=[];
   for(const [boundaryWidth,boundaryHeight] of (width===1366&&boss.definitionId==='B03'?[[1366,768],[320,740],[740,360]]:[[width,width===390?844:768]])){
    await page.setViewportSize({width:boundaryWidth,height:boundaryHeight});
    const primary=page.getByRole('button',{name:'开始出牌',exact:true}),bounds=await page.locator('dialog[open]').boundingBox(),button=await primary.boundingBox();
    assert.ok(button&&button.y>=0&&button.y+button.height<=boundaryHeight);assert.ok(bounds.height<boundaryHeight-48,'entry sheet fits concise content');
    row.geometry.push({width:boundaryWidth,height:boundaryHeight,bounds,button});await page.screenshot({path:output+'/'+boundaryWidth+'-'+boss.definitionId+'-entry.png'});
   }
   await page.getByRole('button',{name:'开始出牌',exact:true}).hover();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
   row.primaryHover=await page.getByRole('button',{name:'开始出牌',exact:true}).evaluate(e=>{
    const style=getComputedStyle(e),light=color=>color.match(/\d+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0),background=light(style.backgroundColor),foreground=light(style.color);
    return {hovered:e.matches(':hover'),background:style.backgroundColor,color:style.color,contrast:(Math.max(background,foreground)+.05)/(Math.min(background,foreground)+.05)};
   });assert.ok(row.primaryHover.contrast>=4.5,'entry primary text remains readable');
   await page.locator('dialog[open] summary').click();row.fullRules=await page.locator('dialog[open]').innerText();assert.match(row.fullRules,/应对/);await page.getByRole('button',{name:'开始出牌',exact:true}).click();assert.deepEqual(await page.evaluate(()=>window.__harness.game.registry.get('runController').state),expected);
   row.final=expected;assert.deepEqual(row.errors,[]);await page.close();continue;
  }
  await page.waitForFunction(()=>{const scene=window.__harness.game.scene.getScene('game');return scene.ready&&!scene.presentation&&scene.cardViews.every(v=>!v.dealing);});
  for(const id of f.action.selectedIds)await tapUI(page,'game','card/'+id,touch);
  await tapUI(page,'game','action/play',touch);await waitScene(page,'intermission');
  const state=()=>page.evaluate(()=>window.__harness.game.registry.get('runController').state);
  assert.deepEqual(await state(),f.cleared);
  row.preview=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('intermission');return s.view.root.list.filter(o=>o.name==='result/next-body').map(o=>o.text);});
  await page.screenshot({path:output+'/'+name+'-preview.png'});
  if(width===1366&&boss.definitionId==='B03'){
   row.previewBoundaries=[];
   for(const [boundaryWidth,boundaryHeight] of [[1180,757],[320,740],[740,360]]){
    await page.setViewportSize({width:boundaryWidth,height:boundaryHeight});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.deepEqual(await state(),f.cleared);
    await page.screenshot({path:output+'/'+boundaryWidth+'-B03-preview.png'});
    row.previewBoundaries.push({width:boundaryWidth,height:boundaryHeight,text:await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('intermission');return s.view.root.list.filter(o=>o.name==='result/next-body').map(o=>({text:o.text,maxLines:o.style.maxLines,height:o.height}));})});
   }
   await page.setViewportSize({width,height:768});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
  await tapUI(page,'intermission','action/continue-stage',touch);await waitScene(page,'shop');const shop=send(f.cleared,{type:'OpenShop'});assert.deepEqual(await state(),shop);
  const ready=send(shop,{type:'LeaveShop'}),entered=send(ready,{type:'EnterStage'});
  await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await page.waitForFunction(()=>!!document.querySelector('dialog[open]'));
  assert.deepEqual(await state(),entered);assert.deepEqual(entered.stage.boss,boss);assert.deepEqual(entered.rng.rule,f.cleared.rng.rule);
  row.entry=await page.locator('dialog[open]').innerText();await page.screenshot({path:output+'/'+name+'-entry.png'});
  if(width===1366&&boss.definitionId==='B03')for(const [boundaryWidth,boundaryHeight] of [[320,740],[740,360]]){
   await page.setViewportSize({width:boundaryWidth,height:boundaryHeight});await page.screenshot({path:output+'/'+boundaryWidth+'-B03-entry.png'});assert.deepEqual(await state(),entered);
   const bounds=await page.getByRole('button',{name:'开始出牌',exact:true}).boundingBox();assert.ok(bounds&&bounds.x>=0&&bounds.y>=0&&bounds.y+bounds.height<=boundaryHeight);
  }
  if(width===1366){await page.setViewportSize({width,height:768});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
  await page.getByRole('button',{name:'开始出牌',exact:true}).click();assert.deepEqual(await state(),entered);
  await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(v=>!v.dealing));
  for(const id of entered.handOrder.slice(0,5))await tapUI(page,'game','card/'+id,touch);
  row.selection=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.cardViews.map(v=>({id:v.card.id,marker:v.scoringMark.text,visible:v.scoringMark.visible,fill:v.background.fillColor,active:v.container.getData('activeScoring')}));});
  if(boss.definitionId==='B02'){const zero=row.selection.filter(v=>v.visible&&v.marker==='点数0');assert.equal(zero.length,2);assert.ok(zero.every(v=>v.fill===0xf3eadb));}
  await page.screenshot({path:output+'/'+name+'-selected.png'});
  const result=send(entered,{type:'PlayHand',selectedIds:entered.handOrder.slice(0,5)});
  await tapUI(page,'game','action/play',touch);await waitScene(page,'intermission');assert.deepEqual(await state(),result);
  await page.screenshot({path:output+'/'+name+'-result.png'});
  row.final=result;await page.reload();await waitScene(page,'title');await tapUI(page,'title','action/title-continue',touch);await waitScene(page,'intermission');assert.deepEqual(await state(),result);
  assert.deepEqual(row.errors,[]);await page.close();
 }
}finally{await writeFile(output+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({output,cases:report.cases.map(({width,boss,preview,entry})=>({width,boss,preview,entry}))}));
