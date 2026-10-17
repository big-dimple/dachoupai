import type Phaser from 'phaser';
import {textDensity} from './TextRaster';

/** The small skill status needs device pixels too; its font and button geometry stay unchanged. */
export function updateHeroSkillStatusText(text:Phaser.GameObjects.Text|undefined,value:string,color:string):void {
  if(!text)return;
  const resolution=textDensity(text.scene);
  // Phaser 3.90 setResolution redraws the bitmap but leaves this sampling divisor unchanged.
  // Keep both values paired, as the Text constructor does, or the glyphs grow with DPR.
  if(text.frame.source.resolution!==resolution)text.frame.source.resolution=resolution;
  if(text.style.resolution!==resolution)text.setResolution(resolution);
  if(text.text!==value)text.setText(value);
  if(text.style.color!==color)text.setColor(color);
}
