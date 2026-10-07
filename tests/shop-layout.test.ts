import {it,expect} from 'vitest';
import {shopLayout,shopSummaryWrap,shopOfferCopy,shopOwnedDropIndex,shopOwnedHitBox,shopOwnedNameArea} from '../src/game/ShopLayout';
import {intersects} from '../src/game/layout';
it('three visible modest 5:7 goods, separate readable copy, inventory below, one main action row',()=>{
 for(const width of [360,390,430])for(const height of [640,740])for(const bottom of [0,34]){
  const l=shopLayout(width,height,8,bottom,3);expect(l.shelf).toHaveLength(3);
  for(const b of l.shelf){expect(b.width).toBeGreaterThanOrEqual(88);expect(b.width).toBeLessThanOrEqual(108);expect(b.height/b.width).toBeCloseTo(1.4);expect(b.y+b.height+76).toBeLessThan(l.slots[0].y-18);expect(intersects({...b,height:b.height+76},l.reroll)).toBe(false);}
  expect(l.slots.every(b=>Math.abs(b.height/b.width-1.4)<1e-6)).toBe(true);
  expect(l.play.y).toBeGreaterThan(l.reroll.y+l.reroll.height);expect(l.play.y+l.play.height).toBeLessThan(height-bottom);expect(l.play.height).toBeGreaterThanOrEqual(48);
  expect(l.slots[0].y+l.slots[0].height).toBeLessThan(l.reroll.y);
 }
});

it('short landscape has three discoverable goods/copy clear of every action through safe34',()=>{
 for(const bottom of [0,12,34]){const l=shopLayout(844,300,12,bottom,3);
  const toolbar={x:684,y:l.top,width:148,height:44};
  expect(l.tabs.y-toolbar.y-toolbar.height).toBeGreaterThanOrEqual(4);
  expect(intersects(l.tabs,toolbar)).toBe(false);
  expect(l.shelf).toHaveLength(3);for(const b of l.shelf){const seat=(l.tabs.width-16)/3,tile={...b,width:seat-2};
   expect(b.y-l.tabs.y-l.tabs.height).toBeGreaterThanOrEqual(2);
   expect(intersects(tile,toolbar)).toBe(false);expect(intersects(tile,l.tabs)).toBe(false);
   for(const action of [l.play,l.reroll,l.build])expect(intersects(tile,action)).toBe(false);expect(b.y+b.height).toBeLessThan(300-bottom);
  }
  for(const b of l.slots)for(const a of [l.play,l.reroll,l.build])expect(intersects(b,a)).toBe(false);expect(l.play.height).toBe(56);
 }
});

it('the real320×568 shop keeps all five inventory cards inside the viewport and above actions',()=>{
 const l=shopLayout(320,568,12,0,3,true);
 for(const b of l.slots){expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(320);expect(intersects(b,l.reroll)).toBe(false);expect(intersects(b,l.build)).toBe(false);expect(intersects(b,l.play)).toBe(false);}
});

it('compact inventory names retain measured four-character14px room without covering adjacent cards',()=>{
 for(const [width,height,bottom] of [[320,568,0],[320,640,34],[390,740,34]]){
  const l=shopLayout(width,height,12,bottom,3,true);
  for(const [i,b] of l.slots.entries()){
   const name=shopOwnedNameArea(b,l.slots[i+1]?.x,width);expect(name.width).toBeGreaterThanOrEqual(56);expect(name.x).toBeGreaterThanOrEqual(8);expect(name.x+name.width).toBeLessThanOrEqual(width-8);if(l.slots[i+1])expect(name.x+name.width).toBeLessThanOrEqual(l.slots[i+1].x);
   const hit=shopOwnedHitBox(b,l.reroll.y,true);expect(hit.width).toBeGreaterThanOrEqual(44);expect(hit.height).toBeGreaterThanOrEqual(b.height);expect(hit.y+hit.height).toBeLessThanOrEqual(l.reroll.y-4);for(const a of [l.reroll,l.build,l.play])expect(intersects(hit,a)).toBe(false);
  }
 }
});

it('the stock, toolbar/tool-inventory anchor and action rows stay at their exact old positions',()=>{
 for(const [width,height,top,bottom] of [[320,568,12,0],[390,740,12,0],[844,300,12,34]]){
  const l=shopLayout(width,height,top,bottom,3,true);
  if(width===320){expect(l.tabs).toEqual({x:12,y:64,width:296,height:44});expect(l.reroll).toEqual({x:12,y:424,width:144,height:44});expect(l.play).toEqual({x:12,y:476,width:296,height:56});expect(l.shelf[0]).toMatchObject({y:116,width:88,height:88*1.4});}
  for(const b of l.shelf)expect(b.x).toBeGreaterThanOrEqual(0);
  for(const b of l.slots){const hit=shopOwnedHitBox(b,l.reroll.y,true);for(const a of [l.reroll,l.build,l.play])expect(intersects(hit,a)).toBe(false);}
 }
});

