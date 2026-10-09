import assert from 'node:assert/strict';
import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
import {chromium} from '/workspace/dachoupai/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {tapUI,waitScene,openSelector,confirmHeroRoute,tapMenuAction} from '/workspace/dachoupai/harness/ui.mjs';
import {snapshotSource} from '/workspace/dachoupai/scripts/check-runner.mjs';
const root='/workspace/dachoupai',out='/tmp/keepsake-native';await mkdir(out,{recursive:true});
const server=await createServer({root,mode:'e2e',server:{port:5497,host:'127.0.0.1',strictPort:true},logLevel:'error'});await server.listen();
const {applyCommand}=await server.ssrLoadModule('/src/domain/run.ts'),{evaluateR2Hand}=await server.ssrLoadModule('/src/domain/evaluateR2.ts');
const report={testedCommit:snapshotSource(root).head,before:snapshotSource(root),profiles:[],errors:[],physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN',scope:'One known seed normal new game, actual public cards and mouse/touch, canonical saved state checked. No seed sweep or game state mutation.'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{
for(const [width,height,touch] of [[1366,768,false],[390,740,true]]){
 const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:touch}),page=await ctx.newPage(),profile={width,height,touch,transactions:[],observations:[]};report.profiles.push(profile);
 page.setDefaultTimeout(18000);page.on('pageerror',e=>report.errors.push(String(e)));page.on('dialog',d=>d.accept());await page.addInitScript(()=>localStorage.setItem('dachoupai-first-chapter-guide-v1',JSON.stringify({disabled:true,skipped:[]})));
 const click=loc=>loc[touch?'tap':'click']();
 const state=()=>page.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal};});
 const ready=key=>page.waitForFunction(key=>{const g=window.__harness.game,s=g.scene.getScene(key);return g.scene.isActive(key)&&s.ready&&!s.presentationActive&&!s.playing;},key);
 const transaction=async(label,input,key='shop',count=1)=>{const before=await state();await input();await page.waitForFunction(n=>window.__harness.game.registry.get('runController').state.commandSeq>=n,before.state.commandSeq+count);if(key==='table')await page.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||s.scene.isActive()&&s.ready&&!s.playing&&!s.presentation;});else await ready(key);const after=await state(),commands=after.journal.filter(c=>c.expectedSeq>=before.state.commandSeq);assert.equal(commands.length,count);let expected=before.state;for(const c of commands){const r=applyCommand(expected,c);assert.ok(r.ok);expected=r.state;}assert.deepEqual(after.state,expected);profile.transactions.push({label,commands,state:after.state});return after.state;};
 const observe=async(label)=>{const before=await state(),box=page.locator('.build-keepsake');await box.waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.build-keepsake img')].every(i=>i.complete&&i.naturalWidth>0));const facts=await box.evaluate(el=>({text:el.innerText,width:el.getBoundingClientRect().width,scroll:el.scrollWidth,images:[...el.querySelectorAll('img')].map(i=>({src:i.src,width:i.naturalWidth,height:i.naturalHeight})),values:[...el.querySelectorAll('.build-keepsake-growth')].map(c=>({id:c.dataset.instanceId,value:c.querySelector('strong').textContent,cause:c.querySelector('.build-keepsake-cause').textContent,read:c.querySelector('.build-keepsake-read')?.textContent}))}));assert.ok(facts.scroll<=facts.width+1);assert.ok(facts.text.includes('二响'));assert.deepEqual(await state(),before);profile.observations.push({label,...facts});await page.screenshot({path:out+'/'+label+'-'+width+'.png',scale:'css'});return facts;};
 await page.goto('http://127.0.0.1:5497/?harness=1&seed=group-natural-17');await openSelector(page,touch);await tapUI(page,'character-select','character/erxiang',touch);await confirmHeroRoute(page,touch);await ready('shop');let s=(await state()).state;
 profile.initial={gold:s.gold,offers:s.shop.offers.map(o=>({id:o.offerId,definitionId:o.definitionId}))};const offer=s.shop.offers.find(o=>o.definitionId==='b10');assert.ok(offer,'known seed has actual b10 stock');await tapUI(page,'shop','offer/'+offer.offerId,touch);s=await transaction('buy actual growth source',()=>click(page.getByRole('button',{name:/^邀请 · 4 金$/})));assert.equal(s.jokers.length,1);
 await tapUI(page,'shop','action/build',touch);await click(page.getByRole('button',{name:'继续培养',exact:true}));const zero=await observe('shop-zero');assert.ok(zero.values[0].value.includes('+0'));await click(page.getByRole('button',{name:'关闭',exact:true}));
 s=await transaction('enter actual stage',()=>tapUI(page,'shop','action/start-stage',touch),'table',2);await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.cardViews.every(c=>!c.dealing&&!s.tweens.isTweening(c.container));});
 // Newly accessible passive-role avatar, then existing read-only journey route.
 await tapUI(page,'game','hero/details',touch);await click(page.getByRole('button',{name:'培养手记',exact:true}));await observe('table-before');await click(page.getByRole('button',{name:'关闭',exact:true}));
 const eligible=new Set(['pair','two-pair','three-kind','full-house','four-kind','five-kind','flush-house','flush-five']);
 for(let turn=0;turn<3&&s.phase==='await-input';turn++){
  await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.every(c=>!c.dealing&&!s.tweens.isTweening(c.container));});
  const visible=await page.evaluate(()=>window.__harness.game.scene.getScene('game').cardViews.filter(c=>c.container.visible).map(c=>c.card));let best;
  for(let mask=1;mask<1<<visible.length;mask++){const cards=visible.filter((_,i)=>mask>>i&1);if(cards.length>5)continue;const hand=evaluateR2Hand(cards,{});if(!eligible.has(hand.type))continue;if(!best||['pair','two-pair','three-kind','full-house','four-kind','five-kind','flush-house','flush-five'].indexOf(hand.type)>['pair','two-pair','three-kind','full-house','four-kind','five-kind','flush-house','flush-five'].indexOf(best.hand.type))best={cards,hand};}
  if(!best){if(turn===0){const chosen=visible.slice(0,3);for(const c of chosen)await tapUI(page,'game','card/'+c.id,touch);s=await transaction('real discard to find a group',()=>tapUI(page,'game','action/discard',touch),'table');continue;}break;}
  profile.publicChoice={ids:best.cards.map(c=>c.id),type:best.hand.type};for(const c of best.cards)await tapUI(page,'game','card/'+c.id,touch);s=await transaction('play real visible group',()=>tapUI(page,'game','action/play',touch),'table');if(s.jokers[0].growth.heat?.n!=='0'&&s.jokers[0].growth.heat)break;
 }
 assert.ok(BigInt(s.jokers[0].growth.heat?.n??'0')>0n,'normal saved growth observed');profile.savedGrowth=s.jokers[0].growth;
 if(s.phase==='stage-cleared'){await ready('intermission');await tapUI(page,'intermission','action/last-hand',touch);await click(page.getByRole('button',{name:'查看培养路线',exact:true}));}else{await tapUI(page,'game','hero/details',touch);await click(page.getByRole('button',{name:'培养手记',exact:true}));}
 const grown=await observe('saved-growth');assert.ok(grown.values[0].cause.includes('0 → 10'));assert.ok(grown.values[0].value.includes('+10'));assert.ok(grown.values[0].read.includes('实际读取 +0 热度'));
 // Read-only current hand again, then actual continuation; at most two additional submitted hands.
 await click(page.getByRole('button',{name:'关闭',exact:true}));
 for(let turn=0;turn<2&&s.phase==='await-input';turn++){
  await page.waitForFunction(()=>{const scene=window.__harness.game.scene.getScene('game');return scene.ready&&!scene.playing&&scene.cardViews.every(c=>!c.dealing&&!scene.tweens.isTweening(c.container));});
  const cards=await page.evaluate(()=>window.__harness.game.scene.getScene('game').cardViews.filter(c=>c.container.visible).map(c=>c.card));let choice;const order=['high-card','pair','two-pair','three-kind','straight','flush','full-house','four-kind','straight-flush','five-kind','flush-house','flush-five'];
  for(let mask=1;mask<1<<cards.length;mask++){const picked=cards.filter((_,i)=>mask>>i&1);if(picked.length>5)continue;const hand=evaluateR2Hand(picked,{});if(!choice||order.indexOf(hand.type)>order.indexOf(choice.type))choice={cards:picked,type:hand.type};}
  for(const c of choice.cards)await tapUI(page,'game','card/'+c.id,touch);s=await transaction('normal continuation hand',()=>tapUI(page,'game','action/play',touch),'table');
 }
 assert.equal(s.phase,'stage-cleared');await ready('intermission');await tapUI(page,'intermission','action/last-hand',touch);await click(page.getByRole('button',{name:'查看培养路线',exact:true}));await observe('intermission-growth');await click(page.getByRole('button',{name:'关闭',exact:true}));
 s=await transaction('saved next shop',()=>tapUI(page,'intermission','action/continue-stage',touch));await tapUI(page,'shop','action/build',touch);await observe('next-shop-growth');
 if(touch){await page.setViewportSize({width:320,height:740});await observe('narrow-320');const before=await state();await page.route('**/assets/handdrawn-p08/characters/erxiang.selection.webp',r=>r.abort());await page.route('**/assets/handdrawn-p08/jokers/b10*',r=>r.abort());await page.evaluate(()=>{for(const img of document.querySelectorAll('.build-keepsake img'))img.dispatchEvent(new Event('error'));});assert.equal(await page.locator('.build-keepsake img:visible').count(),0);assert.deepEqual(await state(),before);await page.screenshot({path:out+'/missing-preview-320.png',scale:'css'});profile.missingPreview='text preserved; actual image error handling, no state change';}
 await ctx.close();
}
assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);report.stack=e.stack;process.exitCode=1;}
finally{report.after=snapshotSource(root);report.sourceUnchanged=JSON.stringify(report.before)===JSON.stringify(report.after);await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,profiles:report.profiles.map(p=>({width:p.width,observations:p.observations.length,savedGrowth:p.savedGrowth}))}));await browser.close();await server.close();}
