/** Normal title/selector/shop route with naturally shuffled cards. No checkpoint import or state injection. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {waitScene,tapUI,point,tapMenuAction,confirmHeroRoute} from './ui.mjs';
import {snapshotSource} from '../scripts/check-runner.mjs';
const dir=process.env.COMBO_UI_DIR||'shots/p08-combo-growth-ui',before=snapshotSource(process.cwd());
await mkdir(dir,{recursive:true});
const report={source:before.head,before,scope:'Natural fixed seed, real UI inputs, software Canvas; no fixtures or run mutation.',cases:[],screenshots:[]};
await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'error'});report.build=JSON.parse(await readFile(dir+'/build/build-info.json','utf8'));
const server=await preview({build:{outDir:dir+'/build'},preview:{port:5361,host:'127.0.0.1',strictPort:true},logLevel:'error'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});report.browser=browser.version();
const intersects=(a,b)=>a.x<b.x+b.width-.1&&b.x<a.x+a.width-.1&&a.y<b.y+b.height-.1&&b.y<a.y+a.height-.1;
try{for(const spec of [{name:'select-320',width:320,height:568},{name:'select-390',width:390,height:740,natural:true},{name:'select-short',width:844,height:300,top:12,bottom:34},{name:'select-desktop',width:1280,height:720}]){
 const ctx=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await ctx.newPage(),row={spec,status:'RUNNING',checks:[],errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));
 const tap=(scene,name)=>tapUI(p,scene,name,true),state=()=>p.evaluate(()=>window.__harness.game.registry.get('runController').state),saved=()=>p.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,export:c.exportJSON()};});
 const settled=()=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
 const changed=seq=>p.waitForFunction(seq=>{const c=window.__harness.game.registry.get('runController');return c.status==='idle'&&c.state.commandSeq>seq;},seq);
 const shot=async name=>{await p.screenshot({path:dir+'/'+name+'.png',fullPage:true,scale:'css'});report.screenshots.push(name+'.png');};
 try{
  await p.addInitScript(spec=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--safe-top',(spec.top||0)+'px');document.documentElement.style.setProperty('--safe-bottom',(spec.bottom||0)+'px');}),spec);
  await p.goto('http://127.0.0.1:5361/?harness=1&seed=amo-launch-recovery');await waitScene(p,'title');await tap('title','action/title-start');await waitScene(p,'character-select');await tap('character-select','character/amo');
  row.geometry=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),all=walk(s.children.list);return {texts:all.filter(o=>o.type==='Text'&&o.visible).map(o=>({text:o.text,font:o.style.fontSize,bounds:o.getBounds()})),controls:all.filter(o=>o.input?.enabled).map(o=>({name:o.name,bounds:o.getBounds()})),dom:[...document.querySelectorAll('.run-menu-toggle,.fullscreen-toggle')].map(o=>({text:o.textContent,bounds:o.getBoundingClientRect().toJSON()}))};});
  const g=row.geometry,title=g.texts.find(t=>t.text==='巡演选角');assert.ok(title);assert.ok(g.texts.some(t=>t.text.includes('主手＋助攻（试行）')));
  assert.ok(!g.texts.some(t=>/单张|Lv3/.test(t.text)));
  for(const c of g.controls){assert.ok(c.bounds.width>=44&&c.bounds.height>=44,c.name+' 44px');assert.ok(!intersects(title.bounds,c.bounds),c.name+' title overlap');}
  for(const d of g.dom){assert.ok(!intersects(title.bounds,d.bounds),'DOM title overlap');for(const c of g.controls)assert.ok(!intersects(c.bounds,d.bounds),c.name+' DOM overlap');}
  const description=g.texts.find(t=>t.text.includes('副组真消耗'));assert.ok(description);assert.ok(parseFloat(description.font)>=14,'description >=14px');for(const c of g.controls)assert.ok(!intersects(description.bounds,c.bounds),c.name+' description overlap');
  await shot(spec.name);row.checks.push('selected assist copy, title clear of mode/menu, 44px controls and description clear of actions');
  await tap('character-select','action/character-details');const detail=await p.getByRole('dialog').innerText();assert.match(detail,/两对、三条、顺子、同花/);assert.match(detail,/高牌和对子仅兜底/);assert.doesNotMatch(detail,/单张|Lv3|高牌升级/);await p.getByRole('button',{name:'关闭',exact:true}).tap();
  await tap('character-select','action/cancel-character');assert.equal((await point(p,'character-select','action/confirm-character')).enabled,false);await tap('character-select','character/amo');await confirmHeroRoute(p,true);await waitScene(p,'shop');
  const fresh=await saved();assert.equal(fresh.state.contentHash,'json-fnv-v1:e7d21fce68b80072');assert.equal(fresh.state.contentVersion,'quality-r2-combo-growth-prototype-v1');assert.deepEqual(fresh.state.handLevels,{});row.checks.push('normal Title → CharacterSelect → Shop creates frozen shared combo identity after explicit confirmation');
  if(spec.natural){
   await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(370);await tap('shop','action/start-stage');await waitScene(p,'game');await settled();
   const first=await state();row.initialHand=first.handOrder;
   const cards=first.handOrder.map(id=>first.deckInstances.find(c=>c.id===id)),counts={};for(const c of cards)counts[c.rank]=(counts[c.rank]||0)+1;
   const discard=cards.filter(c=>counts[c.rank]===1).map(c=>c.id);assert.equal(discard.length,4);for(const id of discard)await tap('game','card/'+id);await tap('game','action/discard');await changed(first.commandSeq);await settled();
   const beforeAssist=await saved(),hand=beforeAssist.state.handOrder.map(id=>beforeAssist.state.deckInstances.find(c=>c.id===id)),groups=new Map();for(const c of hand){if(!groups.has(c.rank))groups.set(c.rank,[]);groups.get(c.rank).push(c.id);}const pairs=[...groups.values()].filter(ids=>ids.length===2);assert.equal(pairs.length,3);
   const main=pairs.slice(0,2).flat(),side=pairs[2];for(const id of main)await tap('game','card/'+id);await settled();await tap('game','selection/assist-'+side.join('+'));assert.deepEqual(await saved(),beforeAssist);
   await shot('natural-assist-draft');await tap('game','action/play');await changed(beforeAssist.state.commandSeq);await settled();const after=await saved();
   assert.equal(after.state.lastTrace.finalScore,'316');assert.deepEqual(after.state.lastTrace.assist.ids,side);assert.equal(after.state.stage.assistUsed,true);assert.equal(after.state.stage.playIndex,1);assert.equal(after.state.phase,'await-input');row.assisted={main,side,score:after.state.lastTrace.finalScore,trace:after.state.lastTrace,commandSeq:after.state.commandSeq};
   await p.reload();await waitScene(p,'title');assert.deepEqual(await state(),after.state);await tap('title','action/title-continue');await waitScene(p,'game');await settled();assert.deepEqual(await saved(),after);
   await tapMenuAction(p,'回看上一手',true);await settled();assert.deepEqual(await saved(),after);await shot('natural-assist-restored');
   row.checks.push('one natural discard retains two pairs and draws third pair; legal main+assist scores 316; save/reload/replay preserves full state, journal and export');
   for(let n=0;n<4&&(await state()).phase==='await-input';n++){
    await settled();const s=await state(),low=s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)).sort((a,b)=>a.rank-b.rank)[0];await tap('game','card/'+low.id);await tap('game','action/play');await changed(s.commandSeq);
   }
   await waitScene(p,'intermission');const failed=await saved();assert.equal(failed.state.phase,'run-lost');assert.equal(failed.state.stage.assistUsed,true);await shot('natural-failed');
   await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').ready);await tap('intermission','action/retry-seed');await waitScene(p,'shop');const retry=await saved();
   for(const k of ['seed','characterId','mode','difficulty','challengeId','programsEnabled','contentVersion','contentHash'])assert.equal(retry.state[k],failed.state[k],k);assert.deepEqual(retry.journal,[]);assert.equal(retry.state.lastTrace,null);assert.equal(retry.state.commandSeq,1);
   await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(370);await tap('shop','action/start-stage');await waitScene(p,'game');await settled();const reentered=await state();assert.equal(reentered.stage.assistUsed,false);assert.deepEqual(reentered.handOrder,first.handOrder);row.checks.push('natural loss → same-seed retry preserves precise profile/mode/role/seed; journal and assist quota reset; same initial deal');
  }
  if(spec.natural){
   const original=await saved();
   const database=()=>p.evaluate(()=>new Promise((resolve,reject)=>{const open=indexedDB.open('dachoupai-checkpoints',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('saves','readonly'),store=tx.objectStore('saves'),keys=store.getAllKeys(),values=store.getAll();tx.oncomplete=()=>{db.close();resolve({keys:keys.result,values:values.result});};};}));
   const originalDB=await database();p.on('dialog',d=>d.accept());
   await p.locator('.run-menu-toggle').tap();await p.getByText('进度与存档',{exact:true}).tap();await p.getByRole('button',{name:'开始新局',exact:true}).tap();await waitScene(p,'character-select');
   await tap('character-select','character/touye');await confirmHeroRoute(p,true);await p.getByRole('button',{name:'取消',exact:true}).tap();assert.deepEqual(await saved(),original);assert.deepEqual(await database(),originalDB);
   await p.evaluate(()=>{window.__launchPut=IDBObjectStore.prototype.put;window.__launchWrites=0;IDBObjectStore.prototype.put=function(...args){if(this.name==='saves'&&args[1]==='meta'){window.__launchWrites++;throw new DOMException('launch quota injection','QuotaExceededError');}return Reflect.apply(window.__launchPut,this,args);};});
   await confirmHeroRoute(p,true);await p.getByRole('button',{name:'确认开始新局',exact:true}).tap();await p.getByRole('button',{name:'导出未保存候选',exact:true}).waitFor();
   const candidate=async()=>{const download=p.waitForEvent('download');await p.getByRole('button',{name:'导出未保存候选',exact:true}).tap();return readFile(await(await download).path(),'utf8');};
   const pending=await candidate();assert.equal(JSON.parse(pending).state.characterId,'touye');assert.equal(JSON.parse(pending).state.contentHash,'json-fnv-v1:e7d21fce68b80072');assert.deepEqual(await saved(),original);assert.deepEqual(await database(),originalDB);
   await p.getByRole('button',{name:'重试保存',exact:true}).tap();assert.equal(await candidate(),pending);assert.deepEqual(await saved(),original);assert.deepEqual(await database(),originalDB);assert.equal(await p.getByRole('button',{name:'开始新局',exact:true}).isDisabled(),true);
   await p.getByRole('button',{name:'取消候选，保留原局',exact:true}).tap();assert.deepEqual(await saved(),original);assert.deepEqual(await database(),originalDB);await p.evaluate(()=>{IDBObjectStore.prototype.put=window.__launchPut;});
   row.checks.push('native new-run cancel preserves saved run; quota at atomic meta write retains original DB/pointer and one exact candidate across retry; cancel candidate preserves original');
  }
  assert.deepEqual(row.errors,[]);row.status='PASS';
 }catch(e){row.status='FAIL';row.error=String(e);await shot(spec.name+'-FAIL').catch(()=>{});console.error(spec.name,row.error);}finally{await ctx.close();}
}}finally{report.after=snapshotSource(process.cwd());report.unchanged=JSON.stringify(before)===JSON.stringify(report.after);await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await server.httpServer.close();}
assert.ok(report.unchanged,'source/index/HEAD frozen');process.exitCode=report.cases.some(c=>c.status==='FAIL')?1:0;console.log(JSON.stringify({source:report.source,cases:report.cases.map(c=>({name:c.spec.name,status:c.status,error:c.error,checks:c.checks})),unchanged:report.unchanged},null,2));
