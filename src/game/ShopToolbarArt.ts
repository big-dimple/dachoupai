import type Phaser from 'phaser';
/** One restrained stroke family for shop resources and actions. No external art. */
export function shopToolbarGlyph(scene:Phaser.Scene,host:Phaser.GameObjects.Container,kind:'coin'|'bag'|'refresh',x:number,y:number,ink:number,size=16):void {
 const g=scene.add.graphics().setPosition(x,y).setScale(size/16).lineStyle(1.5,ink,1);host.add(g);
 if(kind==='coin'){g.strokeCircle(8,8,6.5).strokeRect(5.5,5.5,5,5);return;}
 if(kind==='bag'){g.strokeRoundedRect(2,5,12,10,2).strokeRoundedRect(5,1,6,5,2).lineBetween(2,9,14,9).lineBetween(7,9,9,9);return;}
 g.beginPath().arc(8,8,5.5,.2,Math.PI*1.75,false).strokePath().lineBetween(11.5,1.5,13.5,4.5).lineBetween(13.5,4.5,9.5,4.5);
}
