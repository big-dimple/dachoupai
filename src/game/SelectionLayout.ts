import type {Box} from './layout';
/** Hero and route stages reserve their action row before sizing the showcase. */
export function selectionLayout(width:number,height:number,top:number,bottom:number,step:'hero'|'route'='hero',left=0,right=0){
 const portrait=width<640&&height>width,short=height<500,compactRoutes=portrait&&height-bottom<650;
 const w=Math.min(1320,width-left-right-24),x=left+(width-left-right-w)/2,header=Math.max(12,top),footerY=height-bottom-(short?66:104);
 if(short&&!portrait){
  // In short landscape the choice rail sits beside the hero, rather than
  // consuming the same vertical space as facts, examples and primary actions.
  const contentY=header+44,heroWidth=Math.floor(w*.62),railX=x+heroWidth+12,railWidth=w-heroWidth-12;
  const hero={x,y:contentY,width:heroWidth,height:footerY+44-contentY},railHeight=footerY-8-contentY;
  const cols=width-left-right>=640?3:2,rows=6/cols;
  const cards=Array.from({length:6},(_,i)=>({x:railX+i%cols*(railWidth+6)/cols,y:contentY+Math.floor(i/cols)*(railHeight+6)/rows,width:(railWidth-6*(cols-1))/cols,height:(railHeight-6*(rows-1))/rows}));
  const routeCols=railHeight<144?3:1,routeRows=3/routeCols;
  const routes=Array.from({length:3},(_,i)=>({x:railX+i%routeCols*(railWidth+6)/routeCols,y:contentY+Math.floor(i/routeCols)*(railHeight+6)/routeRows,width:(railWidth-6*(routeCols-1))/routeCols,height:(railHeight-6*(routeRows-1))/routeRows}));
  const cancelWidth=44,detailWidth=44;
  return {x,w,top:header,short,portrait,hero,cards,routes,summary:hero,cancel:{x:railX,y:footerY,width:cancelWidth,height:44},details:{x:railX+50,y:footerY,width:detailWidth,height:44},confirm:{x:railX+100,y:footerY,width:railWidth-100,height:44},noticeY:footerY+48};
 }
 const contentY=header+(short||portrait?52:76);
 const railHeight=portrait?(step==='route'?(compactRoutes?52:148):96):short?(step==='route'?60:50):126;
 const railY=footerY-12-railHeight,hero:Box={x,y:contentY,width:w,height:Math.max(1,railY-contentY-(portrait?10:14))};
 const gap=portrait?8:12,cols=portrait?3:6,rows=6/cols;
 const cardWidth=(w-gap*(cols-1))/cols,cardHeight=(railHeight-gap*(rows-1))/rows;
 const cards:Box[]=Array.from({length:6},(_,i)=>({x:x+i%cols*(cardWidth+gap),y:railY+Math.floor(i/cols)*(cardHeight+gap),width:cardWidth,height:cardHeight}));
 const routeGap=8,routeCols=portrait&&!compactRoutes?1:3,routeHeight=routeCols===1?(railHeight-routeGap*2)/3:railHeight;
 const routes:Box[]=Array.from({length:3},(_,i)=>({x:x+i%routeCols*((w-routeGap*(routeCols-1))/routeCols+routeGap),y:railY+Math.floor(i/routeCols)*(routeHeight+routeGap),width:(w-routeGap*(routeCols-1))/routeCols,height:routeHeight}));
 const cancelWidth=Math.floor(w*.22),detailWidth=Math.floor(w*.25),confirmWidth=w-cancelWidth-detailWidth-16;
 return {x,w,top:header,short,portrait,hero,cards,routes,summary:hero,cancel:{x,y:footerY,width:cancelWidth,height:short?44:56},details:{x:x+cancelWidth+8,y:footerY,width:detailWidth,height:short?44:56},confirm:{x:x+cancelWidth+detailWidth+16,y:footerY,width:confirmWidth,height:short?44:56},noticeY:footerY+(short?48:64)};
}
