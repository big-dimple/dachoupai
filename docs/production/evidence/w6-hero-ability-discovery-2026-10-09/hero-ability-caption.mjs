import assert from 'node:assert/strict';
import {createServer} from '/workspace/dachoupai/node_modules/vite/dist/node/index.js';
import {chromium} from '/workspace/dachoupai/node_modules/playwright/index.mjs';
import {waitScene,tapUI,openSelector,tapMenuAction} from '/workspace/dachoupai/harness/ui.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const root='/workspace/dachoupai',out='/tmp/hero-ability-native';await mkdir(out,{recursive:true});
const vite=await createServer({root,mode:'e2e',server:{host:'127.0.0.1',port:5513,strictPort:true},logLevel:'error'});await vite.listen();
const {createRun,applyCommand}=await vite.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await vite.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await vite.ssrLoadModule('/src/application/checkpoint.ts');
const {touyeChoice}=await vite.ssrLoadModule('/src/game/TouyeWagerCopy.ts');
const report={source:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'Two authored legal public fixtures: PC Touye pre-discard commitment then actual losing hand; 390 Laohuan fixed refill then manual retention. No ordinary88 replay, seed search, whole journeys, GPU/FPS or human acceptance.',cases:[],errors:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer']});let page;
const state=()=>page.evaluate(()=>window.__harness.game.registry.get('runController').state);
const observation=()=>page.evaluate(()=>{const s=window.__harness.game.scene.getScene('game');return {selected:[...s.selectedIds],role:s.roleText.text,available:s.roleText.getData('abilityAvailable'),status:s.statusText.text,play:s.playButton.getData('label').text,phase:s.run.phase,ready:s.ready,roleBounds:s.roleText.getBounds(),goldBounds:s.goldText.getBounds()};});
const ready=()=>page.waitForFunction(()=>{const s=window.__harness.game.scene.getScene('game');return s.ready&&!s.presentation&&s.cardViews.length===8&&s.cardViews.every(c=>!c.back?.visible&&c.container.alpha===1);});
function setup(id){let s=createRun({seed:'touye-public-20261008',runId:'hero-native/'+id,rulesVersion:'r2',characterId:id,r2Identity:newRunIdentity(id,'group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});for(const action of [{type:'LeaveShop'},{type:'EnterStage'}]){const r=applyCommand(s,{runId:s.runId,commandId:'setup/'+s.commandSeq,expectedSeq:s.commandSeq,action});assert.ok(r.ok);s=r.state;}return structuredClone(s);}
function arrange(s,hand,incoming=[]){s.handOrder=hand;s.drawPile=[...s.deckInstances.map(c=>c.id).filter(id=>!hand.includes(id)&&!incoming.includes(id)),...incoming.toReversed()];return makeCheckpoint(s,[]);}
function canonical(before,after,action){const c={runId:before.runId,commandId:after.receipts.at(-1).commandId,expectedSeq:before.commandSeq,action};const r=applyCommand(before,c);assert.ok(r.ok);assert.deepEqual(after,r.state);assert.ok(readCheckpoint(makeCheckpoint(after,[c])).ok);return c;}
async function importCP(cp){await page.reload();await waitScene(page,'title');await page.locator('.run-menu-toggle').click();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const fc=page.waitForEvent('filechooser');await page.getByRole('button',{name:'导入本局',exact:true}).click();await(await fc).setFiles({name:'public-'+cp.state.characterId+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await waitScene(page,'game');await ready();assert.deepEqual(await state(),cp.state);}
async function exportCP(label){await page.locator('.run-menu-toggle').click();const sec=page.getByText('进度与存档',{exact:true}).locator('..');if(!await sec.evaluate(e=>e.open))await sec.locator('summary').click();const dl=page.waitForEvent('download');await page.getByRole('button',{name:'导出本局',exact:true}).click();await(await dl).saveAs(out+'/'+label+'.json');const cp=JSON.parse(await readFile(out+'/'+label+'.json'));assert.ok(readCheckpoint(cp).ok);await page.getByRole('button',{name:'关闭菜单',exact:true}).click();return cp;}

report.scope='Only final caption layout correction on the original public inputs. No ability dispatch or Play repeated.';
const original=JSON.parse(await readFile(out+'/report.json'));
try{
 for(const row of original.cases){const touch=row.id==='laohuan';page=await browser.newPage({viewport:{width:row.width,height:row.height},hasTouch:touch,reducedMotion:touch?'reduce':'no-preference'});page.setDefaultTimeout(20000);await page.goto('http://127.0.0.1:5513/?harness=1');await importCP(row.input);const current={id:row.id,input:row.input,layouts:[]};report.cases.push(current);
  for(const [width,height] of touch?[[390,740],[320,740],[740,390]]:[[1366,768]]){await page.setViewportSize({width,height});await page.waitForFunction(width=>window.__harness.game.scene.getScene('game').view.layout.width===width,width);
   for(const selection of [false,true]){const ids=touch?['spades-2']:['clubs-12','hearts-13','diamonds-11','diamonds-5'];const obs=await observation();if(!!obs.selected.length!==selection)for(const id of ids)await tapUI(page,'game','card/'+id,touch);const o=await observation();assert.equal(o.available,selection);assert.deepEqual(await state(),row.input.state);if(width<height)assert.ok(o.roleBounds.x+o.roleBounds.width<=o.goldBounds.x-2,JSON.stringify(o));current.layouts.push({width,height,selection,observation:o});await page.screenshot({path:out+'/final-'+row.id+'-'+width+'-'+selection+'.png'});}
  }await page.close();page=undefined;
 }report.status='PASS';console.log(JSON.stringify({status:'PASS',source:report.source,scope:report.scope}));
}catch(e){report.status='FAIL';report.error=String(e);report.stack=e.stack;await page?.screenshot({path:out+'/caption-final-FAIL.png'}).catch(()=>{});console.log(report.error);process.exitCode=1;}finally{await writeFile(out+'/caption-final-report.json',JSON.stringify(report,null,2)+'\n');await browser.close();await vite.close();}
