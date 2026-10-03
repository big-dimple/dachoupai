/** P08 bounded flame focus: actual rendered static frames, no recording or GPU performance claims. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {chooseCharacter,tapUI,tapMenuAction,waitScene} from './ui.mjs';
const dir=process.env.PAPER_FIRE_DIR||'shots/flame-focus';await mkdir(dir,{recursive:true});
const server=await preview({build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5260,strictPort:true},logLevel:'warn'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={browser:browser.version(),renderer:'Canvas',runs:[],limits:['Natural actual clear/score for all fire tiers; the large-number case changes only three UI Text objects and immediately restores the real preview, never rule/save values.','Reference JPEG pixels NOT_VIEWED by this consumer; user delegated aesthetics to reviewers who viewed them. Physical OnePlus/Android chrome, hardware GPU, audio listening, recording and new pictures NOT_RUN.']};
const specs=[
  {seed:'p04-golden-02',character:'amo',ids:['clubs-5','diamonds-14','clubs-4','diamonds-3','clubs-2'],score:'600',tier:1},
  {seed:'d43-fire-1',character:'laohuan',ids:['diamonds-7','diamonds-9','diamonds-4','diamonds-12','diamonds-10'],score:'1200',tier:2},
  {seed:'d43-fire-267',character:'laohuan',ids:['diamonds-11','diamonds-13','diamonds-12','diamonds-10','diamonds-14'],score:'5589',tier:3},
];
const overlaps=(a,b)=>a.x<b.x+b.width-.01&&b.x<a.x+a.width-.01&&a.y<b.y+b.height-.01&&b.y<a.y+a.height-.01;
function validate(frame){
  for(const t of frame.texts){
    for(const b of frame.safePieces??[])assert.ok(!overlaps(t.bounds,b),'number/source outside actually paintable fire '+t.text);
    for(const b of frame.controls)assert.ok(!overlaps(t.bounds,b),'text outside sort/action '+t.text);
  }
  for(let i=0;i<frame.texts.length;i++)for(let j=i+1;j<frame.texts.length;j++)assert.ok(!overlaps(frame.texts[i].bounds,frame.texts[j].bounds),'distinct real font bounds');
  for(const b of frame.bands)for(const c of [...frame.controls,...frame.cards])assert.ok(!overlaps(b,c),'edge flame never enters card/control body');
}
try{
  const allCases=[{viewport:{width:360,height:740},spec:specs[0]},...specs.map(spec=>({viewport:{width:390,height:740},spec})),{viewport:{width:844,height:300},spec:specs[2]},{viewport:{width:1280,height:720},spec:specs[1]},{viewport:{width:390,height:740},spec:{...specs[1],reduced:true}},{viewport:{width:360,height:740},spec:{...specs[0],fastForward:true}}];
  const cases=process.env.FLAME_FOCUS_SCOPE==='interrupt'?allCases.filter(c=>c.spec.fastForward):process.env.FLAME_FOCUS_SCOPE==='short'?[{viewport:{width:844,height:300},spec:{...specs[2],bottom:34,top:12}}]:allCases;
  for(const {viewport,spec} of cases){
    const touch=viewport.width<1000,name=`${viewport.width}x${viewport.height}-tier${spec.tier}${spec.reduced?'-reduced':''}${spec.bottom?'-safe':''}${spec.fastForward?'-fast-forward':''}`,context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?3:1,reducedMotion:spec.reduced?'reduce':'no-preference',}),p=await context.newPage(),r={name,viewport,dpr:touch?3:1,...spec,checks:[],errors:[]};report.runs.push(r);
    p.on('pageerror',e=>r.errors.push(String(e)));
    if(spec.bottom)await p.addInitScript(({bottom,top})=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--safe-bottom',bottom+'px');if(top)document.documentElement.style.setProperty('--safe-top',top+'px');}),spec);
    try{
      r.phase='choose';await p.goto((process.env.PAPER_FIRE_URL||'http://127.0.0.1:5260/')+'?harness=1&seed='+spec.seed);await chooseCharacter(p,spec.character,touch);await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(370);await tapUI(p,'shop','action/start-stage',touch);await waitScene(p,'game');
      await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
      r.phase='select';for(const id of spec.ids)await tapUI(p,'game','card/'+id,touch);
      r.preview=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),l=s.view.layout,b=o=>{const r=o.getBounds();return{x:r.x,y:r.y,width:r.width,height:r.height};};return{layout:l,cards:s.previewCards.list.filter(o=>o.type==='Container').map(c=>({face:b(c.list.find(o=>o.type==='Rectangle')),rank:c.list.filter(o=>o.name==='rank-index').map(o=>({bounds:b(o),font:o.style.fontSize,text:o.text})),bounds:b(c)}))};});
      if(viewport.width<700)assert.equal(r.preview.cards.length,5,'five full selection preview faces remain visible');
      for(const card of r.preview.cards){
        const a=r.preview.layout.playedArea,b=card.face;
        assert.ok(b.x>=a.x&&b.y>=a.y&&b.x+b.width<=a.x+a.width+.01&&b.y+b.height<=a.y+a.height+.01,'complete selected face inside independent played area');
        assert.equal(overlaps(b,r.preview.layout.hand),false,'preview never intrudes into hand');
        for(const rank of card.rank)assert.ok(parseFloat(rank.font)>=14,'rank font remains legible');
      }
      if(!spec.fastForward&&process.env.FLAME_FOCUS_SCOPE!=='short')await p.screenshot({path:`${dir}/${name}-five-preview.png`});
      await p.evaluate(()=>{
        const g=window.__harness.game,s=g.scene.getScene('game'),frames=[],rasters=[],seen=new Map();
        const bound=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
        const inspect=()=>{const l=s.view.layout;return{at:performance.now(),fps:g.loop.actualFps,renderer:g.renderer.gl?'WebGL':'Canvas',level:s.scoreFlame?.graphic.getData('intensity')??0,
          texts:[s.resultText,...s.scoreLabels,s.scoreHeat,s.scoreMult,s.scoreTotal].filter(o=>o.visible&&o.active).map(o=>({text:o.text,full:o.getData('fullText'),bounds:bound(o),font:o.style.fontSize})),
          fireBox:l.scoreFire,safePieces:s.scoreFlame?.graphic.getData('safePieces')??[],controls:[...Object.values(l.buttons),...Object.values(l.tableActions)],cards:s.cardViews.filter(v=>v.container.visible).map(v=>bound(v.container)),
          bands:s.view.root.list.filter(o=>o.name.startsWith('score/fire-frame-')&&o.visible).map(bound),reduced:s.reducedMotion,edgeFlash:s.scoreFlame?.frameFlash??0,hit:s.scoreFlame?.graphic.getData('lastImpact'),impacts:s.scoreFlame?.graphic.getData('impactCount')??0,surge:s.scoreFlame?.surge??0,
          maskedFire:s.view.root.list.filter(o=>o.name.startsWith('score/fire')&&!o.name.endsWith('safe-area')).map(o=>({name:o.name,mask:!!o.mask,same:o.mask===s.scoreFlame?.graphic.mask})),
          flights:s.view.root.list.filter(o=>o.name==='score/source-flight-line'||o.name==='score/source-flight-packet').map(o=>({name:o.name,landing:o.getData('landing'),cell:o.getData('cell'),mask:!!o.mask})),
          gpu:g.renderer.gl?g.renderer.gl.getParameter(g.renderer.gl.RENDERER):null};};
        const capture=()=>{if(!s.scoreTotal?.active)return;const f=inspect();frames.push(f);if(f.level&&(!seen.has(f.level)||f.at-seen.get(f.level)>500&&!seen.has('settled/'+f.level))){const settled=seen.has(f.level);seen.set(settled?'settled/'+f.level:f.level,f.at);const c=document.createElement('canvas');c.width=g.canvas.width;c.height=g.canvas.height;const ctx=c.getContext('2d');ctx.drawImage(g.canvas,0,0);
          const density=c.width/s.view.layout.width,b=f.fireBox,px=ctx.getImageData(Math.round(b.x*density),Math.round(b.y*density),Math.round(b.width*density),Math.round(b.height*density)),tops=[];
          for(let x=2;x<px.width-2;x++){let top=px.height;for(let y=0;y<px.height;y++){const i=(y*px.width+x)*4,R=px.data[i],G=px.data[i+1],B=px.data[i+2];if(R>175&&G>65&&B<190&&R-B>50){top=y;break;}}tops.push((px.height-top)/density);}
          const floor=Math.min(...tops)+b.height*.15,peaks=[];let start=-1;
          for(let x=0;x<=tops.length;x++){if(x<tops.length&&tops[x]>floor){if(start<0)start=x;}else if(start>=0){peaks.push(Math.max(...tops.slice(start,x)));start=-1;}}
          const valleys=[Math.min(...tops)];
          rasters.push({level:f.level,settled,canvas:c,pixels:{density,height:b.height,visibleHeight:Math.max(...tops),peaks,valleys}});}};
        window.__paperFire={frames,rasters,inspect,capture};g.events.on('postrender',capture);
      });
      const original=await p.evaluate(()=>window.__harness.game.registry.get('runController').state);
      r.longNumber=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');s.scoreHeat.setText('123,456,789,012,345');s.scoreMult.setText('× 100,000,000–999,999,999');s.scoreTotal.setText('999,999,999,999,999');s.fitScoreReadouts();return window.__paperFire.inspect();});
      validate(r.longNumber);assert.deepEqual(await p.evaluate(()=>window.__harness.game.registry.get('runController').state),original);
      if(!spec.fastForward&&process.env.FLAME_FOCUS_SCOPE!=='short')await p.screenshot({path:`${dir}/${name}-long-ui-only.png`});await p.evaluate(()=>window.__harness.game.scene.getScene('game').refreshSelection());
      r.phase='play-to-intermission';await tapUI(p,'game','action/play',touch);
      if(spec.fastForward){await p.waitForFunction(()=>window.__harness.game.scene.getScene('game').scoreFlame?.graphic.getData('intensity')>0);await tapMenuAction(p,'快进当前手',touch);}
      await waitScene(p,'intermission');
      r.result=await p.evaluate(()=>window.__harness.game.registry.get('runController').state);assert.equal(r.result.lastTrace.finalScore,spec.score);assert.equal(r.result.stage.heat,spec.score);assert.equal(r.result.stage.playIndex,1);
      const captured=await p.evaluate(()=>{const o=window.__paperFire;window.__harness.game.events.off('postrender',o.capture);return{frames:o.frames,rasters:o.rasters.map(({canvas,...data})=>({...data,png:canvas.toDataURL('image/png')}))};});r.frames=captured.frames;
      for(const f of r.frames){validate(f);for(const fire of f.maskedFire)assert.ok(fire.mask&&fire.same,'all textures/glow/embers use shared safety mask');for(const flight of f.flights){assert.ok(flight.mask);const q=flight.landing,b=flight.cell;assert.ok(q.x<b.x||q.x>b.x+b.width||q.y<b.y||q.y>b.y+b.height,'source stops outside number cell');}if(spec.reduced){assert.equal(f.reduced,true);assert.equal(f.bands.length,0);}}assert.ok(r.frames.some(f=>f.level===spec.tier));
      r.rasters=captured.rasters.map(({png,...rest})=>rest);
      for(const image of r.rasters){
        const {height,visibleHeight,peaks,valleys}=image.pixels;
        assert.ok(visibleHeight>=height*(image.level===1?.35:.55),'actual composited flame has readable CSS height');
        assert.ok(Math.max(...peaks)-Math.min(...valleys)>=height*.25,'actual composited peak-to-valley contrast');
        assert.ok(peaks.length>=2,'multiple independently detected contour groups');
      }
      if(!spec.reduced&&!spec.fastForward){
        const settled=r.frames.filter(f=>f.level>=2&&f.edgeFlash===0);if(spec.tier>=2)assert.ok(settled.length,'brief ignition ends during presentation');
        assert.ok(settled.every(f=>f.bands.length===0),'no persistent four-edge glow');
        const hits=r.frames.filter(f=>f.hit);assert.ok(hits.length,'natural positive source reaches impact integration');
        assert.ok(hits.some(f=>f.surge>0),'source landing creates a local impulse');
      }
      if(!spec.fastForward)for(const image of process.env.FLAME_FOCUS_SCOPE==='short'?captured.rasters.filter(i=>i.level===spec.tier).slice(-1):captured.rasters)await writeFile(`${dir}/${name}-fire${image.level}${image.settled?'-settled':''}.png`,Buffer.from(image.png.split(',')[1],'base64'));
      if(!spec.fastForward&&process.env.FLAME_FOCUS_SCOPE!=='short')await p.screenshot({path:`${dir}/${name}-result.png`});assert.deepEqual(r.errors,[]);
      r.cleanup=await p.evaluate(()=>{const g=window.__harness.game,s=g.scene.getScene('game');return{flame:!!s.scoreFlame,textures:g.textures.getTextureKeys().filter(k=>k.startsWith('score-flame-heat-')),voices:s.audio.fireVoices.size};});
      assert.equal(r.cleanup.flame,false);assert.deepEqual(r.cleanup.textures,[]);assert.equal(r.cleanup.voices,0);
      if(spec.fastForward){
        await p.evaluate(()=>window.__harness.game.scene.getScene('game').fastForward());
        assert.deepEqual(await p.evaluate(()=>window.__harness.game.registry.get('runController').state),r.result,'duplicate completion cannot re-credit');
        await tapMenuAction(p,'回看上一手',touch);
        assert.deepEqual(await p.evaluate(()=>window.__harness.game.registry.get('runController').state),r.result,'public recap preserves score and RNG');
        await p.reload();await waitScene(p,'title');await tapUI(p,'title','action/title-continue',touch);await waitScene(p,'intermission');
        assert.deepEqual(await p.evaluate(()=>window.__harness.game.registry.get('runController').state),r.result,'restore never replays a credit');
        assert.equal(await p.evaluate(()=>!!window.__harness.game.scene.getScene('game').scoreFlame),false);
        r.checks.push('Fast-forward/duplicate completion/recap/refresh preserves saved score/RNG and destroys owned flame');
      }
      r.checks.push('Actual all-frame text/control/fire bounds; long UI-only values; natural exact once saved clear');
    }catch(error){r.error=String(error);r.failure=await p.evaluate(()=>({scenes:window.__harness?.game.scene.getScenes(true).map(s=>s.scene.key),phase:window.__harness?.game.registry.get('runController')?.state?.phase}));if(!spec.fastForward&&process.env.FLAME_FOCUS_SCOPE!=='short')await p.screenshot({path:`dir/${name}-failure.png`.replace('dir/',dir+'/')});throw error;}finally{await context.close();}
  }
  report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}
finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,runs:report.runs.map(r=>({name:r.name,checks:r.checks,error:r.error}))},null,2));}
