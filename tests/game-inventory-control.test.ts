import {afterEach,expect,it,vi} from 'vitest';
import {createRun,applyCommand,type Action,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
const gate=vi.hoisted(()=>({session:{lease:{writable:true},pendingRun:undefined as object|undefined,working:false},controller:{status:'idle'}}));
vi.mock('phaser',()=>({default:{Scene:class {}}}));
vi.mock('../src/game/session',()=>({gameSession:()=>gate.session}));
vi.mock('../src/game/runAdapter',()=>({runController:()=>gate.controller,dispatchRun:vi.fn()}));
vi.mock('../src/game/ConsumableDialog',()=>({showConsumables:vi.fn()}));
import {GameScene} from '../src/game/GameScene';
import {dispatchRun} from '../src/game/runAdapter';
import {showConsumables} from '../src/game/ConsumableDialog';

function send(s:R2RunState,action:Action):R2RunState {
 const r=applyCommand(s,{runId:s.runId,commandId:s.runId+'/command/'+(s.commandSeq+1),expectedSeq:s.commandSeq,action});
 if(!r.ok)throw Error(r.code);return r.state;
}
function pending(){
 let run=createRun({rulesVersion:'r2',characterId:'laohuan',seed:'inventory-entry-unit',runId:'unit/inventory-entry',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});
 run=send(send(run,{type:'LeaveShop'}),{type:'EnterStage'});
 return send(run,{type:'DiscardHand',selectedIds:[run.handOrder[0]],laohuanTrick:true});
}
function scene(run:R2RunState){
 const s=Object.create(GameScene.prototype) as Record<string,any>;
 const button={active:true,input:{enabled:true}};
 Object.assign(s,{run,controlsLive:true,inventoryButton:button,view:{setEnabled:(_button:unknown,enabled:boolean)=>{button.input.enabled=enabled;}},playing:false,presentation:undefined,refillHidden:false,selectedIds:new Set(run.pendingRefill!.candidateIds.slice(0,run.pendingRefill!.required)),lifecycle:1,intent:0,alive:()=>true,renderHand:vi.fn(),updateHud:vi.fn(),showLaohuanPayoff:vi.fn(async()=>{}),updateControls:()=>s.updateInventoryControl(),refreshSelection:()=>s.updateInventoryControl()});
 return {s,button};
}
afterEach(()=>{gate.controller.status='idle';gate.session.lease.writable=true;gate.session.pendingRun=undefined;gate.session.working=false;vi.clearAllMocks();});

it('the same candidate-disabled entry stays blocked through save/payoff, then restores after one choice',async()=>{
 const run=pending(),{s,button}=scene(run);s.updateInventoryControl();expect(button.input.enabled).toBe(false);
 let finish!:(result:unknown)=>void;
 vi.mocked(dispatchRun).mockImplementation(()=>new Promise(resolve=>finish=resolve) as never);
 const choice=s.chooseRefill();await s.chooseRefill();expect(dispatchRun).toHaveBeenCalledOnce();expect(button.input.enabled).toBe(false);
 const selectedIds=[...s.selectedIds],state=send(run,{type:'ChooseRefill',selectedIds});
 s.showLaohuanPayoff.mockImplementation(async()=>{expect(button.input.enabled).toBe(false);expect(s.inventoryInspectable).toBe(false);});
 finish({ok:true,state,duplicate:false});await choice;
 expect(s.run).toEqual(state);expect(s.selectedIds.size).toBe(0);expect(button.input.enabled).toBe(true);expect(s.renderHand).toHaveBeenCalledOnce();
 await s.chooseRefill();expect(dispatchRun).toHaveBeenCalledOnce();
 // Exhausting discards cannot disable the inventory inspection entry.
 s.run={...state,stage:{...state.stage,discardsLeft:0}};s.updateInventoryControl();expect(button.input.enabled).toBe(true);
});

it('failed choice keeps fixed candidates and the entry blocked after saving pauses',async()=>{
 const run=pending(),{s,button}=scene(run);
 vi.mocked(dispatchRun).mockImplementation(async()=>{gate.controller.status='paused';return {ok:false,code:'save-failed',state:run};});
 await s.chooseRefill();expect(s.run).toBe(run);expect(s.selectedIds.size).toBe(run.pendingRefill!.required);expect(button.input.enabled).toBe(false);
 await s.chooseRefill();expect(dispatchRun).toHaveBeenCalledOnce();
});

it('stable readonly/paused permits inspection, while saving and replacement block entry without changing the run',()=>{
 const run=pending(),state=send(run,{type:'ChooseRefill',selectedIds:run.pendingRefill!.candidateIds.slice(0,1)}),{s,button}=scene(run);s.run=state;
 s.updateInventoryControl();expect(button.input.enabled).toBe(true);
 gate.controller.status='saving';s.updateInventoryControl();expect(button.input.enabled).toBe(false);
 for(const status of ['paused','readonly']){gate.controller.status=status;s.updateInventoryControl();expect(button.input.enabled).toBe(true);expect(s.ready).toBe(false);}
 gate.controller.status='idle';gate.session.lease.writable=false;s.updateInventoryControl();expect(button.input.enabled).toBe(true);expect(s.ready).toBe(false);
 gate.session.lease.writable=true;gate.session.pendingRun={};s.updateInventoryControl();expect(button.input.enabled).toBe(false);
 gate.session.pendingRun=undefined;gate.session.working=true;s.updateInventoryControl();expect(button.input.enabled).toBe(false);
 gate.session.working=false;s.updateInventoryControl();expect(button.input.enabled).toBe(true);expect(s.run).toBe(state);
});

it('inventory inspection passes write readiness separately and rechecks lease, sequence and phase on old confirmations',async()=>{
 const run=pending(),state=send(run,{type:'ChooseRefill',selectedIds:run.pendingRefill!.candidateIds.slice(0,1)}),{s}=scene(run);s.run=state;s.command=vi.fn(async()=>true);
 s.inspectInventory();const sendTool=vi.mocked(showConsumables).mock.calls.at(-1)![3],action:Action={type:'UseConsumable',instanceId:'owned/T17',targetIds:[]};
 expect(showConsumables).toHaveBeenLastCalledWith(s.dialog,state,true,expect.any(Function));
 expect(await sendTool(action,state.commandSeq-1)).toBe(false);expect(s.command).not.toHaveBeenCalled();
 gate.session.lease.writable=false;expect(await sendTool(action,state.commandSeq)).toBe(false);expect(s.command).not.toHaveBeenCalled();
 for(const status of ['readonly','paused']){gate.controller.status=status;s.inspectInventory();expect(showConsumables).toHaveBeenLastCalledWith(s.dialog,state,false,expect.any(Function));expect(await sendTool(action,state.commandSeq)).toBe(false);}
 gate.controller.status='idle';gate.session.lease.writable=true;s.run=run;expect(await sendTool(action,state.commandSeq)).toBe(false);expect(s.command).not.toHaveBeenCalled();
 s.run=state;expect(await sendTool(action,state.commandSeq)).toBe(true);expect(s.command).toHaveBeenCalledExactlyOnceWith(action,state.commandSeq);
});

it('a pending Touye wager retains the inventory lock even though its phase is await-input',()=>{
 let run=createRun({rulesVersion:'r2',characterId:'touye',seed:'touye-entry-unit',runId:'unit/touye-entry',r2Identity:newRunIdentity('touye','group'),openingRoute:'group'});
 run=send(send(run,{type:'LeaveShop'}),{type:'EnterStage'});
 const {s,button}=scene(pending());s.run={...run,stage:{...run.stage,touyeWager:{resolution:'pending'}}};s.updateInventoryControl();expect(button.input.enabled).toBe(false);
});
