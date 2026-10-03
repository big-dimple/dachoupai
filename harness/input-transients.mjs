/** D43: inspect every rendered frame and native pointer phases, not only resting screenshots. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {chooseCharacter,tapUI,point,waitScene} from './ui.mjs';

const dir=process.env.TRANSIENT_DIR||'shots/d43/input/after';
const build=process.env.TRANSIENT_BUILD||'shots/d43/input/build';
const baseline=process.env.TRANSIENT_BASELINE==='1';
await mkdir(dir,{recursive:true});
const report={baseline,build:JSON.parse(await readFile(build+'/build-info.json','utf8')),runs:[],limits:[
  'Linux Chromium native mouse/CDP touch and mobile emulation; physical OnePlus tap compositor and Android Chrome NOT_RUN.',
  'Canvas rendered-frame snapshots plus full-page video/native-phase screenshots. Software WebGL checked separately; no hardware performance claim.',
]};
const webgl=process.env.TRANSIENT_WEBGL==='1';
const server=await preview({build:{outDir:build},preview:{host:'127.0.0.1',port:5226,strictPort:true},logLevel:'warn'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:webgl?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--disable-gpu','--disable-software-rasterizer']});
report.browser=browser.version();
async function run(name,touch){
  const viewport=touch?{width:412,height:820}:{width:1280,height:800};
  const dpr=Number(process.env.TRANSIENT_DPR||(touch?3:1));
  const context=await browser.newContext({viewport,hasTouch:touch,isMobile:touch,deviceScaleFactor:dpr,recordVideo:{dir:dir+'/videos',size:viewport}});
  const page=await context.newPage(),cdp=await context.newCDPSession(page),r={name,viewport,touch,dpr,phases:[],errors:[]};report.runs.push(r);
  page.on('pageerror',e=>r.errors.push(String(e)));
  const raw=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:q?[{...q,id:1,radiusX:2,radiusY:2,force:1}]:[]});
  const down=async q=>{if(touch)await raw('touchStart',q);else{await page.mouse.move(q.x,q.y);await page.mouse.down();}};
  const move=q=>touch?raw('touchMove',q):page.mouse.move(q.x,q.y);
  const up=()=>touch?raw('touchEnd'):page.mouse.up();
  const phase=async label=>{
    await page.evaluate(label=>{window.__transient.label=label;},label);
    const state=await page.evaluate(()=>window.__transient.inspect());r.phases.push({label,...state});
    // A DPR3 full-page screenshot may exceed the real355ms long-hold threshold.
    // While pressed, the continuous video and postrender rasters own paint evidence; do not hold input for screenshot I/O.
    if(!state.active)await page.screenshot({path:`${dir}/${name}-${label}.png`});
    return state;
  };
  try{
    await page.goto('http://127.0.0.1:5226/?harness=1&seed=f09-sample-30');await chooseCharacter(page,'amo',touch);
    await page.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);await page.waitForTimeout(400);
    await tapUI(page,'shop','action/start-stage',touch);await waitScene(page,'game');
    await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.length===8&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
    await page.evaluate(()=>{
      const g=window.__harness.game,s=g.scene.getScene('game'),frames=[],images=[];
      const inspect=()=>{
        const canvas=getComputedStyle(g.canvas),surface=getComputedStyle(s.handInput.surface);
        const stroke=o=>{const commands=o.commandBuffer??[];let i=0,arcs=0;const sizes={0:8,1:1,4:3,5:3,6:4,9:1};while(i<commands.length){const code=commands[i];if(code===0)arcs++;if(!sizes[code])break;i+=sizes[code];}return{width:commands[0]===6?commands[1]:null,arcs};};
        return{time:performance.now(),renderer:g.renderer.gl?'WebGL':'Canvas',fps:g.loop.actualFps,label:window.__transient.label,
          keyboard:s.keyboardFocus,active:s.handInput.active,selected:[...s.selectedIds],
          canvas:{tap:canvas.webkitTapHighlightColor,outline:canvas.outlineWidth,outlineStyle:canvas.outlineStyle,focus:g.canvas.matches(':focus'),focusVisible:g.canvas.matches(':focus-visible'),handInput:g.canvas.dataset.handInput,inline:g.canvas.style.cssText},
          surface:{tap:surface.webkitTapHighlightColor,outline:surface.outlineWidth,active:s.handInput.surface.matches(':active')},
          cards:s.cardViews.map(v=>({id:v.card.id,rectWidth:v.background.lineWidth,rectColor:v.background.strokeColor,rectAlpha:v.background.strokeAlpha,edgeAlpha:v.edgeGlow.alpha,...stroke(v.edgeGlow),feedback:v.edgeGlow.getData('feedback'),faceAlpha:v.faceGlow.alpha,selected:s.selectedIds.has(v.card.id)})),
        };
      };
      const capture=()=>{
        frames.push(inspect());
        if(!g.renderer.gl){
          // Every real post-render gets a hand-region raster; CSS-sized crop bounds storage, not animation clocks.
          const b=s.handInput.surface.getBoundingClientRect(),rect=g.canvas.getBoundingClientRect(),sx=g.canvas.width/rect.width,sy=g.canvas.height/rect.height;
          const crop=document.createElement('canvas');crop.width=Math.ceil(b.width);crop.height=Math.ceil(b.height+28);
          crop.getContext('2d').drawImage(g.canvas,(b.left-rect.left)*sx,Math.max(0,(b.top-rect.top-28)*sy),b.width*sx,(b.height+28)*sy,0,0,crop.width,crop.height);
          // Encoding during input can turn a short press into a legitimate355ms hold on software rendering.
          // Retain the raster now and encode only after all contacts finish.
          images.push(crop);
        }
      };
      window.__transient={label:'rest',inspect,frames,images,capture};g.events.on('postrender',capture);
    });
    const ids=await page.evaluate(()=>window.__harness.game.scene.getScene('game').hand.map(c=>c.id));
    const points=await Promise.all([1,3,5].map(i=>point(page,'game','card/'+ids[i])));
    await phase('rest');
    await page.keyboard.press('ArrowRight');await phase('keyboard-before-pointer');
    await down(points[1]);const pressed=await phase('down-from-keyboard');
    assert.equal(pressed.keyboard,false);assert.ok(pressed.cards.every(c=>!c.feedback.focused),'no custom keyboard focus even while pointer is down');
    await up();await phase('up-selected');
    await down(points[1]);await page.waitForTimeout(120);await phase('held-deselect');await up();await phase('up-deselected');
    // Continuous rapid switches: no resting waits between down/up or different cards.
    for(let i=0;i<6;i++){await down(points[i%3]);await up();}await phase('rapid-switch');
    await down(points[0]);await move(points[2]);await phase('held-sweep');
    if(touch)await raw('touchCancel');else{
      // Mouse has no physical cancel command: explicitly labelled browser-event cancellation branch.
      await page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');s.handInput.surface.dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true,cancelable:true}));});await page.mouse.up();
    }
    await phase('cancel');await down(points[1]);await up();await phase('next-contact');
    if(!touch)await page.mouse.move(3,200);
    await page.keyboard.press('ArrowRight');const keyboard=await phase('pointer-to-keyboard');
    assert.equal(keyboard.cards.filter(c=>c.feedback.focused&&c.edgeAlpha>0).length,1,'keyboard focus is visibly restored');
    await page.keyboard.press('Space');await phase('keyboard-space');
    await down(points[2]);await phase('second-keyboard-to-pointer');await up();await phase('final-up');
    const captured=await page.evaluate(()=>{const g=window.__harness.game,t=window.__transient;g.events.off('postrender',t.capture);return{frames:t.frames,images:t.images.map(image=>image.toDataURL('image/png'))};});
    await mkdir(`${dir}/${name}-frames`,{recursive:true});
    for(let i=0;i<captured.images.length;i++)await writeFile(`${dir}/${name}-frames/${String(i).padStart(5,'0')}.png`,Buffer.from(captured.images[i].split(',')[1],'base64'));
    r.frames=captured.frames;r.frameCount=captured.frames.length;r.rasterFrames=captured.images.length;
    assert.ok(r.frameCount>0);assert.ok(r.frames.every(f=>f.renderer===(webgl?'WebGL':'Canvas')));
    for(const frame of r.frames){
      for(const card of frame.cards){assert.equal(card.rectWidth,1,'every frame keeps neutral paper1px');assert.equal(card.rectColor,0xb78a4f,'every frame keeps neutral brass paper');assert.ok(card.width<=3);assert.equal(card.arcs,4);assert.equal(card.faceAlpha,0,'no face-wide pressed fill');if(!frame.keyboard)assert.ok(!card.feedback.focused);}
      if(!baseline){assert.equal(frame.canvas.tap,'rgba(0, 0, 0, 0)');assert.equal(frame.surface.tap,'rgba(0, 0, 0, 0)');if(!frame.keyboard)assert.equal(frame.canvas.outline,'0px');}
    }
    if(baseline){r.nativeRisk=r.phases.some(f=>f.surface.tap!=='rgba(0, 0, 0, 0)')&&r.phases.some(f=>!f.keyboard&&f.canvas.outline!=='0px');assert.ok(r.nativeRisk,'baseline native highlight and inherited focus-visible risk reproduced');}
    assert.deepEqual(r.errors,[]);r.status='PASS';
  }catch(e){r.status='FAIL';r.error=String(e);r.stack=e.stack;process.exitCode=1;await page.screenshot({path:`${dir}/${name}-failure.png`}).catch(()=>{});}
  finally{const video=page.video();await context.close();await video.saveAs(`${dir}/${name}.webm`);await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({name,status:r.status,frames:r.frameCount,error:r.error}));}
}
try{for(const [name,touch] of [['desktop',false],['touch',true]])if(!process.env.TRANSIENT_PROFILE||process.env.TRANSIENT_PROFILE===name)await run(name,touch);}
finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));report.status=report.runs.every(r=>r.status==='PASS')?'PASS':'FAIL';await writeFile(dir+'/report.json',JSON.stringify(report,null,2));}
