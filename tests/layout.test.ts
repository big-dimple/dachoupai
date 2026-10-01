import {describe,it,expect} from 'vitest';
import {layout,intersects,type Box} from '../src/game/layout';
import {PointerIntent} from '../src/game/PointerIntent';

const sizes=[[320,568],[360,640],[390,740],[390,844],[430,932],[844,300],[844,390],[1024,768],[1280,720],[1920,1080],[768,1024]];
const inside=(b:Box,w:number,h:number)=>b.x>=0&&b.y>=0&&b.x+b.width<=w+.01&&b.y+b.height<=h+.01;
describe('CSS layout contract',()=>{
  for(const [width,height] of sizes)it(`${width}×${height}: readable, visible and distinct hit areas`,()=>{
    const l=layout({width,height},{top:0,right:0,bottom:0,left:0});
    for(const b of [l.hud,l.jokers,l.preview,l.tools,l.hand,l.actions,l.status])expect(inside(b,width,height)).toBe(true);
    const buttons=[l.buttons.rank,l.buttons.suit,l.buttons.deck,l.buttons.details,...Object.values(l.tableActions),...(l.mode==='portrait'?[]:[l.buttons.forward])];
    for(const b of buttons){expect(inside(b,width,height)).toBe(true);expect(b.height).toBeGreaterThanOrEqual(44);expect(b.width).toBeGreaterThanOrEqual(44);}
    expect(l.tableActions.play.height).toBeGreaterThanOrEqual(48);expect(l.tableActions.discard.height).toBeGreaterThanOrEqual(48);
    expect(intersects(l.hand,l.actions)).toBe(false);expect(intersects(l.tools,l.hand)).toBe(false);expect(intersects(l.preview,l.tools)).toBe(false);
    for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++)expect(intersects(buttons[i],buttons[j])).toBe(false);
    expect(l.cards.length).toBe(8);for(const c of l.cards){expect(inside(c.hit,width,height)).toBe(true);expect(c.hit.width).toBeGreaterThanOrEqual(36);expect(c.visual.height/c.visual.width).toBeGreaterThanOrEqual(1.4-1e-6);}
    for(let i=0;i<l.cards.length;i++)for(let j=i+1;j<l.cards.length;j++)expect(intersects(l.cards[i].hit,l.cards[j].hit)).toBe(false);
  });
  it('safe insets preserve CSS targets; 320px uses compact cards with scrollable details',()=>{
    const l=layout({width:390,height:844},{top:24,right:0,bottom:34,left:0});
    expect(l.hud.y).toBeGreaterThanOrEqual(24);expect(l.tableActions.play.y+l.tableActions.play.height).toBeLessThanOrEqual(810);
    const narrow=layout({width:320,height:568},{top:0,right:0,bottom:0,left:0});expect(narrow.compact).toBe(true);expect(narrow.height).toBe(568);
  });
  it('played cards, current score and pile counts stay visible above the independent hand controls',()=>{
    for(const [width,height] of [[1920,1080],[1280,720],[360,640],[390,740],[390,844],[844,300],[844,390]]){
      const l=layout({width,height},{top:0,right:0,bottom:0,left:0});
      for(const b of [l.scoreBoard,l.playedArea,l.handLabel,l.piles])expect(inside(b,width,height)).toBe(true);
      expect(l.playedArea.height).toBeGreaterThanOrEqual(48);
      expect(intersects(l.scoreBoard,l.playedArea)).toBe(false);
      // D16 moves the mobile pile/history row into details; score and landing remain on the table.
      const visible=l.mode==='portrait'?[l.scoreBoard,l.playedArea]:[l.scoreBoard,l.playedArea,l.handLabel,l.piles];
      for(const b of visible)for(const control of [l.tools,l.hand,l.actions])expect(intersects(b,control)).toBe(false);
      for(const action of Object.values(l.tableActions)){expect(inside(action,width,height)).toBe(true);expect(action.height).toBeGreaterThanOrEqual(48);}
      expect(intersects(l.tableActions.play,l.tableActions.discard)).toBe(false);
      if(l.mode==='landscape'){
        const utility={x:width-148,y:12,width:136,height:44};
        for(const b of [...l.slots,...l.jokerLabels])expect(intersects(b,utility),'menu/fullscreen must not cover the fifth joker').toBe(false);
      }
      expect(l.hand.width).toBeLessThanOrEqual(1100);
    }
  });
});
describe('pointer intent prevents accidental commands',()=>{
  it('holding a plain action button still releases once; only inspectable cards long-press',()=>{
    const p=new PointerIntent();p.down(1,10,10,0,false);expect(p.hold(355)).toBe(false);expect(p.up(1,10,10,500)).toBe('tap');expect(p.up(1,10,10,510)).toBe('none');
    p.down(1,10,10,0,false);p.move(1,30,10);expect(p.up(1,30,10,500)).toBe('drag');
  });
  it('tap selects; motion and cancellation never select or buy',()=>{
    const p=new PointerIntent();p.down(1,10,10,0);expect(p.up(1,12,11,90)).toBe('tap');
    p.down(1,10,10,100);p.move(1,35,10);expect(p.up(1,35,10,160)).toBe('drag');
    p.down(1,10,10,200);p.cancel();expect(p.up(1,10,10,250)).toBe('none');
  });
  it('350ms long press is detail only, release is not a second tap',()=>{
    const p=new PointerIntent();p.down(1,10,10,0);expect(p.hold(349)).toBe(false);expect(p.hold(350)).toBe(true);expect(p.up(1,10,10,500)).toBe('none');
  });
  it('cancelled drag releases the lock; a different pointer cannot complete it',()=>{
    const p=new PointerIntent();p.down(1,10,10,0);expect(p.up(2,10,10,30)).toBe('none');p.cancel();p.down(2,10,10,50);expect(p.up(2,10,10,70)).toBe('tap');
  });
});
