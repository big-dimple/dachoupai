import {afterEach,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class{}}}));
const session=vi.hoisted(()=>({reducedMotion:true,run:undefined as unknown,pendingRun:undefined,working:false}));
vi.mock('../src/game/session',()=>({gameSession:()=>session}));
import {GameScene} from '../src/game/GameScene';
import {scoreSourceProcessFixture} from '../harness/fixtures/score-source-process';
import {energySend} from '../harness/fixtures/score-energy';
import {scoreArrival} from '../src/game/ScoreTableMotion';
import {scorePhrase} from '../src/game/ScorePhrase';
import {SavedRun,type SaveSlots} from '../src/application/SavedRun';
const f=scoreSourceProcessFixture('chain'),state=energySend(f.state,{type:'PlayAssistedHand',selectedIds:f.selectedIds,assistIds:f.assistIds}),trace=state.lastTrace!;
afterEach(()=>{session.run=undefined;vi.unstubAllGlobals();});
function setup(){
 vi.stubGlobal('window',{matchMedia:()=>({matches:true})});
 const scene=Object.create(GameScene.prototype) as any,scope={multiplierArrived:vi.fn(),settlementArrived:vi.fn(),cancel:vi.fn()},context={generation:7,signal:new AbortController().signal};
 Object.assign(scene,{presentation:{replay:false},scoreHaptic:{generation:7,scope},view:{layout:{scoreBoard:{x:0,y:0,width:760,height:128}}},audio:{scoreImpact:vi.fn()}});
 return {scene,scope,context};
}
it('GameScene actual impact forwards positive multipliers only, including hero events, and rejects old/replay/aborted generations',async()=>{
 const {scene,scope,context}=setup(),events=trace.events.filter(e=>scoreArrival(e)?.kind==='heat'||scoreArrival(e)?.kind==='mult-add');
 for(const event of events)await scene.impactAccumulator(event,180,context);expect(scope.multiplierArrived).not.toHaveBeenCalled();
 const multiply=trace.events.filter(e=>scoreArrival(e)?.kind==='mult-multiply');expect(multiply.some(e=>e.sourceType==='character')).toBe(true);
 for(const event of multiply)await scene.impactAccumulator(event,180,context);expect(scope.multiplierArrived.mock.calls.map(([id])=>id)).toEqual(multiply.map(e=>e.eventId));
 scope.multiplierArrived.mockClear();scene.presentation.replay=true;await scene.impactAccumulator(multiply[0],180,context);scene.presentation.replay=false;await scene.impactAccumulator(multiply[0],180,{...context,generation:8});
 const abort=new AbortController();abort.abort();await scene.impactAccumulator(multiply[0],180,{...context,signal:abort.signal});expect(scope.multiplierArrived).not.toHaveBeenCalled();
});
it('the final score haptic waits for the same saved total to reach award, not enqueue or convergence',async()=>{
 const {scene,scope,context}=setup(),data=new Map<string,unknown>(),text:any={setText:vi.fn(()=>text),setColor:()=>text,setData:(k:string,v:unknown)=>{data.set(k,v);return text;}};
 let release!:()=>void;
 Object.assign(scene,{stage:{targetHeat:f.state.stage!.targetHeat},scoreTotal:text,scoreHeat:text,scoreMult:text,resultText:text,breakdownText:text,
  convergeScore:()=>new Promise<void>(r=>release=r),setAccumulator:vi.fn(),setDisplayedProduct:(v:string)=>text.setText(v),updateHud:vi.fn(),keepScoreReadable:vi.fn(),wait:async()=>{}});
 const presentation={state,score:trace,phrase:scorePhrase(trace.events,f.state.stage!.targetHeat),replay:false,originHeat:'0',displayHeat:'0',credited:false};
 scope.settlementArrived.mockImplementation(()=>{expect(data.get('eventPhase')).toBe('award');expect(text.setText).toHaveBeenCalledWith(trace.finalScore);});
 const pending=scene.award(trace,presentation,context);expect(scope.settlementArrived).not.toHaveBeenCalled();release();await pending;
 expect(scope.settlementArrived).toHaveBeenCalledExactlyOnceWith(trace.events.find(e=>e.phase==='finalScore')!.eventId);
});
it.each(['saved','duplicate','failed'] as const)('GameScene %s reorder emits placement feedback only from its actual landed receipt',async kind=>{
 let slots:SaveSlots={revision:0,current:null,previous:null},release!:()=>void,delay=false;
 const controller=await SavedRun.start({read:async()=>structuredClone(slots),commit:async(revision,current,previous)=>{if(delay)await new Promise<void>(r=>release=r);if(delay&&kind==='failed')throw Error('store failed');expect(revision).toBe(slots.revision);slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return slots.revision;}},f.state,slots);
 session.run=controller;const {scene}=setup(),haptic={saved:vi.fn(),cancel:vi.fn()};let landed:(()=>void)|undefined;
 const drag={saving:true,pending:vi.fn(),capture:vi.fn(),settle:vi.fn((saved:boolean,callback?:()=>void)=>{landed=callback;})};
 Object.defineProperty(scene,'ready',{value:true});Object.assign(scene,{run:controller.state,lifecycle:1,intent:0,focusIndex:0,placementHaptic:haptic,ownedDrag:drag,input:{enabled:true},scene:{isActive:()=>true},registry:{get:()=>controller,set:vi.fn()},audio:{select:vi.fn()},clearHover:vi.fn(),cancelAiCandidates:vi.fn(),updateControls:vi.fn(),refreshToolInventory:vi.fn(),render:vi.fn(),refreshSelection:vi.fn()});
 const action={type:'ReorderJokers' as const,ids:controller.state.jokers.map(j=>j.instanceId).reverse()};
 if(kind==='duplicate'){const result=await controller.dispatch(action);expect(result.ok).toBe(true);if(!result.ok)throw Error(result.code);vi.spyOn(controller,'dispatch').mockResolvedValueOnce({...result,duplicate:true});}
 delay=true;const pending=scene.command(action);expect(haptic.saved).not.toHaveBeenCalled();if(kind!=='duplicate'){expect(drag.settle).not.toHaveBeenCalled();release();}await pending;
 expect(haptic.saved).not.toHaveBeenCalled();
 if(kind==='saved'){expect(landed).toBeTypeOf('function');landed!();expect(haptic.saved).toHaveBeenCalledExactlyOnceWith('placement',controller.state.receipts.at(-1)!.commandId);}else{expect(landed).toBeUndefined();expect(haptic.cancel).toHaveBeenCalled();}
});
