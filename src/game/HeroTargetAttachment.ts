import type Phaser from 'phaser';
import type {EffectContext} from '../core/EffectQueue';
import {HeroTargetAttachmentState,attachmentEdgePoint,ATTACHMENT_TRAVEL_MS,ATTACHMENT_RELEASE_MS,type AttachmentDraft,type AttachmentMotion} from './HeroTargetAttachmentState';
import {textDensity} from './TextRaster';
import {UI_FONT} from './theme';

export interface AttachmentCard {container:Phaser.GameObjects.Container;width:number;height:number}
export interface HeroTargetAttachmentOptions {
  root:()=>Phaser.GameObjects.Container|undefined;
  target:(id:string)=>AttachmentCard|undefined;
  source:()=>{x:number;y:number}|undefined;
  motion:()=>AttachmentMotion;
  blocked:()=>boolean;
}
const BLUE=0x287d93,PALE=0x95d4dc;

/** One current intent, two Graphics and one Text. Never owns the card's pose or score. */
export class HeroTargetAttachment {
  private readonly state=new HeroTargetAttachmentState();
  private edge?:Phaser.GameObjects.Graphics;
  private label?:Phaser.GameObjects.Text;
  private flight?:Phaser.GameObjects.Graphics;
  private bound?:Phaser.GameObjects.Container;
  private from?:{x:number;y:number};
  private blurred=false;
  private destroyed=false;
  private lastStatic='';
  private readonly blur=()=>{this.blurred=true;this.hide();};
  private readonly focus=()=>{this.blurred=false;};
  private readonly visibility=()=>{if(document.hidden)this.hide();};
  private readonly tick=(_time:number,delta:number)=>this.update(delta);

  constructor(private readonly scene:Phaser.Scene,private readonly options:HeroTargetAttachmentOptions){
    scene.events.on('update',this.tick);scene.events.once('shutdown',this.destroy,this);
    window.addEventListener('blur',this.blur);window.addEventListener('focus',this.focus);document.addEventListener('visibilitychange',this.visibility);
  }

  preview(draft:AttachmentDraft|undefined):void {
    if(this.destroyed)return;
    const previous=this.state.value?.generation;
    this.state.setMotion(this.options.motion());this.state.preview(draft);
    if(previous!==this.state.value?.generation){this.disposeVisuals();this.from=draft?this.options.source():undefined;if(!this.from)this.state.suspend();}
    this.update(0);
  }

  consume(targetId:string,eventId:string,context:EffectContext):void {
    if(this.destroyed)return;
    this.state.consume(targetId,eventId,context);this.flight?.destroy();this.flight=undefined;this.update(0);
  }

  release(event:{eventId:string;targetCardId?:string;reasonKey?:string},context:EffectContext):void {
    if(this.destroyed)return;
    this.state.release(event,context);this.update(0);
  }

  clear():void {this.state.clear();this.from=undefined;this.disposeVisuals();}
  private hide():void {this.state.suspend();this.disposeVisuals();}
  private disposeVisuals():void {
    this.edge?.destroy();this.label?.destroy();this.flight?.destroy();
    this.edge=undefined;this.label=undefined;this.flight=undefined;this.bound=undefined;this.lastStatic='';
  }

