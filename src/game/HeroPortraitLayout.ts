import type {Box} from './layout';

/** Pick the largest full-width free band. Caller supplies measured text/control bounds. */
export function heroPortraitLayout(area:Box,source:{width:number;height:number},protectedBounds:readonly Box[]=[],padding=6){
  if(![area.x,area.y,area.width,area.height,source.width,source.height,padding].every(Number.isFinite)||area.width<=padding*2||area.height<=padding*2||source.width<=0||source.height<=0||padding<0)return;
  let bands=[{...area}];
  for(const cut of protectedBounds){
    if(cut.x>=area.x+area.width||cut.x+cut.width<=area.x||cut.width<=0||cut.height<=0)continue;
    const top=cut.y-padding,bottom=cut.y+cut.height+padding;
    bands=bands.flatMap(b=>{
      if(bottom<=b.y||top>=b.y+b.height)return [b];
      return [
        {...b,height:Math.max(0,top-b.y)},
        {...b,y:Math.max(b.y,bottom),height:Math.max(0,b.y+b.height-Math.max(b.y,bottom))},
      ].filter(b=>b.height>padding*2);
    });
  }
  const fit=(b:Box)=>Math.min((b.width-padding*2)/source.width,(b.height-padding*2)/source.height);
  const safeBounds=bands.sort((a,b)=>fit(b)-fit(a)||b.y-a.y)[0];if(!safeBounds)return;
  const scale=fit(safeBounds);if(scale<=0)return;
  const width=source.width*scale,height=source.height*scale;
  return {safeBounds,scale,x:safeBounds.x+safeBounds.width/2,y:safeBounds.y+safeBounds.height/2,
    imageBounds:{x:safeBounds.x+(safeBounds.width-width)/2,y:safeBounds.y+(safeBounds.height-height)/2,width,height}};
}

/** The already-fitted image keeps its ratio while a small score pose stays in its lane. */
export function fitHeroPortraitPose(area:Box,rest:{x:number;y:number;width:number;height:number;angle?:number},pose:{lift:number;angle:number;scale:number}){
  const angle=pose.angle*.28,rad=Math.abs((rest.angle??0)+angle)*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad);
  const width=rest.width*c+rest.height*s,height=rest.height*c+rest.width*s;
  const scale=Math.max(0,Math.min(1+(pose.scale-1)*.30,area.width/width,area.height/height));
  const halfW=width*scale/2,halfH=height*scale/2;
  return {x:Math.max(area.x+halfW,Math.min(area.x+area.width-halfW,rest.x)),
    y:Math.max(area.y+halfH,Math.min(area.y+area.height-halfH,rest.y+pose.lift*.25)),angle,scale};
}
