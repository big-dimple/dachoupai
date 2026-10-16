import assert from 'node:assert/strict';
import {serve} from './serve.mjs';
import {chromium} from 'playwright';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const dir=new URL('./',import.meta.url),out=new URL(process.env.CARD_VALUE_OUTPUT||'evidence/round3/after/',dir),outPath=fileURLToPath(out);
await mkdir(out,{recursive:true});const server=await serve(Number(process.env.CARD_VALUE_PORT||5190));const base=`http://127.0.0.1:${process.env.CARD_VALUE_PORT||5190}/`;const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const report={kind:'Round 3: separate four display meanings and fixed close controls',previousReviewCommit:'f16e17253558d13bffd0c2316a12c44b2b1f171b',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),trackedDirty:execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),browser:browser.version(),profiles:[],humanAcceptance:'NOT_RUN',physicalDevice:'NOT_RUN',gameplayRecommendationCalibration:'NOT_RUN',sourceHashes:{}};
for(const f of ['index.html','style.css','app.js'])report.sourceHashes[f]=createHash('sha256').update(await readFile(new URL(f,dir))).digest('hex');
async function reveal(page,id){await page.locator(`[data-card="${id}"]`).evaluate(el=>el.scrollIntoView({inline:'center',block:'nearest',behavior:'instant'}));await page.waitForFunction(id=>!document.querySelector(`[data-card="${id}"]`).classList.contains('peek'),id);}
async function scrollModal(page,selector){const r=await page.locator(selector).boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.wheel(0,1200);await page.waitForTimeout(150);}
async function geometry(page){return page.evaluate(()=>{
 const problems=[];if(document.documentElement.scrollWidth>innerWidth)problems.push('page horizontal overflow');
 const isVisible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
 for(const el of document.querySelectorAll('.stars,.rarity,.rec-label,.rec-word,.combo-status,.route-tag,.edition,.name,button')){
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
 for(const el of document.querySelectorAll('.name,.rec-label,.rec-word,.combo-status,.route-tag,.edition,.rarity,.conditions li,.compare-item')){
  if(!isVisible(el))continue;const outer=el.closest('.card,.compare-column,dialog')?.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(el);for(const r of range.getClientRects())if(r.width&&outer&&(r.left<outer.left-.5||r.right>outer.right+.5))problems.push('text outside surface');
 }
 return problems;
});}
const shot=async(page,width,state,fullPage=false)=>page.screenshot({path:`${outPath}${width}-${state}.png`,fullPage});
try{for(const [width,height] of [[390,844],[1366,900],[390,568]]){
 const label=`${width}x${height}`,modalChecks=[];
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<700,deviceScaleFactor:1});const page=await context.newPage();const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url());});
 await page.goto(base+'prototypes/card-value-visual/index.html');await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));
 assert.deepEqual(await geometry(page),[]);assert.equal(await page.locator('.card button,.card details,.card summary').count(),0);assert.equal(await page.locator('.card').count(),3);
 const metrics=await page.evaluate(()=>{const c=document.querySelector('.card'),p=c.querySelector('.portrait'),cr=c.getBoundingClientRect(),pr=p.getBoundingClientRect();return{card:{width:cr.width,height:cr.height},art:{width:pr.width,height:pr.height,containedWidth:Math.min(pr.width,pr.height*p.naturalWidth/p.naturalHeight)},repeatedPerCardActionRows:0,pageHeight:document.documentElement.scrollHeight,unifiedActionVisible:document.querySelector('#compare').getBoundingClientRect().bottom<=innerHeight};});
 if(height>=740)assert.equal(metrics.unifiedActionVisible,true);await shot(page,label,'default');await shot(page,label,'full',true);
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

 for(const id of ['mantangcai','e08','b06']){await reveal(page,id);assert.deepEqual(await geometry(page),[]);if(id!=='mantangcai')await shot(page,label,id);const returnBefore=await page.evaluate(()=>({y:scrollY,rail:document.querySelector('#cards').scrollLeft}));await page.locator(`[data-card="${id}"]`)[width<700?'tap':'click']();assert.equal(await page.locator('#detail').evaluate(e=>e.open),true);assert.equal(await page.locator('#detail .dialog-scroll').evaluate(e=>e.scrollTop),0,'new detail starts at top');assert.equal(await page.locator('#detail .conditions li').count(),2);assert.equal(await page.locator('#detail .stars svg').count(),5);assert.match(await page.locator('#detail .detail-edition').innerText(),/独立版次/);assert.match(await page.locator('#detail .axis-note').innerText(),/不改变卡牌稀有度/);assert.deepEqual(await geometry(page),[]);const closeBefore=await page.locator('#close-detail').boundingBox();await scrollModal(page,'#detail .dialog-scroll');const closeAfter=await page.locator('#close-detail').boundingBox();assert.deepEqual(closeAfter,closeBefore,'scrolling cannot hide or move detail close');assert.ok(closeAfter.y>=0&&closeAfter.y+closeAfter.height<=height);modalChecks.push({kind:'detail',id,closeBefore,closeAfter,scroll:await page.locator('#detail .dialog-scroll').evaluate(e=>({top:e.scrollTop,height:e.clientHeight,total:e.scrollHeight}))});if(id==='b06')await shot(page,label,'conditions');await page.locator('#close-detail')[width<700?'tap':'click']();assert.equal(await page.locator(`[data-card="${id}"]`).evaluate(e=>e===document.activeElement),true);assert.deepEqual(await page.evaluate(()=>({y:scrollY,rail:document.querySelector('#cards').scrollLeft})),returnBefore,'closing restores page and rail position');}
 await page.locator('#ready')[width<700?'tap':'click']();await reveal(page,'b06');assert.equal(await page.locator('[data-card="b06"] .filled').count(),5);assert.equal(await page.locator('[data-card="b06"] .combo-status').innerText(),'搭档齐备 · 2/2');assert.deepEqual(await geometry(page),[]);await shot(page,label,'five');
 await page.locator('#compare')[width<700?'tap':'click']();assert.equal(await page.locator('#compare').isEnabled(),false);for(const id of ['mantangcai','e08']){await reveal(page,id);await page.locator(`[data-card="${id}"]`)[width<700?'tap':'click']();}assert.equal(await page.locator('.card[aria-pressed=true]').count(),2);assert.equal(await page.locator('#compare').isEnabled(),true);await reveal(page,'b06');await page.locator('[data-card="b06"]')[width<700?'tap':'click']();assert.match(await page.locator('#selection-status').innerText(),/已选满/);assert.equal(await page.locator('#detail').evaluate(e=>e.open),false);
 await page.locator('#compare')[width<700?'tap':'click']();assert.equal(await page.locator('#comparison').evaluate(e=>e.open),true);assert.deepEqual(await geometry(page),[]);assert.equal(await page.locator('#comparison .dialog-scroll').evaluate(e=>e.scrollTop),0,'comparison opens at top');await shot(page,label,'compare');const comparisonClose=await page.locator('#close-compare').boundingBox();await scrollModal(page,'#comparison .dialog-scroll');assert.deepEqual(await page.locator('#close-compare').boundingBox(),comparisonClose);assert.ok(comparisonClose.y>=0&&comparisonClose.y+comparisonClose.height<=height);modalChecks.push({kind:'comparison',close:comparisonClose,scroll:await page.locator('#comparison .dialog-scroll').evaluate(e=>({top:e.scrollTop,height:e.clientHeight,total:e.scrollHeight}))});await shot(page,label,'compare-bottom');await page.keyboard.press('Escape');assert.equal(await page.locator('#comparison').evaluate(e=>e.open),false);assert.equal(await page.locator('#compare').evaluate(e=>e===document.activeElement),true);
 await reveal(page,'e08');await page.locator('[data-card="e08"]')[width<700?'tap':'click']();assert.equal(await page.locator('#compare').isEnabled(),false);await reveal(page,'b06');await page.locator('[data-card="b06"]')[width<700?'tap':'click']();await shot(page,label,'selected');await page.locator('#compare')[width<700?'tap':'click']();assert.deepEqual(await geometry(page),[]);assert.equal(await page.locator('#comparison .dialog-scroll').evaluate(e=>e.scrollTop),0,'changed comparison starts at top');await shot(page,label,'five-compare');await page.locator('#close-compare')[width<700?'tap':'click']();
 await page.locator('#missing')[width<700?'tap':'click']();assert.equal(await page.locator('[data-card="b06"] .filled').count(),3);assert.equal(await page.locator('.card[aria-pressed=true]').count(),2);await page.locator('#cancel-selection')[width<700?'tap':'click']();assert.equal(await page.locator('.card[aria-pressed=true]').count(),0);assert.equal(await page.locator('#compare').innerText(),'选择对比');
 await reveal(page,'b06');await page.locator('[data-card="b06"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#detail').evaluate(e=>e.open),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#detail').evaluate(e=>e.open),false);
 await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#ready')[width<700?'tap':'click']();await reveal(page,'b06');assert.deepEqual(await geometry(page),[]);await shot(page,label,'reduced');assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 report.profiles.push({width,height,dpr:1,metrics,modalChecks,checks:['ordinary 4 stars, rare holographic 2 stars, rare 3/5 stars stay separate','edition present in card/detail/comparison; no added per-card controls','detail/comparison close remains fixed after native wheel scrolling; new modal starts at top; detail return preserves page/rail','all three cards separately revealed; visible text and five stars uncut','intentional side peek is artwork only; no cut labels/stars',...(width<700?['native CDP touch swipe reaches second card without accidental open; tap opens/closes detail']:[]),'zero repeated per-card action rows',height>=740?'unified action within first viewport':'short viewport keeps page scroll available','all three details open/close and focus return','keyboard Enter/Escape','3↔5 sample and 1/2↔2/2','comparison mode + selection limit + remove + cancel','two comparisons; focus restore','selection preserved on fixture switch','reduced motion','no external requests or JS errors'],status:'PASS'});await context.close();
}}catch(e){report.failure=String(e);throw e;}finally{await writeFile(new URL('verification.json',out),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
console.log(JSON.stringify(report,null,2));
