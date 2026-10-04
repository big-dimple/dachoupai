import type {TableLayout} from './layout';
/** Exactly the same real label box on first mount and every refresh. */
export function jokerLabelRoom(layout:TableLayout,index:number):number {
 return layout.mode==='landscape'?layout.jokerLabels[index].width:layout.slots[index].width-6;
}
/** Ordered complete phrases only; a state value never falls back to a mechanism. */
export function fitJokerLabel(candidates:readonly string[],fits:(text:string)=>boolean,state=false):string {
 for(const text of candidates)if(fits(text))return text;
 const entry=state?'状态 ›':'条件 ›';
 return fits(entry)?entry:state?'状态':'条件';
}
