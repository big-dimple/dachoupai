import {describe,expect,it} from 'vitest';
import {applyCommand,createRun,assertRunInvariants,type Action,type R2RunState} from '../src/domain/run';
import {r2Price} from '../src/domain/r2Shop';
import {scoreR2Hand} from '../src/domain/scoreR2';
import {R2_JOKERS} from '../src/content/r2Schema';
import {getR2Stage,makeR2Shop} from '../src/domain/r2Run';
import type {Suit} from '../src/cards/types';

const start=(seed='v00-contract')=>createRun({seed,characterId:'amo',runId:seed,rulesVersion:'r2'});
const command=(s:R2RunState,action:Action)=>({runId:s.runId,commandId:`test-${s.commandSeq+1}`,expectedSeq:s.commandSeq,action});
const send=(s:R2RunState,action:Action)=>{const r=applyCommand(s,command(s,action));if(!r.ok)throw Error(r.code);assertRunInvariants(r.state);return r.state;};
const own=(id:string)=>({instanceId:'owned/'+id,definitionId:id,paidPrice:r2Price(id),growth:{}});
// Explicit invariant-valid boundary checkpoints below are not natural UI/balance evidence.
const fixtureBoss=(s:R2RunState,id:string,suit:Suit|null=null)=>{
  Object.assign(s,{stageIndex:2,boss:{definitionId:id,disabledSuit:suit},seenBossIds:[id]});
  makeR2Shop(s,true);return s;
};
const table=(id='B01',suit:Suit|null=null,jokerIds:readonly string[]=[])=>{
  const s=fixtureBoss(start(),id,suit);s.jokers=jokerIds.map(own);
  return send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
};
const futureStage=(s:R2RunState)=>s.stage as NonNullable<R2RunState['stage']>&{discardsUsed:number};
const skip={type:'SkipStage'} as Action;
const offer=(s:R2RunState,id:string)=>{s.shop!.offers[0]={...s.shop!.offers[0],definitionId:id,price:r2Price(id),edition:'none',consumed:false};return s.shop!.offers[0];};
const fixtureLowDiscards=()=>{
  let s=table('B01',null,['d05']);
  s.consumables=[{instanceId:'quota/restore-first',definitionId:'T17'},{instanceId:'quota/restore-after-rejection',definitionId:'T17'}];
  // Reach quota1 through real spending and restoration, keeping the saved refund ledger valid.
  s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});
  s=send(s,{type:'UseConsumable',instanceId:'quota/restore-first',targetIds:[]});
  return send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});
};

