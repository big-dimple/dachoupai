import type Phaser from 'phaser';
import type {Box} from './layout';
import type {SceneView} from './SceneView';
import type {shopLayout} from './ShopLayout';
import {PAPER_THEME as T} from './theme';

/** Quiet sheets follow published shop rectangles; decoration owns no input. */
export function shopSheet(scene:Phaser.Scene,view:SceneView,name:string,b:Box,color:number,raised=false,outlined=false):void {
  if(b.width<=0||b.height<=0)return;
  const g=scene.add.graphics().setName('shop-art/'+name).setData('bounds',{...b});
  if(raised)g.fillStyle(T.ink,.065).fillRoundedRect(b.x,b.y+2,b.width,b.height,6);
  g.fillStyle(color).fillRoundedRect(b.x,b.y,b.width,b.height,6);view.add(g);
  if(outlined)view.add(scene.add.graphics().lineStyle(1,T.jade,.6).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,6).setName('shop-art/offer-edge').setData('bounds',{...b}));
  if(scene.textures.exists('p00-paper')&&b.width>8&&b.height>8)view.add(scene.add.tileSprite(b.x+4,b.y+4,b.width-8,b.height-8,'p00-paper').setOrigin(0).setAlpha(.09).setName('shop-art/'+name+'-paper'));
}

export function drawShopArt(scene:Phaser.Scene,view:SceneView,p:ReturnType<typeof shopLayout>):void {
  const pc=p.pc;
  if(pc){
    shopSheet(scene,view,'program',pc.left,T.paperLight,true);
    shopSheet(scene,view,'owned',{...pc.ownedRail,height:pc.ownedRail.height+16},T.jadeSoft);
    shopSheet(scene,view,'stock',pc.shopPanel,T.paperLight,true);
    shopSheet(scene,view,'actions',{x:pc.actionRail.x-6,y:pc.shopPanel.y+6,width:pc.actionRail.width+12,height:pc.shopPanel.height-12},T.jadeSoft);
  }else if(p.portrait){
    // Merchandise and the single primary action lead; quiet rails keep breathing space.
    view.add(scene.add.graphics().lineStyle(1,T.divider,.55).lineBetween(p.x,p.slots[0].y-20,p.x+p.w,p.slots[0].y-20).lineBetween(p.x,p.reroll.y-6,p.x+p.w,p.reroll.y-6).setName('shop-art/rails'));
  }else if(p.short){
    shopSheet(scene,view,'stock',{x:p.tabs.x-4,y:p.tabs.y-4,width:p.tabs.width+8,height:Math.max(...p.shelf.map(b=>b.y+b.height))+6-p.tabs.y},T.paperLight);
    shopSheet(scene,view,'entry',{x:p.play.x-4,y:p.play.y-4,width:p.play.width+8,height:p.play.height+8},T.jadeSoft);
  }
}
