/** Complete owned-card labels: actual Phaser measurement and native input, Canvas. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile}from'node:fs/promises';
import {createServer,build,preview}from'vite';
import {chromium}from'playwright';
import {tapUI,waitScene}from'./ui.mjs';
const dir='shots/p08-joker-compact';await mkdir(dir,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});
const fixtures=[],cases=[];
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{R2_JOKERS,r2GrowthCaps,r2GrowthMinimums}=await ssr.ssrLoadModule('/src/content/r2Schema.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 for(const group of [['e04','c05','e11','f09','d05'],['c08','c09','f08','f06','f12']]){
  let state=createRun({seed:'p08-joker-compact',runId:'fixture/p08-joker-compact',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  state.jokers=group.map(id=>r2CreateJoker(id,'owned/'+id,0));
  const command=action=>{const r=applyCommand(state,{runId:state.runId,commandId:'fixture/'+state.commandSeq,expectedSeq:state.commandSeq,action});assert.ok(r.ok,JSON.stringify(r));state=r.state;};
  command({type:'LeaveShop'});command({type:'EnterStage'});
  if(group.includes('c05')){
   const pair=state.deckInstances.filter(c=>c.suit==='hearts').slice(0,2).map(c=>c.id),rest=state.deckInstances.filter(c=>!pair.includes(c.id)).map(c=>c.id);
   state.handOrder=[...pair,...rest.splice(0,7)];state.drawPile=rest;state.stage.initialHandLimit=state.stage.handLimit=9;
   command({type:'DiscardHand',selectedIds:pair});assert.equal(state.stage.discardsUsed,1);assert.equal(state.jokers.find(j=>j.definitionId==='c05').growth.pendingHeat.n,'40');
  }
  const cp=makeCheckpoint(state,[]);assert.ok(readCheckpoint(cp).ok);fixtures.push(JSON.stringify(cp));
 }
 for(const d of R2_JOKERS){const j=r2CreateJoker(d.id,'probe/'+d.id,0);cases.push({kind:'initial',j});
  const keys=Object.keys(r2GrowthCaps(d));if(keys.length){const nonzero=structuredClone(j);nonzero.growth={...r2GrowthMinimums(d),...r2GrowthCaps(d)};cases.push({kind:'saved',j:nonzero});const zero=structuredClone(j);zero.growth={...r2GrowthMinimums(d)};cases.push({kind:'zero',j:zero});}
  const life=d.hooks.flatMap(h=>h.operations).find(o=>o.kind==='expire-after-hands');if(life){const used=structuredClone(j);used.counters={handsScored:life.limit};cases.push({kind:'lifetime0',j:used});}
  if(d.id==='a07'){const used=structuredClone(j);used.counters={singleDiscards:2};cases.push({kind:'uses0',j:used});}
 }
}finally{await ssr.close();}
await build({mode:'e2e',base:'/p08-compact/',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({base:'/p08-compact/',build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5282,strictPort:true},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={status:'IN_PROGRESS',build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),renderer:'Canvas software',DPR:1,fixture:'Two native-imported validator-approved five-slot checkpoints. First has actual successful same-suit discard for pendingHeat40/d05 used/f09 discarded. Measurement probes reuse mounted Text without changing run. Not natural purchase/deployment.',targetDevice:'OnePlus/realGPU/audio NOT_RUN',profiles:[],checks:[]};
try{
 for(const viewport of [{width:320,height:740},{width:360,height:740},{width:390,height:740},{width:844,height:300}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
  await page.goto('http://127.0.0.1:5282/p08-compact/?harness=1');await waitScene(page,'title');
  const profile={viewport,safeInset:{top:0,bottom:0,left:0,right:0},groups:[],measurements:[]};
  for(let group=0;group<fixtures.length;group++){
   await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'compact-fixture.json',mimeType:'application/json',buffer:Buffer.from(fixtures[group])});await waitScene(page,'game');
   await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
   const before=await page.evaluate(()=>window.__harness.game.registry.get('runController').state);
   const labels=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return s.run.jokers.map(j=>{const l=s.jokerViews.get(j.instanceId).getData('valueLabel'),b=l.getBounds();return{id:j.definitionId,text:l.text,fullText:l.getData('fullText'),room:l.getData('labelRoom'),width:l.width,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},fontSize:l.style.fontSize,resolution:l.style.resolution};});});
   const initial=await labels();assert.deepEqual(initial.map(l=>l.id),group===0?['e04','c05','e11','f09','d05']:['c08','c09','f08','f06','f12']);assert.ok(initial.every(l=>l.width<=l.room&&l.fontSize==='14px'&&!l.text.includes('…')));
   const id=await page.evaluate(()=>window.__harness.game.scene.getScene('game').hand[0].id);await tapUI(page,'game','card/'+id,true);const refreshed=await labels();assert.deepEqual(refreshed,initial);await tapUI(page,'game','card/'+id,true);
   if(group===0){assert.equal(initial.find(l=>l.id==='f09').text,'已弃牌');assert.equal(initial.find(l=>l.id==='d05').text,'余0次');assert.equal(initial.find(l=>l.id==='c05').text,'蓄热40');assert.ok(['系数×1','×1'].includes(initial.find(l=>l.id==='e11').text));
    await tapUI(page,'game','joker/owned/c05',true);await page.locator('.detail-dialog[open]').waitFor();assert.ok((await page.locator('.detail-dialog[open]').innerText()).includes('40'));await page.getByRole('button',{name:'关闭',exact:true}).tap();
   }
   assert.deepEqual(await page.evaluate(()=>window.__harness.game.registry.get('runController').state),before);profile.groups.push({initial,refreshed,nativeSelectionAndDetailCancel:'PASS; complete run/resources/RNG unchanged'});
   if(group===0){profile.measurements=await page.evaluate(cases=>{const s=window.__harness.game.scene.getScene('game'),view=s.jokerViews.get(s.run.jokers[0].instanceId),label=view.getData('valueLabel'),out=[];for(const c of cases){s.fitOwnedJokerLabel(label,c.j,0);out.push({id:c.j.definitionId,kind:c.kind,text:label.text,fullText:label.getData('fullText'),room:label.getData('labelRoom'),width:label.width,resolution:label.style.resolution});}s.refreshJokerLabels();return out;},cases);
    assert.ok(profile.measurements.every(l=>l.width<=l.room&&!l.text.includes('…')));assert.ok(profile.measurements.filter(l=>l.kind==='initial').every(l=>!['条件','条件 ›'].includes(l.text)));
    if(viewport.width===390||viewport.width===844){const path=dir+'/'+viewport.width+'-owned-compact.png';await page.screenshot({path});profile.screenshot=path;}
   }
  }
  assert.deepEqual(errors,[]);report.profiles.push(profile);await context.close();
 }
 report.status='PASS';report.checks=['all72 initial mechanism alternatives and saved/zero/lifetime/uses probes fit actual Phaser14px font/resolution in four viewports','native selection refresh matches mount geometry and state labels; details cancel changes no run/resources/RNG','e04 mechanism, c05 pending40, e11 saved coefficient1, f09 discarded and d05 used discoverable; 9-card input remains active'];
}catch(e){report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,profiles:report.profiles.map(p=>({viewport:p.viewport,probes:p.measurements.length,screenshot:p.screenshot,labels:p.groups[0]?.initial})),checks:report.checks},null,2));}
