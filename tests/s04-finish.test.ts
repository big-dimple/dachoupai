import {describe,it,expect} from 'vitest';
import {applyCommand,createRun,type R2RunState,type Action} from '../src/domain/run';
import {s04Fixture as fixture,s04Send as send,s04Command as command} from '../harness/fixtures/s04-finish';
import {r2S04Facts,r2S04Issue} from '../src/domain/r2S04';
import {r2ToolAcquisitionPool,r2PurchasePrice,r2PaidRerollPrice} from '../src/domain/r2Shop';
import {r2HandLimit} from '../src/domain/r2Resources';
import {R2_CORE_BUILD_HASH,R2_CORE_BUILD_VERSION,R2_S04_FINISH_HASH,R2_S04_FINISH_VERSION,isR2CoreBuild} from '../src/domain/r2GroupUpgrade';
import {newRunIdentity,launchIdentity} from '../src/game/RunLaunch';
import {toolInfo} from '../src/game/r2ToolInfo';
import {s04IssueText,s04QualificationText} from '../src/game/S04Qualification';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';
import {r2TargetPolicyFor} from '../src/domain/r2TargetPolicy';
import {r2CreateJoker} from '../src/domain/r2Run';
import {CHARACTER_IDS} from '../src/domain/characters';
const listed=(s:R2RunState)=>r2ToolAcquisitionPool(s).some(t=>t.id==='S04');
const buy:Action={type:'BuyOffer',offerId:'s04/controlled/tool/0'};
const use=(id:string,suit:'hearts'|'spades'='hearts'):Action=>({type:'UseConsumable',instanceId:id,targetIds:[],suit});
const held=(s:R2RunState)=>{s.consumables=[{instanceId:'s04/held',definitionId:'S04'}];return s;};
function reject(s:R2RunState,a:Action,code:string){const before=structuredClone(s),r=applyCommand(s,command(s,a));expect(r).toMatchObject({ok:false,code,state:s});expect(s).toEqual(before);}
function round(s:R2RunState){const cp=makeCheckpoint(s,[]);expect(readCheckpoint(JSON.parse(JSON.stringify(cp)))).toEqual({ok:true,checkpoint:cp});}
describe('approved S04 50% experimental profile',()=>{
 it.each(CHARACTER_IDS)('%s new launch inherits core scoring/targets and preserves old retry identity',hero=>{
  if(hero!=='amo')expect(newRunIdentity(hero)).toEqual({contentVersion:R2_S04_FINISH_VERSION,contentHash:R2_S04_FINISH_HASH});
  else expect(newRunIdentity(hero).contentVersion).toBe('quality-r2-amo-exile-v1');
  const s=createRun({rulesVersion:'r2',runId:'s04-launch/'+hero,seed:'s04-launch',characterId:hero,openingRoute:'group',r2Identity:newRunIdentity(hero)});
  expect(isR2CoreBuild(s)).toBe(true);expect(listed(s)).toBe(false);round(s);
  const old=fixture({old:true});expect(old.contentHash).toBe(R2_CORE_BUILD_HASH);expect(launchIdentity('laohuan',{kind:'retry',run:old})).toEqual({contentVersion:R2_CORE_BUILD_VERSION,contentHash:R2_CORE_BUILD_HASH});
  expect(r2TargetPolicyFor(s)).toEqual(r2TargetPolicyFor(old));
 });
 it.each([[3,26,false,'s04-chapter-gated'],[6,25,false,'s04-suit-density'],[6,26,true,undefined]] as const)('index%s hearts%s has matching supply, buy, use and public status', (index,hearts,legal,issue)=>{
  const s=fixture({index,hearts});expect(listed(s)).toBe(legal);expect(r2S04Issue(s,'hearts')).toBe(issue);
  expect(s04QualificationText(s,'hearts')).toContain(`红桃 ${hearts}/52`);
  if(!legal){reject(s,buy,'invalid-offer');reject(held(s),use('s04/held'),issue!);expect(s04IssueText(s,'hearts')).toBeTruthy();}
  else {const b=send(s,buy),n=send(b,use(b.consumables[0].instanceId));expect(n.spectralModifiers.handPenalty).toBe(1);expect(n.deckInstances.every(c=>c.suit==='hearts')).toBe(true);round(n);}
 });
 it('uses the live denominator after actual deletion and copying, including copied target suit',()=>{
  let s=fixture({hearts:25});s.consumables=[{instanceId:'delete',definitionId:'T02'}];
  const ids=s.deckInstances.filter(c=>c.suit!=='hearts').slice(0,2).map(c=>c.id);s=send(s,{type:'UseConsumable',instanceId:'delete',targetIds:ids});
  expect(r2S04Facts(s)).toMatchObject({living:50,required:25});expect(listed(s)).toBe(true);round(s);
  s=fixture();s.consumables=[{instanceId:'copy',definitionId:'T07'}];
  const other=s.deckInstances.find(c=>c.suit!=='hearts')!;s=send(s,{type:'UseConsumable',instanceId:'copy',targetIds:[other.id]});expect(r2S04Facts(s)).toMatchObject({living:53,required:27});expect(r2S04Issue(s,'hearts')).toBe('s04-suit-density');expect(listed(s)).toBe(false);round(s);
  s=fixture();s.consumables=[{instanceId:'copy',definitionId:'T07'}];s=send(s,{type:'UseConsumable',instanceId:'copy',targetIds:[s.deckInstances.find(c=>c.suit==='hearts')!.id]});expect(r2S04Facts(s)).toMatchObject({living:53,required:27});expect(listed(s)).toBe(true);round(s);
 });
 it('permits either target in a 50/50 deck and rejects a complete monochrome deck',()=>{
  const s=fixture();for(const c of s.deckInstances)if(c.suit!=='hearts')c.suit='spades';
  expect(r2S04Facts(s).suits.filter(row=>row.eligible).map(row=>row.suit).sort()).toEqual(['hearts','spades']);
  for(const suit of ['hearts','spades'] as const){const n=send(held(structuredClone(s)),use('s04/held',suit));expect(n.deckInstances.every(c=>c.suit===suit)).toBe(true);round(n);}
  const full=held(fixture({hearts:52}));expect(listed(full)).toBe(false);reject(full,use('s04/held'),'no-effect');reject(full,use('s04/held','spades'),'s04-suit-density');
 });
 it('rechecks a held purchase after actual copying removes its target qualification, without consuming it',()=>{
  let s=send(fixture(),buy);const id=s.consumables[0].instanceId;
  s.consumables.push({instanceId:'copy',definitionId:'T07'});s=send(s,{type:'UseConsumable',instanceId:'copy',targetIds:[s.deckInstances.find(c=>c.suit!=='hearts')!.id]});
  reject(s,use(id),'s04-suit-density');expect(s.consumables.some(c=>c.instanceId===id)).toBe(true);round(s);
 });
 it('retains the real discount quote, minimum1, no use-gold, persistent attributes and exact next-stage capacity',()=>{
  const s=fixture();s.purchaseCoupons=1;s.longTermItems=['U10'];s.jokers=[r2CreateJoker('e02','discount',4,'none',s)];
  s.deckInstances[0].enhancement='heat-paper';s.deckInstances[0].edition='foil';
  const price=r2PurchasePrice(s,s.shop!.toolOffers[0]);expect(price).toBe(2);expect(r2PurchasePrice(s,{...s.shop!.toolOffers[0],price:1})).toBe(1);
  const b=send(s,buy),before=structuredClone(b),n=send(b,use(b.consumables[0].instanceId));expect(b.gold).toBe(s.gold-price);expect(n.gold).toBe(b.gold);expect(b.purchaseCoupons).toBe(0);
  expect(n.deckInstances).toEqual(before.deckInstances.map(c=>({...c,suit:'hearts'})));expect(n.drawPile).toEqual(before.drawPile);expect(n.rng).toEqual(before.rng);expect(n.chapterTargetPlan).toEqual(before.chapterTargetPlan);
  const c=command(b,use(b.consumables[0].instanceId)),r=applyCommand(b,c);expect(r.ok).toBe(true);if(r.ok)expect(applyCommand(r.state,c)).toMatchObject({ok:true,duplicate:true,state:r.state});
  const entered=send(send(n,{type:'LeaveShop'}),{type:'EnterStage'});expect(entered.stage!.handLimit).toBe(r2HandLimit(s)-1);expect(entered.handOrder).toHaveLength(entered.stage!.handLimit);expect(entered.stage!.initialHands).toBe(4);round(entered);
 });
 it('preserves B10 actual reduction and rejects the minimum swallowing a second permanent cost',()=>{
  const s=held(fixture({index:8,boss:'B10'}));expect(r2HandLimit(s)).toBe(6);const n=send(s,use('s04/held'));const entered=send(send(n,{type:'LeaveShop'}),{type:'EnterStage'});expect(entered.stage!.handLimit).toBe(5);round(entered);
  const floor=held(fixture({index:8,boss:'B10'}));floor.spectralModifiers.handPenalty=1;expect(r2HandLimit(floor)).toBe(5);expect(listed(floor)).toBe(false);reject(floor,use('s04/held'),'resource-floor');
  const cap=held(fixture());cap.spectralModifiers.handPenalty=2;reject(cap,use('s04/held'),'resource-floor');
 });
 it('rejects an unaffordable or full-inventory purchase atomically, while a qualified held tool needs no gold',()=>{
  const poor=fixture();poor.gold=5;reject(poor,buy,'not-enough-gold');
  const full=fixture();full.consumables=[{instanceId:'a',definitionId:'T01'},{instanceId:'b',definitionId:'T08'}];reject(full,buy,'consumable-slots-full');
  const freeUse=held(fixture());freeUse.gold=0;const n=send(freeUse,use('s04/held'));expect(n.gold).toBe(0);round(n);
 });
 it('does not replace existing stock/RNG on a crossing dye, and a paid refresh preserves spent service quota',()=>{
  let s=fixture({hearts:25,stock:false});s.shop!.toolOffers=[];s=send(s,{type:'BuyBasicTool',definitionId:'T03',shopSeq:s.shop!.basicChoice!.shopSeq});const b=structuredClone(s),id=s.consumables.at(-1)!.instanceId;
  s=send(s,{type:'UseConsumable',instanceId:id,targetIds:[s.deckInstances.find(c=>c.suit!=='hearts')!.id]});expect(listed(s)).toBe(true);expect(s.shop).toEqual(b.shop);expect(s.rng).toEqual(b.rng);
  const cost=r2PaidRerollPrice(s),quota=structuredClone(s.shop!.basicChoice),gold=s.gold;s=send(s,{type:'RerollShop'});expect(s.gold).toBe(gold-cost);expect(cost).toBe(2);expect(s.shop!.basicChoice).toEqual(quota);round(s);
 });
 it('keeps the prior core S04 acquisition/use and description, even after new-profile cache reads',()=>{
  const old=held(fixture({old:true,index:0,hearts:13}));expect(listed(old)).toBe(true);const oldInfo=toolInfo('S04',old);expect(toolInfo('S04',fixture()).summary).toContain('50%');expect(toolInfo('S04',old)).toEqual(oldInfo);expect(oldInfo.summary).not.toContain('50%');expect(s04QualificationText(old)).toBeUndefined();
  const n=send(old,use('s04/held'));expect(n.deckInstances.every(c=>c.suit==='hearts')).toBe(true);expect(n.contentHash).toBe(R2_CORE_BUILD_HASH);round(n);
 });
});
