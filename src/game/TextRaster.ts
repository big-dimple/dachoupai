import type Phaser from 'phaser';

/** Text owns a bitmap: match the framebuffer, then align its bitmap edge to it. */
export function textDensity(scene:Phaser.Scene):number {return Math.max(1,1/scene.scale.zoom);}
/** Allocate a peak-sized bitmap once; animation only transforms that prepared texture. */
export function prepareTextScale(text:Phaser.GameObjects.Text,peak:number):void {text.setData('rasterPeakScale',peak);crispText(text);}
export function crispText(text:Phaser.GameObjects.Text):void {
 if(!text.scene?.scale)return;
 const density=textDensity(text.scene),peak=Number(text.getData?.('rasterPeakScale')??1),resolution=peak>1?Math.ceil(density*peak):density;
 // Canvas samples the texture source, while Text measures with its style.
 // Pair them even if a prior setResolution already changed only the style.
 if(text.frame?.source&&text.frame.source.resolution!==resolution)text.frame.source.resolution=resolution;
 if(text.style.resolution!==resolution)text.setResolution(resolution);
 const x=text.x-text.displayOriginX*text.scaleX,y=text.y-text.displayOriginY*text.scaleY;
 text.setPosition(Math.round(x*density)/density+text.displayOriginX*text.scaleX,Math.round(y*density)/density+text.displayOriginY*text.scaleY);
}
