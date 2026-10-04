/** Eight approved faces in two legal five-slot fixtures; no domain commands during inspection. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';
const dir='shots/p08-handdrawn-b5',groups=[['b07','a09','d06','a04'],['e04','c05','c02','f03']];
await mkdir(dir,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'}),fixtures=[];let selected;
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 for(const group of groups){let state=createRun({seed:'p08-handdrawn-b5',runId:'fixture/p08-handdrawn-b5',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  state.jokers=[...group,'c08'].map(id=>r2CreateJoker(id,'reviewed/'+id,0));
  for(const type of ['LeaveShop','EnterStage']){const r=applyCommand(state,{runId:state.runId,commandId:type,expectedSeq:state.commandSeq,action:{type}});assert.ok(r.ok);state=r.state;}
  selected=[8,9,10,11].map(rank=>state.deckInstances.find(c=>c.rank===rank&&c.suit==='hearts').id);
  const rest=state.deckInstances.filter(c=>!selected.includes(c.id)).map(c=>c.id);state.handOrder=[...selected,...rest.splice(0,5)];state.drawPile=rest;state.stage.initialHandLimit=9;state.stage.handLimit=9;
  const cp=makeCheckpoint(state,[]);assert.ok(readCheckpoint(cp).ok);fixtures.push(JSON.stringify(cp));
 }
}finally{await ssr.close();}
await build({mode:'e2e',base:'/p08-b5/',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({base:'/p08-b5/',build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5278,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']}),context=await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage();
const manifest=JSON.parse(await readFile('public/assets/handdrawn-p08/manifest.json','utf8')),requests=[],errors=[];
page.on('request',r=>{if(r.url().includes('handdrawn-p08'))requests.push(new URL(r.url()).pathname);});page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
const report={assetCommit:'1671376cde093f1450e07564815468dafbfe070a',sourceManifestSHA256:'aa4564e46334788796a1357ad1221f5a83b10fe7cb3acb9910bb0b92dca0fc06',build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),viewport:{width:390,height:740},DPR:1,safeInset:{top:0,bottom:0,left:0,right:0},renderer:'Canvas',base:'/p08-b5/',fixture:'Two validator-approved nine-card entries, each four b5 owned IDs plus c08 (legal five slots), native checkpoint import. Not natural purchase or deployment.',requests,errors,thumbnails:[],details:[],checks:[],targetDevice:'OnePlus/hardwareGPU/audio NOT_RUN'};
const expected=(id,purpose)=>manifest.assets.find(a=>a.id===id).outputs.find(o=>o.purpose===purpose);
function hashMatches(actual,id,purpose){const e=expected(id,purpose);for(const key of ['bytes','sha256','width','height'])assert.equal(actual[key],e[key]);}
async function openHD(id){await tapUI(page,'game','joker/reviewed/'+id,true);await page.waitForFunction(()=>[...document.querySelectorAll('.detail-dialog[open] img')].some(i=>i.complete&&i.naturalWidth===615&&i.naturalHeight===768));}
async function foreground(){return page.evaluate(async()=>{const i=[...document.querySelectorAll('.detail-dialog[open] img')].find(i=>i.complete&&i.naturalWidth===615&&i.naturalHeight===768),b=await(await fetch(i.src)).arrayBuffer(),d=await crypto.subtle.digest('SHA-256',b);return {width:i.naturalWidth,height:i.naturalHeight,bytes:b.byteLength,sha256:[...new Uint8Array(d)].map(n=>n.toString(16).padStart(2,'0')).join(''),hashMethod:'actual visible foreground detail blob SHA256'};});}
async function close(){await page.getByRole('button',{name:'关闭',exact:true}).tap();}
try{
 await page.goto('http://127.0.0.1:5278/p08-b5/?harness=1');await waitScene(page,'title');
 for(let index=0;index<groups.length;index++){
  const group=groups[index];await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'b5-fixture-'+index+'.json',mimeType:'application/json',buffer:Buffer.from(fixtures[index])});await waitScene(page,'game');
  await page.waitForFunction(group=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container))&&group.every(id=>s.textures.exists('p08-joker-'+id));},group);
  const thumbnails=await page.evaluate(async ({group,paths})=>{const s=window.__harness.game.scene.getScene('game'),out=[];for(const id of group){const t=s.textures.get('p08-joker-'+id).source[0],b=await(await fetch(paths.find(p=>p.endsWith('/'+id+'.thumbnail.webp')))).arrayBuffer(),d=await crypto.subtle.digest('SHA-256',b);out.push({id,key:'p08-joker-'+id,width:t.width,height:t.height,bytes:b.byteLength,sha256:[...new Uint8Array(d)].map(n=>n.toString(16).padStart(2,'0')).join(''),hashMethod:'decoded texture geometry; exact observed BASE_URL thumbnail HTTP bytes (loader blob revoked by Phaser)'});}return out;},{group,paths:requests});
  for(const t of thumbnails){hashMatches(t,t.id,'thumbnail');assert.ok(requests.includes('/p08-b5/assets/handdrawn-p08/cards/'+t.id+'.thumbnail.webp'));}report.thumbnails.push(...thumbnails);
  assert.ok(!requests.some(p=>group.some(id=>p.endsWith(id+'.detail.webp'))));
  for(const id of selected)await tapUI(page,'game','card/'+id,true);
  assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('game').selectionPreview().type),'straight');
  if(index===1){await page.screenshot({path:dir+'/390-b5-representative.png'});console.log('FIRST_VISIBLE: '+dir+'/390-b5-representative.png');}
  const before=await page.evaluate(()=>window.__harness.game.registry.get('runController').state);
  for(const id of group){
   if(id!=='f03'){
    await openHD(id);const hd=await foreground();hashMatches(hd,id,'detail');report.details.push({id,...hd});await close();const count=requests.filter(p=>p.endsWith(id+'.detail.webp')).length;await openHD(id);hashMatches(await foreground(),id,'detail');assert.equal(requests.filter(p=>p.endsWith(id+'.detail.webp')).length,count);await close();
   }else{
    let missing=true;await page.route('**/cards/f03.detail.webp',r=>missing?r.fulfill({status:404,body:'missing fixture'}):r.continue());await tapUI(page,'game','joker/reviewed/f03',true);await page.getByRole('button',{name:'重试高清',exact:true}).waitFor();const image=page.locator('.detail-dialog[open] img');const fallback=await image.evaluate(i=>({width:i.naturalWidth,height:i.naturalHeight,rect:{width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}}));assert.equal(fallback.width,128);assert.equal(fallback.height,160);
    missing=false;await page.getByRole('button',{name:'重试高清',exact:true}).tap();await page.waitForFunction(()=>[...document.querySelectorAll('.detail-dialog[open] img')].some(i=>i.complete&&i.naturalWidth===615&&i.naturalHeight===768));const hd=await foreground();hashMatches(hd,id,'detail');report.details.push({id,...hd});assert.deepEqual(await image.evaluate(i=>({width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height})),fallback.rect);report.missingDetail={id,...fallback};await close();const count=requests.filter(p=>p.endsWith(id+'.detail.webp')).length;await openHD(id);hashMatches(await foreground(),id,'detail');assert.equal(requests.filter(p=>p.endsWith(id+'.detail.webp')).length,count);await close();
   }
  }
  assert.deepEqual(await page.evaluate(()=>window.__harness.game.registry.get('runController').state),before);report.checks.push('group'+(index+1)+': four textures and HD exact hashes; no unopened HD; correct immediate cache/cancel; full run/resources/RNG/save unchanged');
 }
 assert.deepEqual(errors,[]);report.checks.push('f03 HD404 keeps correct thumbnail/fixed frame, explicit retry succeeds; all eight on-demand cached details match; no page errors');report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,thumbnails:report.thumbnails,details:report.details.map(d=>({id:d.id,width:d.width,height:d.height,bytes:d.bytes,sha256:d.sha256})),checks:report.checks},null,2));}
