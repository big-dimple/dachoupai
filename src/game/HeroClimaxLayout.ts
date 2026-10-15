import type {Box} from './layout';
/** One paper stage, three camera compositions. No rule or queue timing. */
export function heroClimaxLayout(w:number,h:number,hasSource=true){
 const portrait=w<h,short=h<450,pad=portrait?18:24;
 const panelW=Math.min(1080,w-24),panelH=Math.min(short?h-88:h-150,portrait?580:560);
 const panel:Box={x:(w-panelW)/2,y:Math.max(short?44:64,(h-panelH)/2-6),width:panelW,height:panelH};
 const inner:Box={x:panel.x+pad,y:panel.y+pad,width:panel.width-pad*2,height:panel.height-pad*2};
 const header=short?74:portrait?80:104,footer=short?82:portrait?128:118;
 const body:Box={x:inner.x,y:panel.y+header,width:inner.width,height:panel.height-header-footer};
 const subjectW=body.width*(hasSource?.44:.46),gap=portrait?18:28;
 const subject:Box={...body,width:subjectW};
 const readout:Box={x:subject.x+subject.width+gap,y:body.y+body.height*(short?.08:.18),width:body.width-subject.width-gap,height:body.height*.7};
 const sourceCaption:Box={x:inner.x,y:panel.y+panel.height-(short?38:54),width:inner.width,height:short?30:44};
 const valueY=readout.y+(short?20:28),noteY=panel.y+panel.height-footer+8;
 const eyes:Box={x:inner.x,y:body.y+body.height*.08,width:inner.width,height:body.height*(short?.54:.62)};
 const landing:Box={x:inner.x,y:body.y+10,width:inner.width,height:body.height};
 return {portrait,short,panel,body,eyes,landing,panelY:panel.y,panelH:panel.height,source:subject,readout,sourceCaption,
  heroX:subject.x+subject.width/2,heroY:subject.y+subject.height/2,heroH:subject.height,heroW:subject.width,
  nameX:inner.x,nameY:panel.y+16,nameW:inner.width,valueY,noteY};
}

/** Reserve measured wrapped title/owner height without moving the committed footer facts. */
export function reserveHeroClimaxHeader(l:ReturnType<typeof heroClimaxLayout>,headerBottom:number){
 if(!Number.isFinite(headerBottom)||headerBottom+12<=l.body.y)return l;
 const y=Math.ceil(headerBottom)+12,height=Math.max(1,l.body.y+l.body.height-y),body={...l.body,y,height};
 const source={...l.source,y,height},readout={...l.readout,y:y+height*(l.short?.08:.18),height:height*.7};
 return {...l,body,source,readout,eyes:{...l.eyes,y:y+height*.08,height:height*(l.short?.54:.62)},landing:{...l.landing,y:y+10,height},heroY:y+height/2,heroH:height,valueY:readout.y+(l.short?20:28)};
}
