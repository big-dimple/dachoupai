import {createHash} from 'node:crypto';
import type Phaser from 'phaser';
import {describe,expect,it,vi} from 'vitest';
import {R2_JOKERS} from '../src/content/r2Schema';
import {CHARACTERS} from '../src/game/characters';
import {drawJokerMotif} from '../src/game/JokerMotif';
import {addAvatar,avatarKey} from '../src/game/portraits';
import {PAPER_THEME,PAPER_CSS,UI_FONT} from '../src/game/theme';

function motif(id:string){
 const geometry:unknown[][]=[],colors:number[]=[];let graphics:object;
 graphics=new Proxy({}, {get:(_,name)=>(...args:unknown[])=>{
  const colorAt=name==='fillStyle'?0:name==='lineStyle'?1:-1;
  if(colorAt>=0)colors.push(args[colorAt] as number);
  geometry.push([name,...args.map((a,i)=>i===colorAt?'COLOR':a)]);return graphics;
 }});
 const scene={add:{container:(x:number,y:number)=>({setScale:(scale:number)=>{geometry.push(['container',x,y,scale]);return {add(){}};}}),graphics:()=>graphics}};
 drawJokerMotif(scene as unknown as Phaser.Scene,{add(){}} as unknown as Phaser.GameObjects.Container,id,7,11,48);
 return {geometry,colors};
}
const luminance=(color:number)=>[color>>16&255,color>>8&255,color&255].map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);

describe('readable fault artwork uses the existing paper palette',()=>{
 it('preserves every production ID mechanism branch and color-neutral drawing geometry from main7b8959d',()=>{
  const rows=R2_JOKERS.map(d=>[d.id,motif(d.id).geometry]);expect(rows).toHaveLength(72);
  expect(createHash('sha256').update(JSON.stringify(rows)).digest('hex')).toBe('b10ac22a0b18274573182e6d38bf9e2c79e19248de36a3e24e261c74d046d4eb');
 });
 it('draws visible mechanism strokes for all72 IDs using only established theme colors',()=>{
  const palette=new Set<number>(Object.values(PAPER_THEME));
  for(const d of R2_JOKERS){const {geometry,colors}=motif(d.id);expect(colors.length,d.id).toBeGreaterThan(3);expect(colors.every(c=>palette.has(c)),d.id).toBe(true);expect(geometry.some(g=>g[0]==='lineStyle'&&Number(g[1])>=1.5),d.id).toBe(true);}
 });
 it.each(CHARACTERS)('$id missing avatar keeps its own initial in dark ink on an opaque30px paper tile',character=>{
  const rectangle={setStrokeStyle:vi.fn().mockReturnThis()},text={setOrigin:vi.fn().mockReturnThis()},add=vi.fn(),scene={textures:{exists:()=>false},add:{rectangle:vi.fn(()=>rectangle),text:vi.fn(()=>text)}};
  vi.stubGlobal('devicePixelRatio',3);
  try{addAvatar(scene as unknown as Phaser.Scene,{add} as unknown as Phaser.GameObjects.Container,character,17,23,30);
   expect(scene.add.rectangle).toHaveBeenCalledWith(17,23,30,30,PAPER_THEME.paper,1);expect(rectangle.setStrokeStyle).toHaveBeenCalledWith(1,PAPER_THEME.jade);
   expect(scene.add.text).toHaveBeenCalledWith(17,23,character.name[0],expect.objectContaining({fontFamily:UI_FONT,fontSize:'22px',color:PAPER_CSS.ink,resolution:2}));expect(text.setOrigin).toHaveBeenCalledWith(.5);expect(add).toHaveBeenCalledTimes(2);
   expect((luminance(PAPER_THEME.paper)+.05)/(luminance(PAPER_THEME.ink)+.05)).toBeGreaterThan(7);
  }finally{vi.unstubAllGlobals();}
 });
 it('retains the correctly keyed loaded-avatar crop and never adds a fault tile over an existing portrait',()=>{
  const image={setCrop:vi.fn().mockReturnThis(),setScale:vi.fn().mockReturnThis()},add=vi.fn(),scene={textures:{exists:(key:string)=>key===avatarKey('amo'),get:()=>({getSourceImage:()=>({width:220,height:220})})},add:{image:vi.fn(()=>image),rectangle:vi.fn(),text:vi.fn()}};
  addAvatar(scene as unknown as Phaser.Scene,{add} as unknown as Phaser.GameObjects.Container,CHARACTERS[0],17,23,30);
  expect(scene.add.image).toHaveBeenCalledWith(17,23,'avatar-amo');expect(image.setCrop).toHaveBeenCalledWith(0,0,220,220);expect(image.setScale).toHaveBeenCalledWith(30/220);expect(scene.add.rectangle).not.toHaveBeenCalled();expect(scene.add.text).not.toHaveBeenCalled();expect(add).toHaveBeenCalledWith(image);
 });
});
