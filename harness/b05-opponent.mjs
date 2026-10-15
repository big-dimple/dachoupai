/** Controlled B05 sample: native import, selection, PlayHand and persistent result. No natural encounter claim. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,tapMenuAction,openMenuSection} from './ui.mjs';
const root=process.env.B05_ROOT??process.cwd(),out=process.env.B05_OUTPUT??'/tmp/b05-opponent',baseline=!!process.env.B05_BASELINE;
await mkdir(out,{recursive:true});
const loader=await createServer({root:process.cwd(),logLevel:'error'});
const {b05Entrance,b05ChoicesReady,b05Send,b05TerminalReady,B05_PAIR,B05_CHANGE}=await loader.ssrLoadModule('/tests/fixtures/b05-encounter.ts');
const {makeCheckpoint,readCheckpoint}=await loader.ssrLoadModule('/src/application/checkpoint.ts');
const entrance=b05Entrance(),initial=b05ChoicesReady(),terminal={won:b05TerminalReady(true),lost:b05TerminalReady(false)};
const fixtures={entrance,choices:initial,...Object.fromEntries(Object.entries(terminal).map(([k,v])=>[k,v.state]))};
for(const state of Object.values(fixtures))assert.ok(readCheckpoint(makeCheckpoint(state,[])).ok);
for(const [key,state] of Object.entries(fixtures))await writeFile(out+'/'+key+'-controlled.json',JSON.stringify(makeCheckpoint(state,[])));
await loader.close();
const server=await createServer({root,cacheDir:root===process.cwd()?undefined:root+'/.vite-cache',mode:'e2e',server:{host:'127.0.0.1',port:Number(process.env.B05_PORT??5579),strictPort:true},logLevel:'error'});await server.listen();
const url=server.resolvedUrls.local[0]+'?harness=1';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']}),report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),baseline,scope:'Controlled chapter3 current identity, planted U01 and public card arrangement; actual prior and current PlayHand. Software Chromium PC/touch inputs; no natural acquisition, physical-device, human-understanding or final-art acceptance.',cases:[]};
const read=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
async function importState(p,state){
  await p.goto(url);await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
  const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'b05-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(state,[])))});
  await waitScene(p,'game');if(state.phase==='stage-ready'&&!baseline)await p.locator('dialog[data-opponent-phase="entrance"][open]').waitFor();else await idle(p);
}
async function idle(p){await p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||g.scene.isActive('game')&&s.controlsLive&&!s.playing;});}
const tap=async(p,name,touch=false)=>p.getByRole('button',{name,exact:true})[touch?'tap':'click']();
async function shot(p,key,row){await p.screenshot({path:out+'/'+key+'.png',scale:'css',fullPage:true});
  const bounds=await p.evaluate(()=>[...document.querySelectorAll('dialog.opponent-dialog[open] button,.opponent-beat,.opponent-beat strong,.opponent-beat p')].map(e=>({text:e.textContent,bounds:e.getBoundingClientRect().toJSON(),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth})));row.shots??=[];row.shots.push({key,bounds});
  const vp=p.viewportSize();for(const item of bounds){const b=item.bounds;assert.ok(b.x>=-1&&b.x+b.width<=vp.width+1,key+' horizontal '+item.text);assert.ok(b.y>=-1&&b.y+b.height<=vp.height+1,key+' vertical '+item.text);assert.ok(item.scrollWidth<=item.clientWidth+1,key+' no clipped text '+item.text);}
}
async function observe(p){await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');window.__b05Timeline=[];const tick=()=>{const id=s.scoreTotal?.getData('eventId'),phase=s.scoreTotal?.getData('eventPhase'),cue=document.querySelector('.opponent-beat'),row={id,phase,heat:s.scoreHeat?.text,mult:s.scoreMult?.text,cue:cue?.textContent,kind:cue?.getAttribute('data-kind')};if(JSON.stringify(row)!==JSON.stringify(window.__b05Timeline.at(-1)))window.__b05Timeline.push(row);};s.events.on('update',tick);window.__b05Stop=()=>s.events.off('update',tick);});}
async function actual(p,action,touch){const before=await read(p);for(const id of action.selectedIds)await tapUI(p,'game','card/'+id,touch);await tapUI(p,'game','action/play',touch);await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.state.commandSeq);const committed=await read(p),expected=b05Send(before.state,action);assert.deepEqual(committed.state,expected,'complete committed state equals unchanged domain PlayHand');return {before,committed};}
async function scenario(key,viewport,callback,reduced=false){const touch=viewport.width<700,p=await browser.newPage({viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'}),row={key,viewport,reduced,errors:[]};report.cases.push(row);p.setDefaultTimeout(20000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(e.stack));
  try{await callback(p,row,touch);assert.deepEqual(row.errors,[]);row.status='PASS';}catch(e){row.status='FAIL';row.error=e.stack;await p.screenshot({path:out+'/'+key+'-FAIL.png'}).catch(()=>{});throw e;}finally{await p.close();}
}
try{
  for(const viewport of [{width:1366,height:768},{width:390,height:740},{width:320,height:568}]){
    const prefix=''+viewport.width;
    if(!baseline)await scenario(prefix+'-entrance',viewport,async(p,row,touch)=>{
      await importState(p,entrance);row.before=await read(p);assert.deepEqual(row.before.state,entrance);await shot(p,prefix+'-entrance',row);await tap(p,'稍后入场',touch);await waitScene(p,'character-select');assert.deepEqual(await read(p),row.before,'cancel before EnterStage never draws or saves');
      await tapMenuAction(p,'继续本局',touch);await p.locator('dialog[data-opponent-phase="entrance"][open]').waitFor();await tap(p,'入场 · 看手牌',touch);await p.locator('dialog[data-opponent-phase="choices"][open]').waitFor();row.entered=await read(p);assert.deepEqual(row.entered.state,b05Send(entrance,{type:'EnterStage'}));await shot(p,prefix+'-opening-choices',row);assert.ok((await p.locator('.opponent-options').innerText()).includes('首手'));await tap(p,'自己选牌',touch);assert.deepEqual(await read(p),row.entered);
    });
    for(const [kind,ids,label] of [['repeat',B05_PAIR,'同型硬闯 · 对子'],['changed',B05_CHANGE,'换型避开 · 高牌']])await scenario(prefix+'-'+kind,viewport,async(p,row,touch)=>{
      await importState(p,initial);row.initial=await read(p);assert.deepEqual(row.initial.state,initial);
      if(!baseline){await tapMenuAction(p,'规则 / 物品',touch);await shot(p,prefix+'-'+kind+'-choices',row);await tap(p,'自己选牌',touch);assert.deepEqual(await read(p),row.initial);await tapMenuAction(p,'规则 / 物品',touch);await tap(p,label,touch);row.selected=await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]);assert.deepEqual(row.selected,ids);assert.deepEqual(await read(p),row.initial);}
      await observe(p);let transaction;
      if(baseline)transaction=await actual(p,{type:'PlayHand',selectedIds:ids},touch);else {const before=await read(p);await tapUI(p,'game','action/play',touch);await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.state.commandSeq);const committed=await read(p);assert.deepEqual(committed.state,b05Send(before.state,{type:'PlayHand',selectedIds:ids}));transaction={before,committed};}
      Object.assign(row,transaction);assert.equal(row.committed.state.lastTrace.finalScore,kind==='repeat'?'43':'31');
      if(!baseline){await p.locator('.opponent-beat[data-kind="'+kind+'"]').waitFor();await shot(p,prefix+'-'+kind+'-key',row);
        if(kind==='repeat'){const event=row.committed.state.lastTrace.events.find(e=>e.operation==='halve-base-heat');await p.waitForFunction(id=>{const s=window.__harness.game.scene.getScene('game');return s.scoreTotal.getData('eventId')===id&&s.scoreTotal.getData('eventPhase')==='rest';},event.eventId);await shot(p,prefix+'-real-base-half',row);}}
      await idle(p);row.after=await read(p);assert.deepEqual(row.after,row.committed,'playback never changes state/journal/storage');row.timeline=await p.evaluate(()=>{window.__b05Stop();return window.__b05Timeline;});
      if(!baseline&&kind==='repeat'){const event=row.after.state.lastTrace.events.find(e=>e.operation==='halve-base-heat');assert.ok(row.timeline.some(x=>x.id===event.eventId&&x.phase==='impact'),'real B05 base event reaches showScoreEvent');}
      await shot(p,prefix+'-'+kind+'-saved',row);
      if(viewport.width===390&&!baseline){for(let i=0;i<2;i++){await tapMenuAction(p,'回看上一手',touch);await p.locator('.opponent-beat').waitFor();if(i===0)await tapMenuAction(p,'快进当前手',touch);await idle(p);assert.deepEqual(await read(p),row.after,'repeated replay/skip never saves');assert.equal(await p.locator('.opponent-beat').count(),0);}
        if(kind==='repeat'){
          const hand=row.after.state.handOrder.map(id=>row.after.state.deckInstances.find(c=>c.id===id)),pair=hand.find(c=>hand.filter(v=>v.rank===c.rank).length>=2);assert.ok(pair,'controlled next hand has another real pair');
          const action={type:'PlayHand',selectedIds:hand.filter(c=>c.rank===pair.rank).slice(0,2).map(c=>c.id)};row.ordinary=await actual(p,action,touch);await idle(p);row.ordinary.after=await read(p);assert.deepEqual(row.ordinary.after,row.ordinary.committed);assert.equal(await p.locator('.opponent-beat').count(),0);const kinds=await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').shownOpponentKinds]);assert.deepEqual(kinds,['repeat'],'ordinary same-type hand adds no full cut');
        }
        const restore=row.ordinary?.after??row.after;await p.reload();await waitScene(p,'title');assert.deepEqual(await read(p),restore,'refresh restores exact state/journal/storage');await tapMenuAction(p,'继续本局',touch);await idle(p);assert.deepEqual(await read(p),restore);assert.equal(await p.locator('.opponent-beat').count(),0,'refresh does not auto replay');}
    });
  }
  if(!baseline){
    await scenario('390-reduced-skip-resize', {width:390,height:740},async(p,row,touch)=>{
      await importState(p,initial);await observe(p);Object.assign(row,await actual(p,{type:'PlayHand',selectedIds:B05_PAIR},touch));await p.locator('.opponent-beat').waitFor();await shot(p,'390-reduced-repeat',row);assert.equal(await p.locator('.opponent-beat').evaluate(e=>e.getAnimations().length),0);await tapMenuAction(p,'快进当前手',touch);await idle(p);assert.deepEqual(await read(p),row.committed);assert.equal(await p.locator('.opponent-beat').count(),0);
      await tapMenuAction(p,'回看上一手',touch);await p.locator('.opponent-beat').waitFor();await p.setViewportSize({width:320,height:568});await idle(p);assert.deepEqual(await read(p),row.committed);assert.equal(await p.locator('.opponent-beat').count(),0);row.timeline=await p.evaluate(()=>window.__b05Timeline);
    },true);
    await scenario('390-cancel-restore',{width:390,height:740},async(p,row,touch)=>{
      await importState(p,initial);Object.assign(row,await actual(p,{type:'PlayHand',selectedIds:B05_CHANGE},touch));await p.locator('.opponent-beat').waitFor();await tapMenuAction(p,'保存并退出',touch);await waitScene(p,'character-select');assert.deepEqual(await read(p),row.committed);assert.equal(await p.locator('.opponent-beat').count(),0);await tapMenuAction(p,'继续本局',touch);await idle(p);assert.deepEqual(await read(p),row.committed);assert.equal(await p.locator('.opponent-beat').count(),0);
    });
    for(const [kind,f] of Object.entries(terminal))await scenario('390-'+kind,{width:390,height:740},async(p,row,touch)=>{
      await importState(p,f.state);Object.assign(row,await actual(p,f.action,touch));await p.locator('.opponent-beat[data-kind="'+kind+'"]').waitFor();await shot(p,'390-'+kind+'-opponent',row);await waitScene(p,'intermission');assert.deepEqual(await read(p),row.committed);await shot(p,'390-'+kind+'-result',row);
    });
  }
  report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{
  await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));await writeFile(out+'/summary.json',JSON.stringify({head:report.head,status:report.status,baseline,scope:report.scope,error:report.error,cases:report.cases.map(({before,initial,selected,committed,after,entered,timeline,ordinary,...r})=>({...r,score:committed?.state.lastTrace?.finalScore,selected,timeline,ordinary:ordinary?{score:ordinary.committed.state.lastTrace.finalScore,phase:ordinary.committed.state.phase}:undefined}))},null,2));
  await browser.close();await server.close();console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.length}));
}
