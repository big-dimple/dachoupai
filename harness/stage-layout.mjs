/** Short presentation fixtures; not a simulated full run or physical-device test. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {build,preview} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {chooseCharacter,tapUI,waitScene,point} from './ui.mjs';
const root='shots/stage-layout',outDir=root+'/build';await mkdir(root,{recursive:true});
if(process.env.LAYOUT_REUSE!=='1')await build({mode:'e2e',build:{outDir,emptyOutDir:true},logLevel:'warn'});
const server=await preview({build:{outDir},preview:{host:'127.0.0.1',port:5207,strictPort:true}});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const reports={renderer:'Canvas',fixtureOnly:true,physicalDevice:'NOT_RUN',runs:[]};
try{for(const [name,viewport,reducedMotion] of [['desktop',{width:1280,height:800},'no-preference'],['mobile',{width:412,height:820},'no-preference'],['mobile-bars',{width:390,height:640},'reduce']]){
 const touch=name!=='desktop',ctx=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:touch?3:1,reducedMotion,recordVideo:{dir:root+'/video',size:viewport}}),page=await ctx.newPage();
 const report={name,viewport,reducedMotion,checks:[]};reports.runs.push(report);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const shot=async suffix=>page.screenshot({path:`${root}/${name}-${suffix}.png`});
 try{
  await page.goto('http://127.0.0.1:5207/?harness=1&seed=f09-sample-30');await chooseCharacter(page,'amo',touch);await page.waitForTimeout(350);await shot('shop');
  const offers=await page.evaluate(()=>window.__harness.game.registry.get('runController').state.shop.offers);
  await tapUI(page,'shop','offer/'+offers[0].offerId,touch);await shot('mechanism-detail');
  const mechanism=await page.locator('.dialog-mechanism-art').boundingBox(),footer=await page.locator('.dialog-actions').boundingBox(),intro=await page.locator('.dialog-intro').boundingBox();
  assert.ok(mechanism.width<=114&&mechanism.height<=180,'mechanism stays a small reference');assert.ok(intro.y<footer.y&&footer.y+footer.height<=viewport.height);await page.getByRole('button',{name:'取消',exact:true}).click();await page.waitForTimeout(400);
  const f09=offers.find(o=>o.definitionId==='f09');await tapUI(page,'shop','offer/'+f09.offerId,touch);await shot('purchase-detail');
  assert.match(await page.locator('.dialog-purchase-summary').innerText(),/6/);assert.ok(await page.locator('.dialog-actions').evaluate(e=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight;}));
  await page.getByRole('button',{name:'确认购买',exact:true}).click();await page.waitForTimeout(400);await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');
  await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').ready);
  // Substitute only the read-only view of state. No fixture is written to IndexedDB.
  await page.evaluate(()=>{const g=window.__harness.game,c=g.registry.get('runController');window.fixtureController=c;window.savedBeforeFixture=c.exportJSON();window.fixtureBase=structuredClone(c.state);});
  const install=async lost=>{
   await page.evaluate(lost=>{
    const g=window.__harness.game,c=window.fixtureController,s=structuredClone(window.fixtureBase);
    s.phase=lost?'run-lost':'stage-cleared';s.stageIndex=lost?0:1;s.stage={...s.stage,heat:lost?'3856':'12632',targetHeat:lost?'4800':'3600',handsLeft:0,discardsLeft:0,playIndex:4,previousHandScore:'9703',goldEarned:lost?0:7};
    s.lastTrace={rulesVersion:'r2',rootId:'presentation-fixture',handType:'straight-flush',level:1,finalScore:'9703',accumulator:{H:{n:'599',d:'1'},M:{n:'81',d:'5'}},events:[],sets:{playedIds:[],scoringIds:[],activeScoringIds:[],heldIds:[]},cards:[],sourceJokers:[],bossContext:{boss:null}};
    Object.defineProperty(c,'state',{configurable:true,value:s});g.scene.stop('game');g.scene.stop('intermission');g.scene.start('intermission',{cleared:!lost,stageIndex:0,stageHeat:s.stage.heat,handsLeft:0,goldEarned:s.stage.goldEarned});
   },lost);await waitScene(page,'intermission');
  };
  await install(false);await shot('comeback-burst');
  assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('intermission').view.root.list.find(o=>o.name==='result/title').text),'最后一手，掀翻全场！');
  const enabled=await point(page,'intermission','action/continue-stage');assert.equal(enabled.enabled,true,'continue is usable during celebration');
  if(reducedMotion==='reduce')assert.equal(await page.evaluate(()=>!!window.__harness.game.scene.getScene('intermission').celebration),false);
  else if(await page.evaluate(()=>!!window.__harness.game.scene.getScene('intermission').celebration))await tapUI(page,'intermission','action/skip-celebration',touch);
  await page.waitForTimeout(1100);await shot('comeback');
  assert.equal(await page.evaluate(()=>window.fixtureController.exportJSON()),await page.evaluate(()=>window.savedBeforeFixture),'presentation cannot change saved state');
  await install(true);await page.waitForTimeout(320);await shot('loss');
  const texts=await page.evaluate(()=>window.__harness.game.scene.getScene('intermission').view.root.list.filter(o=>o.type==='Text').map(o=>o.text).join('\n'));
  assert.match(texts,/演出失败/);assert.match(texts,/3,856 \/ 4,800 · 差 944/);assert.doesNotMatch(texts,/这手的亮点|带着这一手|这一轮的积累/);
  await tapUI(page,'intermission','action/retry-seed',touch);await waitScene(page,'shop');
  assert.equal(await page.evaluate(()=>window.__harness.game.registry.get('runController').state.seed),'f09-sample-30');
  report.checks.push('mechanism/detail/footer geometry','actual shelf pagination and F09 purchase','comeback fixture with exact formula and no save mutation','celebration skip / reduced motion / immediately enabled continue','concise failure and same-seed retry');assert.deepEqual(errors,[]);report.status='PASS';
 }catch(e){report.status='FAIL';report.error=String(e);report.stack=e.stack;report.errors=errors;await shot('failure');}
 const video=page.video();await ctx.close();await video.saveAs(`${root}/${name}.webm`);console.log(JSON.stringify(report));
}}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));await writeFile(root+'/report.json',JSON.stringify(reports,null,2));}
if(reports.runs.some(r=>r.status!=='PASS'))process.exitCode=1;
