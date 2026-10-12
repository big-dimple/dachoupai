import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {chooseCharacter,waitScene,tapUI} from './ui.mjs';
const root=process.env.C2_COPY_ROOT??process.cwd(),out=process.env.C2_COPY_OUTPUT??'/tmp/c2-description-native',baseline=process.env.C2_COPY_BASELINE==='1',port=Number(process.env.C2_COPY_PORT??5627);
await mkdir(out,{recursive:true});
const server=await createServer({root,cacheDir:'/tmp/c2-copy-native-vite-'+port,mode:'e2e',server:{host:'127.0.0.1',port,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts'),{newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts'),{R2_RULESETS}=await server.ssrLoadModule('/src/domain/r2Run.ts'),{isR2RouteStarter}=await server.ssrLoadModule('/src/domain/r2GroupUpgrade.ts'),{makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts'),{r2Price}=await server.ssrLoadModule('/src/domain/r2Shop.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={baseline,scope:'bounded native first-shop viewing; one actual shop reroll then planted individual offers, no buy/play command; complete before/after state/journal/storage and commit count',rows:[],status:'RUNNING'};
const snap=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return{state:s.run.state,journal:s.run.journal,slots:await s.storage.read()};});
const idle=p=>p.waitForFunction(()=>{const s=window.__harness?.game.scene.getScene('shop');return s?.ready&&s.view.root.alpha===1&&!s.tweens.isTweening(s.view.root);});
async function imp(p,s){
 const cp=makeCheckpoint(s,[]);assert.equal(readCheckpoint(cp).ok,true);await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
 const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'controlled-copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(p,'shop');await idle(p);
}
function fixture(id,old=false){const p=old?R2_RULESETS.find(p=>p.contentVersion==='quality-r2-group-upgrade-prototype-v1'):newRunIdentity('touye','group'),initial=createRun({rulesVersion:'r2',characterId:old?'amo':'touye',runId:'copy/'+id+'/'+old,seed:'copy-native',r2Identity:{contentVersion:p.contentVersion,contentHash:p.contentHash},...(isR2RouteStarter(p)?{openingRoute:'group'}:{})});const rerolled=applyCommand(initial,{runId:initial.runId,commandId:initial.runId+'/copy-reroll',expectedSeq:initial.commandSeq,action:{type:'RerollShop'}});assert.equal(rerolled.ok,true,rerolled.code);const s=rerolled.state;s.shop.offers[0]={offerId:'copy-offer',definitionId:id,price:r2Price(id,undefined,s),consumed:false};return s;}
try{
 for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
  const touch=viewport.width===390,p=await browser.newPage({viewport,hasTouch:touch});p.on('dialog',d=>d.accept());const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');await chooseCharacter(p,'touye',touch);await idle(p);
  for(const [id,old]of (baseline?[['mantangcai',false]]:[...['mantangcai','c04','c06','jiedongfeng','e11','f10'].map(id=>[id,false]),['mantangcai',true],['f10',true]])){
   if(process.env.C2_COPY_RULES_ONLY==='1'&&(id!=='mantangcai'||old))continue;
   if(process.env.C2_COPY_RESUME==='1'&&viewport.width===1366&&!old)continue;
   const s=fixture(id,old);await imp(p,s);const before=await snap(p);assert.deepEqual(before.state,s);
   await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),storage=gameSession().storage;window.__copyWrites=0;window.__copyCommit=storage.commit.bind(storage);storage.commit=(...args)=>{window.__copyWrites++;return window.__copyCommit(...args);};});
   await tapUI(p,'shop','offer/copy-offer',touch);const dialog=p.locator('.detail-dialog[open]');await dialog.waitFor();
   const row={viewport,id,old,identity:{contentVersion:s.contentVersion,contentHash:s.contentHash},before,summary:await dialog.locator('.card-ability').innerText(),collapsed:await dialog.locator('.card-rules').evaluate(e=>!e.open)};report.rows.push(row);
   const prefix=viewport.width+'-'+(old?'old-':'c2-')+id;row.summaryShot=prefix+'-summary.png';await p.screenshot({path:out+'/'+row.summaryShot,scale:'css'});
   await dialog.locator('.card-rules summary').click();row.expanded=await dialog.innerText();
   const summaryBad=/五条、同花葫芦、同花五条不算|同花葫芦、同花五条不增加|同花葫芦、同花五条不算|倍数立即回到|见完整规则%/;
   if(baseline){assert.match(row.expanded,summaryBad);row.confirmedContradiction=true;}
   else if(!old){assert.doesNotMatch(row.summary+'\n'+row.expanded,summaryBad);assert.doesNotMatch(row.summary+'\n'+row.expanded,/见完整规则/);}
   else if(id==='mantangcai')assert.match(row.expanded,/五条、同花葫芦、同花五条不算/);else assert.match(row.expanded,/凑不出两对及以上/);
   row.rulesHeadShot=prefix+'-rules-head.png';await dialog.locator('.card-rules p').evaluate(e=>e.scrollIntoView({block:'start'}));await p.screenshot({path:out+'/'+row.rulesHeadShot,scale:'css'});
   // The existing scroll container reaches every rule; no new UI geometry.
   await dialog.locator('.dialog-scroll').evaluate(e=>{e.scrollTop=e.scrollHeight;});row.rulesShot=prefix+'-rules.png';await p.screenshot({path:out+'/'+row.rulesShot,scale:'css'});
   await dialog.getByRole('button',{name:'取消',exact:true}).click();await idle(p);row.after=await snap(p);assert.deepEqual(row.after,before);row.writes=await p.evaluate(()=>window.__copyWrites);assert.equal(row.writes,0);row.stateUnchanged=true;
   await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts');gameSession().storage.commit=window.__copyCommit;});
   console.log(viewport.width,id,old?'legacy':'C2','view PASS');
  }
  assert.deepEqual(errors,[]);await p.close();
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally{await browser.close();await server.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,rows:report.rows.length,error:report.error}));}
