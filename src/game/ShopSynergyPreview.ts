import type Phaser from 'phaser';
import type {Box} from './layout';
import type {ShopSynergyResult} from './ShopSynergy';
import {UI_FONT} from './theme';

/** Read-only candidate feedback. Own every tween and object as one disposable preview. */
export class ShopSynergyPreview {
  private root?:Phaser.GameObjects.Container;
  private pulses:Phaser.Tweens.Tween[]=[];
  clear():void {
    for(const pulse of this.pulses)pulse.remove();this.pulses=[];
    this.root?.destroy(true);this.root=undefined;
  }
  show(scene:Phaser.Scene,offerId:string,name:string,result:ShopSynergyResult,held:Map<string,Box>,bubble:Box,reduced:boolean,touch:boolean):void {
    this.clear();
    const root=scene.add.container().setDepth(30).setName('shop/synergy-preview').setData('offerId',offerId);this.root=root;
    for(const match of result.matches){
      const b=held.get(match.instanceId);if(!b)continue;
      const aura=scene.add.graphics().lineStyle(3,0xc49329,.92).strokeRoundedRect(b.x-2,b.y-2,b.width+4,b.height+4,6)
        .setName('shop/synergy-aura').setData('instanceId',match.instanceId).setData('reason',match.reason);
      const label=scene.add.text(b.x+b.width/2,b.y+b.height-18,'可配合',{fontFamily:UI_FONT,fontSize:'14px',color:'#66420c',backgroundColor:'#fff1bf',padding:{x:2,y:1}}).setOrigin(.5,0).setName('shop/synergy-mark');
      root.add([aura,label]);
      if(!reduced)this.pulses.push(scene.tweens.add({targets:aura,alpha:{from:.35,to:1},duration:900,yoyo:true,repeat:-1,ease:'Sine.easeInOut'}));
    }
    const lines=result.matches.map(m=>'「'+m.name+'」'+m.shortReason);
    const reason=lines.length?'已持'+lines[0]+(lines.length>1?'\n还可配合：'+result.matches.slice(1).map(m=>m.name).join('、'):''):result.tradeoff??(result.cashNote?'暂未确认配合，先看各自条件。':result.reason||'暂未确认配合，先看各自条件。');
    const text=scene.add.text(bubble.x+10,bubble.y+7,name+' · '+(result.cashNote??'条件待核对')+'\n'+reason+(touch?'\n再点此商品查看详情':'\n各自满足条件才生效'),{fontFamily:UI_FONT,fontSize:'14px',color:'#604416',wordWrap:{width:bubble.width-20,useAdvancedWrap:true},lineSpacing:3}).setName('shop/synergy-reason');
    const height=text.height+14,y=bubble.height?Math.min(bubble.y,bubble.y+bubble.height-height):bubble.y;
    text.setY(y+7);
    const plate=scene.add.graphics().fillStyle(0xfff4d2,.98).fillRoundedRect(bubble.x,y,bubble.width,height,6).lineStyle(1,0xb38733,.9).strokeRoundedRect(bubble.x,y,bubble.width,height,6);
    root.add([plate,text]);
  }
}
