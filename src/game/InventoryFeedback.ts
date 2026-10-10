import type Phaser from 'phaser';
import type {R2RunState} from '../domain/run';
import {R2_TOOLS} from '../content/r2Tools';
import {PAPER_CSS} from './theme';
import {PAPER_THEME as T} from './theme';
import {toolInventoryLabel} from './ToolInventoryEntry';
const seen=new WeakMap<Phaser.Game,Set<string>>();
/** Session-only finite first usable cue. Quantity is always the saved inventory count. */
export function inventoryFeedback(scene:Phaser.Scene,button:Phaser.GameObjects.Rectangle,state:R2RunState,ready:boolean,reduced:boolean):void {
 const full=state.consumables.length>0,narrow=button.width<112,label=button.getData('label') as Phaser.GameObjects.Text;
 label.setText(toolInventoryLabel(state,narrow)).setFontStyle(full?'bold':'normal').setColor(full?PAPER_CSS.red:PAPER_CSS.jade);if(narrow)label.setFontSize(14).setAlign('center');
 if(button.width>=88&&!button.getData('chest')){
  const icon=scene.add.graphics().setPosition(button.x-button.width/2+18,button.y+2),ink=full?T.red:T.jade;
  // The held-tool paper peeks from the existing chest; no new asset or persistent motion.
  if(full)icon.fillStyle(T.paperLight).fillRect(-6,-12,7,10).fillRect(1,-14,6,12).lineStyle(1,T.brass).strokeRect(-6,-12,7,10).strokeRect(1,-14,6,12);
  icon.fillStyle(full?T.redSoft:T.jadeSoft).fillRoundedRect(-9,-3,18,11,2).lineStyle(1.5,ink).strokeRoundedRect(-9,-3,18,11,2);
  icon.fillStyle(T.paperEdge).fillRoundedRect(-10,full?-8:-7,20,5,2).lineStyle(1.5,ink).strokeRoundedRect(-10,full?-8:-7,20,5,2).fillStyle(T.brass).fillRect(-1,-4,3,5);
  button.parentContainer?.add(icon);button.setData('chest',icon);label.x+=narrow?8:10;button.once('destroy',()=>icon.destroy());
 }
 let keys=seen.get(scene.game);if(!keys){keys=new Set();seen.set(scene.game,keys);}const usable=state.consumables.filter(c=>R2_TOOLS.find(t=>t.id===c.definitionId)?.phases.includes(state.phase as 'shop'|'await-input'));
 const fresh=ready&&usable.some(c=>!keys!.has(state.runId+'/'+c.instanceId+'/'+state.phase));if(!fresh)return;for(const c of usable)keys.add(state.runId+'/'+c.instanceId+'/'+state.phase);
 button.setData('firstUsable',true);if(reduced)return;const y=label.y;let finished=false;const finish=()=>{if(finished)return;finished=true;window.removeEventListener('dachoupai-presentation',reduce);if(label.active)label.setPosition(label.x,y).setAngle(0);};const reduce=()=>{tween.remove();finish();};const tween=scene.tweens.add({targets:label,y:y-3,angle:2,duration:120,yoyo:true,repeat:2,ease:'Sine.easeInOut',onComplete:finish});window.addEventListener('dachoupai-presentation',reduce);label.once('destroy',()=>{tween.remove();finish();});
}
