import type Phaser from 'phaser';
import type {Box} from './layout';
import type {routeFitCue} from './RouteFitCue';
/** Paper binding: a quiet double edge with short corner stitches; route is not selection. */
export function routeFrame(scene:Phaser.Scene,b:Box,cue:NonNullable<ReturnType<typeof routeFitCue>>,important=false){
 const g=scene.add.graphics(),x=b.x-2,y=b.y-2,w=b.width+4,h=b.height+4,k=Math.min(important?14:10,w*.2,h*.18);
 g.lineStyle(1,cue.ink,.8).strokeRoundedRect(x,y,w,h,5).lineStyle(1,cue.ink,.26).strokeRoundedRect(x+3,y+3,w-6,h-6,3);
 g.lineStyle(important?2.5:2,cue.ink,.9);for(const [cx,cy,dx,dy] of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]])g.beginPath().moveTo(cx+dx*k,cy+dy*2).lineTo(cx+dx*2,cy+dy*2).lineTo(cx+dx*2,cy+dy*k).strokePath();
 return g.setData('route',cue.focus);
}
