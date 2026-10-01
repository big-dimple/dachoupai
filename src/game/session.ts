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
  private replacement?:SavedRun;
  notice='';
  loaded=false;
  working=false;
  speed:1|2|4=1;
  reducedMotion=false;
  private listeners=new Set<()=>void>();
  constructor(){
    this.storage.canWrite=()=>this.lease.writable;
    this.lease.onChange=()=>{if(!this.lease.writable){this.run?.setReadOnly();this.replacement?.setReadOnly();}this.changed();};
    try {const s=JSON.parse(localStorage.getItem('dachoupai-presentation-v1')??'null');if(s&&[1,2,4].includes(s.speed))this.speed=s.speed;if(typeof s?.reducedMotion==='boolean')this.reducedMotion=s.reducedMotion;}catch{/* Optional preferences cannot block a run. */}
    document.addEventListener('visibilitychange',()=>{if(document.hidden){void this.run?.flush();void this.replacement?.flush();}});
  }
  get pendingRun():SavedRun|undefined {return this.replacement;}
  subscribe(listener:()=>void):()=>void {this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
  private changed():void {this.listeners.forEach(listener=>listener());}
  private pendingNotice():string {
    return this.replacement?.status==='readonly'?'未保存候选当前只读，请先导出或取消，再接管写入。原进度保留。':'新局或导入候选尚未保存，请重试保存、导出候选或取消。原进度保留。';
  }
  private blockPending():boolean {
    if(!this.replacement)return false;this.notice=this.pendingNotice();this.changed();return true;
  }
  async initialize():Promise<void> {
    if(this.working||this.blockPending())return;
    this.working=true;this.changed();
    try {await this.loadSavedRun();}
    finally {this.working=false;this.changed();}
  }
  private async loadSavedRun():Promise<boolean> {
    try {
      await this.lease.claim();
      const slots=await this.storage.read(),restored=restoreSlots(slots);
      if(restored.checkpoint)this.attach(SavedRun.restore(this.storage,slots));else this.run=undefined;
      this.notice=restored.status==='backup'?'当前存档损坏，已读取上次有效备份；原数据仍保留，可导出。':restored.status==='invalid'?'存档损坏或版本不兼容，原数据已保留。可导出保留数据，或确认后开始新局。':'';
      this.loaded=true;
      return true;
    }catch(error){this.notice='无法读取存档：'+(error instanceof Error?error.message:'存储不可用')+'。请重试；不会清空已有数据。';return false;}
    finally {this.changed();}
  }
  private attach(run:SavedRun):void {
    this.run=run;run.onChange=()=>this.changed();if(!this.lease.writable)run.setReadOnly();this.changed();
  }
  private async publishReplacement(run:SavedRun):Promise<boolean> {
    if(await run.flush()){this.attach(run);return true;}
    this.replacement=run;run.onChange=()=>this.changed();if(!this.lease.writable)run.setReadOnly();
    this.notice=this.pendingNotice();this.changed();return false;
  }
  async start(seed:string,characterId:CharacterId):Promise<SavedRun|undefined> {
    if(this.working||this.blockPending())return;
    if(!this.loaded||!this.lease.writable){this.notice='当前页面无法写入，请重试存储或接管写入。';this.changed();return;}
    this.working=true;this.notice='';this.changed();
    try {
      if(this.run&&!(await this.run.flush())){this.notice='本局尚未保存，请先重试或导出；未替换已有进度。';return;}
      const slots=await this.storage.read();
      const run=await SavedRun.start(this.storage,createRun({seed,characterId,runId:`run/${seed}/${characterId}`,rulesVersion:'r2'}),slots);
      if(!await this.publishReplacement(run))return;
      this.notice='';return run;
    }catch(error){this.notice='无法创建存档：'+(error instanceof Error?error.message:'存储错误');}
    finally {this.working=false;this.changed();}
  }
  async takeOver():Promise<boolean> {
    if(this.working||this.blockPending())return false;this.working=true;this.changed();
    try {
      if(!await this.lease.claim(true)){this.notice='接管失败，另一页面仍持有写入锁。';return false;}
      return await this.loadSavedRun()&&this.lease.writable;
    }finally {this.working=false;this.changed();}
  }
  async importJSON(text:string):Promise<boolean> {
    if(this.working||this.blockPending())return false;
    if(!this.lease.writable){this.notice='只读页面，请先接管写入。';this.changed();return false;}
    this.working=true;this.changed();
    try {
      if(new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)throw Error('导入文件过大');
      const checked=readCheckpoint(JSON.parse(text));if(!checked.ok)throw Error(checked.code);
      if(this.run&&!await this.run.flush())throw Error('本局尚未保存，请先重试或导出');
      const run=await SavedRun.import(this.storage,checked.checkpoint,await this.storage.read());
      if(!await this.publishReplacement(run))return false;
      this.notice='导入成功，已保存完整进度。';this.changed();return true;
    }catch(error){this.notice='导入失败：'+(error instanceof Error?error.message:'非法文件')+'。原进度未修改。';this.changed();return false;}
    finally {this.working=false;this.changed();}
  }
  preferences(speed:1|2|4,reducedMotion=this.reducedMotion):void {
    this.speed=speed;this.reducedMotion=reducedMotion;
    try {localStorage.setItem('dachoupai-presentation-v1',JSON.stringify({speed,reducedMotion}));}catch{/* Playback remains usable when preferences cannot persist. */}
    window.dispatchEvent(new Event('dachoupai-presentation'));this.changed();
  }
  async retry():Promise<boolean> {
    if(this.working)return false;
    const run=this.replacement??this.run;if(!run)return false;
    if(!this.lease.writable||run.status==='readonly'){
      run.setReadOnly();this.notice=this.replacement?this.pendingNotice():'当前进度只读，请先接管写入。';this.changed();return false;
    }
    this.working=true;this.changed();
    try {
      const result=await run.retry();
      if(!result.ok){if(this.replacement)this.notice=this.pendingNotice();return false;}
      if(this.replacement===run){this.replacement=undefined;this.attach(run);this.notice='候选已保存，现已切换到该进度。';}
      else this.notice='本局已保存。';
      return true;
    }finally {this.working=false;this.changed();}
  }
  cancelPending():boolean {
    if(!this.replacement||this.working||this.replacement.status==='saving')return false;
    this.replacement.onChange=()=>{};this.replacement.setReadOnly();this.replacement=undefined;
    this.notice='已取消未保存候选；原进度仍保留。';this.changed();return true;
  }
  state():R2RunState|undefined {return this.run?.state;}
}

let session:GameSession|undefined;
export const gameSession=():GameSession=>session??=new GameSession();
