import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';
const baseline=process.env.EXPECT_REFILL_BUG==='1',out=process.env.REFILL_OUT??'shots/refill-recovery';await mkdir(out,{recursive:true});
const ssr=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'error'});
let plan,makeCheckpoint,applyCommand;try{({refillRecoveryFixture:plan}=await ssr.ssrLoadModule('/harness/fixtures/refill-recovery.ts'));({makeCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts'));({applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'));}finally{await ssr.close();}
const report={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceStatus:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),baseline,scope:'Current Xin Qiji difficulty2 deterministic real discard/refill and persisted recovery; no user save or rule changes. Mobile emulation only.',cases:[]};
await build({mode:'e2e',build:{outDir:out+'/build'},logLevel:'error'});
const server=await preview({build:{outDir:out+'/build'},preview:{host:'127.0.0.1',port:5195,strictPort:true},logLevel:'error'}),browser=await chromium.launch({channel:'msedge'});
const snap=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
const ui=p=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),b=o=>o?.getBounds?.(),label=o=>o?.getData('label')?.text;return {phase:s.run.phase,playing:s.playing,hidden:s.refillHidden,cardIds:s.cardViews.map(v=>v.card.id),layoutCount:s.view.layout.cards.length,play:{label:label(s.playButton),enabled:s.playButton.input?.enabled,bounds:b(s.playButton)},discard:{label:label(s.discardButton),enabled:s.discardButton.input?.enabled,bounds:b(s.discardButton)},hero:{label:label(s.heroActionButton),enabled:s.heroActionButton.input?.enabled},selected:[...s.selectedIds]};});
async function importRun(p,state){await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'controlled-refill-recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(state,[])))});await waitScene(p,'game');}
const settle=p=>p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.every(v=>!v.dealing);});
function savedCommand(before,after,action){assert.equal(after.journal.length,before.journal.length+1);const command=after.journal.at(-1);assert.deepEqual(command.action,action);const expected=applyCommand(before.state,command);assert.ok(expected.ok,expected.code);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.storage.current,makeCheckpoint(after.state,after.journal));return command;}
try{
  for(const spec of baseline?[{id:'baseline-phone',width:390,height:844,restore:true,count:5}]:[{id:'phone-five',width:390,height:844,count:5},{id:'phone-restore',width:390,height:740,count:5,restore:true},{id:'pc-four',width:1366,height:768,count:4}]){
    const dir=out+'/'+spec.id;await mkdir(dir,{recursive:true});const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.width<500,deviceScaleFactor:1,reducedMotion:'reduce',recordVideo:{dir,size:{width:spec.width,height:spec.height}}}),p=await context.newPage(),row={spec,errors:[],states:[]};report.cases.push(row);p.setDefaultTimeout(20000);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
    const tap=name=>tapUI(p,'game',name,spec.width<500),shot=name=>p.screenshot({path:dir+'/'+name+'.png'});
    try{
      await p.goto('http://127.0.0.1:5195/?harness=1');await waitScene(p,'title');const route=plan(spec.count);await importRun(p,spec.restore?route.pending:route.state);
      if(baseline){await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length===3);row.ui=await ui(p);row.saved=await snap(p);await shot('broken-three-only');assert.equal(row.ui.layoutCount,3);assert.equal(row.ui.cardIds.length,3);assert.ok(row.errors.some(e=>/visual|undefined/.test(e)));assert.deepEqual(row.saved.state,route.pending);row.status='REPRODUCED';continue;}
      await settle(p);
      if(!spec.restore){
        const before=await snap(p);await tap('hero/action-shortcut');const choice=p.locator('.hero-discard-choice[open]');await choice.waitFor();for(const id of route.discard){const button=choice.locator('button[data-card-id="'+id+'"]');if(spec.width<500)await button.tap();else await button.click();}await choice.getByRole('button',{name:'下一步 · 确认弃牌',exact:true}).click();await p.getByRole('button',{name:'确认弃'+spec.count+'张并换牌',exact:true}).click();await settle(p);row.discard=savedCommand(before,await snap(p),{type:'DiscardHand',selectedIds:route.discard,laohuanTrick:true});
      }
      const pending=await snap(p),pendingUI=await ui(p);row.states.push({name:'pending',ui:pendingUI,saved:pending});assert.equal(pending.state.pendingRefill.required,spec.count);assert.equal(pendingUI.cardIds.length,spec.count+2);assert.equal(pendingUI.layoutCount,spec.count+2);assert.deepEqual(pendingUI.cardIds,pending.state.pendingRefill.candidateIds);assert.equal(pendingUI.play.label,'确认留'+spec.count);await shot('all-candidates');
      // Menu cancellation is a pure UI action, then hiding/reopening candidates must remain possible.
      await p.locator('.run-menu-toggle').click();await p.getByRole('button',{name:'关闭菜单',exact:true}).click();assert.deepEqual(await snap(p),pending);
      await tap('action/discard');assert.equal((await ui(p)).hidden,true);assert.equal((await ui(p)).discard.label,'继续选牌');await tap('action/discard');assert.equal((await ui(p)).hidden,false);assert.deepEqual(await snap(p),pending);
      await tap('hero/action-shortcut');assert.equal((await ui(p)).hidden,false);assert.deepEqual(await snap(p),pending);
      await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',spec.width<500);await settle(p);assert.deepEqual((await snap(p)).state,pending.state);assert.equal((await ui(p)).cardIds.length,spec.count+2);await shot('restored-candidates');
      const beforeChoice=await snap(p),kept=beforeChoice.state.pendingRefill.candidateIds.slice(0,spec.count);for(const id of kept.slice(0,-1))await tap('card/'+id);assert.equal((await ui(p)).play.enabled,false);await tap('card/'+kept.at(-1));assert.equal((await ui(p)).play.enabled,true);await shot('confirm-enabled');await tap('action/play');await settle(p);const after=await snap(p);row.choose=savedCommand(beforeChoice,after,{type:'ChooseRefill',selectedIds:kept});assert.equal(after.state.phase,'await-input');assert.equal(after.state.pendingRefill,null);assert.deepEqual(after.state.handOrder,[...beforeChoice.state.handOrder,...kept]);assert.equal(after.state.stage.discardsUsed,beforeChoice.state.stage.discardsUsed);assert.equal(after.state.gold,beforeChoice.state.gold);assert.deepEqual(after.state.rng,beforeChoice.state.rng);row.states.push({name:'continued',ui:await ui(p),saved:after});await shot('continued-eight');assert.deepEqual(row.errors,[]);row.status='PASS';
    }finally{await p.close();await context.close();console.log(spec.id,row.status);}
  }
  report.status=baseline?'REPRODUCED':'PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);console.error(error);process.exitCode=1;}
finally{await browser.close();await server.httpServer.close();await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));console.log(report.status);}
