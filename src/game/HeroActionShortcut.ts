import type {Box} from './layout';
/** Reuse the action row: portraits have a reserved gap, wider discard cells split into two legal hits. */
export function heroActionShortcut(discard:Box,actionX:number,portrait:boolean):{discard:Box;shortcut:Box}|undefined {
 if(portrait&&discard.x-actionX>=47)return {discard,shortcut:{x:discard.x-47,y:discard.y,width:44,height:discard.height}};
 if(discard.width>=94)return {discard:{...discard,width:discard.width-50},shortcut:{x:discard.x+discard.width-44,y:discard.y,width:44,height:discard.height}};
}
/** Availability is distinct from an opportunity that still needs a selection. */
export function heroShortcutReminder(available:boolean,chosen:boolean,writable:boolean,blocked:boolean,reduced:boolean,time:number):{alpha:number;opacity:number;width:number;state:string} {
 if(!writable||blocked)return {alpha:1,opacity:0,width:0,state:'paused'};
 if(chosen)return {alpha:1,opacity:1,width:3,state:'chosen'};
 if(!available)return {alpha:1,opacity:0,width:0,state:'needs-selection'};
 const alpha=reduced?1:.85+.15*Math.cos(time*Math.PI/2000);
 return {alpha,opacity:alpha,width:2,state:reduced?'static':'breathing'};
}
