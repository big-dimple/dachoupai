import {expect,it} from 'vitest';
import {buildFallback,publicRepairExample} from '../src/game/BuildFallback';
import {buildJourneyFacts} from '../src/game/BuildJourney';
import {missingCoreFixture,missingSend} from '../harness/fixtures/missing-core-choice';
import {r2CreateJoker} from '../src/domain/r2Run';
import {R2_TOOLS} from '../src/content/r2Tools';
import {r2PurchasePrice} from '../src/domain/r2Shop';
it('no current core candidate can still compare a legal basic tool and commit the disclosed local trio',()=>{
 const s=missingCoreFixture('group'),before=JSON.stringify(s);expect(buildJourneyFacts(s,'group').decision.choices).toEqual([]);const c=buildFallback(s,'group')!.choice!;expect(c.source).toBe('basic');expect(c.definitionId).toBe('T08');expect(c.example!.targetId).toBe('clubs-7');expect(c.body).toContain('8 2→3张');expect(c.body).toContain('常规利息档1→0');expect(JSON.stringify(s)).toBe(before);
 const bought=missingSend(s,{type:'BuyBasicTool',definitionId:'T08',shopSeq:s.shop!.basicChoice!.shopSeq});expect(bought.gold).toBe(3);const tool=bought.consumables.find(c=>c.definitionId==='T08')!,used=missingSend(bought,{type:'UseConsumable',instanceId:tool.instanceId,targetIds:[c.example!.targetId]});expect(used.deckInstances.filter(c=>!used.destroyedIds.includes(c.id)&&c.rank===8)).toHaveLength(3);expect(used.deckInstances.find(card=>card.id===c.example!.targetId)!.suit).toBe(s.deckInstances.find(x=>x.id===c.example!.targetId)!.suit);expect(used.rng).toEqual(s.rng);expect(used.deckInstances.filter(x=>x.id!==c.example!.targetId)).toEqual(s.deckInstances.filter(x=>x.id!==c.example!.targetId));
});
it('straight repairs exactly one known window using a duplicate donor without reading a future draw',()=>{
 const s=missingCoreFixture('straight'),c=buildFallback(s,'straight')!.choice!;expect(c.definitionId).toBe('T08');expect(c.example!.targetId).toBe('clubs-6');expect(c.body).toContain('3、4、5、6、7中只缺7');const altered=structuredClone(s);altered.drawPile.reverse();altered.rng.rule.state=(altered.rng.rule.state+999)>>>0;expect(buildFallback(altered,'straight')).toEqual(buildFallback(s,'straight'));
});
it('a held dye repairs the fifth known suit card at no new cash even with a full inventory',()=>{
 const s=missingCoreFixture('flush'),c=buildFallback(s,'flush')!.choice!;expect(c.source).toBe('held');expect(c.id).toBe('controlled/missing-core/T03');expect(c.body).toContain('♥ 4→5张');expect(c.body).toContain('不新增金币支出');const used=missingSend(s,{type:'UseConsumable',instanceId:c.id,targetIds:[c.example!.targetId]});expect(used.gold).toBe(s.gold);expect(used.deckInstances.filter(c=>c.suit==='hearts')).toHaveLength(5);expect(used.consumables).toHaveLength(s.consumables.length-1);
});
it('a normal complete deck has no invented single-card repair and cash-short states honestly hold',()=>{
 const s=missingCoreFixture('generic'),f=buildFallback(s,'group')!;expect(f.choice?.source).toBe('basic');expect(f.choice?.example).toBeUndefined();expect(f.reason).toContain('不默认建议买');expect(publicRepairExample(s,'straight','T08')).toBeUndefined();expect(buildFallback(s,'flush')!.reason).toContain('不含染色');
 const low=missingCoreFixture('hold');for(const focus of ['group','straight','flush'] as const){const before=JSON.stringify(low),f=buildFallback(low,focus)!;expect(f.choice).toBeUndefined();expect(f.reason).toContain('留1金');expect(JSON.stringify(low)).toBe(before);}
});
it('does not trade away another pair/trio or remove the only donor of a straight point',()=>{
 const s=missingCoreFixture('group');s.deckInstances.find(c=>c.id==='clubs-9')!.rank=7;expect(publicRepairExample(s,'group','T08')?.targetId).not.toBe('clubs-7');
 const t=missingCoreFixture('straight');for(const c of t.deckInstances.filter(c=>c.rank===6&&c.id!=='clubs-6'))c.rank=10;expect(publicRepairExample(t,'straight','T08')).toBeUndefined();
});
it('a real random duplicate uses that actual offer price, and a sold duplicate is not resold through the basic slot',()=>{
 const s=missingCoreFixture('group'),o=s.shop!.toolOffers[0];o.definitionId='T08';o.price=R2_TOOLS.find(t=>t.id==='T08')!.price;const c=buildFallback(s,'group')!.choice!;expect(c.source).toBe('offer');expect(c.id).toBe(o.offerId);expect(c.body).toContain('实付'+r2PurchasePrice(s,o));o.consumed=true;expect(buildFallback(s,'group')!.choice?.definitionId).not.toBe('T08');
});
it('slot capacity and held cash thresholds block a purchase suggestion while keeping an owned tool usable',()=>{
 const full=missingCoreFixture('group');full.consumables.push({instanceId:'full',definitionId:'T01'});expect(buildFallback(full,'group')!.choice).toBeUndefined();expect(buildFallback(full,'group')!.reason).toContain('已满');
 const held=missingCoreFixture('group');held.consumables.push({instanceId:'owned/T08',definitionId:'T08'});expect(buildFallback(held,'group')!.choice!.source).toBe('held');
 const risk=missingCoreFixture('group');risk.gold=21;risk.jokers.push(r2CreateJoker('e08','controlled/e08',0,undefined,risk));expect(buildFallback(risk,'group')!.choice).toBeUndefined();expect(buildFallback(risk,'group')!.reason).toContain('包场');
});
it('phase, absent shop, rank caps and invalid current targets do not fabricate an executable repair',()=>{
 const s=missingCoreFixture('group');s.phase='stage-ready';expect(buildFallback(s,'group')).toBeUndefined();s.phase='shop';s.shop=null;expect(buildFallback(s,'group')).toBeUndefined();
 const t=missingCoreFixture('generic');expect(publicRepairExample(t,'flush','T08')).toBeUndefined();expect(publicRepairExample(t,'group','unknown')).toBeUndefined();expect(publicRepairExample(t,'group','T10')).toBeUndefined();
});
it('actual discounted basic cost and consumed quota remain authoritative in the fallback',()=>{
 const s=missingCoreFixture('group');s.purchaseCoupons=1;const c=buildFallback(s,'group')!.choice!;expect(c.body).toContain('实付1金；余额5→4金');expect(c.label).toContain('1金');const bought=missingSend(s,{type:'BuyBasicTool',definitionId:'T08',shopSeq:s.shop!.basicChoice!.shopSeq});const used=missingSend(bought,{type:'UseConsumable',instanceId:bought.consumables.find(t=>t.definitionId==='T08')!.instanceId,targetIds:[c.example!.targetId]});expect(buildFallback(used,'group')!.choice).toBeUndefined();expect(buildFallback(used,'group')!.reason).toContain('已购');
});
