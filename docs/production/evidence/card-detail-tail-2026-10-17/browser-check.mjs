import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';

const out='docs/production/evidence/card-detail-tail-2026-10-17';
await mkdir(out,{recursive:true});
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Card detail focused check</title><body><script type="module">
import '/src/style.css';
import {DetailDialog} from '/src/game/DetailDialog.ts';
import {createRun} from '/src/domain/run.ts';
import {r2CreateJoker} from '/src/domain/r2Run.ts';
import {newRunIdentity} from '/src/game/RunLaunch.ts';
import {jokerAbilityCopyForRun,publicJokerMemoryContext} from '/src/game/JokerMemory.ts';
import {jokerArtUrl,jokerArtPreviewUrl} from '/src/game/jokerArt.ts';
const state=createRun({rulesVersion:'r2',seed:'card-detail-tail',runId:'card-detail-tail',characterId:'erxiang',r2Identity:newRunIdentity('erxiang','flush'),openingRoute:'flush'});
const held=r2CreateJoker('c06','held',6,'none',state);held.growth.multiplier={n:'1',d:'2'};
const ctx=publicJokerMemoryContext(state,{hand:[],scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:1});
const ability=jokerAbilityCopyForRun(state,'c06',held,ctx),owner=new DetailDialog();
window.check={open(){return owner.open('青出于蓝 · 第 1 槽','普通\\n版次：无额外效果\\n第 1 槽 · 从左向右结算。\\n用下方按钮调序；出售须在商店确认。',[{label:'向左移',disabled:true,run(){}},{label:'向右移',disabled:true,run(){}}],{rarity:'common',ability,collapseRules:true,editionBody:'版次：无额外效果',portrait:{url:jokerArtUrl('c06'),thumbnailUrl:jokerArtPreviewUrl('c06'),alt:'青出于蓝完整卡面',layout:'card',caption:'青出于蓝'}})},snapshot(){return JSON.stringify({state,held})},close(){owner.close()}};
window.check.open();
</script></body></html>`;
const server=await createServer({logLevel:'error',server:{host:'127.0.0.1',port:5606,strictPort:true},plugins:[{name:'card-detail-tail-fixture',configureServer(s){s.middlewares.use('/__card-detail-tail.html',(_req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});}}]});
await server.listen();
const browser=await chromium.launch({args:['--disable-gpu']}),report={scope:'Focused software browser fixture using the actual DetailDialog, c06 public copy and source CSS. No GameScene navigation, full game run, dot acceptance or physical-device acceptance.',browser:browser.version(),errors:[]};
report.sourceSHA256=Object.fromEntries(await Promise.all(['src/game/DetailDialog.ts','src/game/DetailDialog.css','src/game/JokerPlainCopy.ts','src/style.css'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
const bounds=page=>page.locator('dialog.detail-dialog[open]').evaluate(d=>{const r=e=>e.getBoundingClientRect().toJSON(),scroll=d.querySelector('.dialog-scroll'),art=d.querySelector('.dialog-card-art');return {dialog:r(d),art:r(art),actions:r(d.querySelector('.dialog-actions')),scroll:{...r(scroll),client:scroll.clientHeight,total:scroll.scrollHeight},buttons:[...d.querySelectorAll('.dialog-actions button')].map(b=>({label:b.textContent,...r(b)})),horizontalOverflow:d.scrollWidth>d.clientWidth,copy:d.querySelector('.dialog-intro').textContent,caption:d.querySelector('figcaption')?.textContent??null};});
try{
 const page=await browser.newPage({viewport:{width:1180,height:757}});page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:5606/__card-detail-tail.html');
 await page.waitForFunction(()=>window.check&&document.querySelector('.dialog-card-image')?.naturalWidth>0);
 const before=await page.evaluate(()=>window.check.snapshot());
 report.collapsed=await bounds(page);const b=report.collapsed;
 assert.ok(b.dialog.height<620,'collapsed illustrated detail follows art and short copy');assert.ok(b.dialog.height>400,'art remains readable');assert.equal(b.horizontalOverflow,false);assert.equal(b.caption,null);
 assert.ok(b.copy.includes('已存倍率+0.5'));assert.equal((b.copy.match(/同花葫芦/g)??[]).length,1);assert.equal((b.copy.match(/同花五条/g)??[]).length,1);assert.ok(b.actions.y-(b.art.y+b.art.height)<40,'actions immediately follow the tallest content column');
 await page.screenshot({path:out+'/desktop-collapsed.png'});
 await page.locator('.card-rules>summary').click();report.expanded=await bounds(page);assert.ok(report.expanded.dialog.height>=b.dialog.height);assert.ok(report.expanded.dialog.height<=733);assert.ok(report.expanded.buttons.every(x=>x.bottom<=745));
 await page.screenshot({path:out+'/desktop-expanded.png'});
 await page.locator('.card-rules>p').evaluate(p=>{p.textContent=p.textContent.repeat(4);});report.longRules=await bounds(page);assert.ok(report.longRules.scroll.total>report.longRules.scroll.client,'controlled long rules scroll in their own column');assert.ok(report.longRules.buttons.every(x=>x.bottom<=745));
 await page.locator('.dialog-scroll').evaluate(e=>{e.scrollTop=e.scrollHeight;});assert.ok(await page.locator('.dialog-scroll').evaluate(e=>e.scrollTop>0));
 assert.equal(await page.evaluate(()=>window.check.snapshot()),before,'inspection does not mutate held card or run');
 await page.evaluate(()=>{window.check.close();window.check.open();});
 await page.getByRole('button',{name:'放大鉴赏青出于蓝',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),2);await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),1);
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{document.documentElement.style.setProperty('--safe-top','16px');document.documentElement.style.setProperty('--safe-bottom','24px');});report.mobileSanity=await bounds(page);assert.ok(report.mobileSanity.dialog.y>=27);assert.ok(report.mobileSanity.dialog.bottom<=809);assert.equal(report.mobileSanity.horizontalOverflow,false);assert.ok(report.mobileSanity.buttons.every(x=>x.bottom<=809));assert.equal(await page.locator('.dialog-content').evaluate(e=>getComputedStyle(e).display),'grid');
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.evaluate(()=>window.check.snapshot()),before);assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error.stack??error);throw error;}
finally{await writeFile(out+'/browser-check.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({status:report.status,collapsedHeight:report.collapsed.dialog.height,expandedHeight:report.expanded.dialog.height,longRules:report.longRules.scroll,mobileHeight:report.mobileSanity.dialog.height},null,2));
