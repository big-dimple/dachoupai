import {describe,it,expect} from 'vitest';
import {OWNED_DRAG,ownedDragPose,ownedOrderHint,ownedOrderReversed} from '../src/game/OwnedJokerDragVisual';
import {ownedJokerDropIndex,reorderJokerIds} from '../src/game/JokerReorder';

describe('owned drag feedback and real slot semantics',()=>{
  const slots=Array.from({length:5},(_,i)=>({x:16+i*64,y:510,width:58,height:81.2}));
  it('keeps the grab offset while moving in both axes, above the finger',()=>{
    const start={x:30,y:560},a=ownedDragPose(slots[0],start,start),b=ownedDragPose(slots[0],start,{x:260,y:577});
    expect(b.x-a.x).toBe(230);expect(b.y-a.y).toBe(17);
    expect(a.y).toBeCloseTo(slots[0].y+slots[0].height/2-OWNED_DRAG.lift);
    expect(OWNED_DRAG.lift).toBe(16);expect(OWNED_DRAG.scale).toBe(1.06);
  });
  it('previews final insertion positions in both directions and in the middle',()=>{
    const ids=['a','b','c','d','e'];
    for(const [from,to,expected] of [[0,4,['b','c','d','e','a']],[4,0,['e','a','b','c','d']],[1,3,['a','c','d','b','e']]] as const){
      const b=slots[to],drop=ownedJokerDropIndex(slots,5,b.x+b.width/2,b.y+b.height/2);
      expect(reorderJokerIds(ids,ids[from],drop)).toEqual(expected);expect(ids).toEqual(['a','b','c','d','e']);
    }
    expect(ownedJokerDropIndex(slots,5,60,slots[0].y-1)).toBe(-1);
  });
  it('explains the default order without promising higher scores, with the B13 exception',()=>{
    expect(ownedOrderHint(true,false)).toBe('通常从左到右结算 · 长按拖动排序');
    expect(ownedOrderHint(true,true)).toBe('本关整手从右到左 · 长按拖动排序');
    expect(ownedOrderHint(false,false)).toContain('拖动排序');
    expect(ownedOrderReversed({stageIndex:2,boss:{definitionId:'B13'}})).toBe(true);
    expect(ownedOrderReversed({stageIndex:3,boss:{definitionId:'B13'}})).toBe(false);
    expect(ownedOrderReversed({stageIndex:2,boss:{definitionId:'B12'}})).toBe(false);
  });
});
