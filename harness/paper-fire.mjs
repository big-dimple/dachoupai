/** D44 actual natural first-hand scores plus isolated UI-only long-number typography stress. */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {chooseCharacter,tapUI,waitScene} from './ui.mjs';
const dir=process.env.PAPER_FIRE_DIR||'shots/d44/fire';await mkdir(dir,{recursive:true});
const webgl=process.env.PAPER_FIRE_WEBGL==='1';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:webgl?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--disable-gpu','--disable-software-rasterizer']});
const report={browser:browser.version(),renderer:webgl?'software WebGL':'Canvas',runs:[],limits:['Natural actual clear/score for all fire tiers; the large-number case changes only three UI Text objects and immediately restores the real preview, never rule/save values.','Physical OnePlus/Android chrome, hardware GPU and new pictures NOT_RUN.']};
const specs=[
  {seed:'p04-golden-02',character:'amo',ids:['clubs-5','diamonds-14','clubs-4','diamonds-3','clubs-2'],score:'600',tier:1},
  {seed:'d43-fire-1',character:'laohuan',ids:['diamonds-7','diamonds-9','diamonds-4','diamonds-12','diamonds-10'],score:'1200',tier:2},
  {seed:'d43-fire-267',character:'laohuan',ids:['diamonds-11','diamonds-13','diamonds-12','diamonds-10','diamonds-14'],score:'5589',tier:3},
];
const overlaps=(a,b)=>a.x<b.x+b.width-.01&&b.x<a.x+a.width-.01&&a.y<b.y+b.height-.01&&b.y<a.y+a.height-.01;
function validate(frame){
  for(const t of frame.texts){
    assert.ok(!overlaps(t.bounds,frame.fireBox),'number/source outside fire material '+t.text);
    for(const b of frame.controls)assert.ok(!overlaps(t.bounds,b),'text outside sort/action '+t.text);
  }
  for(let i=0;i<frame.texts.length;i++)for(let j=i+1;j<frame.texts.length;j++)assert.ok(!overlaps(frame.texts[i].bounds,frame.texts[j].bounds),'distinct real font bounds');
  for(const b of frame.bands)for(const c of [...frame.controls,...frame.cards])assert.ok(!overlaps(b,c),'edge flame never enters card/control body');
}
try{
  const scope=process.env.PAPER_FIRE_SCOPE||'normal';
  const cases=scope==='finish'?[{viewport:{width:844,height:300},spec:specs[2]},...specs.map(spec=>({viewport:{width:1280,height:720},spec}))]:scope==='remaining'?[{width:844,height:300},{width:1280,height:720}].flatMap(viewport=>specs.map(spec=>({viewport,spec}))):scope==='reduced'?[{viewport:{width:390,height:740},spec:{...specs[0],reduced:true}},{viewport:{width:844,height:360},spec:{...specs[2],reduced:true}}]:scope==='webgl'?[{viewport:{width:1280,height:720},spec:specs[0]}]:scope==='safe'?[{viewport:{width:844,height:300},spec:{...specs[0],bottom:12}}]:[{width:390,height:740},{width:844,height:360},{width:844,height:300},{width:1280,height:720}].flatMap(viewport=>specs.map(spec=>({viewport,spec})));
  for(const {viewport,spec} of cases){
    const touch=viewport.width<1000,name=`${viewport.width}x${viewport.height}-tier${spec.tier}${spec.reduced?'-reduced':''}${spec.bottom?'-safe':''}`,context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:touch?3:1,reducedMotion:spec.reduced?'reduce':'no-preference',recordVideo:{dir:dir+'/video',size:viewport}}),p=await context.newPage(),r={name,viewport,dpr:touch?3:1,...spec,checks:[],errors:[]};report.runs.push(r);
    p.on('pageerror',e=>r.errors.push(String(e)));
    if(spec.bottom)await p.addInitScript(bottom=>document.addEventListener('DOMContentLoaded',()=>document.documentElement.style.setProperty('--safe-bottom',bottom+'px')),spec.bottom);
    try{
      r.phase='choose';await p.goto((process.env.PAPER_FIRE_URL||'http://127.0.0.1:5244/')+'?harness=1&seed='+spec.seed);await chooseCharacter(p,spec.character,touch);await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await p.waitForTimeout(370);await tapUI(p,'shop','action/start-stage',touch);await waitScene(p,'game');
      await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
      r.phase='select';for(const id of spec.ids)await tapUI(p,'game','card/'+id,touch);
      await p.evaluate(()=>{
        const g=window.__harness.game,s=g.scene.getScene('game'),frames=[],rasters=[],seen=new Map();
        const bound=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
        const inspect=()=>{const l=s.view.layout;return{at:performance.now(),fps:g.loop.actualFps,renderer:g.renderer.gl?'WebGL':'Canvas',level:s.scoreFlame?.graphic.getData('intensity')??0,
          texts:[s.resultText,...s.scoreLabels,s.scoreHeat,s.scoreMult,s.scoreTotal].filter(o=>o.visible&&o.active).map(o=>({text:o.text,full:o.getData('fullText'),bounds:bound(o),font:o.style.fontSize})),
          fireBox:l.scoreFire,controls:[...Object.values(l.buttons),...Object.values(l.tableActions)],cards:s.cardViews.filter(v=>v.container.visible).map(v=>bound(v.container)),
          bands:s.view.root.list.filter(o=>o.name.startsWith('score/fire-frame-')&&o.visible).map(bound),reduced:s.reducedMotion,
          maskedFire:s.view.root.list.filter(o=>o.name.startsWith('score/fire')&&!o.name.endsWith('safe-area')).map(o=>({name:o.name,mask:!!o.mask,same:o.mask===s.scoreFlame?.graphic.mask})),
          flights:s.view.root.list.filter(o=>o.name==='score/source-flight-line'||o.name==='score/source-flight-packet').map(o=>({name:o.name,landing:o.getData('landing'),cell:o.getData('cell'),mask:!!o.mask})),
          gpu:g.renderer.gl?g.renderer.gl.getParameter(g.renderer.gl.RENDERER):null};};
        const capture=()=>{if(!s.scoreTotal?.active)return;const f=inspect();frames.push(f);if(f.level&&(!seen.has(f.level)||f.at-seen.get(f.level)>500&&!seen.has('settled/'+f.level))){const settled=seen.has(f.level);seen.set(settled?'settled/'+f.level:f.level,f.at);const c=document.createElement('canvas');c.width=g.canvas.width;c.height=g.canvas.height;c.getContext('2d').drawImage(g.canvas,0,0);rasters.push({level:f.level,settled,canvas:c});}};
        window.__paperFire={frames,rasters,inspect,capture};g.events.on('postrender',capture);
      });
      const original=await p.evaluate(()=>window.__harness.game.registry.get('runController').state);
      r.longNumber=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');s.scoreHeat.setText('123,456,789,012,345');s.scoreMult.setText('× 100,000,000–999,999,999');s.scoreTotal.setText('999,999,999,999,999');s.fitScoreReadouts();return window.__paperFire.inspect();});
      validate(r.longNumber);assert.deepEqual(await p.evaluate(()=>window.__harness.game.registry.get('runController').state),original);
      await p.screenshot({path:`${dir}/${name}-long-ui-only.png`});await p.evaluate(()=>window.__harness.game.scene.getScene('game').refreshSelection());
      r.phase='play-to-intermission';await tapUI(p,'game','action/play',touch);await waitScene(p,'intermission');
      r.result=await p.evaluate(()=>window.__harness.game.registry.get('runController').state);assert.equal(r.result.lastTrace.finalScore,spec.score);assert.equal(r.result.stage.heat,spec.score);assert.equal(r.result.stage.playIndex,1);
      const captured=await p.evaluate(()=>{const o=window.__paperFire;window.__harness.game.events.off('postrender',o.capture);return{frames:o.frames,rasters:o.rasters.map(({canvas,...data})=>({...data,png:canvas.toDataURL('image/png')}))};});r.frames=captured.frames;
      for(const f of r.frames){validate(f);for(const fire of f.maskedFire)assert.ok(fire.mask&&fire.same,'all textures/glow/embers use shared safety mask');for(const flight of f.flights){assert.ok(flight.mask);const q=flight.landing,b=flight.cell;assert.ok(q.x<b.x||q.x>b.x+b.width||q.y<b.y||q.y>b.y+b.height,'source stops outside number cell');}if(spec.reduced){assert.equal(f.reduced,true);assert.equal(f.bands.length,0);}}assert.ok(r.frames.some(f=>f.level===spec.tier));
      for(const image of captured.rasters)await writeFile(`${dir}/${name}-fire${image.level}${image.settled?'-settled':''}.png`,Buffer.from(image.png.split(',')[1],'base64'));
      await p.screenshot({path:`${dir}/${name}-result.png`});assert.deepEqual(r.errors,[]);r.checks.push('Actual all-frame text/control/fire bounds; long UI-only values; natural exact once saved clear');
    }catch(error){r.error=String(error);r.failure=await p.evaluate(()=>({scenes:window.__harness?.game.scene.getScenes(true).map(s=>s.scene.key),phase:window.__harness?.game.registry.get('runController')?.state?.phase}));await p.screenshot({path:`dir/${name}-failure.png`.replace('dir/',dir+'/')});throw error;}finally{const video=p.video();await context.close();if(video)await video.saveAs(`${dir}/${name}.webm`);}
  }
  report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}
finally{await browser.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,runs:report.runs.map(r=>({name:r.name,checks:r.checks,error:r.error}))},null,2));}
