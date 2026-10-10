import type Phaser from 'phaser';
import type {R2RunState} from '../domain/run';
import {R2_TOOLS} from '../content/r2Tools';
import {PAPER_CSS,PAPER_THEME as T} from './theme';
import {toolInventoryLabel} from './ToolInventoryEntry';
import {gameSession} from './session';
/** Held inventory stays apparent until consumed; one frame-driven cue, never queued tweens. */
export function inventoryFeedback(scene:Phaser.Scene,button:Phaser.GameObjects.Rectangle,state:R2RunState,_ready:boolean,_reduced:boolean):void {
 const full=state.consumables.length>0,narrow=button.width<112,usable=state.consumables.some(c=>R2_TOOLS.find(t=>t.id===c.definitionId)?.phases.includes(state.phase as 'shop'|'await-input'));
 const label=button.getData('label') as Phaser.GameObjects.Text,ink=full?(usable?T.red:T.brass):T.jade;
 label.setText(toolInventoryLabel(state,narrow)).setFontStyle(full?'bold':'normal').setColor(full?(usable?PAPER_CSS.red:PAPER_CSS.brass):PAPER_CSS.jade);if(narrow)label.setFontSize(14).setAlign('center');
 if(button.width>=88&&!button.getData('chest')){
  const icon=scene.add.graphics().setPosition(button.x-button.width/2+18,button.y+2);
  if(full)icon.fillStyle(T.paperLight).fillRect(-6,-12,7,10).fillRect(1,-14,6,12).lineStyle(1,T.brass).strokeRect(-6,-12,7,10).strokeRect(1,-14,6,12);
  icon.fillStyle(full?T.redSoft:T.jadeSoft).fillRoundedRect(-9,-3,18,11,2).lineStyle(1.5,ink).strokeRoundedRect(-9,-3,18,11,2);
  icon.fillStyle(T.paperEdge).fillRoundedRect(-10,full?-8:-7,20,5,2).lineStyle(1.5,ink).strokeRoundedRect(-10,full?-8:-7,20,5,2).fillStyle(T.brass).fillRect(-1,-4,3,5);
  button.parentContainer?.add(icon);button.setData('chest',icon);label.x+=narrow?8:10;button.once('destroy',()=>icon.destroy());
 }
 if(!full)return;
 const frame=scene.add.graphics().lineStyle(1.5,ink,.9).strokeRoundedRect(button.x-button.width/2+2,button.y-button.height/2+2,button.width-4,button.height-4,4).setName('inventory/held-reminder');button.parentContainer?.add(frame);button.setData('inventoryReminder',frame).setData('inventoryAvailability',usable?'current':'later');
 const update=(time:number)=>{
  const current=scene.registry.get('runController')?.state as R2RunState|undefined;
  if(!current?.consumables.length){frame.setVisible(false);return;}
  const status=scene as Phaser.Scene&{ready?:boolean;playing?:boolean;presentation?:unknown};
  const paused=!usable||status.ready===false||status.playing||!!status.presentation||!scene.scene.isActive()||document.hidden||!!document.querySelector('dialog[open]');
  const reduced=gameSession().reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  frame.setVisible(true).setAlpha(paused||reduced ? .9 : .72+.18*Math.cos(time*Math.PI/2000));button.setData('inventoryReminderState',reduced?'static':paused?'paused':'breathing');
 };
 scene.events.on('update',update);button.once('destroy',()=>{scene.events.off('update',update);frame.destroy();});update(performance.now());
}