describe('V00 economic transactions and public chapter plans',()=>{
  it('E05 grows only sources owned before successful purchases, persists, caps, and clears on sale',()=>{
    let s=start();s.gold=100;const e=offer(s,'e05');s=send(s,{type:'BuyOffer',offerId:e.offerId});expect(s.jokers[0].growth).toEqual({});
    for(let i=0;i<11;i++){const o=offer(s,i%2?'a03':'pengci');s=send(JSON.parse(JSON.stringify(s)),{type:'BuyOffer',offerId:o.offerId});expect(s.jokers[0].growth.heat).toEqual({n:String(Math.min(80,(i+1)*8)),d:'1'});s=send(s,{type:'SellJoker',instanceId:s.jokers[1].instanceId});}
    const before=JSON.stringify(s),o=offer(s,'a03');s.gold=0;const snap=JSON.stringify(s),failed=applyCommand(s,command(s,{type:'BuyOffer',offerId:o.offerId}));expect(failed.ok).toBe(false);expect(JSON.stringify(s)).toBe(snap);
    s.gold=20;s=send(s,{type:'SellJoker',instanceId:s.jokers[0].instanceId});const rebuy=offer(s,'e05');s=send(s,{type:'BuyOffer',offerId:rebuy.offerId});expect(s.jokers[0].growth).toEqual({});expect(before).toContain('80');
  });
  it('E01 rewards a real success exactly once, with prior-gold interest, never failure',()=>{
    let s=start();s.jokers=[own('e01')];s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});s.stage!.heat='399'; // Last-point boundary, unchanged production target400.
    const cmd=command(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]}),r=applyCommand(s,cmd);if(!r.ok)throw Error(r.code);
    expect(r.state.stage!.goldEarned).toBe(10);expect(r.state.gold).toBe(16);expect(r.state.phase).toBe('stage-cleared');expect(applyCommand(r.state,cmd).state).toBe(r.state);
    let lost=table('B01',null,['e01']);lost.stage!.handsLeft=1;lost.stage!.playIndex=3;lost.stage!.previousHandType='high-card';lost=send(lost,{type:'PlayHand',selectedIds:[lost.handOrder[0]]});expect(lost.phase).toBe('run-lost');expect(lost.gold).toBe(6);
  });
  it('D05 refunds only the first successful discard, but still disables F09; rejected intents do not count',()=>{
    let s=start();s.jokers=[own('d05'),own('f09')];s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});
    const bad=applyCommand(s,command(s,{type:'DiscardHand',selectedIds:['missing']}));expect(bad.ok).toBe(false);expect(futureStage(s).discardsUsed).toBe(0);
    s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});expect(s.stage!.discardsLeft).toBe(3);expect(futureStage(s).discardsUsed).toBe(1);
    const restored=JSON.parse(JSON.stringify(s));s=send(restored,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});expect(s.stage!.discardsLeft).toBe(2);expect(futureStage(s).discardsUsed).toBe(2);
    s=send(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]});expect(s.lastTrace!.events.some(e=>e.sourceDefinitionId==='f09')).toBe(false);
  });
  it('B01 charges2 before the first play, then1; refund is after payment and never bypasses insufficient quota',()=>{
    let s=table('B01',null,['d05']);s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});expect(s.stage!.discardsLeft).toBe(2);
    s=send(s,{type:'DiscardHand',selectedIds:[s.handOrder[0]]});expect(s.stage!.discardsLeft).toBe(0);
    let low=fixtureLowDiscards();const before=JSON.stringify(low),fail=applyCommand(low,command(low,{type:'DiscardHand',selectedIds:[low.handOrder[0]]}));expect(fail.ok).toBe(false);expect(JSON.stringify(low)).toBe(before);
    low=send(low,{type:'UseConsumable',instanceId:'quota/restore-after-rejection',targetIds:[]});
    low=send(low,{type:'PlayHand',selectedIds:[low.handOrder[0]]});low=send(low,{type:'DiscardHand',selectedIds:[low.handOrder[0]]});expect(low.stage!.discardsLeft).toBe(1); // After a play, pay1 from quota2; the first-discard refund was already spent.
  });
  it('B03 disables its fixed suit on new draws and still forms a pair; B04 never disables A',()=>{
    for(const [boss,suit] of [['B03','hearts'],['B04',null]] as const){let s=table(boss,suit);const expected=()=>s.handOrder.filter(id=>{const c=s.deckInstances.find(c=>c.id===id)!;return boss==='B03'?c.suit===suit:[11,12,13].includes(c.rank);});expect(s.stage!.disabledIds).toEqual(expected());
      s=send(JSON.parse(JSON.stringify(s)),{type:'DiscardHand',selectedIds:s.handOrder.slice(0,3)});expect(s.stage!.disabledIds).toEqual(expected());if(boss==='B04')expect(s.stage!.disabledIds.every(id=>s.deckInstances.find(c=>c.id===id)!.rank!==14)).toBe(true);
    }
    const hand=[{id:'s8',rank:8 as const,suit:'spades' as const},{id:'h8',rank:8 as const,suit:'hearts' as const}];
    const r=scoreR2Hand({rulesVersion:'r2',runId:'b03',rootId:'pair',characterId:'neutral',hand,selectedIds:['s8','h8'],disabledIds:['h8'],jokers:[own('b02')],definitions:R2_JOKERS,handLevels:{},playIndex:1,handsBeforePlay:4,previousHandType:null,wager:false,rng:start().rng.rule});expect(r.handType).toBe('pair');expect(r.finalScore).toBe('96');
  });
  it('ordinary public reorder changes B02 points while a fourth-position A still triggers iron',()=>{
    const arrange=(s:R2RunState,order:string[])=>{s.handOrder=order;s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!order.includes(id));s.playedPile=[];s.discardPile=[];return s;};
    let s=arrange(table('B02',null,['c04','tiesuanpan']),['spades-14','clubs-2','hearts-3','diamonds-4','spades-5','hearts-8','clubs-9','spades-10']);const ids=s.handOrder.slice(0,5),first=send(s,{type:'PlayHand',selectedIds:ids});expect(first.lastTrace!.finalScore).toBe('864');
    s=send(s,{type:'ReorderHand',ids:[s.handOrder[1],s.handOrder[2],s.handOrder[3],s.handOrder[0],...s.handOrder.slice(4)]});const second=send(s,{type:'PlayHand',selectedIds:ids});expect(second.lastTrace!.finalScore).toBe('836');expect(second.lastTrace!.events.some(e=>e.sourceDefinitionId==='tiesuanpan'&&e.targetCardId==='spades-14')).toBe(true);
  });
  it('can explicitly abandon a skipped scene, its following shop, or its stage-ready phase',()=>{
    const skipped=send(start(),skip),shop=send(skipped,{type:'OpenShop'}),ready=send(shop,{type:'LeaveShop'});
    for(const s of [skipped,shop,ready]){const ended=send(s,{type:'AbandonRun'});expect(ended.phase).toBe('run-lost');expect(ended.outcome!.reason).toBe('abandoned');expect(ended.gold).toBe(s.gold);expect(ended.stage).toEqual(s.stage);}
  });
  it('declares all eight normal chapters at unchanged targets; endless remains NOT_IMPLEMENTED',()=>{
    expect(Array.from({length:24},(_,i)=>getR2Stage(i)?.targetHeat)).toEqual([
      '400','600','800','1000','1500','2000','2400','3600','4800','5600','8400','11200',
      '13000','19500','26000','30000','45000','60000','70000','105000','140000','160000','240000','320000',
    ]);expect(getR2Stage(24)).toBeUndefined();
  });
  it('locks and publicly exposes chapter Boss/skip reward before purchases or rerolls, with no repeats',()=>{
    for(let i=0;i<30;i++){let s=start('chapter-'+i);const v=s as R2RunState&{boss:{definitionId:string;disabledSuit:Suit|null};chapterSkipConsumable:string};expect(['B01','B02','B03','B04']).toContain(v.boss?.definitionId);expect(['T01','T03','T04','T05','T06','T17']).toContain(v.chapterSkipConsumable);
      const fixed=JSON.stringify(v.boss),reward=v.chapterSkipConsumable;s=send(JSON.parse(JSON.stringify(s)),{type:'RerollShop'});expect(JSON.stringify(s.boss)).toBe(fixed);expect((s as typeof v).chapterSkipConsumable).toBe(reward);
      s=send(s,skip);s=send(s,{type:'OpenShop'});s=send(s,skip);s=send(s,{type:'OpenShop'});s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});s.stage!.heat='799';s=send(s,{type:'PlayHand',selectedIds:[s.handOrder[0]]});s=send(s,{type:'OpenShop'});expect(s.chapter).toBe(2);expect(JSON.stringify(s.boss)).not.toBe(fixed);expect((s as R2RunState&{seenBossIds:string[]}).seenBossIds).toHaveLength(2);
    }
  });
  it('skip never clears/rewards/grows, gives a saved single-use actual-price coupon, and Boss skip rejects atomically',()=>{
    let s=start();s.jokers=[own('e01'),own('e05')];const first=command(s,skip),r=applyCommand(s,first);if(!r.ok)throw Error(r.code);s=r.state;
    expect(s.gold).toBe(6);expect(s.stageIndex).toBe(1);expect(s.stage!.clearId).toBeNull();expect(s.stage!.goldEarned).toBe(0);expect(s.jokers[1].growth).toEqual({});expect(applyCommand(s,first).state).toBe(s);
    s=send(JSON.parse(JSON.stringify(s)),{type:'OpenShop'});const o=offer(s,'a03');s=send(s,{type:'BuyOffer',offerId:o.offerId});expect(s.gold).toBe(4);expect(s.jokers.at(-1)!.paidPrice).toBe(2);s=send(s,{type:'SellJoker',instanceId:s.jokers.at(-1)!.instanceId});expect(s.gold).toBe(5);
    const another=offer(s,'pengci');s=send(s,{type:'BuyOffer',offerId:another.offerId});expect(s.gold).toBe(1);expect(s.jokers.at(-1)!.paidPrice).toBe(4);
    const boss=fixtureBoss(start(),'B01'),before=JSON.stringify(boss);expect(applyCommand(boss,command(boss,skip)).ok).toBe(false);expect(JSON.stringify(boss)).toBe(before);
  });
  it('normal skip delivers its pre-generated usable item, preserves full inventory and converts only to1gold',()=>{
    for(const full of [false,true]){let s=start();s=send(s,skip);s=send(s,{type:'OpenShop'});if(full)s.consumables=[{instanceId:'one',definitionId:'T03'},{instanceId:'two',definitionId:'T04'}];const before=structuredClone(s.consumables),gold=s.gold,expected=(s as R2RunState&{chapterSkipConsumable:string}).chapterSkipConsumable;s=send(JSON.parse(JSON.stringify(s)),skip);expect(s.gold).toBe(gold+(full?1:0));if(full)expect(s.consumables).toEqual(before);else expect(s.consumables[0].definitionId).toBe(expected);expect(s.stage!.goldEarned).toBe(0);}
  });
  it('resource overflow rejects clear/sale atomically instead of throwing or publishing rounded gold',()=>{
    let shop=start();shop.gold=Number.MAX_SAFE_INTEGER;shop.jokers=[own('e01')];const active=send(send(shop,{type:'LeaveShop'}),{type:'EnterStage'});active.stage!.heat='399';
    for(const [s,action] of [[shop,{type:'SellJoker',instanceId:shop.jokers[0].instanceId}],[active,{type:'PlayHand',selectedIds:[active.handOrder[0]]}]] as [R2RunState,Action][]){const before=JSON.stringify(s),r=applyCommand(s,command(s,action));expect(r.ok).toBe(false);if(!r.ok)expect(r.code).toBe('resource-overflow');expect(JSON.stringify(s)).toBe(before);expect(r.state).toBe(s);}
  });
});
