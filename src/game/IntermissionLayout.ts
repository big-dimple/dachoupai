import type {Box} from './layout';

/** Measure the complete result, then place it inside the safe reading viewport. */
export function resultPlacement(top:number,bottom:number,content:Pick<Box,'y'|'height'>,offset=0){
  const available=Math.max(1,bottom-top),overflow=Math.max(0,content.height-available);
  const scroll=Math.max(0,Math.min(overflow,offset));
  return {overflow,scroll,y:top+Math.max(0,(available-content.height)/2)-content.y-scroll};
}

export function resultLayout(width:number,height:number,top:number,contentHeight:number){
  const short=height<500,portrait=width<700&&height>width,tight=portrait&&height<=700;
  const wide=width>=1100&&!short,w=Math.min(wide?1120:900,width-(wide?96:24)),x=(width-w)/2;
  const bodyY=top+(short?54:portrait?64:80),sideWidth=wide?Math.min(312,w*.30):0;
  const score:Box={x,y:bodyY,width:wide?w-sideWidth-28:short?w*.64-12:w,height:contentHeight};
  const next:Box=wide?{x:x+w-sideWidth,y:bodyY+12,width:sideWidth,height:112}:
    short?{x:x+w*.64,y:bodyY,width:w*.36,height:94}:
    {x,y:score.y+score.height+16,width:w,height:portrait?86:116};
  const actionX=wide||short?next.x:portrait?x:x+w-288,actionWidth=wide||short?next.width:portrait?w:288;
  const actionY=wide||short||portrait?next.y+next.height+12:next.y+8;
  const primary:Box={x:actionX,y:actionY,width:actionWidth,height:portrait&&tight||short?48:56};
  const auxY=primary.y+primary.height+4,auxWidth=(actionWidth-8)/2;
  return {x,w,top,short,portrait,tight,wide,score,next,
    nextText:{...next,width:wide||short||portrait?next.width:next.width-actionWidth-28},primary,
    left:{x:actionX,y:auxY,width:auxWidth,height:44},right:{x:actionX+auxWidth+8,y:auxY,width:auxWidth,height:44},
    noticeY:Math.max(next.y+next.height,auxY+44)+4};
}
