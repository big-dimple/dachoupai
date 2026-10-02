import type {HandSelectionUpdate} from './HandSelectionGesture';

export const HAND_SWEEP_HINT_KEY='dachoupai-hand-sweep-hint-v1';
/** Separate optional presentation preference. Never lives in the run/checkpoint or changes selection. */
export class HandSweepHint {
  private shown=false;
  private learned=false;
  constructor(){
    try{const value=JSON.parse(localStorage.getItem(HAND_SWEEP_HINT_KEY)??'null');this.shown=value?.shown===true;this.learned=value?.learned===true;}catch{/* Volatile hint state is sufficient when preferences are unavailable. */}
  }
  snapshot():{shown:boolean;learned:boolean}{return {shown:this.shown,learned:this.learned};}
  claim():boolean {if(this.shown||this.learned)return false;this.shown=true;this.persist();return true;}
  observe(update:HandSelectionUpdate):void {
    if(this.learned||update.phase!=='committed'||new Set(update.visitedIds).size<2)return;
    this.learned=true;this.persist();
  }
  private persist():void {try{localStorage.setItem(HAND_SWEEP_HINT_KEY,JSON.stringify(this.snapshot()));}catch{/* Optional preference must not block hand input. */}}
}
