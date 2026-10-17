import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {tapUI,waitScene} from '../../../../harness/ui.mjs';

const before=process.argv.includes('--before'),phase=before?'before':'after',out='docs/production/evidence/shop-owned-caption-2026-10-17';
await mkdir(out,{recursive:true});
const server=await createServer({mode:'e2e',cacheDir:'.vite/owned-caption-check',server:{host:'127.0.0.1',port:5631,strictPort:true,hmr:false},logLevel:'error'});await server.listen();
const {createRun,applyCommand}=await server.ssrLoadModule('/src/domain/run.ts');
const {r2CreateJoker}=await server.ssrLoadModule('/src/domain/r2Run.ts');
const {r2JokerDefinitionsFor}=await server.ssrLoadModule('/src/domain/r2ContentProfiles.ts');
const {jokerApplicableRoutes}=await server.ssrLoadModule('/src/game/ShopOfferGuidance.ts');
const {JOKER_RARITY}=await server.ssrLoadModule('/src/game/JokerRarity.ts');
const {jokerArtKey}=await server.ssrLoadModule('/src/game/jokerArt.ts');
const {newRunIdentity}=await server.ssrLoadModule('/src/game/RunLaunch.ts');
const {makeCheckpoint,readCheckpoint}=await server.ssrLoadModule('/src/application/checkpoint.ts');
let run=createRun({rulesVersion:'r2',runId:'controlled/shop-owned-five',seed:'shop-owned-five',characterId:'touye',r2Identity:newRunIdentity('touye','group'),openingRoute:'group',modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
const result=applyCommand(run,{runId:run.runId,commandId:run.runId+'/prepare',expectedSeq:run.commandSeq,action:{type:'RerollShop'}});assert.ok(result.ok);run=result.state;
const candidates=r2JokerDefinitionsFor(run).filter(d=>jokerApplicableRoutes(run,r2CreateJoker(d.id,'probe/'+d.id,4,'none',run)).length===3);assert.ok(candidates.length>=5);
const chosen=['common','uncommon','rare'].map(rarity=>candidates.find(d=>d.rarity===rarity)).filter(Boolean);for(const d of candidates)if(chosen.length<5&&!chosen.includes(d))chosen.push(d);
run.jokers=chosen.map((d,i)=>r2CreateJoker(d.id,'controlled/owned/'+i,4,['none','foil','holographic','polychrome','none'][i],run));run.gold=30;
const checkpoint=makeCheckpoint(run,[]);assert.equal(readCheckpoint(checkpoint).ok,true);
const expected=chosen.map((d,i)=>({id:run.jokers[i].instanceId,name:d.name,rarity:JOKER_RARITY[d.rarity].label,artKey:jokerArtKey(d.id),routes:'同点/顺子/同花'}));
const sources=['src/game/ShopScene.ts','src/game/ShopOfferGuidance.ts'];
const report={phase,scope:'Validated controlled Qin Qiong shop checkpoint with five distinct held cards, all three full applicability routes, all three rarities and four editions. Native menu import and held-card inspection only; no transaction matrix or natural-play claim.',fixture:expected,sourceHashes:Object.fromEntries(await Promise.all(sources.map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),cases:[]};
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});report.browser=browser.version();
try{
 for(const viewport of [{width:1180,height:757},{width:390,height:844},{width:360,height:844}]){
  const touch=viewport.width<900,context=await browser.newContext({viewport,hasTouch:touch,deviceScaleFactor:1,reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(20000);const row={viewport,errors:[],shots:[]};report.cases.push(row);p.on('pageerror',e=>row.errors.push(String(e)));p.on('dialog',d=>d.accept());
  const click=locator=>touch?locator.tap():locator.click(),state=()=>p.evaluate(()=>structuredClone(window.__harness.game.registry.get('runController').state));
  const shot=async name=>{const file=viewport.width+'-'+name+'-'+phase+'.png';await p.screenshot({path:out+'/'+file,scale:'css'});row.shots.push(file);};
  try{
   await p.goto('http://127.0.0.1:5631/?harness=1');await waitScene(p,'title');await click(p.locator('.run-menu-toggle'));const section=p.getByText('进度与存档',{exact:true}).locator('..');if(!await section.evaluate(e=>e.open))await click(section.locator('summary'));const chooser=p.waitForEvent('filechooser');await click(p.getByRole('button',{name:'导入本局',exact:true}));await(await chooser).setFiles({name:'shop-owned-five.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(checkpoint))});await waitScene(p,'shop');await p.waitForFunction(()=>window.__harness.game.scene.getScene('shop').ready);
   await p.waitForFunction(keys=>keys.every(key=>!key||window.__harness.game.scene.getScene('shop').textures.exists(key)),expected.map(d=>d.artKey));
   assert.deepEqual(await state(),run);
   row.layout=await p.evaluate(()=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>list.flatMap(o=>[o,...(o.list?walk(o.list):[])]),nodes=walk(s.children.list),box=o=>{const b=o.getBounds();return{x:b.x,y:b.y,width:b.width,height:b.height};},fields=nodes.filter(o=>['shop/owned-name','shop/owned-identity','shop/owned-state','shop/owned-route'].includes(o.name)).map(o=>({name:o.name,text:o.text,instanceId:o.getData('instanceId'),fullText:o.getData('fullText'),...box(o)})),owned=nodes.find(o=>o.name==='shop-art/owned'),heading=nodes.find(o=>o.text?.startsWith('购买唐宋牌 · 待售'));return{geometry:s.geometry(),fields,owned:owned?.getData('bounds'),saleHeading:heading?box(heading):undefined};});
   row.captions=row.layout.fields.filter(o=>['shop/owned-state','shop/owned-route'].includes(o.name));row.overflows=row.captions.filter(c=>row.layout.owned?c.y+c.height>row.layout.owned.y+row.layout.owned.height+1||c.y+c.height>row.layout.saleHeading.y-4:c.y+c.height>row.layout.geometry.reroll.y-4);
   assert.equal(row.captions.length,5);const identities=row.layout.fields.filter(o=>o.name==='shop/owned-identity');assert.equal(identities.length,5);for(const [i,identity] of identities.entries())assert.ok(identity.text.startsWith(expected[i].rarity),'complete saved rarity remains visible');await shot('five-held');
   if(before){if(!touch)assert.equal(row.overflows.length,5,'five long captions reproduce overflow at1180');else assert.equal(row.overflows.length,0);}
   else{
    assert.equal(row.overflows.length,0,'held captions stay inside their safe rail and clear of the sale heading');assert.ok(row.captions.every(c=>!c.text.includes('\n')&&c.height<=19));
    for(const [i,card] of expected.entries()){
     await tapUI(p,'shop','joker/'+card.id,touch);const detail=p.locator('.shop-joker-held[open]');await detail.waitFor();assert.equal(await detail.locator('.route-fit-caption').textContent(),'适用：'+card.routes);assert.ok((await detail.locator('.shop-card-tags').textContent()).includes(card.rarity));const rules=detail.locator('.card-rules');if(await rules.count()){await click(rules.locator('summary'));assert.ok((await rules.locator('p').textContent()).trim().length>0);}if(i===4)await shot('full-routes-detail');await click(detail.locator('.dialog-close'));assert.deepEqual(await state(),run);
    }
   }
   assert.deepEqual(row.errors,[]);row.status=before?'REPRODUCED':'PASS';
  }catch(error){row.status='FAIL';row.error=String(error.stack??error);await shot('FAIL');throw error;}
  finally{await context.close();}
 }
 report.status=before?'REPRODUCED':'PASS';
}catch(error){report.status='FAIL';report.error=String(error.stack??error);throw error;}
finally{await browser.close();await server.close();await writeFile(out+'/browser-'+phase+'.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({phase,status:report.status,cases:report.cases.map(c=>({viewport:c.viewport,status:c.status,overflows:c.overflows?.length})),error:report.error}));}
