import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import type {Action,R2RunState} from '../src/domain/run';
const fixture=vi.hoisted(()=>({active:undefined as object|undefined,dialogs:[] as {title:string;body:string;actions:{label:string;run:()=>void|Promise<void>}[];token:object;options?:{cards?:{body:string}[]}}[]}));
vi.mock('phaser',()=>({default:{Scene:class {scene={isActive:()=>true};}}}));
vi.mock('../src/game/SceneView',()=>({SceneView:class {}}));
vi.mock('../src/game/session',()=>({gameSession:()=>({lease:{writable:true},pendingRun:null,working:false})}));
vi.mock('../src/game/runAdapter',()=>({runController:()=>({status:'idle'})}));
vi.mock('../src/game/DetailDialog',()=>({DetailDialog:class {
 active(token:object){return fixture.active===token;}
 close(token?:object){if(!token||fixture.active===token)fixture.active=undefined;}
 open(title:string,body:string,actions:{label:string;run:()=>void|Promise<void>}[]=[],options?:{cards?:{body:string}[]}){const token={};fixture.active=token;fixture.dialogs.push({title,body,actions,token,options});return token;}
}}));
import {ShopScene} from '../src/game/ShopScene';
import {r2CreateJoker} from '../src/domain/r2Run';
import {buildJourneyPlan,journeySend} from '../harness/fixtures/build-journey';
type Shop={run:R2RunState;dialog:{close:()=>void;open:(title:string,body:string)=>object};inspectJoker:(id:string,offerId?:string)=>void;inspectOffer:(id:string)=>void;inspectReplacement:(id:string)=>void;send:(a:Action,seq:number)=>Promise<boolean>;hideHoverPicture:()=>void;jokerCopy:()=>undefined;jokerPortrait:()=>undefined;jokerArtStatus:()=>{status:string};attachJokerFallback:()=>void};
beforeEach(()=>{fixture.active=undefined;fixture.dialogs=[];vi.stubGlobal('document',{querySelector:()=>null});});
afterEach(()=>vi.unstubAllGlobals());
function pendingSale(withTrade=false){
 const s=new ShopScene() as unknown as Shop;s.run=buildJourneyPlan();if(withTrade){const long=r2CreateJoker('e11','long',8,undefined,s.run),reuse=r2CreateJoker('e06','reuse',6,undefined,s.run);long.growth.coefficient={n:'3',d:'2'};reuse.growth.multiplier={n:'1',d:'2'};s.run.jokers.push(long,reuse);}
 s.hideHoverPicture=()=>{};s.jokerCopy=()=>undefined;s.jokerPortrait=()=>undefined;s.jokerArtStatus=()=>({status:'idle'});s.attachJokerFallback=()=>{};
 const offerId=s.run.shop!.offers.find(o=>!o.consumed)!.offerId,held=s.run.jokers[0],before=structuredClone(s.run);let finish!:()=>void;
 const gate=new Promise<void>(resolve=>finish=resolve);const send=vi.fn(async(a:Action,seq:number)=>{expect(seq).toBe(before.commandSeq);await gate;s.run=journeySend(s.run,a);return true;});s.send=send;
 const opened=vi.fn();s.inspectOffer=opened;s.inspectJoker(held.instanceId,offerId);
 fixture.dialogs.at(-1)!.actions.find(a=>a.label==='出售')!.run();const confirmation=fixture.dialogs.at(-1)!;
 const pending=confirmation.actions[0].run();expect(send).toHaveBeenCalledTimes(1);
 return {s,before,held,offerId,finish,pending,opened,confirmation};
}
it('closing during save preserves the committed sale and never reopens the purchase page',async()=>{
 const x=pendingSale();x.s.dialog.close();x.finish();await x.pending;
 expect(x.s.run).toEqual(journeySend(x.before,{type:'SellJoker',instanceId:x.held.instanceId}));expect(x.opened).not.toHaveBeenCalled();expect(fixture.active).toBeUndefined();
});
it('a newer dialog retains ownership when the old sale finishes',async()=>{
 const x=pendingSale(),newDialog=x.s.dialog.open('新的导航','新内容');x.finish();await x.pending;
 expect(x.s.run.jokers.some(j=>j.instanceId===x.held.instanceId)).toBe(false);expect(fixture.active).toBe(newDialog);expect(x.opened).not.toHaveBeenCalled();
});
it('the still-active confirmation closes after saving and opens current offer details once',async()=>{
 const x=pendingSale();x.finish();await x.pending;expect(x.opened).toHaveBeenCalledExactlyOnceWith(x.offerId);expect(fixture.active).toBeUndefined();expect(x.s.run).toEqual(journeySend(x.before,{type:'SellJoker',instanceId:x.held.instanceId}));
});

it('comparison and actual sale confirmation both expose retained reset, growth and qualification consequences',async()=>{
 const x=pendingSale(true);expect(x.confirmation.body).toContain('×1.5 → ×1');expect(x.confirmation.body).toContain('旧物新用');expect(x.confirmation.body).toContain('未出售');expect(x.s.run).toEqual(x.before);
 x.s.dialog.close();x.s.inspectReplacement(x.offerId);const cards=fixture.dialogs.at(-1)!.options!.cards!;expect(cards[0].body).toContain('×1.5 → ×1');expect(cards[0].body).toContain('+0.5 → +1');expect(cards[0].body).toContain('未出售');
 x.finish();await x.pending;expect(x.opened).not.toHaveBeenCalled();expect(x.s.run.jokers.find(j=>j.instanceId==='long')!.growth.coefficient).toEqual({n:'1',d:'1'});expect(x.s.run.jokers.find(j=>j.instanceId==='reuse')!.growth.multiplier).toEqual({n:'1',d:'1'});
});
