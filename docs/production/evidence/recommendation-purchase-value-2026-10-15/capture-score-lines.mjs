// Targeted completion of the previously misframed score screenshot; no transactions.
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {waitScene,tapUI} from '../../../../harness/ui.mjs';

const out=process.env.VALUE_SCORE_OUTPUT??'/tmp/recommendation-value-score-lines';
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:'/tmp/value-score-capture-vite',server:{host:'127.0.0.1',port:5494,strictPort:true},logLevel:'error'});
await server.listen();
const {fixture,held,stock}=await server.ssrLoadModule('/analysis/recommendation-cost-lifetime/model.ts');
const {makeCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const source=JSON.parse(await readFile(process.env.VALUE_SOURCE_REPORT??new URL('./browser/report.json',import.meta.url),'utf8')).sourceHashes;
const hashes=async()=>Object.fromEntries(await Promise.all(Object.keys(source).map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')])));
assert.deepEqual(await hashes(),source);
const report={scope:'Only score-line visibility and read-only state preservation; supplements the completed 208aebbb dual-viewport matrix.',sourceHashes:source,cases:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try{
 for(const [width,height] of [[1366,768],[390,844]]){
  const touch=width<500,context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),p=await context.newPage();
  const dom=loc=>touch?loc.tap():loc.click();
  const snap=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return{state:s.run.state,journal:s.run.journal,slots:await s.storage.read()};});
  p.on('dialog',d=>d.accept());
  await p.goto('http://127.0.0.1:5494/?harness=1');await waitScene(p,'title');
  const s=held(fixture('straight',8),['c04','jiedongfeng','e11','e01','e04']);
  s.jokers[0].growth={heat:{n:'100',d:'1'}};s.jokers[0].edition='foil';s.jokers[0].paidPrice=6;s.jokers[2].growth={coefficient:{n:'3',d:'2'}};
  const o=stock(s,'f06');
  await dom(p.locator('.run-menu-toggle'));const section=p.getByText('进度与存档',{exact:true}).locator('..');
  if(!await section.evaluate(e=>e.open))await dom(section.locator('summary'));
  const chooser=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));
  await(await chooser).setFiles({name:'score-lines.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});
  await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop')?.ready);
  const before=await snap();await tapUI(p,'shop','offer/'+o.offerId,touch);
  const card=p.locator('.shop-comparison-dialog .shop-compare-slot').first();await card.waitFor();await dom(card.locator('summary'));
  const geometry=await card.locator('details p').evaluate(async e=>{
   const value=e.textContent,start=value.indexOf('路线条件手'),lineEnd=value.indexOf('\n',start),end=lineEnd<0?value.length:lineEnd;
   if(start<0)throw Error('missing score line: '+value);
   // The dialog wraps numeric tokens in spans, so a line crosses text nodes.
   const point=index=>{const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let offset=0;
    while(walker.nextNode()){const node=walker.currentNode;if(index<=offset+node.length)return[node,index-offset];offset+=node.length;}
    throw Error('text offset outside paragraph');};
   const range=document.createRange();range.setStart(...point(start));range.setEnd(...point(end));
   const scroll=e.closest('.dialog-scroll'),candidate=document.querySelector('.shop-compare-candidate');
   const visibleTop=Math.max(scroll.getBoundingClientRect().top,candidate.getBoundingClientRect().bottom)+8;
   scroll.scrollTop+=range.getBoundingClientRect().top-visibleTop;
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   const rect=range.getBoundingClientRect(),bottom=scroll.getBoundingClientRect().bottom;
   return{text:range.toString(),top:rect.top,bottom:rect.bottom,visibleTop,visibleBottom:bottom,scrollTop:scroll.scrollTop};
  });
  assert.ok(geometry.text.includes('2805')&&geometry.text.includes('2722'));
  assert.ok(geometry.top>=geometry.visibleTop-1&&geometry.bottom<=geometry.visibleBottom,'whole score line must be visible below the pinned candidate');
  const file=width+'-replacement-score-line.png';await p.screenshot({path:out+'/'+file,scale:'css'});
  assert.deepEqual(await snap(),before);report.cases.push({width,height,geometry,screenshot:file,stateJournalStorageUnchanged:true,status:'PASS'});
  await context.close();
 }
 assert.deepEqual(await hashes(),source);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report));
