/** Bounded native commit/recovery and hand selection for the target-scroll repair. */
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tapUI,waitScene} from './ui.mjs';
const out=process.env.TARGET_SCROLL_SAVE_OUT||'shots/tool-target-scroll-save';
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',server:{host:'127.0.0.1',port:5582,strictPort:true},logLevel:'error'});
await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
let p;
const report={source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),productBlob:execFileSync('git',['hash-object','src/game/ConsumableDialog.ts'],{encoding:'utf8'}).trim(),scope:'Controlled legal inventory; native shop/hand selection, cancel/reopen, exact atomic use and cold recovery. No natural supply/18 runs/device acceptance.',cases:[]};
const saved=()=>p.evaluate(async()=>{const c=window.__harness.game.registry.get('runController');return {state:c.state,journal:c.journal,storage:await c.store.read()};});
const apply=(s,action,commandId)=>{const r=applyCommand(s,{runId:s.runId,expectedSeq:s.commandSeq,action,commandId});assert.ok(r.ok,r.code);return r.state;};
async function ready(scene){await waitScene(p,scene);await p.waitForFunction(k=>window.__harness.game.scene.getScene(k).ready,scene);}
async function open(scene,width){await tapUI(p,scene,'action/tool-inventory',width===390);await p.locator('.tool-inventory-card[data-item-id="owned/T08"]').click();await p.locator('.tool-detail[open]').waitFor();}
async function select(id,width){
  const input=p.locator('input[name$="/target"][value="'+id+'"]');
  await input.evaluate(e=>e.scrollIntoView({block:'center'}));
  const before=await p.locator('.tool-workspace,.tool-workspace > .dialog-content,.tool-choice-grid').evaluateAll(es=>es.map(e=>e.scrollTop));
  const box=await input.boundingBox();
  if(width===390)await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);else await p.mouse.click(box.x+box.width/2,box.y+box.height/2);
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const after=await p.locator('.tool-workspace,.tool-workspace > .dialog-content,.tool-choice-grid').evaluateAll(es=>es.map(e=>e.scrollTop));
  assert.deepEqual(after,before);
  assert.equal(await input.isChecked(),true);
  assert.equal(await p.evaluate(()=>document.activeElement.value),id);
  return {id,before,after};
}
try{
  for(const width of [390,1366])for(const scene of ['shop','game']){
    p=await browser.newPage({viewport:{width,height:width===390?740:768},hasTouch:width===390,deviceScaleFactor:1});
    p.on('dialog',d=>d.accept());
    await p.goto('http://127.0.0.1:5582/?harness=1');await waitScene(p,'title');
    let s=createRun({seed:'group-natural-17',runId:'scroll-save/'+width+'/'+scene,characterId:'amo',rulesVersion:'r2',r2Identity:newRunIdentity('amo','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
    s=apply(s,{type:'RerollShop'},'fixture/setup');s.gold=30;s.consumables=[{instanceId:'owned/T08',definitionId:'T08'}];
    if(scene==='game'){s=apply(s,{type:'LeaveShop'},'fixture/leave');s=apply(s,{type:'EnterStage'},'fixture/enter');}
    const cp=makeCheckpoint(s,[]);assert.ok(readCheckpoint(cp).ok);
    await p.locator('.run-menu-toggle').click();
    const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await section.locator('summary').click();
    const event=p.waitForEvent('filechooser');await p.getByRole('button',{name:'导入本局',exact:true}).click();
    await(await event).setFiles({name:'controlled-scroll-save.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(cp))});await ready(scene);
    const before=await saved(),row={width,scene,before,operations:[]};report.cases.push(row);
    await open(scene,width);
    const ids=await p.locator('input[name$="/target"]').evaluateAll(es=>es.map(e=>e.value));
    const chosen=scene==='shop'?ids.slice(30,32):ids.filter(id=>s.deckInstances.find(c=>c.id===id).rank<14).slice(-2);
    for(const id of chosen)row.operations.push(await select(id,width));
    await p.screenshot({path:out+'/'+width+'-'+scene+'-selected.png',scale:'css'});assert.deepEqual(await saved(),before);
    await p.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await saved(),before);
    await open(scene,width);assert.equal(await p.locator('input[name$="/target"]:checked').count(),0);
    for(const id of chosen)await select(id,width);
    const confirm=p.getByRole('button',{name:'确认使用',exact:true});assert.equal(await confirm.isEnabled(),true);
    await confirm.click();await p.waitForFunction(seq=>window.__harness.game.registry.get('runController').state.commandSeq===seq+1,before.state.commandSeq);
    await p.locator('.tool-saved-result[open]').waitFor();
    const after=await saved(),command=after.journal.at(-1),targetIds=s.deckInstances.filter(c=>chosen.includes(c.id)).map(c=>c.id);
    if(scene==='game')targetIds.splice(0,targetIds.length,...s.handOrder.filter(id=>chosen.includes(id)));
    assert.deepEqual(command.action,{type:'UseConsumable',instanceId:'owned/T08',targetIds});
    assert.deepEqual(after.state,apply(before.state,command.action,command.commandId));
    assert.deepEqual(after.journal,[...before.journal,command]);assert.deepEqual(after.storage.current,makeCheckpoint(after.state,after.journal));assert.deepEqual(after.storage.previous,before.storage.current);
    await p.waitForFunction(()=>document.querySelector('.tool-saved-result')?.dataset.animationState==='settled');
    await p.screenshot({path:out+'/'+width+'-'+scene+'-saved.png',scale:'css'});
    row.after=after;await p.reload();await waitScene(p,'title');assert.deepEqual(await saved(),after);row.coldRecovery=true;row.status='PASS';await p.close();
  }
  report.status='PASS';
}catch(e){report.status='FAIL';report.error=e.stack;await p?.screenshot({path:out+'/FAIL.png'}).catch(()=>{});process.exitCode=1;
}finally{await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,cases:report.cases.map(r=>({width:r.width,scene:r.scene,status:r.status}))}));await browser.close();await server.close();}
