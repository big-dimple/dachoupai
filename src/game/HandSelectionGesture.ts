export interface HandSelectionHitBox {
  id:string;
  x:number;
  y:number;
  width:number;
  height:number;
  visible?:boolean;
}

export type HandSelectionCancelReason='cancel'|'outside'|'vertical'|'multitouch';
export interface HandSelectionUpdate {
  phase:'pending'|'sweeping'|'committed'|'cancelled';
  pointerId:number;
  mode:'select'|'deselect';
  selectedIds:readonly string[];
  visitedIds:readonly string[];
  limitReached:boolean;
  reason?:HandSelectionCancelReason;
}

interface Gesture {
  pointerId:number;
  startX:number;
  startY:number;
  x:number;
  y:number;
  startCardId:string;
  mode:HandSelectionUpdate['mode'];
  phase:'pending'|'sweeping';
  initial:Set<string>;
  selected:Set<string>;
  visited:Set<string>;
  boxes:HandSelectionHitBox[];
  order:string[];
  max:number;
  limitReached:boolean;
}

/** Entry along a segment, so sparse moves visit cards in either traversal direction. */
function segmentEntry(x:number,y:number,nextX:number,nextY:number,box:HandSelectionHitBox):number|undefined {
  if(box.visible===false||box.width<=0||box.height<=0)return undefined;
  let enter=0,leave=1;
  for(const [origin,delta,min,max] of [[x,nextX-x,box.x,box.x+box.width],[y,nextY-y,box.y,box.y+box.height]]){
    if(delta===0){if(origin<min||origin>max)return undefined;continue;}
    const a=(min-origin)/delta,b=(max-origin)/delta;
    enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));
    if(enter>leave)return undefined;
  }
  return enter;
}

/** UI-only selection preview. Coordinates and hit boxes are measured in CSS pixels. */
export class HandSelectionGesture {
  private gesture?:Gesture;

  get state():HandSelectionUpdate|undefined {return this.gesture?this.snapshot(this.gesture):undefined;}

  begin(pointerId:number,x:number,y:number,startCardId:string,initialSelected:Iterable<string>,orderedBoxes:readonly HandSelectionHitBox[],max=5):HandSelectionUpdate|undefined {
    if(this.gesture)return this.gesture.pointerId===pointerId?undefined:this.cancel('multitouch');
    if(!orderedBoxes.some(box=>box.id===startCardId&&box.visible!==false))return undefined;
    const initial=new Set(initialSelected),limit=Number.isFinite(max)?Math.max(0,Math.min(5,Math.floor(max))):5;
    if(initial.size>limit)return undefined;
    const gesture:Gesture={pointerId,startX:x,startY:y,x,y,startCardId,mode:initial.has(startCardId)?'deselect':'select',phase:'pending',
      initial,selected:new Set(initial),visited:new Set(),boxes:orderedBoxes.map(box=>({...box})),order:[...new Set([...orderedBoxes.map(box=>box.id),...initial])],max:limit,limitReached:false};
    this.gesture=gesture;
    return this.snapshot(gesture);
  }

  move(pointerId:number,x:number,y:number):HandSelectionUpdate|undefined {
    const gesture=this.gesture;if(!gesture||gesture.pointerId!==pointerId)return undefined;
    if(gesture.phase==='pending'){
      const dx=Math.abs(x-gesture.startX),dy=Math.abs(y-gesture.startY);
      if(Math.max(dx,dy)<10)return this.snapshot(gesture);
      if(dx<=dy)return this.cancel('vertical');
      gesture.phase='sweeping';this.visit(gesture,gesture.startCardId);
    }
    const crossed=gesture.boxes.flatMap((box,index)=>{
      const entry=segmentEntry(gesture.x,gesture.y,x,y,box);
      return entry===undefined?[]:[{id:box.id,entry,index}];
    }).sort((a,b)=>a.entry-b.entry||a.index-b.index);
    for(const box of crossed)this.visit(gesture,box.id);
    gesture.x=x;gesture.y=y;
    return this.snapshot(gesture);
  }

  up(pointerId:number,x:number,y:number):HandSelectionUpdate|undefined {
    if(this.gesture?.pointerId!==pointerId)return undefined;
    const moved=this.move(pointerId,x,y),gesture=this.gesture;
    if(!gesture)return moved;
    if(gesture.phase==='pending')this.visit(gesture,gesture.startCardId);
    const result=this.snapshot(gesture,'committed');this.gesture=undefined;
    return result;
  }

  /** Canvas departure, pointercancel, multitouch and long-press routing all restore the snapshot. */
  cancel(reason:HandSelectionCancelReason='cancel'):HandSelectionUpdate|undefined {
    const gesture=this.gesture;if(!gesture)return undefined;
    const result=this.snapshot(gesture,'cancelled',reason);this.gesture=undefined;
    return result;
  }

  private visit(gesture:Gesture,id:string):void {
    if(gesture.visited.has(id))return;
    gesture.visited.add(id);
    if(gesture.mode==='deselect')gesture.selected.delete(id);
    else if(!gesture.selected.has(id)){
      if(gesture.selected.size<gesture.max)gesture.selected.add(id);
      else gesture.limitReached=true;
    }
  }

  private snapshot(gesture:Gesture,phase:HandSelectionUpdate['phase']=gesture.phase,reason?:HandSelectionCancelReason):HandSelectionUpdate {
    const selected=phase==='cancelled'?gesture.initial:gesture.selected;
    return {phase,pointerId:gesture.pointerId,mode:gesture.mode,selectedIds:gesture.order.filter(id=>selected.has(id)),visitedIds:[...gesture.visited],limitReached:phase!=='cancelled'&&gesture.limitReached,...(reason?{reason}:{})};
  }
}
