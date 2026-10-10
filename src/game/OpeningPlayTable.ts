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
 v.text(b.x+pad,b.y+5,s.tag+' · 示例',14,'#3F606B').setName('opening/play');
 const replayWidth=70;
 v.button({x:b.x+b.width-replayWidth-pad,y:b.y+2,width:replayWidth,height:short?30:32},'再看一次','action/opening-replay',replay);
 const top=b.y+(short?30:38),footer=short?38:narrow?44:50;
 const rowH=narrow?(b.y+b.height-footer-top)/2:b.y+b.height-footer-top;
 const colW=narrow?b.width-pad*2:(b.width-pad*2-32)/2;
 const rows=[s.before,s.after];
 const animated:Phaser.GameObjects.Container[]=[];
 rows.forEach((row,i)=>{
  const x=b.x+pad+(narrow?0:i*(colW+32)),y=top+(narrow?i*rowH:0);
  const label=v.text(x,y,row.label,short?14:narrow?14:18,i?'#B8473A':'#26313A',colW).setFontStyle('bold').setName('opening/sample-'+(i?'after':'before'));
  const h=Math.max(32,Math.min(narrow?50:short?44:72,rowH-label.height-6)),gap=2;
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
 const fy=b.y+b.height-footer+2;
 v.text(b.x+pad,fy,s.result,short?14:narrow?14:20,'#B8473A',b.width-pad*2).setFontStyle('bold').setName('opening/sample-result');
 v.text(b.x+pad,fy+(short?18:narrow?20:27),s.cost,14,'#3F606B',b.width-pad*2).setName('opening/cost');
 return animated;
}
