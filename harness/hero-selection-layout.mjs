import assert from 'node:assert/strict';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tapUI,openSelector} from './ui.mjs';

const out=process.env.HERO_LAYOUT_OUT??'shots/hero-selection-layout';
await mkdir(out,{recursive:true});
console.log('Starting hero layout browser verification');
await build({mode:'e2e',build:{outDir:'shots/hero-selection-build',emptyOutDir:true},logLevel:'error'});
const server=await preview({build:{outDir:'shots/hero-selection-build'},preview:{host:'127.0.0.1',port:5578,strictPort:true},logLevel:'error'});
console.log('Local server ready');
const browser=await chromium.launch({...process.env.HERO_LAYOUT_BROWSER?{executablePath:process.env.HERO_LAYOUT_BROWSER}:{channel:process.platform==='win32'?'msedge':undefined},args:['--disable-gpu']});
console.log('Browser ready');
const paths=['src/game/CharacterSelectScene.ts','src/game/SelectionLayout.ts','src/game/OpeningShowcaseLayout.ts','src/game/SelectionStageView.ts','src/game/HeroPortraitDialog.ts'];
const sourceHashes=Object.fromEntries(await Promise.all(paths.map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceHashes,browser:browser.version(),platform:process.platform,cases:[],starts:[],errors:[]};
const ids=['amo','touye','laohuan','erxiang','azao','xiemu'];
const geometry=page=>page.evaluate(()=>{
 const s=window.__harness.game.scene.getScene('character-select'),nodes=[],targets=[];
 const walk=list=>{for(const o of list){if(o.type==='Text'&&o.visible){const b=o.getBounds();nodes.push({name:o.name,text:o.text,font:parseFloat(o.style.fontSize),x:b.x,y:b.y,width:b.width,height:b.height});}if(o.input?.enabled){const b=o.getBounds();targets.push({name:o.name,x:b.x,y:b.y,width:b.width,height:b.height});}if(o.list)walk(o.list);}};walk(s.view.root.list);
 const image=s.view.root.list.flatMap(o=>o.list??[]).find(o=>o.name==='opening/portrait');
 return {selected:s.selectedId,route:s.selectedRoute,step:s.step,mode:s.modeConfig,nodes,targets,portrait:image?{key:image.texture.key,sourceWidth:image.width,sourceHeight:image.height,scaleX:image.scaleX,scaleY:image.scaleY,crop:image.isCropped?image._crop:null,box:image.getData('openingBounds')}:null,width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};
});
const readStorage=page=>page.evaluate(()=>({local:{...localStorage},run:window.__harness.game.registry.get('runController')?.state??null}));
const overlaps=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
async function check(page,label){
 await page.waitForTimeout(220);const info=await geometry(page);
 await page.screenshot({path:out+'/'+label+'.png',scale:'css'});
 assert.equal(info.overflow,false,label+' document overflow');
 const top=await page.locator('.run-menu-toggle').boundingBox(),mode=info.targets.find(o=>o.name==='action/select-mode');
 assert.ok(top&&mode&&Math.abs(top.y-mode.y)<1&&mode.x+mode.width<=top.x-7,label+' top mode/menu');
 for(const t of info.targets){assert.ok(t.width>=44&&t.height>=44,label+' target '+JSON.stringify(t));assert.ok(t.x>=0&&t.y>=0&&t.x+t.width<=info.width+1&&t.y+t.height<=info.height+1,label+' target bounds '+JSON.stringify(t));}
 const named=info.nodes.filter(o=>o.name.startsWith('opening/')&&o.name!=='opening/selected-mark');
 for(const n of named){assert.ok(n.font>=14,label+' text size '+JSON.stringify(n));assert.ok(n.x>=-1&&n.x+n.width<=info.width+1&&n.y>=-1&&n.y+n.height<=info.height+1,label+' text bounds '+JSON.stringify(n));}
 for(let i=0;i<named.length;i++)for(let j=i+1;j<named.length;j++)assert.ok(!overlaps(named[i],named[j]),label+' text overlap '+JSON.stringify([named[i],named[j]]));
 for(const n of named.filter(o=>['opening/name','opening/skill-tag','opening/skill-hook','opening/skill-conditions'].includes(o.name)))for(const target of info.targets)assert.ok(!overlaps(n,target),label+' text/action overlap '+JSON.stringify([n,target]));
 assert.ok(info.portrait&&info.portrait.scaleX===info.portrait.scaleY,label+' undistorted art');
 report.cases.push({label,...info});return info;
}
async function close(page){await page.locator('dialog[open] .dialog-close').click();await page.waitForTimeout(380);}
try{
 for(const [width,height,safe] of [[320,640,34],[390,740,0],[1366,768,0],[1920,1080,0],[390,528,34],[740,390,0]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:width<640,reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  console.log('Opening viewport',width,height);await page.goto('http://127.0.0.1:5578/?harness=1',{waitUntil:'domcontentloaded'});console.log('Document loaded');await openSelector(page,width<640);console.log('Selector ready');
  if(safe)await page.evaluate(safe=>{document.documentElement.style.setProperty('--safe-bottom',safe+'px');window.__harness.game.scene.getScene('character-select').render();},safe);
  await page.waitForTimeout(400);const storage=await readStorage(page);
  // Change an actual mode option, then retain it while browsing all six heroes.
  await tapUI(page,'character-select','action/select-mode',width<640);
  const toggles=page.locator('dialog[open] input[type=checkbox]');if(await toggles.count())await toggles.last().uncheck();
  await page.getByRole('button',{name:'使用此模式',exact:true}).click();await page.waitForTimeout(380);
  const mode=(await geometry(page)).mode;
  for(const id of ids){
   await tapUI(page,'character-select','character/'+id,width<640);
   await page.waitForFunction(id=>window.__harness.game.scene.getScene('character-select').textures.exists('opening-portrait-'+id),id);
   const label=width+'x'+height+'-'+id,info=await check(page,label);assert.equal(info.selected,id);assert.deepEqual(info.mode,mode);
   await tapUI(page,'character-select','opening/portrait-full',width<640);
   await page.locator('.hero-portrait-view[open] .dialog-portrait').waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('.hero-portrait-view .dialog-portrait')?.naturalWidth===615);
   const art=await page.locator('.hero-portrait-view .dialog-portrait').evaluate(i=>{const b=i.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,fit:getComputedStyle(i).objectFit};});
   assert.equal(art.fit,'contain');assert.ok(art.x>=0&&art.y>=0&&art.x+art.width<=width+1&&art.y+art.height<=height+1);
   if(id==='azao')await page.screenshot({path:out+'/'+label+'-full.png'});
   await page.keyboard.press('Escape');await page.waitForTimeout(380);assert.equal((await geometry(page)).selected,id);
   await tapUI(page,'character-select','opening/hero-details',width<640);
   assert.equal(await page.locator('.hero-story').getAttribute('open'),null);
   await page.locator('.hero-story summary').click();await page.locator('.hero-example summary').click();
   if(id==='azao')await page.screenshot({path:out+'/'+label+'-story.png'});
   await close(page);assert.equal((await geometry(page)).selected,id);assert.deepEqual((await geometry(page)).mode,mode);
   await tapUI(page,'character-select','action/opening-sample',width<640);await page.locator('.selection-sample[open] .sample-toggle').click();await close(page);
   assert.equal((await geometry(page)).selected,id);assert.deepEqual(await readStorage(page),storage,'browsing never changes run/storage');
  }
  await tapUI(page,'character-select','action/confirm-character',width<640);
  for(const route of ['group','straight','flush']){await tapUI(page,'character-select','route/'+route,width<640);await check(page,width+'x'+height+'-route-'+route);await tapUI(page,'character-select','action/opening-sample',width<640);await close(page);assert.equal((await geometry(page)).route,route);}
  await tapUI(page,'character-select','opening/portrait-full',width<640);await page.setViewportSize({width:width<640?320:1280,height:height<600?640:720});await close(page);
  const after=await geometry(page);assert.equal(after.selected,'xiemu');assert.equal(after.route,'flush');assert.deepEqual(after.mode,mode);assert.deepEqual(await readStorage(page),storage);
  if(width===320||width===1366){
   await tapUI(page,'character-select','action/confirm-character',width<640);
   await page.waitForFunction(()=>window.__harness.game.scene.isActive('shop')&&window.__harness.game.scene.getScene('shop').ready);
   const saved=await page.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,storage:await c.store.read()};});
   assert.equal(saved.state.characterId,'xiemu');assert.equal(saved.state.mode,mode.mode);assert.equal(saved.state.programsEnabled,mode.programsEnabled);assert.deepEqual(saved.storage.current.state,saved.state);
   await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__harness?.game.scene.isActive('title')&&window.__harness.game.registry.get('runController')?.state);
   assert.deepEqual((await readStorage(page)).run,saved.state);report.starts.push({width,mode,characterId:saved.state.characterId,route:'flush',persistedAndColdRestored:true});
  }
  await context.close();console.log('PASS',width,height);
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack??String(error);process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(report.status,report.cases.length,report.error??'');await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