  private update(delta:number):void {
    if(this.destroyed)return;
    this.state.setMotion(this.options.motion());
    if(this.blurred||document.hidden||this.options.blocked()){this.hide();return;}
    this.state.advance(delta);
    const state=this.state.value,card=state?this.options.target(state.targetId):undefined,root=this.options.root();
    if(!state){this.disposeVisuals();return;}
    if(!card?.container.active||!card.container.visible||!root?.active){this.hide();return;}
    const {container,width,height}=card;
    if(this.bound!==container||!this.edge?.active||!this.label?.active){
      this.disposeVisuals();this.bound=container;
      this.edge=this.scene.add.graphics().setName('hero/target-edge').setData('targetId',state.targetId);container.add(this.edge);
      this.label=this.scene.add.text(0,0,'待转',{fontFamily:UI_FONT,fontSize:'13px',fontStyle:'bold',color:'#215f70',backgroundColor:'#edf7f5',padding:{x:3,y:1},resolution:textDensity(this.scene)}).setOrigin(.5).setName('hero/target-tag').setData('targetId',state.targetId);container.add(this.label);
    }
    const edge=this.edge!,label=this.label!,sx=Math.max(.2,Math.abs(container.scaleX)),sy=Math.max(.2,Math.abs(container.scaleY));
    const releasing=state.phase==='release',release=releasing?Math.min(1,state.elapsed/ATTACHMENT_RELEASE_MS):0,full=this.options.motion()==='full';
    label.setText(releasing?'已转':'待转').setScale(1/sx,1/sy).setPosition(0,height/2+11/sy).setAlpha(1-release);
    edge.setData('phase',state.phase).setData('generation',state.generation).setData('flowPhase',full?state.clock%1600/1600:0).setData('width',width).setData('height',height);
    const staticKey=full?'':state.phase+'/'+width+'/'+height;
    if(full||this.lastStatic!==staticKey){
      edge.clear();edge.lineStyle(1.2,BLUE,.5*(1-release)).strokeRoundedRect(-width/2-3,-height/2-3,width+6,height+6,7);
      // The right-edge chevron and short tag carry meaning without colour or motion.
      edge.lineStyle(2,BLUE,.95*(1-release)).beginPath().moveTo(width/2+1,-9).lineTo(width/2+5,-5).lineTo(width/2+1,-1).strokePath();
      if(full&&state.phase!=='travel'){
        const perimeter=2*(width+height+12),phase=state.clock/1600;
        for(let ribbon=0;ribbon<3;ribbon++){
          const head=phase+ribbon/3,len=Math.min(42,perimeter*.1)/perimeter;
          for(let tail=0;tail<3;tail++){
            edge.lineStyle(tail===0?3:1.5,tail===0?PALE:BLUE,(tail===0?.9:.5)*(1-release));edge.beginPath();
            for(let point=0;point<=10;point++){
              const p=attachmentEdgePoint(width+release*8,height+release*8,head-len*(point/10+tail*.12));
              if(point===0)edge.moveTo(p.x,p.y);else edge.lineTo(p.x,p.y);
            }edge.strokePath();
          }
        }
      }this.lastStatic=staticKey;
    }
    if(state.phase==='travel'&&full&&this.from){
      if(!this.flight?.active){this.flight=this.scene.add.graphics().setName('hero/target-travel').setData('targetId',state.targetId);root.add(this.flight);}
      const ink=this.flight,t=Math.min(1,state.elapsed/ATTACHMENT_TRAVEL_MS),matrix=container.getWorldTransformMatrix(),end=matrix.transformPoint(width/2+3,-height*.18),start=this.from,mid={x:(start.x+end.x)/2,y:Math.max(6,Math.min(start.y,end.y)-32)};
      ink.clear().setData('progress',t).setData('generation',state.generation);
      for(let i=0;i<3;i++){
        const p=Math.max(0,t-i*.035),u=1-p,x=u*u*start.x+2*u*p*mid.x+p*p*end.x,y=u*u*start.y+2*u*p*mid.y+p*p*end.y;
        ink.lineStyle(3-i*.7,i?PALE:BLUE,1-i*.22).beginPath().moveTo(x-5,y+2).lineTo(x,y-2).lineTo(x+4,y).strokePath();
      }
      ink.lineStyle(1.5,BLUE,.6*(1-t)).strokeCircle(start.x,start.y,9+t*3);
    }else {this.flight?.destroy();this.flight=undefined;}
  }

  destroy():void {
    if(this.destroyed)return;this.destroyed=true;this.clear();
    this.scene.events.off('update',this.tick);this.scene.events.off('shutdown',this.destroy,this);
    window.removeEventListener('blur',this.blur);window.removeEventListener('focus',this.focus);document.removeEventListener('visibilitychange',this.visibility);
  }
}
