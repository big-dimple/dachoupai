import type {Box} from './layout';
/** Fixed demonstration band; portrait never shares its text or action space. */
export function openingShowcaseLayout(b:Box,portrait:boolean,short:boolean){
 const pad=short?8:12;
 if(portrait){
  const demoHeight=Math.min(118,Math.max(94,b.height*.36)),topHeight=b.height-demoHeight-pad*2;
  const artWidth=Math.min(152,b.width*.41);
  return {art:{x:b.x+pad,y:b.y+pad,width:artWidth,height:Math.max(40,topHeight-6)},copy:{x:b.x+artWidth+pad+10,y:b.y+pad,width:b.width-artWidth-pad*2-10,height:topHeight},demo:{x:b.x+pad,y:b.y+b.height-demoHeight-pad,width:b.width-pad*2,height:demoHeight}};
 }
 const artWidth=short?Math.min(150,b.width*.2):Math.min(470,b.width*.42),copyX=b.x+artWidth+pad*2;
 const demoY=b.y+(short?62:Math.min(174,b.height*.42));
 return {art:{x:b.x+pad,y:b.y+pad,width:artWidth,height:b.height-pad*2},copy:{x:copyX,y:b.y+pad,width:b.width-(copyX-b.x)-pad,height:demoY-b.y-pad},demo:{x:copyX,y:demoY,width:b.width-(copyX-b.x)-pad,height:b.y+b.height-demoY-pad}};
}
