import type Phaser from 'phaser';
import type {SourceImpact} from './SourceImpact';
import {PAPER_CSS as C,UI_FONT} from './theme';
/** Replaces only the existing value label during arrival/rest; original updates continue underneath. */
export function mountSourceImpact(scene:Phaser.Scene,source:Phaser.GameObjects.Container,cue:SourceImpact,signal:AbortSignal):(()=>void)|undefined {
 const original=source.getData('valueLabel') as Phaser.GameObjects.Text|undefined,frame=source.getData('frame') as Phaser.GameObjects.Rectangle|undefined;
 if(signal.aborted||!source.active||!source.visible||!original?.active||!frame)return;
 const room=Number(original.getData('labelRoom')??frame.width-6),label=scene.add.text(original.x,original.y,'',{fontFamily:UI_FONT,fontSize:'14px',color:cue.kind==='heat'||cue.kind==='read-heat'||cue.kind==='retrigger'?C.jade:C.red,backgroundColor:C.paperLight,resolution:Math.max(1.5,1/scene.scale.zoom)}).setOrigin(original.originX,original.originY).setName('source/impact').setData('sourceImpact',cue);
 const copy=cue.copies.find(copy=>{label.setText(copy);return label.width*1.08<=room&&label.height<=20;});
 if(!copy){label.destroy();return;}
 label.setText(copy);source.add(label);const visible=original.visible;original.setVisible(false);
 let cleaned=false;const cleanup=()=>{if(cleaned)return;cleaned=true;signal.removeEventListener('abort',cleanup);label.destroy();if(original.active)original.setVisible(visible);};signal.addEventListener('abort',cleanup,{once:true});return cleanup;
}
