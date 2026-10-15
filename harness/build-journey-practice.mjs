import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene} from './ui.mjs';

const out=process.env.BUILD_PRACTICE_OUTPUT??'/tmp/build-journey-practice',port=Number(process.env.BUILD_PRACTICE_PORT??5492);
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:'/tmp/build-journey-practice-vite',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {r2PracticeQuotes}=await server.ssrLoadModule('/src/domain/r2Practice.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const command=(state,action)=>({runId:state.runId,commandId:state.runId+'/command/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action});
const send=(state,action)=>{const result=applyCommand(state,command(state,action));assert.ok(result.ok,result.code);return result.state;};
function fixture(focus){
 let state=createRun({seed:'build-journey-practice/'+focus,runId:'build-journey-practice/'+focus,characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan',focus),openingRoute:focus});
 for(const action of [{type:'LeaveShop'},{type:'SkipStage'},{type:'OpenShop'}])state=send(state,action);
 state.gold=30;state.purchaseCoupons=1;state.handLevels={'high-card':1,pair:4,straight:7,flush:1,'three-kind':30};
 state.jokers=[r2CreateJoker('e02','build-practice/discount',4,'none',state)];
 state.consumables=[{instanceId:'kept/T01',definitionId:'T01'},{instanceId:'kept/T08',definitionId:'T08'}];
 const checkpoint=makeCheckpoint(state,[]);assert.ok(readCheckpoint(checkpoint).ok);return checkpoint;
}
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const report={head:git(['rev-parse','HEAD']),sourceTree:git(['rev-parse','HEAD:src']),modified:git(['status','--short','--','src','tests','harness']),scope:'Validator-approved current-identity public fixtures; native mouse/touch/DOM and actual SavedRun/IDB. Three routes at four viewports. Not natural discovery/acquisition, physical device, gameplay balance or legacy migration.',cases:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const snapshot=p=>p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),session=gameSession();return {state:session.run.state,journal:session.run.journal,slots:await session.storage.read(),storage:Object.fromEntries(Object.keys(localStorage).filter(k=>!k.includes('lease')).map(k=>[k,localStorage.getItem(k)]))};});
try{
 for(const [width,height] of [[1366,768],[390,844],[320,568],[390,568],[844,300]]){
  const touch=width<500,context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'}),p=await context.newPage();
  const viewport={width,height,cases:[]};report.cases.push(viewport);
  const dom=locator=>touch?locator.tap():locator.click(),tap=name=>tapUI(p,'shop',name,touch),idle=()=>p.waitForFunction(()=>window.__harness.game.scene.getScene('shop')?.ready);
  p.on('dialog',d=>d.accept());
  await p.goto(`http://127.0.0.1:${port}/?harness=1`);await waitScene(p,'title');
  for(const [focus,handType,all,mode] of [['group','pair',false,'delayed'],['straight','straight',true,'quota'],['flush','flush',true,'direct']]){
   const row={focus,handType,all,mode,shots:[],checks:[],errors:[],transactions:[]};viewport.cases.push(row);const onError=e=>row.errors.push(String(e));p.on('pageerror',onError);
   const journey=()=>p.locator('.build-journey-dialog[open]'),scroll=()=>journey().locator('.dialog-scroll'),confirm=()=>p.locator('.build-journey-practice[open]');
   const expectedBases={group:['基础热度 80 → 95（+15）','基础倍率 3.5 → 4（+0.5）'],straight:['基础热度 335 → 370（+35）','基础倍率 7 → 7.5（+0.5）'],flush:['基础热度 140 → 170（+30）','基础倍率 4 → 4.5（+0.5）']}[focus];
   const checkBases=async(selector,label)=>{
    const d=p.locator(selector),text=await d.locator('.dialog-effect').innerText();
    for(const line of expectedBases)assert.ok(text.includes(line),text);assert.match(text,/仅打出该牌型时读取/);assert.doesNotMatch(text,/总分|预计|×|实际手分\s*\d/);
    const geometry=await d.evaluate(async dialog=>{
     const rect=e=>e.getBoundingClientRect().toJSON(),content=dialog.querySelector('.dialog-content'),effect=dialog.querySelector('.dialog-effect'),actions=dialog.querySelector('.dialog-actions'),node=effect.firstChild,lines=[];
     content.scrollTop=0;let start=0;
     for(const line of node.textContent.split('\n')){
      const range=document.createRange();range.setStart(node,start);range.setEnd(node,start+line.length);
      const first=range.getBoundingClientRect(),clip=content.getBoundingClientRect();content.scrollTop+=first.top-clip.top;
      await new Promise(requestAnimationFrame);lines.push({text:line,rects:[...range.getClientRects()].map(r=>r.toJSON()),clip:rect(content)});start+=line.length+1;
     }
     content.scrollTop=0;
     return {dialog:rect(dialog),actions:rect(actions),buttons:[...actions.querySelectorAll('button')].map(rect),lines,viewport:{width:innerWidth,height:innerHeight},text:effect.textContent};
    });
    assert.ok(geometry.dialog.x>=0&&geometry.dialog.y>=0&&geometry.dialog.right<=width+1&&geometry.dialog.bottom<=height+1);
    for(const b of geometry.buttons){assert.ok(b.height>=44&&b.width>=44);assert.ok(b.top>=0&&b.bottom<=height+1);}
    for(const line of geometry.lines)for(const r of line.rects){assert.ok(r.left>=geometry.dialog.left&&r.right<=geometry.dialog.right+1);assert.ok(r.top>=line.clip.top-1&&r.bottom<=line.clip.bottom+1,JSON.stringify({label,line}));}
    row.baseChecks??=[];row.baseChecks.push({label,expectedBases,geometry});
   };

   const shot=async name=>{const file=`${width}x${height}-${focus}-${name}.png`;try{await p.waitForFunction(()=>[...document.querySelectorAll('.detail-dialog[open] img')].filter(e=>{const r=e.getBoundingClientRect();return e.getClientRects().length&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;}).every(e=>e.complete&&e.naturalWidth>0));}catch(error){row.imageWaitFailure=await p.locator('.detail-dialog[open] img').evaluateAll(es=>es.map(e=>({src:e.currentSrc,complete:e.complete,width:e.naturalWidth,loading:e.loading,rect:e.getBoundingClientRect().toJSON()})));await p.screenshot({path:out+'/'+file.replace('.png','-FAIL.png'),scale:'css'});throw error;}await p.screenshot({path:out+'/'+file,scale:'css'});row.shots.push(file);};
   try{
    const checkpoint=fixture(focus);await dom(p.locator('.run-menu-toggle'));const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await dom(section.locator('summary'));const chooser=p.waitForEvent('filechooser');await dom(p.getByRole('button',{name:'导入本局',exact:true}));await(await chooser).setFiles({name:'controlled-build-practice.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'shop');await idle();await p.waitForTimeout(250);
    await p.evaluate(()=>{const run=window.__harness.game.registry.get('runController'),dispatch=run.dispatch.bind(run);window.__buildPracticeDispatch=[];run.dispatch=(...args)=>{window.__buildPracticeDispatch.push(structuredClone(args));return dispatch(...args);};});
    row.initial=await snapshot(p);row.last=row.initial;const quote=r2PracticeQuotes(row.initial.state).find(q=>q.handType===handType);assert.ok(quote);row.quote=quote;
    await tap('action/build');await journey().waitFor();if(all){await dom(p.getByRole('button',{name:'查看全部现货与持牌',exact:true}));await journey().waitFor();}await shot('journey');
    const pageIdentity=await journey().evaluate(e=>({focus:e.dataset.buildFocus,all:e.dataset.buildAll,title:e.querySelector('h2')?.textContent}));assert.equal(pageIdentity.focus,focus);assert.equal(pageIdentity.all,String(all));row.pageIdentity=pageIdentity;
    const option=()=>journey().locator(`.build-practice-option[data-hand-type="${handType}"] button`);
    const open=async()=>{await option().scrollIntoViewIfNeeded();row.returnScroll=await scroll().evaluate(e=>e.scrollTop);if(!row.entryShot){await shot('practice-entry');row.entryShot=true;}await dom(option());await confirm().waitFor();assert.equal(await confirm().getAttribute('data-practice-source'),'journey');};
    const returned=async()=>{await journey().waitFor();assert.deepEqual(await journey().evaluate(e=>({focus:e.dataset.buildFocus,all:e.dataset.buildAll,title:e.querySelector('h2')?.textContent})),pageIdentity);};
    await open();assert.match(await confirm().innerText(),new RegExp(`Lv\\.${quote.levelBefore} → Lv\\.${quote.levelAfter}`));assert.match(await confirm().innerText(),new RegExp(`实付 ${quote.price} 金`));await checkBases('.build-journey-practice[open]','confirmation');await shot('quote');await dom(confirm().getByRole('button',{name:'返回培养路线',exact:true}));await returned();assert.equal(await scroll().evaluate(e=>e.scrollTop),row.returnScroll);assert.ok(await option().evaluate(e=>document.activeElement===e),'cancel restores original practice entry focus');assert.deepEqual(await snapshot(p),row.initial);
    await open();await p.keyboard.press('Escape');await returned();assert.equal(await scroll().evaluate(e=>e.scrollTop),row.returnScroll);assert.ok(await option().evaluate(e=>document.activeElement===e),'cancel restores original practice entry focus');assert.deepEqual(await snapshot(p),row.initial);assert.equal(await p.evaluate(()=>window.__buildPracticeDispatch.length),0);row.checks.push('matching route discovered quote opens without commands; cancel and Escape restore original simplified/all journey and scroll with full save unchanged');
    await open();
    if(mode!=='direct')await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts'),session=gameSession(),commit=session.storage.commit.bind(session.storage);window.__buildPracticeCommit=commit;window.__buildPracticeAttempts=0;session.storage.commit=(...args)=>{window.__buildPracticeAttempts++;return new Promise((resolve,reject)=>{window.__buildPracticeFinish=()=>commit(...args).then(resolve,reject);window.__buildPracticeReject=()=>reject(new DOMException('controlled build practice quota','QuotaExceededError'));});};});
    const button=confirm().locator('.dialog-primary');await dom(button);
    if(mode!=='direct'){
     await p.waitForFunction(()=>window.__buildPracticeAttempts===1);assert.ok(await button.isDisabled());assert.ok(await confirm().locator('.dialog-close').isDisabled());await p.keyboard.press('Escape');assert.equal(await confirm().count(),1);const box=await button.boundingBox();if(touch)await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await p.mouse.click(box.x+box.width/2,box.y+box.height/2);assert.equal(await p.evaluate(()=>window.__buildPracticeAttempts),1);assert.deepEqual(await snapshot(p),row.initial);await shot('saving');
     if(mode==='quota'){
      await p.evaluate(()=>window.__buildPracticeReject());await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused');assert.deepEqual(await snapshot(p),row.initial);await shot('save-failure');await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts');gameSession().storage.commit=window.__buildPracticeCommit;});await dom(p.getByRole('button',{name:'重试保存',exact:true}));
     }else await p.evaluate(async()=>{const {gameSession}=await import('/src/game/session.ts');gameSession().storage.commit=window.__buildPracticeCommit;window.__buildPracticeFinish();});
    }
    await idle();const after=await snapshot(p),action={type:'PracticeHand',handType:quote.handType,expectedLevel:quote.levelBefore,shopSeq:quote.shopSeq},expectedCommand=command(row.initial.state,action),expected=applyCommand(row.initial.state,expectedCommand);assert.ok(expected.ok,expected.code);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.journal,[...row.initial.journal,expectedCommand]);assert.deepEqual(after.slots.current,makeCheckpoint(after.state,after.journal));assert.equal(after.slots.revision,row.initial.slots.revision+1);assert.deepEqual(after.storage,row.initial.storage);row.transactions.push({action,before:row.initial,after,events:expected.events});row.last=after;
    assert.equal(after.state.gold,row.initial.state.gold-quote.price);assert.equal(after.state.handLevels[handType],quote.levelAfter);assert.deepEqual(after.state.consumables,row.initial.state.consumables);assert.deepEqual(after.state.rng,row.initial.state.rng);assert.deepEqual(after.state.chapterTargetPlan,row.initial.state.chapterTargetPlan);assert.deepEqual(await p.evaluate(()=>window.__buildPracticeDispatch),[[action,quote.expectedSeq]]);row.checks.push('one original PracticeHand/expectedSeq; exact authority state/journal/IDB; one debit/level/quota change, no inventory/RNG/target drift');
    await p.locator('.shop-practice-result[open]').waitFor();await checkBases('.shop-practice-result[open]','saved');await shot('saved');await dom(p.locator('.shop-practice-result[open]').getByRole('button',{name:'返回培养路线',exact:true}));await returned();row.returnAfterSave=await scroll().evaluate(e=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight}));assert.ok(Math.abs(row.returnAfterSave.top-Math.min(row.returnScroll,row.returnAfterSave.max))<=1,'saved fresh journey restores original scroll within new content bounds');assert.deepEqual(await snapshot(p),after);assert.equal(await journey().locator('.build-practice-option button:not(:disabled)').count(),0);await shot('returned-quota-used');row.checks.push('saved receipt returns to fresh original journey variant and consumed upgrade quota');
    await dom(journey().locator('.dialog-close'));
    if(focus==='group'){
     const before=row.last,action={type:'RerollShop'},c=command(before.state,action),expected=applyCommand(before.state,c);assert.ok(expected.ok,expected.code);await tap('action/reroll');await idle();const actual=await snapshot(p);assert.deepEqual(actual.state,expected.state);assert.deepEqual(actual.journal,[...before.journal,c]);assert.deepEqual(actual.slots.current,makeCheckpoint(actual.state,actual.journal));assert.equal(actual.slots.revision,before.slots.revision+1);assert.deepEqual(actual.storage,before.storage);assert.deepEqual(actual.state.shop.basicChoice,before.state.shop.basicChoice);row.transactions.push({action,before,after:actual,events:expected.events});row.last=actual;
     await tap('action/build');await journey().waitFor();assert.equal(await journey().locator('.build-practice-option').count(),0);assert.deepEqual(await snapshot(p),actual);await shot('reroll-keeps-quota');await dom(journey().locator('.dialog-close'));row.checks.push('native RerollShop fully matches authority and keeps consumed shared quota; reopened journey cannot upgrade again');
    }
    const dispatches=await p.evaluate(()=>window.__buildPracticeDispatch);assert.equal(dispatches.filter(args=>args[0].type==='PracticeHand').length,1);assert.equal(dispatches.length,row.transactions.length);const saved=await snapshot(p);await p.reload();await waitScene(p,'title');assert.deepEqual(await snapshot(p),saved);row.restored=saved;row.dispatches=dispatches;row.checks.push('full state/journal/IDB/local preferences survive cold restore');assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',width,height,focus);
   }catch(error){row.status='FAIL';row.error=error.stack??String(error);await p.screenshot({path:out+`/${width}x${height}-${focus}-FAIL.png`,scale:'css'});throw error;}finally{p.off('pageerror',onError);}
  }
  await context.close();
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack??String(error);process.exitCode=1;console.error(error);}
finally{await browser.close();await server.close();await writeFile(out+'/full-state-journal-storage.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report);for(const viewport of brief.cases)for(const row of viewport.cases){for(const key of ['initial','last','restored'])if(row[key])row[key]={seq:row[key].state.commandSeq,gold:row[key].state.gold,levels:row[key].state.handLevels,quota:row[key].state.shop?.basicChoice};row.transactions=row.transactions.map(t=>({action:t.action,beforeSeq:t.before.state.commandSeq,afterSeq:t.after.state.commandSeq,events:t.events}));}await writeFile(out+'/report.json',JSON.stringify(brief,null,2)+'\n');console.log(report.status,out);}
