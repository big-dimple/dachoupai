import type {R2JokerDefinition} from './r2Schema';
import {R2_PUBLISHED_JOKERS} from '../domain/r2PublishedContent';
import {AMO_ASSIST_TYPES} from '../domain/r2QualifiedHands';

/** Prototype overlay only. The other 65 definitions retain their published objects. */
const changes:Record<string,Pick<R2JokerDefinition,'description'|'hooks'>>={
 pengci:{description:'主手恰为三条时，整手倍率 +2；助攻三条不算。',hooks:[{phase:'jokerScore',condition:{kind:'hand-type-in',values:['three-kind']},operations:[{kind:'add-multiplier',value:{n:'2',d:'1'}}]}]},
 a03:{description:'合格主手的首张有效计分牌热度 +15；合法重触发可重复获得。',hooks:[{phase:'onCardScore',condition:{kind:'scoring-position',position:'first',handTypes:AMO_ASSIST_TYPES},operations:[{kind:'add-heat',value:{n:'15',d:'1'}}]}]},
 a05:{description:'每手读取已存热度成长；连续两手为同一种合格主手时，结算后成长 +6，封顶90，下一手生效。',hooks:[{phase:'jokerScore',condition:{kind:'always'},operations:[{kind:'read-growth',key:'heat',target:'heat'}]},{phase:'afterHand',condition:{kind:'hand-type-relation',values:AMO_ASSIST_TYPES,relation:'same'},operations:[{kind:'add-growth',key:'heat',value:{n:'6',d:'1'},cap:{n:'90',d:'1'}}]}]},
 a06:{description:'连续两手均为合格主手且牌型不同，本手整手倍率 ×1.5。',hooks:[{phase:'jokerScore',condition:{kind:'hand-type-relation',values:AMO_ASSIST_TYPES,relation:'different'},operations:[{kind:'multiply-multiplier',value:{n:'3',d:'2'}}]}]},
 a10:{description:'按手牌顺序，首张有效保留的J、Q或K使倍率 ×1.25；助攻牌不算保留。',hooks:[{phase:'onHeldCard',condition:{kind:'held-rank-first',values:[11,12,13],limit:1},operations:[{kind:'multiply-multiplier',value:{n:'5',d:'4'}}]}]},
 a11:{description:'主手为葫芦或同花葫芦时，每张有效计分牌请求额外重触发一次；助攻牌不触发。',hooks:[{phase:'onCardScore',condition:{kind:'hand-type-in',values:['full-house','flush-house']},operations:[{kind:'retrigger-card',count:1}]}]},
 a12:{description:'本场每次成功出牌的主手均不超过4张，过关时金币 +3；助攻不计入主手张数。',hooks:[{phase:'onStageClear',condition:{kind:'stage-played-maximum',maximum:4},operations:[{kind:'add-gold',amount:3}]}]},
};
function freeze<T>(value:T):T {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const R2_ASSIST_JOKERS:readonly R2JokerDefinition[]=freeze(R2_PUBLISHED_JOKERS.map(d=>changes[d.id]?{...d,...changes[d.id]}:d));
export const R2_ASSIST_ADAPTED_IDS:readonly string[]=Object.freeze(Object.keys(changes));
