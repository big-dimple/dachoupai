/** P08 cinnabar candidate: actual phase-selected frames; native natural scoring, no recordings. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';
import sharp from 'sharp';
import {chooseCharacter,tapUI,tapMenuAction,openMenuSection,waitScene} from './ui.mjs';
const dir=process.env.PAPER_FIRE_DIR||'shots/cinnabar',port=5260;
await mkdir(dir,{recursive:true});
const report={build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),runs:[],keyframes:[],limits:[
  'Natural 600 / 1200 / 5589 paths; no injected score, target, RNG, rule or save state. Long-digit probe changes/restores UI Text only.',
  'Linux Chromium software Canvas, native emulated touch, CSS390x740 and844x300, DPR1, safe top12/bottom34.',
  'Keyframes copy the actually rendered canvas at postrender using local/frame phase, age and frame number; no guessed phase sleeps.',
  'Physical OnePlus, true GPU, FPS/performance, audio listening, recordings, overall aesthetic acceptance NOT_RUN.',
]};
const server=await preview({build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port,strictPort:true},logLevel:'warn'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
report.browser=browser.version();
const specs=[
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
  assert.equal(f.textures.length,0);assert.equal(f.burning,0);assert.equal(f.shake,false);assert.equal(f.stamp,false);
  for(const p of f.pieces)for(const g of f.guards)assert.equal(overlaps(p,g),false,'every paintable piece excludes actual guards');
  for(const p of f.bands)for(const body of [...f.cards,...f.controls])assert.equal(overlaps(p,body),false,'outer band excludes card/action body');
  for(const flight of f.flights){assert.ok(flight.mask);const p=flight.landing,b=flight.cell;assert.ok(p.x<b.x||p.x>b.x+b.width||p.y<b.y||p.y>b.y+b.height);}
  if(f.brush.reduced)assert.equal(f.brush.updating,false);
  assert.equal(f.savedStable,true,'presentation has no command/save/RNG mutation');
}
async function run(viewport,spec,mode='natural'){
  const name=`${viewport.width}x${viewport.height}-${spec.score}-${mode}`,context=await browser.newContext({viewport,hasTouch:true,deviceScaleFactor:1,reducedMotion:mode==='reduced'?'reduce':'no-preference'}),p=await context.newPage(),r={name,viewport,safe:{top:12,bottom:34},mode,...spec,checks:[],errors:[]};report.runs.push(r);
  p.on('pageerror',e=>r.errors.push(String(e)));
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
    await p.evaluate(({tier,captureBelow,captureFrames})=>{
      const g=window.__harness.game,s=g.scene.getScene('game'),frames=[],rasters=[],seen=new Set();let committed;
      const bounds=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
      const observe=()=>{
        if(!s.presentation||!s.scoreTotal?.active)return;
        const saved=JSON.stringify(g.registry.get('runController').state);committed??=saved;
        const flame=s.scoreFlame,brush=flame?.graphic.getData('strokeState'),l=s.view.layout;
        const f={frame:g.loop.frame,at:performance.now(),renderer:g.renderer.gl?'WebGL':'Canvas',origin:s.presentation.originHeat,product:s.displayedScoreProduct,
          level:flame?.graphic.getData('intensity')??0,brush,eventId:s.scoreTotal.getData('eventId'),eventPhase:s.scoreTotal.getData('eventPhase'),shown:s.scoreTotal.text,
          texts:[s.resultText,...s.scoreLabels,s.scoreHeat,s.scoreMult,s.scoreTotal].filter(o=>o.visible&&o.active).map(o=>({text:o.text,full:o.getData('fullText'),bounds:bounds(o),font:o.style.fontSize})),
          pieces:flame?.graphic.getData('safePieces')??[],guards:flame?.graphic.getData('textGuards')??[],bands:flame?.graphic.getData('frameBands')??[],
          cards:s.cardViews.filter(v=>v.container.visible).map(v=>bounds(v.container)),controls:[...Object.values(l.buttons),...Object.values(l.tableActions)],
          masked:s.view.root.list.filter(o=>['score/fire','score/fire-frame'].includes(o.name)).map(o=>({name:o.name,mask:!!o.mask,same:o.mask===flame?.graphic.mask,input:!!o.input})),
          flights:s.view.root.list.filter(o=>o.name==='score/source-flight-line'||o.name==='score/source-flight-packet').map(o=>({landing:o.getData('landing'),cell:o.getData('cell'),mask:!!o.mask})),
          burning:[...s.audio.voices].filter(v=>v.fire||v.source.loop&&v.roll===undefined).length,accents:[...s.audio.voices].filter(v=>v.scoreAccent).length,
          textures:g.textures.getTextureKeys().filter(k=>k.startsWith('score-flame-heat-')),stamp:s.view.root.list.some(o=>o.name==='score/celebration'),shake:s.cameras.main.shakeEffect.isRunning,savedStable:saved===committed};
        frames.push(f);
        const below=captureBelow&&f.level===0&&brush?.localPhase==='unfold'&&brush.localAge>=110;
        const peak=f.level===tier&&brush?.framePhase==='fade'&&brush.frameProgress===1;
        const key=below?0:peak?tier:undefined;
        if(captureFrames&&key!==undefined&&!seen.has(key)){
          seen.add(key);const c=document.createElement('canvas');c.width=g.canvas.width;c.height=g.canvas.height;c.getContext('2d').drawImage(g.canvas,0,0);
          rasters.push({tier:key,metadata:f,png:c.toDataURL('image/png')});
        }
      };
      window.__cinnabar={frames,rasters,observe};g.events.on('postrender',observe);
    },{tier:spec.tier,captureBelow:true,captureFrames:mode==='natural'});
    await tapUI(p,'game','action/play',true);
    if(mode==='skip'||mode==='switch'){
      await p.waitForFunction(()=>window.__cinnabar.frames.some(f=>f.brush?.localPhase==='unfold'));
      r.savedBeforeInterrupt=await state(p);
      if(mode==='skip')await tapMenuAction(p,'快进当前手',true);
      else {await openMenuSection(p,'settings',true);await p.getByRole('checkbox',{name:'减少动态'}).check();}
    }
    await waitScene(p,'intermission');r.result=await state(p);assert.equal(r.result.lastTrace.finalScore,spec.score);assert.equal(r.result.stage.heat,spec.score);assert.equal(r.result.stage.playIndex,1);
    if(r.savedBeforeInterrupt)assert.deepEqual(r.result,r.savedBeforeInterrupt);
    const captured=await p.evaluate(()=>{const o=window.__cinnabar;window.__harness.game.events.off('postrender',o.observe);return{frames:o.frames,rasters:o.rasters};});r.frames=captured.frames;
    for(const f of r.frames)validate(f);
    assert.ok(r.frames.some(f=>f.brush&&f.brush.localAlpha>0),'actual positive below-target hit exists');
    if(mode==='natural'){
      assert.ok(captured.rasters.some(f=>f.tier===spec.tier),'actual threshold peak captured');
      // The600 wheel starts at500 in its saved base event; below-target frames come from another natural path.
      const expected=r.result.lastTrace.events.filter(e=>e.phase!=='base'&&e.phase!=='finalScore').map(e=>e.eventId);
      assert.deepEqual([...new Set(r.frames.filter(f=>f.eventPhase==='impact').map(f=>f.eventId))],expected,'every source retains its ordered impact');
      for(const image of captured.rasters){const file=`${viewport.width}x${viewport.height}-tier${image.tier}.png`;await writeFile(`${dir}/${file}`,Buffer.from(image.png.split(',')[1],'base64'));report.keyframes.push({file,source:report.build.revision,...image.metadata});}
    }
    r.cleanup=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {brush:!!s.scoreFlame,nodes:s.view.root.list.filter(o=>o.name.startsWith('score/fire')).length,accents:[...s.audio.voices].filter(v=>v.scoreAccent).length};});
    assert.deepEqual(r.cleanup,{brush:false,nodes:0,accents:0});
    if(mode==='skip'){
      await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');s.fastForward();s.fastForward();});assert.deepEqual(await state(p),r.result);
      await tapMenuAction(p,'回看上一手',true);assert.deepEqual(await state(p),r.result);await p.locator('.run-menu-toggle').tap();
      await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',true);await waitScene(p,'intermission');assert.deepEqual(await state(p),r.result);
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
  if(process.env.FLAME_FOCUS_SCOPE==='checkpoint'){
    await run({width:390,height:740},specs[0]);report.status='IN_PROGRESS';report.remaining=['844x300 and remaining natural tiers/below-target frame','reduced / skip / mid-presentation switch browser routes','two four-phase contact sheets','exact review CI'];
  }else{
  for(const viewport of [{width:390,height:740},{width:844,height:300}])for(const spec of specs)await run(viewport,spec);
  await run({width:390,height:740},specs[1],'reduced');await run({width:390,height:740},specs[0],'skip');await run({width:844,height:300},specs[1],'switch');
  for(const v of [{width:390,height:740},{width:844,height:300}])await contacts(v);
  for(const w of [390,844])assert.ok(report.keyframes.some(f=>f.file===`${w}x${w===390?740:300}-tier0.png`),'actual below-target frame from natural path');
  report.status='PASS';
  }
}catch(e){report.status='FAIL';report.error=String(e);process.exitCode=1;}
finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error}));}
