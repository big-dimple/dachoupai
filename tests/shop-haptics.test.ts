import {afterEach,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class{}}}));
const session=vi.hoisted(()=>({run:undefined as unknown,lease:{writable:true},pendingRun:undefined,working:false,reducedMotion:false}));
vi.mock('../src/game/session',()=>({gameSession:()=>session}));
import {ShopScene} from '../src/game/ShopScene';
import {OwnedJokerDragVisual} from '../src/game/OwnedJokerDragVisual';
import {Haptics} from '../src/haptics/Haptics';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {applyCommand,createRun} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {newRunIdentity} from '../src/game/RunLaunch';

afterEach(()=>{Haptics.shared.dispose();session.run=undefined;vi.restoreAllMocks();vi.unstubAllGlobals();});
async function setup(){
  const doc=Object.assign(new EventTarget(),{visibilityState:'visible'}),win=Object.assign(new EventTarget(),{matchMedia:()=>({matches:false})}),vibrate=vi.fn(()=>true);
  vi.stubGlobal('document',doc);vi.stubGlobal('window',win);vi.stubGlobal('navigator',{vibrate,userActivation:{hasBeenActive:true}});
  vi.stubGlobal('localStorage',{getItem:()=>null,setItem:vi.fn()});
  const initial=createRun({seed:'haptic-shop',runId:'haptic-shop',characterId:'laohuan',rulesVersion:'r2',r2Identity:newRunIdentity('laohuan','group'),openingRoute:'group'});
  const first=applyCommand(initial,{runId:initial.runId,commandId:'fixture-first-purchase',expectedSeq:initial.commandSeq,action:{type:'BuyOffer',offerId:initial.shop!.offers[0].offerId}});expect(first.ok).toBe(true);if(!first.ok)throw Error(first.code);
  const state=first.state;
  state.gold=100;state.jokers=['b03','b08'].map((id,i)=>r2CreateJoker(id,'held/'+i,8,'none',state));
  let slots:SaveSlots={revision:0,current:null,previous:null},release=()=>{};
  const control={delay:false,fail:false,writes:0};
  const store:SaveStore={read:async()=>structuredClone(slots),commit:async(expected,current,previous)=>{
    control.writes++;if(control.delay)await new Promise<void>(resolve=>{release=resolve;});
    if(control.fail)throw new Error('storage-error');expect(expected).toBe(slots.revision);
    slots={revision:expected+1,current:structuredClone(current),previous:structuredClone(previous)};return slots.revision;
  }};
  const controller=await SavedRun.start(store,state,slots);session.run=controller;
  const owner=Object.assign(new EventTarget(),{classList:{contains:()=>false}}),box={x:0,y:0,width:100,height:100};
  const scene=Object.create(ShopScene.prototype) as any;
  Object.assign(scene,{run:controller.state,busy:false,lifecycle:1,hapticLife:new AbortController(),scene:{isActive:()=>true},input:{enabled:true},
    registry:{get:()=>controller,set:vi.fn()},dialog:{current:owner,active:(d:unknown)=>scene.dialog.current===d,open:vi.fn(),close:()=>{scene.dialog.current=undefined;owner.dispatchEvent(new Event('close'));}},
    audio:{purchase:vi.fn(),select:vi.fn(),invalid:vi.fn()},render:vi.fn(),afterRenderFx:vi.fn(),geometry:()=>({slots:[box,box,box],shelf:[box,box,box],items:box}),
    visibleOffers:()=>scene.run.shop.offers,transactionGrowthLines:new WeakMap(),makeCardsView:{pane:'purchase',positions:{owned:0,purchase:0}},
  });
  const offer=controller.state.shop!.offers.find(o=>!o.consumed&&!state.jokers.some(j=>j.definitionId===o.definitionId))!;expect(offer).toBeDefined();
  return {scene,controller,control,owner,vibrate,engine:Haptics.shared,store,offer,release:()=>release()};
}

