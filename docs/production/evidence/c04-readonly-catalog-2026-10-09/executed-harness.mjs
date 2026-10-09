import assert from 'node:assert/strict';
import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
import {chromium} from '/workspace/dachoupai/node_modules/playwright/index.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {tapUI,waitScene} from '/workspace/dachoupai/harness/ui.mjs';
import {snapshotSource} from '/workspace/dachoupai/scripts/check-runner.mjs';
const root='/workspace/dachoupai',out='/tmp/catalog-native';await mkdir(out,{recursive:true});
const v=await createServer({root,mode:'e2e',server:{port:5515,host:'127.0.0.1',strictPort:true},logLevel:'error'});await v.listen();
const {makeCheckpoint,readCheckpoint}=await v.ssrLoadModule('/src/application/checkpoint.ts'),{catalogFacts}=await v.ssrLoadModule('/src/game/Catalog.ts');
const prior=JSON.parse(await readFile(root+'/docs/production/evidence/w2-build-keepsake-2026-10-09/report.json','utf8'));
const shop=prior.profiles.find(p=>p.width===390).transactions.find(t=>t.label==='saved next shop').state,checkpoint=makeCheckpoint(shop,[]);
assert.equal(readCheckpoint(checkpoint).ok,true);await writeFile(out+'/shop-input.json',JSON.stringify(checkpoint,null,2));
const short=JSON.parse(await readFile('/tmp/all-growth-native/phone-390-input.json','utf8'));assert.equal(readCheckpoint(short).ok,true);await writeFile(out+'/short-input.json',JSON.stringify(short,null,2));
const b10=catalogFacts(shop).entries.find(e=>e.id==='b10'),hd=new Set(catalogFacts(shop).entries.flatMap(e=>e.portrait?[new URL(e.portrait.url,'http://127.0.0.1:5515/').pathname]:[]));
const report={before:snapshotSource(root),scope:'Bounded native read-only query on existing canonical shop state; short landscape reuses prior controlled c05 input with only native card selection. No gameplay commands.',profiles:[],errors:[],physicalDevice:'NOT_RUN',humanAcceptance:'NOT_RUN',fps:'NOT_MEASURED',audioListening:'NOT_RUN'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});
try{
 for(const c of [{name:'pc-1366',width:1366,height:768},{name:'phone-390',width:390,height:740},{name:'phone-320',width:320,height:740},{name:'short-740',width:740,height:390}]){
  const ctx=await browser.newContext({viewport:{width:c.width,height:c.height},deviceScaleFactor:1,hasTouch:c.width!==1366,reducedMotion:'reduce'});await ctx.addInitScript(()=>{
   window.__catalogWrites=[];
   for(const method of ['put','add','delete','clear']){const old=IDBObjectStore.prototype[method];IDBObjectStore.prototype[method]=function(...args){window.__catalogWrites.push({kind:'indexeddb',store:this.name,method});return old.apply(this,args);};}
   for(const method of ['setItem','removeItem','clear']){const old=Storage.prototype[method];Storage.prototype[method]=function(...args){window.__catalogWrites.push({kind:'storage',method,key:args[0]});return old.apply(this,args);};}
  });
  const page=await ctx.newPage();page.setDefaultTimeout(18000);page.on('dialog',d=>d.accept());page.on('pageerror',e=>report.errors.push(String(e)));
  let requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));
  const tap=async l=>c.width===1366?l.click():l.tap();
  const snap=()=>page.evaluate(async()=>{
   const controller=window.__harness.game.registry.get('runController'),records=await new Promise((resolve,reject)=>{const r=indexedDB.open('dachoupai-checkpoints',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('saves','readonly'),store=tx.objectStore('saves'),records=[];const cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){records.push({key:c.key,value:c.value});c.continue();}};tx.oncomplete=()=>{db.close();resolve(records);};tx.onerror=()=>reject(tx.error);};r.onerror=()=>reject(r.error);});
   return {state:controller?.state??null,journal:controller?.journal??null,records,selected:window.__harness.game.scene.isActive('game')?[...window.__harness.game.scene.getScene('game').selectedIds]:[]};
  });
  const open=async()=>{await tap(page.locator('.run-menu-toggle'));await tap(page.getByRole('button',{name:'图鉴查询',exact:true}));await page.locator('.catalog-dialog').waitFor();};
  const close=()=>tap(page.locator('.detail-dialog .dialog-close'));
  const reset=async()=>{requests=[];await page.evaluate(()=>window.__catalogWrites=[]);};
  const writes=()=>page.evaluate(()=>window.__catalogWrites);
  const checkFrame=async()=>{
   const b=await page.locator('.detail-dialog').evaluate(el=>{const r=el.getBoundingClientRect(),scroll=el.querySelector('.dialog-scroll'),close=el.querySelector('.dialog-close').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scrollWidth:scroll?.scrollWidth,clientWidth:scroll?.clientWidth,close:{x:close.x,y:close.y,width:close.width,height:close.height}};});
   assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=c.width+.1&&b.y+b.height<=c.height+.1,JSON.stringify(b));assert.ok(b.scrollWidth<=b.clientWidth+1,JSON.stringify(b));assert.ok(b.close.y+b.close.height<=c.height+.1);return b;
  };
  await page.goto('http://127.0.0.1:5515/?harness=1');await waitScene(page,'title');await page.waitForTimeout(350);
  let noRun;
  if(c.width===1366){const before=await snap();await reset();await open();assert.ok((await page.locator('.detail-dialog').innerText()).includes('当前新局规则资料'));assert.equal(await page.getByLabel('公开范围',{exact:true}).count(),0);assert.ok(await page.locator('.catalog-result').count()<=8);await page.getByLabel('按名字查找',{exact:true}).fill('不存在的名字');assert.ok((await page.locator('.detail-dialog').innerText()).includes('没有匹配项'));await close();assert.deepEqual(await snap(),before);assert.deepEqual(await writes(),[]);noRun={stateAndStorageUnchanged:true,writes:await writes()};}
  await tap(page.locator('.run-menu-toggle'));const progress=page.getByText('进度与存档',{exact:true}).locator('..');if(!await progress.evaluate(el=>el.open))await tap(progress.locator('summary'));
  const chooser=page.waitForEvent('filechooser');await tap(page.getByRole('button',{name:'导入本局',exact:true}));await(await chooser).setFiles({name:c.name+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(c.width===740?short:checkpoint))});await waitScene(page,c.width===740?'game':'shop');await page.waitForFunction(()=>{const g=window.__harness.game;return ['game','shop'].some(k=>g.scene.isActive(k)&&g.scene.getScene(k).ready);});await page.waitForTimeout(350);
  if(c.width===740){
   for(const id of ['hearts-2','hearts-13'])await tapUI(page,'game','card/'+id,true);
   const bounds=await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),t=s.statusText,b=t.getBounds();return {copy:t.text,full:t.getData('fullStatus'),fontSize:t.style.fontSize,status:{x:b.x,y:b.y,width:b.width,height:b.height},layout:s.view.layout,buttons:['rankButton','suitButton','aiButton','playButton','discardButton'].map(k=>{const b=s[k].getBounds();return {key:k,x:b.x,y:b.y,width:b.width,height:b.height};})};});
   assert.equal(bounds.copy,'点所选条件');assert.ok(bounds.full.includes('待检查1'));assert.equal(bounds.fontSize,'14px');assert.ok(bounds.status.x+bounds.status.width<=740&&bounds.status.y+bounds.status.height<=390);await page.screenshot({path:out+'/'+c.name+'-status.png',scale:'css'});
   const before=await snap();await reset();await open();const frame=await checkFrame();await page.getByLabel('按名字查找',{exact:true}).fill('蓄');await page.screenshot({path:out+'/'+c.name+'-query.png',scale:'css'});await close();assert.deepEqual(await snap(),before);assert.deepEqual(await writes(),[]);report.profiles.push({...c,bounds,frame,readOnly:true,writes:await writes(),screens:[c.name+'-status.png',c.name+'-query.png']});await ctx.close();continue;
  }
  const before=await snap();await reset();await open();const frame=await checkFrame();assert.ok(await page.locator('.catalog-result').count()<=8);await page.screenshot({path:out+'/'+c.name+'-query.png',scale:'css'});
  const beforeDetail=requests.filter(p=>hd.has(p));assert.deepEqual(beforeDetail,[],'no HD during query');
  await page.getByLabel('按名字查找',{exact:true}).fill(b10.name);await page.getByLabel('分类',{exact:true}).selectOption('joker');await page.getByLabel('用途',{exact:true}).selectOption('成长');await page.getByLabel('公开范围',{exact:true}).selectOption('持有');assert.equal(await page.locator('.catalog-result').count(),1);
  let release,artCanceled=false;const held=new Promise(r=>release=r),path=new URL(b10.portrait.url,'http://127.0.0.1:5515/').pathname;
  if(c.width===1366){await page.route('**'+path,async route=>{await held;try{await route.continue();}catch{}});page.on('requestfailed',r=>{if(new URL(r.url()).pathname===path)artCanceled=true;});}
  const detailRequest=c.width===1366?page.waitForRequest(r=>new URL(r.url()).pathname===path):null;await tap(page.getByRole('button',{name:'查看'+b10.name,exact:true}));if(detailRequest)await detailRequest;
  const body=await page.locator('.detail-dialog').innerText();assert.ok(body.includes('现存：')&&body.includes('20')&&body.includes('一般规则'));await checkFrame();await writeFile(out+'/'+c.name+'-detail.txt',body);await page.screenshot({path:out+'/'+c.name+'-detail.png',scale:'css'});
  await tap(page.getByRole('button',{name:'返回查询',exact:true}));assert.equal(await page.getByLabel('按名字查找',{exact:true}).inputValue(),b10.name);assert.equal(await page.getByLabel('公开范围',{exact:true}).inputValue(),'持有');if(c.width===1366){release();await page.waitForTimeout(200);assert.equal(artCanceled,true,'closed detail aborts delayed HD');await page.unroute('**'+path);}
  await page.getByLabel('按名字查找',{exact:true}).fill('不存在的名字');assert.ok((await page.locator('.catalog-count').innerText()).startsWith('0 项'));await page.screenshot({path:out+'/'+c.name+'-empty.png',scale:'css'});
  if(c.width!==320){await page.getByLabel('按名字查找',{exact:true}).fill('');await page.getByLabel('用途',{exact:true}).selectOption('');await page.getByLabel('分类',{exact:true}).selectOption('');await page.getByLabel('公开范围',{exact:true}).selectOption('现货');assert.ok(await page.locator('.catalog-result').count()>0);const all=await page.locator('.catalog-result').allTextContents();assert.ok(all.every(t=>t.includes('现货')));await page.getByLabel('公开范围',{exact:true}).selectOption('');await page.getByLabel('分类',{exact:true}).selectOption('hand');assert.equal(await page.locator('.catalog-result').count(),8);await tap(page.getByRole('button',{name:'下一页',exact:true}));assert.equal(await page.locator('.catalog-result').count(),4);await tap(page.getByRole('button',{name:'上一页',exact:true}));assert.equal(await page.locator('.catalog-result').count(),8);}
  await close();assert.deepEqual(await snap(),before);assert.deepEqual(await writes(),[]);assert.equal(await page.locator('.detail-dialog').count(),0);
  report.profiles.push({...c,frame,noRun,body,readOnly:true,writes:await writes(),hdBeforeDetail:beforeDetail,hdRequests:requests.filter(p=>hd.has(p)),delayedArtCanceled:c.width===1366?artCanceled:'not requested',screens:['query','detail','empty'].map(x=>c.name+'-'+x+'.png')});await ctx.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;}
finally{report.after=snapshotSource(root);report.sourceUnchanged=JSON.stringify(report.before)===JSON.stringify(report.after);await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,error:report.error,profiles:report.profiles.map(p=>p.name),sourceUnchanged:report.sourceUnchanged}));await browser.close();await v.close();}
