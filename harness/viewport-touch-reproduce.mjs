import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene,point} from './ui.mjs';
const out=process.env.VIEWPORT_REPRO_OUTPUT??'shots/viewport-touch-before';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5574,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts'),{newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts'),{makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}).trim(),scope:'受控合法公开手牌/金币样板，测试明确登记新手偏好；PC/手机为软件Chromium，非自然试玩、物理设备、听感或整体游戏验收。',cases:[]};
const cards=['spades-8','hearts-8','clubs-7','diamonds-7','spades-13','hearts-13','clubs-2','diamonds-4'];let serial=0;
function send(s,action){const r=applyCommand(s,{runId:s.runId,commandId:'setup/'+s.commandSeq,expectedSeq:s.commandSeq,action});assert.ok(r.ok,r.code);return r.state;}
function arrange(s,ids=cards){s=structuredClone(s);s.handOrder=[...ids];s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id));assert.ok(readCheckpoint(makeCheckpoint(s,[])).ok);return s;}
function entered(id){let s=createRun({rulesVersion:'r2',characterId:id,runId:'reminder/'+id+'/'+serial++,seed:'group-natural-17',r2Identity:newRunIdentity(id,'group'),openingRoute:'group'});s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});if(id==='azao'){s=arrange(s,['spades-2','hearts-2','clubs-3','diamonds-3',...cards.slice(4)]);s=send(s,{type:'PlayHand',selectedIds:s.handOrder.slice(0,4)});}s=arrange(s);if(id==='xiemu')s.gold=30;assert.ok(readCheckpoint(makeCheckpoint(s,[])).ok);return s;}
const snap=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
async function imp(p,s){await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const event=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await event).setFiles({name:'controlled-reminder.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});await waitScene(p,'game');await p.waitForFunction(runId=>window.__harness.game.scene.getScene('game').run.runId===runId,s.runId);await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.presentation&&!s.playing&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});await p.evaluate(async()=>{const {enrollFirstChapterGuide}=await import('/src/game/FirstChapterGuide.ts');enrollFirstChapterGuide(window.__harness.game.registry.get('runController').state);});}
async function select(p,ids,touch){for(const id of ids)await tapUI(p,'game','card/'+id,touch);}
async function shot(p,name){await p.screenshot({path:out+'/'+name+'.png',scale:'css'});}

try {
 const context=await browser.newContext({viewport:{width:390,height:740},hasTouch:true,deviceScaleFactor:1});
 const p=await context.newPage();p.setDefaultTimeout(30000);p.on('dialog',d=>d.accept());
 await p.goto('http://127.0.0.1:5574/?harness=1');await waitScene(p,'title');
 await p.setViewportSize({width:320,height:568});
 const s=entered('touye');await imp(p,s);await select(p,cards.slice(0,2),true);
 const state=()=>p.evaluate(()=>{const g=window.__harness.game.scene.getScene('game'),game=window.__harness.game,r=game.canvas.getBoundingClientRect();return {selected:[...g.selectedIds],seq:g.run.commandSeq,ready:g.ready,playing:g.playing,phase:g.run.phase,canvas:{x:r.x,y:r.y,width:r.width,height:r.height},scale:{width:game.scale.width,height:game.scale.height},pointer:{x:game.input.activePointer.x,y:game.input.activePointer.y},bounds:game.scale.canvasBounds,displayScale:{x:game.scale.displayScale.x,y:game.scale.displayScale.y},handSurface:g.handInput.surface.getBoundingClientRect().toJSON()};});
 report.before=await state();report.beforeSnapshot=await snap(p);report.playPoint=await point(p,'game','action/play');await shot(p,'before-play');
 await tapUI(p,'game','action/play',true);report.after=await state();report.afterSnapshot=await snap(p);await shot(p,'after-play');
 report.reproduced=report.after.seq===report.before.seq&&report.after.selected.includes('spades-13');
 report.reminderOpen=await p.locator('.hero-play-reminder[open]').count()===1;
 if(process.env.VIEWPORT_EXPECT_FIXED==='1'){assert.equal(report.reproduced,false);assert.equal(report.reminderOpen,true);assert.deepEqual(report.after.pointer,{x:220,y:507});assert.deepEqual(report.after.selected,report.before.selected);assert.deepEqual(report.afterSnapshot,report.beforeSnapshot);report.status='PASS';}else report.status=report.reproduced?'BASELINE_REPRODUCED':'BASELINE_NOT_REPRODUCED';
 console.log(JSON.stringify({head:report.head,before:report.before,playPoint:report.playPoint,after:report.after,status:report.status},null,2));
} catch(e) {report.status='HARNESS_FAIL';report.error=e.stack;console.error(e);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));}