it('the actual ShopScene/send → dispatchRun → SavedRun path waits for store.commit before purchase feedback',async()=>{
  const f=await setup(),before=f.controller.state;f.control.delay=true;
  const pending=f.scene.send({type:'BuyOffer',offerId:f.offer.offerId});
  expect(f.controller.status).toBe('saving');expect(f.controller.state).toBe(before);expect(f.vibrate).not.toHaveBeenCalled();
  f.release();expect(await pending).toBe(true);expect(f.controller.status).toBe('idle');expect(f.scene.run).toBe(f.controller.state);
  expect(f.controller.state.gold).toBeLessThan(before.gold);expect(f.control.writes).toBe(2);
  expect(f.vibrate).toHaveBeenCalledExactlyOnceWith([12,30,18]);
});
it('a failed save and a later menu retry never emit a stale purchase celebration',async()=>{
  const f=await setup();f.control.fail=true;expect(await f.scene.send({type:'BuyOffer',offerId:f.offer.offerId})).toBe(false);
  expect(f.controller.status).toBe('paused');expect(f.vibrate).not.toHaveBeenCalled();
  f.control.fail=false;expect((await f.controller.retry()).ok).toBe(true);expect(f.vibrate).not.toHaveBeenCalled();
});
it('a duplicate persisted receipt does not request purchase feedback',async()=>{
  const f=await setup(),action={type:'BuyOffer' as const,offerId:f.offer.offerId},saved=await f.controller.dispatch(action);expect(saved.ok).toBe(true);if(!saved.ok)return;
  f.scene.run=f.controller.state;vi.spyOn(f.controller,'dispatch').mockResolvedValueOnce({...saved,duplicate:true});
  expect(await f.scene.send(action)).toBe(true);expect(f.vibrate).not.toHaveBeenCalled();
});
it.each(['dialog-close','cancel','hidden','scene-stop','settings-off'])('%s during a real pending save cancels its haptic intent even if commit eventually succeeds',async reason=>{
  const f=await setup();f.control.delay=true;const pending=f.scene.send({type:'BuyOffer',offerId:f.offer.offerId});
  expect(f.controller.status).toBe('saving');const gold=f.controller.state.gold;
  if(reason==='dialog-close')f.scene.dialog.close();else if(reason==='cancel')f.owner.dispatchEvent(new Event('cancel'));
  else if(reason==='hidden'){Object.assign(document,{visibilityState:'hidden'});document.dispatchEvent(new Event('visibilitychange'));}
  else if(reason==='scene-stop'){f.scene.hapticLife.abort();f.scene.lifecycle++;}else f.engine.setEnabled(false);
  f.release();await pending;expect(f.controller.status).toBe('idle');expect(f.controller.state.gold).toBeLessThan(gold);expect(f.vibrate).not.toHaveBeenCalled();
});
it('a saved reorder waits for its real landing callback',async()=>{
  const f=await setup();let landed=()=>{};
  const drag={saving:true,capture:vi.fn(),settle:vi.fn((saved:boolean,callback:()=>void)=>{expect(saved).toBe(true);landed=callback;}),destroy:vi.fn()};f.scene.ownedDrag=drag;
  const ids=f.controller.state.jokers.map(j=>j.instanceId).reverse();
  expect(await f.scene.send({type:'ReorderJokers',ids})).toBe(true);expect(f.controller.state.jokers.map(j=>j.instanceId)).toEqual(ids);
  expect(drag.settle).toHaveBeenCalledOnce();expect(f.vibrate).not.toHaveBeenCalled();landed();expect(f.vibrate).toHaveBeenCalledExactlyOnceWith([16]);
});
it('canceling after commit but before the dragged face lands suppresses its landing cue',async()=>{
  const f=await setup();let landed=()=>{};f.scene.ownedDrag={saving:true,capture:vi.fn(),settle:(_saved:boolean,callback:()=>void)=>{landed=callback;},destroy:vi.fn()};
  await f.scene.send({type:'ReorderJokers',ids:f.controller.state.jokers.map(j=>j.instanceId).reverse()});f.scene.transactionHaptic.cancel();landed();expect(f.vibrate).not.toHaveBeenCalled();
});
it.each(['failed','duplicate'])('a %s reorder cannot celebrate even if the visual calls its retained landing callback',async mode=>{
  const f=await setup(),action={type:'ReorderJokers' as const,ids:f.controller.state.jokers.map(j=>j.instanceId).reverse()};let landed=()=>{};
  if(mode==='failed')f.control.fail=true;
  else{const saved=await f.controller.dispatch(action);expect(saved.ok).toBe(true);if(!saved.ok)return;f.scene.run=f.controller.state;vi.spyOn(f.controller,'dispatch').mockResolvedValueOnce({...saved,duplicate:true});}
  f.scene.ownedDrag={saving:true,capture:vi.fn(),settle:(_saved:boolean,callback:()=>void)=>{landed=callback;},destroy:vi.fn()};
  expect(await f.scene.send(action)).toBe(mode!=='failed');landed();expect(f.vibrate).not.toHaveBeenCalled();
});
it('OwnedJokerDragVisual reports only the dragged saved face at tween completion, with immediate landing for reduced motion',()=>{
  for(const reduced of [false,true]){
    const art:any={active:true,setPosition:()=>art,setScale:()=>art,setAlpha:()=>art,setAngle:()=>art},landed=vi.fn(),tweens:any[]=[];
    const visual=Object.create(OwnedJokerDragVisual.prototype) as any;
    Object.assign(visual,{id:'a',surface:()=>({ids:['a','b'],arts:new Map([['a',art],['b',art]]),slots:[{x:0,y:0,width:10,height:10},{x:20,y:0,width:10,height:10}],root:{bringToTop:vi.fn()}}),positions:new Map([['a',{x:10,y:10,scale:1.06}],['b',{x:30,y:10,scale:1}]]),reduced:()=>reduced,scene:{tweens:{killTweensOf:vi.fn(),add:(config:unknown)=>tweens.push(config)}}});
    visual.settle(true,landed);expect(landed).toHaveBeenCalledTimes(reduced?1:0);
    if(!reduced){expect(tweens.filter(t=>t.onComplete)).toHaveLength(1);tweens.find(t=>t.onComplete).onComplete();expect(landed).toHaveBeenCalledOnce();}
    landed.mockClear();visual.settle(false,landed);expect(landed).not.toHaveBeenCalled();
  }
});
