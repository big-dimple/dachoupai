/** Read actual Phaser hit geometry; all actions remain browser mouse/touch/DOM inputs. */
import assert from 'node:assert/strict';
export const waitScene=(page,key)=>page.waitForFunction(key=>window.__harness?.game.scene.isActive(key),key);
export async function point(page,key,name){
  await page.waitForFunction(({key,name})=>{const scene=window.__harness?.game.scene.getScene(key);if(!scene?.scene.isActive())return false;const walk=list=>list.some(o=>o.name===name||o.list&&walk(o.list));return walk(scene.children.list);},{key,name});
  await page.evaluate(()=>new Promise((resolve,reject)=>{
    const game=window.__harness.game,done=()=>{clearTimeout(timer);resolve();};
    const timer=setTimeout(()=>{game.events.off('poststep',done);reject(Error('Phaser poststep timeout'));},5000);game.events.once('poststep',done);
  }));
  const p=await page.evaluate(({key,name})=>{
    const game=window.__harness.game,scene=game.scene.getScene(key),walk=list=>{for(const o of list){if(o.name===name)return o;if(o.list){const found=walk(o.list);if(found)return found;}}},o=walk(scene.children.list),r=game.canvas.getBoundingClientRect(),hit=o.input?.hitArea;
    const x=hit?hit.x+hit.width/2-o.displayOriginX:0,y=hit?hit.y+hit.height/2-o.displayOriginY:0,matrix=o.getWorldTransformMatrix(),p=matrix.transformPoint(x,y);
    const camera=scene.cameras.main,screen=camera.matrix.transformPoint(p.x-camera.scrollX,p.y-camera.scrollY);
    return{x:r.left+screen.x*r.width/game.scale.width,y:r.top+screen.y*r.height/game.scale.height,enabled:!!o.input?.enabled};
  },{key,name});assert.ok(p,'visible named UI');return p;
}
export async function tapUI(page,key,name,touch=false){
  if(key==='shop'&&['action/chapter','action/items'].includes(name)&&await page.evaluate(()=>window.__harness.game.scene.getScene('shop').view.layout.mode==='portrait')){
    await tapUI(page,'shop','action/build',touch);const all=page.getByRole('button',{name:'查看全部现货与持牌',exact:true});if(await all.count()){if(touch)await all.tap();else await all.click();}if(name==='action/items'){const manage=page.getByRole('button',{name:'持有牌管理',exact:true});if(touch)await manage.tap();else await manage.click();}const button=page.getByRole('button',{name:name==='action/chapter'?'本章节目':'物品与道具',exact:true});if(touch)await button.tap();else await button.click();return;
  }
  if(key==='shop'&&name.startsWith('offer/'))for(let i=0;i<8;i++){
    const visible=await page.evaluate(name=>{const s=window.__harness.game.scene.getScene('shop'),walk=list=>list.some(o=>o.name===name||o.list&&walk(o.list));return walk(s.children.list);},name);if(visible)break;
    await tapUI(page,'shop','action/shelf-page',touch);
  }
  const p=await point(page,key,name);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
  // Touch returns before Phaser consumes its pointer-up; observe the real next frame before another choice.
  await page.evaluate(()=>new Promise((resolve,reject)=>{const game=window.__harness.game,timer=setTimeout(()=>{game.events.off('poststep',done);reject(Error('Phaser post-tap timeout'));},5000),done=()=>{clearTimeout(timer);resolve();};game.events.once('poststep',done);}));
}
/** Low-frequency table actions follow the actual D27 menu route. */
export async function openMenuSection(page,section,touch=false){
  const tap=async locator=>touch?locator.tap():locator.click();
  if(!await page.locator('.run-menu-modal').evaluate(dialog=>dialog.open))await tap(page.locator('.run-menu-toggle'));
  assert.ok(['settings','playback'].includes(section),'known menu section');
  const details=page.locator('.run-menu-'+section+'-tools');
  if(!await details.evaluate(element=>element.open))await tap(details.locator('summary'));
}
export async function tapMenuAction(page,label,touch=false){
  const tap=async locator=>touch?locator.tap():locator.click();
  if(!await page.locator('.run-menu-modal').evaluate(dialog=>dialog.open))await tap(page.locator('.run-menu-toggle'));
  if(['快进当前手','回看上一手'].includes(label))await openMenuSection(page,'playback',touch);
  await tap(page.getByRole('button',{name:label,exact:true}));
}
/** Open the real title control when present; never bypass the production opening scene. */
export async function openSelector(page,touch=false){
  await page.waitForFunction(()=>window.__harness?.game.scene.isActive('title')||window.__harness?.game.scene.isActive('character-select'));
  if(await page.evaluate(()=>window.__harness.game.scene.isActive('title')))await tapUI(page,'title','action/title-start',touch);
  await waitScene(page,'character-select');
}
/** Follow the production hero → route → joint confirmation, including old-save prompts. */
export async function confirmHeroRoute(page,touch=false,focus='group'){
  if(await page.evaluate(()=>window.__harness.game.scene.getScene('character-select').step==='hero'))await tapUI(page,'character-select','action/confirm-character',touch);
  await tapUI(page,'character-select','route/'+focus,touch);
  await tapUI(page,'character-select','action/confirm-character',touch);
}
export async function chooseCharacter(page,id,touch=false){await openSelector(page,touch);await tapUI(page,'character-select','character/'+id,touch);await confirmHeroRoute(page,touch);await waitScene(page,'shop');}
export async function buyOffer(page,id,touch=false){await tapUI(page,'shop','offer/'+id,touch);const button=page.getByRole('button',{name:'确认购买',exact:true});if(touch)await button.tap();else await button.click();}
