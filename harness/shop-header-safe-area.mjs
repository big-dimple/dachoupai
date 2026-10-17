/** Two controlled native UI profiles for the reported shop/menu collision. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'vite';
import {chromium} from 'playwright';
import {waitScene} from './ui.mjs';
const out='docs/production/evidence/shop-header-safe-area-2026-10-17',entry='.vite/header-entry.html',bundle='.vite/header-build';
await mkdir(out,{recursive:true});
const probe=`<script type="module">
import {workshopLayoutFixture} from '/harness/fixtures/workshop-layout.ts';import {applyCommand} from '/src/domain/run.ts';import {gameSession} from '/src/game/session.ts';
window.headerProbe={fixture:workshopLayoutFixture,async snap(){const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await gameSession().storage.read()};},expected(state,command){const r=applyCommand(state,command);if(!r.ok)throw Error(r.code);return r.state;}};
</script>`;
await writeFile(entry,(await readFile('index.html','utf8')).replace('</body>',probe+'</body>'));
await build({mode:'e2e',base:'./',publicDir:false,logLevel:'error',build:{outDir:bundle,rollupOptions:{input:entry}}});
const server=createServer(async(req,res)=>{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);for(const file of path==='/'?[resolve(bundle,entry)]:[resolve(bundle,'.'+path),resolve('public','.'+path)]){if(!file.startsWith(resolve(bundle))&&!file.startsWith(resolve('public')))continue;try{const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]??'application/octet-stream');res.end(data);return;}catch{}}res.writeHead(404);res.end();});
await new Promise(r=>server.listen(5597,'127.0.0.1',r));
const browser=await chromium.launch({headless:true}),report={base:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),scope:'1180x757 mouse DPR1 and 390x740 touch DPR2, controlled public imports. No player save, domain change or physical device claim.',profiles:[]};
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const snap=p=>p.evaluate(()=>headerProbe.snap());
async function imp(p,n){const cp=await p.evaluate(n=>headerProbe.fixture(n),n);await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');await section.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'header-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);}
async function geometry(p){return p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),g=s.geometry(),all=[];const box=b=>({x:b.x,y:b.y,width:b.width,height:b.height}),walk=list=>{for(const o of list){if(['action/tool-inventory','action/reroll','action/build','shop/gold','shop/title'].includes(o.name))all.push({name:o.name,text:o.text,bounds:box(o.getBounds()),hit:!!o.input?.enabled});if(o.list)walk(o.list);}};walk(s.view.root.list);const menu=box(document.querySelector('.run-menu-toggle').getBoundingClientRect()),header=s.view.root.list.find(o=>o.name==='shop-art/ink-header');return {menu,pc:!!g.pc,headBottom:g.top+48,nodes:all,menuReservation:g.menu,headerPresent:!!header,owned:s.run.jokers.length};});}
try{
 for(const [width,height,owned,dpr] of [[1180,757,0,1],[390,740,5,2]]){
  const touch=width<700,ctx=await browser.newContext({viewport:{width,height},hasTouch:touch,deviceScaleFactor:dpr,reducedMotion:'reduce'}),p=await ctx.newPage(),row={width,height,owned,dpr,errors:[],hits:[]};report.profiles.push(row);p.setDefaultTimeout(20000);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
  const click=async(x,y)=>{if(touch)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);await p.waitForTimeout(60);};
  try{
   await p.goto('http://127.0.0.1:5597/?harness=1');await waitScene(p,'title');await imp(p,owned);await p.waitForTimeout(350);const before=await snap(p);row.geometry=await geometry(p);const g=row.geometry;
   assert.equal(g.menu.width,touch?44:64);assert.equal(g.menu.height,44);assert.deepEqual(g.menuReservation,g.menu);assert.equal(g.owned,owned);
   const controls=g.nodes.filter(o=>o.hit);for(const [i,a] of controls.entries()){assert.ok(a.bounds.width>=44&&a.bounds.height>=44,a.name+' touch target');assert.ok(!overlap(a.bounds,g.menu),a.name+' under DOM menu');for(const b of controls.slice(i+1))assert.ok(!overlap(a.bounds,b.bounds),a.name+' overlaps '+b.name);}
   const gold=g.nodes.find(o=>o.name==='shop/gold');assert.ok(!overlap(gold.bounds,g.menu));if(touch){assert.ok(g.menu.y+g.menu.height<=g.headBottom);assert.ok(gold.bounds.x+gold.bounds.width<=g.menu.x-8);assert.ok(g.nodes.find(o=>o.name==='shop/title').bounds.x+g.nodes.find(o=>o.name==='shop/title').bounds.width<=controls.find(o=>o.name==='action/tool-inventory').bounds.x-4);}
   const bag=controls.find(o=>o.name==='action/tool-inventory').bounds;assert.ok(bag.x+bag.width<=g.menu.x-8||bag.y>=g.menu.y+g.menu.height);
   await p.screenshot({path:out+'/'+width+'x'+height+'.png',scale:'css'});
   for(const name of ['action/tool-inventory','menu'])for(const side of ['left','right']){const b=name==='menu'?g.menu:controls.find(o=>o.name===name).bounds,x=side==='left'?b.x+3:b.x+b.width-3,y=b.y+b.height/2;const top=await p.evaluate(({x,y})=>{const e=document.elementFromPoint(x,y);return e?.className||e?.tagName;},{x,y});if(name==='menu')assert.ok(String(top).includes('run-menu-toggle'));else assert.equal(top,'CANVAS');await click(x,y);await p.locator(name==='menu'?'.run-menu-modal[open]':'.detail-dialog[open]').waitFor();await p.keyboard.press('Escape');assert.deepEqual(await snap(p),before);row.hits.push({name,side,x,y,top,status:'PASS',unchangedStateJournalStorage:true});}
   for(const side of ['left','right']){const b=(await geometry(p)).nodes.find(o=>o.name==='action/reroll').bounds,x=side==='left'?b.x+3:b.x+b.width-3,y=b.y+b.height/2,prior=await snap(p);await click(x,y);await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,prior.state.commandSeq);await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);const after=await snap(p),command=after.journal.at(-1);assert.equal(command.action.type,'RerollShop');const expected=await p.evaluate(({state,command})=>headerProbe.expected(state,command),{state:prior.state,command});assert.deepEqual(after.state,expected);assert.deepEqual(after.storage.current.state,expected);row.hits.push({name:'action/reroll',side,x,y,status:'PASS',command:command.action,exactDomainAndStorage:true});}
   assert.deepEqual(row.errors,[]);row.status='PASS';
  }catch(e){row.status='FAIL';row.error=e.stack;await p.screenshot({path:out+'/'+width+'x'+height+'-FAIL.png',scale:'css'});throw e;}finally{await ctx.close();}
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));console.log(JSON.stringify(report));}
