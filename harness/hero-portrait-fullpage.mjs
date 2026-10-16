import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {tapUI,openSelector} from './ui.mjs';

const phase=process.env.PORTRAIT_PHASE??'after';
const out=process.env.PORTRAIT_OUT??'shots/hero-portrait-fullpage/'+phase;
await mkdir(out,{recursive:true});
const root=resolve('dist'),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.woff':'font/woff','.ogg':'audio/ogg','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname==='/'?'/index.html':new URL(req.url,'http://local').pathname));if(!path.startsWith(root+'\\')){res.writeHead(403).end();return;}res.setHeader('Content-Type',types[extname(path)]??'application/octet-stream');res.end(await readFile(path));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(5594,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const ids=['amo','touye','laohuan','erxiang','azao','xiemu'];
const report={phase,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),scope:'Local Windows Chromium software viewports; actual selector and DOM inputs. No gameplay, physical-device or human visual acceptance.',cases:[],errors:[]};
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {run:c?{state:c.state,journal:c.journal,stored:await c.store.read()}:null,local:JSON.stringify(localStorage)};});
const geometry=p=>p.locator('.hero-portrait-view').evaluate(d=>{
 const image=d.querySelector('img'),frame=d.querySelector('.dialog-portrait-art'),content=d.querySelector('.dialog-content'),close=d.querySelector('.dialog-close');
 const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
 const s=getComputedStyle(image),f=getComputedStyle(frame);
 return {viewport:{width:innerWidth,height:innerHeight},dialog:rect(d),image:rect(image),frame:rect(frame),close:rect(close),content:rect(content),scroll:{height:content.scrollHeight,client:content.clientHeight,top:content.scrollTop},natural:{width:image.naturalWidth,height:image.naturalHeight},style:{fit:s.objectFit,frameBorder:f.borderWidth,frameBackground:f.backgroundColor,dialogBackground:getComputedStyle(d).backgroundColor},text:d.innerText};
});
async function ready(p){await p.waitForFunction(()=>{const i=document.querySelector('.hero-portrait-view img');return i&&!i.hidden&&i.complete&&i.naturalWidth>256;});}
async function check(p,label){const g=await geometry(p);if(phase==='after'){
 assert.ok(Math.abs(g.image.width/g.image.height-g.natural.width/g.natural.height)<.002,label+' natural image ratio');
 assert.equal(g.style.frameBorder,'0px',label+' no inner border');
 assert.equal(g.style.frameBackground,'rgb(0, 0, 0)',label+' black image surround');
 assert.equal(g.style.dialogBackground,'rgb(0, 0, 0)',label+' black fullscreen');
 assert.ok(g.close.height>=48&&g.close.x>=0&&g.close.right<=g.viewport.width+1&&g.close.y>=0&&g.close.bottom<=g.viewport.height+1,label+' reachable return');
 assert.ok(g.dialog.x>=0&&g.dialog.right<=g.viewport.width+1&&g.dialog.y>=0&&g.dialog.bottom<=g.viewport.height+1,label+' dialog in viewport');
 assert.ok(g.scroll.height>=g.scroll.client-1,label+' content scroll range');
 const scale=Math.min(g.content.width/g.natural.width,g.content.height/g.natural.height);
 assert.ok(Math.abs(g.image.width-g.natural.width*scale)<2&&Math.abs(g.image.height-g.natural.height*scale)<2,label+' maximum contain size');
 assert.ok(g.image.right<=g.close.x||g.image.bottom<=g.close.y||g.image.x>=g.close.right||g.image.y>=g.close.bottom,label+' close does not cover artwork');
 assert.ok(!/技能|卡牌图鉴/.test(g.text),label+' image-only viewer');
 }
 return g;
}
try {
 for(const spec of [{width:320,height:640},{width:390,height:740},{width:740,height:390},{width:1366,height:768}]){
  const touch=spec.width<640,context=await browser.newContext({viewport:spec,hasTouch:touch}),p=await context.newPage();
  p.setDefaultTimeout(20000);p.on('pageerror',e=>report.errors.push(String(e)));
  await p.goto('http://127.0.0.1:5594/?harness=1&seed=portrait-fullpage');await openSelector(p,touch);const before=await saved(p);
  for(const [index,id] of ids.entries()){
   await tapUI(p,'character-select','character/'+id,touch);await tapUI(p,'character-select','opening/portrait-full',touch);await ready(p);
   const label=`${spec.width}x${spec.height}-${id}`,row={label,id,...await check(p,label)};report.cases.push(row);
   await p.screenshot({path:`${out}/${label}.png`,scale:'css'});
   if(phase==='after'){
    await p.locator('.dialog-content').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    const bottom=await geometry(p);assert.ok(bottom.close.bottom<=spec.height+1,label+' return after scroll');
    assert.ok(bottom.image.bottom<=bottom.content.bottom+1||bottom.scroll.height<=bottom.scroll.client,label+' full bottom is reachable');
    row.scrollBottom=bottom.scroll;
    await p.keyboard.press('Tab');assert.ok(await p.locator('.hero-portrait-view').evaluate(d=>d.contains(document.activeElement)),label+' modal focus remains inside');
   }
   if(index%3===0)await p.keyboard.press('Escape');
   else if(index%3===1){await p.locator('.dialog-close').focus();await p.keyboard.press('Enter');}
   else if(touch)await p.locator('.dialog-close').tap();else await p.locator('.dialog-close').click();
   await p.waitForFunction(()=>!document.querySelector('.hero-portrait-view[open]'));await p.waitForTimeout(370);
   if(phase==='after')assert.equal(await p.evaluate(()=>document.activeElement?.tagName),'CANVAS',label+' focus returns to selector');
   assert.equal(await p.evaluate(()=>window.__harness.game.scene.getScene('character-select').selectedId),id,label+' selection stays');
   assert.deepEqual(await saved(p),before,label+' read-only save');row.close=['Escape','Enter','click/touch'][index%3];row.saveUnchanged=true;row.status='PASS';
  }
  if(phase==='after'&&spec.width===390){
   await tapUI(p,'character-select','opening/portrait-full',touch);await ready(p);
   for(const size of [{width:390,height:528},{width:390,height:360},{width:740,height:390},{width:1920,height:1080},{width:320,height:640},{width:390,height:740}]){
    await p.setViewportSize(size);await p.waitForTimeout(160);const g=await check(p,'resize-'+size.width+'x'+size.height);report.cases.push({label:'resize-'+size.width+'x'+size.height,...g,status:'PASS'});
   }
   await p.evaluate(()=>{for(const [key,val] of Object.entries({top:20,right:12,bottom:34,left:12}))document.documentElement.style.setProperty('--safe-'+key,val+'px');});
   await p.waitForTimeout(100);const g=await check(p,'safe-area');assert.ok(g.close.y>=20&&g.close.right<=390-12+1&&g.image.bottom<=740-34+1);report.cases.push({label:'safe-area',...g,status:'PASS'});
   await p.keyboard.press('Escape');await p.waitForTimeout(370);assert.deepEqual(await saved(p),before);
  }
  await context.close();console.log('PASS',phase,spec.width,spec.height);
 }
 if(phase==='after'){
  const context=await browser.newContext({viewport:{width:390,height:740},hasTouch:true}),p=await context.newPage();let fail=true;
  await p.route('**/amo.portrait.webp*',route=>fail?route.fulfill({status:404,body:''}):route.continue());
  await p.goto('http://127.0.0.1:5594/?harness=1');await openSelector(p,true);const before=await saved(p);
  await tapUI(p,'character-select','character/amo',true);await tapUI(p,'character-select','opening/portrait-full',true);
  await p.getByRole('button',{name:'重试高清',exact:true}).waitFor();
  assert.equal(await p.locator('.hero-portrait-view img').evaluate(i=>i.hidden),false,'HD failure keeps same-hero thumbnail');
  fail=false;await p.getByRole('button',{name:'重试高清',exact:true}).tap();await ready(p);report.cases.push({label:'HD-failure-retry',...await check(p,'HD recovery'),status:'PASS'});
  await p.keyboard.press('Escape');await p.waitForTimeout(370);assert.deepEqual(await saved(p),before);await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}
finally {await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report.status,report.error??'');await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
