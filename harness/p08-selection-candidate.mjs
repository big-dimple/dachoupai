/** One early-review frame; labeled validator-approved fixture, native selection inputs. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer,build,preview} from 'vite';
import {chromium} from 'playwright';
import {chooseCharacter,tapUI,waitScene} from './ui.mjs';
const dir='shots/p08-selection-candidate';await mkdir(dir,{recursive:true});
const ssr=await createServer({server:{middlewareMode:true},optimizeDeps:{noDiscovery:true,include:[]},logLevel:'error'});let fixture,ids;
try{
 const {createRun,applyCommand}=await ssr.ssrLoadModule('/src/domain/run.ts'),{r2CreateJoker}=await ssr.ssrLoadModule('/src/domain/r2Run.ts'),{makeCheckpoint,readCheckpoint}=await ssr.ssrLoadModule('/src/application/checkpoint.ts');
 let state=createRun({seed:'p08-visible-straight',characterId:'amo',runId:'fixture/p08-visible-straight',rulesVersion:'r2'});
 state.jokers=['c08','c09','f09'].map(id=>r2CreateJoker(id,'fixture/'+id,0));
 for(const type of ['LeaveShop','EnterStage']){const r=applyCommand(state,{runId:state.runId,commandId:type,expectedSeq:state.commandSeq,action:{type}});assert.ok(r.ok);state=r.state;}
 ids=[[12,'hearts'],[11,'hearts'],[10,'hearts'],[9,'spades'],[8,'spades']].map(([rank,suit])=>state.deckInstances.find(c=>c.rank===rank&&c.suit===suit).id);
 const others=state.deckInstances.filter(c=>!ids.includes(c.id)).map(c=>c.id);state.handOrder=[...ids,...others.splice(0,state.handOrder.length-ids.length)];state.drawPile=others;
 const checkpoint=makeCheckpoint(state,[]),parsed=readCheckpoint(checkpoint);assert.ok(parsed.ok,JSON.stringify(parsed));fixture=JSON.stringify(checkpoint);
}finally{await ssr.close();}
const source=createHash('sha256');for(const p of execFileSync('rg',['--files','src'],{encoding:'utf8'}).trim().split('\n').sort())source.update(p+'\0').update(await readFile(p)).update('\0');
await build({mode:'e2e',build:{outDir:dir+'/build'},logLevel:'warn'});
const server=await preview({build:{outDir:dir+'/build'},preview:{host:'127.0.0.1',port:5264,strictPort:true},logLevel:'warn'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={source:source.digest('hex'),build:JSON.parse(await readFile(dir+'/build/build-info.json','utf8')),browser:browser.version(),viewport:{width:390,height:740},DPR:1,safeInset:{top:0,right:0,bottom:0,left:0},renderer:'Canvas',route:'FIXTURE: existing checkpoint validation + native import UI; Q♥ J♥ 10♥ 9♠ 8♠; held c08/c09/f09; not natural acquisition',checks:[],device:'NOT_RUN',independentReview:'PENDING'};
try{
 const context=await browser.newContext({viewport:report.viewport,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('dialog',d=>d.accept());
 await p.goto('http://127.0.0.1:5264/?harness=1&seed=p08-review');await chooseCharacter(p,'amo',true);await p.locator('.run-menu-toggle').tap();const section=p.getByText('进度与存档',{exact:true}).locator('..');await section.locator('summary').tap();const chooser=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).tap();await(await chooser).setFiles({name:'visible-straight-fixture.json',mimeType:'application/json',buffer:Buffer.from(fixture)});await waitScene(p,'game');await p.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&s.cardViews.every(v=>!v.dealing&&!s.tweens.isTweening(v.container));});
 const before=await p.evaluate(()=>window.__harness.game.registry.get('runController').state);
 for(const id of ids)await tapUI(p,'game','card/'+id,true);
 const o=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),all=walk(s.children.list),box=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};return{facts:s.selectionPreview(),layout:s.view.layout,title:{text:s.resultText.text,visible:s.resultText.visible,bounds:box(s.resultText)},texts:all.filter(o=>o.type==='Text'&&o.visible).map(o=>({name:o.name,text:o.text,bounds:box(o)})),forecastVisible:[s.scoreHeat,s.scoreMult,s.scoreTotal].some(o=>o.visible||o.text),previewLedger:all.some(o=>o.name==='score/sources'||o.name==='selection-joker-benefits'),flame:!!s.scoreFlame,renderer:window.__harness.game.renderer.gl?'WebGL':'Canvas'};});
 assert.equal(o.facts.type,'straight');assert.equal(o.title.text,'顺子 · 已选5张');assert.equal(o.title.visible,true);assert.equal(o.forecastVisible,false);assert.equal(o.previewLedger,false);assert.equal(o.flame,false);assert.equal(o.renderer,'Canvas');assert.equal(o.facts.scoringIds.length,5);assert.equal(o.facts.accompanyingIds.length,0);assert.equal(o.facts.ruleSources.length,2);
 assert.ok(o.texts.some(t=>t.text==='计分牌5张 · 附带0张'));
 const readable=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('game'),box=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};};return{labels:[...s.jokerViews].map(([id,v])=>({id,text:v.getData('valueLabel').text,font:v.getData('valueLabel').style.fontSize,bounds:box(v.getData('valueLabel')),slot:s.view.layout.slots[v.getData('slotIndex')]})),cards:s.previewCards.list.filter(o=>o.getData?.('cardFace')).map(c=>({text:c.list.filter(o=>o.type==='Text'&&o.visible).map(o=>o.text),rank:c.list.filter(o=>o.name==='rank-index').map(box),pips:c.list.filter(o=>o.name==='card-pip').map(box)}))};});
 for(const [id,text] of [['fixture/c08','4张顺子'],['fixture/c09','4张同花']]){const l=readable.labels.find(l=>l.id===id);assert.equal(l.text,text);assert.ok(parseFloat(l.font)>=14);assert.ok(l.bounds.width<=l.slot.width-6);}
 const overlap=(a,b)=>a.x<b.x+b.width-1e-6&&b.x<a.x+a.width-1e-6&&a.y<b.y+b.height-1e-6&&b.y<a.y+a.height-1e-6;
 for(const c of readable.cards){assert.ok(!c.text.some(t=>['成型','附带','失效','点数0'].includes(t)));for(const rank of c.rank)for(const pip of c.pips)assert.ok(!overlap(rank,pip),'preview suit art does not cover rank');}report.readability=readable;
 await tapUI(p,'game','selection/facts',true);assert.ok((await p.getByRole('dialog').innerText()).includes('同花顺仍5张'));assert.ok(!(await p.getByRole('dialog').innerText()).includes('最终向下取整'));await p.getByRole('button',{name:'关闭',exact:true}).tap();
 assert.deepEqual(await p.evaluate(()=>window.__harness.game.registry.get('runController').state),before);assert.deepEqual(errors,[]);
 await p.screenshot({path:dir+'/390-selected-straight.png'});report.measured=o;report.checks.push('visible authoritative straight title/core5/accompanying0/static rule sources','no idle forecast numbers/ranges/ledger/fire; shared rule dialog','native select/detail/cancel keeps exact save/RNG/journal/resources');report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}finally{await browser.close();await server.httpServer.close();await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,source:report.source,checks:report.checks}));}
