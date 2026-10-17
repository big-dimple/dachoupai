import type Phaser from 'phaser';
import type {EffectContext} from '../core/EffectQueue';
import type {Box} from './layout';
import type {SavedStageGift} from './SavedStageGift';
import {StageGiftDeliveryCue} from './SavedStageGift';
import {PAPER_CSS as C,PAPER_THEME as T,UI_FONT} from './theme';

export interface StageGiftDeliveryOptions {
  parent:Phaser.GameObjects.Container;
  source:(instanceId:string)=>Box|undefined;
  inventory:()=>Box|undefined;
  gold:()=>Box|undefined;
  /** The rack's single motion owner moves the inner face. This component never transforms a rack slot. */
  pulseSource:(instanceId:string,context:EffectContext,duration:number)=>void|Promise<void>;
  reducedMotion:()=>boolean;
  blocked?:()=>boolean;
  /** Projection only: update the existing inventory/gold label at arrival; never dispatch a command. */
  arrived?:(fact:SavedStageGift)=>void;
}
export type GiftDeliveryResult='complete'|'cancelled'|'missing-anchor'|'duplicate';
const WINDUP=220,FLIGHT=540,READ=800;
const glyphs:Record<string,string>={T03:'♥',T04:'♦',T05:'♣',T06:'♠'};
const center=(b:Box)=>({x:b.x+b.width/2,y:b.y+b.height/2});
export function stageGiftFlight(from:{x:number;y:number},to:{x:number;y:number},progress:number){
  const t=Math.min(1,Math.max(0,progress)),u=1-t,mid={x:(from.x+to.x)/2,y:Math.max(16,Math.min(from.y,to.y)-Math.min(70,Math.hypot(to.x-from.x,to.y-from.y)*.15))};
  return {x:u*u*from.x+2*u*t*mid.x+t*t*to.x,y:u*u*from.y+2*u*t*mid.y+t*t*to.y};
}

