import type {SaveSlots,SaveStore} from '../application/SavedRun';
import {readCheckpoint,type Checkpoint} from '../application/checkpoint';

const DB_NAME='dachoupai-checkpoints';
const STORE='saves';
interface Meta {revision:number;slotKey:string}
interface Slots {current:unknown|null;previous:unknown|null}

/** A complete state and its receipts/journal, plus the previous valid state, in one transaction. */
export class IndexedDbSave implements SaveStore {
  private database:Promise<IDBDatabase>;
  canWrite:()=>boolean=()=>true;
  constructor(){
    this.database=new Promise((resolve,reject)=>{
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
      request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};
      request.onerror=()=>reject(request.error??Error('storage-open-failed'));
      request.onblocked=()=>reject(Error('storage-upgrade-blocked'));
    });
    void this.database.catch(()=>{}); // Boot reports the error after assets load; avoid an early unhandled rejection.
  }
  async read():Promise<SaveSlots> {
    const db=await this.database;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
      let slots:SaveSlots={revision:0,current:null,previous:null};
      const meta=store.get('meta');meta.onsuccess=()=>{
        const value=meta.result as Meta|undefined;if(!value)return;
        slots.revision=value.revision;const saved=store.get(value.slotKey);
        saved.onsuccess=()=>{const found=saved.result as Slots|undefined;slots.current=found?.current??null;slots.previous=found?.previous??null;};
      };
      tx.oncomplete=()=>resolve(slots);tx.onabort=tx.onerror=()=>reject(tx.error??Error('storage-read-failed'));
    });
  }
  async commit(expectedRevision:number,current:Checkpoint,previous:Checkpoint|null):Promise<number> {
    if(!this.canWrite())throw Error('read-only');
    const db=await this.database;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let reason:unknown;
      const abort=(error:unknown)=>{reason=error;tx.abort();};
      const meta=store.get('meta');meta.onsuccess=()=>{
        if(!this.canWrite())return abort(Error('read-only'));
        const value=meta.result as Meta|undefined;
        if((value?.revision??0)!==expectedRevision)return abort(Error('write-conflict'));
        const slotKey=`${current.state.rulesVersion}:${current.state.contentHash}`;
        const existing=store.get(slotKey);existing.onsuccess=()=>{
          try {
            const old=existing.result as Slots|undefined;
            // Never erase the only copy of damaged/experimental data when starting a valid run.
            if(old?.current&&!readCheckpoint(old.current).ok)store.put(old,`retained:${slotKey}:${expectedRevision}`);
            const backup=previous?.state.contentHash===current.state.contentHash?previous:null;
            store.put({current,previous:backup},slotKey);
            store.put({revision:expectedRevision+1,slotKey},'meta');
          } catch(error){abort(error);}
        };
      };
      tx.oncomplete=()=>resolve(expectedRevision+1);
      tx.onabort=tx.onerror=()=>reject(reason??tx.error??Error('storage-write-failed'));
    });
  }
  async exportRetained():Promise<string> {
    const db=await this.database;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).openCursor(),records:unknown[]=[];
      request.onsuccess=()=>{const c=request.result;if(c){records.push({key:c.key,value:c.value});c.continue();}};
      tx.oncomplete=()=>resolve(JSON.stringify({format:'dachoupai-storage-backup',records},null,2));
      tx.onabort=tx.onerror=()=>reject(tx.error??Error('storage-export-failed'));
    });
  }
}
