import type {Box} from './layout';
/** Art, attitude and factual ability copy have independent space at each orientation. */
export function openingShowcaseLayout(b:Box,portrait:boolean,short:boolean){
 const pad=portrait||short?8:16,demoHeight=44;
 if(portrait){
  const demoY=b.y+b.height-demoHeight,copyHeight=b.height<300?88:104,copyY=demoY-copyHeight-6,artHeight=copyY-b.y-10;
  const artWidth=Math.floor(b.width*.55),identityX=b.x+artWidth+12;
  return {art:{x:b.x,y:b.y,width:artWidth,height:artHeight},identity:{x:identityX,y:b.y+8,width:b.x+b.width-identityX,height:artHeight-8},copy:{x:b.x+pad,y:copyY,width:b.width-pad*2,height:copyHeight},demo:{x:b.x+pad,y:demoY,width:Math.min(272,b.width-pad*2),height:demoHeight}};
 }
 if(short){
  const artWidth=Math.floor(b.width*.4),copyX=b.x+artWidth+12,demoY=b.y+b.height-demoHeight,identityHeight=60;
  return {art:{x:b.x,y:b.y,width:artWidth,height:b.height},identity:{x:copyX,y:b.y,width:b.x+b.width-copyX,height:identityHeight},copy:{x:copyX,y:b.y+identityHeight+6,width:b.x+b.width-copyX,height:demoY-b.y-identityHeight-12},demo:{x:copyX,y:demoY,width:b.x+b.width-copyX,height:demoHeight}};
 }
 const artWidth=Math.floor(b.width*.38),identityX=b.x+artWidth+28,identityWidth=Math.floor(b.width*.27)-28,copyX=identityX+identityWidth+28,copyWidth=b.x+b.width-pad-copyX;
 const copyY=b.y+Math.max(16,(b.height-360)/2),demoY=Math.min(b.y+b.height-demoHeight,copyY+320);
 return {art:{x:b.x,y:b.y,width:artWidth,height:b.height},identity:{x:identityX,y:b.y+Math.max(24,(b.height-270)/2),width:identityWidth,height:270},copy:{x:copyX,y:copyY,width:copyWidth,height:demoY-copyY-12},demo:{x:copyX,y:demoY,width:Math.min(272,copyWidth),height:demoHeight}};
}
