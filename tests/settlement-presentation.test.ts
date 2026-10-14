import {it,expect} from 'vitest';
import {settlementFacts,settlementPlan} from '../src/game/SettlementPresentation';
import {settlementReady,repeatedSettlementReady,retriggerSettlementReady,growthSettlementReady,dualRouteSettlementReady,supportSettlementReady} from '../harness/fixtures/settlement';
import {energySend} from '../harness/fixtures/hero-climax';
import {heatText} from '../src/game/scoreText';
import {makeCheckpoint,readCheckpoint} from '../src/application/checkpoint';

const settle=(kind:Parameters<typeof settlementReady>[0])=>{const f=settlementReady(kind);return energySend(f.state,f.action);};
it('same-source heat additions stay additions, including the already saved growth at cap',()=>{
 const run=settle('ordinary'),before=JSON.stringify(run),f=settlementFacts(run,true);
 expect(f.card?.id).toBe('c04');expect(f.cardCopy).toBe('热度 +50\n读取 +100 热度');
 expect(f.tier).toBe(0);expect(f.hero).toBeUndefined();expect(f.chain).toEqual([]);expect(JSON.stringify(run)).toBe(before);
});
it('ten actual same-source face triggers fit a short receipt while the full event list remains exact',()=>{
 const f=repeatedSettlementReady(),run=energySend(f.state,f.action);expect(readCheckpoint(makeCheckpoint(run,[])).ok).toBe(true);
 const events=run.lastTrace!.events.filter(e=>e.sourceDefinitionId==='tiesuanpan'&&e.operation==='add-heat');
 expect(run.lastTrace!.events.filter(e=>e.sourceType==='card'&&e.operation==='retrigger-card'&&e.value.n==='1')).toHaveLength(5);
 expect(events).toHaveLength(10);expect(settlementFacts(run,true).cardCopy).toBe('热+25·10次');expect(settlementFacts(run,true).tier).toBe(1);
 expect(run.lastTrace!.events.filter(e=>e.sourceDefinitionId==='tiesuanpan')).toEqual(events);
});
it('the only b06 source is retained from two real retriggers with unchanged immediate accumulators',()=>{
 const f=retriggerSettlementReady(),run=energySend(f.state,f.action),facts=settlementFacts(run,true);expect(readCheckpoint(makeCheckpoint(run,[])).ok).toBe(true);
 expect(run.phase).toBe('stage-cleared');expect(run.lastTrace!.sourceJokers.map(j=>j.definitionId)).toEqual(['b06']);
 const events=run.lastTrace!.events.filter(e=>e.sourceDefinitionId==='b06'&&e.operation==='retrigger-card');expect(events).toHaveLength(2);for(const e of events)expect(e.after).toEqual(e.before);
 expect(facts.card?.id).toBe('b06');expect(facts.cardCopy).toBe('再计分2次');expect(facts.tier).toBe(1);
});
it('both actual route families remain in the short receipt and exact factors',()=>{
 const f=dualRouteSettlementReady(),run=energySend(f.state,f.action),facts=settlementFacts(run,true);expect(readCheckpoint(makeCheckpoint(run,[])).ok).toBe(true);
 expect(facts.routeSummary).toBe('本局顺子21场 · 同花21场');expect(facts.routeCopy).toContain('S21');expect(facts.routeCopy).toContain('F21');
});
it('uncapped c04 keeps actual hand reading distinct from the source instance saved after the hand',()=>{
 const f=growthSettlementReady(),run=energySend(f.state,f.action),facts=settlementFacts(run,true);
 expect(facts.cardCopy).toBe('热度 +50\n读取 +50 热度');expect(facts.growth).toMatchObject({before:'50',after:'60',instanceId:facts.card!.event.sourceInstanceId});
});
it('hero, joker factors, final cumulative M and prior run seniority remain distinct',()=>{
 const run=settle('billion'),f=settlementFacts(run,true);
 expect(f.heroCopy).toBe('燃30金 · ×4');expect(f.card?.id).toBe('f10');expect(f.cardCopy).toBe('×3');
 expect(f.chain).toEqual(['冷场救火 ×3','包场 ×1.8','独家戏 ×1.5']);
 expect(f.routeCopy).toBe('本局资历 S21 · ×≈426.88');
 expect(f.trace?.finalScore).toBe('733884590');expect(f.cardCopy).not.toContain('1312852');
 expect(f.routeCopy).not.toContain('S22'); // This clear does not backfeed its new seniority into the hand.
});
it.each([['ordinary',0],['chain',1],['million',2],['billion',3],['long',3]] as const)('real scorer output selects the %s strength without a forecast or fabricated multiplier', (kind,tier)=>{
 const run=settle(kind);expect(settlementFacts(run,true).tier).toBe(tier);
});
it('large exact results retain the existing scientific receipt format',()=>{
 const run=settle('long');expect(BigInt(run.lastTrace!.finalScore)).toBeGreaterThan(10n**15n);expect(heatText(run.lastTrace!.finalScore)).toMatch(/^\d\.\d\de\d+$/);
});
it('failed, skipped, mismatched and nonterminal traces cannot earn a high-score or source cue',()=>{
 const won=settle('billion'),lost=settle('boss-loss');
 for(const f of [settlementFacts(lost,false),settlementFacts(won,true,true),settlementFacts({...won,phase:'await-input'},true),settlementFacts({...won,stage:{...won.stage!,previousHandScore:'1'}},true)]){
  expect(f.trace).toBeNull();expect(f.tier).toBe(0);expect(f.card).toBeUndefined();expect(f.hero).toBeUndefined();expect(f.routeCopy).toBeUndefined();expect(f.chain).toEqual([]);
 }
});
it('a zero-change character event is not highlighted just because its avatar exists',()=>{
 const run=structuredClone(settle('chain'));run.lastTrace!.events=run.lastTrace!.events.map(e=>e.sourceType==='character'?{...e,after:e.before,value:{n:'0',d:'1'}}:e);
 expect(settlementFacts(run,true).hero).toBeUndefined();expect(settlementFacts(run,true).heroCopy).toBe('本局角色');
});
it('current bounded save shows its real cap rather than legacy uncapped seniority',()=>{
 const fixture=settlementReady('billion','current'),run=energySend(fixture.state,fixture.action),facts=settlementFacts(run,true);
 expect(readCheckpoint(makeCheckpoint(run,[])).ok).toBe(true);
 expect(facts.routeSummary).toBe('过关加成 · ×4');expect(facts.tier).toBe(1);
 expect(BigInt(run.lastTrace!.finalScore)).toBeLessThan(10000000n);
});
it('an actual e11 1.3 reading belongs to the source while Amo has no triggered ability',()=>{
 const fixture=supportSettlementReady(),run=energySend(fixture.state,fixture.action),before=structuredClone(run),facts=settlementFacts(run,true);
 expect(readCheckpoint(makeCheckpoint(run,[])).ok).toBe(true);expect(facts.card?.id).toBe('e11');expect(facts.card?.name).toBe('长期捧场');expect(facts.cardCopy).toBe('×1.3');expect(facts.hero).toBeUndefined();expect(facts.heroCopy).toBe('本局角色');expect(run).toEqual(before);
});
it.each([{x:193,y:102,width:980,height:422},{x:12,y:116,width:366,height:452},{x:12,y:116,width:296,height:348},{x:12,y:76,width:446,height:194}])('contained hero and full-width number regions remain separate at %j',b=>{
 const p=settlementPlan(b,b.height<200);
 for(const box of [p.hero,p.score,p.source]){expect(box.x).toBeGreaterThanOrEqual(b.x);expect(box.y).toBeGreaterThanOrEqual(b.y);expect(box.x+box.width).toBeLessThanOrEqual(b.x+b.width);expect(box.y+box.height).toBeLessThanOrEqual(b.y+b.height);expect(box.height).toBeGreaterThan(0);}
 expect(p.desktop||p.short?p.hero.x+p.hero.width<p.score.x:p.score.y+p.score.height<p.hero.y).toBe(true);
});
