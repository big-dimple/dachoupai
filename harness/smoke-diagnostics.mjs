/** Optional read-only timing preload; use NODE_OPTIONS=--import=... with the unchanged smoke. */
import {appendFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const output=process.env.SMOKE_DIAGNOSTICS_OUTPUT;
if(output){
 mkdirSync(path.dirname(output),{recursive:true});
 const started=performance.now(),record=(kind,data)=>appendFileSync(output,JSON.stringify({kind,process:process.pid,elapsedMs:performance.now()-started,...data})+'\n');
 record('process',{node:process.version,argv:process.argv});
 const {chromium,firefox,webkit}=await import(pathToFileURL(path.join(process.cwd(),'node_modules/playwright/index.mjs')).href);
 const init=()=>{
  const stats=()=>({count:0,totalMs:0,maxMs:0,over100ms:0}),add=(s,n)=>{s.count++;s.totalMs+=n;s.maxMs=Math.max(s.maxMs,n);if(n>100)s.over100ms++;};
  const data=window.__smokePerf={started:performance.now(),phases:[],decodes:[],resources:[],longTasks:[]};
  const decode=HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode=function(...args){const at=performance.now();return decode.apply(this,args).then(value=>{data.decodes.push({ms:performance.now()-at,width:this.naturalWidth,height:this.naturalHeight,src:this.currentSrc||this.src});return value;},error=>{data.decodes.push({ms:performance.now()-at,error:String(error)});throw error;});};
  const bitmap=window.createImageBitmap;
  if(bitmap)window.createImageBitmap=function(...args){const at=performance.now();return bitmap.apply(this,args).then(value=>{data.decodes.push({kind:'bitmap',ms:performance.now()-at,width:value.width,height:value.height});return value;});};
  new PerformanceObserver(list=>{for(const e of list.getEntries())data.resources.push({name:e.name,duration:e.duration,transferSize:e.transferSize,decodedBodySize:e.decodedBodySize});}).observe({type:'resource',buffered:true});
  if(PerformanceObserver.supportedEntryTypes.includes('longtask'))new PerformanceObserver(list=>{for(const e of list.getEntries())data.longTasks.push({start:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
  const emit=(kind,value)=>console.log('__SMOKE_PERF__'+JSON.stringify({kind,at:performance.now()-data.started,...value}));
  const timer=setInterval(()=>{
   const game=window.__harness?.game;if(!game?.isBooted)return;clearInterval(timer);
   const gl=game.renderer.gl,ext=gl?.getExtension('WEBGL_debug_renderer_info');
   data.renderer={type:game.renderer.type,renderer:gl?.getParameter(gl.RENDERER),unmasked:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,dpr:devicePixelRatio,canvas:[game.canvas.width,game.canvas.height],css:[game.canvas.getBoundingClientRect().width,game.canvas.getBoundingClientRect().height],reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};emit('renderer',data.renderer);
   let current,lastFrame,stepAt,renderAt,lastReport=performance.now();
   game.events.on('prestep',()=>{const now=performance.now(),key=game.scene.getScenes(true).map(s=>s.sys.settings.key).join('+');if(current?.scene!==key){if(current)emit('phase-end',current);current={scene:key,started:now,frames:stats(),step:stats(),render:stats()};data.phases.push(current);emit('phase-start',{scene:key});lastFrame=undefined;}if(lastFrame!==undefined)add(current.frames,now-lastFrame);lastFrame=now;stepAt=now;});
   game.events.on('poststep',()=>{if(current)add(current.step,performance.now()-stepAt);});
   game.events.on('prerender',()=>{renderAt=performance.now();});
   game.events.on('postrender',()=>{if(current)add(current.render,performance.now()-renderAt);const now=performance.now();if(now-lastReport>5000){lastReport=now;emit('sample',{scene:current?.scene,actualFps:game.loop.actualFps,frames:current?.frames,step:current?.step,render:current?.render,decodeCount:data.decodes.length});}});
  },50);
 };
 for(const engine of [chromium,firefox,webkit]){
  const launch=engine.launch.bind(engine);
  engine.launch=async(...args)=>{
   const at=performance.now();const browser=await launch(...args);record('launch',{engine:engine.name(),version:browser.version(),ms:performance.now()-at,options:args[0]??{}});
   const newContext=browser.newContext.bind(browser);
   browser.newContext=async options=>{
    const context=await newContext(options);record('context',{engine:engine.name(),options});await context.addInitScript(init);
    const newPage=context.newPage.bind(context),pages=[];
    context.newPage=async()=>{
     const page=await newPage();pages.push(page);page.on('console',message=>{const text=message.text();if(text.startsWith('__SMOKE_PERF__'))record('browser',{engine:engine.name(),...JSON.parse(text.slice(14))});});
     const evaluate=page.evaluate.bind(page);page.__perfSnapshot=async label=>{if(!page.isClosed())try{record('snapshot',{engine:engine.name(),label,data:await evaluate(()=>window.__smokePerf)});}catch(error){record('snapshot-error',{label,error:String(error)});}};
     for(const method of ['goto','reload','evaluate','waitForFunction','setViewportSize']){
      const original=page[method].bind(page);
      page[method]=async(...args)=>{if(method==='reload')await page.__perfSnapshot('before-reload');const at=performance.now(),source=String(args[0]),label=source.includes("events.once('poststep'")?'poststep':source.slice(0,160);try{return await original(...args);}finally{record('api',{engine:engine.name(),method,label,arg:typeof args[1]==='string'||typeof args[1]==='number'?args[1]:args[1]?.name??args[1]?.key,ms:performance.now()-at});}};
     }
     for(const [object,method] of [[page.touchscreen,'tap'],[page.mouse,'click']]){const original=object[method].bind(object);object[method]=async(...args)=>{const at=performance.now();try{return await original(...args);}finally{record('input',{engine:engine.name(),method,ms:performance.now()-at});}};}
     return page;
    };
    const close=context.close.bind(context);context.close=async(...args)=>{for(const page of pages)await page.__perfSnapshot('context-close');return close(...args);};
    return context;
   };
   return browser;
  };
 }
}
