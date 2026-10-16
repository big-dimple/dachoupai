import type {CharacterId} from '../domain/characters';
import type {Box} from './layout';
import type {heroClimaxLayout} from './HeroClimaxLayout';

// Normalized strips reviewed against all six existing head crops. Both eyes and
// eyebrows stay together; no scan, texture generation or independent eye artwork.
const strips:Record<CharacterId,readonly[number,number,number,number]>={
 amo:[.25,.177,.667,.271],touye:[.308,.383,.6,.217],laohuan:[.288,.288,.635,.27],
 erxiang:[.073,.245,.6,.236],azao:[.25,.317,.6,.267],xiemu:[.35,.192,.583,.25],
};
export function heroFocusCrop(id:CharacterId,width:number,height:number):Box {
 const [x,y,w,h]=strips[id];return {x:Math.round(x*width),y:Math.round(y*height),width:Math.round(w*width),height:Math.round(h*height)};
}
export function heroFocusComposition(l:ReturnType<typeof heroClimaxLayout>,hasSource:boolean){
 const b=l.body,short=l.short,gap=short?24:18;
 const eyes:Box=short?{x:b.x+12,y:b.y+6,width:b.width*.38-20,height:b.height-12}:{x:b.x+12,y:b.y+4,width:b.width-(hasSource?86:24),height:Math.min(110,b.height*.43)};
 const source=hasSource&&!short?{x:b.x+b.width-58,y:eyes.y,width:58,height:eyes.height}:undefined;
 const row:Box=short?{x:b.x+b.width*.38+gap,y:b.y+4,width:b.width*.62-gap,height:b.height-4}:{x:b.x,y:eyes.y+eyes.height+18,width:b.width,height:l.noteY-eyes.y-eyes.height-28};
 const labelY=row.y,numberY=labelY+(short?22:26),numberH=Math.max(1,Math.min(short?64:104,l.noteY-numberY-10));
 const local={x:row.x,y:numberY,width:(row.width-16)*.46,height:numberH},total={x:row.x+local.width+16,y:numberY,width:row.width-local.width-16,height:numberH};
 return {eyes,source,row,labelY,local,total};
}
/** One short charge and one release. The sampled portrait never moves or scales. */
export function heroFocusPose(age:number,strikeAge:number|undefined,reduced=false){
 if(reduced)return {alpha:.24,release:1};
 if(strikeAge===undefined)return {alpha:.18+.32*Math.min(1,Math.max(0,age)/180),release:0};
 const t=Math.min(1,Math.max(0,strikeAge)/220);return {alpha:.18+.82*(1-t)**2,release:t};
}
