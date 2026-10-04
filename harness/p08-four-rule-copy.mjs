/** Bounded empty/selected guidance check: actual CSS hit boxes and native touch only. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {waitScene,tapUI} from './ui.mjs';
const dir='shots/p08-four-rule-copy';await mkdir(dir,{recursive:true});let file,ids;
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});
try{const{createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{r2DisabledCards}=await ssr.ssrLoadModule('/src/domain/r2Chapter.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');let s=createRun({seed:'p08-boundary',runId:'fixture/p08-boundary',characterId:'amo',rulesVersion:'r2',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});s.jokers=[r2CreateJoker('c08','four-straight',0),r2CreateJoker('c09','four-flush',0)];for(const type of['LeaveShop','EnterStage']){if(type==='EnterStage')Object.assign(s,{stageIndex:2,boss:{definitionId:'B03',disabledSuit:'hearts'},seenBossIds:['B03']});const r=applyCommand(s,{runId:s.runId,commandId:type,expectedSeq:s.commandSeq,action:{type}});assert.ok(r.ok);s=r.state;}ids=[2,5,8,11].map(rank=>s.deckInstances.find(c=>c.rank===rank&&c.suit==='hearts').id);const other=s.deckInstances.filter(c=>!ids.includes(c.id)).map(c=>c.id);s.handOrder=[...ids,...other.splice(0,5)];s.drawPile=other;s.stage.initialHandLimit=9;s.stage.handLimit=9;s.stage.disabledIds=r2DisabledCards(s.boss,2,s.handOrder.map(id=>s.deckInstances.find(c=>c.id===id)));const cp=makeCheckpoint(s,[]);assert.equal(readCheckpoint(cp).ok,true);file=JSON.stringify(cp);}finally{await ssr.close();}

await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'error'});
const server=await preview({build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5274,strictPort:true},logLevel:'error'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={browser:browser.version(),renderer:'Canvas',build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),fixture:'Checkpoint validated by readCheckpoint: owned c08+c09; nine cards, four selected hearts form ordinary flush with B03-disabled core. Not natural acquisition.',runs:[],failures:[]};
const overlaps=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height;
async function inspect(page){return page.evaluate(()=>{
 const s=window.__harness.game.scene.getScene('game'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),all=walk(s.children.list),canvas=s.game.canvas.getBoundingClientRect(),g=s.game;
 const rect=b=>({x:b.x,y:b.y,width:b.width,height:b.height});
 const css=b=>{const a=s.cameras.main.matrix.transformPoint(b.x,b.y),z=s.cameras.main.matrix.transformPoint(b.right,b.bottom);return{x:canvas.left+a.x*canvas.width/g.scale.width,y:canvas.top+a.y*canvas.height/g.scale.height,width:(z.x-a.x)*canvas.width/g.scale.width,height:(z.y-a.y)*canvas.height/g.scale.height};};
 const score=s.view.layout.scoreBoard;
 return {score,selected:[...s.selectedIds],facts:s.selectionPreview(),availableWidth:score.width-20-(s.selectionQuickInScore(score)?104:0),
  texts:all.filter(o=>o.type==='Text'&&o.visible&&(o===s.resultText||['selection/fact-line','selection/rules-entry','selection/quick-label'].includes(o.name))).map(o=>({name:o.name,text:o.text,fullText:o.getData('fullText')??o.text,font:o.style.fontSize,resolution:o.style.resolution,bounds:rect(o.getBounds())})),
  entries:all.filter(o=>['selection/switch-type','selection/hand-rules'].includes(o.name)).map(o=>({name:o.name,bounds:rect(o.getBounds()),CSSBounds:css(o.getBounds()),label:o.getData('label').text,enabled:!!o.input?.enabled})),
  actions:[s.playButton,s.discardButton].map(o=>({name:o.name,bounds:rect(o.getBounds())})),
  toolbar:[...document.querySelectorAll('.run-menu-toggle,.run-fullscreen-toggle')].filter(e=>!e.hidden).map(e=>rect(e.getBoundingClientRect()))};
 });}
async function nativeContract(p){
 const before=await p.evaluate(()=>window.__harness.game.registry.get('runController').state),selected=await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]);
 await tapUI(p,'game','selection/switch-type',true);
 assert.equal(await p.getByRole('dialog').count(),0,'switch chooses immediately without a dialog');
 assert.notDeepEqual(await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),selected);
 assert.deepEqual(await p.evaluate(()=>window.__harness.game.registry.get('runController').state),before,'switch never submits, discards, saves, consumes resources or RNG');
 await tapUI(p,'game','selection/facts',true);await p.getByRole('button',{name:'撤销换组',exact:true}).tap();
 assert.deepEqual(await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),selected);
 await tapUI(p,'game','selection/hand-rules',true);await p.getByRole('dialog',{name:'牌型规则',exact:true}).waitFor();
 assert.match(await p.getByRole('dialog').innerText(),/同花顺仍5张/);
 await p.getByRole('button',{name:'关闭',exact:true}).tap();
 assert.deepEqual(await p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]),selected);
 assert.deepEqual(await p.evaluate(()=>window.__harness.game.registry.get('runController').state),before,'rules close preserves full run and selection');
}
try{
 for(const bottom of[0,12,34]){
  const context=await browser.newContext({viewport:{width:844,height:300},hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await context.newPage();
  await p.addInitScript(bottom=>document.addEventListener('DOMContentLoaded',()=>{document.documentElement.style.setProperty('--safe-top','12px');document.documentElement.style.setProperty('--safe-bottom',bottom+'px');}),bottom);
  p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:5274/?harness=1');await waitScene(p,'title');
  await p.locator('.run-menu-toggle').tap();const sec=p.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').tap();
  const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(file)});
  await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.candidates.result?.status==='ready'&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
  for(const state of['empty','selected']){
   if(state==='selected')for(const id of ids)await tapUI(p,'game','card/'+id,true);
   const data=await inspect(p),failures=[];
   const check=(ok,message)=>{if(!ok)failures.push(message);};
   const rule=data.texts.find(t=>t.name==='selection/fact-line'&&t.fullText.includes('同花顺'));
   check(!!rule,'rule is visible');
   if(rule){check(rule.text==='顺子/同花4张；同花顺5张','complete shared short phrase');check(rule.text===rule.fullText&&!rule.text.includes('…'),'no hidden exception or ellipsis');check(rule.bounds.width<=data.availableWidth,'actual width fits without shrinking');check(parseFloat(rule.font)>=14&&rule.resolution>=1.5,'font/resolution maintained');}
   check(data.entries.length===2,'two visible quick actions');
   for(const e of data.entries){check(e.CSSBounds.width>=44&&e.CSSBounds.height>=44,'real CSS hit>=44');check(e.label.replaceAll('\n','')===(e.name.endsWith('switch-type')?'切换牌型':'牌型规则'),'explicit visible action label');for(const a of data.actions)check(!overlaps(e.bounds,a.bounds),'quick action avoids play/discard');for(const t of data.toolbar)check(!overlaps(e.CSSBounds,t),'quick action avoids DOM toolbar');if(rule)check(!overlaps(rule.bounds,e.bounds),'rule avoids quick action');}
   if(rule)for(const a of data.actions)check(!overlaps(rule.bounds,a.bounds),'rule avoids play/discard');
   for(let i=0;i<data.texts.length;i++)for(let j=i+1;j<data.texts.length;j++)check(!overlaps(data.texts[i].bounds,data.texts[j].bounds),'visible text nonintersection');
   await nativeContract(p);
   report.runs.push({viewport:{width:844,height:300},DPR:1,safeInset:{top:12,bottom},state,...data,failures,nativeInput:'PASS: immediate selection only; undo; rules open/close; full run/selection invariants'});
   report.failures.push(...failures.map(f=>({bottom,state,failure:f})));
  }
  await context.close();
 }
 report.status=report.failures.length?'FAIL':'PASS';if(report.failures.length)process.exitCode=1;
}finally{
 await browser.close();await server.httpServer.close();await writeFile(dir+'/'+(process.env.EVIDENCE_PHASE??'final')+'-report.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,failures:report.failures,runs:report.runs.map(r=>({safeInset:r.safeInset,state:r.state,score:r.score,rule:r.texts.find(t=>t.fullText.includes('同花顺')),availableWidth:r.availableWidth}))},null,2));
}
