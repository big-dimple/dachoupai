/** UI-only gesture state. A long press or cancelled/moved pointer never becomes a tap. */
export class PointerIntent {
  private start?:{id:number;x:number;y:number;at:number;drag:boolean;held:boolean;inspectable:boolean};
  down(id:number,x:number,y:number,at:number,inspectable=true):void {this.start={id,x,y,at,drag:false,held:false,inspectable};}
  move(id:number,x:number,y:number):void {if(this.start?.id===id&&Math.hypot(x-this.start.x,y-this.start.y)>10)this.start.drag=true;}
  hold(at:number):boolean {const s=this.start;if(!s||!s.inspectable||s.drag||s.held||at-s.at<350)return false;s.held=true;return true;}
  up(id:number,x:number,y:number,at:number):'tap'|'drag'|'none' {
    if(this.start?.id!==id)return 'none';this.move(id,x,y);const s=this.start;this.start=undefined;
    if(s.drag)return 'drag';if(s.held||s.inspectable&&at-s.at>=350)return 'none';return 'tap';
  }
  cancel():void {this.start=undefined;}
}
