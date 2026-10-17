import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene,openRunMenu} from './ui.mjs';
const phase=process.env.TABLE_SPACE_PHASE??'after',out='shots/mobile-table-space/'+phase,bundle='.vite/mobile-table-space-build';
await mkdir(out,{recursive:true});const ssr=await createServer({server:{middlewareMode:true},logLevel:'error'});
const {scoreSourceProcessFixture}=await ssr.ssrLoadModule('/harness/fixtures/score-source-process.ts'),{makeCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts');
const fixture=scoreSourceProcessFixture('chain');fixture.assistIds=[];fixture.state.jokers.push(r2CreateJoker('mantangcai','controlled/source-process/4',8,'polychrome',fixture.state));fixture.state.stage.initialJokerIds=fixture.state.jokers.map(j=>j.instanceId);const checkpoint=makeCheckpoint(fixture.state,[]);await ssr.close();
await build({mode:'e2e',build:{outDir:bundle},logLevel:'error'});const server=await preview({build:{outDir:bundle},preview:{host:'127.0.0.1',port:5595,strictPort:true},logLevel:'error'}),browser=await chromium.launch({headless:true,args:['--disable-gpu']});
const p=await browser.newPage({viewport:{width:390,height:740},hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'}),report={phase,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:execFileSync('git',['status','--short'],{encoding:'utf8'}),browser:browser.version(),sources:{},cases:[],errors:[]};
for(const path of ['src/game/layout.ts','src/game/GameScene.ts','src/game/HeroPortraitLayout.ts','src/game/ToolInventoryEntry.ts','src/game/StageTableArt.ts','src/game/ScoreTableLayout.ts'])report.sources[path]=createHash('sha256').update((await readFile(path,'utf8')).replaceAll('\r\n','\n')).digest('hex');
p.on('pageerror',e=>report.errors.push(String(e)));p.setDefaultTimeout(60000);
const snapshot=()=>p.evaluate(()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal};});
const overlaps=(a,b)=>a.x<b.x+b.width-1&&a.x+a.width>b.x+1&&a.y<b.y+b.height-1&&a.y+a.height>b.y+1;
function verify(row){
 const l=row.layout,controls=[...Object.values(l.buttons),...Object.values(l.tableActions),l.heroAction,row.help,l.inventoryEntry].filter(Boolean);
 for(const b of controls){assert.ok(b.width>=44&&b.height>=44,'44px control');assert.ok(b.x>=0&&b.y>=0&&b.x+b.width<=l.width+.1&&b.y+b.height<=l.height+.1,'inside viewport');}
 for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)assert.ok(!overlaps(controls[i],controls[j]),'separate action/utility hits');
 for(const card of row.cards)for(const b of controls)assert.ok(!overlaps(card.hit,b),'hand hit/control separation');
 if(l.mode==='portrait'){
  const title=row.texts.find(t=>t.name==='score/source'),caption=row.texts.find(t=>t.name==='table/played-label');if(caption){assert.ok(!overlaps(caption,row.help),'help clear of played caption');assert.ok(!overlaps(caption,title),'source title clear of played caption');}
  for(const card of row.landing){assert.ok(!overlaps(card,l.heroAction)&&!overlaps(card,row.help),'preview clear of utilities');assert.ok(card.y>=l.scoreBoard.y+60,'idle card after title');}
  if(row.hero)assert.ok(row.hero.x>=l.heroAction.x&&row.hero.x+row.hero.width<=l.heroAction.x+l.heroAction.width+.1&&row.hero.y>=l.heroAction.y&&row.hero.y+row.hero.height<=l.heroAction.y+l.heroAction.height+.1,'hero inside skill entry');
 }
}
async function capture(key){const row=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),box=o=>{const b=o.getBounds();return {x:b.x,y:b.y,width:b.width,height:b.height};},texts=[],targets=[];const walk=(list,visible=true)=>{for(const o of list){const shown=visible&&o.visible&&o.alpha>0;if(shown&&o.type==='Text'&&o.text)texts.push({name:o.name,text:o.text,...box(o)});if(shown&&o.input?.enabled&&typeof o.getBounds==='function')targets.push({name:o.name,...box(o)});if(o.list)walk(o.list,shown);}};walk(s.view.root.list);return {viewport:{width:innerWidth,height:innerHeight},layout:s.view.layout,help:s.tableHelpBox(),hero:s.heroPortrait?.active?box(s.heroPortrait):undefined,selected:[...s.selectedIds],landing:s.landingBoxes(s.selectedIds.size),cards:s.cardViews.map(v=>({id:v.card.id,visual:box(v.container),hit:box(v.hit)})),jokerHits:[...s.jokerViews.values()].map(m=>box(m.getData('hit')??m.getData('frame'))),preview:s.previewCards?.getBounds(),texts,targets};});report.cases.push({key,...row});await p.screenshot({path:out+'/'+key+'.png'});return row;}
try{
 await p.goto('http://127.0.0.1:5595/?harness=1');await waitScene(p,'title');await openRunMenu(p,true);const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();await(await chooser).setFiles({name:'table-space.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.every(v=>!v.dealing);});
 const intro=p.getByRole('button',{name:'开始本场',exact:true});if(await intro.count())await intro.click();if(await p.locator('.detail-dialog[open]').count())await p.getByRole('button',{name:'关闭',exact:true}).click();await p.waitForTimeout(350);const initial=await snapshot();await capture('390x740-idle');
 for(const id of fixture.selectedIds)await tapUI(p,'game','card/'+id,true);
 for(const [w,h,safe]of [[390,740,{}],[360,640,{}],[390,600,{}],[320,568,{}],[390,844,{top:24,bottom:34}],[844,390,{}],[1366,768,{}]]){await p.evaluate(s=>{for(const k of ['top','right','bottom','left'])document.documentElement.style.setProperty('--safe-'+k,(s[k]??0)+'px');},safe);await p.setViewportSize({width:w,height:h});await p.waitForTimeout(180);const row=await capture(w+'x'+h+'-selected');if(phase==='final')verify(row);assert.deepEqual(await snapshot(),initial,'layout/selection preserves saved state');}
 await p.setViewportSize({width:390,height:740});await p.waitForTimeout(200);
 if(phase==='final'){
  const extra=fixture.state.handOrder.find(id=>!fixture.selectedIds.includes(id));await tapUI(p,'game','card/'+extra,true);await capture('390x740-limit-message');const critical=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {visible:s.statusText.visible,title:s.resultText.visible,text:s.statusText.text,selected:s.selectedIds.size};});assert.ok(critical.visible&&!critical.title);assert.equal(critical.selected,5);report.critical=critical;
  await tapUI(p,'game','card/'+fixture.selectedIds[0],true);await p.setViewportSize({width:844,height:390});await p.waitForTimeout(180);await tapUI(p,'game','card/'+fixture.selectedIds[0],true);await p.setViewportSize({width:360,height:640});await p.waitForTimeout(180);await tapUI(p,'game','card/'+fixture.selectedIds[1],true);await p.setViewportSize({width:390,height:740});await p.waitForTimeout(180);await tapUI(p,'game','card/'+fixture.selectedIds[1],true);assert.equal(await p.evaluate(()=>window.__harness.game.scene.getScene('game').selectedIds.size),5);report.nativeSelectionAfterRotation=true;
 }
 await tapUI(p,'game','selection/source-benefits',true);await p.locator('.detail-dialog[open]').waitFor();assert.match(await p.locator('.detail-dialog[open]').innerText(),/本场与选牌帮助/);await p.keyboard.press('Escape');assert.deepEqual(await snapshot(),initial);report.helpStatePreserved=true;assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;process.exitCode=1;await p.screenshot({path:out+'/FAIL.png'});}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(report.status,report.error??'',out);await browser.close();await new Promise(r=>server.httpServer.close(r));}
