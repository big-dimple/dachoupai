import type Phaser from 'phaser';
import type {EffectContext} from '../core/EffectQueue';
import {HeroTargetAttachmentState,attachmentEdgePoint,ATTACHMENT_TRAVEL_MS,ATTACHMENT_RELEASE_MS,type AttachmentDraft,type AttachmentMotion} from './HeroTargetAttachmentState';
import {textDensity} from './TextRaster';
import {UI_FONT} from './theme';

export interface AttachmentCard {container:Phaser.GameObjects.Container;width:number;height:number;center?:{x:number;y:number};labelWidth?:number}
export interface HeroTargetAttachmentOptions {
  root:()=>Phaser.GameObjects.Container|undefined;
  target:(id:string)=>AttachmentCard|undefined;
  source:()=>{x:number;y:number}|undefined;
  motion:()=>AttachmentMotion;
  blocked:()=>boolean;
  labelExclusions?:()=>readonly {x:number;y:number;width:number;height:number}[];
}
type Mark={container:Phaser.GameObjects.Container;edge:Phaser.GameObjects.Graphics;label?:Phaser.GameObjects.Text;staticKey:string};
const BLUE=0x287d93,PALE=0x95d4dc;

/** A single hand bracket follows the actual selected instances without parenting or moving them. */
function groupCard(root:Phaser.GameObjects.Container,cards:AttachmentCard[]):AttachmentCard {
  const parent=root.getWorldTransformMatrix();let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const card of cards){const m=card.container.getWorldTransformMatrix();for(const [x,y]of [[-card.width/2,-card.height/2],[card.width/2,-card.height/2],[-card.width/2,card.height/2],[card.width/2,card.height/2]]){
    const world=m.transformPoint(x,y),p=parent.applyInverse(world.x,world.y);left=Math.min(left,p.x);top=Math.min(top,p.y);right=Math.max(right,p.x);bottom=Math.max(bottom,p.y);
  }}return {container:root,width:right-left,height:bottom-top,center:{x:(left+right)/2,y:(top+bottom)/2}};
}

