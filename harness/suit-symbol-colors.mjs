import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chooseCharacter,tapUI,waitScene} from './ui.mjs';

const root=process.env.SUIT_ROOT??process.cwd(),output=process.env.SUIT_OUTPUT??'/tmp/suit-symbol-colors',baseline=process.env.SUIT_BASELINE==='1';
await mkdir(output,{recursive:true});
const server=await createServer({root,mode:'e2e',server:{host:'127.0.0.1',port:5433,strictPort:true},logLevel:'error'});
await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--disable-gpu','--disable-software-rasterizer']});
const report={head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'Finite native PC/phone references and one naturally purchased dye. Software browser only; no physical/GPU/audio/human sign-off.',browser:await browser.version(),runs:[]};
try{
 for(const device of [{width:1366,height:768},{width:390,height:740}]){
  const touch=device.width===390,p=await browser.newPage({viewport:device,hasTouch:touch,deviceScaleFactor:1});
  const row={device,views:[]};report.runs.push(row);
  const state=()=>p.evaluate(()=>window.__harness.game.registry.get('runController').state);
  const draft=()=>p.evaluate(()=>[...window.__harness.game.scene.getScene('game').selectedIds]);
  const close=()=>p.getByRole('button',{name:'关闭',exact:true}).click();
  const inspect=async(name,shot=false)=>{
   await p.waitForTimeout(60);
   const result=await p.locator('.detail-dialog[open]').evaluate(d=>({text:d.textContent,bodyColor:getComputedStyle(d.querySelector('.dialog-body')??d.querySelector('.dialog-copy')).color,overflow:d.scrollWidth>d.clientWidth+1,symbols:[...d.querySelectorAll('.suit-symbol')].map(e=>({glyph:e.textContent,suit:e.dataset.suit,color:getComputedStyle(e).color,pointer:getComputedStyle(e).pointerEvents})),faces:[...d.querySelectorAll('.candidate-card-face')].map(e=>({red:e.dataset.red,color:getComputedStyle(e).color})),selected:d.querySelectorAll('.tool-card-option.is-selected input:checked').length,disabled:d.querySelectorAll('.tool-card-option.is-unavailable input:disabled').length}));
   row.views.push({name,...result});
   if(name==='rules'){assert.equal(result.symbols.length,0,'reference has no suit glyph examples to recolor');return;}
   if(baseline){assert.equal(result.symbols.length,0,'baseline suit references inherit ordinary ink');return;}
   assert.equal(result.overflow,false,name+' has no horizontal modal overflow');
   assert.ok(result.symbols.length>0,name+' exposes actual suit references');
   for(const s of result.symbols){assert.equal(s.pointer,'none');assert.equal(s.color,['hearts','diamonds'].includes(s.suit)?'rgb(159, 50, 40)':'rgb(38, 49, 58)');}
   assert.notEqual(result.bodyColor,'rgb(159, 50, 40)','ordinary descriptive text stays uncolored');
   if(shot)await p.screenshot({path:output+'/'+device.width+'-'+name+'.png',scale:'css'});
  };
  try{
   await p.goto('http://127.0.0.1:5433/?harness=1&seed=group-natural-17');await chooseCharacter(p,'amo',touch);
   await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
   const initial=await state(),offer=initial.shop.toolOffers.find(o=>o.definitionId==='T06');assert.ok(offer&&offer.price<=initial.gold);
   if(touch)await tapUI(p,'shop','action/shelf-tools',true);
   await tapUI(p,'shop','offer/'+offer.offerId,touch);await p.getByRole('button',{name:'确认购买',exact:true}).click();
   await p.waitForFunction(()=>window.__harness.game.registry.get('runController').state.consumables.length===1);
   await tapUI(p,'shop','action/start-stage',touch);await waitScene(p,'game');
   await p.waitForFunction(()=>{const g=window.__harness.game.scene.getScene('game');return g.ready&&!g.presentation&&g.candidates.result?.status==='ready'&&g.cardViews.every(v=>!v.dealing&&!g.tweens.isTweening(v.container));});
   if(await p.locator('.detail-dialog[open]').count()){await close();await p.waitForTimeout(360);}
   const before=await state(),selected=await draft();
   await tapUI(p,'game','selection/hand-rules',touch);await inspect('examples');
   if(baseline){row.status='EXPECTED_OMISSION';break;}
   const four=new Set(row.views.at(-1).symbols.map(s=>s.suit));assert.equal(four.size,4);
   await p.getByRole('button',{name:'完整牌型规则',exact:true}).click();await inspect('rules');
   await p.getByRole('button',{name:'看当前手牌怎么凑',exact:true}).click();await p.getByLabel('想尝试的组合',{exact:true}).selectOption('flush');
   await inspect('retention',true);
   const reference=p.locator('details[data-route-reference="true"]').first();await reference.getByRole('button',{name:'查公开牌组',exact:true}).click();
   await p.getByLabel('牌组范围',{exact:true}).selectOption('all');await inspect('deck',touch);
   await p.getByLabel('增强筛选',{exact:true}).selectOption('enhanced');
   await p.getByLabel('增强筛选',{exact:true}).selectOption('all');await inspect('deck-refreshed');
   // Preserve text and lifecycle through an actual owner close; no synthetic game mutation.
   await p.evaluate(()=>{window.__suitClosedBody=document.querySelector('.detail-dialog[open] .dialog-body');});await close();
   const stale=await p.evaluate(async()=>{const body=window.__suitClosedBody;body.textContent='♠ ♥';await new Promise(r=>setTimeout(r,40));return body.querySelectorAll('.suit-symbol').length;});assert.equal(stale,0);
   await tapUI(p,'game','action/tool-inventory',touch);await p.getByRole('button',{name:/黑桃染/}).click();await inspect('tool-unselected');
   const target=before.deckInstances.find(c=>c.suit!=='spades').id;
   const input=p.getByRole('checkbox',{name:target,exact:true});const handle=await input.elementHandle();await input.check();assert.equal(await handle.evaluate(e=>e===document.querySelector(`input[aria-label="${e.getAttribute('aria-label')}"]`)),true,'original input survives decoration');
   await inspect('tool-selected');assert.equal(row.views.at(-1).selected,1);
   for(const id of before.handOrder.filter(id=>id!==target).slice(0,2))await p.getByRole('checkbox',{name:id,exact:true}).check();
   await inspect('tool-cap-disabled',true);assert.equal(row.views.at(-1).selected,3);assert.ok(row.views.at(-1).disabled>0);
   await p.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await state(),before);assert.deepEqual(await draft(),selected);
   // Component-only probe for the native suit selector and existing dark primary style.
   // Does not claim a naturally acquired whole-deck dye or mutate any game state.
   row.componentOnly=await p.evaluate(async()=>{
    const {DetailDialog}=await import('/src/game/DetailDialog.ts'),owner=new DetailDialog(),text='♠️ ♣︎ ♥ ♦；普通正文',d=owner.open('共享花色控件',text,[{label:'♠ ♥',primary:true,run:()=>{}}]);
    const select=document.createElement('select');for(const label of ['♠ 黑桃','♣ 梅花','♥ 红桃','♦ 方块']){const option=document.createElement('option');option.textContent=label;select.append(option);}d.querySelector('.dialog-scroll').append(select);
    await new Promise(r=>setTimeout(r,40));const colors=[];
    for(let i=0;i<4;i++){select.selectedIndex=i;select.dispatchEvent(new Event('change',{bubbles:true}));colors.push(getComputedStyle(select).color);}
    const result={textPreserved:d.querySelector('.dialog-body').textContent===text,selectColors:colors,primaryColors:[...d.querySelectorAll('.dialog-primary .suit-symbol')].map(e=>getComputedStyle(e).color)};owner.close();return result;
   });
   assert.equal(row.componentOnly.textPreserved,true);assert.deepEqual(row.componentOnly.selectColors,['rgb(38, 49, 58)','rgb(38, 49, 58)','rgb(159, 50, 40)','rgb(159, 50, 40)']);assert.deepEqual(row.componentOnly.primaryColors,['rgb(255, 249, 238)','rgb(255, 237, 227)']);assert.deepEqual(await state(),before);
   row.stateUnchanged=true;row.closeDisconnectsObserver=true;row.originalInputPreserved=true;row.status='PASS';
  }finally{await p.close();}
 }
 report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);process.exitCode=1;}
finally{await browser.close();await server.close();await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,error:report.error,runs:report.runs.map(r=>({device:r.device,status:r.status,views:r.views.map(v=>v.name)}))}));}
