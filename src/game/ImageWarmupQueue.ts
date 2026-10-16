export interface WarmImage {key:string;url:string;visible?:boolean;scope?:AbortSignal}
export interface WarmImageState extends WarmImage {status:'queued'|'loading'|'loaded'|'failed';attempts:number;retryable?:boolean;error?:string}
/** Small fixed catalog, two transfers, one automatic retry; explicit retries stay possible. */
export class ImageWarmupQueue {
  private entries=new Map<string,WarmImageState>();
  private pending:string[]=[];
  private active=0;
  private disposed=false;
  private controller=new AbortController();
  constructor(private load:(asset:WarmImage,signal:AbortSignal)=>Promise<void>,private changed:()=>void,private limit=24,private automaticRetry=true){}
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
  /** A visible owner can recover a texture whose speculative attempt failed. */
  markLoaded(key:string):void {
    const entry=this.entries.get(key);if(this.disposed||!entry||entry.status==='loaded')return;
    entry.status='loaded';delete entry.error;delete entry.retryable;this.pending=this.pending.filter(candidate=>candidate!==key);this.changed();this.pump();
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
      void this.load(entry,this.controller.signal).then(()=>{entry.status='loaded';delete entry.error;delete entry.retryable;},error=>{
        if((error as {canceled?:boolean})?.canceled){this.entries.delete(entry.key);return;}
        entry.status='failed';entry.retryable=(error as {retryable?:boolean})?.retryable!==false;entry.error=error instanceof Error?error.message:String(error);
        if(this.automaticRetry&&entry.attempts===1&&entry.retryable&&!this.disposed){entry.status='queued';this.pending.push(entry.key);}
      }).finally(()=>{this.active--;if(!this.disposed){this.changed();this.pump();}});
    }
  }
}
