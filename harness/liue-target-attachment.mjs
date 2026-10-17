import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {tapUI,waitScene,tapMenuAction,point} from './ui.mjs';

const out=process.env.ATTACHMENT_OUT??'shots/liue-target-attachment',port=5191;
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const {liueAttachmentFixture}=await server.ssrLoadModule('/harness/fixtures/liue-target-attachment.ts');
const {energySend}=await server.ssrLoadModule('/harness/fixtures/score-energy.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}),scope:'Controlled public 6-clubs/6-hearts checkpoint, Lv2 pair, mantangcai and b10 growth 0. Boundary case uses Lv1 and omits mantangcai to stay below the original first-stage target for native replay. No rule/target changes. Native import/selection/skill/play/menu inputs. No natural-acquisition/economy/difficulty/device/hearing/touch acceptance.',cases:[]},states=[];
const browser=await chromium.launch({channel:'msedge',headless:true});report.browser=browser.version();
const specs=[{key:'pc',width:1366,height:768,dpr:1},{key:'phone',width:390,height:844,dpr:2},{key:'boundaries',width:1366,height:768,dpr:1},{key:'reduced',width:390,height:740,dpr:3,reduced:true}].filter(s=>!process.env.ATTACHMENT_CASES||process.env.ATTACHMENT_CASES.split(',').includes(s.key));
const snap=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
const settled=p=>p.waitForFunction(()=>{const game=window.__harness.game,s=game.scene.getScene('game');return game.scene.isActive('intermission')||s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
const marks=p=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),all=[],walk=list=>{for(const o of list){if(o.active&&o.name?.startsWith('hero/target-')){const b=o.getBounds();all.push({name:o.name,target:o.getData('targetId'),phase:o.getData('phase'),generation:o.getData('generation'),flow:o.getData('flowPhase'),progress:o.getData('progress'),bounds:{x:b.x,y:b.y,width:b.width,height:b.height}});}if(o.list)walk(o.list);}};walk(s.view.root.list);return all;});
const choose=async(p,id,touch)=>{await tapUI(p,'game','hero/action-shortcut',touch);const suit=id==='hearts-6'?'♥':'♣',button=p.getByRole('button',{name:new RegExp('^(已选 )?第\\d+张 · 6'+suit+'$')});if(touch)await button.tap();else await button.click();await p.waitForFunction(()=>!document.querySelector('dialog[open]'));};
const noMarks=async p=>{await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game'),walk=list=>list.some(o=>o.active&&o.name?.startsWith('hero/target-')||o.list&&walk(o.list));return !walk(s.view?.root?.list??[]);});};
async function observe(p){await p.evaluate(()=>{
  const game=window.__harness.game,probe=window.__attachmentProbe={frames:[],images:[],seen:new Set(),lastIdle:-Infinity,events:[],errors:[]};
  const box=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
  game.events.on('postrender',()=>{
    const s=game.scene.getScene('game');if(!s.scene.isActive()||!s.view?.root.active)return;
    const nodes=[],walk=list=>{for(const o of list){if(o.active&&o.name?.startsWith('hero/target-'))nodes.push(o);if(o.list)walk(o.list);}};walk(s.view.root.list);
    const edge=nodes.find(o=>o.name==='hero/target-edge'),flight=nodes.find(o=>o.name==='hero/target-travel'),tag=nodes.find(o=>o.name==='hero/target-tag');
    const target=s.cardViews.find(v=>v.card.id==='hearts-6')??s.settledCards.get('hearts-6'),other=s.cardViews.find(v=>v.card.id==='clubs-6')??s.settledCards.get('clubs-6'),index=target?.container.list.find(o=>o.name==='rank-index');
    const row={at:performance.now(),phase:edge?.getData('phase'),target:edge?.getData('targetId'),flow:edge?.getData('flowPhase'),generation:edge?.getData('generation'),travel:flight?.getData('progress'),tag:tag?.text,tagBounds:tag?box(tag):undefined,indexBounds:index?box(index):undefined,targetBounds:target?box(target.background):undefined,otherBounds:other?box(other.background):undefined,edgeCount:nodes.filter(o=>o.name==='hero/target-edge').length,event:s.scoreTotal?.getData('eventId'),eventPhase:s.scoreTotal?.getData('eventPhase'),H:s.scoreHeat?.text,M:s.scoreMult?.text};
    if(probe.frames.length<3500)probe.frames.push(row);
    if(row.phase==='release'&&!probe.events.some(e=>e.event===row.event))probe.events.push(row);
    let key;if(flight){const bucket=Math.floor((row.travel??0)*3);key='travel-'+row.generation+'-'+bucket;}
    else if(row.phase==='idle'&&row.at-probe.lastIdle>=190&&probe.images.filter(i=>i.key.startsWith('idle-')).length<18){probe.lastIdle=row.at;key='idle-'+probe.images.filter(i=>i.key.startsWith('idle-')).length;}
    else if(row.phase==='release')key='release-'+Math.floor((row.flow??0)*8);
    if(key&&!probe.seen.has(key)){probe.seen.add(key);probe.images.push({key,...row,png:game.canvas.toDataURL('image/png')});}
    if(nodes.some(o=>o.getData('targetId')!==s.erxiangTargetId&&!s.presentation))probe.errors.push('attachment on a different draft target');
    if(row.edgeCount>1)probe.errors.push('multiple target owners');
  });
});}

try{for(const spec of specs){
  const fixture=liueAttachmentFixture(spec.key!=='boundaries'),checkpoint=makeCheckpoint(fixture.state,[]);assert.ok(readCheckpoint(checkpoint).ok);
  let expected=energySend(fixture.state,{type:'PlayHand',selectedIds:fixture.selectedIds,erxiangTargetId:fixture.targetId});if(spec.key==='boundaries')assert.equal(expected.phase,'await-input');else assert.equal(expected.lastTrace.finalScore,'1241');
  const dir=out+'/'+spec.key;await mkdir(dir,{recursive:true});
  const viewport={width:spec.width,height:spec.height},touch=spec.width<800,context=await browser.newContext({viewport,deviceScaleFactor:spec.dpr,hasTouch:touch,reducedMotion:spec.reduced?'reduce':'no-preference',recordVideo:{dir,size:viewport}}),p=await context.newPage(),row={...spec,status:'RUNNING',errors:[]};report.cases.push(row);p.setDefaultTimeout(30000);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
  try{
    await p.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(p,'title');
    await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
    const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'liue-public-hand.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
    await waitScene(p,'game');await settled(p);const intro=p.getByRole('button',{name:'开始出牌',exact:true});if(await intro.count())await intro.click();if(await p.locator('.detail-dialog[open]').count())await p.getByRole('button',{name:'关闭',exact:true}).click();
    for(const id of fixture.selectedIds)await tapUI(p,'game','card/'+id,touch);
    let initial=await snap(p);assert.deepEqual(initial.state,fixture.state);await observe(p);await choose(p,fixture.targetId,touch);
    await p.waitForTimeout(spec.reduced?500:3300);
    row.accepted=await marks(p);assert.equal(row.accepted.filter(m=>m.name==='hero/target-edge').length,1);assert.ok(row.accepted.every(m=>m.target===fixture.targetId));assert.deepEqual(await snap(p),initial,'preview/idle does not mutate state/journal/storage');
    await p.screenshot({path:dir+'/accepted.png'});
    if(spec.key==='boundaries'){
      await choose(p,fixture.otherId,false);await p.waitForTimeout(250);row.retarget=await marks(p);assert.ok(row.retarget.length&&row.retarget.every(m=>m.target===fixture.otherId));assert.notEqual(row.retarget.find(m=>m.name==='hero/target-edge').generation,row.accepted.find(m=>m.name==='hero/target-edge').generation);
      await tapUI(p,'game','hero/action-shortcut',false);await p.getByRole('button',{name:'取消本手选牌',exact:true}).click();await noMarks(p);assert.deepEqual(await snap(p),initial);row.cancelNoCommit=true;
      await choose(p,fixture.targetId,false);await p.waitForTimeout(230);const generation=(await marks(p)).find(m=>m.name==='hero/target-edge').generation;
      const cardPoint=await point(p,'game','card/'+fixture.targetId);await p.mouse.move(cardPoint.x,cardPoint.y);await p.mouse.down();await p.waitForTimeout(430);await p.mouse.up();await p.getByRole('button',{name:'右移',exact:true}).click();await p.getByRole('button',{name:'关闭',exact:true}).click();await settled(p);await p.waitForTimeout(220);
      const reordered=await snap(p);assert.deepEqual(reordered.state,energySend(initial.state,{type:'ReorderHand',ids:reordered.state.handOrder}));initial=reordered;expected=energySend(initial.state,{type:'PlayHand',selectedIds:fixture.selectedIds,erxiangTargetId:fixture.targetId});
      const rebound=await marks(p);assert.ok(rebound.every(m=>m.target===fixture.targetId));assert.equal(rebound.find(m=>m.name==='hero/target-edge').generation,generation);assert.ok(!rebound.some(m=>m.name==='hero/target-travel'));row.reorderTracksInstance=true;
      await p.locator('.run-menu-toggle').click();await noMarks(p);await p.getByRole('button',{name:'继续本局',exact:true}).click();await p.waitForTimeout(100);assert.ok((await marks(p)).some(m=>m.phase==='idle'));assert.ok(!(await marks(p)).some(m=>m.name==='hero/target-travel'));row.menuNoTail=true;
      await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',false);await waitScene(p,'game');await settled(p);await noMarks(p);assert.deepEqual(await snap(p),initial);row.reloadClearsDraft=true;
      for(const id of fixture.selectedIds)await tapUI(p,'game','card/'+id,false);await observe(p);await choose(p,fixture.targetId,false);
      row.beforeImmediatePlay=await marks(p);assert.ok(row.beforeImmediatePlay.some(m=>m.phase==='travel'),'save begins during source travel');
    }
    const beforePlay=performance.now();await tapUI(p,'game','action/play',touch);
    await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').presentation||!window.__harness.game.scene.getScene('game').playing);row.submitMs=performance.now()-beforePlay;
    if(spec.key==='boundaries'){
      await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').scoreTotal?.getData('eventPhase')==='base-impact');await tapMenuAction(p,'快进当前手');await settled(p);await noMarks(p);assert.deepEqual((await snap(p)).state,expected);row.fastForwardNoTail=true;
      const saved=await snap(p);await tapMenuAction(p,'回看上一手');await p.waitForTimeout(300);await noMarks(p);await tapMenuAction(p,'快进当前手');await settled(p);assert.deepEqual(await snap(p),saved);row.replayNoDraftOrWrite=true;
    }else{
      await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.presentation&&s.scoreTotal.getData('eventPhase')==='impact'&&s.presentation.score.events.some(e=>e.eventId===s.scoreTotal.getData('eventId')&&e.reasonKey==='erxiang.handoff');});
      row.actualImpact=await marks(p);await p.screenshot({path:dir+'/impact.png'});await settled(p);await noMarks(p);
    }
    const final=await snap(p);assert.deepEqual(final.state,expected);states.push({key:spec.key,initial,final});
    const probe=await p.evaluate(()=>{const q=window.__attachmentProbe;return {frames:q.frames,images:q.images,events:q.events,errors:[...new Set(q.errors)]};});
    for(const image of probe.images){await writeFile(dir+'/'+image.key+'.png',Buffer.from(image.png.split(',')[1],'base64'));delete image.png;}
    if(!spec.reduced&&spec.key!=='boundaries'){
      const idle=probe.frames.filter(f=>f.phase==='idle');assert.ok(idle.at(-1).at-idle[0].at>=3000);assert.ok(new Set(idle.map(f=>Math.round(f.flow*100))).size>15);assert.ok(probe.images.filter(i=>i.key.startsWith('idle-')).length>=16);assert.equal(probe.events.length,1);assert.equal(probe.events[0].target,fixture.targetId);assert.equal(probe.events[0].eventPhase,'impact');
    }
    if(spec.reduced){assert.ok(!probe.frames.some(f=>f.travel!==undefined));assert.ok(probe.frames.filter(f=>f.phase==='idle').every(f=>f.flow===0));}
    assert.deepEqual(probe.errors,[]);assert.deepEqual(row.errors,[]);await writeFile(dir+'/frames.json.gz',gzipSync(JSON.stringify(probe)));row.samples=probe.images;row.frames=probe.frames.length;row.releaseEvents=probe.events;row.status='PASS';await p.screenshot({path:dir+'/clean.png'});
  }catch(error){row.status='FAIL';row.error=String(error.stack||error);await p.screenshot({path:dir+'/FAIL.png'}).catch(()=>{});throw error;}
  finally {const video=p.video();await context.close();if(video)await rename(await video.path(),dir+'/continuous.webm').catch(()=>{});}
}report.status='PASS';}catch(error){report.status='FAIL';report.error=String(error.stack||error);process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await writeFile(out+'/states.json.gz',gzipSync(JSON.stringify(states)));console.log(JSON.stringify({status:report.status,cases:report.cases.map(r=>({key:r.key,status:r.status,error:r.error,frames:r.frames}))}));await browser.close();await server.close();}
