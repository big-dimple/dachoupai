/** Native controlled S04 transactions and fixed-candidate recovery, never natural attainment/supply. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene} from './ui.mjs';
const out=process.env.S04_OUTPUT??'/tmp/s04-finish',port=Number(process.env.S04_PORT??5492);await mkdir(out,{recursive:true});
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim();
const sourceFiles=git('ls-files','src').split('\n').concat(['src/domain/r2S04.ts','src/game/S04Qualification.ts']).filter((x,i,a)=>a.indexOf(x)===i).sort();
const digest=async()=>createHash('sha256').update(Buffer.concat(await Promise.all(sourceFiles.map(async f=>Buffer.concat([Buffer.from(f+'\0'),await readFile(f)]))))).digest('hex');
const sourceHash=await digest();
const server=await createServer({mode:'e2e',cacheDir:'/tmp/s04-finish-vite',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const {s04Fixture:fixture}=await server.ssrLoadModule('/harness/fixtures/s04-finish.ts');
const {applyCommand}=await server.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const {r2PurchasePrice,r2PaidRerollPrice}=await server.ssrLoadModule('/src/domain/r2Shop.ts');
const {r2S04Facts}=await server.ssrLoadModule('/src/domain/r2S04.ts');
const command=(s,action)=>({runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});
const report={head:git('rev-parse','HEAD'),sourceHash,sourceFiles,scope:'Validator-approved planted chapter/deck/gold/Joker/stock checkpoints. Native DOM mouse/touch and canvas input; exact complete state/journal/IDB oracle. No natural supply, physical device, balance, 18 routes or save migration.',cases:[]};
const snapshot=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();return {state:s.run.state,journal:s.run.journal,slots:await s.storage.read(),storage:Object.fromEntries(Object.keys(localStorage).filter(k=>!k.includes('lease')).map(k=>[k,localStorage.getItem(k)]))};});
let p;
try{for(const width of [1366,390,320]){
 const touch=width<500,height=width===1366?900:740,context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'});p=await context.newPage();
 const row={width,height,errors:[],checks:[],transactions:[],shots:[]};report.cases.push(row);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e)));
 const dom=l=>touch?l.tap():l.click(),tap=name=>tapUI(p,'shop',name,touch),close=()=>dom(p.locator('.detail-dialog[open] .dialog-close'));
 const ready=scene=>p.waitForFunction(scene=>window.__harness.game.scene.getScene(scene)?.ready,scene);
 const shot=async name=>{const path=width+'-'+name+'.png';await p.screenshot({path:out+'/'+path,scale:'css'});row.shots.push(path);};
 const importState=async s=>{
  const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok);
  await dom(p.locator('.run-menu-toggle'));const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await dom(section.locator('summary'));
  const fc=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));await(await fc).setFiles({name:'controlled-s04.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});
  await waitScene(p,'shop');await ready('shop');await p.waitForTimeout(300);
  await p.evaluate(()=>{const c=window.__harness.game.registry.get('runController'),dispatch=c.dispatch;window.__s04Dispatch=[];c.dispatch=function(...args){window.__s04Dispatch.push(structuredClone(args));return dispatch.apply(this,args);};});row.last=await snapshot(p);return row.last;
 };
 const hub=async()=>{await tap(touch?'action/shelf-tools':'action/basic-choice');await p.locator('.make-cards-dialog[open]').waitFor();if(touch)await dom(p.getByRole('button',{name:'选购工具',exact:true}));};
 const own=async id=>{if(touch)await dom(p.getByRole('button',{name:/^已有工具/}));await dom(p.locator('.make-cards-tile[data-make-id="'+id+'"]'));await p.locator('.make-cards-tool[open]').waitFor();};
 const stock=async()=>{await dom(p.locator('.make-cards-tile[data-make-id="s04/controlled/tool/0"]'));await p.locator('.make-cards-purchase[open]').waitFor();};
 const record=async(actions,scene='shop')=>{
  await ready(scene);let state=row.last.state;const journal=[...row.last.journal],events=[];
  for(const a of actions){const c=command(state,a),r=applyCommand(state,c);assert.ok(r.ok,r.code);state=r.state;journal.push(c);events.push(...r.events);}
  const after=await snapshot(p);assert.deepEqual(after.state,state);assert.deepEqual(after.journal,journal);assert.deepEqual(after.slots.current,makeCheckpoint(state,journal));assert.equal(after.slots.revision,row.last.slots.revision+actions.length);assert.deepEqual(after.storage,row.last.storage);
  row.transactions.push({actions,before:row.last,after,events});row.last=after;return after;
 };
 const delayCommit=()=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),s=gameSession();window.__s04Commit=s.storage.commit;window.__s04Attempts=0;s.storage.commit=(...args)=>{window.__s04Attempts++;return new Promise((resolve,reject)=>{window.__s04Reject=()=>reject(new DOMException('controlled S04 save','QuotaExceededError'));window.__s04Release=()=>window.__s04Commit.apply(s.storage,args).then(resolve,reject);});};});
 const failAndRetry=async(button,before)=>{
  await delayCommit();await dom(button);await p.waitForFunction(()=>window.__s04Attempts===1);assert.ok(await button.isDisabled());const b=await button.boundingBox();if(touch)await p.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await p.mouse.click(b.x+b.width/2,b.y+b.height/2);assert.equal(await p.evaluate(()=>window.__s04Attempts),1);assert.deepEqual(await snapshot(p),before);
  await p.evaluate(()=>window.__s04Reject());await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused');assert.deepEqual(await snapshot(p),before);
  await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts');gameSession().storage.commit=window.__s04Commit;});await dom(p.getByRole('button',{name:'重试保存',exact:true}));
 };
 await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');
 const main=fixture();main.purchaseCoupons=1;main.longTermItems=['U10'];main.jokers=[r2CreateJoker('e02','s04/discount',4,'none',main)];main.deckInstances[0].enhancement='heat-paper';main.deckInstances[0].edition='foil';
 const initial=await importState(main);row.initial=initial;const price=r2PurchasePrice(main,main.shop.toolOffers[0]);assert.equal(price,2);
 await hub();await stock();assert.match(await p.locator('.make-cards-purchase').innerText(),/红桃 26\/52/);assert.match(await p.locator('.make-cards-purchase').innerText(),/实付 2 金/);await shot('purchase');await close();assert.deepEqual(await snapshot(p),initial);
 await stock();const buyButton=p.locator('.make-cards-purchase .dialog-primary');await failAndRetry(buyButton,initial);await record([{type:'BuyOffer',offerId:'s04/controlled/tool/0'}]);await p.locator('.make-cards-tool[open]').waitFor();
 const bought=row.last,id=bought.state.consumables.find(c=>c.definitionId==='S04').instanceId;assert.equal(bought.state.gold,18);assert.equal(bought.state.shop.basicChoice.purchase,null);row.checks.push('purchase cancellation zero commands; exact discounted2, delayed double confirm and failed-save retry buy once, random offer does not consume service quota');
 const select=p.getByRole('combobox',{name:'全副花色',exact:true});row.optionSnapshot=await select.evaluate(e=>e.outerHTML);row.browserFacts=await p.evaluate(async()=>{const {r2S04Facts}=await import('/src/domain/r2S04.ts');return r2S04Facts(window.__harness.game.registry.get('runController').state);});assert.ok(await p.getByRole('button',{name:'确认使用',exact:true}).isDisabled());assert.ok(await select.locator('option[value="clubs"]').evaluate(e=>e.disabled));await select.selectOption('hearts');assert.match(await p.locator('.tool-selection-hint').innerText(),/红桃 26\/52 · 达标/);assert.match(await p.locator('.tool-main-costs').innerText(),/8 → 7/);await shot('selected');await close();assert.deepEqual(await snapshot(p),bought);
 await own(id);assert.equal(await p.getByRole('combobox',{name:'全副花色'}).inputValue(),'');await p.getByRole('combobox',{name:'全副花色'}).selectOption('hearts');await failAndRetry(p.locator('.tool-detail .dialog-primary'),bought);
 await record([{type:'UseConsumable',instanceId:id,targetIds:[],suit:'hearts'}]);await p.locator('.tool-saved-result[open]').waitFor();await p.waitForFunction(()=>document.querySelector('.tool-saved-result')?.dataset.animationState==='settled');await shot('saved');
 assert.equal(row.last.state.gold,bought.state.gold);assert.equal(row.last.state.spectralModifiers.handPenalty,1);assert.deepEqual(row.last.state.deckInstances,bought.state.deckInstances.map(c=>({...c,suit:'hearts'})));assert.deepEqual(row.last.state.rng,bought.state.rng);row.checks.push('suit counts and blocked options; cancel/reopen reset selection, preserve tool; failed-use fixed retry and repeated confirm consume one tool/one permanent slot, no use gold or RNG');
 await close();const saved=await snapshot(p);await p.reload();await waitScene(p,'title');assert.deepEqual(await snapshot(p),saved);row.restored=saved;await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'shop');await ready('shop');assert.deepEqual(await snapshot(p),saved);
 await tap('action/start-stage');await waitScene(p,'game');await ready('game');await record([{type:'LeaveShop'},{type:'EnterStage'}],'game');assert.equal(row.last.state.stage.handLimit,7);assert.equal(row.last.state.handOrder.length,7);await shot('next-stage');row.checks.push('cold restore exact state/journal/IDB; native continue and next entry have seven cards, four plays and original target');
 // Insufficient density and chapter gate are visible on retained inventory and send nothing.
 for(const [index,hearts,label] of [[6,25,'density25'],[3,26,'chapter2']]){
  const state=fixture({index,hearts});state.consumables=[{instanceId:'s04/held',definitionId:'S04'}];const before=await importState(state);await hub();await own('s04/held');
  assert.ok(await p.getByRole('button',{name:'确认使用',exact:true}).isDisabled());assert.ok(await p.getByRole('combobox',{name:'全副花色'}).locator('option[value="hearts"]').evaluate(e=>e.disabled));
  const text=await p.locator('.tool-detail').innerText();assert.match(text,index===3?/当前第2章/:/至少\s*26\/52/);await shot(label);await close();await close();assert.deepEqual(await snapshot(p),before);assert.equal(await p.evaluate(()=>window.__s04Dispatch.length),0);
 }row.checks.push('chapter2 and25/52 held stock remain inspectable, disabled, cancel has zero commands and full state equality');
 // Crossing the gate inside a shop does not retroactively change its stock or RNG.
 const crossing=fixture({hearts:25,stock:false});crossing.shop.toolOffers=[];await importState(crossing);await hub();await dom(p.locator('.make-cards-tile[data-make-id="T03"]'));await p.locator('.make-cards-purchase[open]').waitFor();await dom(p.getByRole('button',{name:/买来使用/}));
 const shopSeq=row.last.state.shop.basicChoice.shopSeq;await record([{type:'BuyBasicTool',definitionId:'T03',shopSeq}]);await p.locator('.make-cards-tool[open]').waitFor();const dyeBefore=row.last,dyeId=dyeBefore.state.consumables.at(-1).instanceId,target=dyeBefore.state.deckInstances.find(c=>c.suit!=='hearts').id;
 const checkbox=p.locator('input[name$="/target"][value="'+target+'"]');await checkbox.scrollIntoViewIfNeeded();await dom(checkbox);await dom(p.getByRole('button',{name:'确认使用',exact:true}));await record([{type:'UseConsumable',instanceId:dyeId,targetIds:[target]}]);assert.deepEqual(row.last.state.shop,dyeBefore.state.shop);assert.deepEqual(row.last.state.rng,dyeBefore.state.rng);assert.equal(r2S04Facts(row.last.state).suits.find(s=>s.suit==='hearts').eligible,true);
 await p.locator('.tool-saved-result[open]').waitFor();await close();await close();const quota=row.last.state.shop.basicChoice,cost=r2PaidRerollPrice(row.last.state),gold=row.last.state.gold;await tap('action/reroll');await record([{type:'RerollShop'}]);assert.equal(cost,2);assert.equal(row.last.state.gold,gold-2);assert.deepEqual(row.last.state.shop.basicChoice,quota);await shot('crossing-refresh');row.checks.push('native fixed dye25→26 keeps stock and RNG; real paid refresh2 advances shelf and preserves spent service quota');
 assert.deepEqual(row.errors,[]);row.status='PASS';await context.close();console.log('PASS',width);
 }assert.equal(await digest(),sourceHash);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack??String(e);process.exitCode=1;await p?.screenshot({path:out+'/FAIL.png',scale:'css'}).catch(()=>{});console.error(e);}
finally{await browser.close();await server.close();await writeFile(out+'/full-state-journal-storage.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report);for(const r of brief.cases){for(const k of ['last','initial','restored'])if(r[k])r[k]={seq:r[k].state.commandSeq,gold:r[k].state.gold,identity:[r[k].state.contentVersion,r[k].state.contentHash]};r.transactions=r.transactions.map(t=>({actions:t.actions,beforeSeq:t.before.state.commandSeq,afterSeq:t.after.state.commandSeq,events:t.events}));}await writeFile(out+'/report.json',JSON.stringify(brief,null,2)+'\n');console.log(report.status,out);}