it('actual short-safe-top24 inventory reserves its whole61.6px frame above the action row',()=>{
 const l=shopLayout(844,300,24,34,3,true);expect(l.tabs).toEqual({x:280,y:72,width:552,height:44});expect(l.reroll.y).toBe(134);
 for(const b of l.slots){expect(b.y+b.height).toBeLessThanOrEqual(l.reroll.y-4);expect(b.y).toBeGreaterThanOrEqual(24+44);expect(intersects(shopOwnedHitBox(b,l.reroll.y,true),l.reroll)).toBe(false);}
});


it('wide PC shops use independent readable goods and build regions without huge cards or action overlap',()=>{
 for(const [width,height] of [[1024,768],[1280,720],[1366,768],[1912,954],[1920,1080]])for(const top of [8,24])for(const bottom of [0,34])for(const cols of [1,2,3]){
  const l=shopLayout(width,height,top,bottom,cols,true);expect(l.desktop).toBe(true);expect(l.tabs.width).toBeGreaterThan(420);
  const actions=[l.chapter,l.items,l.reroll,l.build,l.play],tiles=l.shelf.map(b=>shopOfferCopy(l,b).tile);
  for(const b of [...tiles,...l.slots,...actions,l.tabs]){expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(top);expect(b.x+b.width).toBeLessThanOrEqual(width);expect(b.y+b.height).toBeLessThanOrEqual(height-bottom);}
  for(const tile of tiles)for(const b of [...l.slots,...actions,l.tabs])expect(intersects(tile,b)).toBe(false);
  for(const [i,b] of l.slots.entries()){for(const other of [...l.slots.slice(i+1),...actions,l.tabs])expect(intersects(shopOwnedHitBox(b,l.reroll.y,true),other)).toBe(false);}
  for(const [i,b] of actions.entries()){expect(b.height).toBeGreaterThanOrEqual(44);for(const other of actions.slice(i+1))expect(intersects(b,other)).toBe(false);}
  for(const b of l.shelf){expect(b.width).toBeGreaterThanOrEqual(112);expect(b.width).toBeLessThanOrEqual(144);expect(b.height/b.width).toBeCloseTo(1.4);expect(shopOfferCopy(l,b).width).toBeGreaterThan(b.width);}
 }
});

it('desktop entry falls back when safe height cannot fit its separate inventory/actions',()=>{
 for(const [width,height,top,bottom] of [[1280,640,8,0],[1280,700,34,34],[1920,500,24,34],[768,1024,8,0],[740,390,0,0],[390,740,12,0],[320,740,12,0]])expect(shopLayout(width,height,top,bottom,3,true).desktop).toBe(false);
});


it('wrapped owned cards drop into the actual row and gaps do not reorder',()=>{
 const l=shopLayout(1912,954,8,0,3,true);
 for(const [i,b] of l.slots.entries())expect(shopOwnedDropIndex(l,b.x+b.width/2,b.y+b.height/2)).toBe(i);
 expect(shopOwnedDropIndex(l,l.slots[0].x,l.slots[0].y-1)).toBe(-1);
 expect(shopOwnedDropIndex(l,l.slots[0].x,l.slots[0].y+l.slots[0].height+8)).toBe(-1);
 const phone=shopLayout(390,740,8,0,3,true);expect(shopOwnedDropIndex(phone,phone.slots[2].x+2,0)).toBe(2);
});

it('physical500 with safe insets uses short shop and keeps full inventory targets inside usable height',()=>{
 const l=shopLayout(1024,500,24,34,3,true);expect(l.short).toBe(true);
 for(const b of l.slots){expect(b.y+b.height).toBeLessThanOrEqual(466);for(const a of [l.reroll,l.build,l.play])expect(intersects(shopOwnedHitBox(b,l.reroll.y,true),a)).toBe(false);}
});


it('desktop summary wrapping never splits a numeric cap or decimal gain across lines',()=>{
 const source='成长+10，最多+100；每张倍率+0.5。';
 const wrapped=shopSummaryWrap(source,7,s=>s.length);
 expect(wrapped.replaceAll('\n','')).toBe(source);expect(wrapped).toContain('100');expect(wrapped).toContain('0.5');expect(wrapped.split('\n').every(s=>s.length<=7)).toBe(true);
});
