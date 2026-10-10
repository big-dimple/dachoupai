import type {Box} from './layout';
/** Hero and route stages reserve their action row before sizing the showcase. */
export function selectionLayout(width:number,height:number,top:number,bottom:number,step:'hero'|'route'='hero'){
 const portrait=width<640&&height>width,short=height<500;
 const w=Math.min(1320,width-24),x=(width-w)/2,header=Math.max(12,top),footerY=height-bottom-(short?66:104);
 const contentY=header+(short?54:92),contentSpace=footerY-12-contentY;
 const railHeight=portrait?(step==='route'?148:(height<700?112:152)):short?(step==='route'?60:50):126;
 const railY=footerY-12-railHeight,hero:Box={x,y:contentY,width:w,height:Math.max(1,railY-contentY-(portrait?10:14))};
 const gap=portrait?8:12,cols=portrait?3:6,rows=6/cols;
 const cardWidth=(w-gap*(cols-1))/cols,cardHeight=(railHeight-gap*(rows-1))/rows;
 const cards:Box[]=Array.from({length:6},(_,i)=>({x:x+i%cols*(cardWidth+gap),y:railY+Math.floor(i/cols)*(cardHeight+gap),width:cardWidth,height:cardHeight}));
 const routeGap=8,routeCols=portrait?1:3,routeHeight=portrait?(railHeight-routeGap*2)/3:railHeight;
 const routes:Box[]=Array.from({length:3},(_,i)=>({x:x+i%routeCols*((w-routeGap*(routeCols-1))/routeCols+routeGap),y:railY+Math.floor(i/routeCols)*(routeHeight+routeGap),width:(w-routeGap*(routeCols-1))/routeCols,height:routeHeight}));
 const cancelWidth=Math.floor(w*.22),detailWidth=Math.floor(w*.25),confirmWidth=w-cancelWidth-detailWidth-16;
 return {x,w,top:header,short,portrait,hero,cards,routes,summary:hero,cancel:{x,y:footerY,width:cancelWidth,height:short?44:56},details:{x:x+cancelWidth+8,y:footerY,width:detailWidth,height:short?44:56},confirm:{x:x+cancelWidth+detailWidth+16,y:footerY,width:confirmWidth,height:short?44:56},noticeY:footerY+(short?48:64)};
}
