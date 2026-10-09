import {it,expect} from 'vitest';
import {shopLayout,shopFirstGuideLayout,shopSummaryWrap,shopOfferCopy,shopOwnedDropIndex,shopOwnedHitBox,shopOwnedNameArea} from '../src/game/ShopLayout';
import {intersects} from '../src/game/layout';
it('first-shop guide has reachable exits without covering merchandise or primary shop actions',()=>{
 for(const [width,height] of [[1280,720],[1366,768],[1920,1080],[390,740],[320,740],[740,390],[768,1024]]){
  const p=shopLayout(width,height,12,0,3),g=shopFirstGuideLayout(p,height,true);expect(g,'guide at '+width+'x'+height).toBeDefined();if(!g)continue;
  expect(g.box.y).toBeGreaterThanOrEqual(8);expect(g.box.x).toBeGreaterThanOrEqual(0);expect(g.box.x+g.box.width).toBeLessThanOrEqual(width);expect(g.box.y+g.box.height).toBeLessThanOrEqual(height);
  for(const action of [p.play,p.reroll,p.build])expect(intersects(g.box,action)).toBe(false);
  for(const b of p.shelf)expect(intersects(g.box,{...b,height:b.height+(p.copyBeside?0:76)}),width+'x'+height+' merchandise').toBe(false);
  for(const [i,b] of g.buttons.entries()){expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);expect(b.y+b.height).toBeLessThanOrEqual(g.box.y+g.box.height);for(const next of g.buttons.slice(i+1))expect(intersects(b,next)).toBe(false);}
  if(g.replacesEmptySlots){const held=shopFirstGuideLayout(p,height,false);if(held)for(const b of p.slots)expect(intersects(held.box,{...b,height:b.height+22})).toBe(false);}
 }
});
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

it('toolbar and action anchors stay fixed while compact stock reserves an owned heading',()=>{
 for(const [width,height,top,bottom] of [[320,568,12,0],[390,740,12,0],[844,300,12,34]]){
  const l=shopLayout(width,height,top,bottom,3,true);
  if(width===320){expect(l.tabs).toEqual({x:12,y:64,width:296,height:44});expect(l.reroll).toEqual({x:12,y:424,width:144,height:44});expect(l.play).toEqual({x:12,y:476,width:296,height:56});expect(l.shelf[0]).toMatchObject({y:116,width:88,height:88*1.4});expect(l.slots[0].y+l.slots[0].height).toBeLessThanOrEqual(l.reroll.y-4);}
  for(const b of l.shelf)expect(b.x).toBeGreaterThanOrEqual(0);
  for(const b of l.slots){const hit=shopOwnedHitBox(b,l.reroll.y,true);for(const a of [l.reroll,l.build,l.play])expect(intersects(hit,a)).toBe(false);}
 }
});

it('actual short-safe-top24 inventory reserves its whole61.6px frame above the action row',()=>{
 const l=shopLayout(844,300,24,34,3,true);expect(l.tabs).toEqual({x:280,y:72,width:552,height:44});expect(l.reroll.y).toBe(134);
 for(const b of l.slots){expect(b.y+b.height).toBeLessThanOrEqual(l.reroll.y-4);expect(b.y).toBeGreaterThanOrEqual(24+44);expect(intersects(shopOwnedHitBox(b,l.reroll.y,true),l.reroll)).toBe(false);}
});


it('PC regions preserve left state, upper horizontal owned rail and lower simultaneous sale groups',()=>{
 for(const [width,height] of [[1000,768],[1024,768],[1280,720],[1366,768],[1912,954],[1920,1080]]){
  const l=shopLayout(width,height,8,0,3,true),p=l.pc!;expect(p).toBeTruthy();expect(l.slots.every(b=>b.y===l.slots[0].y)).toBe(true);
  expect(p.left.x+p.left.width).toBeLessThan(p.ownedRail.x);expect(l.slots[0].y+l.slots[0].height).toBeLessThan(p.shopPanel.y);
  const actions=[l.chapter,l.build,l.play,l.reroll,p.inventoryEntry];
  for(const [i,b] of actions.entries()){expect(intersects(b,{x:width-148,y:8,width:148,height:44})).toBe(false);expect(b.height).toBeGreaterThanOrEqual(44);for(const other of actions.slice(i+1))expect(intersects(b,other)).toBe(false);}
  for(const b of [...l.slots,...actions,...p.jokerOffers,p.toolOffers,p.itemOffers,p.feedback]){expect(b.x).toBeGreaterThanOrEqual(0);expect(b.y).toBeGreaterThanOrEqual(8);expect(b.x+b.width).toBeLessThanOrEqual(width);expect(b.y+b.height).toBeLessThanOrEqual(height);}
  for(const b of [...p.jokerOffers,p.toolOffers,p.itemOffers])for(const a of [...actions,p.feedback])expect(intersects(b,a)).toBe(false);
  for(const [i,b] of l.slots.entries())expect(shopOwnedDropIndex(l,b.x+b.width/2,b.y+b.height/2)).toBe(i);
  expect(shopOfferCopy(l,l.shelf[0]).tile).toEqual(p.jokerOffers[0]);
 }
});

