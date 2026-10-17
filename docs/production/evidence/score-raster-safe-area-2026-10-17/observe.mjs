/** Narrow real-Canvas draw probe. Input fixtures are retained reviewer checkpoints. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from '../../../../harness/ui.mjs';
const phase=process.argv[2]??'after',out='shots/score-raster-boundary/'+phase;
await mkdir(out,{recursive:true});
const files=['src/game/TextRaster.ts','src/game/ScoreTableReadouts.ts','src/game/ScoreTableMotion.ts','src/game/HeroSkillStatusText.ts'];
const hashes=()=>Promise.all(files.map(async p=>[p,createHash('sha256').update(await readFile(p)).digest('hex')]));
const report={phase,baseline:'2a090feec92e0f646aeac484742560f9d955464c',sources:Object.fromEntries(await hashes()),scope:'Retained c197 Su Shi hand, and 361 Wencheng/Huarui fixtures. One saved hand per selected case; native UI and actual Canvas drawImage rectangles at POST_RENDER, no animation or rules replacement. DPR1/2 software browser; no physical device or hearing claim.',cases:[]};
const server=await createServer({mode:'e2e',cacheDir:'shots/.vite-score-raster',server:{host:'127.0.0.1',port:5693,strictPort:true},logLevel:'error'});await server.listen();
const {dynamicHeroFixture}=await server.ssrLoadModule('/harness/fixtures/wencheng-huarui-dynamic.ts'),domain=await server.ssrLoadModule('/src/domain/run.ts'),cp=await server.ssrLoadModule('/src/application/checkpoint.ts');
const old=JSON.parse(gunzipSync(await readFile('docs/production/evidence/amo-laohuan-public-fix-2026-10-17/observed/prewire-report.json.gz'))).cases.find(r=>r.key==='amo-390');
const browser=await chromium.launch({args:['--disable-gpu']});report.browser=browser.version();
try{for(const id of (process.env.RASTER_CASES??'amo,azao,xiemu').split(',')){
 const fixture=id==='amo'?{state:old.before.state,checkpoint:old.fixture,selectedIds:old.skill.command.action.selectedIds}:dynamicHeroFixture(id),dpr=id==='amo'?2:1;
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:dpr,hasTouch:true}),p=await context.newPage(),row={id,dpr,errors:[]};report.cases.push(row);p.setDefaultTimeout(30000);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
 try{
  await p.goto('http://127.0.0.1:5693/?harness=1');await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();
  const choose=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await choose).setFiles({name:'retained-raster-hand.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture.checkpoint))});
  await waitScene(p,'game');const start=p.getByRole('button',{name:'开始出牌',exact:true});if(await start.count())await start.click();if(await p.locator('dialog[open]').count())await p.keyboard.press('Escape');
  await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.every(v=>!v.dealing);});
  for(const card of fixture.selectedIds){await tapUI(p,'game','card/'+card,true);await p.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),card);}
  await tapUI(p,'game','hero/action-shortcut',true);if(id==='azao')await p.getByRole('button',{name:'本手释放 ×1.5',exact:true}).tap();if(id==='xiemu')await p.getByRole('button',{name:/^付20金/}).tap();if(id!=='amo')await p.waitForFunction(()=>!document.querySelector('dialog[open]'));
  await p.evaluate(()=>{
   const g=window.__harness.game,s=g.scene.getScene('game'),ctx=g.renderer.currentContext;if(g.renderer.type!==1)throw Error('Canvas renderer required');
   const audit=window.__raster={frames:[],shots:{},active:true,renderer:g.renderer.type},original=ctx.drawImage,lookup=new Map();let draws=[];
   const box=(points)=>{const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));return{x,y,width:right-x,height:bottom-y,right,bottom};};
   g.events.on('prerender',()=>{lookup.clear();draws=[];if(!audit.active||!s.presentation)return;for(const o of [s.scoreHeat,s.scoreMult,s.scoreTotal])lookup.set(o.canvas,o);for(const group of s.view.root.list.filter(o=>o.name==='score/source-arrival'))for(const o of group.list??[])if(o.name==='score/source-value')lookup.set(o.canvas,o);});
   ctx.drawImage=function(...args){const o=lookup.get(args[0]);if(o&&args.length===9){const m=this.getTransform(),[x,y,w,h]=args.slice(5),r=g.canvas.getBoundingClientRect(),point=(a,b)=>({x:(m.a*a+m.c*b+m.e)*r.width/g.canvas.width,y:(m.b*a+m.d*b+m.f)*r.height/g.canvas.height});draws.push({name:o.name,text:o.text,draw:box([point(x,y),point(x+w,y),point(x,y+h),point(x+w,y+h)]),logical:o.getBounds(),style:o.style.resolution,source:o.frame.source.resolution,texture:[o.canvas.width,o.canvas.height],scale:o.scaleX,requested:Number(o.getData('scorePulseScale')??1)});}return original.apply(this,args);};
   g.events.on('postrender',()=>{if(!audit.active||!s.presentation)return;const board=s.view.layout.scoreBoard,event=s.presentation.score.events.find(e=>e.eventId===s.scoreTotal.getData('eventId')),frame={t:performance.now(),id:event?.eventId,operation:event?.operation,phase:s.scoreTotal.getData('eventPhase'),board,draws};
    audit.frames.push(frame);const heat=draws.find(o=>o.name==='score/heat'),mult=draws.find(o=>o.name==='score/multiplier');
    for(const [key,n]of [['heat-peak',heat],['multiplier-peak',mult]])if(n?.requested>1.02&&n.requested>(audit.shots[key]?.value??0)){audit.shots[key]={value:n.requested,frame,png:g.canvas.toDataURL('image/png')};}
    if(heat?.text==='75'&&heat.requested>1.02&&heat.requested>(audit.shots['heat-75-peak']?.value??0))audit.shots['heat-75-peak']={value:heat.requested,frame,png:g.canvas.toDataURL('image/png')};
   });
  });
  const before=await p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:await c.store.read()};});assert.deepEqual(before.state,fixture.state);
  await tapUI(p,'game','action/play',true);await p.waitForFunction(seq=>{const s=window.__harness.game.scene.getScene('game');return s.run.commandSeq===seq+1&&s.ready&&!s.playing&&!s.presentation;},before.state.commandSeq);
  const after=await p.evaluate(async()=>{window.__raster.active=false;const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:await c.store.read(),audit:window.__raster};}),command=after.journal.at(-1),expected=domain.applyCommand(before.state,command);assert.ok(expected.ok,expected.code);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.storage.current,cp.makeCheckpoint(after.state,after.journal));assert.equal(after.journal.length,before.journal.length+1);assert.deepEqual(row.errors,[]);
  row.stateExact=true;row.finalScore=after.state.lastTrace.finalScore;row.audit=after.audit;
  const outside=(a,b)=>a.x<b.x-.6||a.y<b.y-.6||a.right>b.x+b.width+.6||a.bottom>b.y+b.height+.6;
  row.densityMismatch=row.audit.frames.flatMap(f=>f.draws.filter(n=>n.style!==n.source).map(n=>({id:f.id,...n})));
  row.overflow=row.audit.frames.flatMap(f=>f.draws.filter(n=>n.name!=='score/source-value'&&outside(n.draw,f.board)||n.name==='score/source-value'&&(n.draw.x<-.6||n.draw.right>390.6)).map(n=>({id:f.id,board:f.board,...n})));
  for(const [name,shot]of Object.entries(row.audit.shots)){await writeFile(out+'/'+id+'-'+name+'.png',Buffer.from(shot.png.split(',')[1],'base64'));delete shot.png;}
  assert.ok(row.audit.shots['heat-peak'].value>1.25);assert.ok(row.audit.shots['multiplier-peak'].value>1.47);
  row.actualPeaks=Object.fromEntries(['score/heat','score/multiplier','score/total'].map(name=>[name,Math.max(...row.audit.frames.flatMap(f=>f.draws.filter(n=>n.name===name).map(n=>n.scale)))]));assert.ok(row.actualPeaks['score/heat']>1.25);assert.ok(row.actualPeaks['score/multiplier']>1.47);
  if(phase.startsWith('after')){assert.equal(row.densityMismatch.length,0);assert.equal(row.overflow.length,0);}
  row.status='PASS';console.log(JSON.stringify({id,status:row.status,frames:row.audit.frames.length,mismatches:row.densityMismatch.length,overflows:row.overflow.length,heatPeak:row.audit.shots['heat-peak'].value,multPeak:row.audit.shots['multiplier-peak'].value,finalScore:row.finalScore}));
 }catch(e){row.status='FAIL';row.error=String(e.stack);process.exitCode=1;await p.screenshot({path:out+'/'+id+'-FAIL.png'}).catch(()=>{});console.log(JSON.stringify({id,error:row.error}));}finally{await context.close();}
}report.sourceUnchanged=JSON.stringify(report.sources)===JSON.stringify(Object.fromEntries(await hashes()));assert.ok(report.sourceUnchanged);
}finally{await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));await browser.close();await server.close();}
