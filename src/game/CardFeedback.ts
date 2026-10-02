import type Phaser from 'phaser';
import {PAPER_THEME as T} from './theme';

interface CardSurface {container:Phaser.GameObjects.Container;background:Phaser.GameObjects.Rectangle;edgeGlow?:Phaser.GameObjects.Graphics}
export interface CardFeedbackState {selected?:boolean;scoring?:boolean;hovered?:boolean;focused?:boolean}
/** Every hand/preview state keeps its rectangular backing neutral, even during dealing. */
export function paintCardFeedback(view:CardSurface,state:CardFeedbackState):void {
  const width=Number(view.container.getData('width')),height=Number(view.container.getData('height'));
  const emphasized=!!(state.hovered||state.focused),lineWidth=emphasized?3:2,color=emphasized?0xffd990:state.scoring?T.jade:T.red;
  view.background.setStrokeStyle(1,T.brass);
  view.edgeGlow?.clear().lineStyle(lineWidth,color,.95)
    .strokeRoundedRect(-width/2-1,-height/2-1,width+2,height+2,Math.min(7,width*.09))
    .setAlpha(emphasized?1:(state.selected||state.scoring)?.85:0)
    .setData('feedback',{...state,shape:'rounded',width:lineWidth,color});
}
