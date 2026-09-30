export interface EffectContext { generation:number; signal:AbortSignal }
export type Effect = (context:EffectContext) => void | Promise<void>;

export class EffectQueue {
  private current = this.newGeneration(0);

  private newGeneration(id:number):{id:number;abort:AbortController;effects:Effect[];promise?:Promise<void>} {
    return {id,abort:new AbortController(),effects:[]};
  }

  get generation():number {return this.current.id;}
  isCurrent(generation:number):boolean {return generation===this.current.id&&!this.current.abort.signal.aborted;}

  enqueue(effect: Effect): void {
    if(this.current.abort.signal.aborted)this.current=this.newGeneration(this.current.id+1);
    this.current.effects.push(effect);
  }

  clear(): void {
    const old=this.current;
    old.effects=[];
    old.abort.abort();
    this.current=this.newGeneration(old.id+1);
  }

  drain(): Promise<void> {
    const generation=this.current;
    if(generation.promise)return generation.promise;
    const context={generation:generation.id,signal:generation.abort.signal};
    generation.promise=(async()=>{
      await Promise.resolve();
      try {
        while(!context.signal.aborted&&generation.effects.length){
          const effect=generation.effects.shift()!;
          let settle!:()=>void;
          const canceled=new Promise<void>(r=>settle=r);
          context.signal.addEventListener('abort',settle,{once:true});
          try {await Promise.race([Promise.resolve(effect(context)),canceled]);}
          finally {context.signal.removeEventListener('abort',settle);}
        }
      } catch(error) {
        generation.effects=[];generation.abort.abort();throw error;
      } finally {generation.promise=undefined;}
    })();
    return generation.promise;
  }
}
