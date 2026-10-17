import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene,openRunMenu} from './ui.mjs';

const out=process.env.STRIKE_INTEGRATION_OUT??'shots/joker-score-strike-integration/browser';await mkdir(out,{recursive:true});
const viewport={width:Number(process.env.STRIKE_INTEGRATION_WIDTH??1366),height:Number(process.env.STRIKE_INTEGRATION_HEIGHT??768)},touch=viewport.width<700;
const ssr=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'error'});
const [{scoreSourceProcessFixture},{energySend},{makeCheckpoint,readCheckpoint},{jokerScoreStrikeCue},{savedHeroAttachment},{readableFractionText},{r2CreateJoker}]=await Promise.all(['/harness/fixtures/score-source-process.ts','/harness/fixtures/score-energy.ts','/src/application/checkpoint.ts','/src/game/JokerScoreStrike.ts','/src/game/HeroAttachmentFacts.ts','/src/game/scoreText.ts','/src/domain/r2Run.ts'].map(p=>ssr.ssrLoadModule(p)));
const f=scoreSourceProcessFixture('chain');f.state.jokers.push(r2CreateJoker('mantangcai','controlled/source-process/4',8,'polychrome',f.state));f.state.stage.initialJokerIds=f.state.jokers.map(j=>j.instanceId);
const action={type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds},expected=energySend(f.state,action),checkpoint=makeCheckpoint(f.state,[]),hero=savedHeroAttachment(expected.lastTrace,'amo'),cues=expected.lastTrace.events.map(e=>jokerScoreStrikeCue(expected.lastTrace,e)).filter(Boolean);
assert.ok(readCheckpoint(checkpoint).ok);assert.ok(hero);assert.ok(cues.length>0);await ssr.close();
const buildDir=resolve(out,'build');await build({mode:'e2e',build:{outDir:buildDir,emptyOutDir:true},logLevel:'error'});
const server=await preview({build:{outDir:buildDir},preview:{host:'127.0.0.1',port:5699,strictPort:true},logLevel:'error'}),browser=await chromium.launch({channel:'msedge'}),p=await browser.newPage({viewport,hasTouch:touch,reducedMotion:'no-preference'});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),viewport,touch,scope:'One controlled current-identity public import; native cards, hero shortcut and play. Actual saved assisted hand, source-factor impact and hero release instrumentation forwards original calls unchanged. No natural play, full hero matrix, human hearing/aesthetics or physical-device claim.',errors:[],sourceFiles:{}};
for(const file of ['src/game/GameScene.ts','src/game/JokerScoreStrike.ts','src/game/HeroTargetAttachment.ts'])report.sourceFiles[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const saved=()=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
p.setDefaultTimeout(45000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>report.errors.push(e.stack));
try{
 await p.goto('http://127.0.0.1:5699/?harness=1');await waitScene(p,'title');await openRunMenu(p);const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();
 const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'strike-and-assist.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
 await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
 if(await p.locator('.detail-dialog[open]').count())await p.keyboard.press('Escape');report.before=await saved();
 for(const id of f.selectedIds)await tapUI(p,'game','card/'+id,touch);await tapUI(p,'game','hero/action-shortcut',touch);
 if(await p.locator('.amo-assist-dialog[open]').count())await p.locator('.amo-assist-option').filter({has:p.locator('button')}).first().locator('button').click();
 report.pending=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {assistIds:s.assistIds,attachment:s.targetAttachment.state.value};});
 assert.deepEqual(report.pending.assistIds,f.assistIds);assert.deepEqual(report.pending.attachment.targetIds,f.assistIds);assert.equal(report.pending.attachment.kind,'assist');assert.deepEqual(await saved(),report.before);await p.screenshot({path:out+'/pending-assist.png'});
 await p.evaluate(()=>{
  const s=window.__harness.game.scene.getScene('game'),sample=window.__strikeIntegration={impacts:[],heroReleases:[]},impact=s.impactAccumulator,release=s.targetAttachment.release;
  s.impactAccumulator=function(...args){const result=impact.apply(this,args),[e,,,,,handled]=args;if(handled){const strikes=this.view.root.list.filter(o=>o.name==='score/strike'&&o.getData('eventId')===e.eventId);sample.impacts.push({eventId:e.eventId,source:e.sourceInstanceId,H:this.scoreHeat.text,M:this.scoreMult.text,phase:strikes[0]?.getData('phase'),oldTextures:this.textures.getTextureKeys().filter(k=>k.startsWith('score-strike-old-')).length});}return result;};
  s.targetAttachment.release=function(...args){const before=this.state.value?.phase,result=release.apply(this,args),after=this.state.value;if(before==='committed'&&after?.phase==='release'&&after.eventId===args[0].eventId)sample.heroReleases.push({eventId:args[0].eventId,state:JSON.parse(JSON.stringify(after))});return result;};
 });
 await tapUI(p,'game','action/play',touch);const reminder=p.getByRole('button',{name:'继续出牌',exact:true});if(await reminder.count())await reminder.click();
 await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return !s.scene.isActive()||s.ready&&!s.playing&&!s.presentation;});report.after=await saved();
 assert.deepEqual(report.after.state,expected);assert.equal(report.after.journal.length,report.before.journal.length+1);assert.deepEqual(report.after.journal.at(-1).action,action);assert.deepEqual(report.after.storage.current,makeCheckpoint(report.after.state,report.after.journal));
 report.observed=await p.evaluate(()=>window.__strikeIntegration);
 for(const cue of cues){const hits=report.observed.impacts.filter(hit=>hit.eventId===cue.eventId);assert.equal(hits.length,1,'one actual impact per joker event');const hit=hits[0];assert.equal(hit.source,cue.sourceInstanceId);assert.equal(hit.phase,'impact');assert.ok(hit.oldTextures>0,'actual old-glyph texture exists at impact');for(const c of cue.contributions)assert.equal(hit[c.target],readableFractionText(c.after),'correct exact after readout '+c.target);}
 const releases=report.observed.heroReleases.filter(r=>r.eventId===hero.event.eventId);assert.equal(releases.length,1);assert.deepEqual(releases[0].state.targetIds,f.assistIds);assert.equal(releases[0].state.phase,'release');
 report.cleanup=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {oldTextures:s.textures.getTextureKeys().filter(k=>k.startsWith('score-strike-old-')).length,activeStrikes:s.children.list.flatMap(o=>o.list??[o]).filter(o=>o.name==='score/strike').length};});assert.equal(report.cleanup.oldTextures,0);assert.equal(report.cleanup.activeStrikes,0);assert.deepEqual(report.errors,[]);await p.screenshot({path:out+'/saved-result.png'});report.status='PASS';console.log('PASS mixed assist/strike',cues.length,'real joker impacts, saved hero release, exact state/journal/storage');
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await p.screenshot({path:out+'/FAIL.png'});console.log(report.error);}finally{await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));await writeFile(out+'/summary.json',JSON.stringify({...report,before:undefined,after:undefined},null,2));await p.close();await browser.close();await server.close();}
