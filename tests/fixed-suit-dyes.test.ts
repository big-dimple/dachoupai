import {expect,it} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {newRunIdentity,launchIdentity} from '../src/game/RunLaunch';
import {R2_SUIT_CHOICE_HASH,R2_SUIT_DYE_IDS,R2_BASIC_CHOICE_VERSION,R2_BASIC_CHOICE_HASH} from '../src/domain/r2GroupUpgrade';
import {r2BasicChoicePool,r2PurchasePrice,r2ToolPrice} from '../src/domain/r2Shop';
import {basicChoiceRows} from '../src/game/BasicToolChoice';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {r2CreateJoker} from '../src/domain/r2Run';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
const start=(old=false)=>createRun({seed:'group-natural-17',runId:'suit-choice',rulesVersion:'r2',characterId:'erxiang',openingRoute:'flush',r2Identity:old?{contentVersion:R2_BASIC_CHOICE_VERSION,contentHash:R2_BASIC_CHOICE_HASH}:newRunIdentity('erxiang','flush')});
const cmd=(s:R2RunState,action:Action)=>({runId:s.runId,commandId:'suit/'+s.commandSeq,expectedSeq:s.commandSeq,action});
const send=(s:R2RunState,a:Action)=>{const r=applyCommand(s,cmd(s,a));if(!r.ok)throw Error(r.code);return r.state;};
const buy=(s:R2RunState,id:string):Action=>({type:'BuyBasicTool',definitionId:id,shopSeq:s.shop!.basicChoice!.shopSeq});
const available=(s:R2RunState)=>R2_SUIT_DYE_IDS.find(id=>r2BasicChoicePool(s).some(t=>t.id===id))!;
it('new nine-choice identity preserves original five-choice RNG, random stock, price and retry identity',()=>{
 const n=start(),o=start(true);expect(n.contentHash).toBe(R2_SUIT_CHOICE_HASH);expect(o.contentHash).toBe(R2_BASIC_CHOICE_HASH);expect(n.rng).toEqual(o.rng);expect(n.shop!.toolOffers).toEqual(o.shop!.toolOffers);expect(basicChoiceRows(n)).toHaveLength(9);expect(basicChoiceRows(o)).toHaveLength(5);
 expect(launchIdentity('erxiang',{kind:'retry',run:o})).toEqual({contentVersion:o.contentVersion,contentHash:o.contentHash});
 expect(applyCommand(o,cmd(o,buy(o,'T03')))).toMatchObject({ok:false,code:'basic-choice-not-legal'});
 for(const id of R2_SUIT_DYE_IDS)expect(r2ToolPrice(id,n)).toBe(4);expect(r2ToolPrice('T08',n)).toBe(2);
});
it.each(R2_SUIT_DYE_IDS)('%s uses its actual 4-gold quote and existing coupon floor, preserves suit-only targets',id=>{
 let s=start();s.shop!.toolOffers=[];s.purchaseCoupons=1;expect(basicChoiceRows(s).find(r=>r.id===id)?.price).toBe(2);const paid=send(s,buy(s,id));expect(paid.gold).toBe(4);expect(paid.purchaseCoupons).toBe(0);expect(paid.shop!.basicChoice!.purchase!.paidPrice).toBe(2);
 const suit=({T03:'hearts',T04:'diamonds',T05:'clubs',T06:'spades'} as const)[id as 'T03'];const targets=paid.deckInstances.filter(c=>c.suit!==suit).slice(0,3);targets[0].enhancement='heat-paper';targets[0].edition='foil';const before=structuredClone(paid),used=send(paid,{type:'UseConsumable',instanceId:paid.consumables[0].instanceId,targetIds:targets.map(c=>c.id)});
 for(const card of targets)expect(used.deckInstances.find(c=>c.id===card.id)).toEqual({...before.deckInstances.find(c=>c.id===card.id),suit});expect(used.consumables).toHaveLength(0);expect(used.gold).toBe(before.gold);expect(readCheckpoint(makeCheckpoint(used,[])).ok).toBe(true);
 const normal=start();normal.shop!.toolOffers=[];expect(send(normal,buy(normal,id)).gold).toBe(2);const floor={...normal,purchaseCoupons:1,shop:{...normal.shop!,purchases:0}};floor.jokers=[r2CreateJoker('e02','owned/discount',4,'none',floor)];expect(r2PurchasePrice(floor,{offerId:'',definitionId:id,price:4,consumed:false})).toBe(1);const floorPaid=send(floor,buy(floor,id));expect(floorPaid.shop!.basicChoice!.purchase!.paidPrice).toBe(1);expect(readCheckpoint(makeCheckpoint(floorPaid,[])).ok).toBe(true);
});
it('dye and original five share one persisted quota through use and refresh; forged high paid prices are rejected',()=>{
 let s=start();const id=available(s);s=send(s,buy(s,id));expect(s.shop!.basicChoice!.purchase!.paidPrice).toBe(4);s.shop!.freeRerolls=1;const rerolled=send(s,{type:'RerollShop'});expect(rerolled.shop!.basicChoice).toEqual(s.shop!.basicChoice);expect(applyCommand(rerolled,cmd(rerolled,buy(rerolled,'T08')))).toMatchObject({ok:false,code:'basic-choice-consumed'});
 const cp=makeCheckpoint(s,[]);cp.state.shop!.basicChoice!.purchase!.paidPrice=5;const {checksum:_,...payload}=cp;cp.checksum=stableHash(payload);expect(readCheckpoint(cp).ok).toBe(false);
});
it('duplicate random stock, insufficient cash, full inventory and stale visit reject dye without changing state',()=>{
 const s=start(),id=available(s),duplicate=structuredClone(s);duplicate.shop!.toolOffers=[{offerId:duplicate.runId+'/shop/0/tool/0',definitionId:id,price:4,consumed:false}];
 for(const [state,action,code] of [[duplicate,buy(duplicate,id),'basic-choice-not-legal'],[{...s,gold:3},buy(s,id),'not-enough-gold'],[{...s,consumables:[{instanceId:'full/1',definitionId:'T08'},{instanceId:'full/2',definitionId:'T09'}]},buy(s,id),'consumable-slots-full'],[s,{...buy(s,id),shopSeq:999},'stale-shop']] as [R2RunState,Action,string][]){const before=JSON.stringify(state);expect(applyCommand(state,cmd(state,action))).toMatchObject({ok:false,code});expect(JSON.stringify(state)).toBe(before);}
});
class Store implements SaveStore {slots:SaveSlots={revision:0,current:null,previous:null};fail=false;writes=0;async read(){return structuredClone(this.slots);}async commit(revision:number,current:ReturnType<typeof makeCheckpoint>,previous:ReturnType<typeof makeCheckpoint>|null){this.writes++;if(this.fail)throw Error('save-failed');this.slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return revision+1;}}
it('failed dye save publishes no charge or quota; retry and duplicate save publish one purchase',async()=>{
 const s=start(),store=new Store(),run=await SavedRun.start(store,s,await store.read()),before=run.state,slots=await store.read(),c=cmd(before,buy(before,available(before)));store.fail=true;expect((await run.submit(c)).ok).toBe(false);expect(run.state).toBe(before);expect(await store.read()).toEqual(slots);store.fail=false;expect((await run.retry()).ok).toBe(true);const writes=store.writes;expect(await run.submit(c)).toMatchObject({ok:true,duplicate:true});expect(store.writes).toBe(writes);expect(run.state.gold).toBe(2);expect(run.state.consumables).toHaveLength(1);
});
