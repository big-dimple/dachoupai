import type Phaser from 'phaser';
import type {HeroClimaxValue,HeroClimaxView} from './HeroClimax';
import type {JokerKeyHighlight} from './JokerKeyHighlight';
import type {Box} from './layout';
import {heroEyesKey,portraitFocusKey} from './portraits';
import {heroFocusCrop} from './HeroClimaxFocus';
import {textDensity} from './TextRaster';

export interface HeroClimaxPlacement {eyes?:Box;source?:Box;target?:Box}
/** The actual table owns every number. This view adds only a short local gaze. */
export function mountHeroClimax(scene:Phaser.Scene,root:Phaser.GameObjects.Container,viewport:Box,key:JokerKeyHighlight,value:HeroClimaxValue,reduced:boolean,placement?:HeroClimaxPlacement):HeroClimaxView|undefined {
 const id=key.heroId;if(!id||placement&&!placement.eyes)return;
 const dedicated=scene.textures.exists(heroEyesKey(id)),texture=dedicated?heroEyesKey(id):portraitFocusKey(id);if(!scene.textures.exists(texture))return;
 const width=Math.min(208,viewport.width-32),box=placement?.eyes??{x:viewport.x+16,y:viewport.y+viewport.height*.22,width,height:width*3/8};
 const source=scene.textures.get(texture).getSourceImage() as HTMLImageElement,crop=dedicated?{x:0,y:0,width:source.width,height:source.height}:heroFocusCrop(id,source.width,source.height),scale=Math.min(box.width/crop.width,box.height/crop.height,1/textDensity(scene));
 const b={x:box.x+(box.width-crop.width*scale)/2,y:box.y+(box.height-crop.height*scale)/2,width:crop.width*scale,height:crop.height*scale};
 const group=scene.add.container(0,0).setName('joker/key-focus').setData('heroClimax',true).setData('eventId',key.eventId).setData('phase',reduced?'still':'charge').setData('bounds',b).setData('inline',true).setData('factor',value.after);root.add(group);
 const eye=scene.add.image(b.x+(source.width/2-crop.x)*scale,b.y+(source.height/2-crop.y)*scale,texture).setOrigin(.5).setCrop(crop.x,crop.y,crop.width,crop.height).setScale(scale).setName('hero/climax-eyes').setData('camera',dedicated?'dedicated-eye-strip':'stable-eye-strip').setData('sampledCrop',crop).setData('visibleBounds',b).setData('assetId',id+(dedicated?'.eyes':'.focus'));group.add(eye);
 let disposed=false,still=reduced,struck=false,resolveRelease:(()=>void)|undefined;const owned=new Set<Phaser.Tweens.Tween>();
 const stop=()=>{for(const tween of owned)tween.remove();owned.clear();};
 const dispose=(destroy=true)=>{if(disposed)return;disposed=true;stop();resolveRelease?.();resolveRelease=undefined;if(destroy&&group.active)group.destroy();};group.once('destroy',()=>dispose(false));
 if(!still){eye.setAlpha(0);owned.add(scene.tweens.add({targets:eye,alpha:1,duration:90,ease:'Sine.Out'}));}else eye.setAlpha(.8);
 return {group,inline:true,dispose,reduce:()=>{still=true;stop();eye.setAlpha(.8);group.setData('phase','still');resolveRelease?.();resolveRelease=undefined;},strike:()=>{if(disposed||struck)return;struck=true;stop();eye.setAlpha(still?.8:1);group.setData('phase',still?'still':'strike');},release:()=>new Promise<void>(resolve=>{if(disposed||still){resolve();return;}group.setData('phase','release');resolveRelease=resolve;owned.add(scene.tweens.add({targets:eye,alpha:0,duration:90,ease:'Sine.In',onComplete:()=>{resolveRelease=undefined;resolve();}}));})};
}
