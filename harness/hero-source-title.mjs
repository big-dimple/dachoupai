import assert from 'node:assert/strict';
import {build,preview} from 'vite';
import {build as bundle} from 'esbuild';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,tapMenuAction,openSelector} from './ui.mjs';
const runtimeNoise=/正式立绘|正式例会|架空青年形象|素材状态|独立眼原画|验收|样板|占位|开发计划|并非历史原话|摘句（简体）/;
const cleanPlayerCopy=(text,label)=>assert.ok(!runtimeNoise.test(text),label+' exposes production-only text: '+text);
const port=Number(process.env.HERO_TITLE_PORT??5591),dpr=Number(process.env.HERO_TITLE_DPR??1);
const out=process.env.HERO_TITLE_OUT??'shots/hero-source-title';await mkdir(out,{recursive:true});
const fixtureFile=path.resolve(out,'fixtures.mjs');
await bundle({stdin:{contents:"export {savedSkillName} from './src/game/SettlementHighlights';export {heroClimaxValue} from './src/game/HeroClimax';export {createRun,applyCommand} from './src/domain/run';export {newRunIdentity} from './src/game/RunLaunch';export {makeCheckpoint,readCheckpoint} from './src/application/checkpoint';export {r2CreateJoker} from './src/domain/r2Run';export {touyeChoice} from './src/game/TouyeWagerCopy';export {heroPayoffs} from './src/game/HeroPayoff';export {heroClimaxFixture} from './harness/fixtures/hero-climax';export {growthPayoffs} from './src/game/GrowthPayoff';export {getCharacter} from './src/game/characters';export {supportSettlementReady} from './harness/fixtures/settlement';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',define:{'import.meta.env.BASE_URL':JSON.stringify('./')},outfile:fixtureFile,logLevel:'error'});
const {savedSkillName,heroClimaxValue,createRun,applyCommand,newRunIdentity,makeCheckpoint,readCheckpoint,r2CreateJoker,touyeChoice,heroPayoffs,getCharacter,supportSettlementReady,heroClimaxFixture,growthPayoffs}=await import(pathToFileURL(fixtureFile).href);
const buildDir=path.resolve(process.env.HERO_TITLE_BUILD_DIR??path.join(out,'build'));if(!process.env.HERO_TITLE_BUILD_DIR)await build({root:process.env.HERO_TITLE_ROOT??process.cwd(),mode:'e2e',build:{outDir:buildDir,emptyOutDir:true},logLevel:'error'});
const v=await preview({build:{outDir:buildDir},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});
const hand=['spades-8','hearts-8','clubs-7','diamonds-7','spades-13','hearts-13','clubs-2','diamonds-4'];
function send(s,action,commandId='setup/'+s.commandSeq){const command={runId:s.runId,commandId,expectedSeq:s.commandSeq,action},r=applyCommand(s,command);assert.ok(r.ok,r.code);return {state:r.state,command};}
function arrange(s,ids=hand,incoming=[]){s=structuredClone(s);s.handOrder=[...ids];s.drawPile=[...s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!incoming.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id)),...[...incoming].reverse()];return s;}
function fixture(kind){
 if(kind==='natural-growth'){const f=heroClimaxFixture('growth');return {state:f.state,action:{type:'PlayHand',selectedIds:f.selectedIds}};}
 if(kind==='natural-erxiang'){
  let state=createRun({seed:'skill-choice-natural-0',runId:'ordinary/source-erxiang',rulesVersion:'r2',characterId:'erxiang',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
  state=send(send(state,{type:'LeaveShop'}).state,{type:'EnterStage'}).state;
  const cards=state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)),card=cards.find(c=>c.rank<=10&&cards.filter(x=>x.rank===c.rank).length>=2);assert.ok(card,'fixed ordinary seed has a real pair');
  const selectedIds=cards.filter(c=>c.rank===card.rank).slice(0,2).map(c=>c.id);return {state,action:{type:'PlayHand',selectedIds,erxiangTargetId:selectedIds[0]}};
 }
 if(kind==='e11')return supportSettlementReady();
 let state=createRun({seed:'group-natural-17',runId:'controlled/source-title/'+kind,rulesVersion:'r2',characterId:kind==='f06'?'amo':kind,r2Identity:newRunIdentity(kind==='f06'?'amo':kind,'group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state=send(send(state,{type:'LeaveShop'}).state,{type:'EnterStage'}).state;
 if(kind==='azao'){state=arrange(state,['spades-2','hearts-2','clubs-3','diamonds-3',...hand.slice(4)]);state=send(state,{type:'PlayHand',selectedIds:state.handOrder.slice(0,4)}).state;}
 state=arrange(state);if(kind==='xiemu')state.gold=20;if(kind==='touye')state=arrange(state,hand,['clubs-8','diamonds-6']);
 if(kind==='f06'){state.jokers=[r2CreateJoker('f06','controlled/title/f06',8,'none',state)];state.stage.initialJokerIds=state.jokers.map(j=>j.instanceId);return {state,action:{type:'PlayHand',selectedIds:hand.slice(0,4)}};}
 const selectedIds=kind==='erxiang'?hand.slice(0,2):kind==='touye'?[hand[0],hand[1],'clubs-8']:hand.slice(0,4);
 return {state,action:kind==='amo'?{type:'PlayAssistedHand',selectedIds,assistIds:hand.slice(4,6)}:{type:'PlayHand',selectedIds,...(kind==='erxiang'?{erxiangTargetId:hand[0]}:{}),...(kind==='azao'?{azaoRelease:true}:{}),...(kind==='xiemu'?{xiemuBurn:10}:{})}};
}
const specs=[...['natural-erxiang','natural-growth'].flatMap(kind=>[390,1366].map(width=>({kind,width}))),{kind:'natural-erxiang',width:740,height:320},{kind:'natural-erxiang',width:390,mode:'replay'},...['amo','erxiang','xiemu','azao','touye'].map(kind=>({kind,width:390})),{kind:'e11',width:740,height:320},{kind:'f06',width:740,height:320},{kind:'amo',width:1366},{kind:'xiemu',width:1366},{kind:'xiemu',width:320},{kind:'xiemu',width:390,mode:'fast'},...['e11','f06'].flatMap(kind=>[320,390,1366].map(width=>({kind,width}))),...['e11','erxiang'].flatMap(kind=>['reduce','skip','exit'].map(mode=>({kind,width:390,mode})))];
const report={root:process.env.HERO_TITLE_ROOT??process.cwd(),baseline:!!process.env.HERO_TITLE_BEFORE,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),srcTree:execFileSync('git',['rev-parse','HEAD:src'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}),scope:'Controlled legitimate public checkpoints, original production import/selection/skill/play/menu inputs. Full state+journal+storage+localStorage and cold reload. No direct presentation mounts, scene pauses or timing modifications; postrender canvas snapshots and actual pixel checks are observational, not a physical performance or complete game acceptance.',cases:[]};
report.buildInfo=JSON.parse(await readFile(path.join(buildDir,'build-info.json'),'utf8'));const browser=await chromium.launch();report.browser=browser.version();
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read(),localStorage:Object.fromEntries(Object.entries(localStorage).sort())};});
const expectedFocus=process.env.HERO_FOCUS_ASSET_PROOF?JSON.parse(await readFile('public/assets/tangsong-portraits/manifest.json','utf8')).assets.find(a=>a.id==='amo'&&a.purpose==='focus'):undefined;
const settle=p=>p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')&&g.scene.getScene('intermission').ready||s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(x=>!x.dealing&&!s.tweens.isTweening(x.container));});
async function transaction(p,before,action){await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.state.commandSeq);const after=await saved(p),receipt=after.state.receipts.at(-1),expected=send(before.state,action,receipt.commandId);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.journal,[...before.journal,expected.command]);assert.deepEqual(after.storage.current,makeCheckpoint(after.state,after.journal));assert.equal(after.storage.revision,before.storage.revision+1);assert.deepEqual(after.localStorage,before.localStorage);return after;}
try{for(const spec of specs){const mode=spec.mode??'normal',key=spec.kind+'-'+spec.width+'-'+mode;if(process.env.HERO_TITLE_CASES&&!process.env.HERO_TITLE_CASES.split(',').includes(key))continue;const row={key,...spec,mode,dpr,errors:[]};report.cases.push(row);const touch=spec.width<800,p=await browser.newPage({viewport:{width:spec.width,height:spec.height??(spec.width===1366?768:740)},hasTouch:touch,deviceScaleFactor:dpr,reducedMotion:mode==='reduce'?'reduce':'no-preference'});p.setDefaultTimeout(45000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(e.stack));
 const assetReads=[];if(expectedFocus){row.assetResponses=[];p.on('response',response=>{if(/\/assets\/tangsong-portraits\/amo\.(?:focus|portrait|avatar|selection)\.webp/.test(response.url()))assetReads.push(response.body().then(bytes=>row.assetResponses.push({url:response.url(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})));});}
 try{if(mode==='fast')await p.addInitScript(()=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:false})));const f=fixture(spec.kind);if(process.env.HERO_FOCUS_HELD_TOOL)f.state={...f.state,consumables:[{instanceId:'controlled/focus/held/T01',definitionId:'T01'}]};assert.ok(readCheckpoint(makeCheckpoint(f.state,[])).ok);row.fixture=makeCheckpoint(f.state,[]);
  await p.goto('http://127.0.0.1:'+port+'/?harness=1',{waitUntil:'domcontentloaded'});await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'source-title.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(row.fixture))});await waitScene(p,'game');await settle(p);const intro=p.getByRole('button',{name:'开始出牌',exact:true});if(await intro.count())await intro.click();if(await p.locator('.detail-dialog[open]').count())await p.getByRole('button',{name:'关闭',exact:true}).click();await p.evaluate(()=>document.fonts.ready);assert.deepEqual((await saved(p)).state,f.state);
  row.initial=await saved(p);
  if(spec.kind==='touye'){for(const id of hand.slice(6))await tapUI(p,'game','card/'+id,touch);await tapUI(p,'game','hero/action-shortcut',touch);await p.getByRole('button',{name:'押三条',exact:true}).click();await p.getByRole('button',{name:'确认押三条并弃2张',exact:true}).click();const action={type:'DiscardHand',selectedIds:hand.slice(6),touyeBet:{target:'three-kind',snapshotToken:touyeChoice(f.state,hand.slice(6)).snapshotToken}};row.bet=await transaction(p,row.initial,action);await settle(p);}
  row.before=await saved(p);for(const id of f.action.selectedIds)await tapUI(p,'game','card/'+id,touch);
  if(!['e11','f06','touye','natural-growth'].includes(spec.kind)){await tapUI(p,'game','hero/action-shortcut',touch);row.skillDialog=await p.locator('dialog[open]').evaluate(d=>({text:d.innerText,alts:[...d.querySelectorAll('img')].map(i=>i.alt)}));cleanPlayerCopy(row.skillDialog.text,'skill dialog');for(const alt of row.skillDialog.alts)cleanPlayerCopy(alt,'skill image alt');if(spec.kind==='xiemu')await p.screenshot({path:out+'/'+key+'-skill-dialog.png'});const label=spec.kind==='amo'?'K♠ K♥ · 助攻 ×2':spec.kind==='erxiang'?'第1张 · 8♠':spec.kind==='xiemu'?'燃10金 ×2':'本手释放 ×1.5';if(spec.kind==='amo'){assert.deepEqual(await p.evaluate(()=>window.__harness.game.scene.getScene('game').assistIds),f.action.assistIds);}else if(spec.kind==='natural-erxiang'){await p.locator('dialog[open] .dialog-choice-actions button').first().click();const target=await p.evaluate(()=>window.__harness.game.scene.getScene('game').erxiangTargetId);assert.ok(f.action.selectedIds.includes(target));f.action.erxiangTargetId=target;row.actualNaturalTarget=target;}else await p.getByRole('button',{name:label,exact:true}).click();}
  assert.deepEqual(await saved(p),row.before,'selection and skill choice do not persist');
  await p.evaluate(cinema=>{
   window.__titleFrames=[];window.__titleImages=[];window.__panelTimeline=[];window.__shotImages=[];window.__cinemaFrames=[];window.__growthFrames=[];window.__focusGeometry=[];window.__orphanChrome=[];window.__chromeShot=undefined;const growthSeen=new Set();
   const seen=new Set(),shots=new Set(),g=window.__harness.game;let lastClip=-1000;
   const visible=list=>list.flatMap(o=>o.active&&o.visible!==false&&o.alpha!==0?[o,...(o.list?visible(o.list):[])]:[]);
   const pixels=(name,texts)=>{
    const b=texts.find(t=>t.name===name)?.bounds;if(!b)return 0;
    const c=document.createElement('canvas');c.width=g.canvas.width;c.height=g.canvas.height;const ctx=c.getContext('2d');ctx.drawImage(g.canvas,0,0);
    const css=g.canvas.getBoundingClientRect(),dx=c.width/css.width,dy=c.height/css.height;
    const x=Math.max(0,Math.floor(b.x*dx)),y=Math.max(0,Math.floor(b.y*dy)),w=Math.min(c.width-x,Math.ceil(b.width*dx)),h=Math.min(c.height-y,Math.ceil(b.height*dy));if(w<=0||h<=0)return 0;
    const a=ctx.getImageData(x,y,w,h).data;let count=0;
    for(let i=0;i<a.length;i+=4)if(name==='hero/climax-value'?Math.abs(a[i]-184)<42&&Math.abs(a[i+1]-71)<42&&Math.abs(a[i+2]-58)<42:a[i]<100&&a[i+1]<110&&a[i+2]<110)count++;
    return count;
   };
   g.events.on('postrender',renderer=>{
    const scene=g.scene.getScene('game'),group=scene.heroClimax?.group;
    const painted=o=>{for(let p=o;p;p=p.parentContainer)if(!p.active||p.visible===false||p.alpha===0)return false;return true;};
    if(renderer&&scene.presentation){const button=scene.inventoryButton;for(const part of ['chest','inventoryReminder']){const object=button?.getData(part);if(object&&painted(object)&&!painted(button))window.__orphanChrome.push({part,time:performance.now()});}if(!window.__chromeShot&&!group?.active&&scene.scoreTotal?.getData('eventPhase')==='impact')window.__chromeShot={png:g.canvas.toDataURL('image/png'),eventId:scene.scoreTotal.getData('eventId'),text:scene.scoreTotal.text};}
    if(renderer&&group?.active&&group.visible){const all=visible(group.list),focus=all.find(o=>o.name==='hero/climax-eyes');if(focus){const source=focus.texture.getSourceImage();window.__focusGeometry.push({eventId:group.getData('eventId'),x:focus.x,y:focus.y,scaleX:focus.scaleX,scaleY:focus.scaleY,angle:focus.angle,crop:focus.getData('sampledCrop'),bounds:focus.getData('visibleBounds'),texture:focus.texture.key,sourceURL:source.currentSrc||source.src,sourceWidth:source.width,sourceHeight:source.height,shot:group.getData('shot')});}}
    if(renderer&&scene.presentation){const id=scene.scoreTotal?.getData('eventId'),phase=scene.scoreTotal?.getData('eventPhase'),event=scene.presentation.score.events.find(e=>e.eventId===id),key=id+'/'+phase;if(event?.sourceDefinitionId==='c06'&&['read-growth','add-growth'].includes(event.operation)&&!growthSeen.has(key)){growthSeen.add(key);window.__growthFrames.push({event,phase,text:scene.resultText.text,status:scene.statusText.text,multiplier:scene.scoreMult.text,timeMs:performance.now(),png:g.canvas.toDataURL('image/png')});}}
    if(!renderer||!group?.active||!group.visible||group.alpha===0)return;
    const now=performance.now(),id=group.getData('eventId'),shot=group.getData('shot')??'old-single-panel',subjectVisibleAt=group.getData('subjectVisibleAt');
    window.__panelTimeline.push({eventId:id,phase:group.getData('phase'),shot,timeMs:now,subjectVisibleAt,strikeAt:group.getData('strikeAt')});
    const texts=visible(group.list).filter(o=>o.type==='Text').map(o=>({name:o.name,text:o.text,font:o.style.fontSize,lines:o.getWrappedText(),bounds:o.getBounds(),scaleX:o.scaleX,scaleY:o.scaleY,resolution:o.style.resolution}));
    const sample=()=>({eventId:id,fact:group.getData('benefit'),phase:group.getData('phase'),shot,timeMs:now,subjectVisibleAt,reduced:scene.reducedMotion,playing:scene.playing,ready:scene.ready,headlineWidth:group.getData('headlineWidth'),panel:group.getData('panel'),backdrop:group.getData('opaqueBackdrop'),focusBounds:visible(group.list).find(o=>o.name==='hero/climax-eyes')?.getData('visibleBounds'),texts,pixelEvidence:{headline:pixels('hero/climax-name',texts),value:pixels('hero/climax-value',texts)}});
    if(subjectVisibleAt!==undefined&&shot!=='eyes'&&!seen.has(id)){
     seen.add(id);window.__titleFrames.push(sample());window.__titleImages.push({eventId:id,png:g.canvas.toDataURL('image/png')});
    }
    const shotKey=id+'/'+shot,lateKey=id+'/landing-late';
    if(!shots.has(shotKey)||(shot==='landing'||scene.reducedMotion)&&subjectVisibleAt!==undefined&&now-subjectVisibleAt>=780&&!shots.has(lateKey)){
     const late=shots.has(shotKey);shots.add(late?lateKey:shotKey);window.__shotImages.push({...sample(),shot:late?shot+'-late':shot,png:g.canvas.toDataURL('image/png')});
    }
    if(cinema&&(now-lastClip>=70||window.__cinemaFrames.length===0)){lastClip=now;window.__cinemaFrames.push({timeMs:now,eventId:id,shot,jpeg:g.canvas.toDataURL('image/jpeg',.85)});}
   });
  },!!process.env.HERO_TITLE_CINEMA);

  await tapUI(p,'game','action/play',touch);row.saved=await transaction(p,row.before,f.action);row.action=f.action;row.expectedKeys=heroPayoffs(row.saved.state,row.saved.state.lastTrace);
  if(spec.kind==='natural-growth'){
   await settle(p);assert.deepEqual(await saved(p),row.saved);const first=growthPayoffs(row.saved.state)[0];assert.ok(first&&first.change==='gain'&&first.caption.includes('下手生效'));
   const gains=row.saved.state.lastTrace.events.filter(e=>e.sourceDefinitionId==='c06'&&e.operation==='add-growth');assert.ok(gains.length);for(const e of gains)assert.deepEqual(e.before,e.after,'saved growth does not change this hand accumulator');
   row.firstGrowth=first;row.firstTrace=row.saved.state.lastTrace;
   if(row.saved.state.phase==='stage-cleared'){
    await tapUI(p,'intermission','action/continue-stage',touch);await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(400);await tapUI(p,'shop','action/start-stage',touch);await waitScene(p,'game');await settle(p);
    const entered=await saved(p);let expected=row.saved.state;for(const command of entered.journal.slice(row.saved.journal.length)){const r=applyCommand(expected,command);assert.ok(r.ok,r.code);expected=r.state;}assert.deepEqual(entered.state,expected);
   }
   const beforeSecond=await saved(p),action={type:'PlayHand',selectedIds:[beforeSecond.state.handOrder[0]]};await tapUI(p,'game','card/'+action.selectedIds[0],touch);await tapUI(p,'game','action/play',touch);row.saved=await transaction(p,beforeSecond,action);await settle(p);assert.deepEqual(await saved(p),row.saved);
   const second=growthPayoffs(row.saved.state)[0];assert.ok(second);assert.equal(second.readValue,'+'+first.after);assert.equal(second.after,first.after);row.nextGrowth=second;row.nextTrace=row.saved.state.lastTrace;
   row.growthFrames=await p.evaluate(()=>window.__growthFrames);assert.ok(row.growthFrames.some(x=>x.event.operation==='add-growth'&&x.status.includes('下手生效')));
   for(const [i,frame] of row.growthFrames.entries()){const file=key+'-growth-'+i+'.png';await writeFile(out+'/'+file,Buffer.from(frame.png.split(',')[1],'base64'));delete frame.png;frame.screenshot=file;}
   await p.screenshot({path:out+'/'+key+'-after-next.png'});await p.reload({waitUntil:'domcontentloaded'});await waitScene(p,'title');assert.deepEqual(await saved(p),row.saved);assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',key,first.readValue+' → saved '+first.after+' → next read '+second.readValue);continue;
  }
  await p.waitForFunction(()=>window.__titleFrames.length>0);row.atTitle=await saved(p);assert.deepEqual(row.atTitle,row.saved,'viewing title does not persist');
  if(mode==='skip')await tapMenuAction(p,'快进当前手',touch);if(mode==='exit'){await tapMenuAction(p,'保存并退出',touch);await waitScene(p,'character-select');}else await settle(p);
  row.after=await saved(p);assert.deepEqual(row.after,row.saved,'presentation/reduce/skip/exit does not alter any saved tuple');const chrome=await p.evaluate(()=>window.__chromeShot);if(chrome){await writeFile(out+'/'+key+'-score-live.png',Buffer.from(chrome.png.split(',')[1],'base64'));delete chrome.png;row.scoreLive=chrome;}row.focusGeometry=await p.evaluate(()=>window.__focusGeometry);row.orphanChrome=await p.evaluate(()=>window.__orphanChrome);if(process.env.HERO_FOCUS_BASELINE)assert.ok(row.orphanChrome.length,'baseline reproduces orphan inventory graphics');else assert.deepEqual(row.orphanChrome,[],'hidden settlement button leaves no visible inventory icon or frame');
  if(process.env.HERO_FOCUS_FIXED){assert.ok(row.focusGeometry.length>1,'eye strip observed in real rendered frames');for(const frame of row.focusGeometry){const first=row.focusGeometry.find(f=>f.eventId===frame.eventId);for(const k of ['x','y','scaleX','scaleY','angle'])assert.equal(frame[k],first[k],'eye transform remains fixed: '+k);assert.equal(frame.scaleX,frame.scaleY);assert.ok(frame.scaleX*dpr<=1.001,'never upscale sampled eye pixels');}}
  row.timeline=await p.evaluate(()=>window.__panelTimeline);row.frames=await p.evaluate(()=>window.__titleFrames);const images=await p.evaluate(()=>window.__titleImages);for(let i=0;i<images.length;i++){const filename=key+'-'+i+'.png';await writeFile(out+'/'+filename,Buffer.from(images[i].png.split(',')[1],'base64'));row.frames[i].screenshot=filename;}
  const shots=await p.evaluate(()=>window.__shotImages);row.shots=[];
  for(const [i,sample] of shots.entries()){const filename=key+'-shot-'+i+'-'+sample.shot+'.png',png=sample.png;delete sample.png;sample.screenshot=filename;await writeFile(out+'/'+filename,Buffer.from(png.split(',')[1],'base64'));row.shots.push(sample);}
  for(const shot of row.shots)for(const text of shot.texts){cleanPlayerCopy(text.text,key+'/'+text.name);const b=text.bounds;assert.ok(b.x>=-1&&b.x+b.width<=spec.width+1&&b.y>=0&&b.y+b.height<=p.viewportSize().height+1,'painted text stays in viewport '+text.name);if(text.name==='hero/climax-value'){assert.equal(text.lines.length,1,'painted primary number stays on one line');if(spec.height===320&&shot.shot.startsWith('landing'))assert.ok(parseFloat(text.font)>=28,'short accumulated value remains readable');}}
  if(process.env.HERO_TITLE_CAPTIONS){
   for(const shot of row.shots){
    const note=shot.texts.filter(t=>t.name==='hero/climax-note');assert.equal(note.length,1,'one persistent effect caption on every camera shot');
    const source=row.expectedKeys.find(k=>k.eventId===shot.eventId);assert.ok(source,'caption belongs to a saved source');
    assert.equal(note[0].text,heroClimaxValue(row.saved.state,row.saved.state.lastTrace,source).note,'effect reads the same saved source description');
    const first=row.shots.find(s=>s.eventId===shot.eventId).texts.find(t=>t.name==='hero/climax-note');assert.equal(note[0].text,first.text,'effect survives camera cuts unchanged');
    for(const text of shot.texts){assert.equal(text.scaleX,1,'glyphs rendered independently at font size');assert.equal(text.scaleY,1);}
    const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
    for(const other of shot.texts.filter(t=>t!==note[0]))assert.equal(intersects(note[0].bounds,other.bounds),false,'effect caption does not overlap '+other.name);
   }
   row.captionTiming=row.expectedKeys.map(k=>{const frames=row.timeline.filter(f=>f.eventId===k.eventId),start=frames.find(f=>f.subjectVisibleAt!==undefined)?.subjectVisibleAt,release=frames.find(f=>f.phase==='release');return {eventId:k.eventId,firstPaint:frames[0]?.timeMs,lastPaint:frames.at(-1)?.timeMs,subjectMs:start===undefined?undefined:(release?.timeMs??frames.at(-1)?.timeMs)-start};});
   if(!['skip','exit'].includes(mode))for(const timing of row.captionTiming)assert.ok(timing.subjectMs>=980,'real-time subject hold survives camera cuts and 4x speed');
  }
  if(mode==='reduce'){
   const still=row.shots.filter(s=>s.reduced&&s.subjectVisibleAt!==undefined);
   assert.ok(still.length>=2,'two real painted reduced frames');assert.ok(still.at(-1).timeMs-still[0].timeMs>=700,'static focus actually persists across painted frames');
   for(const frame of still){assert.ok(frame.pixelEvidence.headline>80,'painted skill title ink');assert.ok(frame.pixelEvidence.value>80,'painted actual red accumulator');}
  }
  if(process.env.HERO_TITLE_CINEMA){
   const frames=await p.evaluate(()=>window.__cinemaFrames),dir=out+'/'+key+'-frames';await mkdir(dir,{recursive:true});
   for(const [i,frame] of frames.entries())await writeFile(dir+'/'+i+'.jpg',Buffer.from(frame.jpeg.split(',')[1],'base64'));
   const list=frames.map((f,i)=>`file '${dir}/${i}.jpg'\nduration ${Math.max(.001,((frames[i+1]?.timeMs??f.timeMs+80)-f.timeMs)/1000)}`).join('\n')+'\n';await writeFile(dir+'/frames.txt',list);
   execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',dir+'/frames.txt','-vf','fps=15','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-an','-movflags','+faststart',out+'/'+key+'.mp4']);
   row.clip={file:key+'.mp4',frames:frames.map(({timeMs,eventId,shot},i)=>({timeMs,eventId,shot,file:key+'-frames/'+i+'.jpg'})),scope:'Actual post-render software frames; silent observation, no FPS or hearing claim'};
  }
  for(const frame of row.frames){const expected=row.expectedKeys.find(k=>k.eventId===frame.eventId);assert.ok(expected,'actual saved source event');assert.deepEqual(frame.fact,expected.fact);const name=frame.texts.find(t=>t.name==='hero/climax-name'),caption=frame.texts.find(t=>t.name==='hero/climax-owner');const event=row.saved.state.lastTrace.events.find(e=>e.eventId===expected.eventId),skill=process.env.HERO_TITLE_BEFORE?undefined:savedSkillName(row.saved.state,row.saved.state.lastTrace,event);assert.equal(name.text,expected.fact.definitionId?expected.fact.title:skill??getCharacter(row.saved.state.characterId).name);assert.equal(name.lines.length,1);const width=frame.headlineWidth??(spec.width===1366?spec.width*(expected.fact.definitionId ? .31 : .42):spec.width*.43);assert.ok(name.bounds.width<=width+1,JSON.stringify(name));assert.ok(name.bounds.x>=0&&name.bounds.x+name.bounds.width<=spec.width);if(expected.fact.definitionId){assert.ok(caption);assert.equal(caption.text,getCharacter(row.saved.state.characterId).name+' · '+getCharacter(row.saved.state.characterId).title);}assert.equal(frame.ready,false);assert.equal(frame.playing,true);if(mode==='reduce')assert.equal(frame.reduced,true);}
  if(mode!=='skip'&&mode!=='exit')assert.deepEqual(row.frames.map(r=>r.eventId),row.expectedKeys.map(k=>k.eventId));
  row.cleanup=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {climax:!!s.heroClimax,presentation:!!s.presentation};});assert.equal(row.cleanup.climax,false);assert.equal(row.cleanup.presentation,false);
  if(process.env.HERO_FOCUS_HELD_TOOL&&row.saved.state.phase==='await-input'){
   await tapUI(p,'game','action/tool-inventory',touch);row.restoredInventory=await p.locator('dialog[open]').innerText();assert.ok(row.restoredInventory.length>10);await p.screenshot({path:out+'/'+key+'-inventory-restored.png'});await p.keyboard.press('Escape');assert.deepEqual(await saved(p),row.saved,'restored inventory opens and closes without state changes');
  }
  if(mode==='replay'){
   assert.equal(row.saved.state.phase,'await-input');const count=await p.evaluate(()=>window.__titleFrames.length);await tapMenuAction(p,'回看上一手',touch);await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').presentation?.replay);await tapMenuAction(p,'快进当前手',touch);await settle(p);assert.deepEqual(await saved(p),row.saved);assert.equal(await p.evaluate(()=>window.__titleFrames.length),count,'replay emits no new hero payoff');const id=row.saved.state.handOrder[0];await tapUI(p,'game','card/'+id,touch);await tapUI(p,'game','card/'+id,touch);assert.deepEqual(await saved(p),row.saved);row.replayAndSelection='PASS';
  }
  await p.reload();await waitScene(p,'title');row.cold=await saved(p);assert.deepEqual(row.cold,row.saved,'cold restoration is complete');if(expectedFocus){await Promise.all(assetReads);const focus=row.assetResponses.find(a=>a.url.includes('/amo.focus.webp'));assert.ok(focus,'actual focus response observed');assert.equal(focus.sha256,expectedFocus.sha256);assert.equal(new URL(focus.url).searchParams.get('v'),expectedFocus.sha256.slice(0,12));row.assetProof='PASS';}assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',key,row.frames.map(r=>r.texts.find(t=>t.name==='hero/climax-name').text));
 }catch(e){row.status='FAIL';row.failure=e.stack;row.observed=await p.evaluate(()=>({frames:window.__titleFrames,scenes:window.__harness?.game.scene.getScenes(true).map(s=>s.scene.key)})).catch(()=>null);await p.screenshot({path:out+'/'+key+'-FAIL.png'}).catch(()=>{});throw e;}finally{await p.close();await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));}}
 if(process.env.HERO_TITLE_PLAYER_COPY)for(const width of [390,1366]){
  const key='player-copy-'+width,p=await browser.newPage({viewport:{width,height:width===390?740:768},hasTouch:width===390,reducedMotion:'reduce'}),row={key,heroes:[],errors:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(e.stack));
  try{
   await p.goto('http://127.0.0.1:'+port+'/?harness=1',{waitUntil:'domcontentloaded'});await openSelector(p,width===390);
   for(const id of ['amo','touye','laohuan','erxiang','azao','xiemu']){
    await tapUI(p,'character-select','character/'+id,width===390);await tapUI(p,'character-select','opening/hero-details',width===390);const d=p.locator('dialog[open]');await d.locator('.hero-story summary').click();
    for(let i=0;i<5&&await d.locator('details:not([open]) > summary').count();i++){const summary=d.locator('details:not([open]) > summary').first();await summary.scrollIntoViewIfNeeded();await summary.click();await p.waitForTimeout(80);}
    const text=await d.innerText(),alts=await d.locator('img').evaluateAll(xs=>xs.map(x=>x.alt));cleanPlayerCopy(text,id+' story/rules');for(const alt of alts){cleanPlayerCopy(alt,id+' image alt');assert.equal(alt,getCharacter(id).name);}assert.ok(text.includes(getCharacter(id).name));assert.ok(text.includes('做什么')&&text.includes('现在'));row.heroes.push({id,text,alts});
    if(id==='erxiang'){await d.locator('.hero-story .hero-fact').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/'+key+'-story.png'});}await p.keyboard.press('Escape');await p.waitForTimeout(380);
   }
   await tapUI(p,'character-select','action/character-details',width===390);const comparison=p.locator('dialog[open]');const text=await comparison.innerText(),alts=await comparison.locator('img').evaluateAll(xs=>xs.map(x=>x.alt));cleanPlayerCopy(text,'hero comparison');for(const alt of alts)cleanPlayerCopy(alt,'comparison alt');row.comparison={text,alts};await p.keyboard.press('Escape');await p.waitForTimeout(380);
   await tapUI(p,'character-select','opening/portrait-full',width===390);const full=p.locator('.hero-portrait-view[open]');assert.equal(await full.locator('h2').innerText(),getCharacter('xiemu').name);for(const alt of await full.locator('img').evaluateAll(xs=>xs.map(x=>x.alt)))assert.equal(alt,getCharacter('xiemu').name);await p.screenshot({path:out+'/'+key+'-full.png'});await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>window.__harness.game.registry.get('runController')??null),null);assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',key,'six stories, rules, portraits and comparison');
  }catch(e){row.status='FAIL';row.failure=e.stack;await p.screenshot({path:out+'/'+key+'-FAIL.png'});throw e;}finally{await p.close();}
 }
 assert.ok(report.cases.length,'at least one requested case ran');report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));await writeFile(out+'/summary.json',JSON.stringify({head:report.head,srcTree:report.srcTree,status:report.status,error:report.error,cases:report.cases.map(r=>({key:r.key,status:r.status,failure:r.failure,titles:r.frames?.map(f=>f.texts.find(t=>t.name==='hero/climax-name'))}))},null,2));console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.length}));await browser.close();await new Promise(resolve=>v.httpServer.close(resolve));}
