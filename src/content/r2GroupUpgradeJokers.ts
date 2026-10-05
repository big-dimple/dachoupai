import type {R2JokerDefinition} from './r2Schema';
import {R2_COMBO_GROWTH_JOKERS} from './r2ComboGrowthJokers';
import {R2_GROUP_HAND_TYPES} from '../domain/r2GroupHands';
const changes:Record<string,Pick<R2JokerDefinition,'rarity'|'description'|'hooks'>>={
 b03:{rarity:'uncommon',description:'任何成组牌型结算后倍率成长+0.25，上限+3，下次起生效；每手任意牌型均加入已有成长，跨场保留。',hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'read-growth',key:'multiplier',target:'multiplier'}]},{phase:'afterHand',condition:{kind:'hand-type-in',values:R2_GROUP_HAND_TYPES},operations:[{kind:'add-growth',key:'multiplier',value:{n:'1',d:'4'},cap:{n:'3',d:'1'}}]}]},
 b06:{rarity:'rare',description:'成组牌型中，主手原始计分牌里张数最多的同点组，平手取左边先出现的一组；该组有效牌各再计一次。失效牌参与选组，不改选其他组；每牌额外最多4次，深度1。',hooks:[{phase:'onCardScore',condition:{kind:'largest-scoring-rank-group'},operations:[{kind:'retrigger-card',count:1}]}]},
 b08:{rarity:'uncommon',description:'任何成组牌型致胜成功过场，额外+3金币；失败和跳场不给，助攻不改变主手判型。',hooks:[{phase:'onStageClear',condition:{kind:'hand-type-in',values:R2_GROUP_HAND_TYPES},operations:[{kind:'add-gold',amount:3}]}]},
 b10:{rarity:'common',description:'任何成组牌型结算后热度成长+10，上限+100，下次起生效；每手任意牌型均加入已有成长，跨场保留。',hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'read-growth',key:'heat',target:'heat'}]},{phase:'afterHand',condition:{kind:'hand-type-in',values:R2_GROUP_HAND_TYPES},operations:[{kind:'add-growth',key:'heat',value:{n:'10',d:'1'},cap:{n:'100',d:'1'}}]}]},
};
function freeze<T>(value:T):T {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const R2_GROUP_UPGRADE_JOKERS:readonly R2JokerDefinition[]=freeze(R2_COMBO_GROWTH_JOKERS.map(d=>changes[d.id]?{...d,...changes[d.id]}:d));
export const R2_GROUP_UPGRADE_IDS=Object.freeze(Object.keys(changes));
