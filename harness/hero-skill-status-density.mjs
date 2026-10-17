/** One viewport, native status bitmaps at common DPRs; GameScene stays unchanged on disk. */
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';

const base='e2e64946f6fabe6fc0e8b369a6b3b52c5bda9d29',out='docs/production/evidence/hero-skill-status-density-2026-10-17',bundle='.vite/hero-skill-status-density-build',entry='.vite/hero-skill-status-density-entry.html';
await mkdir(out,{recursive:true});await mkdir('.vite',{recursive:true});
const normalize=text=>text.replaceAll('\r\n','\n'),hash=text=>createHash('sha256').update(normalize(text)).digest('hex');
const gameSource=await readFile('src/game/GameScene.ts','utf8');assert.equal(normalize(gameSource),normalize(execFileSync('git',['show',base+':src/game/GameScene.ts'],{encoding:'utf8'})),'never overwrite the continuous-score scene');
const probe=`<script type="module">
import {GameScene} from '/src/game/GameScene.ts';
import {updateHeroSkillStatusText} from '/src/game/HeroSkillStatusText.ts';
import {createRun,applyCommand} from '/src/domain/run.ts';
import {newRunIdentity} from '/src/game/RunLaunch.ts';
import {makeCheckpoint,readCheckpoint} from '/src/application/checkpoint.ts';
let enabled=false;const original=GameScene.prototype.updateHeroControl;
// Preview the owner patch after the original update; no scoring or saved state is changed.
const apply=scene=>{const text=scene.heroActionButton?.getData('skillStatus');updateHeroSkillStatusText(text,text?.text??'',text?.style.color??'#59646a');};
GameScene.prototype.updateHeroControl=function(...args){const result=original.apply(this,args);if(enabled)apply(this);return result;};
window.skillProbe={enable(){enabled=true;apply(window.__harness.game.scene.getScene('game'));},fixture(){let state=createRun({rulesVersion:'r2',characterId:'laohuan',seed:'skill-status-density',runId:'controlled/skill-status-density',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});for(const type of ['LeaveShop','EnterStage']){const result=applyCommand(state,{runId:state.runId,commandId:state.runId+'/'+(state.commandSeq+1),expectedSeq:state.commandSeq,action:{type}});if(!result.ok)throw Error(result.code);state=result.state;}const checkpoint=makeCheckpoint(state,[]);if(!readCheckpoint(checkpoint).ok)throw Error('invalid fixture');return checkpoint;},snapshot(){const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:{...localStorage}};},expected(state,command){const result=applyCommand(state,command);if(!result.ok)throw Error(result.code);return result.state;}};
</script>`;
await writeFile(entry,(await readFile('index.html','utf8')).replace('</body>',probe+'</body>'));
await build({mode:'e2e',base:'./',publicDir:false,logLevel:'error',build:{outDir:bundle,rollupOptions:{input:entry}}});
const server=createServer(async(request,response)=>{
  const path=decodeURIComponent(new URL(request.url,'http://localhost').pathname),roots=path==='/'?[resolve(bundle,entry)]:[resolve(bundle,'.'+path),resolve('public','.'+path)];
  for(const file of roots){if(!file.startsWith(resolve(bundle))&&!file.startsWith(resolve('public')))continue;try{const data=await readFile(file);response.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[extname(file)]??'application/octet-stream');response.end(data);return;}catch{}}
  response.writeHead(404);response.end();
});await new Promise(resolve=>server.listen(5595,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const report={base,browser:browser.version(),scope:'390×740, controlled validator-approved public import. Same-state before/after at DPR 1/2/2.625/3. Patch is rehearsed by a test-only wrapper; production GameScene is unchanged and needs owner wiring. Software browser evidence, no physical phone or untested browser claim.',sources:{GameScene:hash(gameSource),HeroSkillStatusText:hash(await readFile('src/game/HeroSkillStatusText.ts','utf8')),Viewport:hash(await readFile('src/platform/Viewport.ts','utf8'))},profiles:[]};
async function metrics(page){return page.evaluate(()=>{
  const game=window.__harness.game,scene=game.scene.getScene('game'),text=scene.heroActionButton.getData('skillStatus'),r=game.canvas.getBoundingClientRect(),camera=scene.cameras.main,b=text.getBounds(),button=scene.heroActionButton.getBounds(),ancestors=[];
  for(let p=text.parentContainer;p;p=p.parentContainer)ancestors.push({name:p.name,x:p.x,y:p.y,scaleX:p.scaleX,scaleY:p.scaleY,rotation:p.rotation});
  const point=camera.matrix.transformPoint(button.x-camera.scrollX,button.y-camera.scrollY),box={x:r.left+point.x*r.width/game.scale.width,y:r.top+point.y*r.height/game.scale.height,width:button.width*camera.zoomX*r.width/game.scale.width,height:button.height*camera.zoomY*r.height/game.scale.height};
  return {text:text.text,fontSize:text.style.fontSize,fontFamily:text.style.fontFamily,resolution:text.style.resolution,textureResolution:text.frame.source.resolution,texture:[text.canvas.width,text.canvas.height],logical:[text.width,text.height],local:{x:text.x,y:text.y,scaleX:text.scaleX,scaleY:text.scaleY,originX:text.originX,originY:text.originY},world:{x:b.x,y:b.y,width:b.width,height:b.height},ancestors,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},canvas:{css:[r.width,r.height],backing:[game.canvas.width,game.canvas.height],cssTransform:getComputedStyle(game.canvas).transform,imageRendering:getComputedStyle(game.canvas).imageRendering},scene:{scaleWidth:scene.scale.width,scaleHeight:scene.scale.height,zoom:scene.scale.zoom,cameraZoom:[camera.zoomX,camera.zoomY],roundPixels:camera.roundPixels,renderRoundPixels:camera.renderRoundPixels},renderer:{type:game.renderer.gl?'WebGL':'Canvas',antialias:game.renderer.antialias,textureScaleMode:text.frame.source.scaleMode,configResolution:game.config.resolution??null},clip:box,texturePng:text.canvas.toDataURL('image/png')};
});}
async function capture(page,row,label){
  const m=await metrics(page);await writeFile(out+'/'+row.dpr+'-'+label+'-texture.png',Buffer.from(m.texturePng.split(',')[1],'base64'));delete m.texturePng;
  const clip={x:Math.max(0,m.clip.x-3),y:Math.max(0,m.clip.y-3),width:m.clip.width+6,height:m.clip.height+6};
  await page.screenshot({path:out+'/'+row.dpr+'-'+label+'.png',clip,scale:'device'});if(row.dpr===3)await page.screenshot({path:out+'/390x740-dpr3-'+label+'.png',scale:'device'});return m;
}
try{
  for(const dpr of [1,2,2.625,3]){
    const context=await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:dpr,hasTouch:true}),page=await context.newPage(),row={dpr,errors:[]};report.profiles.push(row);page.setDefaultTimeout(20000);page.on('pageerror',error=>row.errors.push(String(error)));page.on('dialog',dialog=>dialog.accept());
    try{
      await page.goto('http://127.0.0.1:5595/?harness=1');await waitScene(page,'title');
      const fixture=await page.evaluate(()=>skillProbe.fixture());await page.locator('.run-menu-toggle').click();const section=page.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(element=>element.open))await section.locator('summary').click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'skill-status-density.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
      await waitScene(page,'game');await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&s.heroActionButton?.getData('skillStatus')?.text==='条件未满足'&&s.cardViews.every(card=>!card.dealing);});
      if(await page.locator('dialog[open]').count())await page.keyboard.press('Escape');
      const saved=await page.evaluate(()=>skillProbe.snapshot());row.before=await capture(page,row,'before');assert.equal(row.before.resolution,1);
      await page.evaluate(()=>skillProbe.enable());await page.evaluate(()=>new Promise(resolve=>window.__harness.game.events.once('postrender',resolve)));row.after=await capture(page,row,'after');
      assert.equal(row.after.resolution,dpr);assert.equal(row.after.textureResolution,dpr,'bitmap and sampling divisor must stay paired');assert.equal(row.after.fontSize,'11px');assert.deepEqual(row.after.logical,row.before.logical);assert.deepEqual(row.after.local,row.before.local);assert.deepEqual(row.after.ancestors,row.before.ancestors);assert.deepEqual(await page.evaluate(()=>skillProbe.snapshot()),saved,'raster correction never touches saves or rules');
      if(dpr===3){
        const id=saved.state.handOrder[0];await tapUI(page,'game','card/'+id,true);await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').heroActionButton.getData('skillStatus').text==='可用');row.available=await metrics(page);delete row.available.texturePng;assert.equal(row.available.resolution,3);
        const beforePlay=await page.evaluate(()=>skillProbe.snapshot());await page.evaluate(()=>{window.__statusPlay=[];const g=window.__harness.game;const collect=()=>{const s=g.scene.getScene('game');if(s.playing||s.presentation){const t=s.heroActionButton.getData('skillStatus');if(window.__statusPlay.length<6)window.__statusPlay.push({text:t.text,resolution:t.style.resolution,scaleX:t.scaleX,font:t.style.fontSize,parentScale:t.parentContainer.scaleX});}};window.__stopStatusPlay=()=>g.events.off('postrender',collect);g.events.on('postrender',collect);});
        await tapUI(page,'game','action/play',true);if(await page.locator('.hero-play-reminder[open]').count())await page.getByRole('button',{name:'继续出牌',exact:true}).tap();await page.waitForFunction(seq=>{const s=window.__harness.game.scene.getScene('game');return window.__harness.game.registry.get('runController').state.commandSeq>seq&&s.ready&&!s.playing&&!s.presentation;},beforePlay.state.commandSeq);await page.evaluate(()=>window.__stopStatusPlay());const afterPlay=await page.evaluate(()=>skillProbe.snapshot());assert.deepEqual(afterPlay.state,await page.evaluate(({state,command})=>skillProbe.expected(state,command),{state:beforePlay.state,command:afterPlay.journal.at(-1)}));row.duringPlay=await page.evaluate(()=>window.__statusPlay);assert.ok(row.duringPlay.length);assert.ok(row.duringPlay.every(t=>t.resolution===3&&t.font==='11px'));row.afterPlay=await capture(page,row,'after-play');row.savedCommandExact=true;
      }
      assert.deepEqual(row.errors,[]);row.status='PASS';
    }catch(error){row.status='FAIL';row.failure=String(error.stack);await page.screenshot({path:out+'/FAIL-dpr'+dpr+'.png',scale:'device'}).catch(()=>{});throw error;}
    finally{await context.close();}
  }
  report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error.stack);throw error;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify({status:report.status,profiles:report.profiles.map(p=>({dpr:p.dpr,before:p.before?.texture,after:p.after?.texture,status:p.status}))}));
