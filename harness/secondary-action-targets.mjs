import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter,tapUI,waitScene} from './ui.mjs';
const fixed=process.env.SECONDARY_EXPECT_FIXED==='1',dir=process.env.SECONDARY_DIR||'shots/secondary-targets/before',build=process.env.SECONDARY_BUILD||'shots/mobile-dialog/build-before';
await mkdir(dir,{recursive:true});const styleHash=()=>readFile('src/style.css').then(b=>createHash('sha256').update(b).digest('hex'));
const report={commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),styleHash:await styleHash(),build:JSON.parse(await readFile(build+'/build-info.json','utf8')),cases:[],limits:['Windows Chromium native Canvas; touch and safe-area emulation, not physical-device acceptance.','Actual new run and native pointer/keyboard inputs. Read-only dialogs; no fixture or private action invocation.']};
const server=await preview({build:{outDir:build},preview:{host:'127.0.0.1',port:5611,strictPort:true},logLevel:'error'}),browser=await chromium.launch();report.browser=browser.version();
const entry={amo:'hero/details',touye:'hero/touye-wager',laohuan:'hero/laohuan-trick',erxiang:'hero/erxiang-handoff',azao:'hero/azao-charge',xiemu:'hero/xiemu-burn'};
const cases=[...[{width:1366,height:900},{width:390,height:740},{width:320,height:568},{width:740,height:320}].map(viewport=>({hero:'xiemu',viewport})),...(fixed?['amo','touye','laohuan','erxiang','azao'].map(hero=>({hero,viewport:{width:320,height:568}})):[])];
try{for(const spec of cases){const {hero,viewport}=spec,context=await browser.newContext({viewport,hasTouch:true,deviceScaleFactor:1}),p=await context.newPage(),r={...spec,errors:[]};report.cases.push(r);p.on('pageerror',e=>r.errors.push(String(e)));
 try{
  await p.goto('http://127.0.0.1:5611/?harness=1&seed=secondary-targets');await chooseCharacter(p,hero,true);await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(370);await tapUI(p,'shop','action/start-stage',true);await waitScene(p,'game');
  await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
  const card=await p.evaluate(()=>window.__harness.game.scene.getScene('game').cardViews.find(v=>v.container.visible).card.id);await tapUI(p,'game','card/'+card,true);
  const snapshot=()=>p.evaluate(async()=>{const g=window.__harness.game,c=g.registry.get('runController'),s=g.scene.getScene('game');return{state:c.state,journal:c.journal,storage:await c.store.read(),selection:[...s.selectedIds],draft:{burn:s.xiemuBurn,release:s.azaoRelease,target:s.erxiangTargetId}};});const before=await snapshot();
  await tapUI(p,'game',entry[hero],true);await p.getByRole('button',{name:'查看本场技能操作',exact:true}).click();const d=p.locator('.hero-skill-dialog[open]'),summary=d.locator('.dialog-secondary-actions > summary');await summary.waitFor();
  assert.equal(await summary.evaluate(e=>e.parentElement.open),false,'other inspections start folded');await summary.scrollIntoViewIfNeeded();const b=await summary.boundingBox();r.target=b;assert.ok(b&&b.width>=44);if(fixed)assert.ok(b.height>=44,'disclosure has the required44px target');
  await p.screenshot({path:dir+'/'+hero+'-'+viewport.width+'-target.png'});await p.touchscreen.tap(b.x+b.width/2,b.y+35);r.lowerEdgeOpened=await summary.evaluate(e=>e.parentElement.open);assert.equal(r.lowerEdgeOpened,fixed,'native tap35px below the top reaches only the enlarged target');
  if(!r.lowerEdgeOpened){await summary.click();assert.equal(await summary.evaluate(e=>e.parentElement.open),true,'original text still opens with a precise tap');}
  const enabled=d.locator('.dialog-secondary-actions button:enabled');r.inspectionButtons=await enabled.count();if(r.inspectionButtons){await enabled.first().click();await p.keyboard.press('Escape');}else await p.keyboard.press('Escape');
  assert.deepEqual(await snapshot(),before,'opening an inspection and closing preserves state, storage and selection');
  await tapUI(p,'game',entry[hero],true);await p.getByRole('button',{name:'查看本场技能操作',exact:true}).click();const again=p.locator('.hero-skill-dialog[open] .dialog-secondary-actions > summary');await again.focus();await p.keyboard.press('Space');assert.equal(await again.evaluate(e=>e.parentElement.open),true,'keyboard Space expands the native disclosure');await p.keyboard.press('Space');assert.equal(await again.evaluate(e=>e.parentElement.open),false,'keyboard Space collapses it');
  if(fixed&&hero==='xiemu'&&viewport.width===390){await p.setViewportSize({width:740,height:390});await p.evaluate(()=>{document.documentElement.style.setProperty('--safe-top','20px');document.documentElement.style.setProperty('--safe-bottom','16px');});await again.scrollIntoViewIfNeeded();r.rotatedTarget=await again.boundingBox();assert.ok(r.rotatedTarget.height>=44);await again.click();assert.equal(await again.evaluate(e=>e.parentElement.open),true);}
  await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);assert.deepEqual(await snapshot(),before,'keyboard/rotation/close retain the exact run and selected cards');assert.deepEqual(r.errors,[]);r.status='PASS';console.log(hero+' '+viewport.width+': PASS ('+b.height+'px)');
 }catch(error){r.status='FAIL';r.error=String(error);await p.screenshot({path:dir+'/'+hero+'-'+viewport.width+'-FAIL.png'}).catch(()=>{});throw error;}finally{await context.close();}
}}finally{report.sourceUnchanged=report.styleHash===await styleHash();await writeFile(dir+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
