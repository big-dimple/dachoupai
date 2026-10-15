/** Incremental native read-only proof for identity-specific HandRuleReference. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene} from './ui.mjs';
const out=process.env.HAND_ORDER_OUTPUT??'/tmp/b05-hand-order';await mkdir(out,{recursive:true});
const loader=await createServer({root:process.cwd(),logLevel:'error'});
const {activeRunFixture,routeIdentity}=await loader.ssrLoadModule('/tests/fixtures/p1a-active-mult.ts'),{b05ChoicesReady}=await loader.ssrLoadModule('/tests/fixtures/b05-encounter.ts'),{touyeFixture}=await loader.ssrLoadModule('/tests/fixtures/touye-new-core.ts');
const {newRunIdentity}=await loader.ssrLoadModule('/src/game/RunLaunch.ts'),{handScoringOrder}=await loader.ssrLoadModule('/src/game/HandRuleReference.ts'),{makeCheckpoint,readCheckpoint}=await loader.ssrLoadModule('/src/application/checkpoint.ts');
const states={'current-xiemu':b05ChoicesReady(),'old-xiemu':activeRunFixture('xiemu',60,0,routeIdentity).state,'current-touye':touyeFixture('mature-win',{identity:newRunIdentity('touye','group')}).state,'current-azao':activeRunFixture('azao',60,0,newRunIdentity('azao','group')).state};
const fixtures=Object.fromEntries(Object.entries(states).map(([key,state])=>{assert.ok(readCheckpoint(makeCheckpoint(state,[])).ok);return [key,{state,order:handScoringOrder(state),cp:makeCheckpoint(state,[])}];}));await loader.close();
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5582,strictPort:true},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']}),report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),scope:'Saved current/frozen identities, native card -> how to form -> complete hand rules -> close. Read-only complete state/journal/IndexedDB and selection preservation; not a hero entry redesign, natural acquisition or human/device claim.',cases:[]};
const read=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
try{
  for(const [kind,f] of Object.entries(fixtures))for(const viewport of kind.endsWith('xiemu')?[{width:1366,height:768},{width:390,height:740},{width:320,height:568}]:[{width:390,height:740}]){
    const key=kind+'-'+viewport.width,touch=viewport.width<700,p=await browser.newPage({viewport,hasTouch:touch,deviceScaleFactor:1}),row={key,kind,viewport,errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(e.stack));p.on('dialog',d=>d.accept());p.setDefaultTimeout(20000);
    try{
      await p.goto('http://127.0.0.1:5582/?harness=1');await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:key+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(f.cp))});await waitScene(p,'game');await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').controlsLive);
      row.before=await read(p);await tapUI(p,'game','card/'+f.state.handOrder[0],touch);row.selected=await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]);await tapUI(p,'game','selection/hand-rules',touch);await p.getByRole('button',{name:'完整牌型规则',exact:true})[touch?'tap':'click']();const d=p.getByRole('dialog',{name:'牌型规则',exact:true});await d.waitFor();row.copy=await d.textContent();assert.ok(row.copy.includes(f.order),'native detail uses this saved identity');
      await d.getByText('计分顺序与完整规则',{exact:true}).click();await d.locator('details.card-rules[open] > p').evaluate(e=>{const node=e.closest('.dialog-scroll');node.scrollTop=node.scrollHeight;});
      await p.screenshot({path:out+'/'+key+'.png',scale:'css',fullPage:true});row.afterOpen=await read(p);assert.deepEqual(row.afterOpen,row.before);await d.getByRole('button',{name:'关闭',exact:true})[touch?'tap':'click']();assert.deepEqual(await read(p),row.before);assert.deepEqual(await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),row.selected);assert.deepEqual(row.errors,[]);row.status='PASS';
    }catch(e){row.status='FAIL';row.error=e.stack;await p.screenshot({path:out+'/'+key+'-FAIL.png'}).catch(()=>{});throw e;}finally{await p.close();}
  }report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));await writeFile(out+'/summary.json',JSON.stringify({head:report.head,scope:report.scope,status:report.status,error:report.error,cases:report.cases.map(({before,afterOpen,...r})=>r)},null,2));await browser.close();await server.close();console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.length}));}
