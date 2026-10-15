import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene,openSelector,confirmHeroRoute} from './ui.mjs';
const out=process.env.HERO_COPY_OUT??'docs/production/evidence/hero-text-adoption-2026-10-15/browser';await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:'/tmp/hero-text-adoption-vite',server:{host:'127.0.0.1',port:5595,strictPort:true},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts'),{newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts'),{makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts'),{heroTextSpec}=await server.ssrLoadModule('/src/game/HeroText.ts'),{characterForRun}=await server.ssrLoadModule('/src/game/CharacterRunCopy.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const git=(...a)=>execFileSync('git',a,{encoding:'utf8'}).trim(),report={head:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD:src'),scope:'Software Chromium, normal motion, six modern hero copies in three sizes and read-only legacy ability views; not human comprehension or physical-device acceptance.',cases:[]};
const ids=['amo','touye','laohuan','erxiang','azao','xiemu'];
const snap=p=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return c?{state:c.state,journal:c.journal,storage:await c.store.read()}:null;});
const send=(s,action)=>{const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/'+s.commandSeq,expectedSeq:s.commandSeq,action});assert.ok(r.ok,r.code);return r.state;};
function fixture(id,legacy=false){return send(send(createRun({rulesVersion:'r2',seed:'hero-text/'+id,runId:'copy/'+id+(legacy?'/legacy':''),characterId:id,...(legacy?{}:{r2Identity:newRunIdentity(id),openingRoute:'group'})}),{type:'LeaveShop'}),{type:'EnterStage'});}
async function imp(p,s){assert.ok(readCheckpoint(makeCheckpoint(s,[])).ok);await p.locator('.run-menu-toggle').click();const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();const fc=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'hero-copy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(makeCheckpoint(s,[])))});await waitScene(p,'game');await p.waitForFunction(id=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.presentation&&!s.playing&&window.__harness.game.registry.get('runController').state.runId===id&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));},s.runId);assert.deepEqual((await snap(p)).state,s);}
async function photo(p,name){await p.screenshot({path:out+'/'+name+'.png',scale:'device'});}
async function inspect(p,id,key,touch,label){
 const expected=heroTextSpec(id),before=await snap(p);await tapUI(p,key,label,touch);const d=p.locator('.hero-explanation[open]');await d.waitFor();await d.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode().catch(()=>{}))));
 assert.equal(await d.locator('h2').innerText(),expected.name+' · '+expected.skillName);assert.equal(await d.locator('.hero-story').evaluate(e=>e.open),false);assert.equal(await d.locator('.dialog-copy > .card-rules').evaluate(e=>e.open),false);
 const first=await d.innerText();assert.ok(!first.includes(expected.skillSummary));assert.ok(!first.includes(expected.story));assert.ok(first.includes('做什么'));assert.ok(first.includes('现在'));
 const measure=await d.evaluate(d=>{const scroll=d.querySelector('.dialog-scroll'),effect=[...d.querySelectorAll('.hero-fact')].find(e=>e.innerText.startsWith('做什么')),tags=d.querySelector('.hero-skill-tags'),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};return {dialog:rect(d),scroll:rect(scroll),effect:rect(effect),tags:rect(tags),width:scroll.clientWidth,scrollWidth:scroll.scrollWidth,font:getComputedStyle(effect).fontSize,close:rect(d.querySelector('.dialog-close'))};});
 assert.ok(measure.scrollWidth<=measure.width+1);assert.ok(measure.tags.y>=measure.scroll.y-1);assert.ok(measure.effect.bottom<=measure.scroll.bottom+1,'short effect visible on first layer');assert.ok(measure.close.height>=44);assert.ok(measure.dialog.x>=0);assert.ok(measure.dialog.x+measure.dialog.width<=p.viewportSize().width+1);
 return {d,before,first,measure};
}
try{
 for(const viewport of [{width:1366,height:900},{width:390,height:844},{width:320,height:568}]){
  const touch=viewport.width<700,context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:touch?2:1,reducedMotion:'no-preference'}),p=await context.newPage(),row={viewport,heroes:[],live:[],legacy:[],errors:[]};report.cases.push(row);p.setDefaultTimeout(20000);p.on('dialog',d=>d.accept());p.on('pageerror',e=>row.errors.push(String(e)));
  try{
   await p.goto('http://127.0.0.1:5595/?harness=1');await waitScene(p,'title');await openSelector(p,touch);
   for(const id of ids){const expected=heroTextSpec(id);await tapUI(p,'character-select','character/'+id,touch);
    const canvas=await p.evaluate(()=>{const out=[];const walk=list=>{for(const o of list){if(o.visible!==false&&o.alpha!==0&&o.text)out.push({text:o.text,name:o.name,bounds:o.getBounds(),scaleX:o.scaleX});if(o.list)walk(o.list);}};walk(window.__harness.game.scene.getScene('character-select').children.list);return out;});
    assert.equal(canvas.find(t=>t.name==='opening/taunt').text.replaceAll('\n',''),expected.motto);for(const t of canvas.filter(t=>['opening/name','opening/taunt','opening/skill-tag'].includes(t.name))){assert.ok(t.bounds.x>=0&&t.bounds.x+t.bounds.width<=viewport.width+.1);assert.equal(t.scaleX,1);}
    const {d,before,first,measure}=await inspect(p,id,'character-select',touch,'opening/hero-details');await photo(p,viewport.width+'-'+id+'-first');
    await d.locator('.hero-story > summary').click();assert.ok((await d.innerText()).includes(expected.story));assert.ok((await d.innerText()).includes(expected.motto));await d.locator('.hero-story > summary').click();
    await d.locator('.dialog-copy > .card-rules > summary').click();assert.ok((await d.innerText()).includes(expected.skillSummary));if(id==='azao'){assert.ok((await d.innerText()).includes('同牌型未释放则清空'));assert.ok((await d.innerText()).includes('也可释放'));}if(id==='laohuan'){await photo(p,viewport.width+'-'+id+'-rules');}
    await d.locator('.hero-story > summary').click();if(id==='laohuan')await photo(p,viewport.width+'-'+id+'-story');await d.getByRole('button',{name:'返回',exact:true}).click();assert.deepEqual(await snap(p),before);row.heroes.push({id,first,measure,storyAndRulesExpandable:true,readOnly:true});
   }
   await photo(p,viewport.width+'-selection');await confirmHeroRoute(p,touch);await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
   for(const id of ids){await imp(p,fixture(id));const {d,before,first,measure}=await inspect(p,id,'game',touch,'hero/skill-entry');await d.getByRole('button',{name:'查看本场技能操作',exact:true}).click();const op=p.locator('.hero-skill-dialog[open]');await op.waitFor();assert.equal(await op.locator('h2').innerText(),heroTextSpec(id).name+' · '+heroTextSpec(id).skillName);assert.ok(await op.locator('.hero-skill-tags').count());if(id==='laohuan'||id==='azao')await photo(p,viewport.width+'-'+id+'-operation');await op.locator('.dialog-close').click();assert.deepEqual(await snap(p),before);row.live.push({id,first,measure,readOnly:true});}
   for(const id of ['touye','laohuan']){const s=fixture(id,true),beforeCopy=characterForRun(s);await imp(p,s);const before=await snap(p);await tapUI(p,'game','hero/skill-entry',touch);const d=p.locator('.hero-explanation[open]');await d.waitFor();assert.equal(await d.locator('h2').innerText(),beforeCopy.name+' · '+beforeCopy.passiveName);assert.equal(await d.locator('.hero-skill-tags').count(),0);assert.equal(await d.locator('.hero-example').count(),0);await d.locator('.dialog-copy > .card-rules > summary').click();assert.ok((await d.innerText()).includes(beforeCopy.passiveDescription));if(id==='touye')await photo(p,viewport.width+'-legacy-wager');await d.locator('.dialog-close').click();assert.deepEqual(await snap(p),before);row.legacy.push({id,passiveName:beforeCopy.passiveName,rules:beforeCopy.passiveDescription,readOnly:true});}
   assert.deepEqual(row.errors,[]);row.status='PASS';console.log('PASS',viewport.width);
  }catch(e){row.status='FAIL';row.error=String(e.stack);await photo(p,viewport.width+'-FAIL');throw e;}finally{await context.close();}
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack);process.exitCode=1;}
finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(report.status,report.error??'');await browser.close();await server.close();}
