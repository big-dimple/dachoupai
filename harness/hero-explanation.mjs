import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,point,waitScene,openSelector} from './ui.mjs';
const out=process.env.HERO_EXPLANATION_OUT??'shots/hero-explanation';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5571,strictPort:true},logLevel:'error'});await server.listen();
const {heroStageFixture,heroSend}=await server.ssrLoadModule('/harness/fixtures/hero-stage-continuity.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {CHARACTER_IDS}=await server.ssrLoadModule('/src/domain/characters.ts');
const {heroExplanationCopy}=await server.ssrLoadModule('/src/game/HeroExplanation.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceTree:execFileSync('git',['diff','--stat'],{encoding:'utf8'}).trim(),browser:browser.version(),scope:'PC1366/390 software Chromium actual pointer/touch operations. Six heroes; controlled valid public-hand/cash saves, not natural acquisition or complete games. Integrated table first layer, existing skill operations and decoration wiring. No human/device/audio/full experience acceptance.',rows:[],errors:[]};
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return c?{state:c.state,journal:c.journal,storage:await c.store.read(),localStorage:JSON.stringify(localStorage)}:null;});
const draft=p=>p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {selected:[...s.selectedIds],assist:[...s.assistIds],erxiang:s.erxiangTargetId,xiemu:s.xiemuBurn,azao:s.azaoRelease};});
const local=p=>p.evaluate(()=>JSON.stringify(localStorage));
async function imp(p,s,key){const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok);await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const event=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await event).setFiles({name:'hero-explanation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(p,key);await p.waitForFunction(k=>window.__harness.game.scene.getScene(k).ready,key);}
const shot=(p,name)=>p.screenshot({path:out+'/'+name+'.png',scale:'css'});
async function inspect(p,key,target,id,width,label,expected){
 const before=await saved(p),storage=await local(p);await tapUI(p,key,target,width===390);const d=p.locator('dialog.hero-explanation[open]');await d.waitFor();assert.equal(await d.getAttribute('data-hero'),id);assert.match(await d.locator('h2').innerText(),new RegExp(expected.hero.passiveName));assert.match(await d.innerText(),/何时能用/);assert.ok((await d.innerText()).includes(expected.now));assert.equal(await d.locator('.example-cards').count(),0);assert.equal(await d.locator('details').evaluateAll(es=>es.every(e=>!e.open)),true);await shot(p,width+'-'+id+'-'+label+'-first');
 const row={id,width,scene:key,target,before,firstText:await d.innerText(),beforeSHA256:createHash('sha256').update(JSON.stringify(before)).digest('hex')};report.rows.push(row);
 // Repeated original coordinate taps while modal is open must be contained by the modal.
 const origin=await point(p,key,target);if(width===390)await p.touchscreen.tap(origin.x,origin.y);else await p.mouse.click(origin.x,origin.y);assert.equal(await p.locator('dialog.hero-explanation[open]').count(),1);
 const close=d.locator('.dialog-close'),bounds=await close.boundingBox();assert.ok(bounds&&bounds.height>=44&&bounds.y>=0&&bounds.y+bounds.height<=p.viewportSize().height+1);row.closeBounds=bounds;

 const summary=d.locator('.hero-example > summary');if(await summary.count()){await summary.click();await d.locator('.example-cards').first().waitFor({state:'attached'});assert.equal(await d.locator('.hero-example li').count(),3);await shot(p,width+'-'+id+'-'+label+'-example');await summary.click();}
 await close.click();assert.equal(await p.locator('dialog.hero-explanation[open]').count(),0);assert.equal(await p.evaluate(()=>document.activeElement===window.__harness.game.canvas),true);assert.deepEqual(await saved(p),before);assert.equal(await local(p),storage);
 await tapUI(p,key,target,width===390);await p.locator('dialog.hero-explanation[open]').waitFor();await p.keyboard.press('Escape');assert.equal(await p.locator('dialog.hero-explanation[open]').count(),0);assert.equal(await p.evaluate(()=>document.activeElement===window.__harness.game.canvas),true);assert.deepEqual(await saved(p),before);assert.equal(await local(p),storage);row.after=await saved(p);row.afterSHA256=createHash('sha256').update(JSON.stringify(await saved(p))).digest('hex');row.openCloseRepeatEscapeFocusState='PASS';
}
async function nested(p,id,width,scene){
 const entry=p.getByRole('button',{name:'查看'+heroExplanationCopy(id).hero.name+'技能说明',exact:true});await entry.waitFor();
 const row={id,width,scene,before:await saved(p),observations:[]};report.rows.push(row);
 for(const mode of ['close','Escape']){
  await entry.click();const d=p.locator('dialog.hero-explanation[open]');await d.waitFor();assert.equal(await d.getAttribute('data-hero'),id);assert.equal(await p.locator('dialog[open]').count(),2);assert.equal(await d.locator('.example-cards').count(),0);assert.equal(await d.locator('details').evaluateAll(es=>es.every(e=>!e.open)),true);await shot(p,width+'-'+id+'-'+scene+'-'+mode);
  const r=await entry.boundingBox();if(width===390)await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);else await p.mouse.click(r.x+r.width/2,r.y+r.height/2);assert.equal(await p.locator('dialog[open]').count(),2);
  if(mode==='close')await d.getByRole('button',{name:'返回手记',exact:true}).click();else await p.keyboard.press('Escape');
  assert.equal(await entry.evaluate(e=>e===document.activeElement),true);assert.equal(await p.locator('dialog[open]').count(),1);const after=await saved(p);assert.deepEqual(after,row.before);row.observations.push({mode,after,focus:'same semantic portrait button',status:'PASS'});
 }
 await p.locator('dialog[open] .dialog-close').click();assert.deepEqual(await saved(p),row.before);row.after=await saved(p);row.nestedFocusFullStateJournalStorageLocalStorage='PASS';
}
try{for(const viewport of [{width:1366,height:768},{width:390,height:740}].filter(v=>!process.env.HERO_EXPLANATION_WIDTHS||process.env.HERO_EXPLANATION_WIDTHS.split(',').includes(String(v.width)))){
 const width=viewport.width,c=await browser.newContext({viewport,hasTouch:width===390,reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(18000);p.on('pageerror',e=>report.errors.push(String(e)));p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:5571/?harness=1');await openSelector(p,width===390);
 for(const id of CHARACTER_IDS){await tapUI(p,'character-select','character/'+id,width===390);await inspect(p,'character-select','opening/hero-details',id,width,'selection',heroExplanationCopy(id));await tapUI(p,'character-select','character/'+id,width===390);await inspect(p,'character-select','opening/hero-details',id,width,'portrait',heroExplanationCopy(id));}
 for(const id of CHARACTER_IDS){const f=heroStageFixture(id);await imp(p,f.shop,'shop');await inspect(p,'shop',width===390?'shop/hero-details':'shop/hero-preparation',id,width,'shop',heroExplanationCopy(id,f.shop));
 // Shop portrait nested close/reopen/Escape restores its exact button and complete save.
 await tapUI(p,'shop','action/build',width===390);const compact=p.locator('.build-keepsake-compact');if(await compact.count())await compact.locator('summary').click();await nested(p,id,width,'shop-keepsake');
 // A legal cleared save proves the result entry, if an actual character source is displayed.
 await imp(p,f.cleared,'intermission');await p.waitForTimeout(1100);const resultTarget=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('intermission');return s.view.root.list.some(o=>o.name==='result/hero-details'||o.list?.some(x=>x.name==='result/hero-details'));});if(resultTarget)await inspect(p,'intermission','result/hero-details',id,width,'result',heroExplanationCopy(id,f.cleared));else report.rows.push({id,width,scene:'intermission',status:'NO_HERO_DISPLAYED_IN_THIS_CLEAR'});
 // Four bounded single-card commands produce a legal failed-stage result for all six hero portraits.
 let lost=structuredClone(f.state);while(lost.phase==='await-input')lost=heroSend(lost,{type:'PlayHand',selectedIds:[lost.handOrder[0]]});assert.equal(lost.phase,'run-lost');await imp(p,lost,'intermission');await p.waitForTimeout(1100);await inspect(p,'intermission','result/hero-details',id,width,'lost-result',heroExplanationCopy(id,lost));
 await tapUI(p,'intermission','action/last-hand',width===390);await nested(p,id,width,'finale-keepsake');
 // Native table first layer, including nonempty hand selection and all draft fields.
 await imp(p,f.state,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.presentation&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
 for(const card of f.ids.slice(0,4))await tapUI(p,'game','card/'+card,width===390);
 const originalDraft=await draft(p),avatar={amo:'hero/details',erxiang:'hero/erxiang-handoff',laohuan:'hero/laohuan-trick',azao:'hero/azao-charge',xiemu:'hero/xiemu-burn',touye:'hero/touye-wager'}[id];
 const guide=await p.evaluate(async()=>{const {heroSkillGuide}=await import('/src/game/HeroSkillGuide.ts'),{assistCandidates}=await import('/src/game/AssistSelection.ts'),{r2AssistAvailability}=await import('/src/domain/r2Assist.ts');const s=window.__harness.game.scene.getScene('game');return heroSkillGuide(s.run,s.selectionPreview(),[...s.selectedIds],!!s.assistProfile&&assistCandidates(s.assistInput(),r2AssistAvailability(s.run).available).length>0,{erxiangTargetId:s.erxiangTargetId,xiemuBurn:s.xiemuBurn,azaoRelease:s.azaoRelease,assistCount:s.assistIds.length});});
 const expected={...heroExplanationCopy(id,f.state),now:guide.step};
 await inspect(p,'game',avatar,id,width,'table-HUD',expected);assert.deepEqual(await draft(p),originalDraft);
 if(width===1366){await inspect(p,'game','table-art/hero-details',id,width,'table-decoration',expected);assert.deepEqual(await draft(p),originalDraft);}else report.rows.push({id,width,scene:'table-decoration',status:'NO_DECORATION_IN_PORTRAIT_LAYOUT'});
 await tapUI(p,'game',avatar,width===390);await p.getByRole('button',{name:'查看本场技能操作',exact:true}).click();assert.equal(await p.locator('.hero-skill-dialog[open],.amo-assist-dialog[open]').count(),1);assert.equal(await p.locator('dialog.hero-explanation[open]').count(),0);await p.locator('dialog[open] .dialog-close').click();assert.deepEqual(await draft(p),originalDraft);report.rows.push({id,width,scene:'game-original-operation',draft:originalDraft,before:await saved(p),status:'PASS'});

 }
 await c.close();}assert.deepEqual(report.errors,[]);report.status='PASS';}catch(e){report.status='FAIL';report.error=e.stack??String(e);process.exitCode=1;}finally{await writeFile(out+'/full-state-journal-storage-localStorage.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report);for(const row of brief.rows){for(const key of ['before','after'])if(row[key])row[key]={sha256:createHash('sha256').update(JSON.stringify(row[key])).digest('hex')};for(const o of row.observations??[])if(o.after)o.after={sha256:createHash('sha256').update(JSON.stringify(o.after)).digest('hex')};}await writeFile(out+'/report.json',JSON.stringify(brief,null,2));await browser.close();await server.close();console.log(report.status,report.error??'',report.rows.length);}
