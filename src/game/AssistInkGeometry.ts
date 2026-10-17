export interface InkPoint {x:number;y:number}
export interface InkBox extends InkPoint {width:number;height:number}

/** Rounded exterior route in screen-sized units; no card transform is changed. */
function halo(box:InkBox,progress:number):InkPoint&{nx:number;ny:number} {
  const w=box.width+18,h=box.height+18,r=Math.min(16,w*.18,h*.18),a=w-2*r,b=h-2*r,q=Math.PI*r/2;
  let distance=((progress%1)+1)%1*(2*a+2*b+4*q);
  const lengths=[a,q,b,q,a,q,b,q];let side=0;while(side<7&&distance>lengths[side])distance-=lengths[side++];
  let x=0,y=0,nx=0,ny=0;
  if(side===0){x=-w/2+r+distance;y=-h/2;ny=-1;}
  else if(side===2){x=w/2;y=-h/2+r+distance;nx=1;}
  else if(side===4){x=w/2-r-distance;y=h/2;ny=1;}
  else if(side===6){x=-w/2;y=h/2-r-distance;nx=-1;}
  else {const corner=(side-1)/2,angle=-Math.PI/2+corner*Math.PI/2+distance/r;nx=Math.cos(angle);ny=Math.sin(angle);x=(corner<2?1:-1)*(w/2-r)+nx*r;y=(corner===0||corner===3?-1:1)*(h/2-r)+ny*r;}
  return {x:x+box.x+box.width/2,y:y+box.y+box.height/2,nx,ny};
}

/** Three long, directed wisps with curled heads, rather than a second card frame. */
export function assistInkCurls(box:InkBox,clock:number):InkPoint[][] {
  const perimeter=2*(box.width+box.height+36),length=Math.min(92,perimeter*.24)/perimeter;
  return [0,1,2].map(ribbon=>{
    const head=clock/1900+ribbon/3,points:InkPoint[]=[];
    for(let i=0;i<=30;i++){const u=i/30,p=halo(box,head-length*(1-u)),wave=Math.sin(u*Math.PI*3+clock/580+ribbon*2)*(1.2+u*1.4);points.push({x:p.x+p.nx*wave,y:p.y+p.ny*wave});}
    const end=halo(box,head),tangent={x:-end.ny,y:end.nx};
    for(let i=1;i<=12;i++){const angle=i/12*Math.PI*1.45,r=4.6*(1-i/16);points.push({x:end.x+end.nx*(Math.sin(angle)*r+2.3)+tangent.x*(Math.cos(angle)-1)*r,y:end.y+end.ny*(Math.sin(angle)*r+2.3)+tangent.y*(Math.cos(angle)-1)*r});}
    return points;
  });
}

function crosses(a:InkPoint,b:InkPoint,box:InkBox,pad:number):boolean {
  let low=0,high=1;
  for(const [origin,delta,min,max]of [[a.x,b.x-a.x,box.x-pad,box.x+box.width+pad],[a.y,b.y-a.y,box.y-pad,box.y+box.height+pad]]){
    if(Math.abs(delta)<1e-8){if(origin<min||origin>max)return false;continue;}
    const first=(min-origin)/delta,last=(max-origin)/delta;low=Math.max(low,Math.min(first,last));high=Math.min(high,Math.max(first,last));if(low>high)return false;
  }return true;
}

/** Reject whole line segments, including their stroke radius, at print/control boundaries. */
export function clearInkRuns(points:readonly InkPoint[],protectedBoxes:readonly InkBox[],radius:number):InkPoint[][] {
  const runs:InkPoint[][]=[];let run:InkPoint[]=[];
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    if(protectedBoxes.some(box=>crosses(a,b,box,radius))){if(run.length>1)runs.push(run);run=[];continue;}
    if(!run.length)run.push(a);run.push(b);
  }if(run.length>1)runs.push(run);return runs;
}
