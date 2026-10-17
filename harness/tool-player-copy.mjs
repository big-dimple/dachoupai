/** Bounded display audit; native inventory/catalog/purchase inputs plus all shipped tool components. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from './ui.mjs';

const before=process.argv.includes('--before'),stage=before?'before':'after';
const out='docs/production/evidence/tool-player-copy-2026-10-17';await mkdir(out,{recursive:true});
const baseline=execFileSync('git',['show','179e17414aa9dbae67dfa33dc991c2a298895223:src/game/r2ToolInfo.ts'],{encoding:'utf8'});
const server=await createServer({mode:'e2e',cacheDir:'shots/.vite-tool-copy-'+stage,plugins:before?[{name:'baseline-tool-info',enforce:'pre',load(id){if(id.replaceAll('\\','/').endsWith('/src/game/r2ToolInfo.ts'))return baseline;}}]:[],server:{host:'127.0.0.1',port:5598,strictPort:true},logLevel:'error'});
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {R2_TOOLS}=await server.ssrLoadModule('/src/content/r2Tools.ts');
let state=createRun({seed:'group-natural-17',runId:'controlled/tool-copy',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
const setup=applyCommand(state,{runId:state.runId,commandId:'fixture/setup',expectedSeq:state.commandSeq,action:{type:'RerollShop'}});assert.ok(setup.ok);state=setup.state;
state.gold=30;state.consumables=[{instanceId:'owned/S06',definitionId:'S06'}];state.longTermItems=['U03'];state.shop.toolOffers=[{...state.shop.toolOffers[0],definitionId:'S06',price:6,consumed:false}];
const checkpoint=makeCheckpoint(state,[]);assert.ok(readCheckpoint(checkpoint).ok);
const html=`<!doctype html><html lang="zh"><meta charset="utf-8"><body><main id="choices"></main><script type="module">
import '/src/style.css';import {DetailDialog} from '/src/game/DetailDialog.ts';import {showConsumables} from '/src/game/ConsumableDialog.ts';import {R2_TOOLS} from '/src/content/r2Tools.ts';
const owner=new DetailDialog(),source=${JSON.stringify(state)};let sends=0;
for(const tool of R2_TOOLS){const b=document.createElement('button');b.id='tool-'+tool.id;b.textContent=tool.name;b.onclick=()=>{const s=structuredClone(source);s.consumables=[{instanceId:'audit/'+tool.id,definitionId:tool.id}];showConsumables(owner,s,true,async()=>{sends++;return false;},'audit/'+tool.id);};document.querySelector('#choices').append(b);}
window.audit={sends:()=>sends};</script></body></html>`;
const entry='shots/tool-copy-audit-'+stage+'.html';await mkdir('shots',{recursive:true});await writeFile(entry,html);await server.listen();
const report={stage,baseline:'179e17414aa9dbae67dfa33dc991c2a298895223',browser:'',scope:'Controlled legal checkpoint through native menu import and native pointer/touch inventory, purchase and catalog inputs; isolated production ConsumableDialog sweep for every tool. No purchase/use confirmation, gameplay matrix, deployment or physical-device claim.',sourceHash:createHash('sha256').update(before?baseline:await readFile('src/game/r2ToolInfo.ts')).digest('hex'),native:[],toolComponents:[],errors:[]};
const browser=await chromium.launch({headless:true});report.browser=browser.version();let p;
const clean=text=>assert.doesNotMatch(text,/大丑/);
const saved=()=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
const text=async d=>{await d.locator('details').evaluateAll(es=>es.forEach(e=>e.open=true));const value=await d.textContent();clean(value);return value;};
const shot=async name=>{await p.waitForFunction(()=>[...document.querySelectorAll('dialog[open] .detail-art-status')].every(e=>e.hidden||!e.textContent.includes('高清细节加载中')),null,{timeout:15000});await p.screenshot({path:out+'/'+stage+'-'+name+'.png'});};
try{
 for(const width of [1366,390]){
  p=await browser.newPage({viewport:{width,height:width===390?844:768},hasTouch:width===390,deviceScaleFactor:1});p.setDefaultTimeout(60000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto('http://127.0.0.1:5598/?harness=1',{waitUntil:'domcontentloaded'});await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();await p.locator('.run-menu-modal input[type=file]').setInputFiles({name:'controlled-tool-copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
  const unchanged=await saved(),row={width};report.native.push(row);console.log(stage,width,'shop');const inventory=()=>tapUI(p,'shop',width===1366?'action/make-cards':'action/tool-inventory',width===390);
  await inventory();await p.locator('.tool-inventory-card[data-item-id="owned/S06"]').click();row.guzhuUse=await text(p.locator('.tool-detail[open]'));assert.match(row.guzhuUse,/稀有唐宋牌/);assert.match(row.guzhuUse,/30 → 0/);await shot(width+'-guzhu-use');await p.getByRole('button',{name:'稍后使用',exact:true}).click();
  await inventory();await p.locator('.tool-inventory-card[data-item-id="U03"]').click();row.item=await text(p.locator('.tool-item-detail[open]'));if(!before)assert.match(row.item,/从下一场起，本局每场出牌次数\+1；当前场次数不变/);await shot(width+'-U03');await p.keyboard.press('Escape');
  if(width===1366){await tapUI(p,'shop','offer/'+state.shop.toolOffers[0].offerId);row.guzhuPurchase=await text(p.locator('.shop-tool-purchase[open]'));assert.match(row.guzhuPurchase,/稀有唐宋牌/);await shot('1366-guzhu-purchase');await p.getByRole('button',{name:'取消',exact:true}).click();}
  await p.locator('.run-menu-toggle').click();await p.getByRole('button',{name:'图鉴查询',exact:true}).click();await p.getByRole('searchbox',{name:'按名字查找'}).fill('孤注');await p.getByRole('button',{name:'查看孤注',exact:true}).click();row.guzhuCatalog=await text(p.locator('dialog[open]').last());assert.match(row.guzhuCatalog,/稀有唐宋牌/);if(width===1366)await shot('1366-guzhu-catalog');await p.keyboard.press('Escape');await p.keyboard.press('Escape');assert.deepEqual(await saved(),unchanged);row.savedTupleUnchanged=true;await p.close();
 }
 p=await browser.newPage({viewport:{width:1366,height:768}});p.setDefaultTimeout(60000);p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://127.0.0.1:5598/'+entry);await p.waitForFunction(()=>window.audit);
 for(const tool of R2_TOOLS){await p.locator('#tool-'+tool.id).click();const copy=await text(p.locator('.tool-detail[open]'));report.toolComponents.push({id:tool.id,copy});await p.keyboard.press('Escape');}
 assert.equal(await p.evaluate(()=>window.audit.sends()),0);assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;await p?.screenshot({path:out+'/'+stage+'-FAIL.png'}).catch(()=>{});process.exitCode=1;}finally{await writeFile(out+'/'+stage+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({stage,status:report.status,native:report.native.map(r=>({width:r.width,savedTupleUnchanged:r.savedTupleUnchanged})),tools:report.toolComponents.length,error:report.error}));await browser.close();await server.close();await unlink(entry);}
