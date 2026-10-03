/** Two public touch contracts only. Native inputs; no video or GPU claims. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build,preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter,tapUI,openMenuSection} from './ui.mjs';

const dir=process.env.P08_TOUCH_DIR||'shots/p08-touch-closeout';await mkdir(dir,{recursive:true});
const source=createHash('sha256');
for(const path of execFileSync('git',['ls-files','src'],{encoding:'utf8'}).trim().split('\n').sort())source.update(path+'\0').update(await readFile(path)).update('\0');
await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'warn'});
const server=await preview({build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5263,strictPort:true},logLevel:'warn'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={source:source.digest('hex'),build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),browser:browser.version(),renderer:'Canvas',DPR:1,runs:[],physicalDevice:'NOT_RUN',GPU:'NOT_RUN',listening:'NOT_RUN'};
const overlap=(a,b)=>a.x<b.x+b.width-1e-6&&b.x<a.x+a.width-1e-6&&a.y<b.y+b.height-1e-6&&b.y<a.y+a.height-1e-6;
const state=p=>p.evaluate(()=>window.__harness.game.registry.get('runController').state);
try{
 for(const bottom of [0,12,34]){
  const c=await browser.newContext({viewport:{width:844,height:300},deviceScaleFactor:1,reducedMotion:'reduce'}),p=await c.newPage(),r={kind:'short-shop',viewport:{width:844,height:300},safeInset:{top:12,bottom},checks:[]};report.runs.push(r);
  await p.addInitScript(bottom=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--safe-top','12px');document.documentElement.style.setProperty('--safe-bottom',bottom+'px');}),bottom);
  await p.goto('http://127.0.0.1:5263/?harness=1&seed=p04-golden-02');await chooseCharacter(p,'amo');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
  for(const kind of ['jokers','tools','items','jokers']){
   await tapUI(p,'shop','action/shelf-'+kind);await p.waitForFunction(kind=>window.__harness.game.scene.getScene('shop').shelfKind===kind,kind);
   const o=await p.evaluate(()=>{
    const s=window.__harness.game.scene.getScene('shop'),box=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};},dom=o=>{const b=o.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};};
    const walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),all=walk(s.children.list);
    return{layout:s.geometry(),offers:s.visibleOffers().length,toolbar:[...document.querySelectorAll('.run-fullscreen-toggle,.run-menu-toggle')].map(dom),tabs:all.filter(o=>o.name?.startsWith('action/shelf-')).map(box),copy:all.filter(o=>o.name?.startsWith('shop/offer-')).map(o=>({text:o.text,font:o.style.fontSize,bounds:box(o)})),renderer:window.__harness.game.renderer.gl?'WebGL':'Canvas'};
   });
   assert.equal(o.renderer,'Canvas');assert.equal(await p.locator('.run-menu-modal').evaluate(d=>d.open),false,'tab cannot open public menu');
   for(const t of o.toolbar){assert.ok(t.height>=44);assert.ok(o.layout.tabs.y>=t.y+t.height+4);for(const tab of o.tabs)assert.ok(!overlap(tab,t));}
   for(const b of o.layout.shelf){assert.ok(b.y>=o.layout.tabs.y+o.layout.tabs.height+2);assert.ok(b.y+b.height<=300-bottom);for(const a of [...o.toolbar,o.layout.play,o.layout.build,o.layout.reroll])assert.ok(!overlap(b,a));}
   for(const t of o.copy){assert.ok(parseFloat(t.font)>=14);assert.ok(t.bounds.y+t.bounds.height<=300-bottom);for(const a of [...o.toolbar,o.layout.tabs,o.layout.play,o.layout.build,o.layout.reroll])assert.ok(!overlap(t.bounds,a),JSON.stringify({text:t,action:a}));}
   assert.ok(o.layout.play.y+o.layout.play.height<=300-bottom);assert.equal(o.layout.play.height,56);
   if(kind==='jokers'){assert.equal(o.offers,3);r.measured=o;}
  }
  const before=await state(p),id=await p.evaluate(()=>window.__harness.game.scene.getScene('shop').visibleOffers()[0].offerId);
  await tapUI(p,'shop','offer/'+id);await p.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await state(p),before);
  const affordable=await p.evaluate(()=>window.__harness.game.scene.getScene('shop').visibleOffers().find(o=>!window.__harness.game.scene.getScene('shop').purchaseReason(o))?.offerId);assert.ok(affordable);
  await tapUI(p,'shop','offer/'+affordable);await p.getByRole('button',{name:'确认购买',exact:true}).click();await p.waitForFunction(n=>window.__harness.game.registry.get('runController').state.jokers.length===n,before.jokers.length+1);
  const bought=await state(p);assert.equal(bought.jokers.length,before.jokers.length+1);assert.equal(bought.commandSeq,before.commandSeq+1);assert.ok(bought.gold<before.gold);
  if(bottom===34)await p.screenshot({path:dir+'/844-shop-safe34.png'});
  r.checks.push('actual DOM toolbar + all three shelf tabs separated by >=4px','three goods/copy/main action safe at bottom'+bottom,'native tab switching opens correct shelf, no menu interception','card/cancel unchanged save; explicit affordable purchase once');await c.close();
 }
 for(const width of [390,1280]){
  const touch=width===390,c=await browser.newContext({viewport:{width,height:touch?740:720},hasTouch:touch,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await c.newPage(),r={kind:'audio-range',viewport:{width,height:touch?740:720},safeInset:{top:0,bottom:0},input:touch?'native CDP touch':'native mouse/keyboard',checks:[],ranges:[]};report.runs.push(r);
  await p.goto('http://127.0.0.1:5263/?harness=1&seed=p08-touch-audio');await chooseCharacter(p,'amo',touch);await openMenuSection(p,'settings',touch);
  assert.equal(await p.getByLabel('背景音量',{exact:true}).inputValue(),'30');assert.equal(await p.getByLabel('音效音量',{exact:true}).inputValue(),'80');
  const original=await p.evaluate(()=>localStorage.getItem('dachoupai-audio-v2')),run=await state(p),cdp=touch?await c.newCDPSession(p):null;
  for(const [label,bus] of [['背景音量','music'],['音效音量','sfx']]){
   const range=p.getByLabel(label,{exact:true});await range.scrollIntoViewIfNeeded();const b=await range.boundingBox();assert.ok(b.height>=44&&b.width>=44,JSON.stringify(b));
   assert.equal(await range.getAttribute('step'),'1');assert.equal(await range.getAttribute('min'),'0');assert.equal(await range.getAttribute('max'),'100');
   const point=(f,y)=>({x:b.x+b.width*f,y});
   for(const a of [point(.2,b.y+4),point(.8,b.y+b.height-4)])assert.equal(await p.evaluate(({x,y,label})=>document.elementFromPoint(x,y)?.getAttribute('aria-label')===label,{...a,label}),true);
   const low=point(.2,b.y+4),high=point(.8,b.y+4);
   if(touch)await p.touchscreen.tap(low.x,low.y);else await p.mouse.click(low.x,low.y);const vLow=Number(await range.inputValue());
   if(touch)await p.touchscreen.tap(high.x,high.y);else await p.mouse.click(high.x,high.y);const vHigh=Number(await range.inputValue());assert.ok(vHigh>vLow,'off-track native point inputs change value');
   const from=point(.8,b.y+b.height-4),to=point(.3,b.y+b.height-4);
   if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/5,y:from.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   else{await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:5});await p.mouse.up();}
   const vDrag=Number(await range.inputValue());assert.ok(vDrag<vHigh,'off-track native drag changes value');
   await range.focus();await p.keyboard.press('Home');assert.equal(await range.inputValue(),'0');await p.keyboard.press('ArrowRight');assert.equal(await range.inputValue(),'1');
   assert.equal(await p.evaluate(bus=>JSON.parse(localStorage.getItem('dachoupai-audio-v2'))[bus],bus),.01);
   const saved=JSON.parse(original)[bus]*100;await p.keyboard.press('Home');for(let i=0;i<saved;i++)await p.keyboard.press('ArrowRight');assert.equal(await range.inputValue(),String(saved));
   r.ranges.push({label,bounds:b,offTrackY:[low.y,from.y],values:{low:vLow,high:vHigh,drag:vDrag},restored:saved});
  }
  assert.equal(await p.evaluate(()=>localStorage.getItem('dachoupai-audio-v2')),original);assert.deepEqual(await state(p),run);
  if(touch)await p.screenshot({path:dir+'/390-audio-range.png'});
  // A saved user mix must survive full reload, then restore this isolated test's original.
  await p.evaluate(()=>localStorage.setItem('dachoupai-audio-v2',JSON.stringify({version:2,music:.37,sfx:.62})));await p.reload();await openMenuSection(p,'settings',touch);
  assert.equal(await p.getByLabel('背景音量',{exact:true}).inputValue(),'37');assert.equal(await p.getByLabel('音效音量',{exact:true}).inputValue(),'62');await p.evaluate(original=>localStorage.setItem('dachoupai-audio-v2',original),original);await p.reload();
  assert.equal(await p.evaluate(()=>localStorage.getItem('dachoupai-audio-v2')),original);
  r.checks.push('actual input >=44px; native point/drag outside visible center track','step1/min0/max100/aria keyboard Home/ArrowRight','fresh30/80; saved37/62 reload intact; temporary settings restored','audio inputs do not alter run');await c.close();
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,runs:report.runs.map(r=>({kind:r.kind,viewport:r.viewport,checks:r.checks}))},null,2));}
