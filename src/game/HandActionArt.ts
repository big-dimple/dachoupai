import type Phaser from 'phaser';
import type {Box} from './layout';
export type HandButtonSkin='sort'|'discard'|'play';
export type HandActionKind='discard'|'play';
/** Small ink diagrams: a card falls onto a flat pile, or a fan is sent forward. */
export const HAND_ACTION_LINES={
  discard:[[[3,1],[14,0],[16,18],[5,19],[3,1]],[[8,7],[10,5],[12,7],[10,9],[8,7]],[[20,15],[20,27],[17,23],[20,27],[23,23]],[[1,29],[23,28],[27,33],[5,34],[1,29]],[[4,35],[25,35]]],
  play:[[[2,11],[14,7],[21,30],[8,34],[2,11]],[[8,12],[22,12],[22,35],[8,35],[8,12]],[[13,21],[15,19],[17,21],[15,23],[13,21]],[[13,4],[27,4],[23,0],[27,4],[23,8]]],
} as const;
export function drawHandActionGlyph(g:Phaser.GameObjects.Graphics,kind:HandActionKind,color:number):void {
  g.clear().lineStyle(1.5,color,1);
  for(const line of HAND_ACTION_LINES[kind]){g.beginPath().moveTo(line[0][0],line[0][1]);for(const [x,y] of line.slice(1))g.lineTo(x,y);g.strokePath();}
}
/** The symbol has its own rail; text/counts never have to share its ink footprint. */
export function handActionContent(b:Box){
  return {glyph:{x:b.x+6,y:b.y+(b.height-36)/2,width:28,height:36},text:{x:b.x+36,y:b.y+4,width:b.width-42,height:b.height-8},centerX:b.x+(b.width+30)/2,labelY:b.y+15,countY:b.y+37};
}
