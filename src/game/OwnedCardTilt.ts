import type Phaser from 'phaser';
import {SpringCardTransform} from './SpringMotion';

/** Adapted from fbb614a8 PhaserCardTilt: layout -> score spring -> tilt -> base art.
 * Reads pointer input only; the existing outer hit/drag owner keeps all control. */
export function ownedTiltLayer(scene:Phaser.Scene,spring:Phaser.GameObjects.Container){
 let tilt=spring.getData('tiltRoot') as Phaser.GameObjects.Container|undefined;
 if(!tilt?.active){tilt=scene.add.container(0,0).setName('owned-joker/tilt-pose');spring.add(tilt);spring.setData('tiltRoot',tilt);}
 return tilt;
}

export class OwnedCardTilt {
 readonly motion=new SpringCardTransform(0,0);
 private readonly art?:Phaser.GameObjects.Container;
 private readonly baseArt:{x:number;y:number};
 private destroyed=false;
 constructor(private readonly scene:Phaser.Scene,private readonly marker:Phaser.GameObjects.Container,
  private readonly tilt:Phaser.GameObjects.Container,private readonly allowed:()=>boolean){
  this.art=tilt.list.find(o=>o.getData('f09-active')!==undefined) as Phaser.GameObjects.Container|undefined;
  this.baseArt={x:this.art?.x??0,y:this.art?.y??0};
  if(typeof window!=='undefined'){window.addEventListener('pointermove',this.move,true);window.addEventListener('pointerup',this.reset);window.addEventListener('pointercancel',this.reset);window.addEventListener('blur',this.reset);}
  if(typeof document!=='undefined')document.addEventListener('visibilitychange',this.visibility);
 }
 /** Nominal outer-card coordinates are never normalized from the tilted bounds. */
 point(worldX:number,worldY:number):void {
  if(this.destroyed||!this.allowed())return;
  const frame=this.marker.getData('frame') as {width:number;height:number},p=this.marker.getLocalPoint(worldX,worldY);
  if(!frame?.width||!frame.height)return;
  const inside=Math.abs(p.x)<=frame.width/2&&Math.abs(p.y)<=frame.height/2;
  const nx=inside?Math.max(-1,Math.min(1,p.x/(frame.width/2))):0,ny=inside?Math.max(-1,Math.min(1,p.y/(frame.height/2))):0;
  const phone=this.scene.game.canvas.getBoundingClientRect().width<700,angle=(phone?1.5:3)*Math.PI/180,parallax=phone?1:2;
  this.motion.setTarget(nx*parallax,ny*parallax,undefined,nx*angle);
  this.motion.scaleX.setTarget(1-Math.abs(nx)*.025);this.motion.scaleY.setTarget(1-Math.abs(ny)*.025);
 }
 private readonly move=(e:PointerEvent)=>{
  if(this.destroyed||typeof document!=='undefined'&&document.querySelector('dialog[open]'))return;
  const r=this.scene.game.canvas.getBoundingClientRect(),camera=this.scene.cameras.main;
  const point=camera.getWorldPoint((e.clientX-r.left)*this.scene.scale.width/r.width,(e.clientY-r.top)*this.scene.scale.height/r.height);
  this.point(point.x,point.y);
 };
 private readonly visibility=()=>{if(document.hidden)this.reset();};
 update(effectiveDtSeconds:number,reduced:boolean):void {
  if(this.destroyed)return;
  if(reduced||typeof document!=='undefined'&&document.hidden){this.reset();return;}
  if(!Number.isFinite(effectiveDtSeconds)||effectiveDtSeconds<=0)return;
  if(!this.allowed()){this.reset();return;}
  this.motion.step(effectiveDtSeconds);
  this.tilt.setRotation(this.motion.rotation.value).setScale(this.motion.scaleX.value,this.motion.scaleY.value);
  if(this.art?.active)this.art.setPosition(this.baseArt.x+this.motion.x.value,this.baseArt.y+this.motion.y.value);
 }
 readonly reset=():void=>{
  this.motion.reset();if(this.tilt.active)this.tilt.setRotation(0).setScale(1);
  if(this.art?.active)this.art.setPosition(this.baseArt.x,this.baseArt.y);
 };
 destroy():void {
  if(this.destroyed)return;this.reset();this.destroyed=true;
  if(typeof window!=='undefined'){window.removeEventListener('pointermove',this.move,true);window.removeEventListener('pointerup',this.reset);window.removeEventListener('pointercancel',this.reset);window.removeEventListener('blur',this.reset);}
  if(typeof document!=='undefined')document.removeEventListener('visibilitychange',this.visibility);
 }
}
