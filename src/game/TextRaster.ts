import type Phaser from 'phaser';

/** Text owns a bitmap: match the framebuffer, then align its bitmap edge to it. */
export function textDensity(scene:Phaser.Scene):number {return Math.max(1,1/scene.scale.zoom);}
export function crispText(text:Phaser.GameObjects.Text):void {
 if(!text.scene?.scale)return;
 const density=textDensity(text.scene);
 if(text.style.resolution!==density)text.setResolution(density);
 const x=text.x-text.displayOriginX*text.scaleX,y=text.y-text.displayOriginY*text.scaleY;
 text.setPosition(Math.round(x*density)/density+text.displayOriginX*text.scaleX,Math.round(y*density)/density+text.displayOriginY*text.scaleY);
}
