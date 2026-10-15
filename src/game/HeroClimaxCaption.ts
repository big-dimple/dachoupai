import type Phaser from 'phaser';
import type {heroClimaxLayout} from './HeroClimaxLayout';
import {crispText,textDensity} from './TextRaster';
import {UI_FONT,PAPER_CSS as C} from './theme';

/** Saved source facts stay readable across camera cuts, independent of any artwork.
 * No clocks, input or game commands: the existing subject hold/skip owns lifetime. */
export function mountHeroClimaxCaption(scene:Phaser.Scene,board:Phaser.GameObjects.Container,
 layout:ReturnType<typeof heroClimaxLayout>,copy:{title:string;owner:string;effect:string}):void {
 const l=layout;
 const text=(x:number,y:number,value:string,size:number,color:string,name:string)=>{
  const t=scene.add.text(x,y,value,{fontFamily:UI_FONT,fontSize:size+'px',fontStyle:'bold',color,resolution:textDensity(scene)}).setName(name);
  board.add(t);return t;
 };
 const headline=text(l.nameX,l.nameY,copy.title,l.short?26:l.portrait?36:52,C.ink,'hero/climax-name');
 for(let size=parseInt(headline.style.fontSize.toString());headline.width>l.nameW&&size>18;)headline.setFontSize(--size);
 crispText(headline);
 const owner=text(l.nameX,headline.y+headline.height+4,copy.owner,l.short?14:16,C.jade,'hero/climax-owner');
 owner.setWordWrapWidth(l.nameW,true);crispText(owner);
 const effect=text(l.nameX,l.noteY,copy.effect,l.short?14:17,C.ink,'hero/climax-note').setWordWrapWidth(l.nameW,true);
 // Fit real glyph bounds in the reserved footer; never scale a text bitmap with the image.
 for(let size=l.short?14:17;effect.height>l.sourceCaption.y-l.noteY-8&&size>14;)effect.setFontSize(--size);
 crispText(effect);
}
