import type {Box} from './layout';
export function selectionLayout(width:number,height:number,top:number,bottom:number){
  const portrait=width<640&&height>width,short=height<500;
  const w=Math.min(1180,width-24),x=(width-w)/2,footerY=height-bottom-104;
  const summaryHeight=short?42:portrait?112:100,summaryY=footerY-summaryHeight-12;
  const gridTop=top+(short?50:portrait?58:72),gap=portrait?10:14,cols=short&&width>=700||width>=1120?6:width>=640?3:3,rows=6/cols;
  const cardWidth=(w-gap*(cols-1))/cols,cardHeight=Math.min(portrait?cardWidth*1.4:300,(summaryY-14-gridTop-gap*(rows-1))/rows);
  const cards:Box[]=Array.from({length:6},(_,i)=>({x:x+(i%cols)*(cardWidth+gap),y:gridTop+Math.floor(i/cols)*(cardHeight+gap),width:cardWidth,height:cardHeight}));
  const cancelWidth=Math.floor(w*.22),detailWidth=Math.floor(w*.25),confirmWidth=w-cancelWidth-detailWidth-16;
  return {x,w,top,short,portrait,cards,summary:{x,y:summaryY,width:w,height:summaryHeight},cancel:{x,y:footerY,width:cancelWidth,height:56},details:{x:x+cancelWidth+8,y:footerY,width:detailWidth,height:56},confirm:{x:x+cancelWidth+detailWidth+16,y:footerY,width:confirmWidth,height:56},noticeY:footerY+64};
}

