import type {Box} from './layout';
/** Reserve the choice rail and one primary action before composing the hero stage. */
export function selectionLayout(width:number,height:number,top:number,bottom:number,step:'hero'|'route'='hero',left=0,right=0){
 const portrait=width<640&&height>width,short=height<500;
 const w=Math.min(1320,width-left-right-24),x=left+(width-left-right-w)/2,header=Math.max(12,top);
 const cancel={x,y:header,width:64,height:44};
 if(short&&!portrait){
  const footerY=height-bottom-66,contentY=header+44,heroWidth=Math.floor(w*.62),railX=x+heroWidth+12,railWidth=w-heroWidth-12;
  const hero={x,y:contentY,width:heroWidth,height:footerY+44-contentY},railHeight=footerY-8-contentY;
  const cols=width-left-right>=640?3:2,rows=6/cols;
  const cards=Array.from({length:6},(_,i)=>({x:railX+i%cols*(railWidth+6)/cols,y:contentY+Math.floor(i/cols)*(railHeight+6)/rows,width:(railWidth-6*(cols-1))/cols,height:(railHeight-6*(rows-1))/rows}));
  const routeCols=railHeight<144?3:1,routeRows=3/routeCols;
  const routes=Array.from({length:3},(_,i)=>({x:railX+i%routeCols*(railWidth+6)/routeCols,y:contentY+Math.floor(i/routeCols)*(railHeight+6)/routeRows,width:(railWidth-6*(routeCols-1))/routeCols,height:(railHeight-6*(routeRows-1))/routeRows}));
  return {x,w,top:header,short,portrait,hero,cards,routes,summary:hero,cancel,details:{x:railX,y:footerY,width:64,height:44},confirm:{x:railX+72,y:footerY,width:railWidth-72,height:44},noticeY:footerY+48};
 }
 const contentY=header+60,footerY=height-bottom-76,railHeight=portrait?96:88,railY=footerY-railHeight-12;
 const hero:Box={x,y:contentY,width:w,height:Math.max(1,railY-contentY-12)};
 const gap=portrait?8:12,cols=portrait?3:6,rows=6/cols;
 const cardWidth=(w-gap*(cols-1))/cols,cardHeight=(railHeight-gap*(rows-1))/rows;
 const cards:Box[]=Array.from({length:6},(_,i)=>({x:x+i%cols*(cardWidth+gap),y:railY+Math.floor(i/cols)*(cardHeight+gap),width:cardWidth,height:cardHeight}));
 const routes:Box[]=Array.from({length:3},(_,i)=>({x:x+i*(w+8)/3,y:railY,width:(w-16)/3,height:railHeight}));
 const confirmWidth=portrait?w-88:260,confirmX=portrait?x+88:x+(w-confirmWidth)/2;
 return {x,w,top:header,short,portrait,hero,cards,routes,summary:hero,cancel,details:{x:confirmX-88,y:footerY+6,width:80,height:44},confirm:{x:confirmX,y:footerY,width:confirmWidth,height:56},noticeY:footerY+60};
}
