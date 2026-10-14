import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
import {waitScene,tapUI,confirmHeroRoute} from './ui.mjs';
const output='docs/production/evidence/staged-image-warmup-2026-10-13';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),browser:browser.version(),scope:'Local UI only: title, selector, first shop, entry and save reload; no scoring or complete run.',cases:[]};
const base=process.env.WARMUP_URL??'http://127.0.0.1:5173';
async function run(name,viewport,kind){
 const context=await browser.newContext({viewport,hasTouch:viewport.width<700});const page=await context.newPage();page.setDefaultTimeout(12000);
 const requests=[],errors=[];page.on('request',r=>{if(/assets\/.*\.webp/.test(r.url()))requests.push({url:new URL(r.url()).pathname,at:Date.now()});});page.on('pageerror',e=>errors.push(String(e)));
 let failed=true,firstTransient=true;const touch=viewport.width<700;
 const route=async r=>{
   const url=r.request().url();
   if(kind==='weak'&&/characters|\/court\//.test(url))await new Promise(resolve=>setTimeout(resolve,1800));
   if(kind==='failure'&&failed&&/characters\/amo\./.test(url))return r.fulfill({status:404,body:'controlled missing hero'});
   if(kind==='failure'&&firstTransient&&/characters\/touye.selection/.test(url)){firstTransient=false;return r.abort('failed');}
   return r.continue();
 };await page.route('**/assets/**/*.webp',route);
 try{
   await page.goto(base+'/?harness=1&seed=warmup-local',{waitUntil:'domcontentloaded'});await waitScene(page,'title');
   const titleAt=await page.evaluate(()=>performance.now());assert.ok(titleAt<4500,'title enters before preview timeout');
   if(kind==='weak')await page.locator('[data-image-warmup]').waitFor({state:'visible'});
   await page.screenshot({path:`${output}/${name}-title.png`});
   await tapUI(page,'title','action/title-start',touch);await waitScene(page,'character-select');await tapUI(page,'character-select','character/amo',touch);
   await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select'),walk=list=>{for(const o of list){if(o.name==='action/confirm-character')return o;if(o.list){const found=walk(o.list);if(found)return found;}}};window.__warmupButton=walk(s.children.list);});
   if(kind==='failure'){
     await page.getByRole('button',{name:'重试图片',exact:true}).waitFor({state:'visible'});
     await page.waitForFunction(()=>{const t=window.__harness.game.textures;return !t.exists('selection-portrait-amo')&&!t.exists('opening-portrait-amo');});
     const fallback=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select'),walk=list=>list.some(o=>o.text==='阿'||o.list&&walk(o.list));return walk(s.children.list);});assert.ok(fallback,'missing hero draws real-name initial');
     await page.screenshot({path:`${output}/${name}-fallback.png`});failed=false;
     await page.getByRole('button',{name:'重试图片',exact:true}).click();
   }
   await page.waitForFunction(()=>window.__harness.game.textures.exists('opening-portrait-amo')&&window.__harness.game.textures.exists('selection-portrait-amo'));
   const inputTargetPreserved=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select'),walk=list=>{for(const o of list){if(o.name==='action/confirm-character')return o;if(o.list){const f=walk(o.list);if(f)return f;}}};return window.__warmupButton===walk(s.children.list)&&window.__warmupButton.active;});assert.ok(inputTargetPreserved,'late pictures preserve the existing action target');
   const groupedPortraits=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select');return [...s.portraitTargets].filter(([,t])=>!t.hero).map(([holder,t])=>({id:t.id,insideCard:holder.parentContainer!==s.view.root,visible:holder.visible}));});assert.ok(groupedPortraits.every(p=>p.insideCard&&p.visible),'all six preview pictures stay above the card backing in their hover group');
   await page.screenshot({path:`${output}/${name}-ready.png`});
   const before=requests.length;await tapUI(page,'character-select','character/amo',touch);await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,150)));const hotNewHeroRequests=requests.slice(before).filter(r=>/characters\/amo\./.test(r.url));assert.equal(hotNewHeroRequests.length,0,'loaded hero does not request again');
   await confirmHeroRoute(page,touch);await waitScene(page,'shop');
   const initialShop=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop');return {phase:window.__harness.game.registry.get('runController').state.phase,offerAlpha:s.offerArts.map(a=>a.alpha),artPlaceholders:s.jokerArtTargets.size};});
   await page.screenshot({path:`${output}/${name}-shop.png`});
   const saved=await page.evaluate(()=>JSON.stringify(window.__harness.game.registry.get('runController').state));
   await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length===8);
   await page.locator('[data-image-warmup]').waitFor({state:'hidden'});
   await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.every(v=>!v.dealing));
   const gameBefore=await page.evaluate(()=>JSON.stringify(window.__harness.game.registry.get('runController').state));await page.screenshot({path:`${output}/${name}-table.png`});
   const warmKeys=await page.evaluate(()=>Object.keys(window.__harness.game.textures.list).filter(k=>/^(opening-portrait|selection-portrait|avatar-|p08-court)/.test(k)));
   await page.reload({waitUntil:'domcontentloaded'});await waitScene(page,'title');await tapUI(page,'title','action/title-continue',touch);await waitScene(page,'game');await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').cardViews.length===8);
   assert.equal(await page.evaluate(()=>JSON.stringify(window.__harness.game.registry.get('runController').state)),gameBefore,'normal persisted state survives reload unchanged');assert.deepEqual(errors,[]);
   const amo404Requests=kind==='failure'?requests.filter(r=>/characters\/amo\./.test(r.url)).length:undefined;
   report.cases.push({name,status:'PASS',viewport,kind,titleUsableMs:titleAt,inputTargetPreserved,groupedPortraits,hotNewHeroRequests,warmKeys,initialShop,normalSaveReload:'equal entire run state',shopStateBytes:saved.length,amo404Requests,requests,errors});
 }catch(error){report.cases.push({name,status:'FAIL',error:String(error),requests,errors});await page.screenshot({path:`${output}/${name}-FAIL.png`});throw error;}finally{await context.close();}
}
try{await run('mobile-weak',{width:390,height:740},'weak');await run('pc-failure-retry',{width:1366,height:768},'failure');report.status='PASS';}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}finally{await browser.close();await writeFile(output+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases.map(c=>({name:c.name,status:c.status,error:c.error,titleUsableMs:c.titleUsableMs,initialShop:c.initialShop})),error:report.error},null,2));}
