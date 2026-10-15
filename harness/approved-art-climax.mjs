import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,tapMenuAction} from './ui.mjs';
const port=Number(process.env.HERO_TITLE_PORT??5575),dpr=Number(process.env.HERO_TITLE_DPR??1);
const out=process.env.HERO_TITLE_OUT??'docs/production/evidence/approved-character-art-2026-10-15/climax';await mkdir(out,{recursive:true});
const v=await createServer({root:process.env.HERO_TITLE_ROOT??process.cwd(),cacheDir:process.env.HERO_TITLE_ROOT?process.env.HERO_TITLE_ROOT+'/.vite-cache':undefined,mode:'e2e',server:{host:'127.0.0.1',port,strictPort:true},logLevel:'error'});await v.listen();
const helperLoader=await createServer({logLevel:'error'}),{savedSkillName}=await helperLoader.ssrLoadModule('/src/game/SettlementHighlights.ts'),{heroClimaxValue}=await helperLoader.ssrLoadModule('/src/game/HeroClimax.ts');await helperLoader.close();
const {createRun,applyCommand}=await v.ssrLoadModule('/src/domain/run.ts'),{newRunIdentity}=await v.ssrLoadModule('/src/game/RunLaunch.ts'),{makeCheckpoint,readCheckpoint}=await v.ssrLoadModule('/src/application/checkpoint.ts'),{r2CreateJoker}=await v.ssrLoadModule('/src/domain/r2Run.ts'),{touyeChoice}=await v.ssrLoadModule('/src/game/TouyeWagerCopy.ts'),{heroPayoffs}=await v.ssrLoadModule('/src/game/HeroPayoff.ts'),{getCharacter}=await v.ssrLoadModule('/src/game/characters.ts'),{supportSettlementReady}=await v.ssrLoadModule('/harness/fixtures/settlement.ts');
const hand=['spades-8','hearts-8','clubs-7','diamonds-7','spades-13','hearts-13','clubs-2','diamonds-4'];
function send(s,action,commandId='setup/'+s.commandSeq){const command={runId:s.runId,commandId,expectedSeq:s.commandSeq,action},r=applyCommand(s,command);assert.ok(r.ok,r.code);return {state:r.state,command};}
function arrange(s,ids=hand,incoming=[]){s=structuredClone(s);s.handOrder=[...ids];s.drawPile=[...s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!incoming.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id)),...[...incoming].reverse()];return s;}
function fixture(kind){
 if(kind==='e11')return supportSettlementReady();
 let state=createRun({seed:'group-natural-17',runId:'controlled/source-title/'+kind,rulesVersion:'r2',characterId:kind==='f06'?'amo':kind,r2Identity:newRunIdentity(kind==='f06'?'amo':kind,'group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state=send(send(state,{type:'LeaveShop'}).state,{type:'EnterStage'}).state;
 if(kind==='azao'){state=arrange(state,['spades-2','hearts-2','clubs-3','diamonds-3',...hand.slice(4)]);state=send(state,{type:'PlayHand',selectedIds:state.handOrder.slice(0,4)}).state;}
 state=arrange(state);if(kind==='xiemu')state.gold=20;if(kind==='touye')state=arrange(state,hand,['clubs-8','diamonds-6']);
 if(kind==='f06'){state.jokers=[r2CreateJoker('f06','controlled/title/f06',8,'none',state)];state.stage.initialJokerIds=state.jokers.map(j=>j.instanceId);return {state,action:{type:'PlayHand',selectedIds:hand.slice(0,4)}};}
 const selectedIds=kind==='erxiang'?hand.slice(0,2):kind==='touye'?[hand[0],hand[1],'clubs-8']:hand.slice(0,4);
 return {state,action:kind==='amo'?{type:'PlayAssistedHand',selectedIds,assistIds:hand.slice(4,6)}:{type:'PlayHand',selectedIds,...(kind==='erxiang'?{erxiangTargetId:hand[0]}:{}),...(kind==='azao'?{azaoRelease:true}:{}),...(kind==='xiemu'?{xiemuBurn:10}:{})}};
}
const specs=[...['amo','erxiang','xiemu','azao','touye'].map(kind=>({kind,width:390})),{kind:'amo',width:1366},{kind:'xiemu',width:1366},{kind:'xiemu',width:320},{kind:'xiemu',width:390,mode:'fast'},...['e11','f06'].flatMap(kind=>[320,390,1366].map(width=>({kind,width}))),...['e11','erxiang'].flatMap(kind=>['reduce','skip','exit'].map(mode=>({kind,width:390,mode})))];
const report={root:process.env.HERO_TITLE_ROOT??process.cwd(),baseline:!!process.env.HERO_TITLE_BEFORE,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),srcTree:execFileSync('git',['rev-parse','HEAD:src'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}),scope:'Controlled legitimate public checkpoints, original production import/selection/skill/play/menu inputs. Full state+journal+storage+localStorage and cold reload. No direct presentation mounts, scene pauses or timing modifications; postrender canvas snapshots and actual pixel checks are observational, not a physical performance or complete game acceptance.',cases:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});report.browser=browser.version();
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read(),localStorage:Object.fromEntries(Object.entries(localStorage).sort())};});
const settle=p=>p.waitForFunction(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return g.scene.isActive('intermission')&&g.scene.getScene('intermission').ready||s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(x=>!x.dealing&&!s.tweens.isTweening(x.container));});
async function transaction(p,before,action){await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.state.commandSeq);const after=await saved(p),receipt=after.state.receipts.at(-1),expected=send(before.state,action,receipt.commandId);assert.deepEqual(after.state,expected.state);assert.deepEqual(after.journal,[...before.journal,expected.command]);assert.deepEqual(after.storage.current,makeCheckpoint(after.state,after.journal));assert.equal(after.storage.revision,before.storage.revision+1);assert.deepEqual(after.localStorage,before.localStorage);return after;}
try{for(const spec of specs){const mode=spec.mode??'normal',key=spec.kind+'-'+spec.width+'-'+mode;if(process.env.HERO_TITLE_CASES&&!process.env.HERO_TITLE_CASES.split(',').includes(key))continue;const row={key,...spec,mode,dpr,errors:[]};report.cases.push(row);const touch=spec.width<800,p=await browser.newPage({viewport:{width:spec.width,height:spec.width===1366?768:740},hasTouch:touch,deviceScaleFactor:dpr,reducedMotion:mode==='reduce'?'reduce':'no-preference'});p.setDefaultTimeout(45000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(e.stack));
 try{if(mode==='fast')await p.addInitScript(()=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:false})));const f=fixture(spec.kind);assert.ok(readCheckpoint(makeCheckpoint(f.state,[])).ok);row.fixture=makeCheckpoint(f.state,[]);
  await p.goto('http://127.0.0.1:'+port+'/?harness=1');await waitScene(p,'title');await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'source-title.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(row.fixture))});await waitScene(p,'game');await settle(p);const intro=p.getByRole('button',{name:'开始出牌',exact:true});if(await intro.count())await intro.click();if(await p.locator('.detail-dialog[open]').count())await p.getByRole('button',{name:'关闭',exact:true}).click();await p.evaluate(()=>document.fonts.ready);assert.deepEqual((await saved(p)).state,f.state);
  row.initial=await saved(p);
  if(spec.kind==='touye'){for(const id of hand.slice(6))await tapUI(p,'game','card/'+id,touch);await tapUI(p,'game','hero/action-shortcut',touch);await p.getByRole('button',{name:'押三条',exact:true}).click();await p.getByRole('button',{name:'确认押三条并弃2张',exact:true}).click();const action={type:'DiscardHand',selectedIds:hand.slice(6),touyeBet:{target:'three-kind',snapshotToken:touyeChoice(f.state,hand.slice(6)).snapshotToken}};row.bet=await transaction(p,row.initial,action);await settle(p);}
  row.before=await saved(p);for(const id of f.action.selectedIds)await tapUI(p,'game','card/'+id,touch);
  if(!['e11','f06','touye'].includes(spec.kind)){await tapUI(p,'game','hero/action-shortcut',touch);const label=spec.kind==='amo'?'K♠ K♥ · 助攻 ×2':spec.kind==='erxiang'?'第1张 · 8♠':spec.kind==='xiemu'?'燃10金 ×2':'本手释放 ×1.5';if(spec.kind==='amo'){assert.deepEqual(await p.evaluate(()=>window.__harness.game.scene.getScene('game').assistIds),f.action.assistIds);}else await p.getByRole('button',{name:label,exact:true}).click();}
  assert.deepEqual(await saved(p),row.before,'selection and skill choice do not persist');
  await p.evaluate(cinema=>{
   window.__titleFrames=[];window.__titleImages=[];window.__panelTimeline=[];window.__shotImages=[];window.__cinemaFrames=[];
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
    const scene=g.scene.getScene('game'),group=scene.heroClimax?.group;if(!renderer||!group?.active||!group.visible||group.alpha===0)return;
    const now=performance.now(),id=group.getData('eventId'),shot=group.getData('shot')??'old-single-panel',subjectVisibleAt=group.getData('subjectVisibleAt');
    window.__panelTimeline.push({eventId:id,phase:group.getData('phase'),shot,timeMs:now,subjectVisibleAt,strikeAt:group.getData('strikeAt')});
    const texts=visible(group.list).filter(o=>o.type==='Text').map(o=>({name:o.name,text:o.text,font:o.style.fontSize,lines:o.getWrappedText(),bounds:o.getBounds(),scaleX:o.scaleX,scaleY:o.scaleY,resolution:o.style.resolution}));
    const sample=()=>({images:visible(group.list).filter(o=>o.type==='Image').map(o=>({name:o.name,key:o.texture.key,scale:o.scaleX,density:1/scene.scale.zoom,width:o.texture.getSourceImage().width,height:o.texture.getSourceImage().height,bounds:o.getBounds(),visibleBounds:o.getData('visibleBounds')})),eventId:id,fact:group.getData('benefit'),phase:group.getData('phase'),shot,timeMs:now,subjectVisibleAt,reduced:scene.reducedMotion,playing:scene.playing,ready:scene.ready,headlineWidth:group.getData('headlineWidth'),texts,pixelEvidence:{headline:pixels('hero/climax-name',texts),value:pixels('hero/climax-value',texts)}});
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
  await p.waitForFunction(()=>window.__titleFrames.length>0);row.atTitle=await saved(p);assert.deepEqual(row.atTitle,row.saved,'viewing title does not persist');
  if(mode==='skip')await tapMenuAction(p,'快进当前手',touch);if(mode==='exit'){await tapMenuAction(p,'保存并退出',touch);await waitScene(p,'character-select');}else await settle(p);
  row.after=await saved(p);assert.deepEqual(row.after,row.saved,'presentation/reduce/skip/exit does not alter any saved tuple');row.timeline=await p.evaluate(()=>window.__panelTimeline);row.frames=await p.evaluate(()=>window.__titleFrames);const images=await p.evaluate(()=>window.__titleImages);for(let i=0;i<images.length;i++){const filename=key+'-'+i+'.png';await writeFile(out+'/'+filename,Buffer.from(images[i].png.split(',')[1],'base64'));row.frames[i].screenshot=filename;}
  const shots=await p.evaluate(()=>window.__shotImages);row.shots=[];
  for(const [i,sample] of shots.entries()){const filename=key+'-shot-'+i+'-'+sample.shot+'.png',png=sample.png;delete sample.png;sample.screenshot=filename;await writeFile(out+'/'+filename,Buffer.from(png.split(',')[1],'base64'));row.shots.push(sample);}
  for(const shot of row.shots)for(const image of shot.images)if(image.name==='hero/climax-eyes'){assert.equal(image.key,'portrait-focus-'+row.saved.state.characterId);assert.ok(image.scale*image.density<=1.001,'head crop never enlarged on framebuffer');}
  for(const shot of row.shots)for(const text of shot.texts){const b=text.bounds;assert.ok(b.x>=-1&&b.x+b.width<=spec.width+1&&b.y>=0&&b.y+b.height<=p.viewportSize().height+1,'painted text stays in viewport '+text.name);if(text.name==='hero/climax-value')assert.equal(text.lines.length,1,'painted primary number stays on one line');}
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
  for(const frame of row.frames){const expected=row.expectedKeys.find(k=>k.eventId===frame.eventId);assert.ok(expected,'actual saved source event');assert.deepEqual(frame.fact,expected.fact);const name=frame.texts.find(t=>t.name==='hero/climax-name'),caption=frame.texts.find(t=>t.text.includes('来源兑现'));const event=row.saved.state.lastTrace.events.find(e=>e.eventId===expected.eventId),skill=process.env.HERO_TITLE_BEFORE?undefined:savedSkillName(row.saved.state,row.saved.state.lastTrace,event);assert.equal(name.text,expected.fact.definitionId?expected.fact.title:skill??getCharacter(row.saved.state.characterId).name);assert.equal(name.lines.length,1);const width=frame.headlineWidth??(spec.width===1366?spec.width*(expected.fact.definitionId ? .31 : .42):spec.width*.43);assert.ok(name.bounds.width<=width+1,JSON.stringify(name));assert.ok(name.bounds.x>=0&&name.bounds.x+name.bounds.width<=spec.width);if(expected.fact.definitionId){assert.ok(caption);assert.ok(caption.text.includes(getCharacter(row.saved.state.characterId).name));assert.ok(caption.text.includes(getCharacter(row.saved.state.characterId).title));}assert.equal(frame.ready,false);assert.equal(frame.playing,true);if(mode==='reduce')assert.equal(frame.reduced,true);}
  if(mode!=='skip'&&mode!=='exit')assert.deepEqual(row.frames.map(r=>r.eventId),row.expectedKeys.map(k=>k.eventId));
  row.cleanup=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {climax:!!s.heroClimax,presentation:!!s.presentation};});assert.equal(row.cleanup.climax,false);assert.equal(row.cleanup.presentation,false);
  await p.reload();await waitScene(p,'title');row.cold=await saved(p);assert.deepEqual(row.cold,row.saved,'cold restoration is complete');assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',key,row.frames.map(r=>r.texts.find(t=>t.name==='hero/climax-name').text));
 }catch(e){row.status='FAIL';row.failure=e.stack;row.observed=await p.evaluate(()=>({frames:window.__titleFrames,scenes:window.__harness?.game.scene.getScenes(true).map(s=>s.scene.key)})).catch(()=>null);await p.screenshot({path:out+'/'+key+'-FAIL.png'}).catch(()=>{});throw e;}finally{await p.close();await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));}}
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;}finally{await writeFile(out+'/report.json.gz',gzipSync(JSON.stringify(report)));await writeFile(out+'/summary.json',JSON.stringify({head:report.head,srcTree:report.srcTree,status:report.status,error:report.error,cases:report.cases.map(r=>({key:r.key,status:r.status,failure:r.failure,titles:r.frames?.map(f=>f.texts.find(t=>t.name==='hero/climax-name'))}))},null,2));console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.length}));await browser.close();await v.close();}
