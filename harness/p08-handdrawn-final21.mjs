/** Representative faces from the final21 approved IDs in two legal five-slot fixtures; no domain commands during inspection. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';
const dir='shots/p08-handdrawn-final21',groups=[['a05','c11','e10','e12'],['e08','e11','f06','f08','f12']];
await mkdir(dir,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'}),fixtures=[];let selected;
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 for(const group of groups){let state=createRun({seed:'p08-handdrawn-final21',runId:'fixture/p08-handdrawn-final21',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  state.jokers=[...group,...(group.length<5?['c08']:[])].map(id=>r2CreateJoker(id,'reviewed/'+id,0));
  for(const type of ['LeaveShop','EnterStage']){const r=applyCommand(state,{runId:state.runId,commandId:type,expectedSeq:state.commandSeq,action:{type}});assert.ok(r.ok);state=r.state;}
  selected=[8,9,10,11,12].map(rank=>state.deckInstances.find(c=>c.rank===rank&&c.suit===(rank===12?'clubs':'hearts')).id);
  const rest=state.deckInstances.filter(c=>!selected.includes(c.id)).map(c=>c.id);state.handOrder=[...selected,...rest.splice(0,9-selected.length)];state.drawPile=rest;state.stage.initialHandLimit=9;state.stage.handLimit=9;
  const cp=makeCheckpoint(state,[]);assert.ok(readCheckpoint(cp).ok);fixtures.push(JSON.stringify(cp));
 }
}finally{await ssr.close();}
await build({mode:'e2e',base:'/p08-final21/',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({base:'/p08-final21/',build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5291,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']}),context=await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
const manifest=JSON.parse(await readFile('public/assets/handdrawn-p08/manifest.json','utf8')),requests=[],errors=[];
page.on('request',r=>{if(r.url().includes('handdrawn-p08'))requests.push(new URL(r.url()).pathname);});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
const report={assetCommits:['1da558691621e8c3972b3d5bbdeaf16a9eba47fa','b7feb390c55ed8f930d22d4897641ba0c405128d','a6dbecb0b0612777d7c960dd8de65c9a1c897acc'],build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),viewport:{width:390,height:740},DPR:1,safeInset:{top:0,bottom:0,left:0,right:0},renderer:'Canvas',base:'/p08-final21/',fixture:'Two validator-approved nine-card entries, first four final21 representatives plus c08, second all five b11 IDs; legal five slots and native checkpoint import. Not natural purchase or deployment.',requests,errors,thumbnails:[],details:[],checks:[],targetDevice:'OnePlus/hardwareGPU/audio NOT_RUN'};
const expected=(id,purpose)=>manifest.assets.find(a=>a.id===id).outputs.find(o=>o.purpose===purpose);
function hashMatches(actual,id,purpose){const e=expected(id,purpose);for(const key of ['bytes','sha256','width','height'])assert.equal(actual[key],e[key]);}
async function openHD(id){await tapUI(page,'game','joker/reviewed/'+id,true);await page.waitForFunction(()=>[...document.querySelectorAll('.detail-dialog[open] img')].some(i=>i.complete&&i.naturalWidth===615&&i.naturalHeight===768));}
async function foreground(){return page.evaluate(async()=>{const i=[...document.querySelectorAll('.detail-dialog[open] img')].find(i=>i.complete&&i.naturalWidth===615&&i.naturalHeight===768),b=await(await fetch(i.src)).arrayBuffer(),d=await crypto.subtle.digest('SHA-256',b);return {width:i.naturalWidth,height:i.naturalHeight,bytes:b.byteLength,sha256:[...new Uint8Array(d)].map(n=>n.toString(16).padStart(2,'0')).join(''),hashMethod:'actual visible foreground detail blob SHA256'};});}
async function close(){await page.getByRole('button',{name:'关闭',exact:true}).tap();}
try{
 await page.goto('http://127.0.0.1:5291/p08-final21/?harness=1');await waitScene(page,'title');
 for(let index=0;index<groups.length;index++){
  const group=groups[index];await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'final21-fixture-'+index+'.json',mimeType:'application/json',buffer:Buffer.from(fixtures[index])});await waitScene(page,'game');
  await page.waitForFunction(group=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container))&&group.every(id=>s.textures.exists('p08-joker-'+id));},group);
  const thumbnails=await page.evaluate(async ({group,paths})=>{const s=window.__harness.game.scene.getScene('game'),out=[];for(const id of group){const t=s.textures.get('p08-joker-'+id).source[0],b=await(await fetch(paths.find(p=>p.endsWith('/'+id+'.thumbnail.webp')))).arrayBuffer(),d=await crypto.subtle.digest('SHA-256',b);out.push({id,key:'p08-joker-'+id,width:t.width,height:t.height,bytes:b.byteLength,sha256:[...new Uint8Array(d)].map(n=>n.toString(16).padStart(2,'0')).join(''),hashMethod:'decoded texture geometry; exact observed BASE_URL thumbnail HTTP bytes (loader blob revoked by Phaser)'});}return out;},{group,paths:requests});
  for(const t of thumbnails){hashMatches(t,t.id,'thumbnail');assert.ok(requests.includes('/p08-final21/assets/handdrawn-p08/cards/'+t.id+'.thumbnail.webp'));}report.thumbnails.push(...thumbnails);
  assert.ok(!requests.some(p=>group.some(id=>p.endsWith(id+'.detail.webp'))));
  assert.equal(await page.evaluate(()=>window.__harness.game.renderer.type),1,'actual Phaser Canvas renderer');
  for(const id of selected)await tapUI(page,'game','card/'+id,true);
  assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('game').selectionPreview().type),'straight');
  if(index===1){await page.screenshot({path:dir+'/390-final21-representative.png'});console.log('FIRST_VISIBLE: '+dir+'/390-final21-representative.png');}
  const before=await page.evaluate(()=>window.__harness.game.registry.get('runController').state);
  report.layout??=[];
  const bounds=await page.evaluate(group=>{const s=window.__harness.game.scene.getScene('game');return group.map(id=>{const v=s.jokerViews.get('reviewed/'+id),walk=list=>{for(const o of list){if(o.type==='Image'&&o.texture.key==='p08-joker-'+id)return o;if(o.list){const r=walk(o.list);if(r)return r;}}},i=walk(v.list),rect=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};return{id,frame:rect(v.getData('frame')),image:rect(i),name:rect(v.getData('nameLabel')),value:rect(v.getData('valueLabel'))};});},group);
  for(const b of bounds){assert.ok(b.image.x>=b.frame.x&&b.image.y>=b.frame.y);assert.ok(b.image.x+b.image.width<=b.frame.x+b.frame.width&&b.image.y+b.image.height<=b.frame.y+b.frame.height);assert.ok(b.name.y+b.name.height<=b.image.y&&b.image.y+b.image.height<=b.value.y,'names/state remain separate from images');}report.layout.push(bounds);
  for(const id of group){
   if(id==='e10'){
    let held;const pattern='**/cards/e10.detail.webp';await page.route(pattern,route=>{held=route;});await tapUI(page,'game','joker/reviewed/e10',true);await page.waitForFunction(()=>document.querySelector('.detail-dialog[open] .dialog-card-image')?.naturalWidth===128);assert.ok(held,'foreground transfer is held');
    const aborted=page.waitForEvent('requestfailed',{predicate:r=>r.url().endsWith('/cards/e10.detail.webp')&&r.failure()?.errorText==='net::ERR_ABORTED'});await close();await aborted;
    await held.abort().catch(()=>{});await page.unroute(pattern);report.checks.push('e10 held foreground request aborted on native close; reopened request completes with the approved narrow contain bytes');
   }
   if(id!=='f12'){
    await openHD(id);const hd=await foreground();hashMatches(hd,id,'detail');report.details.push({id,...hd});await close();const count=requests.filter(p=>p.endsWith(id+'.detail.webp')).length;await openHD(id);hashMatches(await foreground(),id,'detail');assert.equal(requests.filter(p=>p.endsWith(id+'.detail.webp')).length,count);await close();
   }else{
    let missing=true;await page.route('**/cards/f12.detail.webp',r=>missing?r.fulfill({status:404,body:'missing fixture'}):r.continue());await tapUI(page,'game','joker/reviewed/f12',true);await page.getByRole('button',{name:'重试高清',exact:true}).waitFor();const image=page.locator('.detail-dialog[open] img');const fallback=await image.evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight,rect:{width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}}));assert.equal(fallback.width,128);assert.equal(fallback.height,160);
    missing=false;await page.getByRole('button',{name:'重试高清',exact:true}).tap();await page.waitForFunction(()=>[...document.querySelectorAll('.detail-dialog[open] img')].some(i=>i.complete&&i.naturalWidth===615&&i.naturalHeight===768));const hd=await foreground();hashMatches(hd,id,'detail');report.details.push({id,...hd});assert.deepEqual(await image.evaluate(i=>({width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height})),fallback.rect);report.missingDetail={id,...fallback};await close();const count=requests.filter(p=>p.endsWith(id+'.detail.webp')).length;await openHD(id);hashMatches(await foreground(),id,'detail');assert.equal(requests.filter(p=>p.endsWith(id+'.detail.webp')).length,count);await close();
   }
  }
  assert.deepEqual(await page.evaluate(()=>window.__harness.game.registry.get('runController').state),before);report.checks.push('group'+(index+1)+': representative textures and HD exact hashes; no unopened HD; correct immediate cache/cancel; full run/resources/RNG/save unchanged');
 }
 assert.deepEqual(errors,[]);report.checks.push('f12 HD404 keeps correct thumbnail/fixed frame, explicit retry succeeds; all nine representative on-demand cached details match; no page errors');report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,thumbnails:report.thumbnails,details:report.details.map(d=>({id:d.id,width:d.width,height:d.height,bytes:d.bytes,sha256:d.sha256})),checks:report.checks},null,2));}
