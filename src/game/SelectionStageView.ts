import Phaser from 'phaser';
import type {Box} from './layout';
import type {SceneView} from './SceneView';

export const SELECTION_INK={back:0x192d32,raised:0x2a4144,paper:0xf3eadb,line:0x9d9d83,light:'#F3EADB',muted:'#C3CABA'} as const;

/** Selection owns its backdrop; shared materials keep their existing contract. */
export function selectionStageBackground(scene:Phaser.Scene,v:SceneView,width:number,height:number):void {
 const g=v.add(scene.add.graphics());
 g.fillStyle(SELECTION_INK.back).fillRect(0,0,width,height);
 g.fillStyle(0x21393d).fillPoints([{x:0,y:height*.62},{x:width*.54,y:height*.17},{x:width,y:height*.3},{x:width,y:height},{x:0,y:height}],true);
 g.fillStyle(0x15272d).fillPoints([{x:0,y:height*.83},{x:width*.76,y:height*.58},{x:width,y:height*.74},{x:width,y:height},{x:0,y:height}],true);
 g.lineStyle(1,SELECTION_INK.line,.2).beginPath().moveTo(12,64).lineTo(width-12,64).strokePath();
}

/** Reuse the shared press/release behavior with a quiet, 44px text target. */
export function selectionQuietButton(v:SceneView,b:Box,label:string,name:string,action:()=>void,enabled=true,light=true):Phaser.GameObjects.Rectangle {
 const hit=v.button(b,label,name,action,enabled,false,'sort');
 (hit.getData('label') as Phaser.GameObjects.Text).setColor(enabled?(light?SELECTION_INK.muted:'#3F606B'):'#747E7B');
 return hit;
}
