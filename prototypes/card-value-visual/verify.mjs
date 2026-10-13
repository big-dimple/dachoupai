import assert from 'node:assert/strict';
import {serve} from './serve.mjs';
const server=await serve();
import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dir=new URL('./',import.meta.url),path=fileURLToPath(dir);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const report={kind:'Static visual prototype, synthetic display fixtures only',browser:browser.version(),profiles:[],humanAcceptance:'NOT_RUN',physicalDevice:'NOT_RUN',gameplayRecommendationCalibration:'NOT_RUN',sourceHashes:{}};
for(const f of ['index.html','style.css','app.js'])report.sourceHashes[f]=createHash('sha256').update(await readFile(new URL(f,dir))).digest('hex');
async function geometry(page){return page.evaluate(()=>{
 const problems=[];const vw=innerWidth;
 if(document.documentElement.scrollWidth>vw)problems.push('page horizontal overflow');
 for(const el of document.querySelectorAll('.card, .stars, .rarity, .rec-label, .rec-word, .hook, .dimension, button, summary')){
  if(!el.getClientRects().length)continue;
  const r=el.getBoundingClientRect();if(r.left<0||r.right>vw+.5)problems.push(`${el.className}: viewport overflow`);
  const card=el.closest('.card');if(card){const c=card.getBoundingClientRect();if(r.left<c.left||r.right>c.right+.5)problems.push(`${el.className}: card overflow`);}
  if(el.matches('.stars')&&el.querySelectorAll('svg').length!==5)problems.push('not five complete stars');
  if(el.matches('button,summary')&&r.height<44)problems.push('touch control smaller than 44px');
  if(el.scrollWidth>el.clientWidth+1&&!el.matches('svg'))problems.push(`${el.className}: inner overflow`);
 }
 for(const el of document.querySelectorAll('.rec-label,.rec-word,.hook,.rarity,.dimension,summary,button')){
  if(!el.getClientRects().length)continue;
  const range=document.createRange();range.selectNodeContents(el);const outer=el.closest('.card,.compare-column')?.getBoundingClientRect();
  for(const r of range.getClientRects())if(r.width&&outer&&(r.left<outer.left-.5||r.right>outer.right+.5))problems.push('text outside card: '+el.className);
 }
 for(const stars of document.querySelectorAll('.stars'))for(const svg of stars.querySelectorAll('svg')){const a=svg.getBoundingClientRect(),b=stars.getBoundingClientRect();if(a.left<b.left-.5||a.right>b.right+.5||a.top<b.top-.5||a.bottom>b.bottom+.5)problems.push('star clipped');}
 return problems;
});}
try{for(const [width,height] of [[320,740],[390,844],[1366,900]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<700,deviceScaleFactor:1});const page=await context.newPage();const errors=[];const requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5189/'))requests.push(r.url());});
 await page.goto('http://127.0.0.1:5189/prototypes/card-value-visual/index.html');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 assert.deepEqual(await geometry(page),[]);assert.deepEqual(await page.locator('.card .stars .filled').evaluateAll(els=>els.map(e=>e.closest('.card').dataset.card).reduce((a,c)=>(a[c]=(a[c]||0)+1,a),{})),{mantangcai:4,e08:2,b06:3});
 await page.screenshot({path:`${path}evidence/prototype-${width}-default.png`,fullPage:true});await page.screenshot({path:`${path}evidence/prototype-${width}-viewport.png`});
 const details=page.locator('[data-card="b06"] details');await details.locator('summary').click();assert.equal(await details.evaluate(e=>e.open),true);await page.locator('[data-card="b06"]').scrollIntoViewIfNeeded();assert.deepEqual(await geometry(page),[]);await page.screenshot({path:`${path}evidence/prototype-${width}-conditions.png`});await details.locator('summary').click();
 await page.locator('#ready').click();assert.equal(await page.locator('[data-card="b06"] .filled').count(),5);assert.equal(await page.locator('.card .five').count(),1);assert.equal(await page.locator('[data-card="b06"] .combo-status').innerText(),'●●已满足 2/2');assert.deepEqual(await geometry(page),[]);await page.screenshot({path:`${path}evidence/prototype-${width}-five.png`,fullPage:true});
 await page.locator('[data-id="mantangcai"].select').click();await page.locator('[data-id="e08"].select').click();assert.equal(await page.locator('#compare').isEnabled(),true);await page.locator('[data-id="b06"].select').click();assert.match(await page.locator('#selection-status').innerText(),/已选满/);assert.equal(await page.locator('.select[aria-pressed="true"]').count(),2);
 await page.locator('#compare').click();assert.equal(await page.locator('#comparison').evaluate(e=>e.open),true);assert.equal(await page.locator('#comparison .stars').count(),2);assert.deepEqual(await geometry(page),[]);await page.screenshot({path:`${path}evidence/prototype-${width}-compare.png`});await page.keyboard.press('Escape');assert.equal(await page.locator('#comparison').evaluate(e=>e.open),false);assert.equal(await page.locator('#compare').evaluate(e=>e===document.activeElement),true);
 await page.locator('[data-id="e08"].select').click();assert.equal(await page.locator('#compare').isEnabled(),false);await page.locator('[data-id="b06"].select').click();await page.locator('#compare').click();assert.deepEqual(await geometry(page),[]);await page.screenshot({path:`${path}evidence/prototype-${width}-five-compare.png`});await page.locator('#close-compare').click();assert.equal(await page.locator('#comparison').evaluate(e=>e.open),false);
 await page.locator('#missing').click();assert.equal(await page.locator('[data-card="b06"] .filled').count(),3);assert.equal(await page.locator('.card .five').count(),0);assert.equal(await page.locator('.select[aria-pressed="true"]').count(),2);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#ready').click();assert.deepEqual(await geometry(page),[]);await page.screenshot({path:`${path}evidence/prototype-${width}-reduced.png`,fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);report.profiles.push({width,height,dpr:1,entry:'local HTTP (loopback only)',checks:['all images loaded','no horizontal/card overflow or text-range clipping','five full vector stars per rating','44px controls','expand/collapse','fixture 3→5→3 and condition count','select/remove and max-two feedback','two comparisons','Escape/close/focus restore','selection preserved on fixture change','reduced motion','zero external requests','zero JS errors'],status:'PASS'});await context.close();
}}catch(e){report.failure=String(e);throw e;}finally{await writeFile(new URL('evidence/verification.json',dir),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify(report,null,2));
