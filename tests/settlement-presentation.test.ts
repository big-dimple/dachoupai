import {it,expect} from 'vitest';
import {settlementFacts,settlementPlan} from '../src/game/SettlementPresentation';
import {settlementReady,repeatedSettlementReady} from '../harness/fixtures/settlement';
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
it.each([{x:193,y:102,width:980,height:422},{x:12,y:116,width:366,height:452},{x:12,y:116,width:296,height:348},{x:12,y:76,width:446,height:194}])('contained hero and full-width number regions remain separate at %j',b=>{
 const p=settlementPlan(b,b.height<200);
 for(const box of [p.hero,p.score,p.source]){expect(box.x).toBeGreaterThanOrEqual(b.x);expect(box.y).toBeGreaterThanOrEqual(b.y);expect(box.x+box.width).toBeLessThanOrEqual(b.x+b.width);expect(box.y+box.height).toBeLessThanOrEqual(b.y+b.height);expect(box.height).toBeGreaterThan(0);}
 expect(p.desktop||p.short?p.hero.x+p.hero.width<p.score.x:p.score.y+p.score.height<p.hero.y).toBe(true);
});
