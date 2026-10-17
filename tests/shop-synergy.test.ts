import {it,expect} from 'vitest';
import {findShopSynergy} from '../src/game/ShopSynergy';
import {createRun,applyCommand} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {shopCandidateTradeoff} from '../src/game/ShopSynergy';
function fixture(){let s=createRun({rulesVersion:'r2',r2Profile:'group-upgrade-v1',seed:'synergy',runId:'synergy',characterId:'erxiang'});for(const type of ['LeaveShop','SkipStage','OpenShop'] as const){const r=applyCommand(s,{runId:s.runId,commandId:'synergy/'+s.commandSeq,expectedSeq:s.commandSeq,action:{type}});if(!r.ok)throw Error(r.code);s=r.state;}s.gold=30;s.purchaseCoupons=0;s.shop!.offers=[{offerId:'stock',definitionId:'b03',price:4,edition:'none',consumed:false}];return s;}
it('does not infer a hero bonus from display names or playstyle keywords',()=>{const s=fixture();for(const characterId of ['erxiang','amo'] as const){s.characterId=characterId;expect(findShopSynergy(s,'b03')).toMatchObject({hasSynergy:false,heroSynergy:false,heldInstanceIds:[]});}});
it('reports a real hand-type condition intersection without promising extra strength',()=>{const s=fixture();s.jokers=[r2CreateJoker('b10','held',4,'none',s)];const before=structuredClone(s),result=findShopSynergy(s,'b03');expect(result.hasSynergy).toBe(true);expect(result.heldInstanceIds).toEqual(['held']);expect(result.tag).toBe('条件交集');expect(result.reason).toContain('炉火纯青');expect(result.reason).toContain('对子');expect(result.reason).toContain('不代表额外加成');expect(result.reason).not.toMatch(/强力|协同强化/);expect(s).toEqual(before);});
it('unknown or absent offers never produce a highlight',()=>{const s=fixture();expect(findShopSynergy(s,'nonexistent-card').hasSynergy).toBe(false);expect(findShopSynergy(s,'b10').hasSynergy).toBe(false);});

it('returns per-instance readable reasons, and recomputes cash eligibility after actual purchases',()=>{
 const s=fixture();s.gold=26;s.jokers=[r2CreateJoker('b10','held/base',4,'none',s)];
 s.shop!.offers=[{offerId:'cash',definitionId:'e08',price:8,edition:'none',consumed:false},{offerId:'stock',definitionId:'b03',price:6,edition:'none',consumed:false}];
 expect(findShopSynergy(s,'e08')).toMatchObject({hasSynergy:false,matches:[],cashNote:'购后18金'});
 s.gold=28;const match=findShopSynergy(s,'e08');expect(match.matches).toEqual([expect.objectContaining({instanceId:'held/base',name:expect.any(String),shortReason:expect.stringContaining('对子')})]);
 const bought=applyCommand(s,{runId:s.runId,commandId:'spend',expectedSeq:s.commandSeq,action:{type:'BuyOffer',offerId:'stock'}});expect(bought.ok,bought.ok?'':bought.code).toBe(true);
 if(bought.ok){expect(findShopSynergy(bought.state,'e08').heldInstanceIds).toEqual([]);expect(findShopSynergy(bought.state,'b03').heldInstanceIds).toEqual([]);}
});
it('Qin Qiong no-discard card explains the skill tradeoff instead of receiving a hero synergy',()=>{
 const s=createRun({rulesVersion:'r2',r2Identity:newRunIdentity('touye','group'),seed:'qin-no-discard',runId:'qin-no-discard',characterId:'touye',openingRoute:'group'});
 s.gold=28;s.jokers=[r2CreateJoker('b10','held',4,'none',s)];s.shop!.offers=[{offerId:'stock',definitionId:'f09',price:6,edition:'none',consumed:false}];const before=structuredClone(s);
 expect(findShopSynergy(s,'f09')).toMatchObject({hasSynergy:false,heroSynergy:false,matches:[],tradeoff:'走不弃牌打法可用；发动秦琼弃牌技能会停用本场加成。'});
 expect(shopCandidateTradeoff(s,'b03')).toBeUndefined();expect(s).toEqual(before);
 const legacy=fixture();legacy.characterId='touye';expect(shopCandidateTradeoff(legacy,'f09')).toBeUndefined();
});
