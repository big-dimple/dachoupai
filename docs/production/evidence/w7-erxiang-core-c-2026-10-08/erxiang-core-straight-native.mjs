import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {createServer} from '../../../../node_modules/vite/dist/node/index.js';
import {chromium} from '../../../../node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {tapUI,waitScene,confirmHeroRoute,point} from '../../../../harness/ui.mjs';
const out='/tmp/erxiang-core-straight-native';await mkdir(out,{recursive:true});
const v=await createServer({root:fileURLToPath(new URL('../../../../',import.meta.url)),mode:'e2e',server:{host:'127.0.0.1',port:5452,strictPort:true},logLevel:'error'});await v.listen();
const {applyCommand}=await v.ssrLoadModule('/src/domain/run.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});page.setDefaultTimeout(18000);page.on('dialog',d=>d.accept());
const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(new URL('../../../../',import.meta.url)),encoding:'utf8'}).trim(),scope:'Finite normal Title->erxiang/straight start, fixed existing seed route-first-19, no checkpoint injection/seed scan. Native long-press target and one actual straight. Chromium software input/visual evidence, not physical device/human/GPU acceptance.',steps:[],errors:[]};page.on('pageerror',e=>report.errors.push(String(e)));
const state=()=>page.evaluate(()=>window.__harness.game.registry.get('runController')?.state);
const settle=()=>page.waitForFunction(()=>{const g=window.__harness.game,s=g.registry.get('runController')?.state;if(!s)return false;if(['stage-cleared','run-lost'].includes(s.phase))return g.scene.isActive('intermission');if(s.phase==='shop')return g.scene.getScene('shop').ready;const a=g.scene.getScene('game');return a.scene.isActive()&&a.ready&&!a.presentation&&a.cardViews.every(v=>!v.dealing&&!a.tweens.isTweening(v.container));});
const dismiss=async()=>{for(const name of ['本局不提示','开始出牌','关闭'])if(await page.getByRole('button',{name,exact:true}).count()){await page.getByRole('button',{name,exact:true}).click();break;}};
const draft=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {selectedIds:[...s.selectedIds],coreTargetId:s.coreTargetId,marked:s.cardViews.filter(v=>v.container.getData('coreTarget')).map(v=>v.card.id),copy:s.resultText.text};});
const detail=async id=>{const pos=await point(page,'game','card/'+id);await page.mouse.move(pos.x,pos.y);await page.mouse.down();await page.waitForTimeout(450);await page.mouse.up();await page.locator('.detail-dialog[open]').waitFor();};
const commit=async(action,perform)=>{const before=await state(),expected=applyCommand(before,{runId:before.runId,commandId:before.runId+'/command/'+(before.commandSeq+1),expectedSeq:before.commandSeq,action});assert.ok(expected.ok,JSON.stringify(expected));await perform();await page.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq,expected.state.commandSeq);await settle();const after=await state();assert.deepEqual(after,expected.state);report.steps.push({action,before,after});return after;};
try{
 await page.goto('http://127.0.0.1:5452/?harness=1&seed=route-first-19');await waitScene(page,'title');await tapUI(page,'title','action/title-start');await waitScene(page,'character-select');await tapUI(page,'character-select','character/erxiang');await confirmHeroRoute(page,false,'straight');await waitScene(page,'shop');await settle();await dismiss();
 let s=await state();report.initial=s;
 if(s.program&&!s.program.choiceMade){await tapUI(page,'shop','action/chapter');await page.getByRole('button',{name:'选择节目单',exact:true}).click();await commit({type:'ChooseProgram',programId:null},()=>page.getByRole('button',{name:'本章不接',exact:true}).click());await dismiss();}
 s=await state();const offer=s.shop.offers.find(o=>o.definitionId==='c04');assert.ok(offer,'same existing natural c04 offer');await commit({type:'BuyOffer',offerId:offer.offerId},async()=>{await tapUI(page,'shop','offer/'+offer.offerId);await page.getByRole('button',{name:'确认购买',exact:true}).click();});await dismiss();
 await tapUI(page,'shop','action/start-stage');await waitScene(page,'game');await settle();await dismiss();s=await state();report.entry=s;
 const main=['clubs-7','clubs-8','spades-4','clubs-6','spades-5'];for(const id of main)await tapUI(page,'game','card/'+id);await detail('clubs-8');await page.getByRole('button',{name:/指定8核心/}).click();report.targetDraft=await draft();assert.equal(report.targetDraft.marked.length,1);await page.screenshot({path:out+'/target-straight.png'});
 const first=await commit({type:'PlayHand',selectedIds:(await draft()).selectedIds,coreTargetId:'clubs-8',coreTargetRank:8},()=>tapUI(page,'game','action/play'));assert.equal(first.lastTrace.finalScore,'852');assert.equal(first.phase,'stage-cleared');await page.screenshot({path:out+'/straight-clear.png'});const after=first;
 report.final=after;assert.deepEqual(report.errors,[]);console.log(JSON.stringify({first:first.lastTrace.finalScore,phase:after.phase,errors:report.errors}));
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await v.close();}
