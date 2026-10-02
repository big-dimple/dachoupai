import {describe,expect,it} from 'vitest';
import * as schema from '../src/content/r2Schema';
import type {R2JokerDefinition,R2JokerInstance} from '../src/content/r2Schema';

const f=(n:string,d='1')=>({n,d});
const original48=['pengci','tiesuanpan','a03','a05','mantangcai','b02','b03','b04','jiedongfeng','c02','c04','c06',
  'd01','d03','d05','d10','e01','e03','e05','e08','huimaqiang','f02','f03','f09',
  'a04','a06','a07','a08','b05','b06','b07','b08','c03','c05','c07','c08',
  'd02','d04','d06','d07','e02','e04','e06','e07','f04','f05','f06','f07'];
const last24=[
  ['a09','短节目','common'],['a10','后台眼神','uncommon'],['a11','返个场','rare'],['a12','不铺张','uncommon'],
  ['b09','四座皆惊','rare'],['b10','练对子','uncommon'],['b11','候场同伴','uncommon'],['b12','救个场','rare'],
  ['c09','少一块布','rare'],['c10','压住书页','uncommon'],['c11','换轨','uncommon'],['c12','换一身','uncommon'],
  ['d08','留声机','rare'],['d09','回声越来越近','uncommon'],['d11','三拍子','rare'],['d12','留点悬念','uncommon'],
  ['e09','储物箱','common'],['e10','赠票','uncommon'],['e11','长期捧场','rare'],['e12','淘旧摊','uncommon'],
  ['f08','试试手气','uncommon'],['f10','冷场救火','rare'],['f11','越挫越会','uncommon'],['f12','真正的压轴','rare'],
] as const;
// Local shape makes the actual old implementation reach RED before new exports exist.
const growthSchema=schema as typeof schema & {
  r2GrowthInitials(def:R2JokerDefinition):R2JokerInstance['growth'];
  r2GrowthMinimums(def:R2JokerDefinition):R2JokerInstance['growth'];
};
type CoefficientFixture={id:string;name:string;rarity:string;description:string;hooks:{phase:string;condition:{kind:string};operations:Record<string,unknown>[]}[]};
const coefficientDefinition=(id='e11',cap=f('2')):CoefficientFixture=>{
  const definition={id,name:'系数合同',rarity:'rare',description:'独立有限系数样例',hooks:[
  {phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'read-coefficient',key:'coefficient'}]},
  {phase:'onStageClear',condition:{kind:'always'},operations:[{kind:'add-coefficient',key:'coefficient',initial:f('1'),value:f('1','10'),cap}]},
  {phase:'onSellJoker',condition:{kind:'always'},operations:[{kind:'reset-coefficient',key:'coefficient',initial:f('1')}]},
]};
  if(id==='f12')definition.hooks.pop(); // F12 has no sale-reset ability.
  return definition;
};

