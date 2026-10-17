import Phaser from 'phaser';
import {StageGiftDelivery} from '../src/game/StageGiftDelivery';
import {c12GiftEvidence} from './fixtures/c12-gift-delivery';
import {jokerArtKey,jokerArtPreviewUrl} from '../src/game/jokerArt';
import {PAPER_CSS as C,UI_FONT} from '../src/game/theme';
import type {SavedStageGift} from '../src/game/SavedStageGift';

const query=new URLSearchParams(location.search),full=query.has('full'),reduced=query.has('reduced'),width=innerWidth,height=innerHeight;
const evidence=await c12GiftEvidence(full,false,Number(query.get('cursor')??0));
const observed:{data:typeof evidence;frames:unknown[];outcomes:string[];arrivals:string[];status:string}={data:evidence,frames:[],outcomes:[],arrivals:[],status:'ready'};
class GiftComponentScene extends Phaser.Scene {
  delivery!:StageGiftDelivery;controller?:AbortController;source!:Phaser.GameObjects.Container;face!:Phaser.GameObjects.Container;inventory!:Phaser.GameObjects.Text;gold!:Phaser.GameObjects.Text;
  preload(){this.load.image(jokerArtKey('c12')!,new URL(jokerArtPreviewUrl('c12')!,location.origin+'/').href);}
  create(){
    const text=(x:number,y:number,copy:string,size=14)=>this.add.text(x,y,copy,{fontFamily:UI_FONT,fontSize:size+'px',color:C.ink});
    text(18,18,'锦上添花 · 已保存到账组件',20);text(18,50,'确定夹具：同场普通同花700 → 普通顺子580',width<500?13:16);
    text(18,75,'来源实例 owned/c12 · 演出不领取、不自动使用',13);
    const sx=width<500?65:180,sy=height<500?190:220,cw=90,ch=124;
    this.source=this.add.container(sx,sy);this.face=this.add.container(0,0);this.source.add(this.face);
    this.face.add(this.add.rectangle(0,0,cw,ch,0xfff9ee).setStrokeStyle(2,0x3f606b));
    this.face.add(this.add.image(0,-10,jokerArtKey('c12')!).setDisplaySize(cw-5,ch-28).setName('actual-c12-art'));
    this.face.add(text(-cw/2+5,ch/2-24,'锦上添花',16));
    text(sx-cw/2,sy+ch/2+14,'真实来源牌',14);
    const tx=width<500?width-87:width-190,ty=height<500?height-110:Math.min(height-150,475);
    this.add.rectangle(tx,ty,136,52,0xe2e8e5).setStrokeStyle(2,0x3f606b);
    this.inventory=text(tx-61,ty-10,`道具箱 ${evidence.before.consumables.length}/2`,17);
    this.add.rectangle(tx,ty-105,136,40,0xfff9ee).setStrokeStyle(1,0x7b7365);
    // The after-clear base reward is already part of the saved state; c12's own event owns 30→32.
    this.gold=text(tx-61,ty-115,`金币 ${full?evidence.facts[0].before:evidence.after.gold}`,17);
    const parent=this.add.container(0,0);
    this.delivery=new StageGiftDelivery(this,{parent,source:id=>id==='owned/c12'?{x:sx-cw/2,y:sy-ch/2,width:cw,height:ch}:undefined,
      inventory:()=>({x:tx-68,y:ty-26,width:136,height:52}),gold:()=>({x:tx-68,y:ty-125,width:136,height:40}),reducedMotion:()=>reduced,
      pulseSource:(_id,context,duration)=>new Promise<void>(resolve=>{
        const restore=()=>{this.tweens.killTweensOf(this.face);this.face.setPosition(0,0).setAngle(0);context.signal.removeEventListener('abort',restore);resolve();};
        context.signal.addEventListener('abort',restore,{once:true});this.tweens.add({targets:this.face,y:-14,angle:-3,duration:duration*.45,yoyo:true,ease:'Sine.easeInOut',onComplete:restore});
      }),arrived:fact=>{observed.arrivals.push(fact.key);if(fact.destination==='tools')this.inventory.setText(`道具箱 ${fact.after}/${fact.capacity}`);else this.gold.setText('金币 '+fact.after);}});
    const play=async()=>{observed.status='playing';const controller=this.controller=new AbortController();const outcome=await this.delivery.play(evidence.facts[0],{generation:1,signal:controller.signal});observed.outcomes.push(outcome);observed.status='done';};
    document.getElementById('play')!.onclick=()=>void play();document.getElementById('again')!.onclick=()=>void play();document.getElementById('skip')!.onclick=()=>this.controller?.abort();
    this.events.on('update',()=>{const root=parent.getByName('gift/delivery') as Phaser.GameObjects.Container|undefined,payload=root?.getByName('gift/payload') as Phaser.GameObjects.Container|undefined,caption=root?.getByName('gift/arrival') as Phaser.GameObjects.Text|undefined;observed.frames.push({time:performance.now(),phase:root?.getData('phase'),flight:root?.getData('flight'),source:{x:this.face.x,y:this.face.y,angle:this.face.angle},payload:payload?.active?{x:payload.x,y:payload.y,visible:payload.visible,bounds:payload.getBounds()}:undefined,target:full?{x:tx-68,y:ty-125,width:136,height:40}:{x:tx-68,y:ty-26,width:136,height:52},caption:caption?.text,inventory:this.inventory.text,gold:this.gold.text,nodes:parent.list.length});});
    const fixture={game:this.game,scene:this,observed,run:play,fact:evidence.facts[0] as SavedStageGift};Object.assign(window,{__c12Gift:fixture});
  }
}
new Phaser.Game({type:Phaser.CANVAS,width,height,parent:'stage',backgroundColor:'#f3eadb',scene:GiftComponentScene,render:{antialias:true},fps:{target:60},scale:{mode:Phaser.Scale.NONE}});
