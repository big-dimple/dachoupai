import {expect,it,vi} from 'vitest';
import {layout,intersects} from '../src/game/layout';
import {tableScoreCells,localHeroEyeSlot} from '../src/game/ScoreTableLayout';
import {toolInventoryPlayedArea} from '../src/game/ToolInventoryEntry';
import {scoreArrival,isNeutralScoreReceipt,SCORE_CHANNEL,presentScoreSource,presentScoreArrival} from '../src/game/ScoreTableMotion';
import {scoreSourceProcessFixture} from '../harness/fixtures/score-source-process';
import {energySend} from '../harness/fixtures/score-energy';

it.each([[1366,768],[1920,1080],[390,844],[390,740],[320,740],[740,390]])('keeps the score band, real cards and eye slot separate at %ix%i',(width,height)=>{
 const original=layout({width,height},{top:0,right:0,bottom:0,left:0}),before=JSON.stringify(original),a={...original,eyes:original.scoreEyes};
 expect(intersects(a.scoreBoard,a.playedArea)).toBe(false);expect(a.playedArea.height).toBeGreaterThan(0);expect(intersects(a.scoreBoard,original.hand)).toBe(false);expect(intersects(a.scoreBoard,original.jokers)).toBe(false);
 for(const cell of tableScoreCells(a.scoreBoard)){expect(cell.width).toBeGreaterThan(0);expect(cell.x).toBeGreaterThanOrEqual(a.scoreBoard.x);expect(cell.x+cell.width).toBeLessThanOrEqual(a.scoreBoard.x+a.scoreBoard.width);expect(cell.y+cell.height).toBeLessThanOrEqual(a.scoreBoard.y+a.scoreBoard.height);}
 if(a.eyes){expect(intersects(a.eyes,a.scoreBoard)).toBe(false);expect(intersects(a.eyes,a.playedArea)).toBe(false);expect(intersects(a.eyes,original.hand)).toBe(false);}
 expect(JSON.stringify(original)).toBe(before);
});
const fixture=scoreSourceProcessFixture('chain'),saved=energySend(fixture.state,{type:'PlayAssistedHand',selectedIds:fixture.selectedIds,assistIds:fixture.assistIds});
it('distinguishes actual chips, added multiplier, multiplied multiplier and final total without inventing events',()=>{
 const events=saved.lastTrace!.events,cues=events.map(scoreArrival).filter(Boolean),before=JSON.stringify(saved);
 expect(cues.some(c=>c!.kind==='heat'&&c!.label.startsWith('+'))).toBe(true);expect(cues.some(c=>c!.kind==='mult-add'&&c!.label.startsWith('+'))).toBe(true);expect(cues.some(c=>c!.kind==='mult-multiply'&&c!.label.startsWith('×'))).toBe(true);expect(cues.some(c=>c!.kind==='total')).toBe(true);
 expect(new Set(['heat','mult-add','mult-multiply'].map(k=>SCORE_CHANNEL[k as keyof typeof SCORE_CHANNEL].color)).size).toBe(3);expect(JSON.stringify(saved)).toBe(before);
});
it('a shortened phone uses space above the actual card apex or empty rack seats without moving the hand',()=>{
 const l=layout({width:390,height:740},{top:0,right:0,bottom:0,left:0}),before=JSON.stringify(l),area=toolInventoryPlayedArea(l);
 for(const occupied of [0,1,4,5]){const eyes=localHeroEyeSlot(l,area,occupied)!;expect(eyes).toBeDefined();expect(intersects(eyes,l.scoreBoard)).toBe(false);expect(intersects(eyes,l.hand)).toBe(false);expect(eyes.y+eyes.height).toBeLessThanOrEqual(area.y+(area.height-52*1.4)/2-18-4);}
 expect(JSON.stringify(l)).toBe(before);
});
it('an aborted visual cannot create nodes or notify a device adapter',async()=>{
 const controller=new AbortController();controller.abort();const scene:any={add:{container:vi.fn(),graphics:vi.fn()}},notify=vi.fn(),event=saved.lastTrace!.events.find(e=>scoreArrival(e))!,options:any={event,source:{x:0,y:0,width:60,height:80},target:{x:100,y:100,width:100,height:60},viewport:{x:0,y:0,width:390,height:844},duration:100,reduced:false,context:{generation:1,signal:controller.signal},animate:vi.fn(),notify};
 await presentScoreSource(scene,{} as any,options);await presentScoreArrival(scene,{} as any,options);expect(scene.add.container).not.toHaveBeenCalled();expect(scene.add.graphics).not.toHaveBeenCalled();expect(notify).not.toHaveBeenCalled();
});
it('neutral route receipts and a converted zero-point card do not hold the same total in another presentation slot',()=>{
 const source=scoreSourceProcessFixture('addition'),state=energySend(source.state,{type:'PlayHand',selectedIds:source.selectedIds,erxiangTargetId:source.selectedIds[0]}),before=JSON.stringify(state),events=state.lastTrace!.events;
 expect(events.some(e=>e.sourceType==='card'&&e.value.n==='0'&&isNeutralScoreReceipt(e))).toBe(true);
 expect(events.filter(e=>['route-clear','route-clear-family'].includes(e.operation)).every(isNeutralScoreReceipt)).toBe(true);
 expect(events.filter(e=>scoreArrival(e)).every(e=>!isNeutralScoreReceipt(e))).toBe(true);expect(JSON.stringify(state)).toBe(before);
});
it('a live source badge is destroyed once on abort and a late animation update cannot revive it',async()=>{
 const controller=new AbortController(),writes=vi.fn(),destroy=vi.fn();let update:(()=>void)|undefined,finish!:()=>void;
 const label:any={width:40,height:22,scene:{scale:{zoom:1}},style:{resolution:1},setName:()=>label,setResolution:()=>label,setData:()=>label,getData:()=>undefined,setOrigin:()=>label,setPosition:()=>{writes();return label;},setAlpha:()=>label};
 const group:any={setName:()=>group,setData:()=>group,add:()=>group,destroy};
 const scene:any={scale:{zoom:1},add:{container:()=>group,text:()=>label}},event=saved.lastTrace!.events.find(e=>scoreArrival(e)?.kind==='heat')!;
 const animation=presentScoreSource(scene,{add:vi.fn()} as any,{event,source:{x:60,y:200,width:60,height:80},target:{x:100,y:100,width:100,height:60},viewport:{x:0,y:0,width:390,height:844},duration:150,reduced:false,context:{generation:1,signal:controller.signal},animate:config=>{update=config.onUpdate as ()=>void;return new Promise<void>(resolve=>finish=resolve);}});
 controller.abort();expect(destroy).toHaveBeenCalledOnce();const before=writes.mock.calls.length;update?.();expect(writes).toHaveBeenCalledTimes(before);finish();await animation;expect(destroy).toHaveBeenCalledOnce();
});
