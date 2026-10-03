import type {Box} from './layout';
/** Exact CSS-space subtraction, shared by fire and source flights. */
export function subtractBoxes(area:Box,guards:readonly Box[]):Box[]{
  const cuts=[area.y,area.y+area.height,...guards.flatMap(b=>[Math.max(area.y,Math.min(area.y+area.height,b.y)),Math.max(area.y,Math.min(area.y+area.height,b.y+b.height))])].sort((a,b)=>a-b),result:Box[]=[];
  for(let i=0;i<cuts.length-1;i++){
    const y=cuts[i],bottom=cuts[i+1];if(bottom<=y)continue;
    const excluded=guards.filter(b=>b.y<bottom&&b.y+b.height>y).sort((a,b)=>a.x-b.x);let left=area.x;
    for(const b of excluded){const edge=Math.min(area.x+area.width,Math.max(area.x,b.x));if(edge>left)result.push({x:left,y,width:edge-left,height:bottom-y});left=Math.max(left,Math.min(area.x+area.width,b.x+b.width));}
    if(left<area.x+area.width)result.push({x:left,y,width:area.x+area.width-left,height:bottom-y});
  }
  return result;
}
