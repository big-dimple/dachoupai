/** Serial real-input checks against an already frozen E2E bundle; no artwork or run-state fixtures. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {chooseCharacter,tapUI,waitScene} from './ui.mjs';

const dir=path.resolve(process.env.JOKER_ART_EVIDENCE_DIR||'shots/joker-art-rarity');
const outDir=path.resolve(process.env.JOKER_ART_BUILD_DIR||path.join(dir,'build')),port=5211;
const definitions=JSON.parse(await readFile('src/content/r2-jokers.json','utf8')),definition=new Map(definitions.map(d=>[d.id,d]));
const sha=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const report={status:'IN_PROGRESS',testedCommit:git('rev-parse','HEAD'),dirtyState:git('status','--porcelain=v1'),node:process.version,
  build:'existing frozen e2e bundle; this harness does not rebuild',newArtwork:'f04/e07 replacement transfers failed; no replacement artwork loaded',
  limitations:['Linux Chromium Canvas with GPU/software rasterization disabled; physical Android/iPhone and WebGL NOT_RUN.',
    'Natural initial shops, one purchase and table entry only; Boss-disabled cards and a rare owned Joker are NOT_RUN in browser. Pure badge/scene contracts cover those unreachable states separately.',
    'Network faults are deliberate injection, isolated from natural runs. FPS observations are emulator samples, not a device-performance claim.'],runs:[]};
await mkdir(dir,{recursive:true});
let server,browser;

async function persisted(page){return page.evaluate(async()=>{
 const c=window.__harness.game.registry.get('runController');
 const storage=await new Promise((resolve,reject)=>{const request=indexedDB.open('dachoupai-checkpoints');request.onerror=()=>reject(request.error);request.onupgradeneeded=()=>{request.transaction.abort();reject(Error('Expected existing checkpoint database'));};request.onsuccess=()=>{const db=request.result,tx=db.transaction('saves','readonly'),cursor=tx.objectStore('saves').openCursor(),records=[];cursor.onsuccess=()=>{const row=cursor.result;if(row){records.push({key:row.key,value:row.value});row.continue();}};tx.oncomplete=()=>{db.close();resolve(records);};tx.onabort=tx.onerror=()=>{db.close();reject(tx.error);};};});
 return{state:c.state,journal:c.journal,status:c.status,exportJSON:c.exportJSON(),storage};
});}

async function badgeObservation(page,key){return page.evaluate(key=>{
 const game=window.__harness.game,scene=game.scene.getScene(key),canvas=game.canvas.getBoundingClientRect(),badges=[];
 const css=p=>{const q=scene.cameras.main.matrix.transformPoint(p.x-scene.cameras.main.scrollX,p.y-scene.cameras.main.scrollY);return{x:canvas.left+q.x*canvas.width/game.scale.width,y:canvas.top+q.y*canvas.height/game.scale.height};};
 const walk=(list,ancestors=[])=>{for(const o of list){if(o.name==='rarity-badge'){
  const label=o.list.find(x=>x.name==='rarity-badge/label'),b=label?.getBounds(),chain=[...ancestors,o],p=b?css({x:b.x,y:b.y}):null;
  badges.push({definitionId:o.getData('definitionId'),surface:o.getData('surface'),rarity:o.getData('rarity'),shape:o.getData('shape'),compact:o.getData('compact'),visible:chain.every(v=>v.visible!==false),alpha:chain.reduce((n,v)=>n*(v.alpha??1),1),label:label?.text,fontSize:label?parseFloat(label.style.fontSize):null,labelBounds:b?{...p,width:b.width*canvas.width/game.scale.width*scene.cameras.main.zoom,height:b.height*canvas.height/game.scale.height*scene.cameras.main.zoom}:null});
 }if(o.list)walk(o.list,[...ancestors,o]);}};walk(scene.children.list);
 return{badges,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},renderer:game.renderer.gl?'WebGL':'Canvas',fps:game.loop.actualFps};
},key);}

async function assertBadge(page,sceneKey,id,surface){
 const o=await badgeObservation(page,sceneKey),rarity=definition.get(id).rarity,expected={common:['circle','普通','普'],uncommon:['diamond','特别','特'],rare:['star','稀有','稀']}[rarity];
 const badges=o.badges.filter(b=>b.definitionId===id&&b.surface===surface);assert.ok(badges.length,`${sceneKey}/${surface}/${id}: permanent badge exists`);
 for(const b of badges){assert.equal(b.rarity,rarity);assert.equal(b.shape,expected[0]);assert.ok(expected.slice(1).includes(b.label));assert.equal(b.visible,true);assert.equal(b.alpha,1,'badge remains opaque through card state');assert.ok(b.fontSize>=10,'compact label has readable source type');assert.ok(b.labelBounds.x>=-.5&&b.labelBounds.y>=-.5&&b.labelBounds.x+b.labelBounds.width<=o.viewport.width+.5&&b.labelBounds.y+b.labelBounds.height<=o.viewport.height+.5,'badge label fits viewport');}
 return o;
}
async function detailObservation(page){return page.locator('.detail-dialog').evaluate(d=>{
 const r=e=>{if(!e)return null;const b=e.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom};},image=d.querySelector('.dialog-card-image'),frame=d.querySelector('.dialog-card-art'),intro=d.querySelector('.dialog-intro'),footer=d.querySelector('.dialog-actions');
 return{title:d.querySelector('h2').textContent,rarities:[...d.querySelectorAll('.joker-rarity-badge')].map(e=>({rarity:e.dataset.rarity,shape:e.dataset.shape,text:e.textContent,background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,rect:r(e)})),
  art:{present:!!image,naturalWidth:image?.naturalWidth,naturalHeight:image?.naturalHeight,source:image?.currentSrc.startsWith('data:')?'data':image?.currentSrc.startsWith('blob:')?'blob':'network',rect:r(image),frame:r(frame),mechanism:!!frame?.classList.contains('dialog-mechanism-art'),fallback:frame?.dataset.artFallback??null,status:d.querySelector('.dialog-art-load-status')?.textContent??'',detailStatus:d.querySelector('.detail-art-status:not(.dialog-art-load-status)')?.textContent??'',alt:image?.alt??''},
  intro:{rect:r(intro),text:intro?.innerText??''},footer:r(footer),buttons:[...footer.querySelectorAll('button')].map(b=>({text:b.textContent,disabled:b.disabled,rect:r(b)})),rulesOpen:d.querySelector('.card-rules')?.open,viewport:{width:innerWidth,height:innerHeight}};
});}
function assertDetail(o,id){
 const rarity=definition.get(id).rarity,shape={common:'circle',uncommon:'diamond',rare:'star'}[rarity];assert.ok(o.rarities.length,'DOM rarity remains explicit');
 for(const b of o.rarities){assert.equal(b.rarity,rarity);assert.equal(b.shape,shape);assert.ok(b.rect.width>0&&b.rect.height>0);assert.notEqual(b.background,'rgba(0, 0, 0, 0)','rarity has opaque background');}
 assert.ok(o.footer.bottom<=o.viewport.height+.5,'detail action footer fits viewport');
 assert.ok(o.buttons.every(b=>b.rect.height>=44),'all detail actions remain usable');
 if(o.intro.rect&&o.art.frame)assert.ok(o.intro.rect.bottom<=o.art.frame.y+.5,'ability and purchase value precede artwork');
}
async function ensureOffer(page,id,touch){
 const offer=await page.evaluate(id=>window.__harness.game.registry.get('runController').state.shop.offers.find(o=>o.definitionId===id),id);assert.ok(offer,'natural seed offers '+id);
 for(let i=0;i<5;i++){const visible=await page.evaluate(name=>{const s=window.__harness.game.scene.getScene('shop'),walk=l=>l.some(o=>o.name===name||o.list&&walk(o.list));return walk(s.children.list);},'offer/'+offer.offerId);if(visible)return offer;await tapUI(page,'shop','action/shelf-page',touch);}
 throw Error('natural offer not reachable: '+id);
}
async function closeDetail(page,touch){const b=page.getByRole('button',{name:'取消',exact:true});if(touch)await b.tap();else await b.click();}
async function waitDetailImage(page){await page.waitForFunction(()=>{const image=document.querySelector('.dialog-card-image');return image?.complete&&image.naturalWidth>0;});}

async function scenario({name,viewport,touch,seed='f04-copy-70',fault,body}){
 const context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:touch?3:1}),page=await context.newPage();
 const run={name,viewport,touch,seed,fault:fault??'none',checks:[],screenshots:[],requests:[],responses:[],failures:[],console:[],maxThumbnailXHRs:0,maxDetailFetches:0};report.runs.push(run);
 let phase='boot',thumbActive=new Set(),detailActive=new Set(),faultCount=0;
 const thumb='/assets/jokers-p07/b04.webp',detail='/assets/jokers-p07/b04-detail.webp';
 page.on('pageerror',e=>run.console.push({type:'pageerror',text:String(e)}));page.on('console',m=>{if(['error','warning'].includes(m.type()))run.console.push({type:m.type(),text:m.text(),url:m.location().url});});
 page.on('request',req=>{const p=new URL(req.url()).pathname;if(p.includes('/assets/jokers-p07/')){
  run.requests.push({phase,path:p,type:req.resourceType()});if(req.resourceType()==='xhr'&&!p.includes('-detail.')){thumbActive.add(req);run.maxThumbnailXHRs=Math.max(run.maxThumbnailXHRs,thumbActive.size);}if(req.resourceType()==='fetch'&&p.includes('-detail.')){detailActive.add(req);run.maxDetailFetches=Math.max(run.maxDetailFetches,detailActive.size);}
 }});
 page.on('response',res=>{const p=new URL(res.url()).pathname;if(p.includes('/assets/jokers-p07/'))run.responses.push({phase,path:p,type:res.request().resourceType(),status:res.status()});});
 const finished=req=>{thumbActive.delete(req);detailActive.delete(req);};page.on('requestfinished',finished);page.on('requestfailed',req=>{finished(req);if(new URL(req.url()).pathname.includes('/assets/jokers-p07/'))run.failures.push({phase,path:new URL(req.url()).pathname,type:req.resourceType(),error:req.failure()?.errorText});});
 const transient=async route=>{if(route.request().resourceType()==='xhr'&&faultCount===0){faultCount++;await route.abort('failed');await page.unroute('**'+thumb,transient);}else await route.continue();};
 const permanent=async route=>{faultCount++;await route.fulfill({status:404,contentType:'text/plain',body:'controlled missing illustration'});};
 if(fault==='transient-first')await page.route('**'+thumb,transient);
 if(fault==='404-manual'){await page.route('**'+thumb,permanent);await page.route('**'+detail,permanent);}
 const shot=async suffix=>{const file=`${name}-${suffix}.png`;await page.screenshot({path:path.join(dir,file)});run.screenshots.push(file);};
 const check=async(label,before)=>{const after=await persisted(page);assert.deepEqual(after,before,label+': state/RNG/journal/export/IndexedDB unchanged');run.checks.push({name:label,status:'PASS',checkpointSha256:sha(after)});};
 try{
  await page.goto(`http://127.0.0.1:${port}/?harness=1&seed=${seed}`);await waitScene(page,'title');assert.equal(run.requests.filter(r=>r.phase==='boot'&&r.path.includes('-detail.')).length,0,'no detail-size Joker request in Boot');phase='shop';await chooseCharacter(page,'amo',touch);
  await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('shop');return !s.tweens.isTweening(s.view.root)&&s.offerArts.every(art=>!s.tweens.isTweening(art));});
  await body({page,run,touch,shot,check,setPhase:p=>phase=p,restore:async()=>{await page.unroute('**'+thumb,permanent);await page.unroute('**'+detail,permanent);}});
  assert.ok(run.maxThumbnailXHRs<=2,'bounded thumbnail concurrency');assert.ok(run.maxDetailFetches<=2,'bounded detail concurrency');assert.deepEqual(run.console.filter(e=>e.type==='pageerror'),[],'no runtime page errors');
  if(!fault){assert.deepEqual(run.failures,[],'natural requests do not fail');assert.ok(run.responses.every(r=>r.status===200),'natural Joker responses succeed');}
  run.faultResponsesOrAborts=faultCount;run.status='PASS';
 }catch(error){run.status='FAIL';run.error=String(error);run.stack=error.stack;await shot('failure').catch(()=>{});process.exitCode=1;
 }finally{await context.close();console.log(JSON.stringify({name,status:run.status,checks:run.checks.map(c=>c.name),error:run.error}));await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');}
 if(run.status==='FAIL')throw Error(name+': '+run.error);
}

async function naturalBase({page,run,touch,shot,check}){
 await page.waitForFunction(()=>window.__harness.game.textures.exists('p07-joker-b04'));
 let before=await persisted(page);await writeFile(path.join(dir,run.name+'-before.json'),JSON.stringify(before,null,2)+'\n');
 for(const id of ['b04','f04']){
  const offer=await ensureOffer(page,id,touch);run[id+'Shelf']=await assertBadge(page,'shop',id,'offer');await tapUI(page,'shop','offer/'+offer.offerId,touch);
  await waitDetailImage(page);const o=await detailObservation(page);assertDetail(o,id);await assertBadge(page,'shop',id,'offer');
  if(id==='f04'){assert.equal(o.art.mechanism,true);assert.equal(o.art.source,'data');assert.match(o.art.status+' '+o.art.alt,/机制示意/);assert.doesNotMatch(o.art.status,/失败|超时|网络/);assert.match(o.intro.text,/整手倍率 \+3/);assert.equal(o.rulesOpen,false);await shot('f04-mechanism-detail');}
  run[id+'Detail']=o;await closeDetail(page,touch);await assertBadge(page,'shop',id,'offer');await check('open-cancel-'+id,before);
 }
 assert.equal(run.requests.filter(r=>/\/f04(?:-|\.)/.test(r.path)).length,0,'unregistered f04 is not a network failure');
 await ensureOffer(page,'b04',touch);await shot('common-uncommon-shelf');await tapUI(page,'shop','offer/'+before.state.shop.offers.find(o=>o.definitionId==='b04').offerId,touch);
 const buy=page.getByRole('button',{name:'确认购买',exact:true});if(touch)await buy.tap();else await buy.click();await page.waitForFunction(seq=>{const c=window.__harness.game.registry.get('runController');return c.status==='idle'&&c.state.commandSeq===seq+1;},before.state.commandSeq);
 const bought=await persisted(page);assert.equal(bought.state.gold,before.state.gold-4,'natural b04 purchase');await ensureOffer(page,'b04',touch);await assertBadge(page,'shop','b04','offer');await assertBadge(page,'shop','b04','owned');run.checks.push({name:'purchased-offer-and-owned-badges-persist',status:'PASS'});
 await ensureOffer(page,'f04',touch);await assertBadge(page,'shop','f04','offer');await tapUI(page,'shop','offer/'+bought.state.shop.offers.find(o=>o.definitionId==='f04').offerId,touch);await waitDetailImage(page);assert.equal(await page.getByRole('button',{name:'确认购买',exact:true}).isDisabled(),true);assertDetail(await detailObservation(page),'f04');await closeDetail(page,touch);await check('unaffordable-detail-keeps-badge-and-save',bought);
 await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.length&&s.cardViews.every(c=>!c.dealing&&!c.back?.visible&&!s.tweens.isTweening(c.container));});run.table=await assertBadge(page,'game','b04','table');await shot('owned-table-badge');
 const table=await persisted(page),joker=table.state.jokers.find(j=>j.definitionId==='b04');await tapUI(page,'game','joker/'+joker.instanceId,touch);await waitDetailImage(page);assertDetail(await detailObservation(page),'b04');const close=page.getByRole('button',{name:'关闭',exact:true});if(touch)await close.tap();else await close.click();await check('owned-table-detail-keeps-save',table);
 await writeFile(path.join(dir,run.name+'-after.json'),JSON.stringify(await persisted(page),null,2)+'\n');
}
async function naturalRare({page,run,touch,shot,check}){
 const before=await persisted(page);
 for(const id of ['e11','e07']){
  const offer=await ensureOffer(page,id,touch);await assertBadge(page,'shop',id,'offer');await tapUI(page,'shop','offer/'+offer.offerId,touch);await waitDetailImage(page);const o=await detailObservation(page);assertDetail(o,id);await assertBadge(page,'shop',id,'offer');
  if(id==='e11'){assert.equal(await page.getByRole('button',{name:'确认购买',exact:true}).isDisabled(),true,'rare offer naturally exceeds starting budget');await shot('rare-unaffordable-detail');}
  if(id==='e07'){assert.equal(o.art.mechanism,true);assert.equal(o.art.source,'data');assert.match(o.art.status+' '+o.art.alt,/机制示意/);assert.doesNotMatch(o.art.status,/失败|超时|网络/);}
  run[id+'Detail']=o;await closeDetail(page,touch);await assertBadge(page,'shop',id,'offer');await check('natural-'+id+'-badge-and-save',before);
 }
 assert.equal(run.requests.filter(r=>/\/e07(?:-|\.)/.test(r.path)).length,0,'unregistered e07 makes no art request');
}
async function transientRecovery({page,run,touch,shot,check}){
 const before=await persisted(page);await page.waitForFunction(()=>window.__harness.game.textures.exists('p07-joker-b04'));
 assert.equal(run.requests.filter(r=>r.path.endsWith('/b04.webp')&&r.type==='xhr').length,2,'one automatic transient retry');assert.equal(run.failures.filter(r=>r.path.endsWith('/b04.webp')&&r.type==='xhr').length,1,'one deliberate initial failure');
 await assertBadge(page,'shop','b04','offer');const offer=await ensureOffer(page,'b04',touch);await tapUI(page,'shop','offer/'+offer.offerId,touch);await page.waitForFunction(()=>document.querySelector('.dialog-card-image')?.currentSrc.startsWith('blob:'));assertDetail(await detailObservation(page),'b04');await closeDetail(page,touch);
 for(let i=0;i<2;i++)await tapUI(page,'shop','action/shelf-page',touch);assert.equal(run.requests.filter(r=>r.path.endsWith('/b04.webp')&&r.type==='xhr').length,2,'successful retry does not loop on redraw');await check('transient-auto-recovery-no-state-change',before);await shot('recovered-shelf');
}
async function manualRecovery({page,run,touch,shot,check,restore}){
 await page.waitForFunction(()=>!window.__harness.game.scene.getScene('shop').load.isLoading());const before=await persisted(page),count=()=>run.requests.filter(r=>r.path.endsWith('/b04.webp')&&r.type==='xhr').length;assert.equal(count(),1,'one initial404 thumbnail request');
 // Longer than the explicit300ms retry timer; 404 must stay terminal until user action.
 await page.waitForTimeout(450);for(let i=0;i<2;i++)await tapUI(page,'shop','action/shelf-page',touch);assert.equal(count(),1,'redraw and delay never automatically retry404');
 const offer=await ensureOffer(page,'b04',touch);await tapUI(page,'shop','offer/'+offer.offerId,touch);await page.waitForFunction(()=>document.querySelector('.dialog-card-art')?.dataset.artFallback==='mechanism');
 const failed=await detailObservation(page);assertDetail(failed,'b04');assert.equal(failed.art.source,'data');assert.equal(failed.art.mechanism,false,'registered fallback keeps its original frame');assert.match(failed.art.status+' '+failed.art.detailStatus,/机制示意/);run.failedDetail=failed;
 const retry=page.getByRole('button',{name:'重试卡面',exact:true});await retry.waitFor();await check('permanent404-fallback-keeps-save',before);await shot('404-mechanism-retry');
 await restore();if(touch)await retry.tap();else await retry.click();await page.waitForFunction(()=>window.__harness.game.textures.exists('p07-joker-b04'));await check('manual-thumbnail-recovery-keeps-save',before);
 const hd=page.getByRole('button',{name:'重试高清',exact:true});if(await hd.isVisible()){if(touch)await hd.tap();else await hd.click();}
 await page.waitForFunction(()=>{const i=document.querySelector('.dialog-card-image'),f=document.querySelector('.dialog-card-art');return i?.currentSrc.startsWith('blob:')&&!f?.dataset.artFallback;});run.recoveredDetail=await detailObservation(page);assertDetail(run.recoveredDetail,'b04');await check('manual-detail-recovery-keeps-save',before);await shot('manual-recovered-detail');
 await closeDetail(page,touch);await assertBadge(page,'shop','b04','offer');assert.equal(count(),2,'exactly one explicit thumbnail retry after404');await check('manual-retry-close-keeps-save',before);
}
async function shortDetail({page,run,touch,shot,check}){
 const before=await persisted(page),offer=await ensureOffer(page,'f04',touch);await assertBadge(page,'shop','f04','offer');await tapUI(page,'shop','offer/'+offer.offerId,touch);await waitDetailImage(page);
 run.detail=await detailObservation(page);assertDetail(run.detail,'f04');assert.equal(run.detail.art.mechanism,true);assert.equal(run.detail.rulesOpen,false);await shot('f04-detail-footer');await closeDetail(page,touch);await check('short-viewport-detail-and-save',before);
}

try{
 report.buildInfo=JSON.parse(await readFile(path.join(outDir,'build-info.json'),'utf8'));
 report.bundleFiles=await Promise.all((await readdir(path.join(outDir,'assets'))).filter(f=>/\.(js|css)$/.test(f)).map(async file=>({file,sha256:sha(await readFile(path.join(outDir,'assets',file),'utf8'))})));
 server=await preview({build:{outDir},preview:{host:'127.0.0.1',port,strictPort:true}});browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});report.browser=browser.version();
 for(const [name,viewport,touch] of [['desktop',{width:1280,height:800},false],['mobile',{width:412,height:820},true]]){
  await scenario({name:name+'-natural',viewport,touch,body:naturalBase});await scenario({name:name+'-rare',viewport,touch,seed:'rarity-art-13',body:naturalRare});
 }
 await scenario({name:'mobile-transient',viewport:{width:412,height:820},touch:true,fault:'transient-first',body:transientRecovery});
 await scenario({name:'mobile-404-manual',viewport:{width:412,height:820},touch:true,fault:'404-manual',body:manualRecovery});
 await scenario({name:'mobile-short',viewport:{width:390,height:640},touch:true,body:shortDetail});
 report.status=report.runs.every(r=>r.status==='PASS')?'PASS':'FAIL';
}catch(error){report.status='FAIL';report.error=String(error);report.stack=error.stack;process.exitCode=1;
}finally{await browser?.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));await writeFile(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,evidence:dir}));}
