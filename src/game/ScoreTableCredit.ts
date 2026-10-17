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
 try{const p={t:0};await options.animate({targets:p,t:1,duration:options.duration,ease:'Linear',onUpdate:()=>{if(disposed)return;const t=p.t,u=1-t;ghost.setPosition(u*u*start.x+2*u*t*start.x+t*t*b.centerX,u*u*start.y+2*u*t*(a.y-140)+t*t*b.centerY).setAlpha(Math.max(0,1-t/.85)).setScale(1-t*.3);crispText(ghost);}},options.context);}finally{dispose();}
}
