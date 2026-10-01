/** Short player path in a compiled bundle. Observers are read-only; inputs are real. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium,firefox,webkit} from 'playwright';
import {build,preview} from 'vite';
import {waitScene,tapUI,point} from './ui.mjs';
const root=process.cwd(),port=Number(process.env.SHOT_PORT||5199),outDir=path.join(root,'shots/smoke-build'),verify=process.argv.includes('--verify-smoke');
const saveScreens=!verify||process.env.SMOKE_SHOTS==='1';
const engines={chromium,firefox,webkit},selected=(process.env.SMOKE_BROWSERS||'chromium').split(',');
assert.ok(selected.length&&new Set(selected).size===selected.length&&selected.every(e=>engines[e]),'known distinct smoke engines');
const profiles={desktop:{width:1280,height:720},wide:{width:1920,height:1080},mobile:{width:390,height:844},landscape:{width:844,height:390}},selectedProfiles=(process.env.SHOT_PROFILES||'desktop,mobile').split(',');
assert.ok(selectedProfiles.length&&new Set(selectedProfiles).size===selectedProfiles.length&&selectedProfiles.every(p=>profiles[p]),'known distinct viewport profiles');
const report={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),checks:[],physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN'};
const state=page=>page.evaluate(()=>window.__harness.game.registry.get('runController').state);
const next=(page,seq)=>page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq&&window.__harness.game.registry.get('runController').status==='idle',seq);
const ready=page=>page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.scene.isActive()&&!s.playing&&s.cardViews.length>0;});
const dom=async(page,name,touch)=>{const b=page.getByRole('button',{name,exact:true});if(touch)await b.tap();else await b.click();};
await mkdir('shots',{recursive:true});
await build({mode:'e2e',build:{outDir,emptyOutDir:true},logLevel:'warn'});
const server=await preview({build:{outDir},preview:{port,strictPort:true,host:'127.0.0.1'}}),base=`http://127.0.0.1:${port}/?harness=1&seed=p00-core-ui`;
let browser;
try {
  for(const engine of selected){
  browser=await engines[engine].launch();
  for(const name of selectedProfiles){
    const viewport=profiles[name],touch=name==='mobile'||name==='landscape',recordVideo=process.env.SHOT_VIDEO==='1'&&engine===selected[0]&&name==='desktop';
    const context=await browser.newContext({viewport,hasTouch:touch,...(recordVideo?{recordVideo:{dir:'shots/p00-video',size:viewport}}:{})}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(base);await waitScene(page,'character-select');
    const count=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select');const walk=list=>list.reduce((n,o)=>n+(o.name.startsWith('character/')?1:0)+(o.list?walk(o.list):0),0);return walk(s.children.list);});assert.equal(count,6);
    if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-select.png`});
    await tapUI(page,'character-select','character/amo',touch);
    assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('character-select').selectedId),'amo');
    assert.equal(await page.evaluate(()=>window.__harness.game.scene.isActive('shop')),false,'selection requires confirmation');
    await tapUI(page,'character-select','action/cancel-character',touch);
    assert.equal((await point(page,'character-select','action/confirm-character')).enabled,false);
    await tapUI(page,'character-select','character/amo',touch);await tapUI(page,'character-select','action/confirm-character',touch);await waitScene(page,'shop');
    assert.equal((await state(page)).characterId,'amo');
    const shop=await state(page),offer=shop.shop.offers.find(o=>!o.consumed&&o.price<=shop.gold);assert.ok(offer,'natural starting gold permits a purchase');
    await tapUI(page,'shop','offer/'+offer.offerId,touch);await dom(page,'取消',touch);assert.deepEqual(await state(page),shop,'cancel leaves gold, shelf and RNG untouched');
    await tapUI(page,'shop','offer/'+offer.offerId,touch);await dom(page,'确认购买',touch);await next(page,shop.commandSeq);
    assert.equal((await state(page)).gold,shop.gold-offer.price);assert.equal((await state(page)).jokers.length,shop.jokers.length+1);
    if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-shop.png`});
    await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length>0);
    await ready(page);const initial=await state(page),chosen=initial.handOrder[0];
    await tapUI(page,'game','card/'+chosen,touch);
    assert.ok(await page.evaluate(id=>{const s=window.__harness.game.scene.getScene('game'),c=s.cardViews.find(c=>c.card.id===id);return s.selectedIds.has(id)&&c.container.getData('selected')&&s.resultText.text.includes('当前选择');},chosen),'selection immediately changes both card and preview');
    for(const name of ['action/sort-rank','action/sort-suit']){
      const before=await state(page);await tapUI(page,'game',name,touch);await next(page,before.commandSeq);const after=await state(page);
      assert.deepEqual(after.rng,before.rng);assert.deepEqual(after.stage,before.stage);
      assert.ok(await page.evaluate(id=>window.__harness.game.scene.getScene('game').selectedIds.has(id),chosen),'sorting keeps selection');
    }
    const beforeDiscard=await state(page);await tapUI(page,'game','action/discard',touch);await next(page,beforeDiscard.commandSeq);await ready(page);const discarded=await state(page);
    assert.ok(discarded.discardPile.includes(chosen));assert.ok(!discarded.handOrder.includes(chosen));assert.equal(discarded.handOrder.length,8);
    for(const id of beforeDiscard.handOrder.filter(id=>id!==chosen))assert.ok(discarded.handOrder.includes(id),'unselected cards stay held');
    assert.equal(discarded.stage.discardsLeft,beforeDiscard.stage.discardsLeft-1);assert.equal(discarded.stage.handsLeft,beforeDiscard.stage.handsLeft);assert.equal(discarded.drawPile.length,beforeDiscard.drawPile.length-1);
    await tapUI(page,'game','card/'+discarded.handOrder[0],touch);if(saveScreens&&engine===selected[0])await page.screenshot({path:`shots/${name}-game.png`});
    await tapUI(page,'game','action/play',touch);await next(page,discarded.commandSeq);await ready(page);const played=await state(page);
    assert.equal(played.stage.handsLeft,discarded.stage.handsLeft-1);assert.equal(played.stage.discardsLeft,discarded.stage.discardsLeft);assert.ok(BigInt(played.stage.heat)>BigInt(discarded.stage.heat));assert.ok(played.lastTrace);
    await page.reload();await waitScene(page,'character-select');assert.deepEqual(await state(page),played,'refresh restores the full determined result');
    await dom(page,'菜单',touch);await dom(page,'继续本局',touch);await waitScene(page,'game');await ready(page);assert.deepEqual(await state(page),played,'continue never re-scores');
    assert.deepEqual(errors,[]);report.checks.push({engine,browserVersion:browser.version(),profile:name,viewport,status:'PASS',input:touch?'touchscreen.tap / DOM tap':'mouse.click / DOM click',covered:['select-confirm-cancel','buy-cancel','rank/suit-sort','discard-refill','play-preview-feedback','reload-continue']});const video=page.video();await context.close();if(recordVideo)await video.saveAs('shots/p00-play.webm');console.log(`${engine}/${name}: ok`);
  }
  await browser.close();browser=undefined;
  }
}catch(error){report.failure=String(error);throw error;}finally{await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve));await writeFile('shots/smoke-result.json',JSON.stringify(report,null,2)+'\n');}
console.log(verify?'smoke: ok':'shots saved to shots/');
