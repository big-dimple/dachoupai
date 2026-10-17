import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from '../../../../harness/ui.mjs';

const out='docs/production/evidence/touye-locked-skill-state-2026-10-17',dist='.vite/touye-phase-build';
const ssr=await createServer({mode:'e2e',server:{middlewareMode:true},logLevel:'error'});
let f,checkpoint,expectedBet,expectedPlay;
try{
 const {touyeFixture,touyeSend,touyeBet}=await ssr.ssrLoadModule('/tests/fixtures/touye-new-core.ts');
 const {newRunIdentity}=await ssr.ssrLoadModule('/src/game/RunLaunch.ts');
 const {makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 f=touyeFixture('four-straight',{identity:newRunIdentity('touye','group')});checkpoint=makeCheckpoint(f.state,[]);assert.equal(readCheckpoint(checkpoint).ok,true);
 expectedBet=touyeSend(f.state,touyeBet(f.state,f.discard,f.target));expectedPlay=touyeSend(expectedBet,{type:'PlayHand',selectedIds:expectedBet.handOrder.filter(id=>f.play.includes(id))});
}finally{await ssr.close();}
const sources=['src/game/GameScene.ts','src/game/HeroAbilityCue.ts','src/game/HeroSkillPresentation.ts','src/game/TouyeWagerCopy.ts'];
const report={scope:'One validated controlled current-identity hand per viewport; native import/discard draft/bet/play/cold continue. Real domain results, read-only frame observations. No natural acquisition, long game, physical device or aesthetic acceptance.',sourceHashes:Object.fromEntries(await Promise.all(sources.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),cases:[]};
if(process.argv.includes('--reuse-build'))assert.deepEqual(JSON.parse(await readFile(out+'/scene-check-first-fail.json','utf8')).sourceHashes,report.sourceHashes,'reuse only the identical checked production source');
else await build({mode:'e2e',build:{outDir:dist},logLevel:'error'});
const server=await preview({build:{outDir:dist},preview:{host:'127.0.0.1',port:5627,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});report.browser=browser.version();
const state=p=>p.evaluate(()=>structuredClone(window.__harness.game.registry.get('runController').state));
try{
 for(const viewport of [{width:1912,height:954},{width:390,height:844}]){
  const touch=viewport.width<900,context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'no-preference'}),p=await context.newPage();p.setDefaultTimeout(30000);
  const row={viewport,errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
  const click=l=>touch?l.tap():l.click(),tap=name=>tapUI(p,'game',name,touch);
  const settle=()=>p.waitForFunction(()=>{const s=window.__harness?.game.scene.getScene('game');return s?.ready&&!s.presentation&&!s.playing&&s.cardViews.every(v=>!v.dealing);});
  await p.goto('http://127.0.0.1:5627/?harness=1');await waitScene(p,'title');
  await click(p.locator('.run-menu-toggle'));const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await click(section.locator('summary'));
  const chooser=p.waitForEvent('filechooser');await click(p.getByRole('button',{name:'导入本局',exact:true}));await(await chooser).setFiles({name:'controlled-touye-phase.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'game');await settle();assert.deepEqual(await state(p),f.state);
  await p.evaluate(()=>{window.__phaseFrames=[];const s=window.__harness.game.scene.getScene('game');s.events.on('postupdate',()=>{const b=s.heroActionButton;if(!b)return;const frame={phase:s.touyeSkillPhase??null,state:b.getData('abilityState'),status:b.getData('skillStatus')?.text,enabled:!!b.input?.enabled,opportunity:!!s.roleFrame.getData('abilityOpportunity'),available:!!s.roleFrame.getData('abilityAvailable')};if(JSON.stringify(window.__phaseFrames.at(-1))!==JSON.stringify(frame))window.__phaseFrames.push(frame);});});
  await tap('hero/action-shortcut');await p.locator('.touye-discard-choice[open]').waitFor();
  for(const id of f.discard)await click(p.locator('.touye-discard-grid button[data-card-id="'+id+'"]'));
  await click(p.locator('.touye-discard-next'));await click(p.getByRole('button',{name:'押顺子',exact:true}));assert.deepEqual(await state(p),f.state);
  await click(p.getByRole('button',{name:'确认押顺子并弃1张',exact:true}));await settle();assert.deepEqual(await state(p),expectedBet);
  const cue=()=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),b=s.heroActionButton;return{phase:s.touyeSkillPhase??null,state:b.getData('abilityState'),status:b.getData('skillStatus').text,color:b.getData('skillStatus').style.color,enabled:!!b.input?.enabled,opportunity:!!s.roleFrame.getData('abilityOpportunity'),available:!!s.roleFrame.getData('abilityAvailable'),summary:s.statusText.text};});
  row.locked=await cue();assert.equal(row.locked.status,'已押顺子');assert.equal(row.locked.state,'locked');assert.equal(row.locked.enabled,false);assert.equal(row.locked.opportunity,false);assert.match(row.locked.summary,/出牌后结算/);
  for(const id of f.play)await tap('card/'+id);await settle();row.selected=await cue();assert.equal(row.selected.status,'已押顺子');assert.deepEqual(await state(p),expectedBet);
  row.drawingFrames=await p.evaluate(()=>window.__phaseFrames);assert.ok(row.drawingFrames.some(x=>x.phase==='drawing'&&x.status==='换牌中'&&!x.enabled&&!x.opportunity&&!x.available));
  row.screenshot=viewport.width+'-selected-locked.png';await p.screenshot({path:out+'/'+row.screenshot,scale:'css'});
  await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'game');await settle();assert.deepEqual(await state(p),expectedBet);row.restored=await cue();assert.equal(row.restored.phase,null);assert.equal(row.restored.status,'已押顺子');
  // New browser load has a fresh read-only scene observer.
  await p.evaluate(()=>{window.__settlingFrames=[];const s=window.__harness.game.scene.getScene('game');s.events.on('postupdate',()=>{const b=s.heroActionButton;if(!b)return;const frame={phase:s.touyeSkillPhase??null,state:b.getData('abilityState'),status:b.getData('skillStatus')?.text,enabled:!!b.input?.enabled,opportunity:!!s.roleFrame.getData('abilityOpportunity')};if(JSON.stringify(window.__settlingFrames.at(-1))!==JSON.stringify(frame))window.__settlingFrames.push(frame);});});
  for(const id of f.play)await tap('card/'+id);await tap('action/play');await p.waitForFunction(()=>window.__harness.game.registry.get('runController').state.lastTrace?.touyeWager);await p.waitForFunction(()=>!window.__harness.game.scene.getScene('game').touyeSkillPhase&&window.__harness.game.scene.getScene('game').heroActionButton.getData('abilityState')==='used');assert.deepEqual(await state(p),expectedPlay);
  row.settlingFrames=await p.evaluate(()=>window.__settlingFrames);assert.ok(row.settlingFrames.some(x=>x.phase==='settling'&&x.status==='结算中'&&!x.enabled&&!x.opportunity));assert.deepEqual(row.errors,[]);row.status='PASS';await context.close();
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally{await browser.close();await server.close();await writeFile(out+'/scene-check.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases.map(x=>({viewport:x.viewport,status:x.status})),error:report.error}));}
