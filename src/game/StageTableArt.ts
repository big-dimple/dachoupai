import type Phaser from 'phaser';
import {playedFootprint,type Box,type TableLayout} from './layout';
import {toolInventoryPlayedArea} from './ToolInventoryEntry';
import {selectionPortraitKey} from './portraits';
import type {CharacterId} from './characters';
import type {SceneView} from './SceneView';
import {PAPER_THEME as T} from './theme';

export interface StageTableArtPlan {surface:Box;program:Box;rack:Box;hand:Box;stage:Box;portrait?:Box}
const fit=(l:TableLayout,b:Box):Box=>{const x=Math.max(0,b.x),y=Math.max(0,b.y);return{x,y,width:Math.max(0,Math.min(l.width,b.x+b.width)-x),height:Math.max(0,Math.min(l.height,b.y+b.height)-y)};};
/** Decoration follows final published rectangles. It never allocates seats or moves targets. */
export function stageTableArtPlan(l:TableLayout):StageTableArtPlan {
 const portrait=l.mode==='portrait',slots=l.slots,rackLeft=Math.min(...slots.map(b=>b.x)),rackRight=Math.max(...slots.map(b=>b.x+b.width)),rackBottom=Math.max(...slots.map(b=>b.y+b.height));
 const mainX=portrait?l.hand.x:l.jokers.x,mainRight=Math.max(l.hand.x+l.hand.width,l.jokers.x+l.jokers.width),top=l.jokers.y-8,bottom=l.actions.y+l.actions.height+4;
 const surface=fit(l,{x:mainX-8,y:top,width:mainRight-mainX+16,height:bottom-top});
 const program=fit(l,{...l.hud,height:l.mode==='desktop'?l.actions.y+l.actions.height-l.hud.y:l.hud.height});
 const plan:StageTableArtPlan={surface,program,rack:fit(l,{x:rackLeft-7,y:l.jokers.y-5,width:rackRight-rackLeft+14,height:rackBottom-l.jokers.y+10}),hand:fit(l,{x:l.hand.x-3,y:l.hand.y-2,width:l.hand.width+6,height:l.hand.height+4}),stage:playedFootprint(toolInventoryPlayedArea(l),portrait)};
 const imageTop=Math.max(l.hud.y+544,l.scoreBoard.y+l.scoreBoard.height+100),imageHeight=Math.min(140,program.y+program.height-imageTop-12);
 if(l.mode==='desktop'&&imageHeight>=112)plan.portrait={x:l.hud.x+(l.hud.width-100)/2,y:imageTop,width:100,height:imageHeight};
 return plan;
}
/** Existing prepared paper/character art and sparse ink seams only; all layers are noninteractive. */
export function drawStageTableArt(scene:Phaser.Scene,view:SceneView,characterId:CharacterId):void {
 const plan=stageTableArtPlan(view.layout);
 function sheet(name:string,b:Box,color:number,edge:number,shadow=false):void {
  if(b.width<=0||b.height<=0)return;
  const g=scene.add.graphics().setName('table-art/'+name).setData('bounds',{...b});
  if(shadow)g.fillStyle(T.ink,.055).fillRoundedRect(b.x,b.y+2,b.width,b.height,8);
  g.fillStyle(color).fillRoundedRect(b.x,b.y,b.width,b.height,8).lineStyle(1,edge,.3).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,8);
  const inset=5,corner=Math.min(16,b.height/5);g.lineStyle(1,edge,.24);
  for(const [x,y,dx,dy] of [[b.x+inset,b.y+inset,1,1],[b.x+b.width-inset,b.y+b.height-inset,-1,-1]])g.beginPath().moveTo(x,y+dy*corner).lineTo(x,y).lineTo(x+dx*corner,y).strokePath();
  view.add(g);
  if(scene.textures.exists('p00-paper'))view.add(scene.add.tileSprite(b.x+4,b.y+4,b.width-8,b.height-8,'p00-paper').setOrigin(0).setAlpha(color===T.jadeSoft?.08:.18).setName('table-art/'+name+'-paper'));
 }
 sheet('surface',plan.surface,T.jadeSoft,T.jade,true);
 sheet('program',plan.program,T.paper,T.brass);
 sheet('rack',plan.rack,T.paper,T.brass);
 sheet('hand',plan.hand,T.paperLight,T.brass,true);
 sheet('stage',plan.stage,T.paperLight,T.jade,true);
 const key=selectionPortraitKey(characterId),box=plan.portrait;
 if(box&&scene.textures.exists(key)){
  const image=scene.add.image(box.x+box.width/2,box.y+box.height/2,key);image.setScale(Math.min(box.width/image.width,box.height/image.height)).setName('table-art/character').setData('assetId',characterId+'.selection').setData('bounds',box);view.add(image);
 }
}
