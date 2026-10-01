import {openSelector,tapUI,chooseCharacter,buyOffer} from './ui.mjs';
/** Actual user inputs and storage fault injection; no private game actions or resource/state shortcuts. */
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),port=5204;
const output=path.resolve(root,process.env.RECOVERY_EVIDENCE_DIR||'shots/recovery');await mkdir(output,{recursive:true});
const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),dirtyState:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),checks:[],limitations:['Windows Chromium and touchscreen emulation; physical phones/human acceptance NOT_RUN.','Current five-joker r2 build; not a full chapter/Boss or balance evaluation.']};
const mark=check=>{report.checks.push(check);console.log(`${check.name}: ${check.status}`);};
const ssr=await createServer({root,server:{middlewareMode:true,hmr:false},appType:'custom'}),domain=await ssr.ssrLoadModule('/src/domain/run.ts'),checkpoints=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--mode','e2e','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore',windowsHide:true});
const base=`http://localhost:${port}/?harness=1&seed=r03-651`; // Same natural 514 pair golden, new24-card shop pool.
let browser;
const waitScene=(page,key)=>page.waitForFunction(key=>window.__harness?.game.scene.getScene(key)?.scene.isActive(),key);
const read=page=>page.evaluate(()=>{const run=window.__harness.game.registry.get('runController');return run?{state:run.state,journal:run.journal,status:run.status}:null;});
async function slots(page){return page.evaluate(async()=>{const {IndexedDbSave}=await import('/src/platform/IndexedDbSave.ts');return new IndexedDbSave().read();});}
async function menu(page){const button=page.getByRole('button',{name:'菜单',exact:true});if(await button.getAttribute('aria-expanded')!=='true')await button.click();const tools=page.locator('.run-menu details');if(await tools.getAttribute('open')===null)await tools.locator('summary').click();}
async function advanced(page,seq){await page.waitForFunction(seq=>window.__harness.game.registry.get('runController')?.state.commandSeq>seq,seq);}
async function start(name,{amo=false,touch=false,video=false,audioFailure=false}={}){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},hasTouch:touch,...(video?{recordVideo:{dir:output,size:{width:960,height:600}}}:{})});
  if(audioFailure)await context.addInitScript(()=>{window.AudioContext=class {constructor(){throw new DOMException('blocked audio','NotAllowedError');}};});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
  try {await page.goto(base);await openSelector(page);await chooseCharacter(page,amo?'amo':'erxiang',touch);}
  catch(error){mark({name:`startup/${name}`,status:'FAIL',errors});throw error;}
  return {context,page,errors,touch,video,name};
}
async function close(test){assert.deepEqual(test.errors,[],`${test.name}: no page errors`);const video=test.video?test.page.video():null;await test.context.close();if(video){const source=await video.path(),target=path.join(output,`${test.name}.webm`);await video.saveAs(target);if(source!==target){const {unlink}=await import('node:fs/promises');await unlink(source);}}}
async function buy(page,definition='mantangcai',touch=false){const before=await read(page),offers=before.state.shop.offers.filter(o=>!o.consumed),i=offers.findIndex(o=>o.definitionId===definition);assert.ok(i>=0);await buyOffer(page,offers[i].offerId,touch);await advanced(page,before.state.commandSeq);return read(page);}
async function enter(page,touch=false){await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.registry.get('runController').state.phase==='await-input'&&window.__harness.game.scene.getScene('game').cardViews.length>0);}
async function play(page,ids,touch=false){const before=await read(page);for(const id of ids)await tapUI(page,'game','card/'+id,touch);await tapUI(page,'game','action/play',touch);await advanced(page,before.state.commandSeq);return read(page);}
async function restored(page,before,name){
  const saved=await slots(page);assert.deepEqual(saved.current.state,before.state);const hash=domain.stateHash(before.state);
  await page.reload();await openSelector(page);assert.deepEqual((await read(page)).state,before.state);assert.deepEqual(await slots(page),saved);
  await menu(page);await page.getByRole('button',{name:'继续本局',exact:true}).click();
  await waitScene(page,before.state.phase==='shop'?'shop':before.state.phase==='await-input'?'game':'intermission');
  assert.deepEqual((await read(page)).state,before.state);assert.equal(domain.stateHash((await read(page)).state),hash);
  await page.screenshot({path:path.join(output,`${name}-restored.png`)});
  return {stateHash:hash,commandSeq:before.state.commandSeq,gold:before.state.gold,revision:saved.revision};
}
async function refreshMatrix(){
  for(const name of ['character-confirmed','shop-first-shown','bought','rerolled','play-committed','during-presentation','reward-published']){
    const test=await start(name,{amo:name==='play-committed',touch:name==='during-presentation',video:name==='during-presentation'}),{page,touch}=test;
    try {
      if(['bought','rerolled','during-presentation','reward-published'].includes(name))await buy(page,'mantangcai',touch);
      if(name==='rerolled'){const before=await read(page);await tapUI(page,'shop','action/reroll',touch);await advanced(page,before.state.commandSeq);assert.equal((await read(page)).state.shop.rerollCount,1);}
      if(['play-committed','during-presentation','reward-published'].includes(name)){
        await enter(page,touch);const ids=name==='play-committed'?[(await read(page)).state.handOrder[0]]:['clubs-14','hearts-14'];await play(page,ids,touch);
        if(name==='during-presentation')await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').resultText.text.includes('计分牌'));
        if(name==='reward-published')await waitScene(page,'intermission');
      }
      const before=await read(page),result=await restored(page,before,name);
      if(name==='play-committed'){
        await menu(page);await page.getByRole('button',{name:'回看上一手',exact:true}).click();await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing);assert.deepEqual((await read(page)).state,before.state);
      }
      if(name==='reward-published'){
        await tapUI(page,'intermission','action/continue-stage');await waitScene(page,'shop');assert.equal((await read(page)).state.gold,before.state.gold);assert.equal((await read(page)).state.commandSeq,before.state.commandSeq+1);
      }
      mark({name:`refresh/${name}`,status:'PASS',...result});
    }finally{await close(test);}
  }
}
async function speeds(){
  let expected;
  for(const mode of ['1','2','4','fast-forward','audio-denied']){
    const test=await start(`playback-${mode}`,{amo:true,audioFailure:mode==='audio-denied'}),{page}=test;
    try {
      await enter(page);if(['2','4'].includes(mode)){await menu(page);await page.getByLabel('演出速度').selectOption(mode);await page.getByRole('button',{name:'菜单',exact:true}).click();}
      const before=await read(page);await play(page,[before.state.handOrder[0]]);
      if(mode==='fast-forward'){await menu(page);await page.getByRole('button',{name:'快进当前手',exact:true}).click();}
      await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing);
      const after=await read(page);if(!expected)expected=after.state;else assert.deepEqual(after.state,expected);
      if(mode==='4'){await page.reload();await openSelector(page);await menu(page);assert.equal(await page.getByLabel('演出速度').inputValue(),'4');}
      mark({name:`playback/${mode}`,status:'PASS',stateHash:domain.stateHash(after.state)});
    }finally{await close(test);}
  }
}
async function quota(){
  const test=await start('quota'),{page}=test;
  try {
    const before=await read(page),durable=await slots(page);
    await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='saves'&&args[1]==='meta')throw new DOMException('injected quota after checkpoint put','QuotaExceededError');return Reflect.apply(original,this,args);};window.restoreStorage=()=>IDBObjectStore.prototype.put=original;});
    const offers=before.state.shop.offers.filter(o=>!o.consumed),i=offers.findIndex(o=>o.definitionId==='mantangcai');await buyOffer(page,offers[i].offerId);
    await page.getByText(/未保存：存储空间不足/).waitFor();assert.deepEqual((await read(page)).state,before.state);assert.deepEqual(await slots(page),durable);
    await tapUI(page,'shop','action/reroll');assert.deepEqual((await read(page)).state,before.state);
    const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'导出本局',exact:true}).click()]);const file=path.join(output,'unsaved-quota-checkpoint.json');await download.saveAs(file);
    const exported=JSON.parse(await readFile(file,'utf8'));assert.ok(checkpoints.readCheckpoint(exported).ok);assert.equal(exported.state.gold,2);
    await page.evaluate(()=>window.restoreStorage());await page.getByRole('button',{name:'重试保存',exact:true}).click();await page.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='idle');await waitScene(page,'shop');
    const retried=await read(page);assert.deepEqual(retried.state,exported.state);assert.equal(retried.state.jokers.length,1);assert.equal(retried.state.commandSeq,before.state.commandSeq+1);
    await restored(page,retried,'quota-retry');mark({name:'quota/pause-export-retry',status:'PASS',stateHash:domain.stateHash(retried.state),atomicRevisionBefore:durable.revision,atomicRevisionAfter:(await slots(page)).revision});
  }finally{await close(test);}
}
async function changeStored(page,mutate){
  await page.evaluate(async source=>{
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('dachoupai-checkpoints',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves'),meta=store.get('meta');meta.onsuccess=()=>{const get=store.get(meta.result.slotKey);get.onsuccess=()=>{const record=get.result;if(source==='corrupt')record.current.checksum='broken';else{record.current.state.contentHash='old-content';record.previous=null;}store.put(record,meta.result.slotKey);};};tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();
  },mutate);
}
async function badData(){
  for(const mode of ['corrupt','incompatible']){
    const test=await start(`data-${mode}`),{page}=test;
    try {
      await buy(page);const valid=await slots(page);await changeStored(page,mode);const raw=await slots(page);await page.reload();await openSelector(page);
      if(mode==='corrupt'){assert.deepEqual((await read(page)).state,valid.previous.state);await page.getByText(/已读取上次有效备份/).waitFor();}
      else {assert.equal(await read(page),null);await page.getByText(/存档损坏或版本不兼容/).waitFor();}
      assert.deepEqual(await slots(page),raw);
      const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'导出保留数据',exact:true}).click()]);const file=path.join(output,`retained-${mode}.json`);await download.saveAs(file);const exported=JSON.parse(await readFile(file,'utf8'));assert.ok(exported.records.some(r=>JSON.stringify(r.value).includes(mode==='corrupt'?'broken':'old-content')));
      await page.getByRole('button',{name:'菜单',exact:true}).click();await chooseCharacter(page,'amo');const current=await read(page);assert.equal(current.state.gold,6);
      const retained=await page.evaluate(async()=>{const {IndexedDbSave}=await import('/src/platform/IndexedDbSave.ts');return new IndexedDbSave().exportRetained();});assert.ok(retained.includes(mode==='corrupt'?'broken':'old-content'));
      mark({name:`data/${mode}-backup-retained`,status:'PASS'});
    }finally{await close(test);}
  }
  const test=await start('imports'),{page}=test;
  try {
    const before=await read(page),saved=await slots(page);await menu(page);
    for(const value of [{format:'dachoupai-checkpoint',state:null},JSON.parse('{"__proto__":{"polluted":true}}'),{...saved.current,state:{...saved.current.state,assetUrl:'https://evil.invalid/a.js'}}]){
      const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await (await chooser).setFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(value))});await page.getByText(/导入失败：/).waitFor();assert.deepEqual((await read(page)).state,before.state);assert.deepEqual(await slots(page),saved);
    }
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await (await chooser).setFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved.current))});await waitScene(page,'shop');await page.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='idle');assert.deepEqual((await read(page)).state,before.state);
    mark({name:'import/illegal-rejected-valid-roundtrip',status:'PASS',stateHash:domain.stateHash(before.state)});
  }finally{await close(test);}
}
async function tabs(){
  const test=await start('two-tabs'),first=test.page,second=await test.context.newPage();second.on('pageerror',e=>test.errors.push(String(e)));second.on('dialog',d=>d.accept());
  try {
    await second.goto(base);await waitScene(second,'character-select');await second.getByText(/本页只读/).waitFor();const before=await slots(first);
    await second.getByRole('button',{name:'继续本局',exact:true}).click();await waitScene(second,'shop');await tapUI(second,'shop','action/reroll');assert.deepEqual(await slots(second),before);
    await menu(second);await second.getByRole('button',{name:'接管写入',exact:true}).click();await second.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='idle'&&document.querySelector('.run-menu>button').getAttribute('aria-expanded')==='false');await buy(second);
    const written=await slots(second);assert.equal(written.current.state.gold,2);await first.getByText(/本页只读/).waitFor();await tapUI(first,'shop','action/reroll');assert.deepEqual(await slots(first),written);
    mark({name:'tabs/readonly-explicit-takeover',status:'PASS',stateHash:domain.stateHash(written.current.state)});
  }catch(error){
    const snapshot=await second.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession(),g=window.__harness.game,shop=g.scene.getScene('shop');return {writable:s.lease.writable,working:s.working,notice:s.notice,status:s.run?.status,lastError:s.run?.lastError,state:s.run?.state,shopActive:shop.scene.isActive(),shopBusy:shop.busy,shopState:shop.run,menuText:document.querySelector('.run-menu').textContent};});
    mark({name:'tabs/failure-observation',status:'FAIL',snapshot});await second.screenshot({path:path.join(output,'tabs-failure.png')});throw error;
  }finally{await close(test);}
}
async function interruption(){
  const test=await start('scene-interruption',{video:true}),{page}=test;
  try {
    await buy(page);await enter(page);await play(page,['clubs-14','hearts-14']);const committed=(await read(page)).state;
    await menu(page);await page.getByRole('button',{name:'保存并退出',exact:true}).click();await openSelector(page);assert.deepEqual((await read(page)).state,committed);
    await chooseCharacter(page,'amo');await enter(page);const fresh=await read(page);assert.equal(fresh.state.characterId,'amo');assert.equal(fresh.state.stage.playIndex,0);
    await play(page,[fresh.state.handOrder[0]]);await page.waitForFunction(()=>!window.__harness.game.scene.getScene('game').playing);
    const finished=await read(page);assert.equal(finished.state.stage.playIndex,1);assert.equal(finished.state.stage.handsLeft,3);assert.equal(finished.state.stage.discardsLeft,3);
    const resources=domain.stateHash(finished.state),before=await page.evaluate(()=>{const g=window.__harness.game.scene.getScene('game');return {children:g.children.length,shutdownListeners:g.events.listenerCount('shutdown')};});
    for(let i=0;i<100;i++){await menu(page);await page.getByRole('button',{name:'继续本局',exact:true}).click();await waitScene(page,'game');}
    const after=await page.evaluate(()=>{const g=window.__harness.game.scene.getScene('game');return {children:g.children.length,shutdownListeners:g.events.listenerCount('shutdown')};});assert.deepEqual(after,before);assert.equal(domain.stateHash((await read(page)).state),resources);
    mark({name:'scene/exit-new-run-no-stale-callbacks-100-reentries',status:'PASS',stateHash:resources,observations:{before,after}});
  }finally{await close(test);}
}
try {
  const deadline=Date.now()+30000;while(true){try{if((await fetch(base)).ok)break;}catch{}if(Date.now()>deadline)throw Error('server timeout');await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch();report.browser=browser.version();
  if(process.argv.includes('--tabs')){const count=Number(process.argv.find(a=>a.startsWith('--repeat='))?.split('=')[1]??1);assert.ok(Number.isInteger(count)&&count>=1&&count<=20);report.scope=`tabs only, ${count} distinct contexts`;for(let i=0;i<count;i++)await tabs();}
  else {report.scope='full recovery suite';await refreshMatrix();await speeds();await quota();await badData();await tabs();await interruption();}report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);console.error(error);process.exitCode=1;}
finally {await browser?.close();server.kill();await ssr.close();await writeFile(path.join(output,'recovery.json'),JSON.stringify(report,null,2)+'\n');console.log(`recovery: ${report.status}; ${report.checks.length} actual scenarios`);}
