/** Controlled high-DPR DOM geometry regression; no natural-run or whole-game claim. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {tapUI,waitScene,tapMenuAction} from './ui.mjs';

const out=process.env.B05_DENSITY_OUTPUT??'docs/production/evidence/b05-opponent-density-2026-10-15/final';
await mkdir(out,{recursive:true});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const paths=[...git('ls-files','src','tests/fixtures/b05-encounter.ts','harness/ui.mjs').split('\n'),'harness/b05-opponent-density.mjs'];
const hashes=async()=>Object.fromEntries(await Promise.all(paths.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')])));
const report={head:git('rev-parse','HEAD'),productDiff:git('diff','--','src'),sourceHashes:await hashes(),scope:'Software Chromium controlled B05 hand, high-DPR DOM geometry, resize/replay/skip and complete saved-state equality. No physical device, new art or whole-game acceptance.',cases:[]};
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5582,strictPort:true},logLevel:'error'});
await server.listen();
const {b05ChoicesReady,b05Send,B05_CHANGE}=await server.ssrLoadModule('/tests/fixtures/b05-encounter.ts');
const {makeCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {toolInventoryPlayedArea}=await server.ssrLoadModule('/src/game/ToolInventoryEntry.ts');
const initial=b05ChoicesReady(),url=server.resolvedUrls.local[0]+'?harness=1';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const read=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
const idle=p=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.controlsLive&&!s.playing;});
const sessions=new WeakMap();
const cue=p=>p.locator('.opponent-beat[data-kind="changed"]');
async function importState(p){
  await p.goto(url);await waitScene(p,'title');await p.locator('.run-menu-toggle').click();
  const section=p.getByText('进度与存档',{exact:true}).locator('..');
  if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
  const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();
  await(await chooser).setFiles({name:'b05-density.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(initial,[])))});
  await waitScene(p,'game');await idle(p);await p.evaluate(()=>document.fonts.ready);assert.deepEqual((await read(p)).state,initial);
}
async function frame(p,key,row){
  await cue(p).waitFor();
  await cue(p).evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished.catch(()=>{}))));
  const data=await cue(p).evaluate(e=>{
    const s=window.__harness.game.scene.getScene('game'),box=e.getBoundingClientRect(),css=getComputedStyle(e),canvas=s.game.canvas.getBoundingClientRect();
    const inner={left:box.left+parseFloat(css.borderLeftWidth)+parseFloat(css.paddingLeft),right:box.right-parseFloat(css.borderRightWidth)-parseFloat(css.paddingRight),top:box.top+parseFloat(css.borderTopWidth)+parseFloat(css.paddingTop),bottom:box.bottom-parseFloat(css.borderBottomWidth)-parseFloat(css.paddingBottom)};
    return {box:box.toJSON(),inner,layout:s.view.layout,canvas:canvas.toJSON(),backing:{width:s.scale.width,height:s.scale.height,zoom:s.scale.zoom},dpr:devicePixelRatio,cue:{...e.dataset},eventId:s.scoreTotal.getData('eventId'),eventPhase:s.scoreTotal.getData('eventPhase'),score:s.scoreTotal.text,displayHeat:s.presentation.displayHeat,children:[...e.querySelectorAll('small,strong,p')].map(c=>{const r=document.createRange();r.selectNodeContents(c);return {text:c.textContent,box:c.getBoundingClientRect().toJSON(),textBounds:[...r.getClientRects()].map(b=>b.toJSON()),scrollWidth:c.scrollWidth,clientWidth:c.clientWidth};})};
  });
  const area=toolInventoryPlayedArea(data.layout),sx=data.canvas.width/data.layout.width,sy=data.canvas.height/data.layout.height;
  data.expected={left:data.canvas.left+area.x*sx,top:data.canvas.top+area.y*sy,width:area.width*sx,height:area.height*sy};
  row.frames??=[];row.frames.push({key,...data});
  const vp=p.viewportSize(),cdp=sessions.get(p),pauseStarted=Date.now();
  // Pause JS only after the real cue has landed. The screenshot copies that actual DOM;
  // no style, content, animation, game command or saved state is synthesized.
  const paused=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('debugger pause timeout')),5000);cdp.once('Debugger.paused',()=>{clearTimeout(timer);resolve();});});
  try{
    await cdp.send('Debugger.pause');await paused;
    const shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false,clip:{x:0,y:0,width:vp.width,height:vp.height,scale:1}});
    await writeFile(out+'/'+key+'.png',Buffer.from(shot.data,'base64'));
  }finally{await cdp.send('Debugger.resume');}
  data.captureMode='Actual settled DOM, JS paused through CDP screenshot; not a real-time duration sample';
  data.capturePauseMilliseconds=Date.now()-pauseStarted;
  for(const field of ['left','top','width','height'])assert.ok(Math.abs(data.box[field]-data.expected[field])<=.5,`${key} CSS ${field}: ${data.box[field]} vs ${data.expected[field]}`);
  assert.ok(data.box.left>=0&&data.box.right<=vp.width&&data.box.top>=0&&data.box.bottom<=vp.height);
  assert.equal(data.children.length,3);
  for(const c of data.children){for(const b of [c.box,...c.textBounds])assert.ok(b.left>=data.inner.left-.25&&b.right<=data.inner.right+.25&&b.top>=data.inner.top-.25&&b.bottom<=data.inner.bottom+.25,key+' complete text inside padding: '+c.text);assert.ok(c.scrollWidth<=c.clientWidth+1);}
  const final=row.committed.state.lastTrace.events.find(e=>e.phase==='finalScore');
  assert.equal(data.eventId,final.eventId);assert.equal(data.eventPhase,'award');assert.equal(data.cue.eventId,final.eventId);assert.equal(data.cue.phase,'reaction');assert.equal(data.score.replaceAll(',',''),row.committed.state.lastTrace.finalScore);assert.equal(data.displayHeat,row.committed.state.stage.heat);
}
const specs=[
  {key:'390-dpr3',viewport:{width:390,height:740},dpr:3,resize:{width:320,height:568}},
  {key:'320-dpr3',viewport:{width:320,height:568},dpr:3},
  {key:'1366-dpr2',viewport:{width:1366,height:768},dpr:2,resize:{width:1024,height:700}}
];
try{
  for(const spec of specs){
    if(process.env.B05_DENSITY_CASES&&!process.env.B05_DENSITY_CASES.split(',').includes(spec.key))continue;
    const touch=spec.viewport.width<700,p=await browser.newPage({viewport:spec.viewport,deviceScaleFactor:spec.dpr,hasTouch:touch}),row={...spec,errors:[]};report.cases.push(row);
    const cdp=await p.context().newCDPSession(p);await cdp.send('Debugger.enable');sessions.set(p,cdp);
    p.setDefaultTimeout(20000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e)));
    try{
      await importState(p);row.before=await read(p);
      for(const id of B05_CHANGE)await tapUI(p,'game','card/'+id,touch);
      assert.deepEqual(await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),B05_CHANGE);
      await tapUI(p,'game','action/play',touch);
      await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,row.before.state.commandSeq);
      row.committed=await read(p);assert.deepEqual(row.committed.state,b05Send(row.before.state,{type:'PlayHand',selectedIds:B05_CHANGE}));
      await frame(p,spec.key,row);await idle(p);assert.deepEqual(await read(p),row.committed);
      if(spec.resize){
        await tapMenuAction(p,'回看上一手',touch);await cue(p).waitFor();
        await p.setViewportSize(spec.resize);await idle(p);assert.equal(await cue(p).count(),0,'resize abort cleans the old DOM cue');assert.deepEqual(await read(p),row.committed);
        await tapMenuAction(p,'回看上一手',touch);await frame(p,spec.key+'-resized',row);
        await idle(p);assert.deepEqual(await read(p),row.committed);
        // Capture and skip use separate replays so screenshot work cannot consume the 850ms cue.
        await tapMenuAction(p,'回看上一手',touch);await cue(p).waitFor();
        await tapMenuAction(p,'快进当前手',touch);await idle(p);assert.equal(await cue(p).count(),0,'skip cleans the resized cue');
      }
      row.after=await read(p);assert.deepEqual(row.after,row.committed);assert.deepEqual(row.errors,[]);row.status='PASS';
    }catch(e){row.status='FAIL';row.error=e.stack;await p.screenshot({path:out+'/'+spec.key+'-FAIL.png',scale:'css'}).catch(()=>{});}
    finally{await cdp.detach();await p.close();}
  }
  report.sourceUnchanged=JSON.stringify(await hashes())===JSON.stringify(report.sourceHashes);assert.ok(report.sourceUnchanged);
  report.status=report.cases.every(c=>c.status==='PASS')?'PASS':'FAIL';if(report.status==='FAIL')process.exitCode=1;
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}
finally{
  await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));
  await writeFile(out+'/summary.json',JSON.stringify({...report,cases:report.cases.map(({before,committed,after,frames,...c})=>({...c,score:committed?.state.lastTrace.finalScore,frames:frames?.map(({layout,...f})=>f)}))},null,2));
  await browser.close();await server.close();console.log(JSON.stringify({head:report.head,status:report.status,cases:report.cases.map(c=>({key:c.key,status:c.status,error:c.error?.split('\n')[0]}))}));
}
