/** Controlled missing-avatar/card-art fixture. Native import/retry/cancel; no performance or deployment claim. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from './ui.mjs';
const dir='shots/p08-fallback-theme';await mkdir(dir,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});let fixture;
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 let state=createRun({seed:'p08-fallback-theme',runId:'fixture/p08-fallback-theme',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
 state.jokers=['c09','d03','b11'].map(id=>r2CreateJoker(id,'fallback/'+id,0));
 for(const type of ['LeaveShop','EnterStage']){const r=applyCommand(state,{runId:state.runId,commandId:type,expectedSeq:state.commandSeq,action:{type}});assert.ok(r.ok);state=r.state;}
 const cp=makeCheckpoint(state,[]);assert.ok(readCheckpoint(cp).ok);fixture=JSON.stringify(cp);
}finally{await ssr.close();}
await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({build:{outDir:dir+'/build'},preview:{port:5297,strictPort:true,host:'127.0.0.1'},logLevel:'error'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']}),context=await browser.newContext({viewport:{width:390,height:740},deviceScaleFactor:1,hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];let cardMissing=true;
page.on('pageerror',e=>errors.push(String(e)));page.on('dialog',d=>d.accept());
await page.route('**/characters/amo.avatar.webp',r=>r.fulfill({status:404,body:'controlled missing avatar'}));
for(const id of ['c09','d03'])await page.route('**/cards/'+id+'.*.webp',r=>cardMissing?r.fulfill({status:404,body:'controlled missing card art'}):r.continue());
const report={taskId:'P08',testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseCommit:'67141b5d380ce90e6bbc1e1526900e8af967c9ca',build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),fixture:'Validator-approved native checkpoint import: amo, three legal owned slots, ordinary eight-card entry. Forced avatar-amo and c09/d03 thumbnail+HD404. Fault fallback inspection; not natural acquisition or whole-art acceptance.',renderer:'Chromium software Canvas',viewport:{width:390,height:740},DPR:1,physicalDevice:'OnePlus/GPU/audio NOT_RUN',checks:[],errors};
try{
 await page.goto('http://127.0.0.1:5297/?harness=1');await waitScene(page,'title');await page.locator('.run-menu-toggle').tap();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'fallback-theme-fixture.json',mimeType:'application/json',buffer:Buffer.from(fixture)});await waitScene(page,'game');
 await page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.load.isLoading()&&s.textures.exists('p08-joker-b11')&&s.cardViews.length===s.run.handOrder.length&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
 assert.equal(await page.evaluate(()=>window.__harness.game.renderer.type),1);
 const before=await page.evaluate(()=>window.__harness.game.registry.get('runController').state);
 report.observed=await page.evaluate(()=>{
  const s=window.__harness.game.scene.getScene('game'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),all=walk(s.view.root.list),letter=all.find(o=>o.type==='Text'&&o.text==='阿'),tile=all.find(o=>o.type==='Rectangle'&&o.width===30&&o.height===30&&o.fillAlpha===1),rect=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};
  return {avatarCached:s.textures.exists('avatar-amo'),avatar:{text:letter.text,color:letter.style.color,fontSize:letter.style.fontSize,fontFamily:letter.style.fontFamily,letter:rect(letter),tile:rect(tile),fill:tile.fillColor,stroke:tile.strokeColor},cards:['c09','d03'].map(id=>{const view=s.jokerViews.get('fallback/'+id),objects=walk(view.list);return{id,cached:s.textures.exists('p08-joker-'+id),graphics:objects.filter(o=>o.type==='Graphics').map(o=>({commands:o.commandBuffer.length,bounds:rect(view)})),name:view.getData('nameLabel').text,value:view.getData('valueLabel').text};})};
 });
 assert.equal(report.observed.avatarCached,false);assert.equal(report.observed.avatar.color.toLowerCase(),'#26313a');assert.equal(report.observed.avatar.fill,0xf3eadb);assert.equal(report.observed.avatar.stroke,0x3f606b);
 const a=report.observed.avatar;assert.ok(a.letter.x>=a.tile.x&&a.letter.y>=a.tile.y&&a.letter.x+a.letter.width<=a.tile.x+a.tile.width&&a.letter.y+a.letter.height<=a.tile.y+a.tile.height,'22px missing-avatar initial fits the real30px HUD tile');
 for(const c of report.observed.cards){assert.equal(c.cached,false);assert.ok(c.graphics.some(g=>g.commands>20),'missing art retains a visible drawn mechanism');assert.ok(c.name&&c.value);}
 await page.screenshot({path:dir+'/390-fallback-fixture.png',scale:'css'});
 await tapUI(page,'game','joker/fallback/c09',true);await page.getByRole('button',{name:'重试卡面',exact:true}).waitFor();await page.waitForFunction(()=>{const i=document.querySelector('.detail-dialog[open] .dialog-card-image');return i?.complete&&i.naturalWidth===240&&i.alt.includes('机制示意');});
 assert.ok(await page.locator('.detail-dialog[open] .dialog-art-load-status').isVisible(),'failure status is visible');const frame=page.locator('.detail-dialog[open] .dialog-card-art .dialog-art-visual'),bounds=await frame.boundingBox();cardMissing=false;
 await page.getByRole('button',{name:'重试卡面',exact:true}).tap();await page.waitForFunction(()=>window.__harness.game.scene.getScene('game').textures.exists('p08-joker-c09'));await page.getByRole('button',{name:'重试卡面',exact:true}).waitFor({state:'hidden'});assert.deepEqual(await frame.boundingBox(),bounds,'retry preserves the fixed card frame');
 await page.getByRole('button',{name:'关闭',exact:true}).tap();assert.deepEqual(await page.evaluate(()=>window.__harness.game.registry.get('runController').state),before);assert.deepEqual(errors,[]);
 report.checks.push('actual30px missing avatar: opaque approved paper + readable ink initial + jade border, real text bounds fit','c09 four-flush and d03 hourglass mechanisms remain drawn in existing small owned slots with names/state','missing card has visible failure status and usable native retry; correct own thumbnail recovered; fixed frame unchanged','native close preserves full run/resources/RNG/save; zero page errors');report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);report.failureContext=await page.evaluate(()=>{const s=window.__harness?.game.scene.getScene('game');return{active:s?.scene.isActive(),ready:s?.ready,loading:s?.load.isLoading(),cards:s?.cardViews.length,held:s?.run.handOrder.length,loadedB11:s?.textures.exists('p08-joker-b11')};}).catch(()=>null);console.error(e);process.exitCode=1;}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}
