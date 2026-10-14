/** Bounded native integration checks; fixtures disclose public hand/cash, never natural runs. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';

const out=process.env.HERO_DRAG_OUTPUT??'shots/hero-drag-integration';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5577,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {touyeChoice}=await server.ssrLoadModule('/src/game/TouyeWagerCopy.ts');
const main=['spades-9','hearts-9','clubs-13','diamonds-13'],side=['spades-12','hearts-12','clubs-12'],hand=[...main,...side,'clubs-6'];
const heroes={amo:'hero/details',erxiang:'hero/erxiang-handoff',laohuan:'hero/laohuan-trick',azao:'hero/azao-charge',xiemu:'hero/xiemu-burn',touye:'hero/touye-wager'};
const command=(s,action)=>({runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
const send=(s,a)=>{const r=applyCommand(s,command(s,a));assert.ok(r.ok,r.code);return r.state;};
function arrange(s,ids){const available=s.deckInstances.map(c=>c.id).filter(id=>!s.playedPile.includes(id)&&!s.discardPile.includes(id)&&!s.destroyedIds.includes(id));assert.ok(ids.every(id=>available.includes(id)));s.handOrder=[...ids];s.drawPile=available.filter(id=>!ids.includes(id));return s;}
function fixture(hero){
 // Reuse the existing amo-assist-native disclosed stage/cash fixture, with original target.
 let s=createRun({seed:'amo-diagnosis-controlled',runId:'controlled/integration/'+hero,rulesVersion:'r2',characterId:hero,r2Identity:newRunIdentity(hero,'group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 s=send(s,{type:'LeaveShop'});s.stageIndex=6;s.chapter=3;s.shop=null;s.seenBossIds=['B01','B02','B04'];s.boss={definitionId:'B04',disabledSuit:null};s=send(s,{type:'EnterStage'});s.gold=15;
 if(hero==='azao'){const first=['spades-3','hearts-3','clubs-4','diamonds-4'];s=arrange(s,[...first,...side,'clubs-6']);s=send(s,{type:'PlayHand',selectedIds:first});assert.equal(s.phase,'await-input');assert.equal(s.stage.azaoCharge.charge,1);}
 s=arrange(s,hand);assert.ok(readCheckpoint(makeCheckpoint(s,[])).ok);return s;
}
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const report={head:git(['rev-parse','HEAD']),srcTree:git(['rev-parse','HEAD:src']),harnessTree:git(['rev-parse','HEAD:harness']),modified:git(['status','--short','--','src','tests','harness']),scope:'Six current-identity heroes, PC1366/390 software Chromium native mouse/touch/DOM operations. Public controlled mid-stage hand and 15 gold, original target. Skill drafts/read-only entry, delayed real store commit, exact domain-command oracle, presentation and readonly locks. Not natural games, 18 runs, human understanding, physical vibration or full experience acceptance.',cases:[],errors:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});report.browser=browser.version();
const snap=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:await gameSession().storage.read(),localStorage:JSON.stringify(localStorage)};});
const draft=p=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return{selected:[...s.selectedIds],assist:[...s.assistIds],erxiang:s.erxiangTargetId,xiemu:s.xiemuBurn,azao:s.azaoRelease};});
const settled=p=>p.waitForFunction(()=>{const g=window.__harness.game;if(g.scene.isActive('intermission'))return g.scene.getScene('intermission').ready;const s=g.scene.getScene('game');return s.scene.isActive()&&s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
async function imp(p,s){if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await p.locator('.run-menu-toggle').click();await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const event=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await event).setFiles({name:'integration-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});await waitScene(p,'game');await settled(p);assert.deepEqual((await snap(p)).state,s);await p.evaluate(()=>{const c=window.__harness.game.registry.get('runController'),dispatch=c.dispatch;window.__integrationDispatch=[];c.dispatch=function(...args){window.__integrationDispatch.push(structuredClone(args));return dispatch.apply(this,args);};});}
async function delayCommit(p){await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),store=gameSession().storage,commit=store.commit;window.__integrationCommitCalls=0;window.__integrationRestore=()=>store.commit=commit;store.commit=async(...args)=>{window.__integrationCommitCalls++;await new Promise(resolve=>window.__integrationRelease=resolve);return commit.apply(store,args);};});}
async function release(p){await p.evaluate(()=>{window.__integrationRestore();window.__integrationRelease();});}
async function checkCommand(p,before,action){const after=await snap(p),expectedCommand=command(before.state,action),expected=applyCommand(before.state,expectedCommand);assert.ok(expected.ok,expected.code);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.journal,[...before.journal,expectedCommand]);assert.deepEqual(after.storage.current,makeCheckpoint(after.state,after.journal));assert.equal(after.storage.revision,before.storage.revision+1);assert.equal(after.localStorage,before.localStorage);return{action,command:expectedCommand,before,after,status:'PASS'};}
try{
 for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
  const touch=viewport.width===390,ctx=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await ctx.newPage();p.setDefaultTimeout(30000);p.on('pageerror',e=>report.errors.push(String(e)));p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:5577/?harness=1');await waitScene(p,'title');
  const tap=name=>tapUI(p,'game',name,touch),dom=locator=>touch?locator.tap():locator.click(),shot=async name=>{const file=viewport.width+'-'+name+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});return file;};
  const close=()=>dom(p.locator('dialog[open] .dialog-close'));
  const operation=async hero=>{await tap(heroes[hero]);await p.locator('dialog.hero-explanation[open]').waitFor();await dom(p.getByRole('button',{name:'查看本场技能操作',exact:true}));assert.equal(await p.locator('dialog.hero-explanation[open]').count(),0);};
  for(const hero of Object.keys(heroes)){
   const s=fixture(hero);await imp(p,s);const row={hero,viewport,before:await snap(p),transactions:[],locks:[]};report.cases.push(row);
   row.hapticCapability=await p.evaluate(()=>({vibrateAPI:typeof navigator.vibrate,isSecureContext,pointerCoarse:matchMedia('(pointer:coarse)').matches,physicalVibration:'NOT_TESTED',explicitVibrationRequested:false}));
   const ids=hero==='laohuan'||hero==='touye'?['clubs-6']:main;for(const id of ids)await tap('card/'+id);const selectedDraft=await draft(p);
   await operation(hero);row.originalOperationText=await p.locator('dialog[open]').innerText();row.operationShot=await shot(hero+'-operation');assert.deepEqual(await draft(p),selectedDraft);assert.deepEqual(await snap(p),row.before);
   let action;
   if(hero==='amo'){await dom(p.locator('.amo-assist-option[data-ids="'+side.join('|')+'"]').locator('button'));action={type:'PlayAssistedHand',selectedIds:main,assistIds:side};}
   else if(hero==='erxiang'){await dom(p.locator('.dialog-choice-actions button:not([disabled])').first());const d=await draft(p);assert.ok(main.includes(d.erxiang));action={type:'PlayHand',selectedIds:main,erxiangTargetId:d.erxiang};}
   else if(hero==='xiemu'){await dom(p.getByRole('button',{name:'燃10金 ×2',exact:true}));action={type:'PlayHand',selectedIds:main,xiemuBurn:10};}
   else if(hero==='azao'){await dom(p.getByRole('button',{name:/^本手释放 ×/}));action={type:'PlayHand',selectedIds:main,azaoRelease:true};}
   else if(hero==='touye'){
    const copy=touyeChoice(s,ids),choice=copy.choices.find(c=>c.available);assert.ok(choice);await dom(p.getByRole('button',{name:'押'+choice.label,exact:true}));await dom(p.getByRole('button',{name:'取消 · 不弃牌',exact:true}));assert.deepEqual(await snap(p),row.before);assert.deepEqual(await draft(p),selectedDraft);row.wagerCancel='PASS';await operation(hero);await dom(p.getByRole('button',{name:'押'+choice.label,exact:true}));action={type:'DiscardHand',selectedIds:ids,touyeBet:{target:choice.target,snapshotToken:copy.snapshotToken}};
   }else action={type:'DiscardHand',selectedIds:ids,laohuanTrick:true};
   if(!['touye','laohuan'].includes(hero)){
    const chosen=await draft(p);assert.deepEqual(await snap(p),row.before);row.chosenDraft=chosen;
    // First layer close/reopen/Escape and the transition into old operations retain chosen skill drafts.
    for(const mode of ['close','Escape']){await tap(heroes[hero]);await p.locator('dialog.hero-explanation[open]').waitFor();row.chosenFirstLayerText=await p.locator('dialog.hero-explanation[open]').innerText();row.chosenFirstLayerShot=await shot(hero+'-chosen-first');if(mode==='close')await close();else await p.keyboard.press('Escape');assert.deepEqual(await draft(p),chosen);assert.deepEqual(await snap(p),row.before);assert.equal(await p.evaluate(()=>document.activeElement===window.__harness.game.canvas),true);}
    await operation(hero);await close();assert.deepEqual(await draft(p),chosen);assert.deepEqual(await snap(p),row.before);
   }
   await delayCommit(p);
   if(hero==='touye')await dom(p.getByRole('button',{name:/^确认押.*并弃1张$/}));else if(hero==='laohuan')await dom(p.getByRole('button',{name:/^戏法弃1张 · 留应补数$/}));else await tap('action/play');
   await p.waitForFunction(()=>window.__integrationCommitCalls===1);assert.deepEqual(await snap(p),row.before);
   await tap(heroes[hero]);const d=p.locator('dialog.hero-explanation[open]');await d.waitFor();const blocked=p.getByRole('button',{name:'查看本场技能操作',exact:true});assert.ok(await blocked.isDisabled());assert.match(await d.innerText(),/正在换牌|未保存|正在结算/);row.locks.push({name:'delayed-commit',before:row.before,after:await snap(p),draft:await draft(p),text:await d.innerText(),shot:await shot(hero+'-saving-blocked'),status:'PASS'});await close();assert.equal(await p.evaluate(()=>window.__integrationDispatch.length),1);await release(p);
   if(hero==='erxiang'){
    await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').isPresenting);await tap(heroes[hero]);await p.locator('dialog.hero-explanation[open]').waitFor();assert.ok(await p.getByRole('button',{name:'查看本场技能操作',exact:true}).isDisabled());assert.match(await p.locator('dialog.hero-explanation[open]').innerText(),/正在结算/);const before=await snap(p);row.locks.push({name:'real-score-presentation',before,text:await p.locator('dialog.hero-explanation[open]').innerText(),shot:await shot(hero+'-presentation-blocked'),status:'PASS'});await close();assert.deepEqual(await snap(p),before);assert.equal(await p.evaluate(()=>window.__integrationDispatch.length),1);
   }
   await settled(p);row.transactions.push(await checkCommand(p,row.before,action));assert.equal(await p.evaluate(()=>window.__integrationCommitCalls),1);
   if(hero==='laohuan'){
    const before=await snap(p),pending=before.state.pendingRefill;assert.ok(pending);const kept=pending.candidateIds.slice(0,pending.required);for(const id of kept)await tap('card/'+id);const chosen=await draft(p);await tap(heroes[hero]);await p.locator('dialog.hero-explanation[open]').waitFor();assert.match(await p.locator('dialog.hero-explanation[open]').innerText(),/候选中留够应补数/);await close();assert.deepEqual(await draft(p),chosen);assert.deepEqual(await snap(p),before);await tap('action/play');await settled(p);row.transactions.push(await checkCommand(p,before,{type:'ChooseRefill',selectedIds:kept}));
   }
   row.after=await snap(p);row.status='PASS';console.log(viewport.width,hero,'PASS');
  }
  // Real controller readonly status: first layer remains inspectable, operation is disabled.
  await imp(p,fixture('xiemu'));await p.evaluate(()=>window.__harness.game.registry.get('runController').setReadOnly());if(await p.locator('.run-menu-modal').evaluate(e=>e.open))await p.locator('.run-menu-toggle').click();const before=await snap(p);await tap(heroes.xiemu);await p.locator('dialog.hero-explanation[open]').waitFor();assert.ok(await p.getByRole('button',{name:'查看本场技能操作',exact:true}).isDisabled());assert.match(await p.locator('dialog.hero-explanation[open]').innerText(),/未保存或只读/);report.cases.push({viewport,hero:'xiemu',lock:'readonly',before,text:await p.locator('dialog.hero-explanation[open]').innerText(),shot:await shot('readonly-blocked'),after:await snap(p),status:'PASS'});await close();assert.deepEqual(await snap(p),before);assert.equal(await p.evaluate(()=>window.__integrationDispatch.length),0);
  await ctx.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack??String(e);process.exitCode=1;console.error(e);}
finally{await writeFile(out+'/full-state-journal-storage-localStorage.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report),hash=s=>({sha256:createHash('sha256').update(JSON.stringify(s)).digest('hex')});for(const row of brief.cases){for(const key of ['before','after'])if(row[key])row[key]=hash(row[key]);for(const t of [...(row.transactions??[]),...(row.locks??[])])for(const key of ['before','after'])if(t[key])t[key]=hash(t[key]);}await writeFile(out+'/report.json',JSON.stringify(brief,null,2)+'\n');await browser.close();await server.close();console.log(report.status,out);}
