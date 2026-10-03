/** Compiled UI checks with validated hand-limit save fixtures; acquisition is not claimed. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createServer,build,preview} from 'vite';
import {chromium,webkit,firefox} from 'playwright';
import {tapUI,waitScene,point,openMenuSection} from './ui.mjs';
const dir=process.env.TWO_ROW_DIR||'shots/two-row',outDir=dir+'/build',port=Number(process.env.TWO_ROW_PORT||5256);
await mkdir(dir,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},logLevel:'error'}),fixtures={};
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts');
 const {makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 for(const count of [9,10,11,12,13,14]){
  let state=createRun({seed:'two-row-'+count,characterId:'amo',runId:'two-row-'+count,rulesVersion:'r2'});
  const journal=[];
  for(const type of ['LeaveShop','EnterStage']){
   const command={runId:state.runId,commandId:type,expectedSeq:state.commandSeq,action:{type}},r=applyCommand(state,command);
   assert.ok(r.ok,type);state=r.state;journal.push(command);
  }
  // Controlled entry snapshot within the existing 14-card contract. Keep card
  // conservation and all unchanged save invariants; this is not acquisition.
  state.stage.initialHandLimit=count;state.stage.handLimit=count;
  while(state.handOrder.length<count)state.handOrder.push(state.drawPile.pop());
  assert.equal(state.handOrder.length,count);const checkpoint=makeCheckpoint(state,journal);
  assert.equal(readCheckpoint(checkpoint).ok,true,'existing save validator accepts hand-limit fixture');
  fixtures[count]=JSON.stringify(checkpoint);
 }
}finally{await ssr.close();}
if(process.env.TWO_ROW_REUSE_BUILD!=='1')await build({mode:'e2e',build:{outDir,emptyOutDir:true},logLevel:'warn'});
const server=await preview({build:{outDir},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'warn'});
const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fixture:'Controlled 9–14 entry snapshots within existing hand-maximum contract and card conservation; unchanged save validator and actual import UI. Not natural acquisition.',runs:[],physicalDevice:'NOT_RUN',hardwareGPU:'NOT_RUN',recording:'NOT_RUN'};
const ready=p=>p.waitForFunction(()=>{const s=window.__harness?.game.scene.getScene('game');return s?.ready&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
async function resize(p,size,r){
 await p.setViewportSize(size);await ready(p);
 const before=await p.evaluate(()=>{const l=window.__harness.game.scene.getScene('game').view.layout;return {width:l.width,height:l.height,rows:l.handRows};});
 (r.resizes??=[]).push({requested:size,beforeObserver:before});
 // ResizeObserver updates Phaser asynchronously. Read rendered geometry only
 // after its CSS viewport matches the requested size; no fixed delay or waiver.
 await p.waitForFunction(size=>{const l=window.__harness.game.scene.getScene('game').view.layout;return l.width===size.width&&l.height===size.height;},size);await ready(p);
}
const state=p=>p.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,save:c.exportJSON()};});
async function observe(p){return p.evaluate(()=>{
 const g=window.__harness.game,s=g.scene.getScene('game'),box=o=>{const b=o.getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height};};
 return {renderer:g.renderer.gl?'WebGL':'Canvas',fps:g.loop.actualFps,layout:s.view.layout,selected:[...s.selectedIds],surface:{rect:s.handInput.surface.getBoundingClientRect().toJSON(),touchAction:getComputedStyle(s.handInput.surface).touchAction,active:s.handInput.active},input:s.input.enabled,
  preview:s.previewCards?.list.filter(c=>c.type==='Container').map(c=>({face:box(c.list.find(o=>o.type==='Rectangle')),rank:c.list.filter(o=>o.name==='rank-index').map(o=>({bounds:box(o),font:o.style.fontSize}))}))??[],
  cards:s.cardViews.map(v=>({id:v.card.id,visible:v.container.visible,x:v.container.x,y:v.container.y,scale:v.container.scaleX,rank:box(v.container.list.find(o=>o.name==='rank-index')),mark:v.selectionMark.visible?box(v.selectionMark):null,layer:s.view.root.getIndex(v.container),face:box(v.background),pips:v.container.list.filter(o=>o.name==='card-pip').map(box)})),
  firePieces:s.scoreFlame?.graphic.getData('safePieces')??[],score:[s.resultText,...s.scoreLabels,s.scoreHeat,s.scoreMult,s.scoreTotal,s.breakdownText].filter(o=>o.visible&&o.text).map(o=>({text:o.text,bounds:box(o)}))};
 });}
const intersect=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
function validate(o,count){
 const l=o.layout;
 if(o.selected.length===5){
  assert.equal(o.preview.length,5,'five full preview faces survive the fire budget');
  for(const card of o.preview){
   const b=card.face,a=l.playedArea;
   assert.ok(b.x>=a.x&&b.y>=a.y&&b.x+b.width<=a.x+a.width+.01&&b.y+b.height<=a.y+a.height+.01,'preview remains inside played area');
   assert.equal(intersect(b,l.hand),false,'preview outside hand');
   assert.ok(card.rank.every(r=>parseFloat(r.font)>=14),'readable preview index');
  }
 }
 assert.equal(l.handOverflow,false);assert.equal(l.visibleCardCount,count);assert.equal(l.handRows,count===9?1:2);
 assert.ok(o.cards.every(c=>c.visible));assert.equal(o.surface.touchAction,count===9?'pan-y':'none');
 for(let i=0;i<count;i++){
  const c=o.cards[i],seat=l.cards[i].hit;assert.equal(c.scale,1);assert.ok(seat.width>=36,'readable exposed hit column');
  assert.ok(c.rank.x+c.rank.width<=seat.x+seat.width,'complete rank/suit in its exposed column');
  for(const p of c.pips)assert.ok(!intersect(c.rank,p),'suit art never covers a rank index');
  for(const other of o.cards)if(other.layer>c.layer&&other.id!==c.id){assert.ok(!intersect(c.rank,other.face),c.id+' rank outside later card');if(c.mark)assert.ok(!intersect(c.mark,other.face),c.id+' selection mark outside later card');}
  for(const t of o.score)assert.ok(!intersect(t.bounds,seat),'actual score text outside hand');
  assert.ok(seat.x>=o.surface.rect.x-.01&&seat.x+seat.width<=o.surface.rect.right+.01,'surface contains every row including odd final row');
 }
 for(const t of o.score)for(const b of [...Object.values(l.buttons),...Object.values(l.tableActions),...o.firePieces])assert.ok(!intersect(t.bounds,b),'score text outside controls/fire');
}
let browser;
try{
 for(const engine of (process.env.TWO_ROW_ENGINES||'chromium').split(',')){
  assert.ok({chromium,webkit,firefox}[engine]);browser=await ({chromium,webkit,firefox}[engine]).launch(engine==='chromium'?{executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']}:{});
  for(const width of (process.env.TWO_ROW_WIDTHS||'360,390').split(',').map(Number)){
   const context=await browser.newContext({viewport:{width,height:740},hasTouch:true,deviceScaleFactor:3}),p=await context.newPage(),cdp=engine==='chromium'?await context.newCDPSession(p):undefined;
   const r={engine,version:browser.version(),width,height:740,dpr:3,input:cdp?'native CDP touch + DOM tap':'native mouse cross-row + touchscreen tap',checks:[],errors:[]};report.runs.push(r);p.on('pageerror',e=>r.errors.push(String(e)));p.on('dialog',d=>d.accept());
   const touch=async(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(q=>({x:q.x,y:q.y,id:1}))});
   const down=async q=>{if(cdp)await touch('touchStart',[q]);else{await p.mouse.move(q.x,q.y);await p.mouse.down();}};
   const move=async q=>{if(cdp)await touch('touchMove',[q]);else await p.mouse.move(q.x,q.y);};
   const up=async()=>{if(cdp)await touch('touchEnd',[]);else await p.mouse.up();};
   const route=async indices=>{const ids=await p.evaluate(()=>window.__harness.game.registry.get('runController').state.handOrder),qs=[];for(const i of indices)qs.push(await point(p,'game','card/'+ids[i]));await down(qs[0]);for(const q of qs.slice(1))await move(q);await up();await ready(p);};
   const selected=async()=> (await observe(p)).selected;
   const clear=async()=>{for(const id of await selected())await tapUI(p,'game','card/'+id,true);await ready(p);};
   await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');
   for(const count of (process.env.TWO_ROW_COUNTS||'9,10,11,12,13,14').split(',').map(Number)){
    await p.locator('.run-menu-toggle').tap();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').tap();
    const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).tap();await (await chooser).setFiles({name:'hand-'+count+'.json',mimeType:'application/json',buffer:Buffer.from(fixtures[count])});
    await waitScene(p,'game');await p.waitForFunction(n=>{const g=window.__harness.game;return g.registry.get('runController').state.handOrder.length===n&&g.scene.getScene('game').cardViews.length===n;},count);await ready(p);const initial=await state(p),ids=initial.state.handOrder,columns=Math.ceil(count/2);
    let rest=await observe(p);validate(rest,count);r.checks.push({count,name:'all rank/suit/mark/hit/score geometry',status:'PASS',rows:rest.layout.handRows});
    if(process.env.TWO_ROW_SCREENSHOTS!=='0'&&[9,10,14].includes(count))await p.screenshot({path:`${dir}/${engine}-${width}-${count}-rest.png`});
    const path=count===9?[0,1,2,3,4]:[0,columns,columns+1,columns+2,2];
    await route(path);assert.deepEqual(new Set(await selected()),new Set(path.map(i=>ids[i])));validate(await observe(p),count);assert.deepEqual(await state(p),initial,'selection cannot change save or RNG');
    if(process.env.TWO_ROW_SCREENSHOTS!=='0'&&[9,10,14].includes(count))await p.screenshot({path:`${dir}/${engine}-${width}-${count}-five.png`});
    await route([...path].reverse());assert.deepEqual(await selected(),[]);await route(path);await route([...path].reverse());assert.deepEqual(await selected(),[],'repeat release never double toggles');
    await route(Array.from({length:count},(_,i)=>i));assert.equal((await selected()).length,5);await clear();assert.deepEqual(await state(p),initial);
    if(count===14){
     const a=await point(p,'game','card/'+ids[0]),b=await point(p,'game','card/'+ids[columns]);
     await down(a);await move(b);await p.keyboard.press('Escape');await up();assert.deepEqual(await selected(),[],'Escape restores initial selection');
     if(cdp){await down(a);await move(b);await touch('touchCancel',[]);assert.deepEqual(new Set(await selected()),new Set([ids[0],ids[columns]]));await clear();}
     await down(a);await move(b);const snapshot=await state(p);await resize(p,{width:width===360?390:360,height:740},r);await up();
     assert.deepEqual(new Set(await selected()),new Set([ids[0],ids[columns]]));assert.deepEqual(await state(p),snapshot);validate(await observe(p),count);
     await tapUI(p,'game','card/'+ids[columns],true);assert.deepEqual(await selected(),[ids[0]],'fresh contact after resize');
     for(const action of ['action/sort-rank','action/sort-suit']){const before=await state(p);await tapUI(p,'game',action,true);await ready(p);assert.deepEqual((await state(p)).state.rng,before.state.rng);assert.deepEqual(await selected(),[ids[0]]);validate(await observe(p),count);}
     for(const size of [{width,height:640},{width:844,height:300},{width,height:740}]){const before=await state(p);await resize(p,size,r);assert.deepEqual(await state(p),before);assert.deepEqual(await selected(),[ids[0]]);if(size.height===740)validate(await observe(p),count);}
     const beforePreference=await state(p);await openMenuSection(p,'settings',true);await p.getByLabel('减少动态',{exact:true}).check();await p.locator('.run-menu-toggle').tap();await ready(p);validate(await observe(p),count);assert.deepEqual(await selected(),[ids[0]]);assert.deepEqual(await state(p),beforePreference,'presentation preference cannot alter save');
     const before=await state(p);await tapUI(p,'game','action/discard',true);await ready(p);const after=await state(p);assert.equal(after.state.handOrder.length,count);assert.equal(after.state.stage.discardsLeft,before.state.stage.discardsLeft-1);assert.ok(after.state.discardPile.includes(ids[0]));assert.deepEqual(await selected(),[]);validate(await observe(p),count);
     await p.reload();await waitScene(p,'title');assert.deepEqual(await state(p),after);await tapUI(p,'title','action/title-continue',true);await waitScene(p,'game');await ready(p);assert.deepEqual(await state(p),after);validate(await observe(p),count);
     r.checks.push({count,name:'Escape/native-cancel/resize/fresh-contact/sort/rotate/discard/refill/reload',status:'PASS'});
    }
    r.checks.push({count,name:'bidirectional cross-row select/cancel/repeat/five-limit/full-save invariants',status:'PASS'});
   }
   assert.deepEqual(r.errors,[]);r.final=await observe(p);await context.close();console.log(engine+'/'+width+': PASS');
  }
  await browser.close();browser=undefined;
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}
finally{if(browser)await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2));}
