import {SavedRun} from '../application/SavedRun';
import {MAX_IMPORT_BYTES,readCheckpoint,restoreSlots} from '../application/checkpoint';
import {createRun,type R2RunState} from '../domain/run';
import type {CharacterId} from '../domain/characters';
import {IndexedDbSave} from '../platform/IndexedDbSave';
import {WriteLease} from '../platform/WriteLease';

export class GameSession {
  readonly storage=new IndexedDbSave();
  readonly lease=new WriteLease();
  run?:SavedRun;
  notice='';
  loaded=false;
  working=false;
  speed:1|2|4=1;
  muted=false;
  reducedMotion=false;
  private listeners=new Set<()=>void>();
  constructor(){
    this.storage.canWrite=()=>this.lease.writable;
    this.lease.onChange=()=>{if(!this.lease.writable)this.run?.setReadOnly();this.changed();};
    try {const s=JSON.parse(localStorage.getItem('dachoupai-presentation-v1')??'null');if(s&&[1,2,4].includes(s.speed))this.speed=s.speed;if(typeof s?.muted==='boolean')this.muted=s.muted;if(typeof s?.reducedMotion==='boolean')this.reducedMotion=s.reducedMotion;}catch{/* Optional preferences cannot block a run. */}
    document.addEventListener('visibilitychange',()=>{if(document.hidden)void this.run?.flush();});
  }
  subscribe(listener:()=>void):()=>void {this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
  private changed():void {this.listeners.forEach(listener=>listener());}
  async initialize():Promise<void> {
    try {
      await this.lease.claim();
      const slots=await this.storage.read(),restored=restoreSlots(slots);
      if(restored.checkpoint)this.attach(SavedRun.restore(this.storage,slots));else this.run=undefined;
      this.notice=restored.status==='backup'?'当前存档损坏，已读取上次有效备份；原数据仍保留，可导出。':restored.status==='invalid'?'存档损坏或版本不兼容，原数据已保留。可导出保留数据，或确认后开始新局。':'';
      this.loaded=true;
    }catch(error){this.notice='无法读取存档：'+(error instanceof Error?error.message:'存储不可用')+'。请重试；不会清空已有数据。';}
    this.changed();
  }
  private attach(run:SavedRun):void {
    this.run=run;run.onChange=()=>this.changed();if(!this.lease.writable)run.setReadOnly();this.changed();
  }
  async start(seed:string,characterId:CharacterId):Promise<SavedRun|undefined> {
    if(!this.loaded||!this.lease.writable){this.notice='当前页面无法写入，请重试存储或接管写入。';this.changed();return;}
    if(this.working)return;this.working=true;this.notice='';this.changed();
    try {
      if(this.run&&!(await this.run.flush())){this.notice='本局尚未保存，请先重试或导出；未替换已有进度。';return;}
      const slots=await this.storage.read();
      const run=await SavedRun.start(this.storage,createRun({seed,characterId,runId:`run/${seed}/${characterId}`,rulesVersion:'r2'}),slots);
      this.notice='';this.attach(run);return run;
    }catch(error){this.notice='无法创建存档：'+(error instanceof Error?error.message:'存储错误');}
    finally {this.working=false;this.changed();}
  }
  async takeOver():Promise<boolean> {
    if(this.working)return false;this.working=true;this.changed();
    try {
      if(!await this.lease.claim(true)){this.notice='接管失败，另一页面仍持有写入锁。';return false;}
      await this.initialize();return this.loaded&&this.lease.writable;
    }finally {this.working=false;this.changed();}
  }
  async importJSON(text:string):Promise<boolean> {
    if(this.working)return false;
    if(!this.lease.writable){this.notice='只读页面，请先接管写入。';this.changed();return false;}
    this.working=true;this.changed();
    try {
      if(new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)throw Error('导入文件过大');
      const checked=readCheckpoint(JSON.parse(text));if(!checked.ok)throw Error(checked.code);
      if(this.run&&!await this.run.flush())throw Error('本局尚未保存，请先重试或导出');
      const run=await SavedRun.import(this.storage,checked.checkpoint,await this.storage.read());this.attach(run);
      if(run.status!=='idle')return false;
      this.notice='导入成功，已保存完整进度。';this.changed();return true;
    }catch(error){this.notice='导入失败：'+(error instanceof Error?error.message:'非法文件')+'。原进度未修改。';this.changed();return false;}
    finally {this.working=false;this.changed();}
  }
  preferences(speed:1|2|4,muted:boolean,reducedMotion=this.reducedMotion):void {
    this.speed=speed;this.muted=muted;this.reducedMotion=reducedMotion;
    try {localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed,muted,reducedMotion}));}catch{/* Playback remains usable when preferences cannot persist. */}
    window.dispatchEvent(new Event('dachoupai-presentation'));this.changed();
  }
  async retry():Promise<boolean> {if(!this.run)return false;const result=await this.run.retry();return result.ok;}
  state():R2RunState|undefined {return this.run?.state;}
}

let session:GameSession|undefined;
export const gameSession=():GameSession=>session??=new GameSession();
