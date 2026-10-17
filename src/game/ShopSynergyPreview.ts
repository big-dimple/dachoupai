import type Phaser from 'phaser';
import type {Box} from './layout';
import type {ShopSynergyResult} from './ShopSynergy';
import {UI_FONT} from './theme';
import {crispText,textDensity} from './TextRaster';
import type {SceneView} from './SceneView';
import type {shopDecisionCopy} from './ShopDecisionCopy';

/** Read-only candidate feedback. Own every tween and object as one disposable preview. */
export class ShopSynergyPreview {
  private root?:Phaser.GameObjects.Container;
  private pulses:Phaser.Tweens.Tween[]=[];
  clear():void {
    for(const pulse of this.pulses)pulse.remove();this.pulses=[];
    this.root?.destroy(true);this.root=undefined;
  }
  show(scene:Phaser.Scene,offerId:string,name:string,result:ShopSynergyResult,held:Map<string,Box>,bubble:Box|undefined,reduced:boolean,touch:boolean,options?:{view:SceneView;details:()=>void;copy:ReturnType<typeof shopDecisionCopy>;anchor?:Box}):void {
    this.clear();
    const root=scene.add.container().setDepth(30).setName('shop/synergy-preview').setData('offerId',offerId);this.root=root;
    for(const match of result.matches){
      const b=held.get(match.instanceId);if(!b)continue;
      const aura=scene.add.graphics().fillStyle(0xc49329,.20).fillRoundedRect(b.x-3,b.y-3,b.width+6,b.height+6,8)
        .setName('shop/synergy-aura').setData('instanceId',match.instanceId).setData('reason',match.reason);
      const label=scene.add.text(b.x+b.width/2,b.y+b.height-18,'可配合',{fontFamily:UI_FONT,fontSize:'14px',color:'#66420c',backgroundColor:'#fff1bf',padding:{x:2,y:1},resolution:textDensity(scene)}).setOrigin(.5,0).setName('shop/synergy-mark');crispText(label);
      root.add([aura,label]);
      if(!reduced)this.pulses.push(scene.tweens.add({targets:aura,alpha:{from:.35,to:1},duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}));
    }
    if(!bubble)return;
    const lines=result.matches.map(m=>'「'+m.name+'」'+m.shortReason);
    const reason=options?.copy.connection??result.tradeoff??(lines.length?'已持'+lines[0]+(lines.length>1?'；另有'+(lines.length-1)+'张可配合':''):result.reason||'尚无已持配合；先看单卡条件。');
    const button=touch&&options?{x:bubble.x+bubble.width-94,y:bubble.y+bubble.height-52,width:84,height:44}:undefined;
    const title=scene.add.text(bubble.x+10,bubble.y+8,name+' · '+(options?.copy.transaction??result.cashNote??'条件对照'),{fontFamily:UI_FONT,fontSize:'15px',fontStyle:'bold',color:'#203f3b',resolution:textDensity(scene)}).setName('shop/synergy-title');
    const fullReason=reason;
    const text=scene.add.text(bubble.x+10,bubble.y+32,fullReason,{fontFamily:UI_FONT,fontSize:'14px',color:'#263b37',resolution:textDensity(scene),maxLines:2,wordWrap:{width:bubble.width-(button?114:20),useAdvancedWrap:true},lineSpacing:3}).setName('shop/synergy-reason').setData('fullText',fullReason);
    let titleCopy=title.text;while(title.width>bubble.width-20&&titleCopy.length){titleCopy=titleCopy.slice(0,-1);title.setText(titleCopy+'…');}
    crispText(title);crispText(text);
    const height=Math.max(bubble.height,text.height+44),plate=scene.add.graphics().fillStyle(0xf8f7ef,1).fillRoundedRect(bubble.x,bubble.y,bubble.width,height,6).lineStyle(1,0x7e9990,1).strokeRoundedRect(bubble.x+.5,bubble.y+.5,bubble.width-1,height-1,6);
    if(options?.anchor){const a=options.anchor,clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(v,hi)),cx=bubble.x+bubble.width/2,cy=bubble.y+height/2,sx=clamp(cx,a.x,a.x+a.width),sy=clamp(cy,a.y,a.y+a.height),ex=clamp(sx,bubble.x,bubble.x+bubble.width),ey=clamp(sy,bubble.y,bubble.y+height);root.add(scene.add.graphics().lineStyle(2,0x7e9990,.85).lineBetween(sx,sy,ex,ey).fillStyle(0x7e9990,1).fillCircle(sx,sy,3).setName('shop/synergy-anchor'));}
    root.add([plate,title,text]);
    if(button){const hit=options!.view.button(button,'看详情 ›','shop/selected-details',options!.details);root.add([hit.getData('buttonArt'),hit.getData('label'),hit]);}
  }
}
