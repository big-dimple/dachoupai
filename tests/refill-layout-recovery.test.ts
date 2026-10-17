import {expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class{}}}));
import {GameScene} from '../src/game/GameScene';
import {layout} from '../src/game/layout';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {refillRecoveryFixture} from '../harness/fixtures/refill-recovery';

const scene=(run:unknown)=>Object.assign(Object.create(GameScene.prototype),{run,handStart:0,refillHidden:false});
it.each([4,5])('keeps a seat for every actual candidate after discarding %i cards and after restoration',count=>{
  const {pending}=refillRecoveryFixture(count),before=JSON.stringify(pending),s=scene(pending);
  expect(pending.handOrder).toHaveLength(8-count);expect(s.hand).toHaveLength(count+2);expect(s.handLayoutWindow.count).toBe(count+2);
  const seats=layout({width:390,height:844},{top:0,bottom:0,left:0,right:0},undefined,s.handLayoutWindow).cards;
  expect(seats).toHaveLength(s.hand.length);for(const i of s.hand.keys())expect(seats[i].visual).toBeDefined();
  const restored=readCheckpoint(makeCheckpoint(pending,[]));expect(restored.ok).toBe(true);if(!restored.ok)return;
  const next=scene(restored.checkpoint.state);expect(next.handLayoutWindow.count).toBe(count+2);expect(next.hand.map((c:{id:string})=>c.id)).toEqual(pending.pendingRefill!.candidateIds);
  expect(JSON.stringify(pending)).toBe(before);
});
it('hide and reopen track the displayed IDs without consuming the saved pending refill',()=>{
  const {pending}=refillRecoveryFixture(),s=scene(pending),before=JSON.stringify(pending);
  s.refillHidden=true;expect(s.handLayoutWindow.count).toBe(3);expect(s.hand.map((c:{id:string})=>c.id)).toEqual(pending.handOrder);
  s.refillHidden=false;expect(s.handLayoutWindow.count).toBe(7);expect(s.hand.map((c:{id:string})=>c.id)).toEqual(pending.pendingRefill!.candidateIds);
  expect(JSON.stringify(pending)).toBe(before);
});
it('normal and presentation/tool hands keep matching their own displayed seats',()=>{
  const {state}=refillRecoveryFixture(),s=scene(state);expect(s.handLayoutWindow.count).toBe(8);
  s.toolHand=s.hand.slice(0,4);expect(s.handLayoutWindow.count).toBe(4);
  s.presentation={hand:s.hand.slice(0,2)};expect(s.handLayoutWindow.count).toBe(2);
});
