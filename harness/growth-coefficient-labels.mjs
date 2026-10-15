import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tapUI,waitScene} from './ui.mjs';

const baseline=process.env.COEFFICIENT_BASELINE==='1';
const out=process.env.COEFFICIENT_OUT||'/tmp/growth-coefficient-labels';
const baselineReport=process.env.COEFFICIENT_COMPARE?JSON.parse(await readFile(process.env.COEFFICIENT_COMPARE,'utf8')):undefined;
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:out+'/vite-cache',optimizeDeps:{noDiscovery:true,include:['phaser']},server:{host:'127.0.0.1',port:5468,strictPort:true},logLevel:'error'});
await server.listen();
const {growthSelectionPlan}=await server.ssrLoadModule('/harness/fixtures/growth-selection.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {fractionText}=await server.ssrLoadModule('/src/game/scoreText.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const sourceFiles=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','src','tests','harness'],{encoding:'utf8'}).trim().split('\n').sort();
const fingerprint=async()=>hash(await Promise.all(sourceFiles.map(async file=>[file,hash(await readFile(file,'utf8'))])));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),sourceBefore:await fingerprint(),browser:browser.version(),baseline,scope:'Controlled current-identity saved coefficients; native import/select/details/close/deselect, no PlayHand or natural play. Phaser software Canvas; no physical device approval.',cases:[]};
const specs=[{name:'twice',value:{n:'1587',d:'800'},short:'×≈1.98'},{name:'thrice',value:{n:'36501',d:'16000'},short:'×≈2.28'},{name:'cap',value:{n:'1000000',d:'1'},short:'×100万'}];

async function persisted(page){return page.evaluate(async()=>{
 const c=window.__harness.game.registry.get('runController');
 const storage=await new Promise((resolve,reject)=>{const q=indexedDB.open('dachoupai-checkpoints');q.onerror=()=>reject(q.error);q.onsuccess=()=>{const db=q.result,tx=db.transaction('saves','readonly'),cursor=tx.objectStore('saves').openCursor(),rows=[];cursor.onsuccess=()=>{const r=cursor.result;if(r){rows.push({key:r.key,value:r.value});r.continue();}};tx.oncomplete=()=>{db.close();resolve(rows);};tx.onerror=()=>reject(tx.error);};});
 return {state:c.state,journal:c.journal,export:c.exportJSON(),storage};
 });}
async function importState(page,state){
 const checkpoint=makeCheckpoint(state,[]);assert.ok(readCheckpoint(checkpoint).ok,'strict fixture checkpoint');
 await page.locator('.run-menu-toggle').click();const section=page.getByText('进度与存档',{exact:true}).locator('..');
 if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();
 await(await chooser).setFiles({name:'coefficient-label.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
 await waitScene(page,'game');await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.presentation&&s.cardViews.every(c=>!c.dealing&&!s.tweens.isTweening(c.container));});
 assert.deepEqual((await persisted(page)).state,state);
}
async function observe(page){return page.evaluate(()=>{
 const s=window.__harness.game.scene.getScene('game'),v=s.jokerViews.get('controlled/a06'),l=v.getData('valueLabel');
 return {text:l.text,bounds:l.getBounds(),room:l.getData('labelRoom'),font:l.style.fontSize,scale:[l.scaleX,l.scaleY],full:l.getData('fullText'),readiness:v.getData('selectionReadiness'),selectionLabel:v.getData('selectionLabel'),slots:s.run.jokers.length,selected:[...s.selectedIds],type:s.selectionPreview()?.type};
 });}
try{
 for(const width of [1366,390]){
  const height=width===390?740:768,touch=width===390;
  const page=await browser.newPage({viewport:{width,height},hasTouch:touch,deviceScaleFactor:touch?3:1,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
  try{
   await page.goto('http://127.0.0.1:5468/?harness=1');await waitScene(page,'title');
   for(const spec of specs){
    const key=width+'-'+spec.name,row={key,width,height,value:spec.value,expected:spec.short};report.cases.push(row);
    const plan=growthSelectionPlan(),s=plan.state,a06=r2CreateJoker('a06','controlled/a06',4,'none',s);a06.growth.coefficient=spec.value;s.jokers.unshift(a06);
    for(const [id,growthKey,n]of [['c05','pendingHeat','40'],['c04','heat','10'],['b10','heat','100']]){const j=r2CreateJoker(id,'controlled/'+id,4,'none',s);j.growth[growthKey]={n,d:'1'};s.jokers.push(j);}s.stage.initialJokerIds=s.jokers.map(j=>j.instanceId);
    await importState(page,s);const before=await persisted(page);row.stateHash=hash(before);
    row.idle=await observe(page);
    for(const id of plan.fullHouse)await tapUI(page,'game','card/'+id,touch);
    row.selected=await observe(page);assert.equal(row.selected.type,'full-house');assert.equal(row.selected.readiness,'ready');
    await page.screenshot({path:out+'/'+key+'-selected.png',scale:'css'});
    await tapUI(page,'game','selection/source-benefits',touch);
    const dialog=page.locator('.detail-dialog[open]');await dialog.waitFor();row.detail=await dialog.innerText();
    assert.ok(row.detail.includes('本手读取：倍率×'+fractionText(spec.value)),'exact read remains in detail');
    const prior=baselineReport?.cases.find(r=>r.key===key);if(baselineReport){assert.ok(prior);assert.equal(row.detail,prior.detail,'complete detail text unchanged from e5279f4');row.detailUnchanged=true;}
    await page.screenshot({path:out+'/'+key+'-detail.png',scale:'css'});
    await page.getByRole('button',{name:'关闭',exact:true}).click();assert.deepEqual(await persisted(page),before);
    for(const id of plan.fullHouse)await tapUI(page,'game','card/'+id,touch);
    row.deselected=await observe(page);assert.equal(row.deselected.text,row.idle.text);
    for(const id of plan.fullHouse.slice(0,2))await tapUI(page,'game','card/'+id,touch);
    row.pair=await observe(page);assert.equal(row.pair.readiness,'unmet');assert.equal(row.pair.selectionLabel,'本手不读取');
    assert.deepEqual(await persisted(page),before);row.readOnly=true;
    for(const observation of [row.idle,row.selected,row.deselected,row.pair]){
     assert.equal(observation.slots,5);assert.equal(observation.font,'14px');assert.deepEqual(observation.scale,[1,1]);assert.ok(observation.bounds.width<=observation.room+.1);assert.ok(observation.bounds.x>=0&&observation.bounds.x+observation.bounds.width<=width+.1);
    }
    if(!baseline){for(const observation of [row.idle,row.selected,row.deselected]){assert.ok(observation.text.endsWith(spec.short),'compact numeric label, not generic status: '+observation.text);assert.ok(!observation.text.includes('/'));}assert.ok(!row.pair.text.includes('状态'));}
    row.status=baseline?'OBSERVED':'PASS';
   }
   assert.deepEqual(errors,[]);
  }finally{await page.close();}
 }
 report.status=baseline?'BASELINE_OBSERVED':'PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack||e);process.exitCode=1;}
finally{
 report.sourceAfter=await fingerprint();if(report.sourceAfter!==report.sourceBefore){report.status='FAIL';report.error='Source changed during verification';process.exitCode=1;}
 await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.map(r=>({key:r.key,idle:r.idle?.text,selected:r.selected?.text,status:r.status}))}));
 await browser.close();await server.close();
}
