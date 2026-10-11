import type {R2JokerDefinition} from './r2Schema';
import {R2_GROUP_UPGRADE_JOKERS} from './r2GroupUpgradeJokers';
import {R2_COMBO_GROWTH_JOKERS} from './r2ComboGrowthJokers';
import {R2_ASSIST_JOKERS} from './r2AssistJokers';
import {R2_PUBLISHED_JOKERS} from '../domain/r2PublishedContent';
import {R2_GROUP_HAND_TYPES} from '../domain/r2GroupHands';
import {R2_STRAIGHT_HAND_TYPES,R2_FLUSH_HAND_TYPES} from '../domain/r2RouteGrowth';
import {AMO_ASSIST_TYPES} from '../domain/r2QualifiedHands';
import {stableHash} from '../domain/hash';

const changes:Record<string,Pick<R2JokerDefinition,'description'|'hooks'>>={
  mantangcai:{description:'任何成组牌型，整手热度+90；包括五条、同花葫芦和同花五条。',hooks:[
    {phase:'jokerScore',condition:{kind:'hand-type-in',values:R2_GROUP_HAND_TYPES},operations:[{kind:'add-heat',value:{n:'90',d:'1'}}]},
  ]},
  c04:{description:'顺子或同花顺，整手热度+50；结算后热度成长+10，上限+100，下次起生效。每手任意牌型均读取已有成长，跨场保留。',hooks:[
    {phase:'jokerScore',condition:{kind:'hand-type-in',values:R2_STRAIGHT_HAND_TYPES},operations:[{kind:'add-heat',value:{n:'50',d:'1'}}]},
    {phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'read-growth',key:'heat',target:'heat'}]},
    {phase:'afterHand',condition:{kind:'hand-type-in',values:R2_STRAIGHT_HAND_TYPES},operations:[{kind:'add-growth',key:'heat',value:{n:'10',d:'1'},cap:{n:'100',d:'1'}}]},
  ]},
  c06:{description:'同花、同花顺、同花葫芦或同花五条结算后倍率成长+0.5，上限+6，下次起生效。每手任意牌型均读取已有成长，跨场保留。',hooks:[
    {phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'read-growth',key:'multiplier',target:'multiplier'}]},
    {phase:'afterHand',condition:{kind:'hand-type-in',values:R2_FLUSH_HAND_TYPES},operations:[{kind:'add-growth',key:'multiplier',value:{n:'1',d:'2'},cap:{n:'6',d:'1'}}]},
  ]},
  jiedongfeng:{description:'顺子、同花及其同花顺、同花葫芦、同花五条升级牌型，整手倍率+1.5。',hooks:[
    {phase:'jokerScore',condition:{kind:'hand-type-in',values:[...new Set([...R2_STRAIGHT_HAND_TYPES,...R2_FLUSH_HAND_TYPES])]},operations:[{kind:'add-multiplier',value:{n:'3',d:'2'}}]},
  ]},
  e11:{description:'整手倍率乘自身系数，创建时×1；本场含准备商店未出售Joker而成功过关，系数+0.1，上限2，下次起生效。出售其他Joker保留已有系数，但本场不增长；卖掉自身后重买从1开始。',hooks:[
    {phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'read-coefficient',key:'coefficient'}]},
    {phase:'onStageClear',condition:{kind:'no-joker-sale-this-stage'},operations:[{kind:'add-coefficient',key:'coefficient',initial:{n:'1',d:'1'},value:{n:'1',d:'10'},cap:{n:'2',d:'1'}}]},
  ]},
  f10:{description:'本场尚未出牌时，第一次成功弃牌备好一次救火。下一次合法出牌若为两对及以上，倍率×3；否则作废。再次弃牌不叠加，该次出牌后消耗，场末清空。',hooks:[
    {phase:'onDiscard',condition:{kind:'opening-discard'},operations:[{kind:'arm-rescue'}]},
    {phase:'jokerScore',condition:{kind:'hand-type-in',values:AMO_ASSIST_TYPES},operations:[{kind:'rescue-multiplier',value:{n:'3',d:'1'}}]},
    {phase:'afterHand',condition:{kind:'always'},operations:[{kind:'consume-rescue'}]},
  ]},
};
function freeze<T>(value:T):T {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const R2_ROUTE_GROWTH_JOKERS:readonly R2JokerDefinition[]=freeze(R2_GROUP_UPGRADE_JOKERS.map(d=>changes[d.id]?{...d,...changes[d.id]}:d));
export const R2_ROUTE_GROWTH_IDS=Object.freeze(Object.keys(changes));
const definitionsHash=stableHash(R2_ROUTE_GROWTH_JOKERS);
// These module-owned arrays are deeply frozen. Legacy previews need no full
// 72-card hash on every candidate; arbitrary/copied arrays still get the hash.
const legacyDefinitionSets=new Set<readonly R2JokerDefinition[]>([R2_PUBLISHED_JOKERS,R2_ASSIST_JOKERS,R2_COMBO_GROWTH_JOKERS,R2_GROUP_UPGRADE_JOKERS]);
export const hasR2RouteGrowthDefinitions=(definitions:readonly R2JokerDefinition[])=>definitions===R2_ROUTE_GROWTH_JOKERS||!legacyDefinitionSets.has(definitions)&&stableHash(definitions)===definitionsHash;
