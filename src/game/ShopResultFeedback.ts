import type {Box}from'./layout';import type{shopLayout}from'./ShopLayout';
export interface ShopResultLine {name:string;text:string}
/** The existing footer message slot is below actions, never a card/button overlay. */
export function shopResultBox(p:ReturnType<typeof shopLayout>,height:number,bottom:number):Box {
 const x=p.short?p.x:p.tabs.x,width=p.short?p.w:p.tabs.width;
 return{x,y:Math.min(p.noticeY-1,height-bottom-21),width,height:20};
}
/** Keep source and complete clauses; long results use consecutive complete pages. */
export function shopResultPages(text:string,fits:(text:string)=>boolean):string[]{
 if(fits(text))return[text];const [source,...clauses]=text.split(' · '),pages:string[]=[];
 for(const clause of clauses){const page=source+' · '+clause;if(!fits(page))return[source+' · 完整结果见构筑详情'];pages.push(page);}
 return pages.length?pages:[text];
}
interface Item extends ShopResultLine {key:string}
interface Active extends Item {startedAt:number;holdUntil:number;endsAt:number}
/** UI-only unread FIFO: saved results stay queued until read or the scene leaves.
 * A render/resize cannot restart a deadline; no delta clamp or domain writes. */
export class ShopResultFeedback {
 private active?:Active;private pending:Item[]=[];private seen=new Set<string>();private disposed=false;
 enqueue(batch:number,lines:readonly ShopResultLine[],now:number):boolean {
  if(this.disposed||!lines.length)return false;
  const added=lines.map((line,index)=>({...line,key:batch+'/'+line.name+'/'+index})).filter(item=>{if(this.seen.has(item.key))return false;this.seen.add(item.key);return true;});
  if(!added.length)return false;this.pending.push(...added);this.advance(now);return true;
 }
 private advance(now:number):void {
  if(this.active&&now>=this.active.endsAt)this.active=undefined;
  if(!this.active&&this.pending.length){const item=this.pending.shift()!,hold=Math.max(2400,Array.from(item.text).length*85);this.active={...item,startedAt:now,holdUntil:now+hold,endsAt:now+hold+200};}
 }
 snapshot(now:number,reduced=false){
  if(this.disposed)return;this.advance(now);if(!this.active)return;
  return{...this.active,pending:this.pending.length,alpha:reduced?1:Math.max(0,Math.min(1,(this.active.endsAt-now)/200))};
 }
 dispose():void {this.disposed=true;this.active=undefined;this.pending=[];this.seen.clear();}
}
