import {describe,expect,it} from 'vitest';
import {cardPipRowOffset} from '../src/game/CardPipLayout';
import {intersects,type Box} from '../src/game/layout';

describe('measured card index clearance',()=>{
  // WebKit mobile 390x740 DPR3, Georgia -> DejaVu Serif: diamonds-10.
  const index:Box={x:-32,y:-46.4,width:24,height:38};
  const row:Box[]=[{x:-8.94,y:-40.788,width:7,height:9},{x:1.94,y:-40.788,width:7,height:9}];
  it('clears the real wide ten without shrinking pips or changing row spacing',()=>{
    expect(intersects(index,row[0])).toBe(true);
    const offset=cardPipRowOffset(index,row),moved=row.map(p=>({...p,x:p.x+offset}));
    expect(offset).toBeCloseTo(3.94);
    expect(moved[0].x-index.x-index.width).toBeCloseTo(3);
    expect(moved.every(p=>!intersects(index,p))).toBe(true);
    expect(moved[1].x-moved[0].x).toBeCloseTo(row[1].x-row[0].x);
    expect(moved[1].x+moved[1].width).toBeLessThan(32);
  });
  it('preserves rows below the index and rows that already have clearance',()=>{
    expect(cardPipRowOffset(index,row.map(p=>({...p,y:7})))).toBe(0);
    expect(cardPipRowOffset({...index,width:17},row)).toBe(0);
    expect(cardPipRowOffset(index,[])).toBe(0);
  });
  it('keeps clearance during the observed horizontal deal transform and selection lift',()=>{
    const offset=cardPipRowOffset(index,row);
    for(const scale of [.2,1])for(const lift of [0,-16]){
      const world=(b:Box):Box=>({x:174+b.x*scale,y:593.6+b.y+lift,width:b.width*scale,height:b.height});
      const a=world(index),b=world({...row[0],x:row[0].x+offset});
      expect(intersects(a,b)).toBe(false);
      expect(b.x-a.x-a.width).toBeCloseTo(3*scale);
    }
  });
});
