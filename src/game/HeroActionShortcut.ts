import type {Box} from './layout';
/** A dedicated skill area leaves the entire discard hit available to its own action. */
export function heroActionShortcut(discard:Box,shortcut:Box):{discard:Box;shortcut:Box} {
 return {discard,shortcut};
}
/** Availability is distinct from an opportunity that still needs a selection. */
export function heroShortcutReminder(available:boolean,chosen:boolean,writable:boolean,blocked:boolean,reduced:boolean,time:number):{alpha:number;opacity:number;width:number;state:string} {
 if(!writable||blocked)return {alpha:1,opacity:0,width:0,state:'paused'};
 if(chosen)return {alpha:1,opacity:1,width:3,state:'chosen'};
 if(!available)return {alpha:1,opacity:0,width:0,state:'needs-selection'};
 const alpha=reduced?1:.85+.15*Math.cos(time*Math.PI/2000);
 return {alpha,opacity:alpha,width:2,state:reduced?'static':'breathing'};
}
