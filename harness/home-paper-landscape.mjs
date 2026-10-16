import assert from 'node:assert/strict';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,confirmHeroRoute} from './ui.mjs';
const out=process.env.HOME_OUT??'shots/home-paper-landscape';await mkdir(out,{recursive:true});
const baseline='fa5b30ee1ebf28d4ee71d676b231eab260172033',oldTitle=execFileSync('git',['show',baseline+':src/game/TitleScene.ts'],{encoding:'utf8'});
const report={base:baseline,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baselineTitleBlob:execFileSync('git',['rev-parse',baseline+':src/game/TitleScene.ts'],{encoding:'utf8'}).trim(),sourceHashes:{},cases:[],errors:[]};
for(const path of ['src/game/TitleScene.ts','src/game/HomePage.ts','src/game/HomePage.css'])report.sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');
const browser=await chromium.launch({...process.env.HOME_BROWSER?{executablePath:process.env.HOME_BROWSER}:{channel:process.platform==='win32'?'msedge':undefined},args:['--disable-gpu']});report.browser=browser.version();report.platform=process.platform;
let server;
const specs=[[320,740],[390,844],[1366,768]];
async function serve(before=false){
 await build({mode:'e2e',plugins:before?[{name:'read-only-baseline-title',enforce:'pre',transform(_code,id){if(id.split('?')[0].replaceAll('\\','/').endsWith('/src/game/TitleScene.ts'))return {code:oldTitle,map:null};}}]:[],build:{outDir:before?'shots/home-before-build':'shots/home-after-build',emptyOutDir:true},logLevel:'error'});
 server=await preview({build:{outDir:before?'shots/home-before-build':'shots/home-after-build'},preview:{host:'127.0.0.1',port:5586,strictPort:true},logLevel:'error'});
}
async function stop(){server.httpServer.closeAllConnections();await new Promise(resolve=>server.httpServer.close(resolve));server=undefined;}
const snapshot=page=>page.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return c?{state:c.state,journal:c.journal,storage:await c.store.read()}:null;});
const shot=(page,name)=>page.screenshot({path:out+'/'+name+'.png',scale:'css'});
async function check(page,label){
 await page.waitForTimeout(950);const info=await page.evaluate(()=>{const root=document.querySelector('.title-home'),menu=document.querySelector('.run-menu-toggle'),box=e=>{const b=e.getBoundingClientRect();return {text:e.textContent.trim(),x:b.x,y:b.y,width:b.width,height:b.height};};return {root:{scrollWidth:root.scrollWidth,clientWidth:root.clientWidth,scrollHeight:root.scrollHeight,clientHeight:root.clientHeight},width:innerWidth,height:innerHeight,heading:box(root.querySelector('h1')),copy:[...root.querySelectorAll('.home-save span,.home-hint,.home-notice:not([hidden])')].map(box),buttons:[...root.querySelectorAll('button:not([hidden])')].map(e=>({...box(e),disabled:e.disabled})),stamp:box(root.querySelector('.load-seal')),menu:box(menu),landscape:root.querySelectorAll('.load-landscape path').length,suits:root.querySelectorAll('.load-card svg').length,text:root.innerText};});
 await shot(page,label);assert.ok(info.root.scrollWidth<=info.root.clientWidth+1,label+' root horizontal overflow '+JSON.stringify(info));assert.equal(info.suits,3);assert.ok(info.landscape>5);assert.ok(!/D[0-9]/.test(info.text),label+' no developer mode codes');
 for(const b of [info.heading,...info.copy,...info.buttons])assert.ok(b.x>=-1&&b.x+b.width<=info.width+1,label+' bounds '+JSON.stringify(b));
 for(const b of info.buttons)assert.ok(b.height>=44,label+' accessible target '+JSON.stringify(b));
 const sideTitles=await page.locator('.title-home .load-side:visible').evaluateAll(elements=>elements.map(e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};}));
 for(const b of sideTitles)assert.ok(!(b.x<info.heading.x+info.heading.width&&b.x+b.width>info.heading.x&&b.y<info.heading.y+info.heading.height&&b.y+b.height>info.heading.y),label+' decorative side title overlaps heading');
 assert.ok(info.stamp.x+info.stamp.width<=info.menu.x-4||info.stamp.y>=info.menu.y+info.menu.height+4,label+' seal avoids menu');
 report.cases.push({label,...info});return info;
}
try{
 if(!process.env.HOME_SKIP_BEFORE){await serve(true);for(const [width,height] of specs){const c=await browser.newContext({viewport:{width,height},hasTouch:width<640,reducedMotion:'reduce'}),p=await c.newPage();await p.goto('http://127.0.0.1:5586/?harness=1',{waitUntil:'domcontentloaded'});await waitScene(p,'title');await p.waitForTimeout(300);await shot(p,width+'-before');await c.close();}await stop();}
 await serve(false);
 for(const [width,height] of specs){
  const c=await browser.newContext({viewport:{width,height},hasTouch:width<640,reducedMotion:width===390?'reduce':'no-preference'}),p=await c.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
  await p.goto('http://127.0.0.1:5586/?harness=1&seed=home-evidence',{waitUntil:'domcontentloaded'});await waitScene(p,'title');await p.waitForTimeout(1000);
  const empty=await check(p,width+'-no-save');assert.equal(empty.buttons.length,1);assert.equal(await p.getByRole('heading',{name:'唐宋牌',exact:true}).count(),1);assert.equal(await snapshot(p),null);
  await tapUI(p,'title','action/title-start',width<640);await waitScene(p,'character-select');assert.equal(await p.locator('.title-home').count(),0);
  await tapUI(p,'character-select','character/amo',width<640);await confirmHeroRoute(p,width<640);await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);const saved=await snapshot(p);
  await p.reload({waitUntil:'domcontentloaded'});await waitScene(p,'title');assert.deepEqual(await snapshot(p),saved);const home=await check(p,width+'-saved');assert.equal(home.buttons.length,2);assert.ok(home.text.includes('普通模式'));
  // A display-only long-number fixture never writes the real run or its journal/storage.
  await p.evaluate(()=>window.__harness.game.scene.getScene('title').home.update({summary:['文成公主','普通模式','第 9,007,199,254,740,991 章','金币 9,007,199,254,740,991'],canContinue:true,canStart:true,notice:true,reduced:true}));await check(p,width+'-long-values');assert.deepEqual(await snapshot(p),saved);
  for(const zoom of [1.25,2]){await p.evaluate(zoom=>{document.documentElement.style.zoom=String(zoom);document.querySelector('.title-home').scrollTop=0;},zoom);await check(p,width+'-zoom-'+zoom);for(const button of await p.locator('.home-actions button').all()){await button.scrollIntoViewIfNeeded();assert.ok(await button.isVisible());}}
  await p.evaluate(()=>{document.documentElement.style.zoom='1';window.__harness.game.scene.getScene('title').render();document.querySelector('.title-home').scrollTop=0;});
  const resume=p.getByRole('button',{name:'继续本局',exact:true});await resume.focus();assert.equal(await resume.evaluate(e=>document.activeElement===e),true);
  if(width===1366)await p.keyboard.press('Enter');else await resume.tap();await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);assert.deepEqual(await snapshot(p),saved);
  // New-game selection and its existing replacement confirmation remain read-only until confirmation.
  await p.reload({waitUntil:'domcontentloaded'});await waitScene(p,'title');await p.getByRole('button',{name:'开始新局',exact:true}).click();await waitScene(p,'character-select');await tapUI(p,'character-select','character/azao',width<640);await tapUI(p,'character-select','action/confirm-character',width<640);await tapUI(p,'character-select','route/group',width<640);await tapUI(p,'character-select','action/confirm-character',width<640);await p.getByRole('button',{name:'确认开始新局',exact:true}).waitFor();assert.deepEqual(await snapshot(p),saved);await p.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await snapshot(p),saved);
  await p.waitForTimeout(380);await tapUI(p,'character-select','action/confirm-character',width<640);await p.getByRole('button',{name:'确认开始新局',exact:true}).click();await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);const replaced=await snapshot(p);assert.notEqual(replaced.state.runId,saved.state.runId);assert.equal(replaced.state.characterId,'azao');assert.deepEqual(replaced.storage.previous.state,saved.state);
  await p.reload({waitUntil:'domcontentloaded'});await waitScene(p,'title');assert.deepEqual(await snapshot(p),replaced);await check(p,width+'-replacement-restored');report.cases.push({label:width+'-native-flow',entireSavedTupleColdRestored:true,continuePreservedEntireTuple:true,cancelReplacementUnchanged:true,confirmedReplacementBackupEqual:true});await c.close();console.log('PASS',width,height);
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack??String(error);process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(report.status,report.error??'');await browser.close();if(server)await stop();}
