import {applyCommand,type Action,type Command,type CommandResult,type R2RunState} from '../domain/run';
import {freezeCheckpoint} from './RunController';
import {makeCheckpoint,restoreSlots,type Checkpoint} from './checkpoint';

export interface SaveSlots {revision:number;current:unknown|null;previous:unknown|null}
export interface SaveStore {
  read():Promise<SaveSlots>;
  commit(expectedRevision:number,current:Checkpoint,previous:Checkpoint|null):Promise<number>;
}
type Success=Extract<CommandResult<R2RunState>,{ok:true}>;
export type SaveStatus='idle'|'saving'|'paused'|'readonly';

/** One pending transaction: retry persists the candidate, never re-applies the domain command. */
export class SavedRun {
  private checkpoint:Checkpoint;
  private revision:number;
  private pending?:{checkpoint:Checkpoint;result:Success;backup:Checkpoint|null};
  private active?:Promise<CommandResult<R2RunState>>;
  status:SaveStatus='idle';
  lastError='';
  onChange:()=>void=()=>{};

  private constructor(private readonly store:SaveStore,checkpoint:Checkpoint,revision:number){
    this.checkpoint=freezeCheckpoint(checkpoint);this.revision=revision;
  }
  get state():R2RunState {return this.checkpoint.state;}
  get journal():readonly Command[] {return this.checkpoint.journal;}
  exportJSON():string {return JSON.stringify(this.pending?.checkpoint??this.checkpoint,null,2);}

  static async start(store:SaveStore,state:R2RunState,slots:SaveSlots):Promise<SavedRun> {
    return SavedRun.import(store,makeCheckpoint(state,[]),slots);
  }
  static async import(store:SaveStore,checkpoint:Checkpoint,slots:SaveSlots):Promise<SavedRun> {
    const run=new SavedRun(store,checkpoint,slots.revision),state=checkpoint.state,receipt=state.receipts.at(-1)!;
    run.pending={checkpoint,result:{ok:true,state,events:[],receipt,duplicate:false},backup:restoreSlots(slots).checkpoint??null};
    await run.persist();return run;
  }
  static restore(store:SaveStore,slots:SaveSlots):SavedRun {
    const restored=restoreSlots(slots);if(!restored.checkpoint)throw Error(restored.code??'invalid-save');
    return new SavedRun(store,restored.checkpoint,slots.revision);
  }
  dispatch(action:Action):Promise<CommandResult<R2RunState>> {
    return this.submit({runId:this.state.runId,commandId:`${this.state.runId}/command/${this.state.commandSeq+1}`,expectedSeq:this.state.commandSeq,action});
  }
  async submit(command:Command):Promise<CommandResult<R2RunState>> {
    if(this.status!=='idle')return {ok:false,code:this.status==='saving'?'command-busy':this.status==='readonly'?'read-only':'save-paused',state:this.state};
    const result=applyCommand(this.state,command);
    if(!result.ok||result.duplicate)return result;
    this.pending={checkpoint:makeCheckpoint(result.state,[...this.journal,structuredClone(command)]),result,backup:this.checkpoint};
    return this.persist();
  }
  async retry():Promise<CommandResult<R2RunState>> {
    if(!this.pending||this.status!=='paused')return {ok:false,code:'nothing-to-retry',state:this.state};
    return this.persist();
  }
  setReadOnly():void {this.status='readonly';this.onChange();}
  async flush():Promise<boolean> {if(this.active)await this.active;return !this.pending&&(this.status==='idle'||this.status==='readonly');}
  private persist():Promise<CommandResult<R2RunState>> {
    this.active=this.performPersist();return this.active;
  }
  private async performPersist():Promise<CommandResult<R2RunState>> {
    const pending=this.pending!;this.status='saving';this.onChange();
    try {
      this.revision=await this.store.commit(this.revision,pending.checkpoint,pending.backup);
      this.checkpoint=freezeCheckpoint(pending.checkpoint);this.pending=undefined;this.status='idle';this.lastError='';
      return {...pending.result,state:this.state};
    } catch(error) {
      this.lastError=error instanceof DOMException&&error.name==='QuotaExceededError'?'quota-exceeded':error instanceof Error?error.message:'storage-error';
      this.status=this.lastError==='write-conflict'||this.lastError==='read-only'?'readonly':'paused';
      return {ok:false,code:this.status==='readonly'?'read-only':'save-failed',state:this.state};
    } finally {this.onChange();}
  }
}
