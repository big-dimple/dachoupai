/** Targeted a07 stage boundary and d07 complete effect words; no new image set. */
import assert from'node:assert/strict';import{mkdir,writeFile,readFile}from'node:fs/promises';
import{createServer,build,preview}from'vite';import{chromium}from'playwright';import{tapUI,waitScene}from'./ui.mjs';
const dir='shots/p08-cue-stage-reset';await mkdir(dir,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'}),fixtures={};
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 let s=createRun({seed:'p08-a07-used-shop-next',runId:'fixture/p08-a07-used-shop-next',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});s.jokers=['a07','d07'].map(id=>r2CreateJoker(id,'owned/'+id,0));
 const command=action=>{const r=applyCommand(s,{runId:s.runId,commandId:'fixture/'+s.commandSeq,expectedSeq:s.commandSeq,action});assert.ok(r.ok);s=r.state;};
 const checkpoint=name=>{const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok);fixtures[name]=JSON.stringify(cp);};
 command({type:'LeaveShop'});command({type:'EnterStage'});command({type:'DiscardHand',selectedIds:[s.handOrder[0]]});command({type:'DiscardHand',selectedIds:[s.handOrder[0]]});assert.equal(s.jokers[0].counters.singleDiscards,2);checkpoint('used');
 const available=s.deckInstances.filter(c=>!s.discardPile.includes(c.id)&&!s.playedPile.includes(c.id)),chosen=available.filter(c=>c.suit==='hearts').slice(0,5).map(c=>c.id),rest=available.filter(c=>!chosen.includes(c.id)).map(c=>c.id);s.handOrder=[...chosen,...rest.splice(0,s.stage.handLimit-5)];s.drawPile=rest;
 command({type:'PlayHand',selectedIds:chosen});assert.equal(s.phase,'stage-cleared');command({type:'OpenShop'});checkpoint('shop');
 command({type:'LeaveShop'});command({type:'EnterStage'});assert.equal(s.jokers[0].counters.singleDiscards,0);checkpoint('next');
}finally{await ssr.close();}
await build({mode:'e2e',base:'/p08-reset/',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({base:'/p08-reset/',build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5283,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={status:'IN_PROGRESS',build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),renderer:'Canvas software',DPR:1,safeInset:{top:0,bottom:0,left:0,right:0},route:'Validator-approved fixture checkpoints from two actual successful single discards -> explicitly arranged legal winning flush -> OpenShop -> EnterStage. Native import, selection toggle, owned-detail cancel. Not natural purchase/deployment.',profiles:[],targetDevice:'OnePlus/realGPU/audio NOT_RUN'};
try{
 for(const viewport of [{width:320,height:740},{width:360,height:740},{width:390,height:740},{width:844,height:300}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('dialog',d=>d.accept());page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:5283/p08-reset/?harness=1');await waitScene(page,'title');
  const profile={viewport,states:[]};
  for(const name of viewport.width===390?['used','shop','next']:['used','next']){
   await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'cue-reset-fixture.json',mimeType:'application/json',buffer:Buffer.from(fixtures[name])});const scene=name==='shop'?'shop':'game';await waitScene(page,scene);
   await page.waitForFunction(({scene,name})=>{const s=window.__harness.game.scene.getScene(scene),expected=name==='next'?0:2;return s.ready&&s.run.jokers[0].counters.singleDiscards===expected&&(scene!=='game'||s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container)));},{scene,name});
   const before=await page.evaluate(()=>window.__harness.game.registry.get('runController').state),entry={name,phase:before.phase,savedCounter:before.jokers[0].counters.singleDiscards};
   if(scene==='game'){
    const labels=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.run.jokers.map(j=>{const label=s.jokerViews.get(j.instanceId).getData('valueLabel'),b=label.getBounds();return{id:j.definitionId,text:label.text,fullText:label.getData('fullText'),room:label.getData('labelRoom'),width:label.width,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},font:label.style.fontSize,resolution:label.style.resolution};});});
    entry.initial=await labels();assert.equal(entry.initial[0].text,name==='used'?'余0次':'余2次');assert.ok(entry.initial.every(l=>l.width<=l.room&&l.font==='14px'));assert.equal(entry.initial[1].text,viewport.width===320?'加倍率':'全计+倍');
    const id=before.handOrder[0];await tapUI(page,'game','card/'+id,true);entry.refreshed=await labels();assert.deepEqual(entry.refreshed,entry.initial);await tapUI(page,'game','card/'+id,true);
   }
   await tapUI(page,scene,'joker/owned/a07',true);await page.locator('.detail-dialog[open]').waitFor();entry.detail=await page.locator('.detail-dialog[open]').innerText();assert.ok(entry.detail.includes(name==='shop'?'下场余2次':name==='used'?'本场余0次':'本场余2次'));assert.ok(!entry.detail.includes('下场余0次'));if(name==='shop'){assert.ok(entry.detail.includes('入场重置'));assert.ok(entry.detail.includes('已保存使用记录 2 / 2'));}
   await page.getByRole('button',{name:'关闭',exact:true}).tap();assert.deepEqual(await page.evaluate(()=>window.__harness.game.registry.get('runController').state),before);entry.nativeInputAndDetailCancel='PASS; complete run/resources/RNG unchanged';profile.states.push(entry);
  }
  assert.deepEqual(errors,[]);report.profiles.push(profile);await context.close();
 }report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,profiles:report.profiles.map(p=>({viewport:p.viewport,states:p.states.map(s=>({name:s.name,counter:s.savedCounter,labels:s.initial?.map(l=>({id:l.id,text:l.text,room:l.room,width:l.width,font:l.font,resolution:l.resolution}))}))}))},null,2));}