/** Finite saved-result delivery. Owns only its overlay, not data, source slot transforms, audio or input. */
export class StageGiftDelivery {
  private readonly cue=new StageGiftDeliveryCue();
  private active?:AbortController;
  private destroyed=false;
  private readonly hide=()=>{if(typeof document==='undefined'||document.hidden)this.cancel();};
  private readonly blur=()=>this.cancel();
  constructor(private readonly scene:Phaser.Scene,private readonly options:StageGiftDeliveryOptions){
    scene.events.once('shutdown',this.destroy,this);scene.events.once('destroy',this.destroy,this);
    if(typeof document!=='undefined')document.addEventListener('visibilitychange',this.hide);
    if(typeof window!=='undefined')window.addEventListener('blur',this.blur);
  }
  cancel():void {this.active?.abort();this.active=undefined;}
  destroy():void {
    if(this.destroyed)return;this.destroyed=true;this.cancel();
    this.scene.events.off('shutdown',this.destroy,this);this.scene.events.off('destroy',this.destroy,this);
    if(typeof document!=='undefined')document.removeEventListener('visibilitychange',this.hide);
    if(typeof window!=='undefined')window.removeEventListener('blur',this.blur);
  }
  async play(fact:SavedStageGift,context:EffectContext):Promise<GiftDeliveryResult> {
    if(this.destroyed||context.signal.aborted||this.options.blocked?.())return 'cancelled';
    if(!this.cue.claim(fact,context.signal))return 'duplicate';
    this.cancel();
    const firstSource=this.options.source(fact.sourceInstanceId),firstTarget=fact.destination==='tools'?this.options.inventory():this.options.gold();
    if(!firstSource||!firstTarget)return 'missing-anchor';
    const owned=this.active=new AbortController(),abort=()=>owned.abort();context.signal.addEventListener('abort',abort,{once:true});
    const localContext:EffectContext={generation:context.generation,signal:owned.signal},scene=this.scene;
    const root=scene.add.container(0,0).setName('gift/delivery').setDepth(1000).setData('gift',{...fact});this.options.parent.add(root);
    const path=scene.add.graphics().setName('gift/path'),halo=scene.add.graphics().setName('gift/source-halo');root.add([path,halo]);
    const payload=scene.add.container(0,0).setName('gift/payload');root.add(payload);
    const coin=fact.destination==='gold',color=coin?T.brass:['T03','T04'].includes(fact.rewardDefinitionId)?T.red:T.jade;
    const plate=scene.add.graphics().fillStyle(T.paperLight,1).fillRoundedRect(-19,-22,38,44,6).lineStyle(2,color,1).strokeRoundedRect(-19,-22,38,44,6);
    // Native suit + vial silhouette identifies the actual dye without loading or generating new art.
    if(!coin)plate.lineStyle(1,color,.8).strokeRoundedRect(-9,-3,18,17,4).strokeRect(-5,-8,10,5);
    else plate.lineStyle(2,color,1).strokeCircle(0,0,13);
    const glyph=scene.add.text(0,coin?0:1,coin?'金':glyphs[fact.rewardDefinitionId]??'',{fontFamily:UI_FONT,fontSize:coin?'17px':'23px',fontStyle:'bold',color:coin?C.brass:['T03','T04'].includes(fact.rewardDefinitionId)?C.red:C.jade}).setOrigin(.5);
    payload.add([plate,glyph]);
    const caption=scene.add.text(0,0,'',{fontFamily:UI_FONT,fontSize:'14px',fontStyle:'bold',color:C.ink,backgroundColor:C.paperLight,padding:{x:7,y:4},align:'center',resolution:Math.max(1.5,1/scene.scale.zoom)}).setOrigin(.5).setName('gift/arrival');root.add(caption);
    const reduced=this.options.reducedMotion(),started=performance.now();let landed=false,finished=false;
    const copy=coin?`${fact.sourceName} → 金币\n道具箱已满 +${fact.amount}金 · ${fact.before}→${fact.after}`:`${fact.sourceName} → 道具箱\n${fact.rewardName} +${fact.amount} · ${fact.before}→${fact.after}/${fact.capacity}`;
    const sourceCopy=coin?`${fact.sourceName} · 包满转金币`:`${fact.sourceName} · 赠${fact.rewardName}`;
    return new Promise<GiftDeliveryResult>(resolve=>{
      const finish=(result:GiftDeliveryResult)=>{
        if(finished)return;finished=true;clearTimeout(timer);scene.events.off('update',update);owned.signal.removeEventListener('abort',cancel);context.signal.removeEventListener('abort',abort);
        // Stop the source owner's pending pulse too. Its cleanup restores the original inner face.
        owned.abort();root.destroy();if(this.active===owned)this.active=undefined;resolve(result);
      };
      const cancel=()=>finish('cancelled');
      const update=()=>{
        if(owned.signal.aborted||!scene.sys.settings.active||!root.active||this.options.blocked?.()){finish('cancelled');return;}
        const source=this.options.source(fact.sourceInstanceId),target=coin?this.options.gold():this.options.inventory();
        if(!source||!target){finish('missing-anchor');return;}
        const viewportWidth=scene.scale.width/scene.scale.zoom;
        // Land beside the real entry, keeping its existing quantity/currency text unobscured.
        const to={x:target.x>=48?target.x-24:target.x+target.width+24,y:center(target).y};
        to.x=Math.max(22,Math.min(viewportWidth-22,to.x));
        const from={x:source.x+source.width/2,y:source.y+source.height+5},elapsed=performance.now()-started,flight=reduced?1:Math.min(1,Math.max(0,(elapsed-WINDUP)/FLIGHT));
        const arrival=reduced||elapsed>=WINDUP+FLIGHT,phase=arrival?'arrival':elapsed<WINDUP?'source':'flight';
        root.setData('phase',phase).setData('flight',flight).setData('elapsed',elapsed);
        halo.clear().lineStyle(3,color,arrival?.3:.95).strokeRoundedRect(source.x-3,source.y-3,source.width+6,source.height+6,8);
        path.clear().lineStyle(2,color,arrival?.4:.75);
        // The route always joins the actual source to its destination, including the static reduced fallback.
        const segments=24,limit=arrival||reduced?1:flight;
        path.beginPath().moveTo(from.x,from.y);
        for(let i=1;i<=segments;i++){const p=stageGiftFlight(from,to,limit*i/segments);path.lineTo(p.x,p.y);}path.strokePath();
        const p=stageGiftFlight(from,to,flight);payload.setPosition(p.x,p.y).setVisible(reduced||elapsed>=WINDUP);
        const end=stageGiftFlight(from,to,Math.max(0,flight-.04)),angle=Math.atan2(p.y-end.y,p.x-end.x);
        if(flight>0&&flight<1)path.fillStyle(color,1).fillTriangle(p.x,p.y,p.x-9*Math.cos(angle-.45),p.y-9*Math.sin(angle-.45),p.x-9*Math.cos(angle+.45),p.y-9*Math.sin(angle+.45));
        if(arrival){
          payload.setPosition(to.x,to.y).setScale(reduced?1:1+.12*Math.sin(Math.PI*Math.min(1,(elapsed-WINDUP-FLIGHT)/180)));
          caption.setText(copy);
          const half=caption.width/2+6,width=scene.scale.width/scene.scale.zoom;
          caption.setPosition(Math.min(width-half,Math.max(half,center(target).x)),target.y-caption.height/2-10);
          if(caption.y-caption.height/2<4)caption.y=target.y+target.height+caption.height/2+8;
          if(!landed){landed=true;root.setData('arrived',true);this.options.arrived?.(fact);}
        }else{
          caption.setText(sourceCopy).setPosition(from.x,from.y+caption.height/2+29);
          const half=caption.width/2+6,width=scene.scale.width/scene.scale.zoom;caption.x=Math.min(width-half,Math.max(half,caption.x));
        }
        if(elapsed>=(reduced?READ:WINDUP+FLIGHT+READ))finish('complete');
      };
      const timer=setTimeout(()=>finish('complete'),(reduced?READ:WINDUP+FLIGHT+READ)+250);
      owned.signal.addEventListener('abort',cancel,{once:true});scene.events.on('update',update);update();
      if(!reduced&&!finished)void Promise.resolve().then(()=>this.options.pulseSource(fact.sourceInstanceId,localContext,WINDUP+120)).catch(()=>finish('cancelled'));
    });
  }
}
