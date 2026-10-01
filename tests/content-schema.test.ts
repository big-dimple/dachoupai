import { describe, expect, it } from 'vitest';
import { R2_JOKERS, validateR2Content } from '../src/content/r2Schema';
describe('content schema rejects unsafe and unknown data', () => {
  it.each([null,{},[null],[{...R2_JOKERS[0],hooks:[null]}],[{...R2_JOKERS[0],hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[null]}]}]])('returns diagnostics rather than throwing for %j', bad => {
    expect(validateR2Content(bad).length).toBeGreaterThan(0);
  });
  it('returns diagnostics for malformed hooks even when a feature manifest is present',()=>{
    const definition=R2_JOKERS.find(d=>d.id==='f06')!;
    expect(validateR2Content([{...definition,hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[null]}]}]).length).toBeGreaterThan(0);
  });
  it.each([
    {kind:'add-heat',value:{n:'-1',d:'1'}}, {kind:'multiply-multiplier',value:{n:'0',d:'1'}},
    {kind:'add-heat',value:{n:'1',d:'0'}}, {kind:'add-heat',value:{n:'Infinity',d:'1'}},
    {kind:'script',code:'arbitrary'}, {kind:'retrigger-card',count:5},
    {kind:'read-growth',key:'missing',target:'heat'},
  ])('rejects operation %j', op=> {
    const data=[{...R2_JOKERS[0],hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[op]}]}];
    expect(validateR2Content(data).length).toBeGreaterThan(0);
  });
  it.each([
    ['onStageClear',{kind:'rank-in',values:[8]}],
    ['onBuyOffer',{kind:'resource',resource:'hands-after',equals:1}],
    ['onDiscard',{kind:'resource-minimum',resource:'gold',minimum:20}],
    ['onDiscard',{kind:'resource',resource:'gold',equals:1}],
  ])('rejects unsupported transaction predicates %s %j',(phase,condition)=>{
    const operations=phase==='onStageClear'?[{kind:'add-gold',amount:2}]:phase==='onDiscard'?[{kind:'refund-discard',amount:1}]:[{kind:'add-growth',key:'heat',value:{n:'8',d:'1'},cap:{n:'80',d:'1'}}];
    expect(validateR2Content([{...R2_JOKERS[0],hooks:[{phase,condition,operations}]}]).length).toBeGreaterThan(0);
  });

  it.each([
    {kind:'scoring-position',position:'middle'},
    {kind:'scoring-position',position:'first',playModulo:{divisor:2,remainder:2}},
    {kind:'all-played-active',minimum:0},
    {kind:'resource-maximum',resource:'gold',maximum:NaN},
    {kind:'discard-count',equals:1},
    {kind:'exhausted-hands'},
  ])('rejects C00 invalid or misplaced card predicates %j',condition=>{
    expect(validateR2Content([{...R2_JOKERS[0],hooks:[{phase:'jokerScore',condition,operations:[{kind:'add-heat',value:{n:'1',d:'1'}}]}]}]).length).toBeGreaterThan(0);
  });

  it.each([
    {kind:'hand-limit',amount:0}, {kind:'hand-limit',amount:2,deckMaximum:NaN},
    {kind:'four-straight',allowStraightFlush:true},
    {kind:'first-purchase-discount',amount:1,minimum:0}, {kind:'interest-cap',amount:Infinity},
    {kind:'script',code:'arbitrary'},
  ])('rejects unsafe static modifiers %j',modifier=>{
    expect(validateR2Content([{...R2_JOKERS[0],hooks:[],modifiers:[modifier]}]).length).toBeGreaterThan(0);
  });

  it('requires a bounded writer for consumed and comparison growth and refuses empty static shells',()=>{
    expect(validateR2Content([{...R2_JOKERS[0],hooks:[]}]).length).toBeGreaterThan(0);
    const definition={...R2_JOKERS[0],hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'consume-growth',key:'pendingHeat',target:'heat'}]}]};
    expect(validateR2Content([definition]).length).toBeGreaterThan(0);
    expect(validateR2Content([{...definition,hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'update-score-growth',key:'multiplier',value:{n:'1',d:'4'},cap:{n:'4',d:'1'}}]}]}]).length).toBeGreaterThan(0);
  });
});
