import {it,expect} from 'vitest';
import {createRun,applyCommand,assertRunInvariants,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {r2Price,r2PurchasePrice} from '../src/domain/r2Shop';
import {findShopSynergy} from '../src/game/ShopSynergy';
function setup(held:string[],candidate:string,gold:number){let s=createRun({seed:'synergy-cash',runId:'synergy-cash',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group'});for(const type of ['LeaveShop','SkipStage','OpenShop'] as const){const r=applyCommand(s,{runId:s.runId,commandId:'setup/'+s.commandSeq,expectedSeq:s.commandSeq,action:{type}});if(!r.ok)throw Error(r.code);s=r.state;}s.gold=gold;s.purchaseCoupons=0;s.jokers=held.map((id,i)=>r2CreateJoker(id,'held/'+i,4,'none',s));const o={offerId:'candidate',definitionId:candidate,price:r2Price(candidate,'none',s),edition:'none' as const,consumed:false};s.shop!.offers=[o];assertRunInvariants(s);return {s,o};}
it.each([3,20,30])('opposed e08/f04 cash gates never gain a synergy badge at %i gold',gold=>{for(const [held,candidate] of [['e08','f04'],['f04','e08']]){const {s}=setup([held],candidate,gold),before=structuredClone(s);expect(findShopSynergy(s,candidate).hasSynergy).toBe(false);expect(findShopSynergy(s,candidate).heldInstanceIds).toEqual([]);expect(s).toEqual(before);}});
it('buying a growing heat card must not highlight retained e08 after its cash gate is lost',()=>{const {s,o}=setup(['e08'],'b10',23);expect(s.gold-r2PurchasePrice(s,o)).toBe(19);expect(findShopSynergy(s,'b10').hasSynergy).toBe(false);});
it('a candidate cash gate uses purchase cost, not the money still held before buying',()=>{const {s,o}=setup(['b10'],'e08',26);expect(s.gold-r2PurchasePrice(s,o)).toBe(18);expect(findShopSynergy(s,'e08').hasSynergy).toBe(false);});
it('names and generic multiplier wording cannot establish an unsupported combination',()=>{const {s}=setup(['b10'],'c07',30),defs=r2JokerDefinitionsFor(s),before=JSON.stringify(defs);expect(findShopSynergy(s,'c07').hasSynergy).toBe(false);expect(JSON.stringify(defs)).toBe(before);});

it.each([3,4])('f04 checks its exact post-payment %i-gold boundary',after=>{const {s,o}=setup(['b10'],'f04',30);s.gold=r2PurchasePrice(s,o)+after;const result=findShopSynergy(s,'f04');expect(result.hasSynergy).toBe(after===3);expect(result.reason).toContain('→'+after+'金');});
it('full slots require a specified replacement instead of assuming free space',()=>{const {s}=setup(['b10','b03','c06','e08','e06'],'a03',30);const result=findShopSynergy(s,'a03');expect(result.hasSynergy).toBe(false);expect(result.reason).toContain('先选要换掉的牌');});
