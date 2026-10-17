import type {Box} from './layout';
type Point={x:number;y:number};
/** Clip a local source connector against protected text/photo rectangles. */
export function scoreLineSegments(from:Point,to:Point,guards:readonly Box[]):[Point,Point][]{
  let spans:[number,number][]=[[0,1]];const dx=to.x-from.x,dy=to.y-from.y;
  for(const b of guards){
    let low=0,high=1;
    for(const [start,delta,min,max] of [[from.x,dx,b.x,b.x+b.width],[from.y,dy,b.y,b.y+b.height]]){
      if(delta===0){if(start<min||start>max){low=1;high=0;break;}}
      else {const a=(min-start)/delta,z=(max-start)/delta;low=Math.max(low,Math.min(a,z));high=Math.min(high,Math.max(a,z));}
    }
    if(low>=high)continue;
    spans=spans.flatMap(([a,z])=>high<=a||low>=z?[[a,z] as [number,number]]:[...(low>a?[[a,low] as [number,number]]:[]),...(high<z?[[high,z] as [number,number]]:[])]);
  }
  return spans.map(([a,z])=>[{x:from.x+dx*a,y:from.y+dy*a},{x:from.x+dx*z,y:from.y+dy*z}]);
}
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
