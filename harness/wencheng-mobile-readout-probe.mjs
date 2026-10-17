/** One targeted rendering probe after the two-hero functional check. */
import {createServer,preview} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {tapUI,waitScene} from './ui.mjs';
const out='shots/wencheng-huarui-dynamic/mobile-readout-probe';await mkdir(out,{recursive:true});
const ssr=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,watch:null},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',logLevel:'error'});
const {dynamicHeroFixture}=await ssr.ssrLoadModule('/harness/fixtures/wencheng-huarui-dynamic.ts'),f=dynamicHeroFixture('azao');await ssr.close();
const server=await preview({build:{outDir:'shots/wencheng-huarui-dynamic/build'},preview:{host:'127.0.0.1',port:5597,strictPort:true}}),browser=await chromium.launch({args:['--disable-gpu']});
try{
 const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:1});p.setDefaultTimeout(20000);await p.goto('http://127.0.0.1:5597/?harness=1');await waitScene(p,'title');
 await p.locator('.run-menu-toggle').click();await p.getByText('进度与存档',{exact:true}).locator('..').locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'readout-probe.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(f.checkpoint))});await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&!s.presentation&&s.controlsLive;});
 for(const id of f.selectedIds)await tapUI(p,'game','card/'+id,true);await tapUI(p,'game','hero/action-shortcut',true);await p.getByRole('button',{name:'本手释放 ×1.5',exact:true}).tap();await p.waitForTimeout(380);
 await p.evaluate(()=>{
  const g=window.__harness.game,m=window.__boundsProbe={frames:[],active:true};
  const rect=o=>{const b=o.getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.x+b.width,bottom:b.y+b.height};};
  // Phaser Canvas uses frame.source.resolution, whereas Text.getBounds uses logical width.
  // Keep both: a passing logical box must not conceal an oversized rendered bitmap.
  const rasterRect=o=>{const f=o.frame,res=f.source.resolution,w=f.cutWidth/res,h=f.cutHeight/res,m=o.getWorldTransformMatrix(),x=-o.displayOriginX+f.x,y=-o.displayOriginY+f.y,points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([px,py])=>({x:m.a*px+m.c*py+m.e,y:m.b*px+m.d*py+m.f})),left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));return {x:left,y:top,width:right-left,height:bottom-top,right,bottom};};
  const textInfo=o=>({name:o.name,text:o.text,bounds:rect(o),rasterBounds:rasterRect(o),font:o.style.fontSize,resolution:o.style.resolution,textureResolution:o.frame.source.resolution,frameWidth:o.frame.cutWidth,frameHeight:o.frame.cutHeight,scale:o.scaleX});
  m.renderer={type:g.renderer.type,canvas:g.renderer.type===1,width:g.canvas.width,height:g.canvas.height,cameraZoom:safeCameraZoom()};
  function safeCameraZoom(){return g.scene.getScene('game').cameras.main.zoom;}
  if(!m.renderer.canvas||m.renderer.cameraZoom!==1)throw Error('This probe requires the Canvas fallback and camera zoom 1');
  g.events.on('postrender',()=>{if(!m.active)return;const s=g.scene.getScene('game');if(!s.scene.isActive()||!s.controlsLive)return;
   const process=s.resultText.getData('scoreSourceProcess'),eyes=s.heroClimax?.group;
   const numbers=[s.scoreHeat,s.scoreMult,s.scoreTotal].map(textInfo);
   const packets=s.view.root.list.filter(o=>o.name==='score/source-arrival').flatMap(group=>group.list.filter(o=>o.name==='score/source-value').map(o=>({eventId:group.getData('eventId'),...textInfo(o),width:o.width,height:o.height,x:o.x,y:o.y})));
   const row={t:performance.now(),frame:g.loop.frame,process,eyeEventId:eyes?.getData('eventId'),eyePhase:eyes?.getData('phase'),numbers,packets};m.frames.push(row);
   if(eyes?.active&&packets.some(o=>o.eventId===eyes.getData('eventId')&&(o.rasterBounds.x<0||o.rasterBounds.right>390))&&!m.packetImage)m.packetImage={t:row.t,png:g.canvas.toDataURL('image/png')};
   if(numbers.some(o=>o.text&&(o.rasterBounds.x<0||o.rasterBounds.right>390))&&!m.numberImage)m.numberImage={t:row.t,png:g.canvas.toDataURL('image/png')};
  });
 });
 await tapUI(p,'game','action/play',true);await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&!s.presentation;});
 const data=await p.evaluate(()=>{window.__boundsProbe.active=false;return window.__boundsProbe;});
 const packets=data.frames.flatMap(f=>f.eyeEventId?f.packets.filter(p=>p.eventId===f.eyeEventId&&(p.rasterBounds.x<0||p.rasterBounds.right>390)).map(p=>({t:f.t,frame:f.frame,phase:f.eyePhase,...p})):[]),numbers=data.frames.flatMap(f=>f.numbers.filter(o=>o.text&&(o.rasterBounds.x<0||o.rasterBounds.right>390)).map(o=>({t:f.t,frame:f.frame,...o})));
 const summary={candidate:'e2e64946f6fabe6fc0e8b369a6b3b52c5bda9d29',viewport:{width:390,height:844,dpr:1},renderer:data.renderer,sampling:'POST_RENDER',measurement:'Canvas frame.cutWidth / frame.source.resolution transformed to world space; camera zoom must be 1',packetOverflow:{count:packets.length,first:packets[0],last:packets.at(-1),maxRight:packets.length?Math.max(...packets.map(p=>p.rasterBounds.right)):null},numberOverflow:{count:numbers.length,first:numbers[0],last:numbers.at(-1),maxRight:numbers.length?Math.max(...numbers.map(p=>p.rasterBounds.right)):null},status:packets.length||numbers.length?'FAIL':'PASS'};
 for(const [key,name]of [['packetImage','source-value-overflow.png'],['numberImage','number-overflow.png']])if(data[key])await writeFile(out+'/'+name,Buffer.from(data[key].png.split(',')[1],'base64'));
 delete data.packetImage;delete data.numberImage;await writeFile(out+'/frames.json.gz',gzipSync(JSON.stringify(data)));await writeFile(out+'/summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(summary.status==='FAIL')process.exitCode=1;
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
