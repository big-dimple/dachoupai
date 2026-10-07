import type Phaser from 'phaser';
import type {SceneView} from './SceneView';
import type {Box} from './layout';
import type {BuildGrowthProgress} from './BuildGrowthProgress';
import {jokerArtKey} from './jokerArt';
import {PAPER_CSS} from './theme';

/** Uses the existing card face and saved facts. Returns false rather than shrinking unreadable text. */
export function showBuildGrowth(view:SceneView,scene:Phaser.Scene,parent:Phaser.GameObjects.Container,area:Box,p:BuildGrowthProgress):boolean {
 if(area.height<94||area.width<250)return false;
 const b={x:area.x+(area.width-Math.min(480,area.width))/2,y:area.y,width:Math.min(480,area.width),height:94},start=view.root.length;
 const art=jokerArtKey(p.definitionId);
 if(art&&scene.textures.exists(art))view.add(scene.add.image(b.x+34,b.y+47,art).setDisplaySize(60,84).setName('growth/source-art'));
 const x=b.x+72,w=b.width-78;
 const rows:[[string,string,number,number],[string,string,number,number],[string,string,number,number],[string,string,number,number]]=[['growth/name',p.name,14,0],['growth/current',p.metric,20,19],['growth/cause',p.cause,14,48],['growth/next',p.next,14,71]];
 const texts=rows.map(([name,value,size,y])=>view.text(x,b.y+y,value,size,PAPER_CSS.jade,w).setName(name));
 if(texts.some((t,i)=>t.height>(i===1?28:22))){view.root.list.slice(start).forEach(o=>o.destroy());return false;}
 parent.add(view.root.list.slice(start));return true;
}
