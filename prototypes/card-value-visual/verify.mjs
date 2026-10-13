import assert from 'node:assert/strict';
import {serve} from './serve.mjs';
import {chromium} from 'playwright';
import {writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dir=new URL('./',import.meta.url),out=new URL('evidence/round2/',dir),outPath=fileURLToPath(out);
const server=await serve();const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const report={kind:'Round 2: art-led card prototype, display fixtures',previousReviewCommit:'ead4046e30fbb7ba3d32d13ca428f7dc9fdefdd4',browser:browser.version(),profiles:[],humanAcceptance:'NOT_RUN',physicalDevice:'NOT_RUN',gameplayRecommendationCalibration:'NOT_RUN',sourceHashes:{}};
for(const f of ['index.html','style.css','app.js'])report.sourceHashes[f]=createHash('sha256').update(await readFile(new URL(f,dir))).digest('hex');
async function reveal(page,id){await page.locator(`[data-card="${id}"]`).evaluate(el=>el.scrollIntoView({inline:'center',block:'nearest',behavior:'instant'}));await page.waitForFunction(id=>!document.querySelector(`[data-card="${id}"]`).classList.contains('peek'),id);}
async function geometry(page){return page.evaluate(()=>{
 const problems=[];if(document.documentElement.scrollWidth>innerWidth)problems.push('page horizontal overflow');
 const isVisible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 for(const el of document.querySelectorAll('.stars,.rarity,.rec-label,.rec-word,.combo-status,.route-tag,.name,button')){
  if(!isVisible(el))continue;const card=el.closest('.card'),r=el.getBoundingClientRect();
  if(card?.classList.contains('peek'))continue;
  if(r.left<-.5||r.right>innerWidth+.5)problems.push('viewport clipping: '+el.className);
  if(el.matches('button')&&r.height<44)problems.push('control under 44px');
  if(el.scrollWidth>el.clientWidth+1)problems.push('inner overflow: '+el.className);
  if(card){const c=card.getBoundingClientRect();if(r.left<c.left-.5||r.right>c.right+.5)problems.push('outside card: '+el.className);}
 }
 for(const stars of document.querySelectorAll('.stars')){
  if(!isVisible(stars))continue;
  if(stars.querySelectorAll('svg').length!==5)problems.push('not five stars');
  const b=stars.getBoundingClientRect();for(const svg of stars.querySelectorAll('svg')){const a=svg.getBoundingClientRect();if(a.left<b.left-.5||a.right>b.right+.5||a.top<b.top-.5||a.bottom>b.bottom+.5)problems.push('star clipped');}
 }
 for(const el of document.querySelectorAll('.name,.rec-label,.rec-word,.combo-status,.route-tag,.rarity,.conditions li,.compare-item')){
  if(!isVisible(el))continue;const outer=el.closest('.card,.compare-column,dialog')?.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(el);for(const r of range.getClientRects())if(r.width&&outer&&(r.left<outer.left-.5||r.right>outer.right+.5))problems.push('text outside surface');
 }
 return problems;
});}
const shot=async(page,width,state,fullPage=false)=>page.screenshot({path:`${outPath}${width}-${state}.png`,fullPage});
try{for(const [width,height] of [[320,740],[390,844],[1366,900]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<700,deviceScaleFactor:1});const page=await context.newPage();const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:5189/'))external.push(r.url());});
 await page.goto('http://127.0.0.1:5189/prototypes/card-value-visual/index.html');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
 assert.deepEqual(await geometry(page),[]);assert.equal(await page.locator('.card button,.card details,.card summary').count(),0);assert.equal(await page.locator('.card').count(),3);
 const metrics=await page.evaluate(()=>{const c=document.querySelector('.card'),p=c.querySelector('.portrait'),cr=c.getBoundingClientRect(),pr=p.getBoundingClientRect();return{card:{width:cr.width,height:cr.height},art:{width:pr.width,height:pr.height,containedWidth:Math.min(pr.width,pr.height*p.naturalWidth/p.naturalHeight)},repeatedPerCardActionRows:0,pageHeight:document.documentElement.scrollHeight,unifiedActionVisible:document.querySelector('#compare').getBoundingClientRect().bottom<=innerHeight};});
 assert.equal(metrics.unifiedActionVisible,true);await shot(page,width,'default');await shot(page,width,'full',true);
 if(width<700){
  const cdp=await context.newCDPSession(page),y=420,start=width*.85,end=width*.15;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
  for(let n=1;n<=10;n++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+(end-start)*n/10,y}]});await page.waitForTimeout(22);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForFunction(()=>!document.querySelector('[data-card="e08"]').classList.contains('peek'));
  assert.equal(await page.locator('#detail').evaluate(e=>e.open),false,'swiping must not open a detail');
  await page.locator('[data-card="e08"]').tap();assert.equal(await page.locator('#detail').evaluate(e=>e.open),true);await page.locator('#close-detail').tap();await cdp.detach();
  await reveal(page,'mantangcai');
 }

 for(const id of ['mantangcai','e08','b06']){await reveal(page,id);assert.deepEqual(await geometry(page),[]);if(id!=='mantangcai')await shot(page,width,id);await page.locator(`[data-card="${id}"]`).click();assert.equal(await page.locator('#detail').evaluate(e=>e.open),true);assert.equal(await page.locator('#detail .conditions li').count(),2);assert.deepEqual(await geometry(page),[]);if(id==='b06')await shot(page,width,'conditions');await page.locator('#close-detail').click();assert.equal(await page.locator(`[data-card="${id}"]`).evaluate(e=>e===document.activeElement),true);}
 await page.locator('#ready').click();await reveal(page,'b06');assert.equal(await page.locator('[data-card="b06"] .filled').count(),5);assert.equal(await page.locator('[data-card="b06"] .combo-status').innerText(),'搭档齐备 · 2/2');assert.deepEqual(await geometry(page),[]);await shot(page,width,'five');
 await page.locator('#compare').click();assert.equal(await page.locator('#compare').isEnabled(),false);for(const id of ['mantangcai','e08']){await reveal(page,id);await page.locator(`[data-card="${id}"]`).click();}assert.equal(await page.locator('.card[aria-pressed=true]').count(),2);assert.equal(await page.locator('#compare').isEnabled(),true);await reveal(page,'b06');await page.locator('[data-card="b06"]').click();assert.match(await page.locator('#selection-status').innerText(),/已选满/);assert.equal(await page.locator('#detail').evaluate(e=>e.open),false);
 await page.locator('#compare').click();assert.equal(await page.locator('#comparison').evaluate(e=>e.open),true);assert.deepEqual(await geometry(page),[]);await shot(page,width,'compare');await page.keyboard.press('Escape');assert.equal(await page.locator('#comparison').evaluate(e=>e.open),false);assert.equal(await page.locator('#compare').evaluate(e=>e===document.activeElement),true);
 await reveal(page,'e08');await page.locator('[data-card="e08"]').click();assert.equal(await page.locator('#compare').isEnabled(),false);await reveal(page,'b06');await page.locator('[data-card="b06"]').click();await shot(page,width,'selected');await page.locator('#compare').click();assert.deepEqual(await geometry(page),[]);await shot(page,width,'five-compare');await page.locator('#close-compare').click();
 await page.locator('#missing').click();assert.equal(await page.locator('[data-card="b06"] .filled').count(),3);assert.equal(await page.locator('.card[aria-pressed=true]').count(),2);await page.locator('#cancel-selection').click();assert.equal(await page.locator('.card[aria-pressed=true]').count(),0);assert.equal(await page.locator('#compare').innerText(),'选择对比');
 await reveal(page,'b06');await page.locator('[data-card="b06"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#detail').evaluate(e=>e.open),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#detail').evaluate(e=>e.open),false);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#ready').click();await reveal(page,'b06');assert.deepEqual(await geometry(page),[]);await shot(page,width,'reduced');assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 report.profiles.push({width,height,dpr:1,metrics,checks:['all three cards separately revealed; visible text and five stars uncut','intentional side peek is artwork only; no cut labels/stars',...(width<700?['native CDP touch swipe reaches second card without accidental open; tap opens/closes detail']:[]),'zero repeated per-card action rows','unified action within first viewport','all three details open/close and focus return','keyboard Enter/Escape','3↔5 sample and 1/2↔2/2','comparison mode + selection limit + remove + cancel','two comparisons; focus restore','selection preserved on fixture switch','reduced motion','no external requests or JS errors'],status:'PASS'});await context.close();
}}catch(e){report.failure=String(e);throw e;}finally{await writeFile(new URL('verification.json',out),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify(report,null,2));
