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
    return{x:r.left+p.x*r.width/game.scale.width,y:r.top+p.y*r.height/game.scale.height,enabled:!!o.input?.enabled};
  },{key,name});assert.ok(p,'visible named UI');return p;
}
export async function tapUI(page,key,name,touch=false){const p=await point(page,key,name);if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
/** Open the real title control when present; never bypass the production opening scene. */
export async function openSelector(page,touch=false){
  await page.waitForFunction(()=>window.__harness?.game.scene.isActive('title')||window.__harness?.game.scene.isActive('character-select'));
  if(await page.evaluate(()=>window.__harness.game.scene.isActive('title')))await tapUI(page,'title','action/title-start',touch);
  await waitScene(page,'character-select');
}
export async function chooseCharacter(page,id,touch=false){await openSelector(page,touch);await tapUI(page,'character-select','character/'+id,touch);await tapUI(page,'character-select','action/confirm-character',touch);await waitScene(page,'shop');}
export async function buyOffer(page,id,touch=false){await tapUI(page,'shop','offer/'+id,touch);const button=page.getByRole('button',{name:'确认购买',exact:true});if(touch)await button.tap();else await button.click();}
