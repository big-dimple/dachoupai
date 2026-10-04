/** Actual version-menu clicks; only dirty/unknown build metadata use fixtures. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter,tapUI,waitScene} from './ui.mjs';

const dir='shots/build-info-menu',buildDir=dir+'/build',port=5293;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','freeze tracked source before validation');
await mkdir(dir,{recursive:true});
const metadata=JSON.parse(await readFile(buildDir+'/build-info.json','utf8'));
assert.equal(metadata.revision,source);assert.equal(metadata.sourceStatus,'clean');assert.equal(metadata.modified,false);
const html=await readFile(buildDir+'/index.html','utf8'),asset=html.match(/src="([^"]+\.js)"/)[1].replace(/^\.\//,'').replace(/^\//,'');
const original=await readFile(buildDir+'/'+asset,'utf8');
const literal=/\{version:"C03",builtAt:"[^"\n]+",revision:"[a-f0-9]{40}",sourceStatus:"clean",modified:!1\}/g;
assert.equal([...original.matchAll(literal)].length,1,'exactly one embedded metadata object');
const embedded=JSON.parse([...original.matchAll(literal)][0][0].replace(/\b(version|builtAt|revision|sourceStatus|modified):/g,'"$1":').replace('!1','false'));
assert.deepEqual(embedded,metadata,'emitted identity equals the original executable bundle identity');
const {version,revision,builtAt}=metadata;
const cases=[
  {name:'clean',fixture:false,metadata,expected:'构建时：已核对，没有未提交修改。'},
  {name:'dirty',fixture:true,metadata:{version,revision,builtAt,sourceStatus:'dirty',modified:true,modifiedFileCount:3,modifiedFiles:['src/game/RunMenu.ts','src/platform/buildInfo.ts','src/diagnostics/'+('long folder/').repeat(9)+'with space/version-status.ts']},expected:'构建时：有尚未提交的文件修改（3 个文件）。'},
  {name:'unknown',fixture:true,metadata:{version,revision,builtAt,sourceStatus:'unknown',modified:null},expected:'构建时：无法核对文件是否有修改。'},
];
const report={status:'IN_PROGRESS',testedCommit:source,build:metadata,emittedEqualsEmbeddedIdentity:true,bundle:{file:asset,sha256:hash(Buffer.from(original))},viewport:{width:390,height:740},DPR:1,cases:[],images:[],uncaughtPageErrors:[],forbiddenMetadataRequests:0,limits:['Headless software Canvas/touch at one viewport; real phone/GPU/listening NOT_RUN.','Clean uses the actual unmodified bundle. Dirty/unknown replace only its embedded metadata object before execution; they do not diagnose an actual dirty/failed deployed build.','One ordinary new run to await-input, no scoring/discard/tool/score/RNG injection. Subsequent cases continue the same saved run in the same browser context.','No HTTP request to /build-info.json or external deployed endpoint. No game/domain/save code is replaced.']};
const server=await preview({build:{outDir:buildDir},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const context=await browser.newContext({viewport:report.viewport,deviceScaleFactor:1,hasTouch:true,reducedMotion:'no-preference',acceptDownloads:true});
report.browser=browser.version();
const snapshot=page=>page.evaluate(async()=>{
  const game=window.__harness.game,controller=game.registry.get('runController'),scene=game.scene.getScene('game');
  const records=await new Promise((resolve,reject)=>{
    const request=indexedDB.open('dachoupai-checkpoints',1);request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result,transaction=db.transaction('saves','readonly'),store=transaction.objectStore('saves'),keys=store.getAllKeys(),values=store.getAll();transaction.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result});};transaction.onerror=transaction.onabort=()=>reject(transaction.error);};
  });
  return{checkpoint:JSON.parse(controller.exportJSON()),records,selected:[...scene.selectedIds],status:controller.status,renderer:game.renderer.gl?'WebGL':'Canvas'};
});
const ready=page=>page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&s.ready&&!s.playing&&!s.presentation&&s.cardViews.length&&s.cardViews.every(c=>!c.dealing&&!c.back?.visible&&!s.tweens.isTweening(c.container));},null,{timeout:30000});
let golden,lastStep='boot',currentCase='clean';
const page=await context.newPage();
page.on('pageerror',error=>report.uncaughtPageErrors.push(String(error)));
page.on('request',request=>{if(new URL(request.url()).pathname.endsWith('/build-info.json'))report.forbiddenMetadataRequests++;});
try {
  for(const sample of cases){
    currentCase=sample.name;lastStep='load-title';let servedMetadataFixtures=0;
    await page.unrouteAll();
    if(sample.fixture)await page.route('**/'+asset,route=>{servedMetadataFixtures++;return route.fulfill({contentType:'application/javascript',body:original.replace(literal,JSON.stringify(sample.metadata))});});
    if(sample.name==='clean')await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=build-menu-tristate`);else await page.reload();
    await waitScene(page,'title');
    if(sample.name==='clean'){
      lastStep='native-new-run';
      await chooseCharacter(page,'amo',true);await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
      await tapUI(page,'shop','action/start-stage',true);
    }else{
      lastStep='wait-native-continue-enabled';
      await page.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('title'),walk=list=>list.some(o=>o.name==='action/title-continue'&&o.input?.enabled||o.list&&walk(o.list));return g.registry.get('runController')?.status==='idle'&&s.scene.isActive()&&walk(s.children.list);},null,{timeout:30000});
      await tapUI(page,'title','action/title-continue',true);
    }
    lastStep='wait-game-ready';
    await waitScene(page,'game');await ready(page);
    const held=await page.evaluate(()=>window.__harness.game.scene.getScene('game').hand[0].id);await tapUI(page,'game','card/'+held,true);
    const before=await snapshot(page);assert.equal(before.status,'idle');assert.equal(before.renderer,'Canvas');
    if(golden){assert.deepEqual(before.checkpoint,golden.checkpoint);assert.deepEqual(before.records,golden.records);}else golden=before;
    lastStep='open-version';const toggle=page.locator('.run-menu-toggle'),anchor=await toggle.boundingBox();await page.getByRole('button',{name:'菜单',exact:true}).tap();
    const tools=page.locator('.run-menu-panel > details').filter({has:page.locator('summary',{hasText:'本局与版本'})});
    await tools.locator('summary').tap();await page.getByRole('button',{name:'版本信息',exact:true}).tap();
    const info=tools.locator('p');
    await page.waitForFunction(expected=>[...document.querySelectorAll('.run-menu-panel details p')].some(p=>p.textContent.includes(expected)),sample.expected);
    const displayed=await info.innerText();assert.ok(displayed.includes(`版本 ${version} · ${revision.slice(0,12)}`));assert.ok(displayed.includes(`构建时间 ${builtAt}`));assert.ok(displayed.includes('当前可玩内容：72张大丑牌'));
    assert.ok(!displayed.includes('含本地修改'));
    if(sample.name==='dirty')for(const path of sample.metadata.modifiedFiles)assert.ok(displayed.includes(path));
    else assert.ok(!displayed.includes('修改文件（项目内路径）'));
    if(sample.name==='unknown'){assert.ok(displayed.includes('无法核对'));assert.ok(!displayed.includes('已核对，没有未提交修改'));assert.ok(!displayed.includes('尚未提交的文件修改'));}
    await info.scrollIntoViewIfNeeded();const box=await info.boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=390&&box.y>=0&&box.y+box.height<=740,'version body fully visible after native panel scroll');
    const closeBox=await toggle.boundingBox();assert.ok(anchor&&closeBox);assert.deepEqual(closeBox,anchor,'long text cannot move the fixed close control');assert.ok(closeBox.x+closeBox.width<=390&&closeBox.y+closeBox.height<=740);
    const image=`${sample.name==='clean'?'01':sample.name==='dirty'?'02':'03'}-version-${sample.name}${sample.fixture?'-fixture':''}.png`;
    await page.screenshot({path:dir+'/'+image,fullPage:true});const bytes=await readFile(dir+'/'+image);report.images.push({file:image,sha256:hash(bytes),fixture:sample.fixture});
    assert.deepEqual(await snapshot(page),before,'version menu and screenshot cannot change run/storage/selection');
    let exported=false;
    if(sample.name==='clean'){
      const saveTools=page.locator('.run-menu-panel > details').filter({has:page.locator('summary',{hasText:'进度与存档'})});await saveTools.locator('summary').tap();
      const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'导出本局',exact:true}).tap()]);await download.saveAs(dir+'/exported-checkpoint.json');assert.deepEqual(JSON.parse(await readFile(dir+'/exported-checkpoint.json','utf8')),before.checkpoint);exported=true;
    }
    await page.getByRole('button',{name:'继续本局',exact:true}).tap();assert.deepEqual(await snapshot(page),before,'ordinary resume preserves complete checkpoint/storage/selection');
    assert.equal(servedMetadataFixtures,sample.fixture?1:0);
    report.cases.push({name:sample.name,fixture:sample.fixture,metadata:sample.metadata,displayed,checkpointAndAllStorageEqual:true,selectionPreserved:true,nativeExportMatchesCheckpoint:exported,sourceBundleMetadataReplacements:servedMetadataFixtures,visibleBounds:box,closeControlUnmoved:true,closeBounds:closeBox});
  }
  assert.equal(report.forbiddenMetadataRequests,0);assert.deepEqual(report.uncaughtPageErrors,[]);
  assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source);
  assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'');
  report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);report.lastStep={case:currentCase,step:lastStep};report.diagnostic=await page.evaluate(()=>{const g=window.__harness?.game,s=g?.scene.getScene('game');return{active:g?.scene.getScenes(true).map(x=>x.scene.key),controllerStatus:g?.registry.get('runController')?.status,gameReady:s?.ready,playing:s?.playing,presentation:!!s?.presentation,openDialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.innerText)};}).catch(()=>null);process.exitCode=1;}
finally{await context.close();await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));await writeFile(dir+'/menu-report.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({status:report.status,error:report.error,testedCommit:source,cases:report.cases.map(x=>({name:x.name,fixture:x.fixture,checkpointAndAllStorageEqual:x.checkpointAndAllStorageEqual})),images:report.images,forbiddenMetadataRequests:report.forbiddenMetadataRequests}));
