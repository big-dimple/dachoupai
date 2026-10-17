import {it,expect} from 'vitest';
import {SavedRun} from '../src/application/SavedRun';
import {C12EvidenceStore} from '../harness/fixtures/c12-gift-delivery';
import {heroRefillFixture} from '../harness/fixtures/hero-gift-scene';
import {heroPortraitRefillCue} from '../src/game/HeroPortraitScoreMotion';
import {heroPortraitArea,heroPortraitLayout,heroSidebarUtilities} from '../src/game/HeroPortraitLayout';
import {layout,intersects,playedFootprint} from '../src/game/layout';

it('reacts to saved actual retained cards, never a failed save, duplicate or restored result',async()=>{
  const fixture=heroRefillFixture(),store=new C12EvidenceStore(),run=await SavedRun.start(store,fixture.state,await store.read());
  const before=run.state,command={runId:before.runId,commandId:before.runId+'/keep',expectedSeq:before.commandSeq,
    action:{type:'ChooseRefill' as const,selectedIds:fixture.selectedIds}};
  store.fail=true;const failed=await run.submit(command);
  expect(heroPortraitRefillCue(before,failed)).toBeUndefined();expect(run.state).toBe(before);
  store.fail=false;const saved=await run.retry();
  expect(heroPortraitRefillCue(before,saved)).toEqual({eventId:command.commandId+'/saved-refill',positive:true});
  expect(run.state.handOrder.filter(id=>!before.handOrder.includes(id))).toEqual(fixture.selectedIds);
  expect(heroPortraitRefillCue(before,await run.submit(command))).toBeUndefined();
  const restored=SavedRun.restore(store,await store.read());
  expect(heroPortraitRefillCue(before,await restored.submit(command))).toBeUndefined();
  expect(restored.state).toEqual(run.state);
});

it('rejects a different hero or an unchanged public hand even when handed a success-shaped value',async()=>{
  const f=heroRefillFixture(),store=new C12EvidenceStore(),run=await SavedRun.start(store,f.state,await store.read()),before=run.state;
  const result=await run.submit({runId:before.runId,commandId:'actual/keep',expectedSeq:before.commandSeq,action:{type:'ChooseRefill',selectedIds:f.selectedIds}});
  expect(result.ok).toBe(true);if(!result.ok)return;
  expect(heroPortraitRefillCue({...before,characterId:'amo'},result)).toBeUndefined();
  expect(heroPortraitRefillCue(before,{...result,state:{...result.state,handOrder:[...before.handOrder]}})).toBeUndefined();
});

it('gives the complete PC portrait real free sidebar space while preserving source, hand and score rectangles',()=>{
  for(const width of [1180,1366]){
    const l=layout({width,height:768},{top:0,bottom:0,left:0,right:0}),original=JSON.stringify(l),utilities=heroSidebarUtilities(l)!;
    const protectedBounds=[{...l.hud,height:254},utilities.inventory,utilities.help];
    const p=heroPortraitLayout(heroPortraitArea(l),{width:615,height:768},protectedBounds)!;
    expect(p.imageBounds.width).toBeGreaterThanOrEqual(180);
    expect(p.imageBounds.width/p.imageBounds.height).toBeCloseTo(615/768);
    for(const b of protectedBounds)expect(intersects(p.imageBounds,b)).toBe(false);
    expect(utilities.inventory.height).toBe(44);expect(utilities.help.height).toBe(44);
    expect(JSON.stringify(l)).toBe(original);
  }
});

it('keeps the bounded phone portrait outside both score cells and played cards without reflow',()=>{
  for(const [width,height] of [[390,740],[390,844],[320,568]]){
    const l=layout({width,height},{top:0,bottom:0,left:0,right:0}),before=JSON.stringify(l),area=heroPortraitArea(l);
    expect(intersects(area,l.scoreBoard)).toBe(false);
    expect(intersects(area,playedFootprint(l.playedArea,true))).toBe(false);
    expect(heroSidebarUtilities(l)).toBeUndefined();expect(JSON.stringify(l)).toBe(before);
  }
});
