/** Actual saved-event scene path and exact stage bytes; no scoring/timing changes. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {waitScene,tapUI} from './ui.mjs';

const out='docs/production/evidence/climax-source-assets-2026-10-17';await mkdir(out,{recursive:true});
const manifest=JSON.parse(await readFile('public/assets/handdrawn-climax/manifest.json','utf8'));
const paths=new Set(manifest.assets.map(a=>'/'+a.path));
const server=await createServer({mode:'e2e',cacheDir:'/tmp/climax-source-assets-vite',server:{host:'127.0.0.1',port:5592,strictPort:true},logLevel:'error'});await server.listen();
const {heroClimaxFixture,energySend}=await server.ssrLoadModule('/harness/fixtures/hero-climax.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser:browser.version(),scope:'Validator-approved controlled owned-card fixture, actual import/select/play/highlight path. Exact native source texture and HTTP bytes, complete state/journal/storage retained. Software Chromium; no physical/human/natural-rate claim.',cases:[]};
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
const settled=p=>p.waitForFunction(()=>{const game=window.__harness.game,s=game.scene.getScene('game');return game.scene.isActive('intermission')||s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
try{
 for(const spec of [{width:1366,height:900,kind:'multiply'},{width:390,height:844,kind:'multiply'},{width:740,height:320,kind:'multiply'}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},hasTouch:spec.width<800,deviceScaleFactor:1}),page=await context.newPage(),row={...spec,errors:[],requests:[],responses:[]},responses=[];report.cases.push(row);
  page.on('pageerror',e=>row.errors.push(String(e)));page.on('dialog',d=>d.accept());page.setDefaultTimeout(25000);
  page.on('request',r=>{if(paths.has(new URL(r.url()).pathname))row.requests.push(r.url());});
  page.on('response',r=>{if(paths.has(new URL(r.url()).pathname))responses.push(r.body().then(bytes=>row.responses.push({url:r.url(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})));});
  try{
   await page.goto('http://127.0.0.1:5592/?harness=1');await waitScene(page,'title');const fixture=heroClimaxFixture(spec.kind),checkpoint=makeCheckpoint(fixture.state,[]);assert.ok(readCheckpoint(checkpoint).ok);
   await page.locator('.run-menu-toggle').click();const section=page.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'climax-source-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});
   await waitScene(page,'game');await settled(page);assert.deepEqual((await saved(page)).state,fixture.state);const intro=page.getByRole('button',{name:'开始出牌',exact:true});if(await intro.count())await intro.click();if(await page.locator('.detail-dialog[open]').count())await page.getByRole('button',{name:'关闭',exact:true}).click();
   for(const id of fixture.selectedIds)await tapUI(page,'game','card/'+id,spec.width<800);
   if(fixture.assistIds.length){await tapUI(page,'game','selection/assist-change',spec.width<800);await page.locator('.amo-assist-option').filter({has:page.locator('button[aria-label="选择助攻 2♣ 2♠"]')}).locator('button').click();await page.waitForFunction(ids=>JSON.stringify(window.__harness.game.scene.getScene('game').assistIds)===JSON.stringify(ids),fixture.assistIds);}
   const action=fixture.assistIds.length?{type:'PlayAssistedHand',selectedIds:fixture.selectedIds,assistIds:fixture.assistIds}:{type:'PlayHand',selectedIds:fixture.selectedIds};
   const expected=energySend(fixture.state,action);await tapUI(page,'game','action/play',spec.width<800);
   await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').heroClimax?.group.getData('phase')==='strike');
   row.highlight=await page.evaluate(()=>{
    const scene=window.__harness.game.scene.getScene('game'),group=scene.heroClimax.group,walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),objects=walk(group.list),image=objects.find(o=>o.name==='hero/climax-source'),id=group.getData('benefit').definitionId;
    const key='climax-source/'+id,texture=scene.textures.exists(key)?scene.textures.get(key).getSourceImage():null;
    return {id,sourceKey:image?.texture?.key,natural:texture?[texture.naturalWidth,texture.naturalHeight]:null,bounds:image?.getBounds(),phase:group.getData('phase')};
   });
   assert.deepEqual((await saved(page)).state,expected);const record=manifest.assets.find(a=>a.id===row.highlight.id);assert.ok(record);assert.deepEqual(row.highlight.natural,[record.width,record.height]);
   // Current production composition hides the source in very short landscape; loading still obeys the same budget.
   if(spec.height>=450)assert.equal(row.highlight.sourceKey,'climax-source/'+row.highlight.id);
   await page.screenshot({path:out+'/'+spec.width+'-'+spec.kind+'-native.png'});await settled(page);await Promise.all(responses);assert.equal(row.requests.length,1);assert.equal(row.responses.length,1);assert.equal(row.responses[0].bytes,record.bytes);assert.equal(row.responses[0].sha256,record.sha256);assert.ok(record.bytes<=96*1024);assert.equal(await page.evaluate(()=>window.__harness.game.scene.getScene('game').climaxArtAbort?.signal.aborted),true);
   const final=await saved(page);assert.deepEqual(final.state,expected);await writeFile(out+'/'+spec.width+'-'+spec.kind+'-saved.json',JSON.stringify(final));await page.reload();await waitScene(page,'title');assert.deepEqual(await saved(page),final);assert.deepEqual(row.errors,[]);row.savedAndColdRestore='PASS';row.status='PASS';
  }catch(e){row.status='FAIL';row.error=String(e.stack);await page.screenshot({path:out+'/'+spec.width+'-native-FAIL.png'}).catch(()=>{});throw e;}
  finally{await context.close();}
 }
 // Inspect the complete stage composition beside its untouched detail at the same display size.
 {
  const page=await browser.newPage({viewport:{width:1366,height:900}});await page.goto('about:blank');await page.evaluate(async assets=>{
   document.body.replaceChildren();document.body.style.cssText='margin:0;background:#111;color:#eee;font:16px sans-serif;padding:20px;display:flex;gap:22px;align-items:flex-start';
   for(const a of assets){const box=document.createElement('section'),title=document.createElement('p');title.textContent=a.id+' · '+a.width+'×'+a.height+' · '+a.bytes+' B';box.append(title);const images=document.createElement('div');images.style.cssText='display:flex;gap:8px';for(const [label,url] of [['原详情',a.sourcePath],['高光专用',a.path]]){const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');figure.style.margin='0';image.src='http://127.0.0.1:5592/'+url;image.style.cssText='width:190px;height:300px;object-fit:contain;background:#000';caption.textContent=label;figure.append(image,caption);images.append(figure);}box.append(images);document.body.append(box);}
   await Promise.all([...document.images].map(i=>i.decode()));
  },['f09','a11','e04'].map(id=>manifest.assets.find(a=>a.id===id)));
  await page.screenshot({path:out+'/detail-and-stage-comparison.png'});await page.close();
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}
finally{await writeFile(out+'/browser-report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();console.log(JSON.stringify(report));}
