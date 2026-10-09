import {expect,it} from 'vitest';
import {createRun,applyCommand,type R2RunState,type Action} from '../src/domain/run';
import {newRunIdentity,launchIdentity} from '../src/game/RunLaunch';
import {R2_BASIC_CHOICE_HASH,R2_ERXIANG_HANDOFF_VERSION,R2_ERXIANG_HANDOFF_HASH,R2_BASIC_TOOL_IDS} from '../src/domain/r2GroupUpgrade';
import {r2BasicChoicePool,r2PurchasePrice} from '../src/domain/r2Shop';
import {basicChoiceSeat,basicChoiceRows} from '../src/game/BasicToolChoice';
import {purchasePaymentFacts} from '../src/game/PurchasePaymentFacts';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {stableHash} from '../src/domain/hash';
import {SavedRun,type SaveStore,type SaveSlots} from '../src/application/SavedRun';
import {CHARACTER_IDS} from '../src/domain/characters';
const start=(characterId:R2RunState['characterId']='erxiang',legacy=false)=>createRun({seed:'group-natural-17',runId:'choice/'+characterId,rulesVersion:'r2',characterId,openingRoute:'group',r2Identity:legacy?{contentVersion:R2_ERXIANG_HANDOFF_VERSION,contentHash:R2_ERXIANG_HANDOFF_HASH}:newRunIdentity(characterId,'group'),modeConfig:{mode:'standard',difficulty:0,challengeId:null,programsEnabled:false}});
const cmd=(s:R2RunState,action:Action)=>({runId:s.runId,commandId:'choice/'+s.commandSeq,expectedSeq:s.commandSeq,action});
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,cmd(s,action));if(!r.ok)throw Error(r.code);return r.state;};
const buy=(s:R2RunState,id=r2BasicChoicePool(s)[0].id):Action=>({type:'BuyBasicTool',definitionId:id,shopSeq:s.shop!.basicChoice!.shopSeq});
const round=(s:R2RunState)=>{const read=readCheckpoint(makeCheckpoint(s,[]));expect(read.ok).toBe(true);if(!read.ok)throw Error(read.code);expect(read.checkpoint.state).toEqual(s);};
it.each(CHARACTER_IDS)('%s gets the new shop quota and original random stock/RNG, while old retry stays frozen',id=>{
 const n=start(id),old=start(id,true);expect(n.contentHash).toBe(R2_BASIC_CHOICE_HASH);expect(n.shop!.toolOffers).toEqual(old.shop!.toolOffers.slice(0,1));expect(n.rng).toEqual(old.rng);expect(n.shop!.basicChoice).toEqual({shopSeq:1,purchase:null});
 expect(old.shop!.toolOffers).toHaveLength(2);expect(old.shop!.basicChoice).toBeUndefined();expect(launchIdentity(id,{kind:'retry',run:old})).toEqual({contentVersion:old.contentVersion,contentHash:old.contentHash});round(n);round(old);
 expect(applyCommand(old,cmd(old,{type:'BuyBasicTool',definitionId:'T08',shopSeq:1}))).toMatchObject({ok:false,code:'basic-choice-unavailable'});
});
it('one atomic purchase charges the original price, creates one tool, retains RNG and leaves cancel/view read-only',()=>{
 const s=start(),before=JSON.stringify(s),rows=basicChoiceRows(s);expect(rows.map(r=>r.id)).toEqual(R2_BASIC_TOOL_IDS);expect(rows.some(r=>r.id==='T07'||r.id==='S01')).toBe(false);expect(JSON.stringify(s)).toBe(before);
 const action=buy(s,'T08'),n=send(s,action);expect(n.gold).toBe(s.gold-2);expect(n.consumables).toHaveLength(1);expect(n.shop!.purchases).toBe(1);expect(n.shop!.basicChoice!.purchase).toMatchObject({definitionId:'T08',paidPrice:2,seq:n.commandSeq});expect(n.rng).toEqual(s.rng);round(n);
 expect(applyCommand(n,cmd(n,buy(n,'T09')))).toMatchObject({ok:false,code:'basic-choice-consumed'});expect(applyCommand(n,cmd(s,action))).toMatchObject({ok:true,duplicate:true,state:n});
});
it('a real warm-up coupon keeps the minimum actual price at one and records the same saved discount',()=>{
 const s=send(send(start(),{type:'SkipStage'}),{type:'OpenShop'});expect(s.purchaseCoupons).toBe(1);const action=buy(s),seat={...basicChoiceSeat(s)!,definitionId:(action as Extract<Action,{type:'BuyBasicTool'}>).definitionId};expect(r2PurchasePrice(s,seat)).toBe(1);
 const n=send(s,action);expect(n.gold).toBe(s.gold-1);expect(n.purchaseCoupons).toBe(0);expect(purchasePaymentFacts(s,n,seat)).toMatchObject({original:2,paid:1,saved:1});round(n);
});
it('using the tool and paid/free refresh cannot reopen the quota; only the next shop resets it',()=>{
 const bought=send(start(),buy(start(),'T08')),used=send(bought,{type:'UseConsumable',instanceId:bought.consumables[0].instanceId,targetIds:[bought.deckInstances.find(c=>c.rank===7)!.id]});
 const refreshed=send(used,{type:'RerollShop'});expect(refreshed.shop!.basicChoice).toEqual(bought.shop!.basicChoice);expect(refreshed.gold).toBe(used.gold-2);expect(r2BasicChoicePool(refreshed)).toEqual([]);round(refreshed);
 const next=send(send(refreshed,{type:'SkipStage'}),{type:'OpenShop'});expect(next.shop!.basicChoice!.purchase).toBeNull();expect(next.shop!.basicChoice!.shopSeq).toBe(next.commandSeq);round(next);
 const free={...used,shop:{...used.shop!,freeRerolls:1}};const n=send(free,{type:'RerollShop'});expect(n.gold).toBe(free.gold);expect(n.shop!.basicChoice).toEqual(bought.shop!.basicChoice);
});
it('rejects stale shop/seq, duplicate random supply, insufficient cash, full inventory and unsupported choices without mutation',()=>{
 const s=start();s.shop!.toolOffers[0]={...s.shop!.toolOffers[0],definitionId:'T08',price:2};const duplicate=s.shop!.toolOffers[0];expect(basicChoiceRows(s).find(r=>r.id===duplicate.definitionId)?.duplicate).toEqual(duplicate);
 const full={...s,consumables:[{instanceId:'full/1',definitionId:'T02'},{instanceId:'full/2',definitionId:'T09'}]},poor={...s,gold:0};
 for(const [state,action,code] of [[s,{type:'BuyBasicTool',definitionId:'T08',shopSeq:2},'stale-shop'],[s,buy(s,duplicate.definitionId),'basic-choice-not-legal'],[s,buy(s,'T07'),'basic-choice-not-legal'],[full,buy(full,'T09'),'consumable-slots-full'],[poor,buy(poor,'T09'),'not-enough-gold']] as [R2RunState,Action,string][]){const before=JSON.stringify(state);expect(applyCommand(state,cmd(state,action))).toMatchObject({ok:false,code});expect(JSON.stringify(state)).toBe(before);}
 expect(applyCommand(s,{...cmd(s,buy(s)),expectedSeq:0})).toMatchObject({ok:false,code:'stale-sequence'});
});
it('actual deck endpoints/floor and no-op enhancements are removed from legal choices',()=>{
 const s=start();s.deckInstances=s.deckInstances.slice(0,20).map(c=>({...c,rank:14,enhancement:'heat-paper'}));s.drawPile=s.deckInstances.map(c=>c.id);
 for(const id of ['T02','T08','T10'])expect(applyCommand(s,cmd(s,buy(s,id)))).toMatchObject({ok:false,code:'basic-choice-not-legal'});
 expect(basicChoiceRows(s).find(r=>r.id==='T02')!.reason).toContain('没有合法');
});
it('saved quota cannot be cleared, rebound to a refresh, or given a forged purchase after use',()=>{
 const s=send(start(),buy(start(),'T08')),used=send(s,{type:'UseConsumable',instanceId:s.consumables[0].instanceId,targetIds:[s.deckInstances[0].id]});round(used);
 for(const mutate of [(n:R2RunState)=>n.shop!.basicChoice!.purchase=null,(n:R2RunState)=>n.shop!.basicChoice!.purchase!.definitionId='T09',(n:R2RunState)=>n.shop!.basicChoice!.shopSeq=2,(n:R2RunState)=>delete n.shop!.basicChoice]){const cp=structuredClone(makeCheckpoint(used,[]));mutate(cp.state);const {checksum:_,...payload}=cp;cp.checksum=stableHash(payload);expect(readCheckpoint(cp).ok).toBe(false);}
 const old=makeCheckpoint(start('erxiang',true),[]);(old.state.shop as any).basicChoice={shopSeq:1,purchase:null};expect(readCheckpoint(old).ok).toBe(false);
});
class Store implements SaveStore {slots:SaveSlots={revision:0,current:null,previous:null};fail=false;writes=0;async read(){return structuredClone(this.slots);}async commit(revision:number,current:ReturnType<typeof makeCheckpoint>,previous:ReturnType<typeof makeCheckpoint>|null){this.writes++;if(this.fail)throw Error('save-failed');if(revision!==this.slots.revision)throw Error('conflict');this.slots={revision:revision+1,current:structuredClone(current),previous:structuredClone(previous)};return revision+1;}}
it('failed durable purchase keeps original cash/inventory/quota, then retry and duplicate publish only once',async()=>{
 const s=start(),store=new Store(),run=await SavedRun.start(store,s,await store.read()),before=run.state,slots=await store.read();store.fail=true;const c=cmd(before,buy(before,'T08'));
 expect((await run.submit(c)).ok).toBe(false);expect(run.state).toBe(before);expect(await store.read()).toEqual(slots);const pending=run.exportJSON();expect(readCheckpoint(JSON.parse(pending)).ok).toBe(true);
 store.fail=false;expect((await run.retry()).ok).toBe(true);expect(run.exportJSON()).toBe(pending);const writes=store.writes;expect(await run.submit(c)).toMatchObject({ok:true,duplicate:true});expect(store.writes).toBe(writes);expect(run.state.gold).toBe(4);expect(run.state.consumables).toHaveLength(1);round(run.state);
});
