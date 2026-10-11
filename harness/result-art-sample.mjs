import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene} from './ui.mjs';
const root=process.env.RESULT_ART_ROOT||process.cwd(),out=process.env.RESULT_ART_OUT||'shots/result-art-sample',before=!!process.env.RESULT_ART_BEFORE;
await mkdir(out,{recursive:true});
const source=execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const ssr=await createServer({server:{middlewareMode:true},logLevel:'error'});
const {resultArtSample}=await ssr.ssrLoadModule('/harness/fixtures/result-art-sample.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
const fixtures=[false,true].map(strong=>({kind:strong?'strong':'ordinary',...resultArtSample(strong)}));
for(const f of fixtures){for(const state of [f.state,f.cleared])assert.ok(readCheckpoint(makeCheckpoint(state,[])).ok);await writeFile(out+'/'+f.kind+'-input.json',JSON.stringify(makeCheckpoint(f.state,[])));await writeFile(out+'/'+f.kind+'-result.json',JSON.stringify(makeCheckpoint(f.cleared,[])));}
await ssr.close();
const server=await createServer({root,mode:'e2e',server:{host:'0.0.0.0',port:5566,strictPort:true},logLevel:'error'});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={source,before,scope:'Controlled current identity chapter7 and public cards; real PlayHand/save. Not dot 447110 save, not natural acquisition or human/device approval.',cases:[]};
const saved=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
try{
for(const f of fixtures)for(const width of [1366,390,320]){
 const height=width===1366?768:740,p=await browser.newPage({viewport:{width,height},hasTouch:width<700,reducedMotion:width===320?'reduce':'no-preference'}),row={kind:f.kind,width,height,errors:[]};report.cases.push(row);p.setDefaultTimeout(90000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e)));
 try{
 await p.addInitScript(()=>localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed:4,reducedMotion:false})));await p.goto('http://127.0.0.1:5566/?harness=1');await waitScene(p,'title');
 await p.locator('.run-menu-toggle').click();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const event=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await event).setFiles({name:'result-input.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(before?f.cleared:f.state,[])))});
 if(!before){await waitScene(p,'game');const start=p.getByRole('button',{name:'开始出牌',exact:true});if(await start.count())await start.click();
 await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.playing&&!s.presentation&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
 for(const id of f.action.selectedIds)await tapUI(p,'game','card/'+id,width<700);
 await p.evaluate(()=>{const g=window.__harness.game;window.resultMotion={frames:0,strongFrames:0};g.events.on('poststep',()=>{if(!g.scene.isActive('intermission'))return;const s=g.scene.getScene('intermission'),m=window.resultMotion,active=s.view?.root.list.some(o=>o.name==='result/victory-motion'&&o.active);m.frames++;if(active){m.strongFrames++;m.start??=performance.now();m.last=performance.now();}else if(m.start)m.end??=performance.now();});});
 await tapUI(p,'game','action/play',width<700);}await waitScene(p,'intermission');
 await p.screenshot({path:out+'/'+f.kind+'-'+width+'-entrance.png',scale:'css',fullPage:true});
 await p.waitForTimeout(1200);
 row.motion=await p.evaluate(()=>window.resultMotion??null);if(!before){if(f.kind==='ordinary'||width===320)assert.equal(row.motion.strongFrames,0);else assert.ok(row.motion.end-row.motion.start>=700&&row.motion.end-row.motion.start<=1500,JSON.stringify(row.motion));}
 const original=await saved(p);assert.deepEqual(original.state,f.cleared);row.saved=original;
 await p.screenshot({path:out+'/'+f.kind+'-'+width+'.png',scale:'css',fullPage:true});
 row.geometry=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('intermission'),walk=a=>a.flatMap(o=>[o,...(o.list?walk(o.list):[])]);return walk(s.view.root.list).filter(o=>o.name?.startsWith('result/')||o.name?.startsWith('result-art/')).filter(o=>o.getBounds).map(o=>({name:o.name,text:o.text,bounds:o.getBounds()}));});
 for(const t of row.geometry.filter(o=>o.text)){assert.ok(t.bounds.x>=0&&t.bounds.x+t.bounds.width<=width+1&&t.bounds.y>=0&&t.bounds.y+t.bounds.height<=height+1,JSON.stringify(t));}
 await tapUI(p,'intermission','action/last-hand',width<700);await p.getByRole('button',{name:'关闭',exact:true}).waitFor();await p.screenshot({path:out+'/'+f.kind+'-'+width+'-details.png',scale:'css',fullPage:true});if(width<700)await p.getByRole('button',{name:'关闭',exact:true}).tap();else await p.getByRole('button',{name:'关闭',exact:true}).click();await p.waitForTimeout(400);assert.deepEqual(await saved(p),original);
 if(!before&&f.kind==='strong'&&width===390){
  await p.route('**/assets/**',route=>route.abort());await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('intermission');s.stopSourceArt();s.paintSourceArt=undefined;for(const key of s.textures.getTextureKeys())if(/selection-portrait|avatar-|joker|p00-paper|reward-coin/.test(key))s.textures.remove(key);s.render();});await p.waitForTimeout(150);await p.screenshot({path:out+'/strong-390-missing-art.png',scale:'css',fullPage:true});assert.deepEqual(await saved(p),original);
 }
 await tapUI(p,'intermission','action/continue-stage',width<700);await waitScene(p,'shop');row.shop=await saved(p);assert.equal(row.shop.state.phase,'shop');assert.equal(row.shop.state.gold,original.state.gold);assert.equal(row.errors.length,0);row.status='PASS';
 }catch(e){row.status='FAIL';row.error=String(e.stack);await p.screenshot({path:out+'/'+f.kind+'-'+width+'-FAIL.png',scale:'css'});throw e;}finally{await p.close();}
}
report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));await browser.close();await server.close();console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.map(r=>({kind:r.kind,width:r.width,status:r.status}))}));}
