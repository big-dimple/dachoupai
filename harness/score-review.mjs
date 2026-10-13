import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI,tapMenuAction} from './ui.mjs';
const out=process.env.SCORE_REVIEW_OUTPUT??'/tmp/score-review-readable';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:'/tmp/score-review-vite',server:{host:'127.0.0.1',port:5673,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {formatScoreReview}=await server.ssrLoadModule('/src/game/ScoreReview.ts');
const {r2JokerDefinitionsFor}=await server.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
const {r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {scoreR2Hand}=await server.ssrLoadModule('/src/domain/scoreR2.ts');
const {SeededRng}=await server.ssrLoadModule('/src/core/SeededRng.ts');
const gameSource='docs/production/evidence/touye-new-core-2026-10-12/native-final/report.json';
const finalSource='docs/production/evidence/p1a-active-mult-timing-2026-10-12/native/report.json';
const gameEvidence=JSON.parse(await readFile(gameSource,'utf8')),finalEvidence=JSON.parse(await readFile(finalSource,'utf8'));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),scope:'read-only local menu/details of already-saved controlled states; giant/multi-source sample is a direct scorer display projection, never imported or saved; no new gameplay commands or whole runs',rows:[],status:'RUNNING'};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try {
 for(const viewport of [{width:1366,height:768},{width:390,height:844},{width:320,height:740}]){
  const touch=viewport.width<500,context=await browser.newContext({viewport,hasTouch:touch,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(25000);page.on('dialog',dialog=>dialog.accept());
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));const dom=l=>touch?l.tap():l.click();
  const snap=()=>page.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});
  const settle=()=>page.waitForFunction(()=>{const s=window.__harness?.game.scene.getScene('game');return s?.ready&&!s.presentation&&!s.playing;});
  const close=()=>dom(page.locator('.detail-dialog[open] .dialog-close'));
  const shot=async name=>{const file=viewport.width+'-'+name+'.png';await page.screenshot({path:out+'/'+file,scale:'css'});return file;};
  const bounds=()=>page.locator('.detail-dialog[open]').evaluate(dialog=>{
   const scroll=dialog.querySelector('.dialog-scroll'),rect=dialog.getBoundingClientRect(),row=dialog.querySelector('.dialog-actions').getBoundingClientRect();
   return {dialog:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,clientWidth:dialog.clientWidth,scrollWidth:dialog.scrollWidth},scroll:{clientWidth:scroll.clientWidth,scrollWidth:scroll.scrollWidth},actions:{y:row.y,height:row.height,bottom:row.bottom},textSizes:[...dialog.querySelectorAll('.experience-card p,.card-rules p')].map(p=>getComputedStyle(p).fontSize)};
  });
  const assertBounds=b=>{assert.ok(b.dialog.x>=0&&b.dialog.x+b.dialog.width<=viewport.width+1);assert.ok(b.dialog.scrollWidth<=b.dialog.clientWidth+1,JSON.stringify(b));assert.ok(b.scroll.scrollWidth<=b.scroll.clientWidth+1,JSON.stringify(b));assert.ok(b.actions.bottom<=viewport.height+1);assert.ok(b.textSizes.every(size=>parseFloat(size)>=14));};
  await page.goto('http://127.0.0.1:5673/?harness=1');await waitScene(page,'title');
  for(const kind of ['game-win','game-loss','menu-final','giant-projection']){
   const native=kind==='game-win'||kind==='game-loss';
   const rowIndex=native?gameEvidence.rows.findIndex(r=>r.viewport.width===1366&&r.kind===(kind==='game-win'?'mature-win':'mature-old-core')):finalEvidence.rows.findIndex(r=>r.viewport.width===1366&&r.kind==='xiemu');
   const input=native?gameEvidence.rows[rowIndex].afterPlay:finalEvidence.rows[rowIndex].after;
   const cp=makeCheckpoint(input.state,input.journal);assert.equal(readCheckpoint(cp).ok,true);
   if(!await page.locator('.run-menu-modal').evaluate(d=>d.open))await dom(page.locator('.run-menu-toggle'));
   const saves=page.getByText('进度与存档',{exact:true}).locator('..');if(!await saves.evaluate(e=>e.open))await dom(saves.locator('summary'));
   const pick=page.waitForEvent('filechooser');await dom(page.getByRole('button',{name:'导入本局',exact:true}));await(await pick).setFiles({name:'existing-saved-view.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});
   await waitScene(page,native?'game':'intermission');if(native)await settle();
   const before=await snap();assert.deepEqual(before.state,input.state);assert.deepEqual(before.journal,input.journal);
   const row={viewport,kind,provenance:{source:native?gameSource:finalSource,rowIndex,field:native?'afterPlay':'after'},beforeHash:hash(before),inputStateHash:hash(input.state),before,images:[]};report.rows.push(row);
   let expected=formatScoreReview(input.state,input.state.lastTrace);
   if(kind==='giant-projection'){
    const state=input.state,hand=[3,4,5,6,7].map((rank,i)=>({id:'display/'+i,rank,suit:'hearts',enhancement:'multiplier-paper'})),jokers=['c04','c02','c02','c07','e11'].map((id,i)=>r2CreateJoker(id,'display/'+id+'/'+i,8,undefined,state));
    jokers.at(-1).growth.coefficient={n:'12345678901234567890123456789',d:'10000000000000000000000000000'};
    const trace=scoreR2Hand({rulesVersion:'r2',runId:state.runId,rootId:'display-only',characterId:'neutral',hand,selectedIds:hand.map(c=>c.id),disabledIds:[],jokers,definitions:r2JokerDefinitionsFor(state),handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:new SeededRng('display-only').snapshot(),amoScoreTiming:'assist-v1',routeGrowth:{clears:21,G:0,S:21,F:21}});
    row.displayProjection={trace,source:'direct scoreR2Hand, no saved state/journal mutation; prior clears are controlled display input'};expected=formatScoreReview(state,trace);
    await page.evaluate(async({state,trace})=>{const {formatScoreReview}=await import('/src/game/ScoreReview.ts'),{DetailDialog}=await import('/src/game/DetailDialog.ts'),view=formatScoreReview(state,trace);window.__scoreReviewDialog=new DetailDialog();window.__scoreReviewDialog.open(view.title,view.diagnostics,[],{effectBody:view.summary,cards:view.cards,collapseRules:true,rulesLabel:'诊断：精确分数与原始事件'});},{state,trace});
   }else if(native){
    if(!await page.locator('.run-menu-modal').evaluate(d=>d.open))await dom(page.locator('.run-menu-toggle'));
    await dom(page.getByRole('button',{name:'上手详情',exact:true}));
   }else await tapMenuAction(page,'回看上一手',touch);
   await page.locator('.detail-dialog[open]').waitFor();
   const dialog=page.locator('.detail-dialog[open]');assert.equal(await dialog.locator('details.card-rules').evaluate(e=>e.open),false);
   row.defaultText=await dialog.innerText();assert.doesNotMatch(row.defaultText,/reasonKey|route-growth|multiply-multiplier|add-heat|eventId|精确倍率/);assert.match(row.defaultText,/实际(触发|读取|记录|检查) \d+ 次/);
   assert.equal(await dialog.locator('.dialog-effect').innerText(),expected.summary);row.defaultBounds=await bounds();assertBounds(row.defaultBounds);row.images.push(await shot(kind+'-default'));
   const rules=dialog.locator('.dialog-copy > details.card-rules');await rules.locator('summary').evaluate(e=>e.scrollIntoView({block:'center'}));await dom(rules.locator('summary'));assert.equal(await rules.locator('p').innerText(),expected.diagnostics);await rules.locator('p').evaluate(e=>e.scrollIntoView({block:'start'}));row.expandedBounds=await bounds();assertBounds(row.expandedBounds);row.images.push(await shot(kind+'-diagnostic'));
   await close();const after=await snap();assert.deepEqual(after,before);row.afterHash=hash(after);row.fullStateJournalStorageUnchanged=true;
   // Only native saved samples restore: never save/import the display projection.
   if(kind==='game-win'||kind==='menu-final'){
    await page.reload();await waitScene(page,'title');await tapUI(page,'title','action/title-continue',touch);await waitScene(page,native?'game':'intermission');if(native)await settle();const restored=await snap();assert.deepEqual(restored,before);row.coldRestoreHash=hash(restored);row.coldRestoreExact=true;
   }
   row.status='PASS';
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:report.rows.length,error:report.error}));}
