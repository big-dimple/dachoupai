import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {waitScene,tapUI} from './ui.mjs';

const out=process.env.TOUYE_COPY_VIEWS_OUTPUT??'/tmp/touye-player-copy-views';await mkdir(out,{recursive:true});
const oldEvidence=JSON.parse(await readFile('docs/production/evidence/touye-new-core-2026-10-12/native-final/report.json','utf8'));
const activeEvidence=JSON.parse(await readFile('docs/production/evidence/p1a-active-mult-timing-2026-10-12/native/report.json','utf8'));
const server=await createServer({cacheDir:'/tmp/touye-copy-views-vite',mode:'e2e',server:{host:'127.0.0.1',port:5643,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const baselineRoot=process.env.TOUYE_COPY_BASELINE_ROOT??'/tmp/dachoupai-touye-copy-timing-main';
const baseline=await createServer({root:baselineRoot,configFile:false,cacheDir:'/tmp/touye-copy-base-ssr',logLevel:'error'});
const load=async s=>({character:await s.ssrLoadModule('/src/game/CharacterRunCopy.ts'),choice:await s.ssrLoadModule('/src/game/TouyeWagerCopy.ts'),guide:await s.ssrLoadModule('/src/game/HeroSkillGuide.ts')});
const current=await load(server),previous=await load(baseline);
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={scope:'read-only views of exact saved PR130 and PR134 native states, old C2/new-core/active-timing identities; no new wagers or hands',baselineRoot,mainBase:'f326a9b3a7a9be937c7c3cd4d286721f674a9409',rows:[],identityCopyDiff:[],otherHeroesCopyExact:[],status:'RUNNING'};
const inspect=(modules,s,ids)=>{const choice=modules.choice.touyeChoice(s,ids),guide=modules.guide.heroSkillGuide(s,undefined,ids);return {character:modules.character.characterForRun(s),choice,guide,steps:modules.guide.heroOperationSteps(s,guide)};};
const human=s=>assert.doesNotMatch(s,/ID|事务|核心/);
try {
 for(const id of ['amo','erxiang','laohuan','azao','xiemu']){assert.deepEqual(current.character.characterForNewRun(id),previous.character.characterForNewRun(id));report.otherHeroesCopyExact.push(id);}
 for(const viewport of [{width:1366,height:768},{width:390,height:844}]) {
  const touch=viewport.width===390,context=await browser.newContext({viewport,hasTouch:touch,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('dialog',d=>d.accept());
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const dom=l=>touch?l.tap():l.click(),tap=name=>tapUI(page,'game',name,touch);
  const menu=async()=>{if(!await page.locator('.run-menu-modal').evaluate(e=>e.open))await dom(page.locator('.run-menu-toggle'));};
  const close=async()=>{await dom(page.locator('.detail-dialog[open] .dialog-close'));await page.waitForFunction(()=>!document.querySelector('.detail-dialog[open]'));};
  const settle=()=>page.waitForFunction(()=>{const s=window.__harness?.game.scene.getScene('game');return s?.ready&&!s.presentation&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
  const snap=()=>page.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});
  const shot=async name=>{const file=viewport.width+'-'+name+'.png';await page.screenshot({path:out+'/'+file,scale:'css'});return file;};
  const source=oldEvidence.rows.find(r=>r.viewport.width===viewport.width&&r.kind==='mature-win'),loss=oldEvidence.rows.find(r=>r.viewport.width===viewport.width&&r.kind==='mature-old-core'),legacy=oldEvidence.rows.find(r=>r.viewport.width===viewport.width&&r.kind==='legacy-mature');
  const active=activeEvidence.rows.find(r=>r.viewport.width===viewport.width&&r.kind==='touye-won'),activeLoss=activeEvidence.rows.find(r=>r.viewport.width===viewport.width&&r.kind==='touye-lost');
  const ids=source.afterBet.journal[0].action.selectedIds;
  await page.goto('http://127.0.0.1:5643/?harness=1');await waitScene(page,'title');
  for(const [kind,input] of [['ready',source.before],['pending',source.afterBet],['won',source.afterPlay],['lost',loss.afterPlay],['legacy',legacy.before],['active-ready',active.before],['active-pending',active.pending],['active-won',active.after],['active-lost',activeLoss.after]]) {
   const displayKind=kind.replace(/^active-/,''),selected=kind.startsWith('active-')?active.pending.journal[0].action.selectedIds:ids;
   const s=input.state,cp=makeCheckpoint(s,input.journal);assert.equal(readCheckpoint(cp).ok,true);
   const oldCopy=inspect(previous,s,displayKind==='ready'||displayKind==='legacy'?selected:[]),newCopy=inspect(current,s,displayKind==='ready'||displayKind==='legacy'?selected:[]);
   if(kind==='legacy')assert.deepEqual(newCopy,oldCopy);else {human(newCopy.character.openingPlay+newCopy.character.buildTip+newCopy.character.passiveDescription);human(newCopy.choice.risk+newCopy.choice.status+newCopy.choice.details+newCopy.guide.effect+newCopy.guide.risk);for(const field of ['newCore','common','enabled','pending','used','choices','compact','snapshotToken'])assert.deepEqual(newCopy.choice[field],oldCopy.choice[field]);}
   report.identityCopyDiff.push({viewport:viewport.width,kind,identity:{contentVersion:s.contentVersion,contentHash:s.contentHash},before:oldCopy,after:newCopy,nonDisplayChoiceFieldsExact:true,legacyAllCopyExact:kind==='legacy'});
   if(await page.locator('.run-menu-modal').evaluate(e=>e.open))await dom(page.locator('.run-menu-toggle'));await menu();const saves=page.getByText('进度与存档',{exact:true}).locator('..');if(!await saves.evaluate(e=>e.open))await dom(saves.locator('summary'));
   const targetScene=s.phase==='stage-cleared'?'intermission':'game';
   const fileChooser=page.waitForEvent('filechooser');await dom(page.getByRole('button',{name:'导入本局',exact:true}));await(await fileChooser).setFiles({name:'saved-copy-view.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(page,targetScene);if(targetScene==='game')await settle();else await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('intermission'),walk=list=>list.some(o=>o.name==='result/next-body'||o.list&&walk(o.list));return s.ready&&walk(s.children.list);});const before=await snap();assert.deepEqual(before.state,s);assert.deepEqual(before.journal,input.journal);
   const row={viewport,kind,targetScene,before,images:[]};report.rows.push(row);
   if(displayKind==='ready'||kind==='legacy') {
    for(const id of selected)await tap('card/'+id);await tap('hero/action-shortcut');row.choiceText=await page.locator('.detail-dialog[open]').innerText();row.images.push(await shot(kind+'-steps'));
    if(kind==='legacy'){assert.equal(await page.getByRole('button',{name:'押两对',exact:true}).isEnabled(),false);await close();}
    else {human(row.choiceText);await dom(page.getByRole('button',{name:'押两对',exact:true}));row.confirmText=await page.locator('.detail-dialog[open]').innerText();human(row.confirmText);row.images.push(await shot(kind+'-confirmation'));await dom(page.getByText('目标与弃牌明细',{exact:true}));row.expandedConfirmText=await page.locator('.detail-dialog[open]').innerText();human(row.expandedConfirmText);row.images.push(await shot(kind+'-confirmation-details'));await dom(page.getByRole('button',{name:'取消 · 不弃牌',exact:true}));}
   } else if(displayKind==='pending') {await tap('hero/touye-wager');row.details=await page.locator('.detail-dialog[open]').innerText();human(row.details);row.images.push(await shot(kind+'-details'));await dom(page.getByText('赌约细则',{exact:true}));row.expandedDetails=await page.locator('.detail-dialog[open]').innerText();human(row.expandedDetails);row.images.push(await shot(kind+'-full-details'));await close();}
   else {row.shortResult=newCopy.choice.status;human(row.shortResult);row.label=await page.evaluate(key=>{const s=window.__harness.game.scene.getScene(key),walk=list=>{for(const o of list){if(o.name==='result/next-body')return o;if(o.list){const found=walk(o.list);if(found)return found;}}},label=key==='game'?s.statusText:walk(s.children.list),b=label.getBounds();return {text:label.text,bounds:{x:b.x,y:b.y,width:b.width,height:b.height},width:s.scale.width,height:s.scale.height};},targetScene);human(row.label.text);const b=row.label.bounds;assert.ok(b.x>=0&&b.x+b.width<=row.label.width&&b.y+b.height<=row.label.height,JSON.stringify(row.label));row.images.push(await shot(kind+'-result'));}
   row.after=await snap();assert.deepEqual(row.after,before);row.stateJournalStorageUnchanged=true;row.status='PASS';
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 report.status='PASS';
} catch(error) {report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally {await browser.close();await server.close();await baseline.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:report.rows.length,error:report.error}));}
