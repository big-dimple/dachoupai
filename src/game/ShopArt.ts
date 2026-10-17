import type Phaser from 'phaser';
import type {Box} from './layout';
import type {SceneView} from './SceneView';
import {shopOfferCopy,type shopLayout} from './ShopLayout';
import type {CharacterId} from './characters';
import {PAPER_THEME as T} from './theme';

/** The same dark ink header leads into a cool paper shop, without recoloring card art. */
export function drawShopBackdrop(scene:Phaser.Scene,view:SceneView,p:ReturnType<typeof shopLayout>,_hero?:CharacterId):void {
 if(p.pc)return;
 if(!p.portrait)view.add(scene.add.rectangle(0,0,view.layout.width,view.layout.height,0xefeee5).setOrigin(0).setName('shop-art/backdrop'));
 const edge=p.top+(p.portrait?48+(p.headerRows-1)*44:42),y=Math.max(0,p.top-8);
 view.add(scene.add.graphics().fillStyle(0x203f3b,1).fillRect(0,y,view.layout.width,edge-y).lineStyle(1,0xb7a36d,.8).lineBetween(p.x,edge,p.x+p.w,edge).setName('shop-art/ink-header'));
}

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
    shopSheet(scene,view,'owned',{...pc.ownedRail,height:pc.ownedRail.height+16},T.jadeSoft);
    shopSheet(scene,view,'stock',pc.shopPanel,T.paperLight,true);
  }else if(p.portrait){
    const copy=shopOfferCopy(p,p.shelf[0],true);
    view.add(scene.add.graphics().fillStyle(T.paperLight,.9).fillRoundedRect(p.x-4,copy.y,p.w+8,104,6).setName('shop-art/info-band'));
    // Merchandise and the single primary action lead; quiet rails keep breathing space.
    const rails=scene.add.graphics().lineStyle(1,T.divider,.55);
    if(!p.inventoryCollapsed)rails.lineBetween(p.x,p.slots[0].y-20,p.x+p.w,p.slots[0].y-20);
    view.add(rails.lineBetween(p.x,p.reroll.y-6,p.x+p.w,p.reroll.y-6).setName('shop-art/rails'));
  }else if(p.short){
    shopSheet(scene,view,'stock',{x:p.tabs.x-4,y:p.tabs.y-4,width:p.tabs.width+8,height:Math.max(...p.shelf.map(b=>b.y+b.height))+6-p.tabs.y},T.paperLight);
    shopSheet(scene,view,'entry',{x:p.play.x-4,y:p.play.y-4,width:p.play.width+8,height:p.play.height+8},T.jadeSoft);
  }
}
