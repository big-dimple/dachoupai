export interface WarmImage {key:string;url:string;visible?:boolean;scope?:AbortSignal}
export interface WarmImageState extends WarmImage {status:'queued'|'loading'|'loaded'|'failed';attempts:number}
/** Small fixed catalog, two transfers, one automatic retry; explicit retries stay possible. */
export class ImageWarmupQueue {
  private entries=new Map<string,WarmImageState>();
  private pending:string[]=[];
  private active=0;
  private disposed=false;
  private controller=new AbortController();
  constructor(private load:(asset:WarmImage,signal:AbortSignal)=>Promise<void>,private changed:()=>void,private limit=24){}
  snapshot():WarmImageState[]{return [...this.entries.values()].map(entry=>({...entry}));}
  request(assets:readonly WarmImage[],priority=false):void {
    if(this.disposed)return;
    for(const asset of assets){
      if(this.entries.has(asset.key)){
        const index=this.pending.indexOf(asset.key);if(priority&&index>=0)this.pending.unshift(...this.pending.splice(index,1));continue;
      }
      if(this.entries.size>=this.limit){const settled=[...this.entries.values()].find(entry=>entry.status==='loaded'||entry.status==='failed');if(settled)this.entries.delete(settled.key);else continue;}
      this.entries.set(asset.key,{...asset,status:'queued',attempts:0});
      if(priority)this.pending.unshift(asset.key);else this.pending.push(asset.key);
    }
    this.changed();this.pump();
  }
  retry():void {
    if(this.disposed)return;
    for(const entry of this.entries.values())if(entry.status==='failed'){entry.status='queued';this.pending.push(entry.key);}
    this.changed();this.pump();
  }
  dispose():void {this.disposed=true;this.controller.abort();this.pending=[];this.entries.clear();}
  private pump():void {
    while(!this.disposed&&this.active<2&&this.pending.length){
      const entry=this.entries.get(this.pending.shift()!)!;entry.status='loading';entry.attempts++;this.active++;this.changed();
      void this.load(entry,this.controller.signal).then(()=>{entry.status='loaded';},error=>{
        if((error as {canceled?:boolean})?.canceled){this.entries.delete(entry.key);return;}
        entry.status='failed';
        if(entry.attempts===1&&(error as {retryable?:boolean})?.retryable!==false&&!this.disposed){entry.status='queued';this.pending.push(entry.key);}
      }).finally(()=>{this.active--;if(!this.disposed){this.changed();this.pump();}});
    }
  }
}
