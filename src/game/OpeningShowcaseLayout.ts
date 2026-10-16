import type {Box} from './layout';
/** Portrait, compact facts and opt-in actions always own separate bands. */
export function openingShowcaseLayout(b:Box,portrait:boolean,short:boolean){
 const pad=short?8:portrait?10:12;
  if(portrait&&b.height>=300){
   const demoY=b.y+b.height-pad-44,copyY=demoY-108;
   return {art:{x:b.x+pad,y:b.y+pad,width:b.width-pad*2,height:copyY-b.y-pad-8},copy:{x:b.x+pad,y:copyY,width:b.width-pad*2,height:100},demo:{x:b.x+pad,y:demoY,width:b.width-pad*2,height:44}};
  }
  if(portrait){
   const artWidth=b.width*.42,copyX=b.x+artWidth+pad*2,demoY=b.y+b.height-pad-44;
   return {art:{x:b.x+pad,y:b.y+pad,width:artWidth,height:demoY-b.y-pad-8},copy:{x:copyX,y:b.y+pad,width:b.width-(copyX-b.x)-pad,height:demoY-b.y-pad-8},demo:{x:b.x+pad,y:demoY,width:b.width-pad*2,height:44}};
  }
  const artWidth=short?Math.min(150,b.width*.2):Math.min(470,b.width*.42),copyX=b.x+artWidth+pad*2;
  const copyWidth=b.width-(copyX-b.x)-pad,demoY=b.y+b.height-pad-48;
  return {art:{x:b.x+pad,y:b.y+pad,width:artWidth,height:b.height-pad*2-(short?0:24)},copy:{x:copyX,y:b.y+pad,width:copyWidth,height:demoY-b.y-pad-8},demo:{x:copyX,y:demoY,width:copyWidth,height:48}};
}
