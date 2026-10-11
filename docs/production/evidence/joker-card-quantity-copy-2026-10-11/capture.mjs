import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build,createServer,preview} from 'vite';
import {chromium} from 'playwright';
import {openSelector,confirmHeroRoute,tapUI,waitScene} from '../../../../harness/ui.mjs';

const root=process.env.QUANTITY_ROOT??process.cwd(),label=process.env.QUANTITY_LABEL??'after';
const out=process.cwd()+'/shots/joker-card-quantity-copy/'+label;
await mkdir(out,{recursive:true});
process.chdir(root);
const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
const report={sha:git('rev-parse','HEAD'),dirty:git('status','--short'),scope:'Controlled validated current-identity shop, actual shelf/detail/expanded rules only. No purchase, scoring, natural play or external hosting.',cases:[],screenshots:[]};
const ssr=await createServer({root,server:{middlewareMode:true},logLevel:'error'});
let cp;
try{
 const {newRunIdentity}=await ssr.ssrLoadModule('/src/game/RunLaunch.ts');
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts');
 const {makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 const {r2Price}=await ssr.ssrLoadModule('/src/domain/r2Shop.ts');
 const identity=newRunIdentity('erxiang','straight');
 const initial=createRun({seed:'quantity-copy/a03',runId:'controlled/quantity-copy/a03',characterId:'erxiang',rulesVersion:'r2',r2Identity:identity,openingRoute:'straight',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 const reroll=applyCommand(initial,{runId:initial.runId,commandId:'controlled/reroll',expectedSeq:initial.commandSeq,action:{type:'RerollShop'}});assert.ok(reroll.ok);const state=reroll.state;
 const offer=state.shop.offers[0];offer.definitionId='a03';offer.price=r2Price('a03','none',identity);delete offer.edition;
 cp=makeCheckpoint(state,[]);const validation=readCheckpoint(cp);assert.ok(validation.ok,JSON.stringify(validation));
 report.identity=identity;report.offerId=offer.offerId;
 await writeFile(out+'/controlled-shop.json',JSON.stringify(cp,null,2));
 const {r2JokerDefinitionsFor}=await ssr.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
 const {jokerMemoryAbility,publicJokerMemoryContext}=await ssr.ssrLoadModule('/src/game/JokerMemory.ts');
 const context=publicJokerMemoryContext(state,{hand:[],scoringLimited:false,deckSize:52,jokerSlots:5,jokerCount:0});
 const ids=['a03','tiesuanpan','a08','b02','b05','c02','c03','a10','d01','d02','b11','c10','d08','c04','e08','f04'];
 report.copy=ids.map(id=>{const definition=r2JokerDefinitionsFor(identity).find(d=>d.id===id);return {id,hooks:definition.hooks,plain:jokerMemoryAbility(definition,undefined,context).plain};});
}finally{await ssr.close();}
if(!process.env.QUANTITY_REUSE_BUILD)await build({root,mode:'e2e',build:{outDir:root+'/shots/quantity-copy-build'},logLevel:'error'});
report.build=JSON.parse(await readFile(root+'/shots/quantity-copy-build/build-info.json','utf8'));
assert.equal(report.build.revision,report.sha);
const server=await preview({root,build:{outDir:root+'/shots/quantity-copy-build'},preview:{host:'127.0.0.1',port:5398,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
report.browser=browser.version();
const snapshot=p=>p.evaluate(async()=>{
 const c=window.__harness.game.registry.get('runController');
 const storage=await new Promise((resolve,reject)=>{const r=indexedDB.open('dachoupai-checkpoints');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('saves','readonly'),cursor=tx.objectStore('saves').openCursor(),records=[];cursor.onsuccess=()=>{const row=cursor.result;if(row){records.push({key:row.key,value:row.value});row.continue();}};tx.oncomplete=()=>{db.close();resolve(records)};tx.onerror=()=>reject(tx.error);};});
 return {state:c.state,journal:c.journal,exportJSON:c.exportJSON(),storage};
});
async function shot(p,name){await p.screenshot({path:out+'/'+name+'.png',scale:'css'});const bytes=await readFile(out+'/'+name+'.png');report.screenshots.push({file:name+'.png',sha:report.sha,sha256:createHash('sha256').update(bytes).digest('hex')});}
try{
 for(const spec of [{name:'pc',width:1366,height:768,touch:false},{name:'phone',width:390,height:844,touch:true}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1,hasTouch:spec.touch,isMobile:spec.touch});
  const p=await context.newPage();p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:5398/?harness=1');
  await openSelector(p,spec.touch);await tapUI(p,'character-select','character/erxiang',spec.touch);await confirmHeroRoute(p,spec.touch,'straight');await waitScene(p,'shop');
  await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
  const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'controlled-shop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});
  await p.waitForFunction(()=>window.__harness.game.scene.isActive('shop')&&window.__harness.game.registry.get('runController').state.runId==='controlled/quantity-copy/a03'&&window.__harness.game.scene.getScene('shop').ready);
  await p.waitForTimeout(400);await p.mouse.move(5,5);
  const initial=await snapshot(p);
  const shelf=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]);return walk(s.children.list).filter(o=>o.type==='Text'&&o.getData('offerId')===s.run.shop.offers[0].offerId).map(o=>({name:o.name,text:o.text,fullText:o.getData('fullText'),font:o.style.fontSize,bounds:o.getBounds()}));});
  const expected=report.copy.find(r=>r.id==='a03').plain.line;
  assert.ok(shelf.some(t=>(t.fullText??t.text).replaceAll('\n','')===expected),JSON.stringify(shelf));
  await shot(p,spec.name+'-shelf');await tapUI(p,'shop','offer/'+report.offerId,spec.touch);
  const dialog=p.locator('.detail-dialog[open]');await dialog.waitFor();
  const main=await dialog.locator('.ability-main').innerText();assert.equal(main,expected);
  const limits=await dialog.locator('.ability-limits').innerText();assert.ok(limits.includes('合法重触发时可再次获得'));
  await shot(p,spec.name+'-detail');
  const rules=dialog.locator('.card-rules');await rules.locator('summary').click();
  const ruleText=await rules.innerText();assert.ok(ruleText.includes('首张有效计分牌的热度 +15'));await rules.scrollIntoViewIfNeeded();await shot(p,spec.name+'-rules');
  await dialog.getByRole('button',{name:'取消',exact:true}).click();
  const final=await snapshot(p);assert.deepEqual(final,initial);
  await writeFile(out+'/'+spec.name+'-state-journal-storage.json',JSON.stringify({initial,final},null,2));
  report.cases.push({spec,shelf,main,limits,ruleText,unchangedStateJournalStorage:true});
  await context.close();
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack;process.exitCode=1;}
finally{await browser.close();await server.httpServer.close();await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(report.status,report.error??'',report.sha);}
