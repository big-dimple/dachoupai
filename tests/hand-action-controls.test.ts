import {createHash} from 'node:crypto';
import type Phaser from 'phaser';
import {describe,expect,it} from 'vitest';
import {layout,intersects} from '../src/game/layout';
import {HAND_ACTION_LINES,drawHandActionGlyph,handActionContent} from '../src/game/HandActionArt';
const profiles=[[390,740,0,0,70],[320,568,0,0,106],[844,300,12,12,228],[844,300,12,34,228]];
const layouts=()=>profiles.map(([width,height,top,bottom])=>layout({width,height},{top,bottom,left:0,right:0},undefined,{count:9}));
describe('three groups share the existing bottom action row',()=>{
 it('preserves the complete non-control layout from main88b17e2, including every hand seat and vertical budget',()=>{
  const fixed=layouts().map(l=>{const {buttons,tableActions,tools,toolsInHud,...rest}=l;return rest;});
  expect(createHash('sha256').update(JSON.stringify(fixed)).digest('hex')).toBe('cff0c393264eb2e2508c92a6f155ca5de319e6b1868fe42430d6adfa331dcb8c');
 });
 it.each(profiles)('%s×%s safe %s/%s keeps two44px sort targets together, enlarges discard and fits all four targets', (width,height,top,bottom,oldDiscard)=>{
  const l=layout({width,height},{top,bottom,left:0,right:0},undefined,{count:9});
  expect(l.tools.width).toBe(88);expect(l.tools.y).toBe(l.actions.y);expect(l.buttons.rank.x).toBe(l.actions.x);expect(l.buttons.suit.x).toBe(l.buttons.rank.x+44);expect(l.tableActions.discard.width).toBeGreaterThan(oldDiscard);
  const controls=[...Object.values(l.buttons),...Object.values(l.tableActions)];
  for(const b of controls){expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);expect(b.y).toBe(l.actions.y);expect(b.height).toBe(l.actions.height);expect(b.x).toBeGreaterThanOrEqual(l.actions.x);expect(b.x+b.width).toBeLessThanOrEqual(l.actions.x+l.actions.width+.01);expect(b.y+b.height).toBeLessThanOrEqual(height-bottom);expect(intersects(b,l.hand)).toBe(false);}
  for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)expect(intersects(controls[i],controls[j])).toBe(false);
  for(const b of Object.values(l.tableActions)){const c=handActionContent(b);expect(c.text.width).toBeGreaterThanOrEqual(32);expect(c.glyph.x+c.glyph.width).toBeLessThan(c.text.x);expect(c.glyph.y).toBeGreaterThan(b.y);expect(c.glyph.y+c.glyph.height).toBeLessThan(b.y+b.height);expect(c.countY+10).toBeLessThan(b.y+b.height);}
 });
 it('keeps the original primary56px height and a larger submit target on the390 main layout',()=>{
  const l=layouts()[0];expect(l.tableActions.play.height).toBe(56);expect(l.tableActions.play.width).toBeGreaterThan(l.tableActions.discard.width);
 });
});
describe('card actions remain readable as different ink shapes',()=>{
 it('draws discard down into a flat card pile and play forward, independent of color',()=>{
  const down=HAND_ACTION_LINES.discard[2],forward=HAND_ACTION_LINES.play[3];expect(down[1][0]).toBe(down[0][0]);expect(down[1][1]).toBeGreaterThan(down[0][1]);expect(forward[1][0]).toBeGreaterThan(forward[0][0]);expect(forward[1][1]).toBe(forward[0][1]);expect(HAND_ACTION_LINES.discard[3].slice(0,-1)).toHaveLength(4);expect(HAND_ACTION_LINES.play.filter(line=>line[0][0]===line.at(-1)![0]&&line[0][1]===line.at(-1)![1])).toHaveLength(3);
 });
 it.each(['discard','play'] as const)('%s stays within28×36 and retains its whole geometry through enabled/disabled recoloring',kind=>{
  const draw=(color:number)=>{const log:unknown[][]=[];let g:object;g=new Proxy({}, {get:(_,name)=>(...args:unknown[])=>{log.push([name,...(name==='lineStyle'?[args[0],'COLOR',args[2]]:args)]);return g;}});drawHandActionGlyph(g as Phaser.GameObjects.Graphics,kind,color);return log;};
  expect(draw(0x3f606b)).toEqual(draw(0x595b59));for(const line of HAND_ACTION_LINES[kind])for(const [x,y] of line){expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThanOrEqual(28);expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThanOrEqual(36);}expect(draw(0x3f606b)).toContainEqual(['lineStyle',1.5,'COLOR',1]);
 });
});
