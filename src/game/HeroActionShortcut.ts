import type {Box} from './layout';
/** Reuse the action row: portraits have a reserved gap, wider discard cells split into two legal hits. */
export function heroActionShortcut(discard:Box,actionX:number,portrait:boolean):{discard:Box;shortcut:Box}|undefined {
 if(portrait&&discard.x-actionX>=47)return {discard,shortcut:{x:discard.x-47,y:discard.y,width:44,height:discard.height}};
 if(discard.width>=94)return {discard:{...discard,width:discard.width-50},shortcut:{x:discard.x+discard.width-44,y:discard.y,width:44,height:discard.height}};
}
