import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,openSelector} from './ui.mjs';
const out='docs/production/evidence/approved-character-art-2026-10-15';
await mkdir(out,{recursive:true});
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const report={head:git('rev-parse','HEAD'),diff:git('diff','--','src/game/HeroIdentity.ts','src/game/HeroExplanation.ts','src/game/HeroClimax.ts'),scope:'Native selection/details for six approved themes only. Attachment pixel inspection, artwork, avatar, preload and climax visual acceptance blocked by download proxy HTTP403.',cases:[]};
const server=await createServer({mode:'e2e',cacheDir:'/tmp/approved-art-themes-vite',optimizeDeps:{noDiscovery:true,include:['phaser']},server:{host:'127.0.0.1',port:5571,strictPort:true},logLevel:'error'});
await server.listen();
const {HERO_CAST}=await server.ssrLoadModule('/src/game/HeroIdentity.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
try {
 for(const [width,height,deviceScaleFactor] of [[1366,768,1],[390,740,3],[320,640,2]]) {
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,hasTouch:width<700,reducedMotion:'reduce'}),page=await context.newPage(),row={width,height,deviceScaleFactor,heroes:[],errors:[],oldFaceRequests:[]};report.cases.push(row);
  page.on('pageerror',e=>row.errors.push(String(e)));page.on('request',r=>{if(/handdrawn-p08\/characters|cast-placeholders/.test(r.url()))row.oldFaceRequests.push(r.url());});
  try {
   await page.goto('http://127.0.0.1:5571/?harness=1');await waitScene(page,'title');await openSelector(page,width<700);
   for(const [id,hero] of Object.entries(HERO_CAST)) {
    await tapUI(page,'character-select','character/'+id,width<700);
    const title=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('character-select');const walk=list=>{for(const o of list){if(o.name==='opening/title')return {text:o.text,visible:o.visible,bounds:o.getBounds()};if(o.list){const r=walk(o.list);if(r)return r;}}};return walk(s.children.list);});
    assert.equal(title.text,hero.title);assert.equal(title.visible,true);assert.ok(title.bounds.x>=0&&title.bounds.x+title.bounds.width<=width&&title.bounds.y+title.bounds.height<=height,JSON.stringify(title));
    const before=await page.evaluate(()=>JSON.stringify(localStorage));
    await tapUI(page,'character-select','opening/hero-details',width<700);const dialog=page.locator('.hero-explanation[open]');await dialog.waitFor();
    assert.equal(await dialog.locator('.hero-theme').innerText(),hero.title);assert.ok((await dialog.innerText()).includes('做什么'));
    if(id==='laohuan')await page.screenshot({path:out+'/'+width+'-theme-details.png',scale:'css'});
    await dialog.getByRole('button',{name:/返回|回到/}).last().click();assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),before);
    row.heroes.push({id,name:hero.name,theme:hero.title,title,detailReadOnly:true});
    if(id==='laohuan')await page.screenshot({path:out+'/'+width+'-theme-selection.png',scale:'css'});
   }
   assert.deepEqual(row.oldFaceRequests,[]);assert.deepEqual(row.errors,[]);row.status='PASS';
  }finally{await context.close();}
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}
finally {await writeFile(out+'/themes-browser.json',JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();console.log(report.status,report.error??'');}
