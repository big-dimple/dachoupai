/** Reuses 89a96c43's validated fixture and normal menu/shop inputs. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI} from './ui.mjs';
const out=process.env.MOBILE_TOOL_OUTPUT??'/tmp/mobile-tool-workspace';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:'/tmp/mobile-tool-vite',server:{host:'127.0.0.1',port:5724,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const cmd=(s,action)=>{const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/fixture/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});assert.ok(r.ok,r.code);return r.state;};
let initial=createRun({seed:'mobile-tool-controlled',runId:'controlled/mobile-tool',characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
initial=cmd(initial,{type:'RerollShop'});initial.gold=30;initial.consumables=[{instanceId:'held/T08',definitionId:'T08'}];
const stockId=initial.shop.toolOffers[0].offerId;initial.shop.toolOffers=[{offerId:stockId,definitionId:'S01',price:8,consumed:false}];
const donor=initial.deckInstances.find(c=>c.id==='spades-13');donor.enhancement='heat-paper';donor.edition='foil';assert.ok(readCheckpoint(makeCheckpoint(initial,[])).ok);
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),modified:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),baseline:'89a96c432f32814bf6e17c2def8013a15d7303a5',scope:'Controlled legal current-identity fixture imported via normal menu; actual BuyOffer/UseConsumable and native Chromium IndexedDB. Software CSS viewports/DPR1; short heights reserve 112px for browser bars, not physical browser chrome. No natural acquisition, original user image, device or production acceptance claim.',cases:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const snapshot=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return{state:s.run.state,journal:s.run.journal,storage:await s.storage.read()};});
let p;
try{
 for(const spec of [{width:320,height:640},{width:390,height:640},{width:412,height:740},{width:320,height:528},{width:390,height:528},{width:412,height:628},{width:1366,height:768}]){
  const touch=spec.width<900,ctx=await browser.newContext({viewport:spec,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'reduce'});
  p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('dialog',d=>d.accept());
  const row={spec,shots:[],errors:[],checks:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));
  const dom=l=>touch?l.tap():l.click(),tap=name=>tapUI(p,'shop',name,touch),ready=()=>p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
  const shot=async name=>{await p.evaluate(()=>new Promise(r=>window.__harness.game.events.once('poststep',r)));const file=spec.width+'x'+spec.height+'-'+name+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});row.shots.push(file);};
  const imp=async state=>{const close=p.locator('.detail-dialog[open] .dialog-close');if(await close.count())await dom(close);assert.ok(readCheckpoint(makeCheckpoint(state,[])).ok);await dom(p.locator('.run-menu-toggle'));const saved=p.getByText('进度与存档',{exact:true}).locator('..');if(!await saved.evaluate(e=>e.open))await dom(saved.locator('summary'));const chooser=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));await(await chooser).setFiles({name:'controlled-tool.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(state,[])))});await waitScene(p,'shop');await ready();assert.deepEqual((await snapshot(p)).state,state);};
  const enter=async()=>{await tap(touch?'action/shelf-tools':'action/make-cards');await p.locator('.make-cards-dialog[open]').waitFor();};
  const choose=async(role,id)=>{const input=p.locator('input[name$="/'+role+'"][value="'+id+'"]');await input.scrollIntoViewIfNeeded();await dom(input);};
  const commitMatches=(before,after,action)=>{const command=after.journal.at(-1);assert.deepEqual(command.action,action);const expected=applyCommand(before.state,command);assert.ok(expected.ok);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.journal,[...before.journal,command]);assert.deepEqual(after.storage.current,makeCheckpoint(after.state,after.journal));assert.deepEqual(after.storage.previous,before.storage.current);};
  await p.goto('http://127.0.0.1:5724/?harness=1');await waitScene(p,'title');await imp(initial);row.initial=await snapshot(p);
  await enter();assert.equal(await p.locator('.make-cards-dialog').getAttribute('data-make-pane'),'purchase');
  const stock=p.locator('.make-cards-tile[data-make-id="'+stockId+'"]');
  row.stockPosition=await stock.evaluate(e=>({tile:e.getBoundingClientRect().toJSON(),scroll:e.closest('.dialog-scroll').getBoundingClientRect().toJSON()}));
  assert.ok(row.stockPosition.tile.top>=row.stockPosition.scroll.top&&row.stockPosition.tile.bottom<=row.stockPosition.scroll.bottom,'entire random stock tile visible on first screen');
  await shot('purchase-first-view');await dom(stock);await p.locator('.make-cards-purchase[open]').waitFor();
  assert.ok(await p.getByRole('button',{name:'买来存着 · 8金',exact:true}).isEnabled());
  await dom(p.getByRole('button',{name:'买来使用 · 8金',exact:true}));await p.locator('.make-cards-tool[open]').waitFor();await ready();
  row.bought=await snapshot(p);commitMatches(row.initial,row.bought,{type:'BuyOffer',offerId:stockId});row.checks.push('actual purchase saved exactly once; store/use choices retained');
  const instanceId=row.bought.state.consumables.find(c=>c.definitionId==='S01').instanceId;
  await p.evaluate(()=>{window.workspaceOps=[];for(const type of ['click','change'])document.addEventListener(type,e=>{if(!e.target.closest('.tool-target-panel'))return;const w=document.querySelector('.tool-workspace'),area=w.querySelector('.dialog-content'),scroller=innerWidth>=900?area:w,before=scroller.scrollTop;requestAnimationFrame(()=>window.workspaceOps.push({type,element:e.target.tagName,before,after:scroller.scrollTop,max:scroller.scrollHeight-scroller.clientHeight}));},true);});
  await choose('donor','spades-13');await choose('target','clubs-9');const targets=['clubs-9'];
  if(spec.width!==320){await choose('target','hearts-8');targets.push('hearts-8');}
  assert.ok(await p.locator('input[name$="/target"][value="spades-13"]').isDisabled());
  const recipients=p.locator('fieldset[aria-label="受益扑克牌"]');
  for(const name of ['点数整理','花色整理'])await dom(recipients.getByRole('button',{name,exact:true}));
  await recipients.getByLabel('受益扑克牌点数筛选',{exact:true}).selectOption('10');
  assert.match(await recipients.locator('.tool-directory-count').innerText(),new RegExp('筛选外已选 '+targets.length+' 张'));
  assert.deepEqual(new Set(await p.locator('input[name$="/target"]:checked').evaluateAll(es=>es.map(e=>e.value))),new Set(targets));
  await recipients.getByLabel('受益扑克牌点数筛选',{exact:true}).selectOption('');
  await recipients.getByLabel('受益扑克牌花色筛选',{exact:true}).selectOption('spades');
  await recipients.getByLabel('受益扑克牌花色筛选',{exact:true}).selectOption('');
  await choose('target','clubs-9');await choose('target','clubs-9');await p.evaluate(()=>new Promise(requestAnimationFrame));row.scrollOperations=await p.evaluate(()=>window.workspaceOps);for(const op of row.scrollOperations)assert.ok(Math.abs(op.after-Math.min(op.before,op.max))<=1,'selection, sort and filter preserve available scroll position');
  row.checks.push('independent donor; 1–2 beneficiaries retained across rank/suit sort/filter; no jump to top');
  const workspace=p.locator('.tool-workspace');const beforePane=await workspace.evaluate(e=>e.scrollTop);
  if(touch){await dom(p.getByRole('button',{name:'查看预览',exact:true}));await shot('preview');await dom(p.getByRole('button',{name:'返回选牌',exact:true}));assert.equal(await workspace.evaluate(e=>e.scrollTop),beforePane);}
  const hint=await p.locator('.tool-selection-hint').innerText();assert.match(hint,/受益：.*9♣/);assert.match(hint,/牺牲：K♠.*永久移除，不退款/);
  assert.equal(await p.locator('.dialog-header .make-cards-receipt').count(),0);assert.match(await p.locator('.tool-full-risk .make-cards-receipt').textContent(),/实付 8 金.*未使用/);
  assert.ok(await p.locator('.tool-short-instruction').evaluate(e=>e.getBoundingClientRect().height<=20),'one-line steps');row.targetBudget=await p.locator('.tool-detail[open]').evaluate(d=>Object.fromEntries(['dialog-header','tool-workspace','dialog-actions'].map(c=>[c,d.querySelector('.'+c).getBoundingClientRect().toJSON()])));
  assert.ok(row.targetBudget['tool-workspace'].height>=spec.height*.5,'selection is the majority of short viewport');await shot('sacrifice-selected');
  assert.deepEqual(await snapshot(p),row.bought);await dom(p.locator('.tool-detail[open] .dialog-close'));await p.locator('.make-cards-dialog[open]').waitFor();assert.deepEqual(await snapshot(p),row.bought);row.checks.push('selection/cancel full state, journal and storage unchanged');
  if(touch)await dom(p.getByRole('button',{name:'已有工具 2',exact:true}));await dom(p.locator('.make-cards-tile[data-make-id="'+instanceId+'"]'));
  await choose('donor','spades-13');for(const id of targets)await choose('target',id);
  const action={type:'UseConsumable',instanceId,targetIds:row.bought.state.deckInstances.filter(c=>targets.includes(c.id)).map(c=>c.id),sacrificeId:'spades-13'};
  const failure=spec.width===390&&spec.height===528;
  if(failure)await p.evaluate(()=>{const put=IDBObjectStore.prototype.put;window.restoreToolQuota=()=>IDBObjectStore.prototype.put=put;IDBObjectStore.prototype.put=function(...args){if(this.name==='saves')throw new DOMException('controlled tool quota','QuotaExceededError');return Reflect.apply(put,this,args);};});
  await dom(p.locator('.tool-detail[open] .dialog-primary'));
  if(failure){await p.getByText(/未保存：存储空间不足/).waitFor();row.failed=await snapshot(p);assert.deepEqual(row.failed,row.bought);await shot('save-failed');await p.evaluate(()=>window.restoreToolQuota());await dom(p.getByRole('button',{name:'重试保存',exact:true}));row.checks.push('injected IndexedDB failure atomic rollback; real retry saved one original candidate');}
  await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,row.bought.state.commandSeq);row.used=await snapshot(p);commitMatches(row.bought,row.used,action);assert.equal(row.used.state.gold,22);assert.equal(row.used.journal.filter(c=>c.action.type==='UseConsumable').length,1);assert.ok(!row.used.state.consumables.some(c=>c.instanceId===instanceId));assert.ok(row.used.state.destroyedIds.includes('spades-13'));row.checks.push('full committed state/RNG/journal/storage equals existing command; no repeat payment/use');
  if(!failure){await p.locator('.tool-saved-result[open]').waitFor();await p.waitForFunction(()=>document.querySelector('.tool-saved-result')?.dataset.animationState==='settled');await dom(p.locator('.tool-saved-result .dialog-close'));}
  if(spec.width===390&&spec.height===640){
   await imp(initial);row.storeBefore=await snapshot(p);await enter();await dom(p.locator('.make-cards-tile[data-make-id="'+stockId+'"]'));await dom(p.getByRole('button',{name:'买来存着 · 8金',exact:true}));await ready();row.stored=await snapshot(p);commitMatches(row.storeBefore,row.stored,{type:'BuyOffer',offerId:stockId});assert.ok(row.stored.state.consumables.some(c=>c.definitionId==='S01'));assert.equal(await p.locator('.tool-detail[open]').count(),0);row.checks.push('actual buy-to-store only purchases; no use');
   const replacement=structuredClone(initial);replacement.consumables=[{instanceId:'held/T11',definitionId:'T11'}];await imp(replacement);row.replacementBefore=await snapshot(p);await enter();await dom(p.getByRole('button',{name:'已有工具 1',exact:true}));await dom(p.locator('.make-cards-tile[data-make-id="held/T11"]'));await choose('target','spades-13');assert.match(await p.locator('.tool-main-costs').innerText(),/替换原增强/);assert.equal(await p.locator('.tool-detail .dialog-primary').innerText(),'替换增强');await shot('replacement-risk');await dom(p.locator('.tool-detail .dialog-close'));assert.deepEqual(await snapshot(p),row.replacementBefore);row.checks.push('enhancement overwrite risk remains beside confirmation; cancel preserves tool and full saved tuple');
  }
  assert.deepEqual(row.errors,[]);row.result='PASS';await ctx.close();
 }
 report.result='PASS';
}catch(e){report.result='FAIL';report.error=e.stack;await p?.screenshot({path:out+'/FAIL.png'}).catch(()=>{});process.exitCode=1;}
finally{
 await writeFile(out+'/full-state-journal-storage.json.gz',gzipSync(JSON.stringify(report)));
 const brief=structuredClone(report);for(const row of brief.cases)for(const key of ['initial','bought','failed','used','storeBefore','stored','replacementBefore'])if(row[key])row[key]={gold:row[key].state.gold,commandSeq:row[key].state.commandSeq,journal:row[key].journal.length};
 await writeFile(out+'/report.json',JSON.stringify(brief,null,2)+'\n');console.log(JSON.stringify({result:report.result,cases:report.cases.map(r=>({spec:r.spec,result:r.result})),error:report.error}));await browser.close();await server.close();
}
