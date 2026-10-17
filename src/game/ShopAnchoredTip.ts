import {intersects,type Box} from './layout';

export type ShopTipSide='right'|'left'|'below'|'above';
export interface ShopTipPlacement {box:Box;side:ShopTipSide}

/** Keep a tip beside its actual target. A sidebar is an exclusion, never a fallback. */
export function shopAnchoredTip(anchor:Box,size:Pick<Box,'width'|'height'>,region:Box,exclude:readonly Box[]=[],gap=12):ShopTipPlacement|undefined {
  if(size.width<=0||size.height<=0||size.width>region.width||size.height>region.height)return;
  const clamp=(value:number,minimum:number,maximum:number)=>Math.max(minimum,Math.min(value,maximum));
  const x=clamp(anchor.x+(anchor.width-size.width)/2,region.x,region.x+region.width-size.width);
  const y=clamp(anchor.y,region.y,region.y+region.height-size.height);
  const candidates:ShopTipPlacement[]=[
    {side:'right',box:{...size,x:anchor.x+anchor.width+gap,y}},
    {side:'left',box:{...size,x:anchor.x-size.width-gap,y}},
    {side:'below',box:{...size,x,y:anchor.y+anchor.height+gap}},
    {side:'above',box:{...size,x,y:anchor.y-size.height-gap}},
  ];
  return candidates.find(({box})=>box.x>=region.x&&box.y>=region.y&&box.x+box.width<=region.x+region.width&&box.y+box.height<=region.y+region.height&&!intersects(box,anchor)&&!exclude.some(area=>intersects(box,area)));
}
