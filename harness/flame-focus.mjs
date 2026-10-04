/** P08 cinnabar candidate: actual phase-selected frames; native natural scoring, no recordings. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';
import sharp from 'sharp';
import {chooseCharacter,tapUI,tapMenuAction,openMenuSection,waitScene} from './ui.mjs';
const dir=process.env.PAPER_FIRE_DIR||'shots/cinnabar',port=5260;
const localCornersOnly=process.env.FLAME_FOCUS_SCOPE==='local-corners';
const integrationOnly=process.env.FLAME_FOCUS_SCOPE==='integration';
const impactScope=['impact-before','impact-first','impact-complete','impact-room'].includes(process.env.FLAME_FOCUS_SCOPE);
await mkdir(dir,{recursive:true});
const report={harnessCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),runs:[],keyframes:[],limits:[
  'Natural single5 high-card202 plus600 /1200 /5589 paths; no injected score, target, RNG, rule or save state. Long-digit probe changes/restores UI Text only.',
  'Linux Chromium software Canvas, native emulated touch, CSS390x740 and844x300, DPR1, safe top12/bottom34.',
  'Keyframes copy the actually rendered canvas at postrender using local/frame phase, age and frame number; no guessed phase sleeps.',
  'Physical OnePlus, true GPU, FPS/performance, audio listening, recordings, overall aesthetic acceptance NOT_RUN.',
]};
const server=await preview({build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'warn'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
report.browser=browser.version();
const specs=[
  {seed:'p04-golden-02',character:'amo',ids:['clubs-5'],score:'202',tier:0},
  {seed:'p04-golden-02',character:'amo',ids:['clubs-5','diamonds-14','clubs-4','diamonds-3','clubs-2'],score:'600',tier:1},
  {seed:'d43-fire-1',character:'laohuan',ids:['diamonds-7','diamonds-9','diamonds-4','diamonds-12','diamonds-10'],score:'1200',tier:2},
  {seed:'d43-fire-267',character:'laohuan',ids:['diamonds-11','diamonds-13','diamonds-12','diamonds-10','diamonds-14'],score:'5589',tier:3},
];
const overlaps=(a,b)=>a.x<b.x+b.width-.01&&b.x<a.x+a.width-.01&&a.y<b.y+b.height-.01&&b.y<a.y+a.height-.01;
const state=p=>p.evaluate(()=>window.__harness.game.registry.get('runController').state);
async function select(p,id){
  for(let i=0;i<14;i++){
    const c=await p.evaluate(id=>{const s=window.__harness.game.scene.getScene('game'),index=s.cardViews.findIndex(c=>c.card.id===id);return {index,start:s.view.layout.handStart,visible:s.cardViews[index]?.container.visible};},id);
    assert.ok(c.index>=0);if(c.visible){await tapUI(p,'game','card/'+id,true);return;}
    await tapUI(p,'game',c.index<c.start?'action/hand-previous':'action/hand-next',true);
  }
  assert.fail('natural held card reachable');
}
function validate(f){
  if(!f.brush)return;
  assert.equal(f.level,BigInt(f.origin)+BigInt(f.product)<400n?0:BigInt(f.origin)+BigInt(f.product)>=2000n?3:BigInt(f.origin)+BigInt(f.product)>=800n?2:1,'same-frame exact displayed threshold');
  assert.equal(f.masked.length,2);assert.ok(f.masked.every(o=>o.mask&&o.same&&!o.input));
  for(const loop of f.unclassifiedLoops)assert.ok(Number.isFinite(loop.start)&&Number.isFinite(loop.stop)&&loop.stop-loop.start<=.35,'non-roll looping sources have a scheduled short end');
  assert.equal(f.textures.length,0);assert.equal(f.burning,0);assert.equal(f.shake,false);assert.equal(f.stamp,false);
  if(f.layers){assert.ok(f.layers.local>f.layers.pedestal,'local ink stays above the opaque score pedestal');assert.ok(f.layers.avatar>=0&&f.layers.avatar>f.layers.local,'actual root avatar exists and stays above ink; a missing child cannot be filtered away');assert.ok(f.layers.text.every(index=>index>f.layers.local),'measured score text stays above local ink');assert.ok(f.layers.foreground.length>0&&f.layers.foreground.every(index=>index>f.layers.local),'actual nonempty card/button foreground stays above ink');assert.ok(f.layers.frame<f.layers.pedestal,'exterior frame stays behind paper and foreground');}
  for(const p of f.pieces)for(const g of f.guards)assert.equal(overlaps(p,g),false,'every paintable piece excludes actual guards');
  for(const p of f.bands)for(const body of [...f.cards,...f.controls,...f.domControls.map(o=>o.bounds)])assert.equal(overlaps(p,body),false,'outer band excludes card/action body');
  for(const flight of f.flights){assert.ok(flight.mask);const p=flight.landing,b=flight.cell;assert.ok(p.x<b.x||p.x>b.x+b.width||p.y<b.y||p.y>b.y+b.height);}
  if(f.brush.reduced)assert.equal(f.brush.updating,false);
  assert.equal(f.savedStable,true,'presentation has no command/save/RNG mutation');
}
async function run(viewport,spec,mode='natural'){
  const name=`${viewport.width}x${viewport.height}-${spec.score}-${mode}`,context=await browser.newContext({viewport,hasTouch:true,deviceScaleFactor:1,reducedMotion:mode==='reduced'?'reduce':'no-preference'}),p=await context.newPage(),r={name,viewport,safe:{top:12,bottom:34},mode,...spec,checks:[],errors:[]};report.runs.push(r);
  p.on('pageerror',e=>r.errors.push(String(e)));
  await p.addInitScript(()=>{
    window.__audioSchedules=new WeakMap();
    for(const Type of [AudioBufferSourceNode,OscillatorNode])for(const method of ['start','stop']){
      const original=Type.prototype[method];Type.prototype[method]=function(...args){const record=window.__audioSchedules.get(this)??{};record[method]=args[0]??this.context.currentTime;window.__audioSchedules.set(this,record);return original.apply(this,args);};
    }
  });
  await p.addInitScript(()=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--safe-top','12px');document.documentElement.style.setProperty('--safe-bottom','34px');}));
  try{
    await p.goto(`http://127.0.0.1:${port}/?harness=1&seed=${spec.seed}`);await chooseCharacter(p,spec.character,true);
    await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
    // Only the production350ms modal click-through guard; never a score phase estimate.
    await p.waitForTimeout(370);await tapUI(p,'shop','action/start-stage',true);await waitScene(p,'game');
    await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.length&&s.cardViews.every(v=>!v.dealing&&!v.back?.visible&&!s.tweens.isTweening(v.container));});
    const before=await state(p);assert.equal(before.stage.targetHeat,'400');assert.equal(before.stage.heat,'0');
    for(const id of spec.ids)await select(p,id);
    assert.equal(await p.evaluate(()=>!!window.__harness.game.scene.getScene('game').scoreFlame),false,'selection preview never creates brush');
    r.longDigits=await p.evaluate(()=>{
      const s=window.__harness.game.scene.getScene('game'),original=[s.scoreHeat,s.scoreMult,s.scoreTotal].map(o=>({o,text:o.text,visible:o.visible}));
      ['123,456,789,012,345','× 100,000,000–999,999,999','999,999,999,999,999'].forEach((text,i)=>original[i].o.setVisible(true).setText(text));s.fitScoreReadouts();
      const result=original.map(({o})=>{const b=o.getBounds();return{text:o.text,full:o.getData('fullText'),bounds:{x:b.x,y:b.y,width:b.width,height:b.height},font:o.style.fontSize};});
      for(const {o,text,visible} of original)o.setText(text).setVisible(visible);s.refreshSelection();return result;
    });
    for(let i=0;i<r.longDigits.length;i++)for(let j=i+1;j<r.longDigits.length;j++)assert.equal(overlaps(r.longDigits[i].bounds,r.longDigits[j].bounds),false);
    assert.deepEqual(await state(p),before,'long-digit UI probe preserves whole run');
    await p.evaluate(({tier,captureBelow,captureFrames,localPeak,pagePeak,impactScope,numeric})=>{
      const g=window.__harness.game,s=g.scene.getScene('game'),frames=[],rasters=[],seen=new Set();let committed,numericEvent,numericPeak=0;
      const domControls=()=>[...document.querySelectorAll('.run-menu-toggle,.run-fullscreen-toggle,.fullscreen-dock')].filter(e=>!e.hidden&&e.getBoundingClientRect().width>0).map(e=>{const b=e.getBoundingClientRect(),c=g.canvas.getBoundingClientRect(),l=s.view.layout;return {name:e.className,text:e.textContent,bounds:{x:(b.x-c.x)*l.width/c.width,y:(b.y-c.y)*l.height/c.height,width:b.width*l.width/c.width,height:b.height*l.height/c.height},cssBounds:{x:b.x,y:b.y,width:b.width,height:b.height}};});
      const bounds=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
      const observe=()=>{
        if(!s.presentation||!s.scoreTotal?.active)return;
        const saved=JSON.stringify(g.registry.get('runController').state);committed??=saved;
        const flame=s.scoreFlame,brush=flame?.graphic.getData('strokeState'),l=s.view.layout;
        const controls=s.view.root.list.filter(o=>o.name.startsWith('action/')),foreground=[s.roleAvatar,...s.cardViews.map(v=>v.container),...[...s.settledCards.values()].map(v=>v.container),...s.jokerViews.values(),...controls.flatMap(o=>[o,o.getData('buttonArt'),o.getData('label')])].filter(o=>o?.active&&s.view.root.list.includes(o));
        const f={frame:g.loop.frame,at:performance.now(),renderer:g.renderer.gl?'WebGL':'Canvas',origin:s.presentation.originHeat,product:s.displayedScoreProduct,
          pulses:[s.scoreHeat,s.scoreMult,s.scoreTotal].map(o=>({text:o.text,full:o.getData('fullText'),requested:o.getData('scorePulseScale')??1,scale:o.scaleX,bounds:bounds(o)})),
          impactId:flame?.graphic.getData('lastImpact'),impactCount:flame?.graphic.getData('impactCount')??0,impactRays:flame?.graphic.getData('impactRays')??[],
          level:flame?.graphic.getData('intensity')??0,brush,eventId:s.scoreTotal.getData('eventId')??s.presentation.score.events[0].eventId,eventPhase:s.scoreTotal.getData('eventPhase')??'base',shown:s.scoreTotal.text,
          texts:[s.resultText,...s.scoreLabels,s.scoreHeat,s.scoreMult,s.scoreTotal].filter(o=>o.visible&&o.active).map(o=>({text:o.text,full:o.getData('fullText'),bounds:bounds(o),font:o.style.fontSize})),
          pieces:flame?.graphic.getData('safePieces')??[],guards:flame?.graphic.getData('textGuards')??[],bands:flame?.graphic.getData('frameBands')??[],
          localStrokes:flame?.graphic.getData('localStrokes')??[],layers:flame?{local:s.view.root.list.indexOf(flame.graphic),avatar:s.view.root.list.indexOf(s.roleAvatar),frame:s.view.root.list.findIndex(o=>o.name==='score/fire-frame'),pedestal:s.view.root.list.findIndex(o=>o.name==='score/total-pedestal'),foreground:foreground.map(o=>s.view.root.list.indexOf(o)),text:[s.resultText,...s.scoreLabels,s.scoreHeat,s.scoreMult,s.scoreTotal].map(o=>s.view.root.list.indexOf(o))}:undefined,
          cards:s.cardViews.filter(v=>v.container.visible).map(v=>bounds(v.container)),domControls:domControls(),controls:[...Object.values(l.buttons),...Object.values(l.tableActions)],
          masked:s.view.root.list.filter(o=>['score/fire','score/fire-frame'].includes(o.name)).map(o=>({name:o.name,mask:!!o.mask,same:o.mask===flame?.graphic.mask,input:!!o.input})),
          flights:s.view.root.list.filter(o=>o.name==='score/source-flight-line'||o.name==='score/source-flight-packet').map(o=>({landing:o.getData('landing'),cell:o.getData('cell'),mask:!!o.mask})),
          unclassifiedLoops:[...s.audio.voices].filter(v=>v.source.loop&&!v.roll).map(v=>window.__audioSchedules.get(v.source)??{}),
          burning:[...s.audio.voices].filter(v=>v.fire||v.source.loop&&!v.roll&&(!window.__audioSchedules.get(v.source)?.stop||window.__audioSchedules.get(v.source).stop-window.__audioSchedules.get(v.source).start>.35)).length,accents:[...s.audio.voices].filter(v=>v.scoreAccent).length,
          textures:g.textures.getTextureKeys().filter(k=>k.startsWith('score-flame-heat-')),stamp:s.view.root.list.some(o=>o.name==='score/celebration'),shake:s.cameras.main.shakeEffect.isRunning,savedStable:saved===committed};
        frames.push(f);
        if(numeric&&['impact','base-impact'].includes(f.eventPhase)){
          const scale=f.pulses[2].scale,requested=f.pulses[2].requested;
          const tag=!seen.has('compressed')&&scale<.84?'compressed':numericEvent===f.eventId&&scale>1.10&&scale>numericPeak?'rebound':undefined;
          if(tag){numericEvent??=f.eventId;seen.add(tag);if(tag==='rebound')numericPeak=scale;const c=document.createElement('canvas');c.width=g.canvas.width;c.height=g.canvas.height;c.getContext('2d').drawImage(g.canvas,0,0);const raster={tier,tag,metadata:f,png:c.toDataURL('image/png')},previous=rasters.findIndex(r=>r.tag===tag);if(previous>=0)rasters[previous]=raster;else rasters.push(raster);}
        }
        const below=captureBelow&&f.level===0&&(impactScope?brush?.localAge>=90&&brush.localAge<150:localPeak?brush?.localPhase==='fade'&&brush.localAge>=180:brush?.localPhase==='unfold'&&brush.localAge>=110);
        const peak=f.level===tier&&brush?.framePhase==='fade'&&brush.frameProgress===1;
        const key=below?0:peak?tier:undefined;
        if(captureFrames&&key!==undefined&&key===tier&&!seen.has(key)){
          seen.add(key);const c=document.createElement('canvas');c.width=g.canvas.width;c.height=g.canvas.height;c.getContext('2d').drawImage(g.canvas,0,0);
          rasters.push({tier:key,metadata:f,png:c.toDataURL('image/png')});
          if(tier===3&&pagePeak){window.__cinnabar.pagePause={metadata:f,committed:saved};g.loop.sleep();}
        }
      };
      window.__cinnabar={frames,rasters,observe};g.events.on('postrender',observe);
    },{tier:spec.tier,captureBelow:true,captureFrames:mode==='natural'&&!integrationOnly,localPeak:localCornersOnly,pagePeak:!impactScope,impactScope,numeric:mode==='numeric'||process.env.FLAME_FOCUS_SCOPE==='impact-room'&&mode==='natural'&&spec.tier===3});
    await tapUI(p,'game','action/play',true);
    if(mode==='natural'&&spec.tier===3&&!integrationOnly&&!impactScope){
      await p.waitForFunction(()=>!!window.__cinnabar.pagePause);
      const frozen=await p.evaluate(()=>window.__cinnabar.pagePause);
      assert.equal(frozen.metadata.domControls.length,2,'menu and fullscreen DOM remain visible');
      for(const control of frozen.metadata.domControls){assert.ok(control.cssBounds.width>=44&&control.cssBounds.height>=44);for(const band of frozen.metadata.bands)assert.equal(overlaps(control.bounds,band),false);}
      const pageFile=`${viewport.width}x${viewport.height}-tier3-page.png`;await p.screenshot({path:`${dir}/${pageFile}`,fullPage:false});
      r.pageCapture={file:pageFile,...frozen.metadata,pausedAt:'postrender peak',restored:true};
      assert.equal(JSON.stringify(await state(p)),frozen.committed,'native page screenshot keeps whole saved run');
      await p.evaluate(()=>window.__harness.game.loop.wake());
    }
    if(mode==='skip'||mode==='switch'){
      await p.waitForFunction(()=>window.__cinnabar.frames.some(f=>f.brush?.localPhase==='unfold'));
      r.savedBeforeInterrupt=await state(p);
      if(mode==='skip')await tapMenuAction(p,'快进当前手',true);
      else {await openMenuSection(p,'settings',true);await p.getByRole('checkbox',{name:'减少动态'}).check();}
    }
    if(mode==='speed'){
      await p.waitForFunction(()=>window.__cinnabar.frames.some(f=>f.eventPhase==='impact'&&f.impactCount>0));
      r.savedBeforeInterrupt=await state(p);r.speedSwitches=[];
      await openMenuSection(p,'settings',true);
      for(const speed of [2,4,1]){
        await p.getByLabel('演出速度').selectOption(String(speed));
        const observed=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {frame:s.game.loop.frame,at:performance.now(),active:!!s.presentation,tweenSpeed:s.tweens.timeScale,clockSpeed:s.time.timeScale,impactCount:s.scoreFlame?.graphic.getData('impactCount')??0};});
        assert.equal(observed.active,true,'speed changed during this actual presentation');assert.equal(observed.tweenSpeed,speed);assert.equal(observed.clockSpeed,speed);assert.deepEqual(await state(p),r.savedBeforeInterrupt);r.speedSwitches.push({speed,...observed});
      }
      await p.locator('.run-menu-toggle').tap();
    }
    if(spec.tier===0)await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game'),r=window.__harness.game.registry.get('runController').state;return s.scene.isActive()&&!s.playing&&!s.presentation&&r.stage.playIndex===1;});else await waitScene(p,'intermission');
    r.result=await state(p);assert.equal(r.result.lastTrace.finalScore,spec.score);assert.equal(r.result.stage.heat,spec.score);assert.equal(r.result.stage.playIndex,1);
    if(r.savedBeforeInterrupt)assert.deepEqual(r.result,r.savedBeforeInterrupt);
    const captured=await p.evaluate(()=>{const o=window.__cinnabar;window.__harness.game.events.off('postrender',o.observe);return{frames:o.frames,rasters:o.rasters};});r.frames=captured.frames;
    for(const f of r.frames)validate(f);
    assert.ok(r.frames.some(f=>f.brush&&f.brush.localAlpha>0),'actual positive hit exists');
    r.impactOwnership=[...new Map(r.frames.filter(f=>f.impactCount&&f.impactId).map(f=>[f.impactCount,{count:f.impactCount,eventId:f.impactId}])).values()];
    assert.equal(new Set(r.impactOwnership.map(o=>o.eventId)).size,r.impactOwnership.length,'one actual brush hit per committed event id');
    if(['natural','numeric','speed'].includes(mode)){
      if(mode==='numeric')assert.deepEqual(captured.rasters.map(f=>f.tag),['compressed','rebound'],'same actual event has controlled compression and rebound rasters');
      if(mode==='natural'&&!integrationOnly)assert.ok(captured.rasters.some(f=>f.tier===spec.tier),'actual below-target hit or threshold peak captured');
      if(spec.tier===0)assert.ok(BigInt(r.result.stage.heat)<BigInt(r.result.stage.targetHeat));
      // The600 wheel starts at500 in its saved base event; below-target frames come from another natural path.
      const expected=r.result.lastTrace.events.filter(e=>e.phase!=='base'&&e.phase!=='finalScore').map(e=>e.eventId);
      assert.deepEqual([...new Set(r.frames.filter(f=>f.eventPhase==='impact').map(f=>f.eventId))],expected,'every source retains its ordered impact');
      for(const image of captured.rasters){
        const file=`${viewport.width}x${viewport.height}-${image.tag?'digits-'+image.tag:'tier'+image.tier}.png`,png=Buffer.from(image.png.split(',')[1],'base64');await writeFile(`${dir}/${file}`,png);
        const metadata={file,source:report.build.revision,...image.metadata};
        if(localCornersOnly){
          metadata.localPixelProof=[];assert.equal(metadata.localStrokes.length,2);
          for(const points of metadata.localStrokes){
            const left=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x))-4)),top=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y))-4));
            const right=Math.min(viewport.width,Math.ceil(Math.max(...points.map(p=>p.x))+4)),bottom=Math.min(viewport.height,Math.ceil(Math.max(...points.map(p=>p.y))+4));
            const {data,info}=await sharp(png).extract({left,top,width:right-left,height:bottom-top}).removeAlpha().raw().toBuffer({resolveWithObject:true});let pixels=0,minX=info.width,minY=info.height,maxX=-1,maxY=-1;
            for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*info.channels,[red,green,blue]=data.subarray(i,i+3);if(red>125&&red<215&&green<135&&blue<125&&red>green+60){pixels++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
            const proof={region:{x:left,y:top,width:info.width,height:info.height},cinnabarPixels:pixels,inkWidth:maxX-minX+1,inkHeight:maxY-minY+1};metadata.localPixelProof.push(proof);
            assert.ok(pixels>=50&&proof.inkWidth>=8&&proof.inkHeight>=12,'both actual corner strokes have horizontal and vertical visible cinnabar ink');
          }
        }
        report.keyframes.push(metadata);
      }
    }
    r.cleanup=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {brush:!!s.scoreFlame,nodes:s.view.root.list.filter(o=>o.name.startsWith('score/fire')).length,accents:[...s.audio.voices].filter(v=>v.scoreAccent).length};});
    assert.deepEqual(r.cleanup,{brush:false,nodes:0,accents:0});
    r.extraCleanup=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {safeMaskNodes:s.children.list.filter(o=>o.name==='score/fire-safe-area').length,pulseScales:[s.scoreHeat,s.scoreMult,s.scoreTotal].filter(o=>o?.active).map(o=>o.getData('scorePulseScale')??1)};});
    assert.equal(r.extraCleanup.safeMaskNodes,0);assert.ok(r.extraCleanup.pulseScales.every(v=>v===1));
    for(const f of r.frames){if(f.impactCount&&f.impactId){const prior=r.frames.filter(g=>g.frame<=f.frame&&g.impactCount===f.impactCount&&g.impactId);assert.ok(prior.every(g=>g.impactId===f.impactId),'same brush count never changes event identity');}}

    if(mode==='skip'){
      await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');s.fastForward();s.fastForward();});assert.deepEqual(await state(p),r.result);
      if(spec.tier===0){
        await p.evaluate(()=>{const g=window.__harness.game,s=g.scene.getScene('game'),frames=[];const observe=()=>{if(s.presentation)frames.push({replay:s.presentation.replay,accents:[...s.audio.voices].filter(v=>v.scoreAccent).length,saved:JSON.stringify(g.registry.get('runController').state)});};window.__cinnabarReplay={frames,observe};g.events.on('postrender',observe);});
        await tapMenuAction(p,'回看上一手',true);assert.deepEqual(await state(p),r.result);await p.waitForFunction(()=>window.__cinnabarReplay.frames.length>0);
        await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return !s.playing&&!s.presentation;});
        r.replay=await p.evaluate(()=>{const o=window.__cinnabarReplay;window.__harness.game.events.off('postrender',o.observe);return o.frames;});
        assert.ok(r.replay.every(f=>f.replay&&f.accents===0&&f.saved===JSON.stringify(r.result)),'actual replay does not replay brush drum or mutate saved run');
      }else {await tapMenuAction(p,'回看上一手',true);assert.deepEqual(await state(p),r.result);await p.locator('.run-menu-toggle').tap();}
      await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',true);await waitScene(p,spec.tier===0?'game':'intermission');assert.deepEqual(await state(p),r.result);
      r.checks.push('Skip/duplicate completion/recap/reload preserves whole saved run, including RNG');
    }
    assert.deepEqual(r.errors,[]);r.status='PASS';r.checks.push('Natural saved trace and exact displayed tiers; actual phase/mask/geometry; all owned brush/audio cleanup');
    console.log(JSON.stringify({name,status:r.status,frames:r.frames.length,keyframes:captured.rasters.map(f=>f.tier)}));
  }catch(e){r.status='FAIL';r.error=String(e);r.stack=e.stack;throw e;}finally{await context.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');}
}
async function contacts(viewport){
  const w=viewport.width,h=viewport.height,gap=12,label=28,composite=[];
  for(let tier=0;tier<=3;tier++){
    const x=(tier%2)*(w+gap),y=Math.floor(tier/2)*(h+label+gap),file=`${w}x${h}-tier${tier}.png`;
    const meta=report.keyframes.find(k=>k.file===file);
    composite.push({input:Buffer.from(`<svg width="${w}" height="${label}"><text x="6" y="19" font-size="14" fill="#26313a">${['Below target','Target corners','2x half frame','5x double frame'][tier]} | frame ${meta.frame} | age ${Math.round(tier?meta.brush.frameAge:meta.brush.localAge)}ms</text></svg>`),left:x,top:y});
    const png=await sharp(`${dir}/${file}`).resize(w,h).png().toBuffer();composite.push({input:png,left:x,top:y+label});
  }
  await sharp({create:{width:w*2+gap,height:(h+label)*2+gap,channels:4,background:'#f3eadb'}}).composite(composite).png().toFile(`${dir}/${w}x${h}-contact.png`);
}
try{
  if(process.env.FLAME_FOCUS_SCOPE==='impact-room'){
    report.scope='Revised primary numeric room/base first-arrival candidate aligned to1eb6689; bounded actual tiers and interruptions.';
    await run({width:390,height:740},specs[0]);await run({width:390,height:740},specs[1]);await run({width:390,height:740},specs[2]);await run({width:390,height:740},specs[3]);
    await run({width:390,height:740},specs[3],'speed');await run({width:844,height:300},specs[2],'switch');
    await run({width:844,height:300},specs[0],'numeric');await run({width:390,height:740},specs[0],'skip');report.status='PASS';
  }else if(process.env.FLAME_FOCUS_SCOPE==='impact-complete'){
    report.scope='Bounded target/2x, actual speed1→2→4→1 and middle reduced switch, plus same-event numeric compression/rebound.';
    await run({width:390,height:740},specs[1]);await run({width:390,height:740},specs[2]);
    await run({width:390,height:740},specs[3],'speed');await run({width:844,height:300},specs[2],'switch');
    await run({width:844,height:300},specs[0],'numeric');report.status='PASS';
  }else if(impactScope){
    report.scope='First score-impact checkpoint; actual natural202/5589 phase frames, no full matrix.';
    await run({width:390,height:740},specs[0]);await run({width:390,height:740},specs[3]);
    if(process.env.FLAME_FOCUS_SCOPE==='impact-first'){
      await run({width:844,height:300},specs[3]);
      await run({width:390,height:740},specs[0],'reduced');
      await run({width:390,height:740},specs[0],'skip');
    }
    report.status='PASS';
  }else if(integrationOnly){
    report.scope='Finite main integration regression: natural202 and5589 in both viewports, explicit root-avatar/paper/card/button/text layers; no image retakes.';
    for(const viewport of [{width:390,height:740},{width:844,height:300}])for(const spec of [specs[0],specs[3]])await run(viewport,spec);report.status='PASS';
  }else if(localCornersOnly){
    report.scope='Two natural202 low-tier peak frames only; previous approved exterior frames retained at their original source.';
    report.limits[0]='Natural Amo single5 high-card202 only; no injected score, target, RNG, rule or save state. Long-digit probe changes/restores UI Text only.';
    for(const viewport of [{width:390,height:740},{width:844,height:300}])await run(viewport,specs[0]);report.status='PASS';
  }else if(process.env.FLAME_FOCUS_SCOPE==='checkpoint'){
    await run({width:390,height:740},specs[1]);report.status='IN_PROGRESS';report.remaining=['844x300 and remaining natural tiers/below-target frame','reduced / skip / mid-presentation switch browser routes','two four-phase contact sheets','exact review CI'];
  }else if(process.env.FLAME_FOCUS_SCOPE==='interrupt'){
    const previous=JSON.parse(await readFile(dir+'/report.json','utf8'));report.runs=previous.runs.filter(r=>r.status==='PASS');report.keyframes=previous.keyframes;report.keyframeBuild=previous.keyframeBuild;
    for(const r of report.runs)r.source??=previous.build.revision;
    await run({width:390,height:740},specs[0],'skip');await run({width:844,height:300},specs[2],'switch');
    for(const v of [{width:390,height:740},{width:844,height:300}])await contacts(v);report.status='PASS';
  }else if(process.env.FLAME_FOCUS_SCOPE==='lifecycle'){
    const previous=JSON.parse(await readFile(dir+'/report.json','utf8'));report.runs=previous.runs.filter(r=>r.mode==='natural');report.keyframes=previous.keyframes;report.keyframeBuild=previous.build;
    for(const r of report.runs)r.source=previous.build.revision;
    await run({width:390,height:740},specs[0],'reduced');await run({width:844,height:300},specs[2],'reduced');
    await run({width:390,height:740},specs[0],'skip');await run({width:844,height:300},specs[2],'switch');
    for(const v of [{width:390,height:740},{width:844,height:300}])await contacts(v);report.status='PASS';
  }else{
  for(const viewport of [{width:390,height:740},{width:844,height:300}])for(const spec of specs)await run(viewport,spec);
  await run({width:390,height:740},specs[0],'reduced');await run({width:844,height:300},specs[2],'reduced');
  await run({width:390,height:740},specs[0],'skip');await run({width:844,height:300},specs[2],'switch');
  for(const v of [{width:390,height:740},{width:844,height:300}])await contacts(v);
  for(const w of [390,844])assert.ok(report.keyframes.some(f=>f.file===`${w}x${w===390?740:300}-tier0.png`),'actual below-target frame from natural path');
  report.status='PASS';
  }
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;}
finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error}));}