it('short PC uses the existing broad short layout, while mobile keeps its exact layout',()=>{
 for(const [width,height,top,bottom] of [[1280,640,8,0],[1280,720,24,34],[1024,500,24,34],[1912,710,8,0]]){const l=shopLayout(width,height,top,bottom,3,true);expect(l.pc).toBeNull();expect(l.short).toBe(true);expect(l.tabs.width).toBeGreaterThan(420);}
 for(const [width,height] of [[320,568],[360,640],[390,740],[430,932],[844,300]])expect(shopLayout(width,height,8,0,3,true).pc).toBeNull();
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

it('wide PC low heights reserve lower goods and feedback before sizing either card rail',()=>{
 for(const width of [1912,1920])for(const height of [712,720,768])for(const top of [0,8,12,24])for(const bottom of [0,12,34]){
  const p=shopLayout(width,height,top,bottom,3);
  if(!p.pc){expect(p.short).toBe(true);continue;}
  for(const b of [...p.slots,...p.shelf,...p.pc.jokerOffers,p.pc.toolOffers,p.pc.itemOffers,p.pc.feedback]){expect(b.y).toBeGreaterThanOrEqual(top);expect(b.y+b.height).toBeLessThanOrEqual(height-bottom+.001);}
  for(const b of [p.pc.toolOffers,p.pc.itemOffers]){expect(b.height).toBeGreaterThanOrEqual(128-.001);expect(intersects(b,p.pc.feedback)).toBe(false);expect(b.y+b.height).toBeLessThanOrEqual(p.pc.feedback.y-8+.001);}
  for(const b of [p.play,p.reroll,p.build,p.pc.inventoryEntry])expect(b.height).toBeGreaterThanOrEqual(44);
 }
});

it('320 short portrait safe12/34 keeps every visible owned hit clear of paid reroll and other actions',()=>{
 for(const bottom of [0,12,34]){const p=shopLayout(320,568,12,bottom,3,true);expect(p.inventoryCollapsed).toBe(false);for(const b of p.slots){const hit=shopOwnedHitBox(b,p.reroll.y,true);for(const action of [p.reroll,p.build,p.play])expect(intersects(hit,action)).toBe(false);expect(b.y+b.height).toBeLessThanOrEqual(p.reroll.y-4);expect(hit.width).toBeGreaterThanOrEqual(44);expect(hit.height).toBeGreaterThanOrEqual(44);}expect(p.play.height).toBeGreaterThanOrEqual(48);expect(p.reroll.height).toBeGreaterThanOrEqual(44);for(const b of p.shelf)expect(b.height/b.width).toBeCloseTo(1.4);}
});

it('PC portrait art spends actual remaining height without clipping three goods and independent lower groups',()=>{
 for(const [width,height] of [[1000,768],[1280,720],[1366,768],[1920,1080]]){
  const p=shopLayout(width,height,8,0,3,true);expect(p.shelf).toHaveLength(3);
  for(const face of p.shelf){expect(face.width).toBeGreaterThan(88);expect(face.width).toBeLessThanOrEqual(144);expect(face.height/face.width).toBeCloseTo(1.4);expect(face.y+face.height).toBeLessThan(p.pc!.groupY);}
  for(const g of [p.pc!.toolOffers,p.pc!.itemOffers]){expect(g.height).toBeGreaterThanOrEqual(96);expect(g.y+g.height).toBeLessThanOrEqual(p.pc!.feedback.y);}
 }
});
