import type Phaser from 'phaser';
import type {Box} from './layout';
import type {ShopRecommendation} from './ShopRecommendation';
import {JOKER_RARITY,type JokerRarity} from './JokerRarity';
import {UI_FONT} from './theme';

/** Presentation axes: rarity comes only from the definition; stars only from existing guidance. */
export const SHOP_VALUE_INK={recommendation:'#3F606B',five:'#765422',paper:0xfff9ee} as const;
export function shopRecommendationVisual(stars:number,width:number){
 return {width:Math.min(100,width),height:18,ink:stars===5?SHOP_VALUE_INK.five:SHOP_VALUE_INK.recommendation,exceptional:stars===5};
}
export function shopCombinationVisual(recommendation:Pick<ShopRecommendation,'combination'>){
 const line=recommendation.combination.split('\n').find(line=>line.startsWith('组合潜力：'));
 if(!line)return;
 const text=line.slice('组合潜力：'.length).replace(/。$/,'');
 // These are existing explanatory words, not a fresh source/activation/strength calculation.
 const cue=text.includes('尚缺')?'missing':text.includes('核对')?'check':'potential';
 return {cue,label:cue==='missing'?'缺搭档':cue==='check'?'看条件':'可搭配',fullText:line} as const;
}
export function createShopRarityFrame(scene:Phaser.Scene,b:Box,rarity:JokerRarity){
 const style=JOKER_RARITY[rarity],g=scene.add.graphics().setName('shop/offer-rarity-frame').setData('rarity',rarity).setData('bounds',b);
 g.lineStyle(1.2,style.edge,.8).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,5);
 if(rarity!=='common'){
  const k=rarity==='rare'?7:5;
  for(const [x,y,dx,dy]of [[b.x,b.y,1,1],[b.x+b.width,b.y,-1,1],[b.x,b.y+b.height,1,-1],[b.x+b.width,b.y+b.height,-1,-1]])
   g.lineStyle(1.5,style.edge,.9).beginPath().moveTo(x+dx*k,y+dy*3).lineTo(x+dx*3,y+dy*3).lineTo(x+dx*3,y+dy*k).strokePath();
 }
 return g;
}
export function createShopRecommendationAccent(scene:Phaser.Scene,b:Box){
 return scene.add.graphics().setName('shop/recommendation-accent').setData('axis','recommendation').setData('bounds',b)
 .fillStyle(0xf3e5c5,1).fillRoundedRect(b.x,b.y,b.width,18,3)
 .lineStyle(1,0x9b7940,.9).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,17,3);
}
export function createShopRouteTag(scene:Phaser.Scene,x:number,y:number,focus:'group'|'straight'|'flush',fullText:string){
 const tag=scene.add.container(x,y).setName('shop/offer-route-tag').setSize(32,18).setData('route',focus).setData('fullText',fullText);
 const plate=scene.add.graphics().fillStyle(SHOP_VALUE_INK.paper,.95).fillRoundedRect(0,0,32,18,3);
 const label=scene.add.text(4,1,{group:'同点',straight:'顺子',flush:'同花'}[focus],{fontFamily:UI_FONT,fontSize:'12px',color:SHOP_VALUE_INK.recommendation,resolution:1.5});
 return tag.add([plate,label]);
}
/** Three readable characters take priority over decorative rings beside the rarity badge. */
export function shopCombinationMarkLayout(availableWidth:number){
 if(availableWidth<44)return;
 return availableWidth>=62?{width:62,textX:18,rings:true}:{width:44,textX:4,rings:false};
}
export function createShopCombinationMark(scene:Phaser.Scene,x:number,y:number,cue:NonNullable<ReturnType<typeof shopCombinationVisual>>,layout:NonNullable<ReturnType<typeof shopCombinationMarkLayout>>){
 const mark=scene.add.container(x,y).setName('shop/offer-combination').setSize(layout.width,18).setData('cue',cue.cue).setData('label',cue.label).setData('fullText',cue.fullText).setData('bounds',{x,y,width:layout.width,height:18});
 const g=scene.add.graphics().fillStyle(SHOP_VALUE_INK.paper,.97).fillRoundedRect(0,0,layout.width,18,3).lineStyle(1,0x26313a,1);
 if(layout.rings){g.strokeCircle(6,9,4);
 if(cue.cue==='missing'||cue.cue==='check'){
  for(const start of [0,Math.PI*.5,Math.PI,Math.PI*1.5])g.beginPath().arc(11,9,4,start,start+Math.PI*.3,false).strokePath();
 }else g.strokeCircle(11,9,4);
 }
 const text=scene.add.text(layout.textX,1,cue.label,{fontFamily:UI_FONT,fontSize:'12px',color:'#26313A',resolution:1.5});
 return mark.add([g,text]);
}
export function createShopRecommendationStars(scene:Phaser.Scene,b:Box,stars:number,offerId:string,fullText:string,detail:string){
 const style=shopRecommendationVisual(stars,b.width),index=scene.add.container(b.x,b.y).setSize(style.width,style.height).setName('shop/offer-advice')
 .setData('offerId',offerId).setData('axis','recommendation').setData('stars',stars).setData('reason',detail).setData('fullText',fullText).setData('bounds',{...b,width:style.width});
 for(let i=0;i<5;i++)index.add(scene.add.text(style.width*(i+.5)/5,0,i<stars?'★':'☆',{fontFamily:UI_FONT,fontSize:'14px',color:style.ink,resolution:Math.min(window.devicePixelRatio||1,3)}).setOrigin(.5,0).setName('shop/offer-star').setData('offerId',offerId).setData('slot',i));
 return index;
}
