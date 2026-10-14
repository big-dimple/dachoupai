import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from './ui.mjs';
const baselineSHA='bf3944a26747ab8a1a830e098ae5857fb7f5dded',out=process.env.SCORE_INTERMISSION_OUTPUT??'/tmp/score-review-intermission';await mkdir(out,{recursive:true});
const old=execFileSync('git',['show',baselineSHA+':src/game/IntermissionScene.ts'],{encoding:'utf8'}),current=await readFile('src/game/IntermissionScene.ts','utf8');
const outside=text=>text.replace(/  private inspectLastHand\(\):void \{[\s\S]*?(?=  private returnToSelect)/,'').replace(/^import .*\n/gm,'');assert.equal(outside(current),outside(old),'all settlement source outside recap/imports stays byte-identical');
const actions="run.phase==='stage-cleared'?[{label:'查看培养路线',disabled:!this.ready,run:()=>this.inspectJourney()},{label:'前往筹备商店继续培养',primary:true,disabled:!this.ready,run:()=>this.next()}]:[]";assert.ok(old.includes(actions)&&current.includes(actions),'exact callbacks/availability stay intact');
const currentServer=await createServer({mode:'e2e',cacheDir:'/tmp/score-intermission-vite',server:{host:'127.0.0.1',port:5674,strictPort:true,hmr:false},logLevel:'error'});await currentServer.listen();
const baseline=await createServer({root:process.env.SCORE_INTERMISSION_BASE_ROOT??'/tmp/score-review-intermission-base',mode:'e2e',cacheDir:'/tmp/score-intermission-base-vite',server:{host:'127.0.0.1',port:5675,strictPort:true,hmr:false},logLevel:'error'});await baseline.listen();
const {makeCheckpoint,readCheckpoint}=await currentServer.ssrLoadModule('/src/application/checkpoint.ts'),{formatScoreReview}=await currentServer.ssrLoadModule('/src/game/ScoreReview.ts');
const clearSource='docs/production/evidence/p1a-active-mult-timing-2026-10-12/native/report.json',clearReport=JSON.parse(await readFile(clearSource,'utf8')),clearIndex=clearReport.rows.findIndex(r=>r.kind==='xiemu'&&r.viewport.width===1366),clear=clearReport.rows[clearIndex].after;
const lossSource='docs/production/evidence/pc-shop-2026-10-07/controlled-lose.json',loss=JSON.parse(await readFile(lossSource,'utf8'));
const fixtures=[{kind:'clear',source:clearSource,rowIndex:clearIndex,checkpoint:makeCheckpoint(clear.state,clear.journal)},{kind:'loss',source:lossSource,checkpoint:loss}];for(const f of fixtures)assert.equal(readCheckpoint(f.checkpoint).ok,true,f.kind);
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex'),report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),baselineSHA,scope:'only direct native inspectLastHand recap and result-details entry; imported existing legal clear/loss checkpoints in fresh contexts, no new gameplay command; entire settlement outside method/imports and exact action callbacks compared to baseline',sourceOutsideRecapByteIdentical:true,actionCallbacksByteIdentical:true,rows:[],status:'RUNNING'};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{
 for(const viewport of [{width:1366,height:768},{width:390,height:844}])for(const f of fixtures){
  const row={viewport,kind:f.kind,source:f.source,rowIndex:f.rowIndex,images:[]};report.rows.push(row);let previousShape,previousButtons;
  for(const [version,port] of [['baseline',5675],['current',5674]]){
   const context=await browser.newContext({viewport,hasTouch:viewport.width===390,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(25000);page.on('dialog',d=>d.accept());const errors=[];page.on('pageerror',e=>errors.push(String(e)));const touch=viewport.width===390,dom=l=>touch?l.tap():l.click();
   const snap=()=>page.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return{state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});
   const settled=async()=>{await waitScene(page,'intermission');await page.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').ready);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);};
   const shape=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('intermission'),rows=[];const walk=list=>{for(const o of list){if(o.name||o.type==='Text'){const b=o.getBounds?.();rows.push({name:o.name,type:o.type,text:o.text,visible:o.visible,alpha:o.alpha,b:b?{x:b.x,y:b.y,width:b.width,height:b.height}:undefined});}if(o.list)walk(o.list);}};walk(s.children.list);return rows;});
   const shot=async(name,canvas=false)=>{const file=viewport.width+'-'+f.kind+'-'+version+'-'+name+'.png';const bytes=await(canvas?page.locator('canvas').screenshot({path:out+'/'+file,scale:'css'}):page.screenshot({path:out+'/'+file,scale:'css'}));row.images.push(file);return createHash('sha256').update(bytes).digest('hex');};
   await page.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(page,'title');await dom(page.locator('.run-menu-toggle'));const saves=page.getByText('进度与存档',{exact:true}).locator('..');if(!await saves.evaluate(e=>e.open))await dom(saves.locator('summary'));const choose=page.waitForEvent('filechooser');await dom(page.getByRole('button',{name:'导入本局',exact:true}));await(await choose).setFiles({name:'existing-result-only.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(f.checkpoint))});await settled();
   const before=await snap();assert.deepEqual(before.state,f.checkpoint.state);assert.deepEqual(before.journal,f.checkpoint.journal);const resultShape=await shape();row[version+'ResultShape']=resultShape;row[version+'CanvasPNGHash']=await shot('result',true);
   if(version==='baseline')previousShape=resultShape;else{assert.deepEqual(resultShape,previousShape);row.resultLayoutTextBoundsExact=true;row.resultCanvasPixelsExact=row.baselineCanvasPNGHash===row.currentCanvasPNGHash;row.before=before;row.beforeHash=sha(before);}
   await tapUI(page,'intermission','action/last-hand',touch);if(f.kind==='loss')await dom(page.getByRole('button',{name:'回看最后一手',exact:true}));const dialog=page.locator('.detail-dialog[open]');await dialog.waitFor();assert.equal(await dialog.locator('h2').innerText(),'最后一手 · 已保存的结算');
   const buttons=await dialog.locator('.dialog-actions button').evaluateAll(bs=>bs.map(b=>({label:b.textContent,disabled:b.disabled,primary:b.classList.contains('dialog-primary')})));row[version+'Buttons']=buttons;if(version==='baseline')previousButtons=buttons;else assert.deepEqual(buttons,previousButtons);
   await shot('default');
   if(version==='current'){
    const review=formatScoreReview(before.state,before.state.lastTrace);row.defaultText=await dialog.innerText();assert.doesNotMatch(row.defaultText,/精确倍率|reasonKey|eventId|route-growth|multiply-multiplier/);assert.equal(await dialog.locator('.dialog-effect').innerText(),review.summary);
    const rules=dialog.locator('.dialog-copy > details.card-rules');assert.equal(await rules.evaluate(e=>e.open),false);await rules.locator('summary').evaluate(e=>e.scrollIntoView({block:'center'}));await dom(rules.locator('summary'));assert.equal(await rules.locator('p').innerText(),review.diagnostics);await rules.locator('p').evaluate(e=>e.scrollIntoView({block:'start'}));await shot('diagnostic');
    const b=await dialog.evaluate(d=>{const s=d.querySelector('.dialog-scroll');return{client:d.clientWidth,scroll:d.scrollWidth,copyClient:s.clientWidth,copyScroll:s.scrollWidth,buttons:[...d.querySelectorAll('.dialog-actions button')].map(b=>b.getBoundingClientRect().toJSON()),fonts:[...d.querySelectorAll('.experience-card p,.card-rules p')].map(p=>getComputedStyle(p).fontSize)};});row.expandedBounds=b;assert.ok(b.scroll<=b.client+1&&b.copyScroll<=b.copyClient+1);assert.ok(b.buttons.every(r=>r.height>=44&&r.x>=0&&r.right<=viewport.width+1&&r.bottom<=viewport.height+1));assert.ok(b.fonts.every(v=>parseFloat(v)>=14));
   }
   await dom(dialog.locator('.dialog-close'));assert.deepEqual(await snap(),before);
   if(version==='current'){
    // Both original routes to the recap remain native; no Next action is executed.
    if(f.kind==='loss'){await tapUI(page,'intermission','action/last-hand',touch);await dom(page.getByRole('button',{name:'本场详情',exact:true}));}else await tapUI(page,'intermission','action/result-details',touch);await dom(page.getByRole('button',{name:'回看最后一手',exact:true}));assert.equal(await page.locator('.detail-dialog[open] .dialog-effect').innerText(),formatScoreReview(before.state,before.state.lastTrace).summary);await dom(page.locator('.detail-dialog[open] .dialog-close'));assert.deepEqual(await snap(),before);
    await page.reload();await waitScene(page,'title');await tapUI(page,'title','action/title-continue',touch);await settled();const cold=await snap();assert.deepEqual(cold,before);row.coldRestoreHash=sha(cold);row.fullStateJournalStorageExact=true;row.coldRestoreExact=true;
   }
   assert.deepEqual(errors,[]);await context.close();
  }row.status='PASS';
 }report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally{await browser.close();await currentServer.close();await baseline.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:report.rows.length,error:report.error}));}
