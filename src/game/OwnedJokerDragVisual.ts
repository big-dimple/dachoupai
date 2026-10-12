import type Phaser from 'phaser';
import type {Box} from './layout';
import {ownedJokerDropIndex,reorderJokerIds} from './JokerReorder';
import {PAPER_THEME,PAPER_CSS,UI_FONT} from './theme';

type Art=Phaser.GameObjects.Container;
interface Surface {
  root:Phaser.GameObjects.Container;arts:ReadonlyMap<string,Art>;slots:readonly Box[];
  ids:readonly string[];hint?:Phaser.GameObjects.Text;
}
/** CSS-pixel feedback; no domain state, command or persistence is owned here. */
export const OWNED_DRAG={lift:16,scale:1.06,giveWayMs:110,settleMs:150} as const;
export function ownedDragPose(slot:Box,start:{x:number;y:number},pointer:{x:number;y:number}) {
  return {x:slot.x+slot.width/2+pointer.x-start.x,y:slot.y+slot.height/2+pointer.y-start.y-OWNED_DRAG.lift};
}
export function ownedOrderHint(touch:boolean,reverse:boolean):string {
  return (reverse?'本关整手从右到左':'通常从左到右结算')+' · '+(touch?'长按拖动排序':'拖动排序');
}
/** Shop retains the preceding stage; the upcoming slot and chapter boss are authoritative. */
export function ownedOrderReversed(run:{stageIndex:number;boss:{definitionId:string}}):boolean {
  return run.stageIndex%3===2&&run.boss.definitionId==='B13';
}

export class OwnedJokerDragVisual {
  private overlay?:Phaser.GameObjects.Graphics;
  private shadow?:Phaser.GameObjects.Graphics;
  private label?:Phaser.GameObjects.Text;
  private destinations=new Map<string,number>();
  private positions=new Map<string,{x:number;y:number;scale:number}>();
  private pointer:{x:number;y:number};
  private target=-1;
  saving=false;
  constructor(private readonly scene:Phaser.Scene,readonly id:string,readonly seq:number,
    private readonly start:{x:number;y:number},private readonly surface:()=>Surface,private readonly reduced:()=>boolean){
    this.pointer=start;this.preview(start.x,start.y);
  }
  private layers(s:Surface){
    if(this.overlay?.active)return;
    this.overlay=this.scene.add.graphics().setName('shop/owned-insertion');
    this.shadow=this.scene.add.graphics().setName('shop/owned-drag-shadow');
    this.label=this.scene.add.text(0,0,'',{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:PAPER_CSS.jade,backgroundColor:PAPER_CSS.paperLight,padding:{x:4,y:2}}).setOrigin(.5).setName('shop/owned-drop-label');
    s.root.add([this.overlay,this.shadow,this.label]);
  }
  preview(x:number,y:number){
    if(this.saving)return;this.pointer={x,y};
    const s=this.surface();this.target=ownedJokerDropIndex(s.slots,s.ids.length,x,y);this.paint(false);
  }
  private paint(rebind:boolean){
    const s=this.surface(),from=s.ids.indexOf(this.id),source=s.slots[from];if(!source)return;
    this.layers(s);
    const to=this.target,order=reorderJokerIds(s.ids,this.id,to),seat=s.slots[to];
    const overlay=this.overlay!;overlay.clear();
    if(seat){
      overlay.fillStyle(PAPER_THEME.jade,.16).fillRoundedRect(seat.x,seat.y,seat.width,seat.height,5);
      overlay.lineStyle(3,PAPER_THEME.jade,.95).strokeRoundedRect(seat.x+1,seat.y+1,seat.width-2,seat.height-2,5);
      this.label!.setPosition(seat.x+seat.width/2,seat.y+seat.height-13).setText(this.saving?'保存中':'第'+(to+1)+'位').setVisible(true);
    }else this.label!.setVisible(false);
    s.root.bringToTop(overlay);
    for(const [id,art] of s.arts){
      if(!art.active)continue;const dest=order.indexOf(id),b=s.slots[dest];if(!b)continue;
      if(id===this.id){
        this.scene.tweens.killTweensOf(art);
        const pose=this.saving?{x:b.x+b.width/2,y:b.y+b.height/2-OWNED_DRAG.lift}:ownedDragPose(source,this.start,this.pointer);
        art.setPosition(pose.x,pose.y).setScale(OWNED_DRAG.scale).setAngle(0).setAlpha(to<0?.65:1);
        this.shadow!.clear().fillStyle(PAPER_THEME.ink,.10).fillRoundedRect(-source.width*.53-3,-source.height*.53+7,source.width*1.06+6,source.height*1.06+6,7)
          .fillStyle(PAPER_THEME.ink,.20).fillRoundedRect(-source.width*.53,-source.height*.53+9,source.width*1.06,source.height*1.06,5).setPosition(pose.x+3,pose.y+3).setAlpha(to<0?.5:1);
        s.root.bringToTop(this.shadow!);s.root.bringToTop(art);
      }else if(rebind||this.destinations.get(id)!==dest){
        this.scene.tweens.killTweensOf(art);art.setScale(1).setAngle(0).setAlpha(1);
        const pose={x:b.x+b.width/2,y:b.y+b.height/2};
        if(rebind||this.reduced())art.setPosition(pose.x,pose.y);
        else this.scene.tweens.add({targets:art,...pose,duration:OWNED_DRAG.giveWayMs,ease:'Cubic.easeOut'});
      }
      this.destinations.set(id,dest);this.positions.set(id,{x:art.x,y:art.y,scale:art.scaleX});
    }
    s.root.bringToTop(this.label!);
    s.hint?.setText(this.saving?'正在保存顺序…':to<0?'移回持牌区 · 松手取消':'松手放第 '+(to+1)+' 位 · 移出取消');
  }
  /** Submitted preview stays raised and explicitly pending until the save result. */
  pending(){this.saving=true;this.paint(false);}
  /** A resize may redraw cards while persistence is pending. Rebind to the new faces. */
  rebind(){if(this.saving){this.overlay=undefined;this.shadow=undefined;this.label=undefined;this.destinations.clear();this.paint(true);}}
  /** Sample actual tween positions immediately before old faces are destroyed. */
  capture(){for(const [id,art] of this.surface().arts)if(art.active)this.positions.set(id,{x:art.x,y:art.y,scale:art.scaleX});}
  settle(saved:boolean){
    const s=this.surface();this.removeLayers();
    for(const [i,id] of s.ids.entries()){
      const art=s.arts.get(id),b=s.slots[i];if(!art?.active||!b)continue;
      this.scene.tweens.killTweensOf(art);
      const prior=this.positions.get(id),pose={x:b.x+b.width/2,y:b.y+b.height/2,scaleX:1,scaleY:1,alpha:1,angle:0};
      if(saved&&prior&&!this.reduced()){
        art.setPosition(prior.x,prior.y).setScale(prior.scale);s.root.bringToTop(art);
        this.scene.tweens.add({targets:art,...pose,duration:OWNED_DRAG.settleMs,ease:'Cubic.easeOut'});
      }else art.setPosition(pose.x,pose.y).setScale(1).setAlpha(1).setAngle(0);
    }
  }
  cancel(){if(this.saving)return;this.settle(false);}
  destroy(){this.removeLayers();}
  private removeLayers(){this.overlay?.destroy();this.shadow?.destroy();this.label?.destroy();this.overlay=undefined;this.shadow=undefined;this.label=undefined;}
}