/** One intent and one flight pool, with local marks on real instances. Never owns card poses. */
export class HeroTargetAttachment {
  private readonly state=new HeroTargetAttachmentState();
  private readonly marks=new Map<string,Mark>();
  private flight?:Phaser.GameObjects.Graphics;
  private from?:{x:number;y:number};
  private blurred=false;
  private destroyed=false;
  private cadence=0;
  private readonly blur=()=>{this.blurred=true;this.hide();};
  private readonly focus=()=>{this.blurred=false;};
  private readonly visibility=()=>{if(document.hidden)this.hide();};
  private readonly tick=(_time:number,delta:number)=>this.update(delta,false);
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
    if(this.destroyed)return;this.state.consume(targetId,eventId,context);this.flight?.destroy();this.flight=undefined;this.update(0);
  }
  commit(eventId:string,context:EffectContext):void {const target=this.state.value?.targetId;if(target)this.consume(target,eventId,context);}
  retainTargets(ids:readonly string[]):void {this.state.retainTargets(ids);this.update(0);}
  resolveSaved(draft:AttachmentDraft,eventId:string,context:EffectContext):void {
    if(context.signal.aborted)return;this.preview(draft);this.commit(eventId,context);this.release({eventId,reasonKey:draft.releaseReason},context);
  }
  release(event:{eventId:string;targetCardId?:string;reasonKey?:string},context:EffectContext):void {
    if(this.destroyed)return;this.state.release(event,context);this.update(0);
  }
  clear():void {this.state.clear();this.from=undefined;this.disposeVisuals();}
  private hide():void {this.state.suspend();this.disposeVisuals();}
  private removeMark(id:string):void {const mark=this.marks.get(id);mark?.edge.destroy();mark?.label?.destroy();this.marks.delete(id);}
  private disposeVisuals():void {for(const id of [...this.marks.keys()])this.removeMark(id);this.flight?.destroy();this.flight=undefined;}
  private avoidControls(label:Phaser.GameObjects.Text,card:AttachmentCard,group:boolean):void {
    const exclusions=this.options.labelExclusions?.()??[],overlaps=(b:{x:number;y:number;width:number;height:number})=>exclusions.some(a=>b.x<a.x+a.width&&b.x+b.width>a.x&&b.y<a.y+a.height&&b.y+b.height>a.y);
    if(!overlaps(label.getBounds()))return;
    if(!group){label.y=(card.center?.y??0)-card.height/2-11/Math.max(.2,Math.abs(card.container.scaleY));if(!overlaps(label.getBounds()))return;}
    const bounds=label.getBounds(),worldX=bounds.x+bounds.width/2,worldY=bounds.y+bounds.height/2,matrix=card.container.getWorldTransformMatrix(),original=matrix.applyInverse(worldX,worldY);
    const candidates=exclusions.flatMap(b=>[b.x-4-bounds.width/2,b.x+b.width+4+bounds.width/2]).sort((a,b)=>Math.abs(a-worldX)-Math.abs(b-worldX));
    for(const x of candidates){const b={...bounds,x:x-bounds.width/2};if(b.x<4||b.x+b.width>this.scene.scale.width-4||overlaps(b))continue;label.x+=matrix.applyInverse(x,worldY).x-original.x;break;}
  }
  private update(delta:number,force=true):void {
    if(this.destroyed)return;
    if(this.blurred||document.hidden||this.options.blocked()){this.hide();return;}
    this.state.setMotion(this.options.motion());this.state.advance(delta);
    this.cadence+=delta;if(!force&&this.cadence<1000/15)return;this.cadence%=1000/15;
    const state=this.state.value,root=this.options.root();if(!state||!root?.active){this.disposeVisuals();return;}
    const ids=state.targetIds??[state.targetId],members=ids.map(id=>({id,card:this.options.target(id)})).filter((t):t is {id:string;card:AttachmentCard}=>!!t.card?.container.active&&t.card.container.visible);
    const targets=state.kind==='group'&&members.length?[{id:'group/'+state.targetId,card:groupCard(root,members.map(t=>t.card))}]:members;
    const visible=new Set(targets.map(t=>t.id));for(const id of this.marks.keys())if(!visible.has(id))this.removeMark(id);
    if(!targets.length){this.hide();return;}
    const full=this.options.motion()==='full',releasing=state.phase==='release',release=releasing?Math.min(1,state.elapsed/ATTACHMENT_RELEASE_MS):0;
    for(const {id,card} of targets){
      const {container,width,height}=card,center=card.center??{x:0,y:0};let mark=this.marks.get(id);
      if(!mark||mark.container!==container||!mark.edge.active){
        this.removeMark(id);const edge=this.scene.add.graphics().setName('hero/target-edge').setData('targetId',id).setData('attachmentKind',state.kind??'card');container.add(edge);
        // Assist cards already carry the existing visible role mark; no overlapping second tag.
        const label=state.kind==='assist'?undefined:this.scene.add.text(0,0,state.label??'待转',{fontFamily:UI_FONT,fontSize:'13px',fontStyle:'bold',color:'#215f70',backgroundColor:'#edf7f5',padding:{x:3,y:1},resolution:textDensity(this.scene)}).setOrigin(.5).setName('hero/target-tag').setData('targetId',id);
        if(label)container.add(label);mark={container,edge,label,staticKey:''};this.marks.set(id,mark);
      }
      const {edge,label}=mark,sx=Math.max(.2,Math.abs(container.scaleX)),sy=Math.max(.2,Math.abs(container.scaleY));edge.setPosition(center.x,center.y);
      if(label){
        const fullText=releasing?(state.resolvedLabel??'已转'):(state.label??'待转');label.setText(fullText).setData('fullText',fullText);
        if(card.labelWidth&&label.width>card.labelWidth*sx&&state.kind==='wager')label.setText('新?');
        const group=state.kind==='group';label.setScale(1/sx,1/sy).setPosition(group?center.x:center.x-width/2+(label.width/2+2)/sx,group?center.y-height/2-11/sy:center.y+height/2+11/sy).setAlpha(1-release);
        this.avoidControls(label,card,group);
      }
      edge.setData('phase',state.phase).setData('generation',state.generation).setData('eventId',state.eventId).setData('flowPhase',full?state.clock%1600/1600:0).setData('width',width).setData('height',height);
      const staticKey=full?'':state.phase+'/'+width+'/'+height;if(full||mark.staticKey!==staticKey){
        edge.clear();const ink=state.failed?0x8a7b70:state.kind==='assist'?0x46696f:BLUE;
        if(state.kind==='assist'){
          for(const side of [-1,1])for(const y of [-height*.32,height*.32])edge.lineStyle(2,ink,.9*(1-release)).lineBetween(side*(width/2+3),y-9,side*(width/2+3),y+9);
        }else if(state.kind==='group'){
          for(const side of [-1,1])for(const end of [-1,1])edge.lineStyle(1.6,ink,.8*(1-release)).beginPath().moveTo(side*(width/2+4),end*(height/2-6)).lineTo(side*(width/2+4),end*(height/2+4)).lineTo(side*(width/2-8),end*(height/2+4)).strokePath();
        }else edge.lineStyle(1.2,ink,.5*(1-release)).strokeRoundedRect(-width/2-3,-height/2-3,width+6,height+6,7).lineStyle(2,ink,.95*(1-release)).beginPath().moveTo(width/2+1,-9).lineTo(width/2+5,-5).lineTo(width/2+1,-1).strokePath();
        if(full&&state.phase!=='travel')for(let ribbon=0;ribbon<3;ribbon++){
          const perimeter=2*(width+height+12),head=state.clock/1600+ribbon/3,len=Math.min(42,perimeter*.1)/perimeter;
          for(let tail=0;tail<3;tail++){
            edge.lineStyle(tail===0?2.4:1.2,tail===0?ink:PALE,(tail===0?.95:.5)*(1-release)).beginPath();
            for(let point=0;point<=10;point++){const expansion=state.failed?0:release*8,p=attachmentEdgePoint(width+expansion,height+expansion,head-len*(point/10+tail*.12));if(point===0)edge.moveTo(p.x,p.y);else edge.lineTo(p.x,p.y);}edge.strokePath();
          }
        }mark.staticKey=staticKey;
      }
      edge.setData('memberIds',state.targetIds??[state.targetId]);
    }
    if(state.phase==='travel'&&full&&this.from){
      if(!this.flight?.active){this.flight=this.scene.add.graphics().setName('hero/target-travel');root.add(this.flight);}
      const ink=this.flight,t=Math.min(1,state.elapsed/ATTACHMENT_TRAVEL_MS);ink.clear().setData('progress',t).setData('generation',state.generation);
      // At most three heads, shared by the actual selected instances.
      targets.slice(0,3).forEach(({card})=>{
        const center=card.center??{x:0,y:0},end=card.container.getWorldTransformMatrix().transformPoint(center.x+card.width/2+3,center.y-card.height*.18),start=this.from!,mid={x:(start.x+end.x)/2,y:Math.max(6,Math.min(start.y,end.y)-32)},u=1-t;
        const p={x:u*u*start.x+2*u*t*mid.x+t*t*end.x,y:u*u*start.y+2*u*t*mid.y+t*t*end.y};
        ink.lineStyle(2.5,BLUE,.95).beginPath().moveTo(p.x-5,p.y+2).lineTo(p.x,p.y-2).lineTo(p.x+4,p.y).strokePath();
      });ink.setData('targetIds',targets.map(t=>t.id));
    }else {this.flight?.destroy();this.flight=undefined;}
  }
  destroy():void {
    if(this.destroyed)return;this.destroyed=true;this.clear();this.scene.events.off('update',this.tick);this.scene.events.off('shutdown',this.destroy,this);
    window.removeEventListener('blur',this.blur);window.removeEventListener('focus',this.focus);document.removeEventListener('visibilitychange',this.visibility);
  }
}