describe('C02 stable catalog, actual capabilities and finite schema',()=>{
  it('adds exactly the final 24 stable IDs without replacing any of the original 48',()=>{
    expect(schema.R2_JOKERS.map(d=>d.id).sort()).toEqual([...original48,...last24.map(([id])=>id)].sort());
    expect(new Set(schema.R2_JOKERS.map(d=>d.id)).size).toBe(72);
    for(const [id,name,rarity] of last24)expect(schema.R2_JOKERS.find(d=>d.id===id)).toMatchObject({id,name,rarity});
    expect(schema.validateR2Content(schema.R2_JOKERS)).toEqual([]);
  });

  it('publishes all final definitions as executable content with complete declared capabilities',()=>{
    for(const [id] of last24) {
      const definition=schema.R2_JOKERS.find(d=>d.id===id);
      expect(definition,`${id} exists`).toBeDefined();
      expect(schema.supportsR2Joker(definition!)).toBe(true);
      expect(definition!.requiredFeatures?.length,`${id} declares actual dependencies`).toBeGreaterThan(0);
    }
  });

  it('includes the two new independent static modifiers without folding capacity into hand size',()=>{
    const jokers=['c08','c09','e09','e09'].map((definitionId,i)=>({instanceId:`static/${i}`,definitionId,paidPrice:4,growth:{}}));
    expect(schema.readR2Modifiers(jokers,schema.R2_JOKERS)).toMatchObject({fourStraight:true,fourFlush:true,consumableCapacityBonus:2,handLimitBonus:0});
  });

  it('declares initial and minimum coefficients separately from zero-based additive growth',()=>{
    const e11=coefficientDefinition() as unknown as R2JokerDefinition;
    const f12=coefficientDefinition('f12',f('5','2')) as unknown as R2JokerDefinition;
    expect(schema.validateR2Content([e11,f12])).toEqual([]);
    expect(schema.r2GrowthCaps(e11)).toEqual({coefficient:f('2')});
    expect(schema.r2GrowthCaps(f12)).toEqual({coefficient:f('5','2')});
    expect(growthSchema.r2GrowthInitials(e11)).toEqual({coefficient:f('1')});
    expect(growthSchema.r2GrowthMinimums(e11)).toEqual({coefficient:f('1')});
    const additive=schema.R2_JOKERS.find(d=>d.id==='a05')!;
    expect(growthSchema.r2GrowthInitials(additive)).toEqual({});
    expect(growthSchema.r2GrowthMinimums(additive)).toEqual({heat:f('0')});
  });

  it('requires a compatible finite writer for every coefficient reader and reset',()=>{
    const noWriter=coefficientDefinition();noWriter.hooks.splice(1,1);
    expect(schema.validateR2Content([noWriter]).join(' ')).toMatch(/writer/);
    const conflicting=coefficientDefinition();conflicting.hooks.push({phase:'onStageClear',condition:{kind:'always'},operations:[{kind:'add-coefficient',key:'coefficient',initial:f('1'),value:f('1','10'),cap:f('5','2')}]});
    expect(schema.validateR2Content([conflicting]).join(' ')).toMatch(/conflicting.*cap/);
    const mismatch=coefficientDefinition();mismatch.hooks[2].operations[0].initial=f('0');
    expect(schema.validateR2Content([mismatch]).length).toBeGreaterThan(0);
    const below=coefficientDefinition('e11',f('9','10'));
    expect(schema.validateR2Content([below]).length).toBeGreaterThan(0);
  });

  it('validates coefficient key, phase, initial and fraction fields strictly',()=>{
    for(const change of [
      (d:ReturnType<typeof coefficientDefinition>)=>{d.hooks[0].operations[0].key='heat';},
      (d:ReturnType<typeof coefficientDefinition>)=>{d.hooks[1].phase='jokerScore';},
      (d:ReturnType<typeof coefficientDefinition>)=>{d.hooks[1].operations[0].initial=f('3','2');},
      (d:ReturnType<typeof coefficientDefinition>)=>{d.hooks[1].operations[0].value=f('1','0');},
      (d:ReturnType<typeof coefficientDefinition>)=>{Object.assign(d.hooks[1].operations[0],{arbitrary:'code'});},
    ]) {
      const definition=coefficientDefinition();change(definition);
      expect(schema.validateR2Content([definition]).length).toBeGreaterThan(0);
    }
  });

  it('accepts the finite new predicates only at their executable times',()=>{
    const contracts=[
      [{kind:'played-count-maximum',maximum:2},'jokerScore'],
      [{kind:'held-rank-first',values:[11,12,13],limit:3,playedEquals:1},'onHeldCard'],
      [{kind:'held-scoring-rank-first',limit:3},'onHeldCard'],
      [{kind:'held-enhancement-first',enhancement:'voice-paper',limit:2},'onHeldCard'],
      [{kind:'scoring-position',position:'third-original'},'onCardScore'],
      [{kind:'hand-type-transition',current:'straight',previous:'flush'},'jokerScore'],
      [{kind:'extra-retrigger'},'afterHand'],
      [{kind:'stage-score-below-target',ratio:f('1','4')},'jokerScore'],
      [{kind:'hand-score-below-target',ratio:f('1','10')},'afterHand'],
      [{kind:'stage-played-maximum',maximum:2},'onStageClear'],
      [{kind:'stage-hand-types-all',values:['straight','flush']},'onStageClear'],
      [{kind:'no-joker-sale-this-stage'},'onStageClear'],
      [{kind:'hand-type-unfinished',values:['four-kind']},'afterHand'],
      [{kind:'held-count',minimum:4},'onStageClear'],
    ] as const;
    for(const [condition,phase] of contracts)expect(schema.validR2Condition(condition,phase),JSON.stringify(condition)).toBe(true);
    for(const [condition] of contracts.slice(1))expect(schema.validR2Condition(condition,'onDiscard')).toBe(false);
    expect(schema.validR2Condition({kind:'held-enhancement-first',enhancement:'glass-paper',limit:2},'onHeldCard')).toBe(false);
    expect(schema.validR2Condition({kind:'scoring-position',position:'fourth-original'},'onCardScore')).toBe(false);
    expect(schema.validR2Condition({kind:'stage-score-below-target',ratio:f('1','0')},'jokerScore')).toBe(false);
  });

  it('uses only the declared reward pools, bounded refund, one-third chance and paid reroll hook',()=>{
    const definitions=[
      {id:'b12',name:'返手',rarity:'rare',description:'有界返手',hooks:[{phase:'afterHand',condition:{kind:'hand-type-unfinished',values:['four-kind']},operations:[{kind:'refund-hand-limited',amount:1,limit:1}]}]},
      {id:'c12',name:'染色奖',rarity:'uncommon',description:'固定四染色池',hooks:[{phase:'onStageClear',condition:{kind:'stage-hand-types-all',values:['straight','flush']},operations:[{kind:'reward-consumable-pool',definitionIds:['T03','T04','T05','T06'],fallbackGold:2}]}]},
      {id:'e10',name:'轮转奖',rarity:'uncommon',description:'跨场两次奖',hooks:[{phase:'onStageClear',condition:{kind:'always'},operations:[{kind:'reward-consumable-every-clears',definitionId:'T01',every:2,fallbackGold:2}]}]},
      {id:'f08',name:'随机热度',rarity:'uncommon',description:'每手一判',hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'chance-add-heat',probability:{n:1,d:3},value:f('90')}]}]},
      {id:'e12',name:'付费成长',rarity:'uncommon',description:'真正付费刷新',hooks:[{phase:'onReroll',condition:{kind:'always'},operations:[{kind:'add-growth',key:'heat',value:f('3'),cap:f('60')}]},{phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'read-growth',key:'heat',target:'heat'}]}]},
    ];
    expect(schema.validateR2Content(definitions)).toEqual([]);
    for(const modify of [
      (d:typeof definitions)=>{(d[0].hooks[0].operations[0] as Record<string,unknown>).amount=2;},
      (d:typeof definitions)=>{(d[1].hooks[0].operations[0] as Record<string,unknown>).definitionIds=['T16'];},
      (d:typeof definitions)=>{(d[2].hooks[0].operations[0] as Record<string,unknown>).every=3;},
      (d:typeof definitions)=>{(d[3].hooks[0].operations[0] as Record<string,unknown>).probability={n:1,d:0};},
      (d:typeof definitions)=>{d[4].hooks[0].phase='jokerScore';},
    ]) {
      const mutated=structuredClone(definitions);modify(mutated);
      expect(schema.validateR2Content(mutated).length).toBeGreaterThan(0);
    }
  });

  it('requires the finite E10 clear-cycle counter and keeps old counter lifetimes separate',()=>{
    expect(schema.validR2JokerCounters('e10',{stageClears:0})).toBe(true);
    expect(schema.validR2JokerCounters('e10',{stageClears:1})).toBe(true);
    for(const invalid of [undefined,{},null,{stageClears:2},{stageClears:-1},{stageClears:0.5},{stageClears:0,handsScored:1}]) {
      expect(schema.validR2JokerCounters('e10',invalid)).toBe(false);
    }
    expect(schema.validR2JokerCounters('f06',{handsScored:3})).toBe(true);
    expect(schema.validR2JokerCounters('a07',{singleDiscards:2})).toBe(true);
    expect(schema.validR2JokerCounters('a09',{stageClears:0})).toBe(false);
  });

  it('derives new capability dependencies from actual operations even without a trusted manifest',()=>{
    const chance={id:'f08',name:'随机',rarity:'uncommon',description:'有限机会',hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'chance-add-heat',probability:{n:1,d:3},value:f('90')}]}]} as unknown as R2JokerDefinition;
    expect(schema.supportsR2Joker(chance,['score-hooks'])).toBe(false);
    expect(schema.supportsR2Joker(chance)).toBe(true);
    const incomplete={...chance,requiredFeatures:['score-hooks']};
    expect(schema.validateR2Content([incomplete]).join(' ')).toMatch(/incomplete feature/);
  });
});
