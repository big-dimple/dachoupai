/** Locks are released by the browser on tab death. CAS still guards every IndexedDB write. */
export class WriteLease {
  writable=false;
  private release?:()=>void;
  private readonly channel=typeof BroadcastChannel==='undefined'?undefined:new BroadcastChannel('dachoupai-writer');
  private readonly owner=crypto.randomUUID();
  onChange:()=>void=()=>{};
  constructor(){
    this.channel?.addEventListener('message',event=>{
      if(event.data?.type==='takeover'&&event.data.owner!==this.owner)this.drop();
    });
  }
  async claim(takeover=false):Promise<boolean> {
    if(this.writable)return true;
    if(!navigator.locks){this.writable=true;this.onChange();return true;} // Legacy browsers rely on revision CAS.
    if(takeover)this.channel?.postMessage({type:'takeover',owner:this.owner});
    const abort=new AbortController(),timer=takeover?window.setTimeout(()=>abort.abort(),2000):undefined;
    return new Promise<boolean>(resolve=>{
      void navigator.locks.request('dachoupai-writer',takeover?{signal:abort.signal}:{ifAvailable:true},async lock=>{
        if(!lock){resolve(false);return;}
        if(timer!==undefined)clearTimeout(timer);
        this.writable=true;this.onChange();resolve(true);
        await new Promise<void>(r=>this.release=r);
      }).catch(()=>resolve(false));
    });
  }
  drop():void {this.writable=false;this.release?.();this.release=undefined;this.onChange();}
}
