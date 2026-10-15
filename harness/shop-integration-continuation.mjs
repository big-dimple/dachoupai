/** Frozen compiled build; six bounded native starts/first hands, not 18 long runs. */
import assert from 'node:assert/strict';
import {createServer,preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {waitScene,tapUI,openSelector} from './ui.mjs';
const out=process.env.INTEGRATION_OUT??'/tmp/shop-integration-final/continuation',buildDir=process.env.INTEGRATION_BUILD??'shots/shop-integration-build';await mkdir(out,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},logLevel:'error'});
const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{newRunIdentity}=await ssr.ssrLoadModule('/src/game/RunLaunch.ts'),{makeCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');await ssr.close();
const server=await preview({build:{outDir:buildDir},preview:{host:'127.0.0.1',port:5588,strictPort:true},logLevel:'error'}),base='http://127.0.0.1:5588';
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const report={head:git(['rev-parse','HEAD']),sourceTree:git(['rev-parse','HEAD:src']),build:await(await fetch(base+'/build-info.json')).json(),scope:'Frozen compiled source; six normal selected heroes, each reads three routes and starts one distributed route, actual starter purchase with save fault/retry, build views, one public first hand and cold continue. Not 18 complete runs, six-hero skill-payoff/balance, physical device or human/art/audio acceptance.',cases:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});
const read=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return c?{state:c.state,journal:c.journal,slots:await c.store.read()}:null;});
const command=(s,action)=>({runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
const sizes=[[1366,768],[390,740],[320,568]],ids=['amo','touye','laohuan','erxiang','azao','xiemu'],routes=['group','straight','flush'];
async function audit(p,row,label){
 const info=await p.evaluate(()=>{
  const dialog=document.querySelector('.detail-dialog[open]');if(!dialog)return {title:null,clipped:[],buttons:[]};
  const clipped=[];for(const el of dialog.querySelectorAll('h2,p,li,button,summary')){
   const css=getComputedStyle(el),box=el.getBoundingClientRect();if(!box.width||!box.height||css.visibility==='hidden'||!el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}))continue;
   const closed=el.closest('details:not([open])');if(closed&&!closed.querySelector(':scope > summary')?.contains(el))continue;
   const range=document.createRange();range.selectNodeContents(el);const rects=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);let scrollY=false;
   for(let parent=el;parent&&parent!==document.body;parent=parent.parentElement){
    const style=getComputedStyle(parent),r=parent.getBoundingClientRect();
    if(['auto','scroll'].includes(style.overflowY)&&parent.scrollHeight>parent.clientHeight)scrollY=true;
    const x=['hidden','clip'].includes(style.overflowX),y=!scrollY&&['hidden','clip'].includes(style.overflowY);
    if(!x&&!y)continue;
    for(const t of rects){if(t.bottom<=0||t.top>=innerHeight||t.right<=0||t.left>=innerWidth)continue;
     const badX=x&&(t.left<r.left+parent.clientLeft-1||t.right>r.left+parent.clientLeft+parent.clientWidth+1),badY=y&&(t.top<r.top+parent.clientTop-1||t.bottom>r.top+parent.clientTop+parent.clientHeight+1);
     if((badX||badY)&&style.textOverflow!=='ellipsis')clipped.push({text:el.textContent,tag:el.tagName,parent:parent.className,rect:t.toJSON(),clip:r.toJSON(),badX,badY});
    }
   }
  }
  return {title:dialog.querySelector('h2')?.textContent,clipped,buttons:[...dialog.querySelectorAll(':scope > .dialog-actions button')].map(b=>({label:b.textContent,box:b.getBoundingClientRect().toJSON()}))};
 });row.textAudits??=[];row.textAudits.push({label,...info});assert.deepEqual(info.clipped,[],label+' text stays inside clipping parents');
 for(const b of info.buttons)assert.ok(b.box.height>=44&&b.box.left>=-1&&b.box.right<=p.viewportSize().width+1&&b.box.top>=-1&&b.box.bottom<=p.viewportSize().height+1,label+' fixed action '+b.label);
 const file=row.id+'-'+label+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});row.shots.push(file);
}
try{
 for(const [index,id] of ids.entries()){
  if(process.env.INTEGRATION_HEROES&&!process.env.INTEGRATION_HEROES.split(',').includes(id))continue;
  const [width,height]=sizes[index%3],route=routes[index%3],touch=width<700,context=await browser.newContext({viewport:{width,height},hasTouch:touch,reducedMotion:'reduce'}),p=await context.newPage(),row={id,route,width,height,shots:[],errors:[],transactions:[]};report.cases.push(row);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e)));p.setDefaultTimeout(20000);
  const dom=l=>touch?l.tap():l.click(),tap=(scene,name)=>tapUI(p,scene,name,touch),close=()=>dom(p.locator('.detail-dialog[open] .dialog-close'));
  const idle=()=>p.waitForFunction(()=>window.__harness.game.registry.get('runController')?.status==='idle');
  const table=()=>p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('game')&&s.controlsLive&&!s.playing&&!s.presentation&&s.cardViews.length>0&&s.cardViews.every(v=>!v.dealing);});
  async function check(before,actions){
   let state=before.state,journal=[...before.journal];for(const action of actions){const c=command(state,action),r=applyCommand(state,c);assert.ok(r.ok,r.code);state=r.state;journal.push(c);}
   const after=await read(p);assert.deepEqual(after.state,state);assert.deepEqual(after.journal,journal);assert.deepEqual(after.slots.current,makeCheckpoint(state,journal));assert.equal(after.slots.revision,before.slots.revision+actions.length);row.transactions.push({actions,before,after});return after;
  }
  try{
   await p.goto(base+'/?harness=1&seed=integration-continuation-'+id);await openSelector(p,touch);await tap('character-select','character/'+id);const unstarted=await read(p);
   await tap('character-select','opening/hero-details');await p.locator('.hero-explanation[open][data-hero="'+id+'"]').waitFor();await audit(p,row,'selector-hero');await close();assert.deepEqual(await read(p),unstarted);
   await tap('character-select','action/confirm-character');for(const focus of routes){await tap('character-select','route/'+focus);assert.deepEqual(await read(p),unstarted);}await tap('character-select','route/'+route);await tap('character-select','action/confirm-character');await waitScene(p,'shop');await idle();
   const initial=await read(p),s=initial.state,expected=createRun({seed:s.seed,runId:s.runId,characterId:id,rulesVersion:'r2',r2Identity:newRunIdentity(id,route),openingRoute:route,modeConfig:{mode:s.mode,difficulty:s.difficulty,challengeId:s.challengeId,programsEnabled:s.programsEnabled}});assert.deepEqual(s,expected);assert.deepEqual(initial.journal,[]);row.initial=initial;await audit(p,row,'shop');
   const starter={group:'mantangcai',straight:'c04',flush:'c06'}[route],offer=s.shop.offers.find(o=>o.definitionId===starter);assert.ok(offer,'real route starter in normal first shop');
   await tap('shop','offer/'+offer.offerId);await p.locator('.detail-dialog[open]').waitFor();await audit(p,row,'offer-view');await close();assert.deepEqual(await read(p),initial);
   await tap('shop','offer/'+offer.offerId);await p.evaluate(()=>{const c=window.__harness.game.registry.get('runController'),commit=c.store.commit.bind(c.store),dispatch=c.dispatch.bind(c);window.__integrationCommit=commit;window.__integrationActions=[];c.dispatch=(...args)=>{window.__integrationActions.push(structuredClone(args));return dispatch(...args);};c.store.commit=async()=>{throw new DOMException('controlled integration quota','QuotaExceededError');};});
   await dom(p.getByRole('button',{name:/^(邀请|购买) · \d+ 金$/}));await p.waitForFunction(()=>window.__harness.game.registry.get('runController').status==='paused');assert.deepEqual(await read(p),initial);await audit(p,row,'purchase-failure');
   await p.evaluate(()=>{const c=window.__harness.game.registry.get('runController');c.store.commit=window.__integrationCommit;});await dom(p.getByRole('button',{name:'重试保存',exact:true}));await idle();const bought=await check(initial,[{type:'BuyOffer',offerId:offer.offerId}]);assert.equal(await p.evaluate(()=>window.__integrationActions.filter(a=>a[0].type==='BuyOffer').length),1);
   if(await p.locator('.detail-dialog[open]').count())await close();await audit(p,row,'purchase-saved');
   await tap('shop','action/build');await p.locator('.build-journey-dialog[open]').waitFor();await audit(p,row,'build-simple');await dom(p.getByRole('button',{name:'查看全部现货与持牌',exact:true}));await audit(p,row,'build-all');const scroll=p.locator('.build-journey-dialog[open] .dialog-scroll'),box=await scroll.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.wheel(0,2000);await p.waitForTimeout(100);await audit(p,row,'build-bottom');await close();assert.deepEqual(await read(p),bought);
   await tap('shop','action/start-stage');await waitScene(p,'game');const start=p.getByRole('button',{name:'开始出牌',exact:true});if(await start.count())await dom(start);await table();const entered=await check(bought,[{type:'LeaveShop'},{type:'EnterStage'}]);
   await tap('game','hero/skill-entry');await p.locator('.hero-explanation[open][data-hero="'+id+'"]').waitFor();await audit(p,row,'table-hero');await close();assert.deepEqual(await read(p),entered);
   const selectedIds=entered.state.handOrder.slice(0,5);for(const card of selectedIds)await tap('game','card/'+card);await tap('game','action/play');await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,entered.state.commandSeq);await idle();const played=await check(entered,[{type:'PlayHand',selectedIds,...(id==='azao'?{azaoRelease:false}:{})}]);await p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||g.scene.isActive('game')&&!s.playing&&!s.presentation;});await audit(p,row,'first-hand');row.firstScore=played.state.lastTrace?.finalScore;row.phaseAfterFirstHand=played.state.phase;
   const cdp=await context.newCDPSession(p);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await p.reload();await waitScene(p,'title');await tap('title','action/title-continue');await p.waitForFunction(()=>{const g=window.__harness.game;return g.scene.isActive('game')||g.scene.isActive('intermission');});await idle();if(await p.evaluate(()=>window.__harness.game.scene.isActive('game')))await table();else await p.waitForFunction(()=>window.__harness.game.scene.getScene('intermission').ready);assert.deepEqual(await read(p),played);await audit(p,row,'cold-continue');row.restored=await read(p);assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',id,route,width);
  }catch(error){row.status='FAIL';row.error=error.stack??String(error);await p.screenshot({path:out+'/'+id+'-FAIL.png',scale:'css'}).catch(()=>{});throw error;}finally{await context.close();}
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=error.stack??String(error);process.exitCode=1;console.error(error);}
finally{await browser.close();await server.close();await writeFile(out+'/full-state.json.gz',gzipSync(JSON.stringify(report)));const brief=structuredClone(report);for(const row of brief.cases){for(const key of ['initial','restored'])if(row[key])row[key]={seq:row[key].state.commandSeq,phase:row[key].state.phase};row.transactions=row.transactions.map(t=>({actions:t.actions,beforeSeq:t.before.state.commandSeq,afterSeq:t.after.state.commandSeq}));}await writeFile(out+'/report.json',JSON.stringify(brief,null,2)+'\n');console.log(report.status,out);}
