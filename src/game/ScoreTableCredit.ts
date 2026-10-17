import type Phaser from 'phaser';
import type {EffectContext} from '../core/EffectQueue';
import type {ScoreAnimate} from './ScorePosture';
import {heatText} from './scoreText';
import {prepareTextScale,crispText} from './TextRaster';
import {SCORE_FONT,PAPER_CSS as C} from './theme';

/** The existing hand total remains visible as its saved points enter the round HUD. */
export async function presentScoreCredit(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,options:{total:Phaser.GameObjects.Text;hud:Phaser.GameObjects.Text;value:string;eventId:string;duration:number;reduced:boolean;context:EffectContext;animate:ScoreAnimate}):Promise<void>{
 if(options.context.signal.aborted||options.reduced)return;
 const a=options.total.getBounds(),b=options.hud.getBounds(),ghost=scene.add.text(0,0,'+'+heatText(options.value),{fontFamily:SCORE_FONT,fontSize:'24px',fontStyle:'bold',color:C.ink,backgroundColor:'#fff9ee'}).setOrigin(.5).setName('score/credit').setData('eventId',options.eventId);
 prepareTextScale(ghost,1);
 // Start outside the original digits. Narrow phones already credit the same
 // saved value in-place; there is no room for another travelling bitmap.
 const start={x:a.right+24+ghost.width/2,y:a.centerY};
 if(start.x+ghost.width/2>scene.scale.width*scene.scale.zoom-8){ghost.destroy();return;}
 ghost.setPosition(start.x,start.y);parent.add(ghost);
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;options.context.signal.removeEventListener('abort',dispose);ghost.destroy();};options.context.signal.addEventListener('abort',dispose,{once:true});
 try{const p={t:0};await options.animate({targets:p,t:1,duration:options.duration,ease:'Linear',onUpdate:()=>{if(disposed)return;const t=p.t,u=1-t;ghost.setPosition(u*u*start.x+2*u*t*start.x+t*t*b.centerX,u*u*start.y+2*u*t*Math.max(a.bottom+20,b.bottom+24)+t*t*b.centerY).setAlpha(Math.max(0,1-t/.85)).setScale(1-t*.3);crispText(ghost);}},options.context);}finally{dispose();}
}

/** H and M converge once, after every saved numeric event, into the hand total. */
export async function presentScoreConvergence(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,options:{heat:Phaser.GameObjects.Text;mult:Phaser.GameObjects.Text;total:Phaser.GameObjects.Text;duration:number;context:EffectContext;animate:ScoreAnimate}):Promise<void>{
 if(options.context.signal.aborted)return;const total=options.total.getBounds(),to=parent.getWorldTransformMatrix().applyInverse(total.centerX,total.centerY),from=[options.heat,options.mult].map(text=>{const b=text.getBounds();return parent.getWorldTransformMatrix().applyInverse(b.centerX,b.centerY);});
 const ink=scene.add.graphics().setName('score/converge').setData('from',from).setData('to',to);parent.add(ink);let disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;options.context.signal.removeEventListener('abort',dispose);ink.destroy();};options.context.signal.addEventListener('abort',dispose,{once:true});
 try{const p={t:0};await options.animate({targets:p,t:1,duration:options.duration,ease:'Cubic.In',onUpdate:()=>{if(disposed)return;ink.clear();from.forEach((a,i)=>{const x=a.x+(to.x-a.x)*p.t,y=a.y+(to.y-a.y)*p.t;ink.fillStyle(i?0xb8473a:0x247b93,.75).fillCircle(x,y,3.5*(1-p.t)+1);});}},options.context);}finally{dispose();}
}
