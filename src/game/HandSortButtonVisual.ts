import type Phaser from 'phaser';
import type {Box} from './layout';
import {crispText} from './TextRaster';
import {PAPER_THEME} from './theme';

interface Parts {
 art:Phaser.GameObjects.Container;face:Phaser.GameObjects.Graphics;edge:Phaser.GameObjects.Graphics;
 glow:Phaser.GameObjects.Graphics;label:Phaser.GameObjects.Text;bounds:Box;
}
export function isHandSortControl(name:string):boolean {return ['action/sort-rank','action/sort-suit','selection/switch-type'].includes(name);}
/** Display objects move; the original rectangle keeps the complete 44px hit. */
export function attachHandSortVisual(scene:Phaser.Scene,button:Phaser.GameObjects.Rectangle,parts:Parts,reducedMotion:()=>boolean){
 const {art,face,edge,glow,label,bounds:b}=parts;
 let hovered=false,pressed=false,last='',baseY=b.y+b.height/2-1;
 glow.setVisible(false);
 const stop=()=>scene.tweens.killTweensOf([art,label]);
 const alignLabel=()=>{
  label.setFontStyle('500');
  const m=label.context.measureText(label.text),ascent=label.getTextMetrics().ascent;
  baseY=!label.text.includes('\n')&&typeof ascent==='number'&&Number.isFinite(ascent)&&Number.isFinite(m.actualBoundingBoxAscent)&&Number.isFinite(m.actualBoundingBoxDescent)
   ?b.y+b.height/2+label.displayOriginY-ascent-(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2
   :b.y+b.height/2-1;
 };
 const refresh=(animate=false)=>{
  const enabled=!!button.input?.enabled,reduced=reducedMotion()||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!enabled||document.hidden)hovered=pressed=false;
  const key=[enabled,hovered,pressed,reduced,label.text,label.style.fontSize,label.style.resolution].join('|');if(key===last)return;last=key;
  stop();alignLabel();const lift=hovered&&!pressed&&!reduced?2:0;
  face.clear();edge.clear();
  if(enabled&&(hovered||pressed)){
   if(hovered&&!pressed)face.fillStyle(PAPER_THEME.ink,.07).fillRoundedRect(2,3,b.width-4,b.height-4,5);
   face.fillStyle(PAPER_THEME.paperLight,pressed?.65:.92).fillRoundedRect(1,1,b.width-2,b.height-2,5);
   edge.lineStyle(1,PAPER_THEME.jade,pressed?.35:.18).strokeRoundedRect(1.5,1.5,b.width-3,b.height-3,5);
  }
  art.setScale(1);label.setScale(1);
  const settle=()=>crispText(label);
  if(animate&&!reduced){scene.tweens.add({targets:art,y:b.y-lift,duration:100,ease:'Sine.Out'});scene.tweens.add({targets:label,y:baseY-lift,duration:100,ease:'Sine.Out',onComplete:settle});}
  else {art.setPosition(b.x,b.y-lift);label.setPosition(b.x+b.width/2,baseY-lift);settle();}
 };
 const enter=(pointer:Phaser.Input.Pointer)=>{if(pointer.wasTouch||!button.input?.enabled)return;hovered=true;refresh(true);};
 const leave=()=>{hovered=false;refresh(true);};
 const touch=(pointer:Phaser.Input.Pointer)=>{if(pointer.wasTouch){hovered=false;last='';refresh();}};
 const reset=()=>{hovered=pressed=false;last='';refresh();};
 const visibility=()=>{if(document.hidden)reset();};
 const tick=()=>refresh();
 button.on('pointerover',enter).on('pointerout',leave).on('pointerdown',touch);
 window.addEventListener('blur',reset);document.addEventListener('visibilitychange',visibility);scene.events.on('postupdate',tick);
 button.setData('sortVisualRefresh',tick);
 const dispose=()=>{stop();scene.events.off('postupdate',tick);window.removeEventListener('blur',reset);document.removeEventListener('visibilitychange',visibility);button.off('pointerover',enter).off('pointerout',leave).off('pointerdown',touch);};
 button.once('destroy',dispose);
 return {press:()=>{pressed=true;refresh();},release:()=>{pressed=false;refresh();},cancel:reset};
}
