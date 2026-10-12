import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {chooseCharacter,waitScene,tapUI,confirmHeroRoute} from './ui.mjs';

const baseline=process.env.TOUYE_COPY_BASELINE==='1';
const out=process.env.TOUYE_COPY_OUTPUT??'/tmp/touye-player-copy';
await mkdir(out,{recursive:true});
const server=await createServer({cacheDir:'/tmp/touye-player-copy-vite',mode:'e2e',server:{host:'127.0.0.1',port:5642,strictPort:true,hmr:false},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={baseline,scope:'normal Xiemu to Touye route selection, read-only menu text before and after details click; no natural play',rows:[],status:'RUNNING'};
try {
 for(const viewport of [{width:1366,height:768},{width:390,height:844}]) {
  const touch=viewport.width===390,context=await browser.newContext({viewport,hasTouch:touch,reducedMotion:'reduce'}),page=await context.newPage();
  page.setDefaultTimeout(20000);page.on('dialog',d=>d.accept());
  const dom=l=>touch?l.tap():l.click();
  const snap=()=>page.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});
  const menu=async()=>{if(!await page.locator('.run-menu-modal').evaluate(e=>e.open))await dom(page.locator('.run-menu-toggle'));};
  const section=name=>page.getByText(name,{exact:true}).locator('..');
  const expand=async name=>{const s=section(name);if(!await s.evaluate(e=>e.open))await dom(s.locator('summary'));return s;};
  await page.goto('http://127.0.0.1:5642/?harness=1');await waitScene(page,'title');await chooseCharacter(page,'xiemu',touch);
  await menu();const info=await expand('本局与版本');await dom(page.getByRole('button',{name:'局详情',exact:true}));
  const oldText=await info.locator('p').innerText();assert.match(oldText,/谢幕/);await dom(page.locator('.run-menu-toggle'));
  await menu();await expand('进度与存档');await dom(page.getByRole('button',{name:'开始新局',exact:true}));await waitScene(page,'character-select');await tapUI(page,'character-select','character/touye',touch);await confirmHeroRoute(page,touch);await dom(page.getByRole('button',{name:'确认开始新局',exact:true}));await waitScene(page,'shop');
  const before=await snap();assert.equal(before.state.characterId,'touye');assert.equal(before.state.contentHash,'json-fnv-v1:413ecc65d3b9a2a1');
  await menu();await expand('本局与版本');const beforeClick=await info.locator('p').innerText();const stale=beforeClick.includes('谢幕');
  const staleImage=viewport.width+'-new-run-before-details.png';await page.screenshot({path:out+'/'+staleImage,scale:'css'});
  await dom(page.getByRole('button',{name:'局详情',exact:true}));const afterClick=await info.locator('p').innerText();assert.match(afterClick,/骰爷/);
  const detailsImage=viewport.width+'-new-run-details.png';await page.screenshot({path:out+'/'+detailsImage,scale:'css'});
  let fullDetailsImage,versionViewPreserved;
  if(!baseline){await info.locator('p').scrollIntoViewIfNeeded();fullDetailsImage=viewport.width+'-full-player-instructions.png';await page.screenshot({path:out+'/'+fullDetailsImage,scale:'css'});await dom(page.getByRole('button',{name:'版本信息',exact:true}));const versionText=await info.locator('p').innerText();await dom(page.locator('.run-menu-toggle'));await menu();assert.equal(await info.locator('p').innerText(),versionText);versionViewPreserved=true;await dom(page.getByRole('button',{name:'局详情',exact:true}));assert.match(await info.locator('p').innerText(),/骰爷/);}
  const after=await snap();assert.deepEqual(after,before);
  if(baseline)assert.equal(stale,true,'reproduce old character text before explicit refresh');else {assert.equal(stale,false);assert.match(beforeClick,/骰爷/);assert.doesNotMatch(afterClick,/ID|事务|核心/);}
  report.rows.push({viewport,oldText,beforeClick,afterClick,stale,before,after,stateJournalStorageUnchanged:true,staleImage,detailsImage,fullDetailsImage,versionViewPreserved});
  await context.close();
 }
 report.status=baseline?'REPRODUCED':'PASS';
} catch(error) {report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally {await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:report.rows.length,error:report.error}));}
