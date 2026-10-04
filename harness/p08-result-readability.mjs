/** Bounded natural win/failure result routes; software Canvas is not target-device acceptance. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter,tapUI,waitScene,openMenuSection} from './ui.mjs';
const phase=process.env.RESULT_PHASE||'after',dir='shots/p08-result-readability/'+phase;
await mkdir(dir,{recursive:true});await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'warn'});
const server=await preview({build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5273,strictPort:true},logLevel:'warn'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={phase,renderer:'Canvas',viewport:{width:390,height:740},DPR:1,safeInset:{top:0,bottom:0,left:0,right:0},build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),routes:[],errors:[],physicalDevice:'NOT_RUN',GPU:'NOT_RUN',audioListening:'NOT_RUN',aesthetics:'PENDING'};
const save=p=>p.evaluate(()=>window.__harness.game.registry.get('runController').state);
const ready=p=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
const lum=color=>{const c=color.replace('#',''),n=parseInt(c,16),f=shift=>{const s=(n>>shift&255)/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;};return .2126*f(16)+.7152*f(8)+.0722*f(0);};
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
async function read(p){return p.evaluate(()=>{const s=window.__harness.game.scene.getScene('intermission'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]);return {renderer:window.__harness.game.renderer.type,texts:walk(s.children.list).filter(o=>o.type==='Text'&&o.visible).map(o=>{const b=o.getBounds();return {name:o.name,text:o.text,color:o.style.color,font:o.style.fontSize,resolution:o.style.resolution,bounds:{x:b.x,y:b.y,width:b.width,height:b.height}};})};});}
try{
 for(const route of ['win','loss']){
  const context=await browser.newContext({viewport:report.viewport,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await context.newPage();p.on('pageerror',e=>report.errors.push(String(e)));
  await p.goto('http://127.0.0.1:5273/?harness=1&seed='+(route==='win'?'d43-fire-1':'p08-low-singles'));await chooseCharacter(p,'laohuan',true);await tapUI(p,'shop','action/start-stage',true);await waitScene(p,'game');await ready(p);
  await openMenuSection(p,'settings',true);await p.getByLabel('演出速度').selectOption('4');await p.locator('.run-menu-toggle').tap();
  if(route==='win'){for(const id of ['diamonds-7','diamonds-9','diamonds-4','diamonds-12','diamonds-10'])await tapUI(p,'game','card/'+id,true);await tapUI(p,'game','action/play',true);}
  else for(let i=0;i<8;i++){if(await p.evaluate(()=>window.__harness.game.scene.isActive('intermission')))break;await ready(p);const id=await p.evaluate(()=>window.__harness.game.scene.getScene('game').hand.slice().sort((a,b)=>a.rank-b.rank)[0].id);await tapUI(p,'game','card/'+id,true);await tapUI(p,'game','action/play',true);await p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||s.ready&&!s.playing;});}
  await waitScene(p,'intermission');const state=await save(p);assert.equal(state.phase,route==='win'?'stage-cleared':'run-lost');assert.equal(state.lastTrace.finalScore,route==='win'?'1200':state.lastTrace.finalScore);
  const image=await read(p);assert.equal(image.renderer,1,'actual Canvas');
  const key=image.texts.filter(o=>o.name.startsWith('result/'));for(const o of key){o.contrastOnPaper=contrast(o.color,'#F3EADB');if(phase==='after')assert.ok(o.contrastOnPaper>=4.5,JSON.stringify(o));assert.ok(parseFloat(o.font)>=14);assert.ok(o.bounds.x>=0&&o.bounds.x+o.bounds.width<=390);}
  if(phase==='after'&&route==='loss'){
    assert.equal(key.find(o=>o.name==='result/failure-reason')?.text,'出牌次数已用完');
    assert.equal(key.find(o=>o.name==='result/last-hand')?.text,'最后一手：高牌 · '+state.lastTrace.finalScore+' 热度');
    assert.equal(key.find(o=>o.name==='result/resources')?.text,'剩余出牌 '+state.stage.handsLeft+' 次 · 弃牌 '+state.stage.discardsLeft+' 次');
    for(let i=0;i<key.length;i++)for(let j=i+1;j<key.length;j++){const a=key[i].bounds,b=key[j].bounds;assert.ok(!(a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height),JSON.stringify([key[i],key[j]]));}
  }
  if(!process.env.KEEP_IMAGES&&(phase==='after'||route==='loss'))await p.screenshot({path:dir+'/390-'+route+'.png'});
  await p.setViewportSize({width:1280,height:720});await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').view.layout.width===1280);const desktop=await read(p);assert.deepEqual(await save(p),state);for(const o of desktop.texts.filter(o=>o.name.startsWith('result/'))){if(phase==='after')assert.ok(contrast(o.color,'#F3EADB')>=4.5,JSON.stringify(o));}
  let short;
  if(phase==='after'&&route==='loss'){
    await p.setViewportSize({width:844,height:300});await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').view.layout.width===844);short=await read(p);
    const reason=short.texts.find(o=>o.name==='result/failure-reason'),gap=short.texts.find(o=>o.name==='result/gap');assert.ok(reason&&gap);assert.ok(reason.bounds.y+reason.bounds.height<=gap.bounds.y);assert.ok(!short.texts.some(o=>o.name==='result/last-hand'||o.name==='result/resources'));assert.deepEqual(await save(p),state);
    await tapUI(p,'intermission','action/last-hand',true);await p.getByText(/剩余出牌 0 · 剩余弃牌 3/).waitFor();await p.getByRole('button',{name:'关闭',exact:true}).tap();assert.deepEqual(await save(p),state);
  }
  await p.setViewportSize(report.viewport);await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',true);await waitScene(p,'intermission');assert.deepEqual(await save(p),state,'restore cannot reward twice');
  if(route==='win'){await tapUI(p,'intermission','action/continue-stage',true);await waitScene(p,'shop');assert.equal((await save(p)).phase,'shop');}
  else{await tapUI(p,'intermission','action/retry-seed',true);await waitScene(p,'shop');const retry=await save(p);assert.equal(retry.seed,state.seed);assert.equal(retry.characterId,state.characterId);assert.equal(retry.lastTrace,null);}
  report.routes.push({route,natural:true,phase:state.phase,lastHandScore:state.lastTrace.finalScore,stageHeat:state.stage.heat,target:state.stage.targetHeat,goldEarned:state.stage.goldEarned,key,mobile:image,desktop,short,checks:['native selected/play inputs','saved exact result','resize full run unchanged','reload/continue no second reward','native '+(route==='win'?'continue to shop':'same-seed retry to shop'),...(short?['short result reason/gap nonoverlap; existing details retains full resources; no new screenshot']:[])]});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;console.error(e);}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,routes:report.routes.map(r=>({route:r.route,key:r.key,checks:r.checks}))},null,2));}
