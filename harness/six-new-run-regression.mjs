import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter,tapUI,waitScene} from './ui.mjs';
const out=process.env.SIX_HERO_OUT??'shots/six-new-run/final',heroes=process.env.SIX_HERO_CASES?.split(',');await mkdir(out,{recursive:true});
const ssr=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'error'});
let plans,applyCommand,makeCheckpoint;try{plans=(await ssr.ssrLoadModule('/harness/fixtures/six-new-run-plans.ts')).sixNewRunPlans();({applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'));({makeCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts'));}finally{await ssr.close();}
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim(),report={source:git('rev-parse','HEAD'),sourceStatus:git('status','--short'),scope:'Six formal current-identity new runs from native title/hero/route controls with URL seeds. No imported saves or patches to hands/resources/levels/RNG. Su Shi PC full motion, other five phone touch with reduced motion. Seed-selected scenarios; not natural player discovery, subjective visual/audio or physical acceptance.',cases:[]};
if(!process.env.SIX_REUSE_BUILD)await build({mode:'e2e',build:{outDir:out+'/build'},logLevel:'error'});
const server=await preview({build:{outDir:out+'/build'},preview:{host:'127.0.0.1',port:5197,strictPort:true},logLevel:'error'}),browser=await chromium.launch({channel:'msedge'});report.browser=browser.version();report.buildInfo=JSON.parse(await readFile(out+'/build/build-info.json','utf8'));
const snap=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:await c.store.read()};});
const ui=p=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {phase:s.run.phase,hand:s.hand.map(c=>c.id),views:s.cardViews.map(v=>v.card.id),layout:s.view.layout.cards.length,selected:[...s.selectedIds],amoExile:s.amoExile,assist:s.assistIds,target:s.erxiangTargetId,burn:s.xiemuBurn,release:s.azaoRelease,pending:!!s.pendingRefill,play:s.playButton.getData('label').text,playEnabled:s.playButton.input.enabled,skill:s.heroActionButton?.getData('abilityState')};});
async function settle(p){await p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||g.scene.isActive('game')&&s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing);});}
function canonical(before,after,expected){const added=after.journal.slice(before.journal.length);assert.equal(added.length,expected.length);let state=before.state;for(let i=0;i<added.length;i++){assert.deepEqual(added[i].action,expected[i]);const r=applyCommand(state,added[i]);assert.ok(r.ok,r.code);assert.equal(r.duplicate,false);state=r.state;}assert.deepEqual(after.state,state);assert.deepEqual(after.storage.current,makeCheckpoint(after.state,after.journal));return added;}
try{
  for(const plan of plans.filter(p=>!heroes||heroes.includes(p.hero))){
    const dir=out+'/'+plan.hero;await mkdir(dir,{recursive:true});const context=await browser.newContext({viewport:plan.hero==='amo'?{width:1366,height:900}:{width:390,height:844},hasTouch:true,isMobile:plan.hero!=='amo',deviceScaleFactor:1,reducedMotion:plan.hero==='amo'?'no-preference':'reduce',recordVideo:{dir,size:plan.hero==='amo'?{width:1366,height:900}:{width:390,height:844}}}),p=await context.newPage(),row={hero:plan.hero,seed:plan.seed,errors:[],steps:[]};report.cases.push(row);p.setDefaultTimeout(22000);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
    const tap=(name,scene='game')=>tapUI(p,scene,name,true),dom=locator=>locator.tap(),shot=name=>p.screenshot({path:dir+'/'+name+'.png'});
    const layout=async()=>{const v=await ui(p);assert.equal(v.views.length,v.hand.length);assert.equal(v.layout,v.hand.length);assert.deepEqual(v.views,v.hand);return v;};
    const select=async ids=>{await settle(p);const v=await ui(p);for(const id of v.selected.filter(id=>!ids.includes(id)))await tap('card/'+id);for(const id of ids.filter(id=>!v.selected.includes(id))){await tap('card/'+id);(row.selections??=[]).push({id,ui:await ui(p)});}const after=await layout();assert.deepEqual(after.selected,after.hand.filter(id=>ids.includes(id)),'native selected cards match the requested visible cards');};
    const changed=before=>p.waitForFunction(seq=>{const c=window.__harness.game.registry.get('runController');return c.status==='idle'&&c.state.commandSeq>seq;},before.state.commandSeq);
    const record=async(name,before,actions)=>{await changed(before);await settle(p);const after=await snap(p);row.steps.push({name,before,after,commands:canonical(before,after,actions),ui:await p.evaluate(()=>window.__harness.game.scene.isActive('game'))?await layout():undefined});return after;};
    const play=async(action,name)=>{await select(action.selectedIds);const before=await snap(p);await tap('action/play');await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq>seq||!!document.querySelector('.hero-play-reminder[open]'),before.state.commandSeq);const reminder=p.locator('.hero-play-reminder[open]');if(await reminder.count())await dom(reminder.getByRole('button',{name:/^(继续出牌|按原选择出牌)$/}));return record(name,before,[action]);};
    const enter=async()=>{await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);const before=await snap(p);await tap('action/start-stage','shop');await waitScene(p,'game');await p.waitForFunction(()=>window.__harness.game.registry.get('runController').state.phase==='await-input'||!!document.querySelector('dialog[open]'));if((await snap(p)).state.phase==='stage-ready')await dom(p.getByRole('button',{name:/^进入.*场/}));await p.waitForFunction(()=>window.__harness.game.registry.get('runController').state.phase==='await-input');await settle(p);await p.waitForTimeout(380);/* Existing DetailDialog close-pointer guard lasts350ms near the dismissed control. */return record('enter-stage',before,[{type:'LeaveShop'},{type:'EnterStage'}]);};
    const advance=async()=>{await waitScene(p,'intermission');const before=await snap(p);await tap('action/continue-stage','intermission');await waitScene(p,'shop');const after=await snap(p);row.steps.push({name:'open-shop',before,after,commands:canonical(before,after,[{type:'OpenShop'}])});await enter();};
    try{
      console.log('six new run:',plan.hero,plan.seed);await p.goto('http://127.0.0.1:5197/?harness=1&seed='+plan.seed);await waitScene(p,'title');await chooseCharacter(p,plan.hero,true);
      await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);const initialShop=await snap(p);assert.deepEqual(initialShop.state,plan.shop);assert.equal(initialShop.journal.length,0);row.start=initialShop;await enter();assert.deepEqual((await snap(p)).state,plan.initial);await shot('fresh-stage');
      for(let i=0;i<plan.prep.length;i++){const a=plan.prep[i];if(a.type==='PlayHand')await play(a,'preparation-play');else if(a.type==='OpenShop'){await advance();i+=2;}else throw Error('unexpected prep/'+a.type);}
      assert.deepEqual((await snap(p)).state,plan.skillBefore);const beforeSkill=await snap(p),first=plan.skill[0];
      if(plan.hero==='laohuan'||plan.hero==='touye'){
        await tap('hero/action-shortcut');const choice=p.locator('.hero-discard-choice[open]');await choice.waitFor();for(const id of first.selectedIds)await dom(choice.locator('button[data-card-id="'+id+'"]'));assert.deepEqual(await snap(p),beforeSkill);await shot('discard-draft');
        await dom(choice.getByRole('button',{name:plan.hero==='laohuan'?'下一步 · 确认弃牌':'下一步 · 选押注牌型',exact:true}));
        if(plan.hero==='touye')await dom(p.getByRole('button',{name:'押两对',exact:true}));
        assert.deepEqual(await snap(p),beforeSkill);await shot('skill-confirm');await dom(p.getByRole('button',{name:plan.hero==='laohuan'?'确认弃5张并换牌':'确认押两对并弃5张',exact:true}));await record('skill-discard',beforeSkill,[first]);
        if(plan.hero==='laohuan'){const before=await snap(p);assert.equal(before.state.pendingRefill.candidateIds.length,7);assert.equal((await layout()).layout,7);await shot('seven-refill-candidates');await select(plan.skill[1].selectedIds);await tap('action/play');await record('skill-keep',before,[plan.skill[1]]);}else await play(plan.skill[1],'wager-winning-hand');
      }else{
        await select(first.selectedIds);const beforeDraft=await snap(p);
        if(plan.hero==='amo'){
          await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:'本手使用贬谪 ×4',exact:true}));assert.equal((await ui(p)).amoExile,true);assert.deepEqual(await snap(p),beforeDraft);await shot('exile-chosen');
          await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:'取消本手贬谪',exact:true}));assert.equal((await ui(p)).amoExile,false);assert.deepEqual(await snap(p),beforeDraft);await shot('exile-cancelled');
          await tap('hero/action-shortcut');await dom(p.getByRole('button',{name:'本手使用贬谪 ×4',exact:true}));
          await p.evaluate(()=>{window.__exileSamples=[];window.__exileTimer=setInterval(()=>{const s=window.__harness.game.scene.getScene('game');if(!s?.scoreTotal)return;window.__exileSamples.push({at:performance.now(),eventId:s.scoreTotal.getData('eventId'),phase:s.scoreTotal.getData('eventPhase'),reason:s.presentation?.score.events.find(e=>e.eventId===s.scoreTotal.getData('eventId'))?.reasonKey,total:s.scoreTotal.text,mult:s.scoreMult.text,attachment:s.targetAttachment?.state?.value,eye:!!s.heroClimax,marks:s.cardViews.map(v=>({id:v.card.id,role:v.selectionMark?.text,alpha:v.container.alpha}))});},40);});
        }else{
          await tap('hero/action-shortcut');if(plan.hero==='erxiang'){const index=beforeDraft.state.handOrder.indexOf(first.erxiangTargetId)+1;await dom(p.getByRole('button',{name:new RegExp('^第'+index+'张 · ')}));}
          else if(plan.hero==='xiemu')await dom(p.getByRole('button',{name:'付10金 ×2',exact:true}));
          else await dom(p.getByRole('button',{name:/释放.*1\.5/}));
        }
        assert.deepEqual(await snap(p),beforeDraft);row.draft=await ui(p);await shot('chosen-before-save');
        if(plan.hero==='amo'){
          const played=play(first,'skill-payoff'),eyes=p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return !!s.heroClimax&&s.scoreTotal.getData('eventPhase')==='impact';},{},{timeout:18000}).then(async()=>{await p.waitForTimeout(90);await shot('exile-eyes');}).catch(error=>{row.eyeCaptureError=String(error);});
          await Promise.all([played,eyes]);row.samples=await p.evaluate(()=>{clearInterval(window.__exileTimer);return window.__exileSamples;});
        }else await play(first,'skill-payoff');
      }
      const afterSkill=await snap(p);assert.deepEqual(afterSkill.state,plan.skillAfter);row.actualSkill=afterSkill;const trace=afterSkill.state.lastTrace;
      if(plan.hero==='amo'){assert.equal(trace.amoExile.use,true);assert.equal(BigInt(trace.finalScore),BigInt(trace.amoExile.beforeScore)*4n);assert.equal(afterSkill.state.stage.amoExileUsed,true);assert.deepEqual(trace.amoExile.discardedIds,plan.skillBefore.handOrder.filter(id=>!first.selectedIds.includes(id)));assert.ok(row.samples.some(s=>s.reason==='amo.exile'&&s.phase==='impact'),'actual character payoff sampled');}
      if(plan.hero==='erxiang'){assert.equal(trace.erxiangHandoff.targetId,first.erxiangTargetId);assert.ok(trace.events.some(e=>e.reasonKey==='erxiang.handoff'&&e.targetCardId===first.erxiangTargetId));}
      if(plan.hero==='azao'){assert.equal(trace.azaoCharge.before.charge,1);assert.equal(trace.azaoCharge.release,true);assert.equal(trace.azaoCharge.multiplier,'1.5');}
      if(plan.hero==='xiemu'){assert.equal(trace.xiemuBurn.cost,10);assert.equal(trace.xiemuBurn.goldBefore,15);assert.equal(trace.xiemuBurn.goldAfter,5);}
      if(plan.hero==='touye'){assert.equal(trace.touyeWager.outcome,'won');assert.equal(trace.touyeWager.multiplier,'2');assert.ok(trace.touyeWager.core.activeNewIds.length);}
      if(plan.hero==='laohuan'){assert.equal(afterSkill.state.pendingRefill,null);assert.equal(afterSkill.state.handOrder.length,8);assert.equal(afterSkill.state.stage.discardsUsed,1);}
      await shot('actual-payoff');if(plan.nextStage.length)await advance();await play(plan.next,'next-real-hand');await shot('next-real-hand');row.end=await snap(p);assert.deepEqual(row.errors,[]);row.status='PASS';
    }catch(error){row.status='FAIL';row.error=String(error.stack??error);row.failureUI=await ui(p).catch(()=>undefined);await shot('FAIL').catch(()=>{});console.error(plan.hero,row.error);}
    finally{await p.close();await context.close();console.log(plan.hero,row.status);await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));}
  }
  report.status=report.cases.every(c=>c.status==='PASS')?'PASS':'FAIL';if(report.status==='FAIL')process.exitCode=1;
}finally{await browser.close();await server.httpServer.close();await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));console.log('six-new-run',report.status);}
