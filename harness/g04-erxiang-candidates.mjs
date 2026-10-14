/** G04 controlled public-hand check; does not replace dot's natural gameplay. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';

const baseline=process.env.G04_BASELINE==='1';
const out=process.env.G04_OUTPUT??'shots/g04-erxiang-candidates';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5584,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {completeControlledRouteHistory}=await server.ssrLoadModule('/tests/fixtures/route-growth-history.ts');
const ids=['diamonds-9','hearts-9','spades-9','clubs-9'];
const order=[ids[0],'clubs-2',ids[1],'clubs-4',ids[2],ids[3],'hearts-6','spades-7'];
const send=(s,action)=>{const r=applyCommand(s,{runId:s.runId,commandId:'setup/'+s.commandSeq,expectedSeq:s.commandSeq,action});assert.ok(r.ok,r.code);return r.state;};
function fixture(kind='normal'){
 let s=createRun({rulesVersion:'r2',characterId:'erxiang',runId:'g04/controlled',seed:kind==='Q01'?'challenge/q01/0':'group-natural-17',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:kind==='Q01'?'challenge':'standard',difficulty:0,challengeId:kind==='Q01'?'Q01':null,programsEnabled:false}});
 if(kind==='B08'||kind==='B02'){
  s.phase='stage-ready';s.stageIndex=kind==='B08'?8:2;s.chapter=kind==='B08'?3:1;s.seenBossIds=kind==='B08'?['B01','B02','B08']:['B02'];s.boss={definitionId:kind,disabledSuit:null};s.shop.visitIndex=s.stageIndex;completeControlledRouteHistory(s);
  s=send(s,{type:'EnterStage'});
 }else
 s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
 const specials=[{}, {enhancement:'heat-paper',edition:'foil'}, {enhancement:'glass-paper',edition:'polychrome'}, {enhancement:'heat-paper',edition:'foil'}];
 ids.forEach((id,i)=>Object.assign(s.deckInstances.find(c=>c.id===id),{rank:9,suit:'clubs'},specials[i]));
 s.handOrder=[...order];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!order.includes(id));
 if(kind==='used'){
  const pair=['clubs-2','hearts-2'];s.handOrder=[...pair,...order.filter(id=>!pair.includes(id))].slice(0,8);s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id));s=send(s,{type:'PlayHand',selectedIds:pair,erxiangTargetId:pair[0]});assert.equal(s.phase,'await-input');
  s.handOrder=[...order.filter(id=>!s.playedPile.includes(id)),'hearts-4'].slice(0,8);s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!s.handOrder.includes(id)&&!s.playedPile.includes(id));
 }
 assert.ok(readCheckpoint(makeCheckpoint(s,[])).ok,'controlled checkpoint must be valid');return s;
}
const snap=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:await c.store.read(),localStorage:JSON.stringify(localStorage)};});
const idle=p=>p.waitForFunction(()=>{const g=window.__harness.game;if(g.scene.isActive('intermission'))return g.scene.getScene('intermission').ready;const s=g.scene.getScene('game');return s.scene.isActive()&&s.ready&&!s.presentation&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
async function imp(p,s){
 if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await p.locator('.run-menu-toggle').click();
 await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();
 const event=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await event).setFiles({name:'g04-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});
 await waitScene(p,'game');await idle(p);assert.deepEqual((await snap(p)).state,s);
}
async function operation(p,touch,empty=false){await tapUI(p,'game','hero/erxiang-handoff',touch);const b=p.getByRole('button',{name:'查看本场技能操作',exact:true});if(touch)await b.tap();else await b.click();await p.getByRole('button',{name:'返回选牌',exact:true}).waitFor();if(!empty)await p.locator('.dialog-choice-actions').waitFor();}
const close=p=>{const b=p.getByRole('button',{name:'返回选牌',exact:true});return p.viewportSize().width<500?b.tap():b.click();};
const shot=(p,name)=>p.screenshot({path:out+'/'+name+'.png',scale:'css'});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline,scope:'G04 controlled public hand, software Chromium mouse/touch at 1366/390, necessary 320 inspection. Not dot natural games, physical devices, human understanding or audio acceptance.',cases:[],errors:[]};
const full=[];
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{
 for(const viewport of [{width:1366,height:768},{width:390,height:740}]){
  const touch=viewport.width<500,ctx=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:1}),p=await ctx.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(String(e)));p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:5584/?harness=1');await waitScene(p,'title');
  const dom=b=>touch?b.tap():b.click();
  const s=fixture(),row={viewport};report.cases.push(row);await imp(p,s);const before=await snap(p);
  for(const id of ids)await tapUI(p,'game','card/'+id,touch);
  await operation(p,touch);row.labels=await p.locator('.dialog-choice-actions button').allTextContents();row.text=await p.locator('dialog[open]').innerText();await shot(p,viewport.width+'-candidates');
  if(baseline){assert.equal(new Set(row.labels).size,1);assert.equal(row.labels.length,4);row.reproducedAmbiguousSameName=true;await close(p);assert.deepEqual(await snap(p),before);await ctx.close();continue;}
  assert.equal(new Set(row.labels).size,4);assert.match(row.text,/增强：无增强/);assert.match(row.text,/热度纸/);assert.match(row.text,/玻璃纸/);assert.match(row.text,/闪箔/);assert.match(row.text,/多彩/);assert.match(row.text,/首次普通9点/);
  assert.match(row.text,/增强、版次和额外计分仍按各自规则/);
  for(const size of touch?[viewport,{width:320,height:740}]:[viewport]){
   await p.setViewportSize(size);const geometry=[];
   for(const b of await p.locator('.dialog-choice-actions button').all()){
    await b.scrollIntoViewIfNeeded();const g=await b.evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{x:r.x,y:r.y,width:r.width,height:r.height,font:parseFloat(s.fontSize),client:e.clientWidth,scroll:e.scrollWidth};});
    assert.ok(g.x>=0&&g.x+g.width<=size.width&&g.y>=0&&g.y+g.height<=size.height);assert.ok(g.height>=44&&g.font>=14&&g.scroll<=g.client);geometry.push(g);
   }
   for(const d of await p.locator('.dialog-choice-actions p').all())assert.ok(await d.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=14&&e.scrollWidth<=e.clientWidth));
   await p.locator('.dialog-scroll').evaluate(e=>e.scrollTop=0);await shot(p,size.width+'-readable');row[size.width+'Geometry']=geometry;
  }
  await p.setViewportSize(viewport);await close(p);assert.deepEqual(await snap(p),before);
  // Every same-name instance selects its exact ID, then cancels without a save.
  for(const id of ids){await operation(p,touch);await dom(p.getByRole('button',{name:new RegExp('^第'+(order.indexOf(id)+1)+'张 · 9♣$')}));assert.equal(await p.evaluate(()=>window.__harness.game.scene.getScene('game').erxiangTargetId),id);await operation(p,touch);await close(p);await operation(p,touch);await dom(p.getByRole('button',{name:'取消本手交棒',exact:true}));assert.deepEqual(await snap(p),before);}
  // A real change of selected core clears the existing handoff draft.
  await operation(p,touch);await dom(p.getByRole('button',{name:/^第1张/}));await tapUI(p,'game','card/'+ids[0],touch);assert.equal(await p.evaluate(()=>window.__harness.game.scene.getScene('game').erxiangTargetId),null);assert.deepEqual(await snap(p),before);row.cancelAndInvalidationUnchanged=true;
  // Plain and enhanced native choices commit precisely the existing PlayHand.
  for(const target of ids.slice(0,2)){
   await imp(p,s);const initial=await snap(p);for(const id of ids)await tapUI(p,'game','card/'+id,touch);await operation(p,touch);await dom(p.getByRole('button',{name:new RegExp('^第'+(order.indexOf(target)+1)+'张')}));
   if(target===ids[0])await p.evaluate(()=>{const c=window.__harness.game.registry.get('runController'),store=c.store,commit=store.commit;window.__g04CommitCalls=0;store.commit=async(...args)=>{window.__g04CommitCalls++;await new Promise(resolve=>window.__g04Release=resolve);store.commit=commit;return commit.apply(store,args);};});
   await tapUI(p,'game','action/play',touch);
   if(target===ids[0]){
    await p.waitForFunction(()=>window.__g04CommitCalls===1);assert.deepEqual(await snap(p),initial);await tapUI(p,'game','hero/erxiang-handoff',touch);assert.ok(await p.getByRole('button',{name:'查看本场技能操作',exact:true}).isDisabled());await shot(p,viewport.width+'-busy');await dom(p.locator('dialog[open] .dialog-close'));assert.deepEqual(await snap(p),initial);
    // Direct inspection additionally verifies the local candidate readiness guard.
    await p.evaluate(()=>window.__harness.game.scene.getScene('game').inspectErxiang());for(const b of await p.locator('.dialog-choice-actions button').all())if((await b.textContent())!=='取消本手交棒')assert.ok(await b.isDisabled());await close(p);assert.deepEqual(await snap(p),initial);await p.evaluate(()=>window.__g04Release());row.busyReadinessAndSaveUnchanged=true;
   }
   await idle(p);
   const after=await snap(p),cmd=after.journal.at(-1),expected=applyCommand(s,cmd);assert.ok(expected.ok,expected.code);assert.deepEqual(cmd.action,{type:'PlayHand',selectedIds:ids,erxiangTargetId:target});assert.deepEqual(after.state,expected.state);assert.deepEqual(after.storage.current.state,expected.state);assert.deepEqual(after.storage.current.journal,after.journal);
   assert.equal(after.state.lastTrace.erxiangHandoff.points,9);assert.equal(after.state.lastTrace.erxiangHandoff.targetId,target);assert.equal(after.state.lastTrace.events.filter(e=>e.reasonKey==='erxiang.handoff').length,1);
   full.push({viewport,target,initial,after,expected:expected.state});row[target]={score:after.state.lastTrace.finalScore,traceAndFullStateEqual:true};
  }
  row.negatives=[];
  for(const kind of ['B08','Q01','used','B02']){
   const state=fixture(kind);await imp(p,state);const unchanged=await snap(p);for(const id of ids)await tapUI(p,'game','card/'+id,touch);await operation(p,touch,kind!=='B02');const labels=await p.locator('.dialog-choice-actions button').allTextContents();
   if(kind==='B02'){const zero=await p.evaluate(()=>window.__harness.game.scene.getScene('game').selectionPreview().ordinaryPointsSuppressedIds);assert.equal(labels.length,3);for(const id of zero)assert.ok(!labels.some(l=>l.startsWith('第'+(state.handOrder.indexOf(id)+1)+'张')));row.negatives.push({kind,zero,labels});}
   else {assert.equal(labels.length,0);row.negatives.push({kind,labels});}
   await shot(p,viewport.width+'-'+kind);await close(p);assert.deepEqual(await snap(p),unchanged);
  }
  row.status='PASS';await ctx.close();console.log(viewport.width,'PASS');
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack??String(e);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(out+'/full-state.json.gz',gzipSync(JSON.stringify(full)));await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(report.status,report.error??'');}
