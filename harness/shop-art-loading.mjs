import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {waitScene,tapUI,confirmHeroRoute} from './ui.mjs';
const label=process.env.ART_LABEL??'before',base=process.env.ART_URL??'http://127.0.0.1:5173',out=process.env.ART_OUTPUT??'docs/production/evidence/shop-art-loading-2026-10-15';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let currentPage;
process.on('uncaughtException',async error=>{console.error(error);if(currentPage){console.error(await currentPage.evaluate(()=>({obs:window.__artObs?.at(-1),keys:Object.keys(window.__harness.game.textures.list)})));await currentPage.screenshot({path:`${out}/${label}-FAIL.png`});}await browser.close();process.exitCode=1;});
const report={label,sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:await (await fetch(base+'/build-info.json')).json(),delayMs:label==='faults'?0:900,cases:[],physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN'};
const snapshot=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,checkpoint:JSON.parse(c.exportJSON()),slots:await c.store.read()};});
if(label!=='faults')for(const width of [1366,390]){
 const context=await browser.newContext({viewport:{width,height:768},hasTouch:width<700}),p=await context.newPage(),requests=[],responses=[],errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 p.on('response',async r=>{if(/assets\/.*\.webp/.test(r.url()))try{responses.push({url:new URL(r.url()).pathname,bytes:(await r.body()).length});}catch{}});
 p.on('request',r=>{if(/assets\/.*\.webp/.test(r.url()))requests.push({url:new URL(r.url()).pathname,at:Date.now()});});
 await p.route('**/assets/**/*.webp',async route=>{await new Promise(resolve=>setTimeout(resolve,900));try{await route.continue();}catch{}});
 await p.addInitScript(()=>{window.__artObs=[];const poll=()=>{const game=window.__harness?.game,s=game?.scene.getScene('shop');if(s?.scene.isActive()){
 const visible=o=>{if(!o.active||!o.visible||o.getData('basicChoiceArt')&&!o.getData('primary'))return false;for(let parent=o.parentContainer;parent;parent=parent.parentContainer)if(!parent.visible||!parent.active)return false;const b=o.getBounds();return b.width>0&&b.height>0&&b.right>0&&b.bottom>0&&b.x<game.scale.width&&b.y<game.scale.height;};
 const wanted=[...s.jokerArtTargets].filter(([holder])=>visible(holder)).map(([,t])=>'p08-joker-'+t.definitionId).concat([...s.artTargets].filter(([k,targets])=>k.startsWith('goods-art/')&&targets.some(t=>visible(t.holder))).map(([k])=>k));
 const painted=list=>list.flatMap(o=>[o.texture?.key,...(o.list?painted(o.list):[])]).filter(Boolean);
 window.__artObs.push({at:performance.now(),keys:[...new Set(wanted)],painted:painted(s.view.root.list)});
 }requestAnimationFrame(poll);};requestAnimationFrame(poll);});
 currentPage=p;const touch=width<700;
 await p.goto(base+'/?harness=1&seed=warmup-local',{waitUntil:'domcontentloaded'});await waitScene(p,'title');await tapUI(p,'title','action/title-start',touch);await waitScene(p,'character-select');await tapUI(p,'character-select','character/amo',touch);await confirmHeroRoute(p,touch);await waitScene(p,'shop');
 async function observe(kind){
 const state=await snapshot(p),t=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');window.__artRefs={root:s.view.root,input:s.ownedInput,arts:[...s.artTargets.values()].flat().map(t=>t.holder)};return performance.now();});
 await p.screenshot({path:`${out}/${label}-${width}-${kind}-initial.png`});
 await p.waitForFunction(()=>{const r=window.__artObs.at(-1);return r?.keys.length&&r.keys.every(k=>r.painted.includes(k));},undefined,{timeout:20000});
 const rows=await p.evaluate(t=>window.__artObs.filter(r=>r.at>=t),t),first=rows.find(r=>r.keys.some(k=>r.painted.includes(k))),all=rows.find(r=>r.keys.every(k=>r.painted.includes(k)));
 await p.screenshot({path:`${out}/${label}-${width}-${kind}-ready.png`});assert.deepEqual(await snapshot(p),state,'art never changes full run, RNG, journal or saved checkpoint');
 const stable=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),r=window.__artRefs;return s.view.root===r.root&&s.ownedInput===r.input&&r.arts.every(a=>a.active);});assert.ok(stable,'late pictures preserve roots, art containers and input objects');
 const resources=await p.evaluate(()=>performance.getEntriesByType('resource').filter(e=>e.name.includes('/assets/')&&e.name.includes('.webp')).map(e=>({url:new URL(e.name).pathname,start:e.startTime,end:e.responseEnd,bytes:e.encodedBodySize})));
 assert.deepEqual(errors,[]);report.cases.push({width,kind,firstMs:Math.round(first.at-t),allMs:Math.round(all.at-t),visibleKeys:all.keys,requests:structuredClone(requests),resources,requestCount:requests.length,bytes:responses.reduce((sum,r)=>sum+r.bytes,0),responses:structuredClone(responses),stateUnchanged:true,stateSHA256:createHash('sha256').update(JSON.stringify(state)).digest('hex'),inputPreserved:stable,errors});
 }
 await observe('first-shop');
 const starter=await p.evaluate(()=>window.__harness.game.registry.get('runController').state.shop.offers.find(o=>o.definitionId==='mantangcai').offerId);await tapUI(p,'shop','offer/'+starter,touch);await p.getByRole('button',{name:/^邀请 · 4 金$/}).click();await p.waitForFunction(()=>window.__harness.game.registry.get('runController').state.jokers.length===1);
 const dialogs=p.locator('dialog[open]');if(await dialogs.count()){const close=dialogs.locator('.dialog-close');if(await close.count())await close.click();}
 await observe('owned');
 const seq=await p.evaluate(()=>window.__harness.game.registry.get('runController').state.commandSeq);await tapUI(p,'shop','action/reroll',touch);await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1&&window.__harness.game.registry.get('runController').status==='idle',seq);await observe('reroll');
 if(touch){await tapUI(p,'shop','action/shelf-items',true);await observe('items');}
 const beforeRecovery=await snapshot(p),cdp=await context.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await p.reload({waitUntil:'domcontentloaded'});await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'shop');await observe('cold-continue');assert.deepEqual(await snapshot(p),beforeRecovery);
 await context.close();
}
if(label==='faults')for(const fault of ['404','decode','cancel']){
 const context=await browser.newContext({viewport:{width:1366,height:768}}),p=await context.newPage();currentPage=p;const errors=[],requests=[],failures=[];let broken=true,release;const gate=new Promise(resolve=>release=resolve);
 p.on('pageerror',e=>errors.push(String(e)));p.on('request',r=>{if(/tool-t17.thumbnail/.test(r.url()))requests.push(r.url());});p.on('requestfailed',r=>{if(/tool-t17.thumbnail/.test(r.url()))failures.push(r.failure());});
 await p.route('**/assets/handdrawn-tools/tool-t17.thumbnail.webp',async route=>{
   if(broken&&fault==='404')return route.fulfill({status:404,body:'controlled missing original'});
   if(broken&&fault==='decode')return route.fulfill({status:200,contentType:'image/webp',body:'controlled corrupt original'});
   if(broken&&fault==='cancel')await gate;
   try{await route.continue();}catch{}
 });
 await p.goto(base+'/?harness=1&seed=warmup-local');await waitScene(p,'title');await tapUI(p,'title','action/title-start');await waitScene(p,'character-select');await tapUI(p,'character-select','character/amo');await confirmHeroRoute(p);await waitScene(p,'shop');
 const before=await snapshot(p);
 if(fault==='cancel'){
   await tapUI(p,'shop','action/start-stage');await waitScene(p,'game');await p.waitForFunction(()=>{const c=window.__harness.game.registry.get('runController');return c.state.phase==='await-input'&&c.status==='idle';});const table=await snapshot(p);broken=false;release();
   await p.waitForTimeout(200);assert.deepEqual(await snapshot(p),table);assert.ok(failures.length,'scene-owned held transfer aborted on leave');
   const cdp=await context.newCDPSession(p);await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue');await waitScene(p,'game');assert.deepEqual(await snapshot(p),table);
 }else{
   await p.waitForTimeout(600);assert.equal(requests.length,1,'404/decode gets no automatic request loop');assert.equal(await p.evaluate(()=>window.__harness.game.textures.exists('goods-art/T17')),false);
   const id=await p.evaluate(()=>window.__harness.game.registry.get('runController').state.shop.toolOffers.find(o=>o.definitionId==='T17').offerId);await tapUI(p,'shop','offer/'+id);
   await p.getByRole('button',{name:'重试卡面',exact:true}).waitFor();await p.screenshot({path:`${out}/fault-${fault}-retry.png`});broken=false;await p.getByRole('button',{name:'重试卡面',exact:true}).click();
   await p.waitForFunction(()=>window.__harness.game.textures.exists('goods-art/T17'));await p.waitForFunction(()=>{const image=document.querySelector('dialog[open] .dialog-card-art img');return image?.src.startsWith('blob:');});
   assert.deepEqual(await snapshot(p),before,'retry and HD preserve the complete saved run');
   await p.screenshot({path:`${out}/fault-${fault}-recovered.png`});await p.getByRole('button',{name:'取消',exact:true}).click();
 }
 assert.deepEqual(errors,[]);report.cases.push({fault,status:'PASS',requests,failures,fullSavedStateUnchanged:true,errors});await context.close();
}
await browser.close();report.status='PASS';await writeFile(`${out}/${label}.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.cases.map(({width,kind,firstMs,allMs,requestCount,bytes,visibleKeys})=>({width,kind,firstMs,allMs,requestCount,bytes,visibleKeys})),null,2));
