import {describe,it,expect} from 'vitest';
import {layout,intersects,type Box} from '../src/game/layout';
import {PointerIntent} from '../src/game/PointerIntent';

const sizes=[[320,568],[360,640],[390,740],[390,844],[430,932],[844,300],[844,360],[844,390],[1024,768],[1280,720],[1920,1080],[768,1024]];
const inside=(b:Box,w:number,h:number)=>b.x>=0&&b.y>=0&&b.x+b.width<=w+.01&&b.y+b.height<=h+.01;
describe('CSS layout contract',()=>{
  it('shows all10–14 cards in two stable rows with independent lift and hit space',()=>{
    for(const width of [360,390])for(const count of [10,11,12,13,14])for(const bottom of [0,12]){
      const l=layout({width,height:740},{top:0,left:0,right:0,bottom},undefined,{count,start:14});
      expect(l.handRows).toBe(2);expect(l.handOverflow).toBe(false);expect(l.handStart).toBe(0);
      expect(l.visibleCardCount).toBe(count);expect(l.cards.every(c=>c.visible)).toBe(true);
      expect(new Set(l.cards.map(c=>c.hit.y)).size).toBe(2);
      const columns=Math.ceil(count/2),first=l.cards.slice(0,columns),second=l.cards.slice(columns);
      for(const card of l.cards){
        expect(inside(card.visual,width,740)).toBe(true);expect(inside(card.hit,width,740)).toBe(true);
        expect(card.visual.width).toBeGreaterThanOrEqual(52);expect(card.hit.width).toBeGreaterThanOrEqual(36);
        expect(card.visual.y-16).toBeGreaterThanOrEqual(card.hit.y);
        for(const control of [l.scoreBoard,...Object.values(l.buttons),...Object.values(l.tableActions)])expect(intersects(card.hit,control)).toBe(false);
      }
      for(let i=0;i<l.cards.length;i++)for(let j=i+1;j<l.cards.length;j++)expect(intersects(l.cards[i].hit,l.cards[j].hit)).toBe(false);
      for(const lower of second)for(const upper of first)expect(intersects({...lower.visual,y:lower.visual.y-16},upper.visual)).toBe(false);
    }
  });

  it('D44 reserves readable score and independent fire space through short-landscape boundary and safe insets',()=>{
    for(const height of [300,320,359,360,361,390,430])for(const bottom of [0,12]){
      const l=layout({width:844,height},{top:0,left:0,right:0,bottom},undefined,{count:9});
      expect(l.scoreBoard.height).toBeGreaterThanOrEqual(80);
      expect(l.scoreFire.y).toBeGreaterThan(l.scoreBoard.y+48);
      expect(l.scoreFire.y+l.scoreFire.height).toBeLessThan(l.scoreBoard.y+l.scoreBoard.height);
      for(const control of [...Object.values(l.buttons),...Object.values(l.tableActions),l.hand]){
        expect(intersects(l.scoreBoard,control)).toBe(false);
        expect(intersects(l.scoreFire,control)).toBe(false);
      }
      expect(l.toolsInHud).toBe(true);
    }
  });
  it('D44 keeps nine cards in one row at 320–430px without changing seats on selection',()=>{
    for(const width of [320,360,390,430]){
      const l=layout({width,height:640},{top:0,left:0,right:0,bottom:0},undefined,{count:9,start:8});
      expect(l.handOverflow).toBe(false);expect(l.visibleCardCount).toBe(9);expect(l.handStart).toBe(0);
      for(const card of l.cards){
        expect(card.visible).toBe(true);expect(card.hit.width).toBeGreaterThanOrEqual(width<360?30:36);
        expect(card.hit.height).toBeGreaterThanOrEqual(90);
        expect(card.visual.height).toBeCloseTo(card.visual.width*1.4);
        // Sixteen pixels of selection lift stay within the original seat's vertical reserve.
        expect(card.visual.y-16).toBeGreaterThan(card.hit.y);
      }
    }
  });
  for(const [width,height] of sizes)it(`${width}×${height}: readable, visible and distinct hit areas`,()=>{
    const l=layout({width,height},{top:0,right:0,bottom:0,left:0});
    for(const b of [l.hud,l.jokers,l.preview,l.tools,l.hand,l.actions,l.status])expect(inside(b,width,height)).toBe(true);
    const buttons=[...Object.values(l.buttons),...Object.values(l.tableActions)];
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
  it('D27 keeps only two sorting targets and two primary targets within the dynamic safe viewport',()=>{
    for(const [width,height] of [[320,568],[390,740],[390,844],[640,320],[844,300],[844,390],[1280,720]]){
      const safe={top:8,right:12,bottom:12,left:8},l=layout({width,height},safe,undefined,{count:14});
      expect(Object.keys(l.buttons).sort()).toEqual(['rank','suit']);expect(Object.keys(l.tableActions).sort()).toEqual(['discard','play']);
      const controls=[...Object.values(l.buttons),...Object.values(l.tableActions)];
      for(const b of controls){
        expect(b.width).toBeGreaterThanOrEqual(44);expect(b.height).toBeGreaterThanOrEqual(44);
        expect(b.x).toBeGreaterThanOrEqual(safe.left);expect(b.y).toBeGreaterThanOrEqual(safe.top);
        expect(b.x+b.width).toBeLessThanOrEqual(width-safe.right);expect(b.y+b.height).toBeLessThanOrEqual(height-safe.bottom);
        expect(intersects(b,l.hand)).toBe(false);
      }
      for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++)expect(intersects(controls[i],controls[j])).toBe(false);
      expect(l.tableActions.discard.x).toBe(l.actions.x);
      expect(l.tableActions.play.x+l.tableActions.play.width).toBeCloseTo(l.actions.x+l.actions.width);
    }
  });
  it('expanded hands keep every seat and use a bounded horizontal window on narrow screens',()=>{
    for(const [width,height] of [[320,568],[390,844],[844,390],[1280,720]])for(const count of [9,10,14]){
      const l=layout({width,height},{top:0,right:0,bottom:0,left:0},undefined,{count,start:100});
      expect(l.cards.length).toBe(count);
      const visible=l.cards.filter(card=>card.visible);
      expect(visible.length).toBe(l.visibleCardCount);
      expect(l.handStart).toBe(count-l.visibleCardCount);
      expect(l.cards.findIndex(card=>card.visible)).toBe(l.handStart);
      for(const card of visible){
        expect(inside(card.hit,width,height)).toBe(true);
        expect(card.hit.width).toBeGreaterThanOrEqual(width<360&&count===9?30:36);
        expect(card.visual.height/card.visual.width).toBeGreaterThanOrEqual(1.4-1e-6);
      }
      for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++)expect(intersects(visible[i].hit,visible[j].hit)).toBe(false);
      if(l.handOverflow){
        expect(l.handStart).toBeGreaterThan(0);
        for(const button of Object.values(l.handNavigation)){
          expect(inside(button,width,height)).toBe(true);
          expect(button.width).toBeGreaterThanOrEqual(44);expect(button.height).toBeGreaterThanOrEqual(44);
          for(const card of visible)expect(intersects(button,card.hit)).toBe(false);
        }
      }else expect(visible.length).toBe(count);
    }
  });
  it('expanded hand windows keep all indices reachable without shrinking the original eight-card faces',()=>{
    const viewport={width:390,height:568},safe={top:0,right:0,bottom:0,left:0};
    const baseline=layout(viewport,safe),first=layout(viewport,safe,undefined,{count:14,start:0}),last=layout(viewport,safe,undefined,{count:14,start:14});
    expect(first.handOverflow).toBe(true);expect(first.handStart).toBe(0);
    expect(first.cards.filter(card=>card.visible)[0].visual.width).toBe(baseline.cards[0].visual.width);
    const reachable=new Set<number>();
    for(let start=0;start<14;start++)layout(viewport,safe,undefined,{count:14,start}).cards.forEach((card,i)=>{if(card.visible)reachable.add(i);});
    expect([...reachable].sort((a,b)=>a-b)).toEqual(Array.from({length:14},(_,i)=>i));
    expect(last.cards.at(-1)?.visible).toBe(true);
    expect(layout(viewport,safe,undefined,{count:1,start:0}).cards).toHaveLength(1);
    expect(layout(viewport,safe,undefined,{count:0,start:0}).cards).toHaveLength(0);
  });
  it('played cards, current score and pile counts stay visible above the independent hand controls',()=>{
    for(const [width,height] of [[1920,1080],[1280,720],[360,640],[390,740],[390,844],[844,300],[844,390]]){
      const l=layout({width,height},{top:0,right:0,bottom:0,left:0});
      for(const b of [l.scoreBoard,l.playedArea,l.handLabel,l.piles])expect(inside(b,width,height)).toBe(true);
      expect(l.playedArea.height).toBeGreaterThanOrEqual(48);
      expect(intersects(l.scoreBoard,l.playedArea)).toBe(false);
      // D16 moves the mobile pile/history row into details; score and landing remain on the table.
      const visible=l.mode==='portrait'||!l.labelHeight?[l.scoreBoard,l.playedArea]:[l.scoreBoard,l.playedArea,l.handLabel,l.piles];
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
