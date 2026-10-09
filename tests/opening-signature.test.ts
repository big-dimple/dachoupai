import {it,expect} from 'vitest';
import {heroSignature} from '../src/game/HeroSignature';
import {CHARACTERS} from '../src/game/characters';
import {erxiangHandoffStep} from '../src/domain/r2ErxiangHandoff';
import {azaoChargeStep,emptyAzaoCharge} from '../src/domain/r2AzaoCharge';
import {xiemuBurnStep} from '../src/domain/r2XiemuBurn';
import {R2_ASSIST_CONTRACT} from '../src/domain/r2AssistIdentity';
import {openingShopStep} from '../src/game/OpeningShopStep';
import {openingShowcaseLayout} from '../src/game/OpeningShowcaseLayout';
import {selectionLayout} from '../src/game/SelectionLayout';
import {createRun,applyCommand,type R2RunState} from '../src/domain/run';
import {newRunIdentity} from '../src/game/RunLaunch';
import {openingRouteDemo} from '../src/game/OpeningRouteDemo';
import {starterOffer} from '../src/game/RouteStarter';
const run=()=>createRun({seed:'group-natural-17',runId:'signature',characterId:'erxiang',rulesVersion:'r2',r2Identity:newRunIdentity('erxiang','group'),openingRoute:'group'});
function send(s:R2RunState,action:Parameters<typeof applyCommand>[1]['action']){const r=applyCommand(s,{runId:s.runId,commandId:'test/'+s.commandSeq,expectedSeq:s.commandSeq,action});expect(r.ok).toBe(true);if(!r.ok)throw Error(r.code);return r.state;}
it('six examples refer to current new-game abilities and contain no invented strength ranking',()=>{for(const c of CHARACTERS){const s=heroSignature(c.id);expect(s.ability.id).toBe(c.id);expect(s.beats).toHaveLength(3);expect(s.ability.openingPlay.length).toBeGreaterThan(10);expect(JSON.stringify(s)).not.toMatch(/胜率|最强|五星|50%/);}expect(heroSignature('amo').beats[2].result).toContain('×'+R2_ASSIST_CONTRACT.pair);});
it('demonstration numeric results agree with actual rule steps, including real costs',()=>{
 const cards=[{id:'a',rank:8 as const,suit:'spades' as const},{id:'b',rank:8 as const,suit:'hearts' as const}];const h=erxiangHandoffStep('pair',cards,['a','b'],[],{targetId:'a',beforeUsed:false},true);expect(heroSignature('erxiang').beats[2].result).toContain(String(h.points));
 const first=azaoChargeStep('two-pair',{before:emptyAzaoCharge(),release:false},true),second=azaoChargeStep('three-kind',{before:first.after,release:false},true),third=azaoChargeStep('two-pair',{before:second.after,release:true},true);expect(heroSignature('azao').beats[2].result).toContain('×'+third.multiplier);
 const burn=xiemuBurnStep('two-pair',{cost:10,goldBefore:10,beforeUsed:false},true);expect(burn.goldAfter).toBe(0);expect(heroSignature('xiemu').beats[2].result).toContain('×'+burn.multiplier);expect(()=>xiemuBurnStep('two-pair',{cost:10,goldBefore:6,beforeUsed:false},true)).toThrow('insufficient-gold');
});
it('route examples use actual new-run starters and explicitly retain delayed flush growth',()=>{for(const c of CHARACTERS)for(const focus of ['group','straight','flush'] as const){const d=openingRouteDemo(focus,c.id);expect(d.starter.length).toBeGreaterThan(0);expect(d.shape.length).toBe(focus==='group'?4:5);}expect(openingRouteDemo('flush','laohuan').payoff).toContain('下手');});
it('first-shop step follows actual shelf then owned stock without writing state or offering consumed stock',()=>{let s=run();const before=JSON.stringify(s),starter=s.shop!.offers.find(o=>starterOffer(s,o))!;expect(openingShopStep(s)?.offerId).toBe(starter.offerId);expect(JSON.stringify(s)).toBe(before);s=send(s,{type:'BuyOffer',offerId:starter.offerId});const next=openingShopStep(s);expect(next?.kind).toBe('tools');expect(next?.offerId).toBe(s.shop!.toolOffers.find(o=>o.definitionId==='T10')!.offerId);s=send(s,{type:'BuyOffer',offerId:next!.offerId!});expect(openingShopStep(s)?.kind).toBe('inventory');const copy=structuredClone(s);copy.consumables=[];expect(openingShopStep(copy)?.kind).toBe('hand');copy.stageIndex=1;expect(openingShopStep(copy)).toBeUndefined();});
it('showcase bands and portrait reserve disjoint real space across required dimensions',()=>{for(const [w,h] of [[1366,768],[1280,720],[390,740],[320,740],[390,660],[740,390]])for(const step of ['hero','route'] as const){const p=selectionLayout(w,h,12,0,step),q=openingShowcaseLayout(p.hero,p.portrait,p.short);for(const b of [q.art,q.copy,q.demo]){expect(b.width).toBeGreaterThan(40);expect(b.y+b.height).toBeLessThanOrEqual(p.hero.y+p.hero.height);expect(b.x+b.width).toBeLessThanOrEqual(p.hero.x+p.hero.width);}expect(q.copy.y+q.copy.height).toBeLessThanOrEqual(q.demo.y+1);}});
