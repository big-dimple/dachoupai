import type Phaser from 'phaser';
import type {SceneView} from './SceneView';
import type {Box} from './layout';
import type {GrowthPayoff} from './GrowthPayoff';
import {jokerArtKey} from './jokerArt';
import {PAPER_THEME as T,PAPER_CSS as C,UI_FONT} from './theme';
/** The existing played-card area owns this receipt. Selection always replaces it. No loader, input or extra wait. */
export function showGrowthPayoff(view:SceneView,scene:Phaser.Scene,parent:Phaser.GameObjects.Container,area:Box,p:GrowthPayoff):boolean {
 if(area.height<94||area.width<250)return false;
 const b={x:area.x+(area.width-Math.min(480,area.width))/2,y:area.y,width:Math.min(480,area.width),height:94},group=scene.add.container(b.x,b.y).setName('growth/payoff').setData('receipt',p).setData('bounds',b),x=70,w=b.width-x-8,cell=(w-12)/2;
 const paper=scene.add.graphics().fillStyle(T.paperLight,1).fillRoundedRect(0,0,b.width,b.height,5).lineStyle(1,T.jade,.55).strokeRoundedRect(.5,.5,b.width-1,b.height-1,5);paper.lineStyle(2,p.change==='gain'?T.red:T.jade,.8).lineBetween(x,91,b.width-8,91);group.add(paper);
 const art=jokerArtKey(p.definitionId);if(art&&scene.textures.exists(art)){const image=scene.add.image(33,47,art),source=image.texture.getSourceImage() as HTMLImageElement;image.setScale(Math.min(58/source.width,82/source.height));group.add(image.setName('growth/payoff-art'));}
 const text=(tx:number,y:number,value:string,size:number,width:number,name:string,color=C.ink)=>{const t=scene.add.text(tx,y,value,{fontFamily:UI_FONT,fontSize:size+'px',color,resolution:Math.max(1.5,1/scene.scale.zoom),wordWrap:{width,useAdvancedWrap:true}}).setName(name);group.add(t);return t;};
 const name=text(x,1,p.name+' · '+p.unit,14,w,'growth/payoff-name'),readLabel=text(x,22,p.readLabel,14,cell,'growth/payoff-read-label'),saveLabel=text(x+cell+12,22,'结算后存',14,cell,'growth/payoff-save-label');
 const read=text(x,40,p.readValue,21,cell,'growth/payoff-read',C.jade),saved=text(x+cell+12,40,p.before+' → '+p.after,21,cell,'growth/payoff-saved',p.change==='gain'?C.red:C.ink),caption=text(x,72,p.caption,14,w,'growth/payoff-next');
 if([name,readLabel,saveLabel,caption].some(t=>t.height>20)||[read,saved].some(t=>t.height>28)){group.destroy();return false;}
 parent.add(group);return true;
}
