import type Phaser from 'phaser';
import type {R2JokerDefinition} from '../content/r2Schema';
import {UI_FONT} from './theme';

export type JokerRarity = R2JokerDefinition['rarity'];
type RarityShape = 'circle' | 'diamond' | 'star';

function rarityStyle(label:string,compactLabel:string,symbol:string,shape:RarityShape,ink:number,paper:number,edge:number) {
  const css=(color:number)=>`#${color.toString(16).padStart(6,'0')}`;
  return {label,compactLabel,symbol,shape,ink,paper,edge,css:{ink:css(ink),paper:css(paper),edge:css(edge)}} as const;
}

/** Definition rarity only: edition, enhancement and temporary card states are separate layers. */
export const JOKER_RARITY = {
  common:rarityStyle('普通','普','●','circle',0x26313a,0xf3eadb,0x59646a),
  uncommon:rarityStyle('特别','特','◆','diamond',0x3f606b,0xe2e8e5,0x3f606b),
  rare:rarityStyle('稀有','稀','✦','star',0xb8473a,0xf0d3c7,0xb8473a),
} as const satisfies Record<JokerRarity,ReturnType<typeof rarityStyle>>;

interface RarityBadgeSizeOptions {width?:number;compact?:boolean}
export interface JokerRarityBadgeOptions extends RarityBadgeSizeOptions {x:number;y:number;resolution?:number}

/** Coordinates are local to the top-left corner; short labels preserve readable type in narrow slots. */
export function jokerRarityBadgeLayout(options:RarityBadgeSizeOptions={}) {
  const requestedWidth=Number.isFinite(options.width)?Math.max(28,Math.floor(options.width!)):(options.compact?28:58);
  const compact=!!options.compact||requestedWidth<52;
  const width=requestedWidth,height=compact?18:22,padding=compact?3:5,shapeSize=compact?7:10,gap=compact?2:4;
  const textX=padding+shapeSize+gap;
  return {
    width,height,compact,fontSize:compact?12:14,
    shape:{x:padding+shapeSize/2,y:height/2,radius:shapeSize/2},
    text:{x:textX,y:height/2,width:width-textX-padding,height:height-2},
  } as const;
}

/** Opaque and static. Add after art/state overlays so those layers cannot erase the card's identity. */
export function createJokerRarityBadge(scene:Phaser.Scene,rarity:JokerRarity,options:JokerRarityBadgeOptions):Phaser.GameObjects.Container {
  const style=JOKER_RARITY[rarity],layout=jokerRarityBadgeLayout(options);
  const badge=scene.add.container(options.x,options.y).setName('rarity-badge').setSize(layout.width,layout.height)
    .setData('rarity',rarity).setData('shape',style.shape).setData('compact',layout.compact);
  const plate=scene.add.graphics().setName('rarity-badge/plate');
  plate.fillStyle(style.paper,1).fillRoundedRect(.5,.5,layout.width-1,layout.height-1,4);
  plate.lineStyle(1,style.edge,1).strokeRoundedRect(.5,.5,layout.width-1,layout.height-1,4);
  plate.fillStyle(style.ink,1);
  const {x,y,radius}=layout.shape;
  if(style.shape==='circle')plate.fillCircle(x,y,radius);
  else {
    const points=style.shape==='star'?8:4;
    plate.beginPath();
    for(let i=0;i<points;i++){
      const angle=-Math.PI/2+i*Math.PI*2/points,r=style.shape==='star'&&i%2?radius*.4:radius;
      const px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r;
      if(i===0)plate.moveTo(px,py);else plate.lineTo(px,py);
    }
    plate.closePath().fillPath();
  }
  const label=scene.add.text(layout.text.x,layout.text.y,layout.compact?style.compactLabel:style.label,{
    fontFamily:UI_FONT,fontSize:`${layout.fontSize}px`,fontStyle:'bold',color:style.css.ink,
    resolution:options.resolution??1.5,
  }).setName('rarity-badge/label').setOrigin(0,.5);
  // Font metrics vary by platform. Fit within the reserved box without changing the badge or shape.
  let fontSize:number=layout.fontSize;
  while(fontSize>10&&(label.width>layout.text.width||label.height>layout.text.height))label.setFontSize(--fontSize);
  badge.add([plate,label]);
  return badge;
}

export function createJokerRarityElement(rarity:JokerRarity,compact=false):HTMLSpanElement {
  const style=JOKER_RARITY[rarity],badge=document.createElement('span');
  badge.className='joker-rarity-badge'+(compact?' joker-rarity-badge--compact':'');
  badge.dataset.rarity=rarity;badge.dataset.shape=style.shape;badge.dataset.compact=String(compact);
  badge.style.setProperty('--rarity-ink',style.css.ink);
  badge.style.setProperty('--rarity-paper',style.css.paper);
  badge.style.setProperty('--rarity-edge',style.css.edge);
  badge.textContent=`${style.symbol} ${compact?style.compactLabel:style.label}`;
  badge.setAttribute('aria-label',`稀有度：${style.label}`);
  badge.title=`稀有度：${style.label}`;
  return badge;
}
