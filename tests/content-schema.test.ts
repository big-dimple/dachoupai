import { describe, expect, it } from 'vitest';
import { R2_JOKERS, validateR2Content } from '../src/content/r2Schema';
describe('content schema rejects unsafe and unknown data', () => {
  it.each([null,{},[null],[{...R2_JOKERS[0],hooks:[null]}],[{...R2_JOKERS[0],hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[null]}]}]])('returns diagnostics rather than throwing for %j', bad => {
    expect(validateR2Content(bad).length).toBeGreaterThan(0);
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
});
