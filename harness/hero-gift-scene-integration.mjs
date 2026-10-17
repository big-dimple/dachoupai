import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';

const out=process.env.HERO_GIFT_OUT??'shots/hero-gift-scene-integration',port=5697;
await mkdir(out,{recursive:true});
const ssr=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'error'});
const load=p=>ssr.ssrLoadModule(p);
const [{scoreEnergyFixture},{liueAttachmentFixture},{dynamicHeroFixture},{touyeFixture,touyeSend,touyeBet},{heroRefillFixture},{c12GiftEvidence},{applyCommand},{makeCheckpoint,readCheckpoint}]=await Promise.all([
 load('/harness/fixtures/score-energy.ts'),load('/harness/fixtures/liue-target-attachment.ts'),load('/harness/fixtures/wencheng-huarui-dynamic.ts'),load('/tests/fixtures/touye-new-core.ts'),load('/harness/fixtures/hero-gift-scene.ts'),load('/harness/fixtures/c12-gift-delivery.ts'),load('/src/domain/run.ts'),load('/src/application/checkpoint.ts')]);
const amo=scoreEnergyFixture('multiply'),liue=liueAttachmentFixture(),xin=dynamicHeroFixture('azao'),hua=dynamicHeroFixture('xiemu'),qin=touyeFixture(),wen=heroRefillFixture();
const norm=await c12GiftEvidence(),full=await c12GiftEvidence(true);
const specs=[
 {key:'hero-amo',state:amo.state,ids:amo.selectedIds,assistIds:amo.assistIds},
 {key:'hero-touye',state:touyeSend(qin.state,touyeBet(qin.state,qin.discard,qin.target)),ids:qin.play},
 {key:'hero-azao',state:xin.state,ids:xin.selectedIds,azaoRelease:true},
 {key:'hero-erxiang',state:liue.state,ids:liue.selectedIds,erxiangTargetId:liue.targetId},
 {key:'hero-xiemu',state:hua.state,ids:hua.selectedIds,xiemuBurn:10},
 {key:'hero-laohuan',state:wen.state,ids:wen.selectedIds,refill:true},
 {key:'gift-pc',gift:true,state:norm.before,ids:norm.command.action.selectedIds},
 {key:'gift-phone',gift:true,phone:true,state:norm.before,ids:norm.command.action.selectedIds},
 {key:'gift-full',gift:true,phone:true,state:full.before,ids:full.command.action.selectedIds},
 {key:'gift-cancel',gift:true,cancel:true,state:norm.before,ids:norm.command.action.selectedIds},
 {key:'gift-save-failed',gift:true,fail:true,state:norm.before,ids:norm.command.action.selectedIds},
 {key:'hero-phone-reduced',phone:true,reduced:true,state:liue.state,ids:liue.selectedIds,erxiangTargetId:liue.targetId},
].filter(s=>!process.env.HERO_GIFT_CASES||process.env.HERO_GIFT_CASES.split(',').includes(s.key));
for(const s of specs)assert.equal(readCheckpoint(makeCheckpoint(s.state,[])).ok,true,s.key+' invalid checkpoint');
await ssr.close();
const bundle=resolve(out,'build');if(!process.env.HERO_GIFT_REUSE_BUILD)await build({mode:'e2e',build:{outDir:bundle},logLevel:'error'});
const server=await preview({build:{outDir:bundle},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'}),browser=await chromium.launch({channel:'msedge',headless:true});
const report={product:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--short'],{encoding:'utf8'}),buildInfo:JSON.parse(await readFile(bundle+'/build-info.json','utf8')),browser:browser.version(),scope:'Actual compiled GameScene + SavedRun, public import. Six heroes use controlled Scene selections and existing saved gameplay methods; gift success/failure uses real canvas card/play clicks. Original unchanged targets/rules. Not natural acquisition, complete native hero-input coverage, hearing, physical devices or art acceptance.',cases:[],status:'RUNNING'};
const states=[];
const snapshot=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return{state:c.state,journal:c.journal,storage:await c.store.read()};});
try{for(const spec of specs){
 const dir=out+'/'+spec.key;await mkdir(dir,{recursive:true});const viewport={width:spec.phone?390:1366,height:spec.phone?740:768};
 const context=await browser.newContext({viewport,deviceScaleFactor:spec.phone?2:1,hasTouch:!!spec.phone,reducedMotion:spec.reduced?'reduce':'no-preference',recordVideo:{dir,size:viewport}}),p=await context.newPage();p.setDefaultTimeout(30000);
 const row={key:spec.key,viewport,errors:[],status:'RUNNING'};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
 try{
  await p.addInitScript(reduced=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:reduced})),!!spec.reduced);
  console.log(spec.key+': public import');await p.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(p,'title');
  await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
  const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'hero-gift-controlled.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(spec.state,[])))});
  await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.cardViews.every(v=>!v.dealing)&&s.heroPortrait?.active;});
  if(await p.locator('.detail-dialog[open]').count())await p.keyboard.press('Escape');
  row.rest=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),i=s.heroPortrait;return{hero:s.characterId,key:i.texture.key,bounds:i.getBounds(),source:{width:i.width,height:i.height},scale:[i.scaleX,i.scaleY],slots:s.view.layout.slots,score:s.view.layout.scoreBoard,hand:s.view.layout.hand,inventory:s.inventoryButton.getBounds(),help:s.tableHelpBox()};});
  await p.screenshot({path:dir+'/rest.png'});
  await p.evaluate(()=>{
   const game=window.__harness.game,s=game.scene.getScene('game'),c=game.registry.get('runController'),probe=window.heroGiftProbe={frames:[],heroCalls:[],giftCalls:[],arrivals:[],shots:{}};
   const m=s.heroPortraitMotion;for(const method of ['play','playRefill']){const original=m[method].bind(m);m[method]=(...args)=>{const options=args.at(-1),call={method,eventId:options.event?.eventId,seq:c.state.commandSeq,status:c.status,phases:[]};probe.heroCalls.push(call);const phase=options.onPhase;options.onPhase=value=>{call.phases.push({phase:value,at:performance.now()});phase?.(value);};return original(...args);};}
   const d=s.giftDelivery,play=d.play.bind(d),arrived=d.options.arrived;
   d.play=(fact,context)=>{const call={fact,seq:c.state.commandSeq,status:c.status,at:performance.now()};probe.giftCalls.push(call);return play(fact,context).then(result=>{call.result=result;return result;});};
   d.options.arrived=fact=>{arrived?.(fact);probe.arrivals.push({fact,at:performance.now(),inventory:s.inventoryButton.getData('label').text,gold:s.goldText.text});};
   const capture=key=>{if(!probe.shots[key])probe.shots[key]=game.canvas.toDataURL('image/png').split('base64,')[1];};
   const tick=()=>{if(!s.scene.isActive())return;const i=s.heroPortrait,g=s.view.root.getByName('gift/delivery');const hero=i?.active?{phase:i.getData('scorePhase'),eventId:i.getData('scoreEventId'),x:i.x,y:i.y,angle:i.angle,scaleX:i.scaleX,scaleY:i.scaleY,tint:i.tintTopLeft}:undefined;
    const gift=g?.active?{phase:g.getData('phase'),flight:g.getData('flight'),arrived:g.getData('arrived'),fact:g.getData('gift'),caption:g.getByName('gift/arrival').getBounds(),payload:g.getByName('gift/payload').getBounds(),numbers:[s.scoreHeat,s.scoreMult,s.scoreTotal].map(o=>o.getBounds())}:undefined;
    probe.frames.push({at:performance.now(),hero,gift,inventory:s.inventoryButton?.getData('label')?.text,gold:s.goldText?.text,seq:c.state.commandSeq});
    if(hero?.phase==='impact')capture('hero-impact');if(gift?.phase==='source')capture('gift-source');if(gift?.phase==='flight'&&gift.flight>.35&&gift.flight<.7)capture('gift-flight');if(gift?.phase==='arrival')capture('gift-arrival');};game.events.on('postrender',tick);probe.stop=()=>game.events.off('postrender',tick);
  });
  const before=await snapshot(p);
  if(spec.gift){
   if(spec.fail)await p.evaluate(()=>{window.__harness.game.registry.get('runController').store.commit=async()=>{throw Error('controlled-save-failure');};});
   for(const id of spec.ids)await tapUI(p,'game','card/'+id,!!spec.phone);
   assert.deepEqual(await snapshot(p),before,spec.key+' selection writes state');await tapUI(p,'game','action/play',!!spec.phone);
  }else await p.evaluate(spec=>{const s=window.__harness.game.scene.getScene('game');s.selectedIds=new Set(spec.ids);s.assistIds=spec.assistIds??[];s.erxiangTargetId=spec.erxiangTargetId??null;s.azaoRelease=!!spec.azaoRelease;s.xiemuBurn=spec.xiemuBurn??0;s.refreshSelection();if(spec.refill)void s.chooseRefill();else void s.playSelected(true);},spec);
  if(spec.fail)await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').statusMessage.includes('未保存'));
  else {
   if(spec.cancel){await p.waitForFunction(()=>heroGiftProbe.frames.some(f=>f.gift?.phase==='flight'));await p.evaluate(()=>window.__harness.game.scene.getScene('game').fastForward());}
   await p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')||!s.playing&&!s.presentation&&!s.refillPresentation;});
  }
  await p.evaluate(()=>heroGiftProbe.stop());const observed=await p.evaluate(()=>{const {shots,stop,...r}=heroGiftProbe;return{...r,shots};});
  for(const [name,data] of Object.entries(observed.shots)){await writeFile(dir+'/'+name+'.png',Buffer.from(data,'base64'));}delete observed.shots;
  const after=await snapshot(p);states.push({key:spec.key,before,after});
  if(spec.fail){assert.deepEqual(after,before);assert.equal(observed.giftCalls.length,0);assert.equal(observed.arrivals.length,0);assert.equal(observed.frames.some(f=>f.gift),false);row.savedStateUnchanged=true;}
  else {
   assert.equal(after.journal.length,before.journal.length+1);const command=after.journal.at(-1),expected=applyCommand(before.state,command);assert.equal(expected.ok,true);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.storage.current,makeCheckpoint(after.state,after.journal));row.canonicalStateJournalStorage=true;row.action=command.action;
   if(spec.gift){for(const frame of observed.frames.filter(f=>f.gift)){const b=frame.gift.caption;assert.ok(b.x>=-.5&&b.x+b.width<=viewport.width+.5,'gift caption clipped');const p=frame.gift.payload;if(frame.gift.phase==='flight')for(const n of frame.gift.numbers)assert.ok(p.x+p.width<=n.x||p.x>=n.x+n.width||p.y+p.height<=n.y||p.y>=n.y+n.height,'gift crosses a numeric readout');}assert.equal(observed.giftCalls.length,1);assert.equal(observed.giftCalls[0].status,'idle');assert.equal(observed.arrivals.length,spec.cancel?0:1);assert.equal(observed.giftCalls[0].result,spec.cancel?'cancelled':'complete');if(!spec.cancel){assert.ok(observed.frames.some(f=>f.gift?.phase==='flight'));assert.ok(observed.frames.some(f=>f.gift?.phase==='arrival'));const f=observed.arrivals[0].fact;assert.equal(f.destination,spec.key==='gift-full'?'gold':'tools');assert.equal(f.after,spec.key==='gift-full'?32:1);}}
   else {const phases=observed.heroCalls.flatMap(c=>c.phases);assert.ok(phases.some(p=>p.phase==='impact'),spec.key+' no actual portrait impact');assert.ok(phases.some(p=>p.phase==='rest'),spec.key+' no portrait restore');assert.ok(observed.frames.some(f=>f.hero?.phase==='impact'));if(!spec.phone)assert.ok(row.rest.bounds.width>=180,'large PC portrait missing');}
  }
  assert.deepEqual(row.errors,[]);row.heroCalls=observed.heroCalls;row.giftCalls=observed.giftCalls;row.arrivals=observed.arrivals;row.frames=observed.frames.length;row.status='PASS';await writeFile(dir+'/frames.json.gz',gzipSync(JSON.stringify(observed)));await p.screenshot({path:dir+'/after.png'});console.log(spec.key+': PASS');
 }catch(error){row.status='FAIL';row.error=String(error.stack??error);try{await p.screenshot({path:dir+'/FAIL.png'});await writeFile(dir+'/failed-observation.json',JSON.stringify(await p.evaluate(()=>{const {shots,stop,...rest}=window.heroGiftProbe??{};return rest;}),null,2));}catch{}throw error;}
 finally{const video=p.video();await context.close();if(video)await rename(await video.path(),dir+'/continuous.webm');await writeFile(out+'/report.json',JSON.stringify(report,null,2));await writeFile(out+'/states.json.gz',gzipSync(JSON.stringify(states)));}
}
report.status='PASS';}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await writeFile(out+'/states.json.gz',gzipSync(JSON.stringify(states)));await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
console.log('actual hero/gift scene checks PASS: '+report.cases.length+' cases');
