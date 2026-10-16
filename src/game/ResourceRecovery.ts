import type {PreparationProgress} from './SceneResources';

export type RecoveryStatus='loading'|'retrying'|'waiting'|'offline'|'paused'|'ready'|'canceled';
export interface RecoveryProgress extends PreparationProgress {status:RecoveryStatus;round:number;retryInMs:number}
export const RESOURCE_RETRY_DELAYS=[500,1500,3500] as const;
export const RESOURCE_RECOVERY_INTERVAL=30000;

/** One owner, one attempt/wait at a time. Decoded cache is retained by the attempt implementation. */
export class ResourceRecovery {
 private paused=false;
 private batch?:AbortController;
 private wake?:()=>void;
 private online:boolean;
 private progress:PreparationProgress;
 private round=0;
 constructor(private attempt:(signal:AbortSignal,changed:(p:PreparationProgress)=>void)=>Promise<PreparationProgress>,initial:PreparationProgress,private changed:(p:RecoveryProgress)=>void,private signal:AbortSignal,private events:EventTarget=window,private connected=()=>navigator.onLine){this.progress=initial;this.online=connected();}
 pause():void {if(this.signal.aborted)return;this.paused=true;this.batch?.abort();this.wake?.();}
 resume():void {if(this.signal.aborted||!this.paused)return;this.paused=false;this.wake?.();}
 private publish(status:RecoveryStatus,retryInMs=0):void {this.changed({...this.progress,status,round:this.round,retryInMs});}
 private wait(delay?:number):Promise<void>{
  return new Promise(resolve=>{let timer:ReturnType<typeof setTimeout>|undefined;const done=()=>{clearTimeout(timer);this.signal.removeEventListener('abort',done);if(this.wake===done)this.wake=undefined;resolve();};this.wake=done;this.signal.addEventListener('abort',done,{once:true});if(this.signal.aborted)done();else if(delay!==undefined)timer=setTimeout(done,delay);});
 }
 async run():Promise<boolean>{
  const network=()=>{const next=this.connected();if(next===this.online)return;this.online=next;if(!next)this.batch?.abort();this.wake?.();};
  const cancel=()=>{this.batch?.abort();this.wake?.();};
  this.events.addEventListener('online',network);this.events.addEventListener('offline',network);this.signal.addEventListener('abort',cancel,{once:true});
  try{
   while(!this.signal.aborted){
    if(this.paused||!this.online){this.publish(this.paused?'paused':'offline');await this.wait();continue;}
    this.publish('loading');this.batch=new AbortController();
    this.progress=await this.attempt(this.batch.signal,p=>{this.progress=p;this.publish('loading');});this.batch=undefined;
    if(this.signal.aborted)break;if(this.paused||!this.online)continue;
    if(!this.progress.failed&&!this.progress.pending&&this.progress.loaded===this.progress.total){this.publish('ready');return true;}
    this.round++;
    const transient=this.progress.pending>0||this.progress.states.some(s=>s.status==='failed'&&s.retryable!==false);
    const quick=transient&&this.round<=RESOURCE_RETRY_DELAYS.length;
    const delay=quick?RESOURCE_RETRY_DELAYS[this.round-1]:Math.min(60000,RESOURCE_RECOVERY_INTERVAL*2**Math.max(0,this.round-4));
    this.publish(quick?'retrying':'waiting',delay);await this.wait(delay);
   }
   this.publish('canceled');return false;
  }finally{this.batch?.abort();this.events.removeEventListener('online',network);this.events.removeEventListener('offline',network);this.signal.removeEventListener('abort',cancel);this.wake?.();}
 }
}
