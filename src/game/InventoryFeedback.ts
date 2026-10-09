import type Phaser from 'phaser';
import type {R2RunState} from '../domain/run';
import {R2_TOOLS} from '../content/r2Tools';
import {PAPER_CSS} from './theme';
const seen=new WeakMap<Phaser.Game,Set<string>>();
/** Session-only finite first usable cue. Quantity is always the saved inventory count. */
export function inventoryFeedback(scene:Phaser.Scene,button:Phaser.GameObjects.Rectangle,state:R2RunState,ready:boolean,reduced:boolean):void {
 const label=button.getData('label') as Phaser.GameObjects.Text;label.setFontStyle(state.consumables.length?'bold':'normal').setColor(state.consumables.length?PAPER_CSS.red:PAPER_CSS.jade);
 if(button.width>=112&&!button.getData('chest')){const icon=scene.add.graphics().setPosition(button.x-button.width/2+18,button.y+2);icon.fillStyle(state.consumables.length?0xb8473a:0x3f606b,.12).fillRoundedRect(-8,-5,16,12,2).lineStyle(1.5,state.consumables.length?0xb8473a:0x3f606b,1).strokeRoundedRect(-8,-5,16,12,2).lineBetween(-8,-1,8,-1).fillStyle(0x8f6a3b,1).fillRect(-1,-2,3,4);button.parentContainer?.add(icon);button.setData('chest',icon);label.x+=10;button.once('destroy',()=>icon.destroy());}
 let keys=seen.get(scene.game);if(!keys){keys=new Set();seen.set(scene.game,keys);}const usable=state.consumables.filter(c=>R2_TOOLS.find(t=>t.id===c.definitionId)?.phases.includes(state.phase as 'shop'|'await-input'));
 const fresh=ready&&usable.some(c=>!keys!.has(state.runId+'/'+c.instanceId+'/'+state.phase));if(!fresh)return;for(const c of usable)keys.add(state.runId+'/'+c.instanceId+'/'+state.phase);
 button.setData('firstUsable',true);if(reduced)return;const y=label.y;let finished=false;const finish=()=>{if(finished)return;finished=true;window.removeEventListener('dachoupai-presentation',reduce);if(label.active)label.setPosition(label.x,y).setAngle(0);};const reduce=()=>{tween.remove();finish();};const tween=scene.tweens.add({targets:label,y:y-3,angle:2,duration:120,yoyo:true,repeat:2,ease:'Sine.easeInOut',onComplete:finish});window.addEventListener('dachoupai-presentation',reduce);label.once('destroy',()=>{tween.remove();finish();});
}
