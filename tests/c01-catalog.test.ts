import {describe, expect, it} from 'vitest';
import {
  R2_TOOL_CATALOG, R2_TOOLS, R2_ENHANCEMENTS, R2_EDITIONS, R2_LONG_TERM_ITEMS,
  R2_INITIAL_SUPPORTED_TOOL_IDS, getR2Tool, supportsR2Tool, validateR2Tools,
} from '../src/content/r2Tools';

const ids = (prefix:string, count:number) => Array.from({length:count}, (_,i) => `${prefix}${String(i+1).padStart(2,'0')}`);
const altered = (mutate:(catalog:any)=>void):unknown => {
  const copy=structuredClone(R2_TOOL_CATALOG);mutate(copy);return copy;
};

describe('C01.1 D24 tool catalog, independently fixed scope and boundaries',()=>{
  it('contains the original eighteen, one lucky tool, twelve fixed planets and eight real spectral trades',()=>{
    expect(R2_TOOLS.map(t=>t.id).sort()).toEqual([...ids('T',19),...ids('P',12),...ids('S',8)].sort());
    expect(R2_TOOLS.filter(t=>t.family==='tarot').map(t=>t.id)).toEqual([...ids('T',15).slice(1),'T19']);
    expect(R2_TOOLS.filter(t=>t.family==='planet')).toHaveLength(12);
    expect(R2_TOOLS.filter(t=>t.family==='spectral')).toHaveLength(8);
    expect(R2_ENHANCEMENTS.map(e=>e.id)).toEqual(['heat-paper','multiplier-paper','glass-paper','voice-paper','gold-paper','encore-paper','lucky-paper']);
    expect(R2_EDITIONS.map(e=>e.id)).toEqual(['none','foil','holographic','polychrome']);
    expect(R2_LONG_TERM_ITEMS.map(i=>i.id)).toEqual(ids('U',12));
    expect(validateR2Tools(R2_TOOL_CATALOG)).toEqual([]);
  });

  it('keeps the original target counts, prices and the rank endpoints rather than inventing new mechanics',()=>{
    expect(ids('T',19).map(id=>getR2Tool(id).price)).toEqual([4,4,4,4,4,4,6,4,4,4,4,5,4,4,6,4,4,4,4]);
    expect(getR2Tool('T02').target).toMatchObject({kind:'cards',minimum:1,maximum:2});
    expect(getR2Tool('T07').operation).toEqual({kind:'copy-card',copies:1,fields:['rank','suit','enhancement','edition'],retainOriginal:true});
    expect(getR2Tool('T08').operation).toEqual({kind:'shift-rank',delta:1,minimum:2,maximum:14,wrap:false});
    expect(getR2Tool('T09').operation).toEqual({kind:'shift-rank',delta:-1,minimum:2,maximum:14,wrap:false});
    expect(getR2Tool('T12').target).toMatchObject({minimum:1,maximum:1});
    expect(getR2Tool('T15').target).toMatchObject({minimum:1,maximum:1});
    expect(getR2Tool('T19').operation).toEqual({kind:'set-enhancement',enhancement:'lucky-paper'});
  });

  it('binds twelve planets to twelve distinct hand identities, only after actual discovery',()=>{
    const hands=['high-card','pair','two-pair','three-kind','straight','flush','full-house','four-kind','straight-flush','five-kind','flush-house','flush-five'];
    expect(ids('P',12).map(id=>getR2Tool(id).operation)).toEqual(hands.map(handType=>({kind:'upgrade-hand',levels:1,handType})));
    for(const id of ids('P',12)){
      const planet=getR2Tool(id);expect(planet.target).toEqual({kind:'discovered-hand',selection:'fixed'});
      expect([planet.price,planet.shopWeight]).toEqual([4,1]);
      expect(planet.caps).toContain('handLevelMaximum');expect(planet.reject).toContain('undiscovered-hand');
    }
    expect(getR2Tool('T01').target).toEqual({kind:'discovered-hand',selection:'chosen'});
  });

  it('publishes family and conditional entry weights instead of making all thirty-nine items equally common',()=>{
    expect(R2_TOOL_CATALOG.acquisition.familyWeights).toEqual({tarot:45,planet:30,spectral:10,utility:15});
    const tarot=R2_TOOLS.filter(t=>t.family==='tarot');expect(tarot.reduce((n,t)=>n+t.shopWeight,0)).toBe(42);
    expect(tarot.map(t=>t.shopWeight)).toEqual([2,4,4,4,4,1,2,2,4,4,2,3,3,1,2]);
    expect(R2_TOOLS.filter(t=>t.family==='spectral').map(t=>[t.price,t.shopWeight])).toEqual([[8,3],[8,3],[6,2],[6,2],[6,2],[6,1],[8,1],[6,1]]);
    expect(R2_TOOL_CATALOG.acquisition.emptyFamily).toBe('remove-and-renormalize');
  });

  it('preserves six live tools and their reward pools; planned catalog rows cannot enter the live pool',()=>{
    const original=['T01','T03','T04','T05','T06','T17'];
    expect(R2_INITIAL_SUPPORTED_TOOL_IDS).toEqual(original);
    expect(R2_TOOLS.filter(t=>supportsR2Tool(t)).map(t=>t.id)).toEqual(original);
    expect(R2_TOOL_CATALOG.acquisition.skipRewardIds).toEqual(original);
    expect(getR2Tool('T01').rewardSources).toContainEqual({source:'e10-stage-clear',overflowGold:2});
    for(const id of ['T03','T04','T05','T06'])expect(getR2Tool(id).rewardSources).toContainEqual({source:'c12-stage-clear',overflowGold:2});
    expect(getR2Tool('T16').shopWeight).toBe(0);
    expect(getR2Tool('T16').rewardSources).toEqual([{source:'first-boss-clear',overflowGold:2,claim:'once-per-run',rng:'none'}]);
    expect(getR2Tool('T16').requiredFeatures).toContain('first-boss-supply');
    expect(supportsR2Tool({...getR2Tool('P01'),requiredFeatures:[]})).toBe(false);
    expect(supportsR2Tool({...getR2Tool('S03'),requiredFeatures:[]})).toBe(false);
  });

  it('defines independent seven-way enhancement and three-way edition random tables with real sacrifice/gold costs',()=>{
    const sacrifice=getR2Tool('S01');expect(sacrifice.costs).toEqual([{kind:'sacrifice-card',count:1}]);
    expect(sacrifice.target).toEqual({kind:'card-sacrifice',donors:1,minimum:1,maximum:2,recipients:'unenhanced',distinct:true});
    expect(sacrifice.operation).toMatchObject({kind:'random-enhancement',rng:'rule',independentPerTarget:true});
    if(sacrifice.operation.kind!=='random-enhancement')throw Error('wrong spectral contract');
    expect(sacrifice.operation.choices).toEqual(R2_ENHANCEMENTS.map(e=>({id:e.id,weight:1})));
    const edition=getR2Tool('S02');expect(edition.costs).toEqual([{kind:'gold',amount:5}]);
    expect(edition.operation).toEqual({kind:'random-edition',rng:'rule',choices:[{id:'foil',weight:5},{id:'holographic',weight:3},{id:'polychrome',weight:2}]});
    expect(edition.target).toEqual({kind:'card-or-joker',edition:'none'});
  });

  it('makes permanent-resource trades shop-only, bounded and conditional on an actual next-entry change',()=>{
    expect(getR2Tool('S03').phases).toEqual(['shop']);
    expect(getR2Tool('S03').operation).toMatchObject({kind:'copy-card',copies:2,retainOriginal:true});
    expect(getR2Tool('S03').costs).toEqual([{kind:'permanent-hands-penalty',amount:1,effective:'next-stage',requireExactChange:true}]);
    expect(getR2Tool('S04').phases).toEqual(['shop']);
    expect(getR2Tool('S04').operation).toEqual({kind:'set-deck-suit',preserveOrder:true});
    expect(getR2Tool('S04').costs).toEqual([{kind:'permanent-hand-penalty',amount:1,effective:'next-stage',requireExactChange:true}]);
    expect(getR2Tool('S08').operation).toEqual({kind:'clear-deck-specials',minimumModifiedCards:4,countEachCardOnce:true,handBonus:1,effective:'next-stage',requireExactChange:true});
    expect(getR2Tool('S08').caps).toContain('oncePerRun');
    expect(R2_TOOL_CATALOG.limits).toMatchObject({deckDeletionFloor:20,minimalDeckFloor:16,deckMaximum:80,handMinimum:5,handMaximum:14,handsMinimum:2,spectralHandsPenaltyMaximum:2,spectralHandPenaltyMaximum:2});
    expect(R2_TOOL_CATALOG.acquisition.generatedCards).toBe('draw-pile-bottom-without-shuffle');
  });

  it('prevents zero-gold rare generation, full-slot conversion and sacrifice from masquerading as a sale',()=>{
    expect(getR2Tool('S05').operation).toEqual({kind:'exchange-hand-levels',gain:3,loss:1,targetMaximumBefore:27,donorMinimumBefore:2,preserveDiscovery:true});
    expect(getR2Tool('S05').costs).toEqual([{kind:'gold',amount:3}]);
    expect(getR2Tool('S06').costs).toEqual([{kind:'all-gold',minimum:5}]);
    expect(getR2Tool('S06').operation).toEqual({kind:'rare-joker-reward',rng:'reward',selection:'uniform-unowned-supported-rare',paidPrice:0,edition:'none',resetGrowth:true});
    expect(getR2Tool('S06').reject).toContain('joker-slots-full');
    expect(getR2Tool('S06').reject).toContain('empty-reward-pool');
    expect(getR2Tool('S07').operation).toEqual({kind:'set-joker-edition',edition:'polychrome',saleHooks:false,keepPaidPrice:true});
    expect(getR2Tool('S07').costs).toEqual([{kind:'sacrifice-joker',count:1}]);
    expect(getR2Tool('S07').caps).toContain('postConsumptionCapacity');
  });

  it('keeps six enhancement numerics and publishes lucky/edition scoring separately from rarity',()=>{
    const effect=(id:string)=>R2_ENHANCEMENTS.find(e=>e.id===id)!.effects;
    expect(effect('heat-paper')[0]).toMatchObject({kind:'add-heat',value:{n:'20',d:'1'}});
    expect(effect('multiplier-paper')[0]).toMatchObject({kind:'add-multiplier',value:{n:'2',d:'1'}});
    expect(effect('glass-paper')[0]).toMatchObject({kind:'multiply-multiplier',value:{n:'3',d:'2'}});
    expect(effect('glass-paper')[1]).toMatchObject({kind:'chance-destroy',probability:{n:1,d:4},oncePerOriginalCard:true,belowDeletionFloorAllowed:true});
    expect(effect('voice-paper')[0]).toMatchObject({phase:'onHeldCard',kind:'add-multiplier',value:{n:'1',d:'1'}});
    expect(effect('gold-paper')[0]).toMatchObject({phase:'onStageClear',kind:'add-gold',amount:1,capPerStage:5});
    expect(effect('encore-paper')[0]).toMatchObject({kind:'retrigger-card',count:1,maximumDepth:1});
    expect(effect('lucky-paper')).toEqual([
      {phase:'onCardScore',kind:'chance-add-multiplier',probability:{n:1,d:5},value:{n:'4',d:'1'},rng:'rule'},
      {phase:'onCardScore',kind:'chance-add-gold',probability:{n:1,d:15},amount:10,capPerHand:20,rng:'rule',drawWhenCapped:true},
    ]);
    expect(R2_EDITIONS.map(e=>[e.shopWeight,e.priceDelta])).toEqual([[90,0],[5,2],[3,3],[2,5]]);
    expect(R2_EDITIONS.slice(1).map(e=>e.effect)).toEqual([
      {kind:'add-heat',value:{n:'25',d:'1'}},{kind:'add-multiplier',value:{n:'2',d:'1'}},{kind:'multiply-multiplier',value:{n:'3',d:'2'}},
    ]);
  });

  it('retains all twelve long-term prices and the single-use/non-sale/cap contracts',()=>{
    expect(R2_LONG_TERM_ITEMS.map(i=>i.price)).toEqual([10,12,16,10,12,12,10,12,14,10,10,10]);
    for(const item of R2_LONG_TERM_ITEMS){expect(item.shopWeight).toBe(1);expect(item.duplicate).toBe(false);expect(item.sellable).toBe(false);expect(item.lifetime).toBe('run');}
    expect(R2_LONG_TERM_ITEMS.find(i=>i.id==='U09')!.operation).toEqual({kind:'boss-most-used-hand-upgrade',levels:1,tieBreak:'hand-table-low-to-high',atCap:'skip-without-redraw'});
    expect(R2_LONG_TERM_ITEMS.find(i=>i.id==='U12')!.operation).toEqual({kind:'first-normal-clear-per-chapter',gold:3,skipConsumes:false,retroactive:false});
  });

  it.each([
    ['duplicate ID',(c:any)=>{c.tools[1].id='T01';}],
    ['nonstring ID',(c:any)=>{c.tools[0].id=42;}],
    ['missing original',(c:any)=>{c.tools.splice(15,1);}],
    ['unknown operation',(c:any)=>{c.tools[0].operation.kind='eval-script';}],
    ['unknown use phase',(c:any)=>{c.tools[0].phases=['presenting'];}],
    ['changed original dye identity',(c:any)=>{c.tools.find((t:any)=>t.id==='T03').operation.suit='spades';}],
    ['hidden additional use fee',(c:any)=>{c.tools[0].costs=[{kind:'gold',amount:1}];}],
    ['unknown feature',(c:any)=>{c.tools[0].requiredFeatures.push('mod-engine');}],
    ['undeclared actual feature',(c:any)=>{c.tools.find((t:any)=>t.id==='S03').requiredFeatures=[];}],
    ['nonfinite price',(c:any)=>{c.tools[0].price=Infinity;}],
    ['negative weight',(c:any)=>{c.tools[0].shopWeight=-1;}],
    ['duplicate targets permitted',(c:any)=>{c.tools.find((t:any)=>t.id==='S01').target.distinct=false;}],
    ['target range backwards',(c:any)=>{c.tools.find((t:any)=>t.id==='T02').target.minimum=3;}],
    ['unbounded permanent cost',(c:any)=>{c.limits.spectralHandsPenaltyMaximum=100;}],
    ['paid T16',(c:any)=>{c.tools.find((t:any)=>t.id==='T16').shopWeight=1;}],
    ['expanded live IDs',(c:any)=>{c.initialSupportedToolIds.push('S06');}],
    ['expanded skip pool',(c:any)=>{c.acquisition.skipRewardIds.push('T16');}],
    ['duplicate planet mapping',(c:any)=>{c.tools.find((t:any)=>t.id==='P12').operation.handType='five-kind';}],
    ['unknown cap',(c:any)=>{c.tools[0].caps.push('unlimited');}],
    ['missing reward source',(c:any)=>{c.tools.find((t:any)=>t.id==='T16').rewardSources=[];}],
    ['nonarray reward sources',(c:any)=>{c.tools.find((t:any)=>t.id==='T16').rewardSources=null;}],
    ['unknown reward source',(c:any)=>{c.tools.find((t:any)=>t.id==='T16').rewardSources[0].source='endless-loot';}],
    ['unknown asset',(c:any)=>{c.tools[0].assetId='';}],
    ['duplicate asset',(c:any)=>{c.tools[1].assetId=c.tools[0].assetId;}],
    ['probability denominator zero',(c:any)=>{c.enhancements.find((e:any)=>e.id==='lucky-paper').effects[0].probability.d=0;}],
    ['probability above one',(c:any)=>{c.enhancements.find((e:any)=>e.id==='glass-paper').effects[1].probability.n=5;}],
    ['empty enhancement effects',(c:any)=>{c.enhancements.find((e:any)=>e.id==='voice-paper').effects=[];}],
    ['foil masquerading as a multiplier',(c:any)=>{c.editions.find((e:any)=>e.id==='foil').effect.kind='multiply-multiplier';}],
    ['missing random outcome',(c:any)=>{c.tools.find((t:any)=>t.id==='S01').operation.choices.pop();}],
    ['random normal edition',(c:any)=>{c.tools.find((t:any)=>t.id==='S02').operation.choices[0].id='none';}],
    ['zero-gold rare loop',(c:any)=>{c.tools.find((t:any)=>t.id==='S06').costs[0].minimum=0;}],
    ['false sacrifice sale',(c:any)=>{c.tools.find((t:any)=>t.id==='S07').operation.saleHooks=true;}],
    ['repeat purification',(c:any)=>{c.tools.find((t:any)=>t.id==='S08').caps=c.tools.find((t:any)=>t.id==='S08').caps.filter((v:string)=>v!=='oncePerRun');}],
    ['oversized shop expansion',(c:any)=>{c.longTermItems.find((i:any)=>i.id==='U05').operation.base=4;}],
    ['unknown extra field',(c:any)=>{c.tools[0].script='run-arbitrary';}],
  ])('rejects %s without treating invalid data as harmless',(name,mutate)=>{
    const before=JSON.stringify(R2_TOOL_CATALOG);expect(validateR2Tools(altered(mutate)).length).toBeGreaterThan(0);expect(JSON.stringify(R2_TOOL_CATALOG)).toBe(before);
  });

  it.each([null,undefined,0,'catalog',[],{}, {schemaVersion:1}])('rejects incomplete input without throwing (%s)',input=>{
    expect(validateR2Tools(input).length).toBeGreaterThan(0);
  });
});
