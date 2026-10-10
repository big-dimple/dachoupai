import type Phaser from 'phaser';
import type {Box} from './layout';
import type {SceneView} from './SceneView';
import type {OpeningPlaySample} from './OpeningPlaySample';
import {PAPER_THEME} from './theme';

/** Two readable states share one paper table; movement decorates, never gates choice. */
export function drawOpeningPlayTable(scene:Phaser.Scene,v:SceneView,b:Box,s:OpeningPlaySample,replay:()=>void){
 const narrow=b.width<500,short=b.height<130,pad=short?4:8;
 v.material(b,PAPER_THEME.paperLight,PAPER_THEME.paperLight,8);
 v.add(scene.add.graphics().lineStyle(1,PAPER_THEME.divider,.8).strokeRoundedRect(b.x,b.y,b.width,b.height,8));
 if(!short)v.text(b.x+pad,b.y+5,s.tag+' · 示例',14,'#3F606B').setName('opening/play');
 const replayWidth=70;
 const footerWidth=b.width-pad*2-(short?replayWidth+8:0);
 const result=v.text(b.x+pad,0,s.result,short?14:narrow?14:20,'#B8473A',footerWidth).setFontStyle('bold').setName('opening/sample-result');
 const cost=v.text(b.x+pad,0,s.cost,14,'#3F606B',footerWidth).setName('opening/cost');
 const footer=result.height+cost.height+8,footerY=b.y+b.height-footer;
 result.setY(footerY+2);cost.setY(result.y+result.height+2);
 v.button({x:b.x+b.width-replayWidth-pad,y:short?footerY:b.y+2,width:replayWidth,height:short?30:32},'再看一次','action/opening-replay',replay);
 const top=b.y+(short?4:36);
 const rowH=narrow?(b.y+b.height-footer-top)/2:b.y+b.height-footer-top;
 const colW=narrow?b.width-pad*2:(b.width-pad*2-32)/2;
 const rows=[s.before,s.after];
 const animated:Phaser.GameObjects.Container[]=[];
 rows.forEach((row,i)=>{
  const x=b.x+pad+(narrow?0:i*(colW+32)),y=top+(narrow?i*rowH:0);
  const label=v.text(x,y,row.label,short?14:narrow?14:18,i?'#B8473A':'#26313A',colW).setFontStyle('bold').setName('opening/sample-'+(i?'after':'before'));
  const h=Math.max(44,Math.min(narrow?50:short?44:72,rowH-label.height-6)),gap=2;
  const width=Math.min(narrow?40:54,(colW-(row.cards.length-1)*gap)/row.cards.length);
  const cardsWidth=row.cards.length*(width+gap)-gap,start=x+(colW-cardsWidth)/2,cy=y+label.height+3;
  row.cards.forEach((value,index)=>{
   const first=v.root.length,cx=start+index*(width+gap),marked=row.marked.includes(index),ink=/[♥♦]/.test(value)?'#B8473A':'#26313A';
   v.material({x:cx,y:cy,width,height:h},PAPER_THEME.paperLight,PAPER_THEME.paperLight,3);
   v.add(scene.add.graphics().lineStyle(marked?2:1,marked?PAPER_THEME.red:PAPER_THEME.divider).strokeRoundedRect(cx,cy,width,h,3));
   const rank=value.slice(0,-1),suit=value.slice(-1);
   v.text(cx+width/2,cy+2,rank,16,ink).setOrigin(.5,0).setFontStyle('bold').setName('opening/card-rank');
   v.text(cx+width/2,cy+h-2,suit,h>=60?26:18,ink).setOrigin(.5,1).setName('opening/card-suit');
   const art=scene.add.container(0,0);for(const child of v.root.list.slice(first))art.add(child);v.add(art);art.setName('opening/sample-card');
   if(i)animated.push(art);
  });
 });
 if(!narrow)v.text(b.x+b.width/2,top+rowH/2,'→',26,'#B8473A').setOrigin(.5);
 return animated;
}
