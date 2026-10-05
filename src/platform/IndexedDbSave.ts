import type {SaveSlots,SaveStore} from '../application/SavedRun';
import {readCheckpoint,type Checkpoint} from '../application/checkpoint';
import {r2ModeStorageKey,type R2ModeSelection} from '../content/r2Modes';
import {R2_RULESETS,r2RulesetFor} from '../domain/r2Run';

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
    return this.readSlots();
  }
  /** Reading a selection does not change the globally published mode or its compare-and-swap revision. */
  async readPartition(selection:R2ModeSelection&{contentVersion?:unknown;contentHash?:unknown}):Promise<SaveSlots> {
    if(selection.contentHash!==undefined||selection.contentVersion!==undefined){
      const profile=r2RulesetFor(selection);if(!profile)throw Error('incompatible-version');
      return this.readSlots([r2ModeStorageKey(selection,profile.contentHash)],false);
    }
    // Resume the active same-mode run first, including its damaged-current/valid-backup pair.
    return this.readSlots(R2_RULESETS.map(profile=>r2ModeStorageKey(selection,profile.contentHash)),true);
  }
  private async readSlots(partitionKeys?:readonly string[],preferActive=false):Promise<SaveSlots> {
    const db=await this.database;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
      let slots:SaveSlots={revision:0,current:null,previous:null};
      const meta=store.get('meta');meta.onsuccess=()=>{
        const value=meta.result as Meta|undefined;if(value)slots.revision=value.revision;
        const keys=partitionKeys?[...partitionKeys]:value?.slotKey?[value.slotKey]:[];
        if(preferActive&&value?.slotKey&&keys.includes(value.slotKey))keys.splice(0,keys.length,value.slotKey,...keys.filter(key=>key!==value.slotKey));
        const next=()=>{
          const key=keys.shift();if(!key)return;
          const saved=store.get(key);saved.onsuccess=()=>{
            const found=saved.result as Slots|undefined;
            if(found&&(found.current!==null||found.previous!==null)){slots.current=found.current??null;slots.previous=found.previous??null;}
            else next();
          };
        };next();
      };
      tx.oncomplete=()=>resolve(slots);tx.onabort=tx.onerror=()=>reject(tx.error??Error('storage-read-failed'));
    });
  }
  async commit(expectedRevision:number,current:Checkpoint,previous:Checkpoint|null):Promise<number> {
    if(!this.canWrite())throw Error('read-only');
    const checked=readCheckpoint(current);if(!checked.ok)throw Error(checked.code);
    const candidate=checked.checkpoint,slotKey=r2ModeStorageKey(candidate.state,candidate.state.contentHash);
    const previousValid=previous?readCheckpoint(previous):null;
    const backup=previousValid?.ok&&r2ModeStorageKey(previousValid.checkpoint.state,previousValid.checkpoint.state.contentHash)===slotKey?
      previousValid.checkpoint:null;
    const db=await this.database;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let reason:unknown;
      const abort=(error:unknown)=>{reason=error;tx.abort();};
      const meta=store.get('meta');meta.onsuccess=()=>{
        if(!this.canWrite())return abort(Error('read-only'));
        const value=meta.result as Meta|undefined;
        if((value?.revision??0)!==expectedRevision)return abort(Error('write-conflict'));
        const existing=store.get(slotKey);existing.onsuccess=()=>{
          try {
            const old=existing.result as Slots|undefined;
            // Never erase the only copy of damaged/experimental data when starting a valid run.
            if(old?.current){
              const oldRead=readCheckpoint(old.current);
              if(!oldRead.ok||r2ModeStorageKey(oldRead.checkpoint.state,oldRead.checkpoint.state.contentHash)!==slotKey)
                store.put(old,`retained:${slotKey}:${expectedRevision}`);
            }
            store.put({current:candidate,previous:backup},slotKey);
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
