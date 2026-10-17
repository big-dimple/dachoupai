import {it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class{}}}));
import {createRun,applyCommand,assertRunInvariants,type R2RunState,type Action} from '../src/domain/run';
import {r2CreateJoker} from '../src/domain/r2Run';
import {r2JokerDefinitionsFor} from '../src/domain/r2ContentProfiles';
import {newRunIdentity} from '../src/game/RunLaunch';
import {shopPurchaseReceipt} from '../src/game/ShopPurchaseReceipt';
import {shopComparisonPresentation} from '../src/game/ShopJokerPresentation';
import {buildGrowthProgress} from '../src/game/BuildGrowthProgress';
import {formatScoreReview} from '../src/game/ScoreReview';
import {savedBenefit} from '../src/game/JokerExperience';
import {groupGrowthCausality} from '../src/game/JokerGrowthCausality';
import {cardDisplayName} from '../src/game/tangsongCardNames';
function send(s:R2RunState,action:Action){const r=applyCommand(s,{runId:s.runId,commandId:'names/'+s.commandSeq,expectedSeq:s.commandSeq,action});if(!r.ok)throw Error(r.code);assertRunInvariants(r.state);return r.state;}
function setup(current:boolean){let s=createRun({seed:'ui-card-names',runId:'ui-card-names/'+current,characterId:'erxiang',rulesVersion:'r2',...(current?{r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group' as const}:{r2Profile:'group-upgrade-v1' as const})});for(const type of ['LeaveShop','SkipStage','OpenShop'] as const)s=send(s,{type});s.gold=30;s.purchaseCoupons=0;s.jokers=[r2CreateJoker('b03','kept',4,'none',s)];s.jokers[0].growth.multiplier={n:'1',d:'1'};s.shop!.offers=[{offerId:'buy/b10',definitionId:'b10',price:4,edition:'none',consumed:false}];assertRunInvariants(s);return s;}
it.each([false,true])('receipt/comparison/growth names use IDs without renaming profile definitions (current=%s)',current=>{
 const before=setup(current),defs=r2JokerDefinitionsFor(before),raw=JSON.stringify(defs),snapshot=structuredClone(before),offer=before.shop!.offers[0],comparison=shopComparisonPresentation(before,offer);expect(comparison.candidate.name).toBe(cardDisplayName('b10'));expect(comparison.rows[0].name).toBe(cardDisplayName('b03'));
 const after=send(before,{type:'BuyOffer',offerId:offer.offerId}),saved=structuredClone(after),receipt=shopPurchaseReceipt(before,after,'jokers',offer)!;expect(receipt.name).toBe(cardDisplayName('b10'));expect(receipt.body).toContain('已购 '+cardDisplayName('b10'));expect(buildGrowthProgress(after).map(r=>r.name)).toContain(cardDisplayName('b03'));expect(groupGrowthCausality(after,after.jokers[0])?.title.startsWith(cardDisplayName('b03'))).toBe(true);
 expect(before).toEqual(snapshot);expect(after).toEqual(saved);expect(r2JokerDefinitionsFor(after)).toBe(defs);expect(JSON.stringify(defs)).toBe(raw);expect(defs.find(d=>d.id==='b10')!.name).not.toBe(cardDisplayName('b10'));
});
it('actual saved events and replay use the same name while keeping raw trace, numbers and identity',()=>{
 let s=setup(true);s=send(s,{type:'BuyOffer',offerId:'buy/b10'});s=send(send(s,{type:'LeaveShop'}),{type:'EnterStage'});const ids=['spades-7','hearts-7','clubs-8','diamonds-8','spades-13','hearts-13','clubs-2','diamonds-4'];s.handOrder=ids;s.drawPile=s.deckInstances.map(c=>c.id).filter(id=>!ids.includes(id)&&!s.playedPile.includes(id)&&!s.discardPile.includes(id));assertRunInvariants(s);s=send(s,{type:'PlayHand',selectedIds:ids.slice(0,2)});const trace=s.lastTrace!,snapshot=structuredClone({s,trace}),event=trace.events.find(e=>e.sourceDefinitionId==='b03'&&e.operation==='read-growth')!;expect(event).toBeDefined();expect(savedBenefit(s,trace,event)?.title).toBe(cardDisplayName('b03'));const review=formatScoreReview(s,trace);expect(review.cards.some(c=>c.title.startsWith(cardDisplayName('b03')))).toBe(true);expect({s,trace}).toEqual(snapshot);
});
