import type Phaser from 'phaser';
import type {Box} from './layout';
/** Keep the actual glyph bounds inside the existing status allocation, without moving or shrinking it. */
export function fitStatusSummary(text:Phaser.GameObjects.Text,area:Box,fallback?:string):void {
 const full=text.text,fit=()=>text.width<=area.width&&text.height<=area.height;
 text.setData('fullStatus',full);if(fit())return;
 if(fallback){text.setText(fallback);if(fit())return;}
 const characters=Array.from(text.text);let end=characters.length;
 while(!fit()&&end>0)text.setText(characters.slice(0,--end).join('')+'…');
 if(!fit())text.setText('');
}
