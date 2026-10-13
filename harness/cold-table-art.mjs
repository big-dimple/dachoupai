import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {waitScene,tapUI,confirmHeroRoute} from './ui.mjs';
const gap=process.argv.includes('--expect-gap'),out='docs/production/evidence/staged-image-warmup-2026-10-13/'+(gap?'original-failures/cold-table-late':'cold-table-late');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']}),base=process.env.WARMUP_URL??'http://127.0.0.1:5175';
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:await (await fetch(base+'/build-info.json')).json(),scope:'Native first-shop fast entry and cold saved-table continue; no scoring; assets held until table and selection exist.',cases:[]};
const snapshot=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,checkpoint:JSON.parse(c.exportJSON()),slots:await c.store.read(),local:Object.fromEntries(Object.keys(localStorage).filter(k=>!k.includes('lease')).map(k=>[k,localStorage.getItem(k)]))};});
async function run(width){
 const context=await browser.newContext({viewport:{width,height:768},hasTouch:width<700}),p=await context.newPage(),touch=width<700;let holdCourt=true,holdHero=false;const held=[],requests=[],errors=[];
 p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{if(/\/court\/|characters\/amo\./.test(r.url()))requests.push({url:r.url(),at:Date.now()});});
 await p.route('**/assets/**/*.webp',async route=>{const url=route.request().url();if(holdCourt&&/\/court\//.test(url)||holdHero&&/characters\/amo\./.test(url))await new Promise(resolve=>held.push(resolve));try{await route.continue();}catch{/* the bounded loader may already have aborted */}});
 const release=()=>{holdCourt=holdHero=false;for(const resolve of held.splice(0))resolve();};
 async function observe(kind){
  await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.cardViews.length===8;});
  const courtId=await p.evaluate(()=>window.__harness.game.scene.getScene('game').cardViews.find(v=>v.card.rank>=11&&v.card.rank<=13)?.card.id);assert.ok(courtId,'normal public hand contains a court card');
  await tapUI(p,'game','card/'+courtId,touch);await p.waitForFunction(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),courtId);
  const before=await snapshot(p);
  const initial=await p.evaluate(()=>{
   const s=window.__harness.game.scene.getScene('game'),walk=list=>{for(const o of list){if(o.name==='hero/skill-entry')return o;if(o.list){const f=walk(o.list);if(f)return f;}}};
   window.__coldRefs={root:s.view.root,cards:s.cardViews,containers:s.cardViews.map(v=>v.container),hits:s.cardViews.map(v=>v.hit),input:s.handInput,avatar:s.roleAvatar,heroHit:walk(s.view.root.list),selected:[...s.selectedIds]};
   const images=(list,key)=>list.some(o=>o.texture?.key===key||o.list&&images(o.list,key));
   const named=(list,name)=>list.some(o=>o.name===name||o.list&&named(o.list,name));
   const courts=s.cardViews.filter(v=>v.card.rank>=11&&v.card.rank<=13).map(v=>({id:v.card.id,key:'p08-court-'+['j','q','k'][v.card.rank-11],art:images(v.container.list,'p08-court-'+['j','q','k'][v.card.rank-11])}));
   return {courts,avatar:images(s.roleAvatar.list,'avatar-amo'),portrait:images(s.view.root.list,'selection-portrait-amo')};
  });assert.ok(initial.courts.every(c=>!c.art),'entry uses court suit fallback before texture arrives');
  await p.screenshot({path:out+`/${width}-${kind}-before.png`});release();
  await p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return ['avatar-amo','selection-portrait-amo',...s.cardViews.filter(v=>v.card.rank>=11&&v.card.rank<=13).map(v=>'p08-court-'+['j','q','k'][v.card.rank-11])].every(k=>g.textures.exists(k));});
  await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(v=>!v.dealing));
  await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const actual=await p.evaluate(()=>{
   const s=window.__harness.game.scene.getScene('game'),r=window.__coldRefs,images=(list,key)=>list.some(o=>o.texture?.key===key||o.list&&images(o.list,key)),walk=list=>{for(const o of list){if(o.name==='hero/skill-entry')return o;if(o.list){const f=walk(o.list);if(f)return f;}}};
   return {courts:s.cardViews.filter(v=>v.card.rank>=11&&v.card.rank<=13).map(v=>({id:v.card.id,art:images(v.container.list,'p08-court-'+['j','q','k'][v.card.rank-11])})),avatar:images(s.roleAvatar.list,'avatar-amo'),portrait:images(s.view.root.list,'selection-portrait-amo'),sameRoot:s.view.root===r.root,sameCards:s.cardViews===r.cards,sameContainers:s.cardViews.every((v,i)=>v.container===r.containers[i]),sameHits:s.cardViews.every((v,i)=>v.hit===r.hits[i]),sameInput:s.handInput===r.input,sameAvatar:s.roleAvatar===r.avatar,sameHeroHit:walk(s.view.root.list)===r.heroHit,sameSelection:JSON.stringify([...s.selectedIds])===JSON.stringify(r.selected),noDealRestart:s.cardViews.every(v=>!v.dealing)};
  });const after=await snapshot(p);assert.deepEqual(after,before,'complete state/checkpoint/journal/IDB/localStorage unchanged by late images');
  for(const key of ['sameRoot','sameCards','sameContainers','sameHits','sameInput','sameAvatar','sameHeroHit','sameSelection','noDealRestart'])assert.equal(actual[key],true,key);
  await p.screenshot({path:out+`/${width}-${kind}-after.png`});
  const row={width,kind,initial,actual,before,after,requests:structuredClone(requests),errors:structuredClone(errors),status:gap?'REPRODUCED':'PASS'};report.cases.push(row);
  if(gap)assert.ok(actual.courts.some(c=>!c.art),'late court texture still leaves fallback on baseline');else {assert.ok(actual.courts.every(c=>c.art),'late court art replaces fallback in same card objects');assert.equal(actual.avatar,true);if(width>=700)assert.equal(actual.portrait,true);}
  assert.deepEqual(errors,[]);
 }
 try{
  await p.goto(base+'/?harness=1&seed=warmup-local',{waitUntil:'domcontentloaded'});await waitScene(p,'title');await tapUI(p,'title','action/title-start',touch);await waitScene(p,'character-select');await tapUI(p,'character-select','character/amo',touch);await confirmHeroRoute(p,touch);await waitScene(p,'shop');
  await tapUI(p,'shop','action/start-stage',touch);await observe('fast-shop');
  holdCourt=holdHero=true;await p.reload({waitUntil:'domcontentloaded'});await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await observe('cold-continue');
 }catch(error){report.failedAt={width,requests,errors,stack:error.stack,scene:await p.evaluate(()=>window.__harness.game.scene.getScenes(true).map(s=>s.scene.key))};await p.screenshot({path:out+`/${width}-FAILED.png`});throw error;}finally{release();await context.close();}
}
try{await run(1366);if(!gap)await run(390);report.status=gap?'REPRODUCED':'PASS';}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}finally{await browser.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({width:c.width,kind:c.kind,initial:c.initial,actual:c.actual,status:c.status})),error:report.error},null,2));}
