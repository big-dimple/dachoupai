import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {waitScene} from './ui.mjs';
const out=process.env.TOUYE_CAPTION_OUTPUT??'/tmp/touye-core-caption';await mkdir(out,{recursive:true});
const evidence=JSON.parse(await readFile('docs/production/evidence/touye-new-core-2026-10-12/native-final/report.json','utf8'));
const server=await createServer({cacheDir:'/tmp/touye-core-caption-vite',mode:'e2e',server:{host:'127.0.0.1',port:5640,strictPort:true,hmr:false},logLevel:'error'});await server.listen();const {makeCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});const report={scope:'only final compact current-identity result caption; reuse four already saved native results; read-only after import',rows:[],status:'RUNNING'};
try{
 for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
  const p=await browser.newPage({viewport,hasTouch:viewport.width===390});p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:5640/?harness=1');await waitScene(p,'title');
  for(const kind of ['mature-win','mature-old-core']){
   const original=evidence.rows.find(r=>r.viewport.width===viewport.width&&r.kind===kind),state=original.afterPlay.state;
   if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await p.locator('.run-menu-toggle').click();await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'saved-native-result.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(state,original.afterPlay.journal)))});await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
   const snap=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return{state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});const before=await snap();assert.deepEqual(before.state,state);
   const label=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),b=s.statusText.getBounds();return {text:s.statusText.text,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},width:s.scale.width,height:s.scale.height};});
   assert.ok(label.bounds.x>=0&&label.bounds.x+label.bounds.width<=label.width&&label.bounds.y+label.bounds.height<=label.height,JSON.stringify(label));const image=viewport.width+'-'+kind+'-compact-result.png';await p.screenshot({path:out+'/'+image,scale:'css'});assert.deepEqual(await snap(),before);report.rows.push({viewport,kind,label,image,stateJournalStorageUnchanged:true});
  }await p.close();
 }report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
