import type {Box} from './layout';
/** Foreground art lanes and saved-readout paper; owns no gameplay timing or targets. */
export function heroClimaxLayout(w:number,h:number,hasSource=true){
 const rightX=w*(hasSource?.65:.52),rightW=w*(hasSource?.31:.42),portrait=w<h,short=h<450,panelY=portrait?h*.105:h*.13,panelH=h*.72;
 const source:Box=portrait?{x:w*.60,y:panelY+64,width:w*.36,height:panelH*.34}:short?{x:w*.39,y:panelY+18,width:w*.19,height:panelH*.64}:{x:w*.40,y:panelY+52,width:w*.20,height:panelH*.67};
 const readout:Box=portrait?{x:20,y:panelY+panelH*.55,width:w-40,height:panelH*.27}:{x:rightX,y:panelY+panelH*.34,width:rightW,height:panelH*.38};
 const sourceCaption:Box=portrait?{x:20,y:panelY+panelH-70,width:w-40,height:56}:{x:rightX,y:panelY+panelH-(short?62:104),width:rightW,height:short?56:92};
 return {portrait,short,panelY,panelH,source,readout,sourceCaption,heroX:w*(portrait?.30:hasSource?.23:.28),heroY:panelY+panelH*(portrait?.34:.48),heroH:panelH*(portrait?.66:.94),heroW:w*(portrait?.62:hasSource?.36:.40),nameX:portrait?20:rightX,nameY:panelY+(portrait?12:panelH*.07),valueY:readout.y+(short?24:portrait?26:42),noteY:readout.y+(short?77:portrait?93:162)};
}
