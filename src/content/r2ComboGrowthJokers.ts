import type {R2JokerDefinition} from './r2Schema';
import {R2_ASSIST_JOKERS} from './r2AssistJokers';
import {AMO_ASSIST_TYPES} from '../domain/r2QualifiedHands';

/** Shared overlay for all six roles; unchanged definitions retain their frozen objects. */
const changes:Record<string,Pick<R2JokerDefinition,'description'|'hooks'|'modifiers'|'requiredFeatures'>>={
 a06:{description:'打出两对及以上时，倍率乘当前系数（初始×1.5）。每场首次连续两次出牌均两对及以上且牌型不同，结算后系数再×1.15，下次生效。每场只长一次，跨场保留，封顶×1000000。',requiredFeatures:['score-hooks','coefficient-growth'],hooks:[
  {phase:'jokerScore',condition:{kind:'hand-type-in',values:AMO_ASSIST_TYPES},operations:[{kind:'read-coefficient',key:'coefficient'}]},
  {phase:'afterHand',condition:{kind:'hand-type-relation',values:AMO_ASSIST_TYPES,relation:'different'},operations:[{kind:'multiply-coefficient-once',key:'coefficient',value:{n:'23',d:'20'},initial:{n:'3',d:'2'},cap:{n:'1000000',d:'1'}}]},
 ]},
 f10:{description:'本场尚未出牌，第一次成功弃牌前手牌凑不出两对及以上时，备好一次救火。下一次出牌若为两对及以上，倍率×3；否则作废。再次弃牌不叠加，该次出牌后消耗，场末清空。',requiredFeatures:['score-hooks','discard-hooks'],hooks:[
  {phase:'onDiscard',condition:{kind:'cold-opening-discard'},operations:[{kind:'arm-rescue'}]},
  {phase:'jokerScore',condition:{kind:'hand-type-in',values:AMO_ASSIST_TYPES},operations:[{kind:'rescue-multiplier',value:{n:'3',d:'1'}}]},
  {phase:'afterHand',condition:{kind:'always'},operations:[{kind:'consume-rescue'}]},
 ]},
 d12:{description:'用两对及以上过关，且本次出牌后实际保留至少4张牌时，每张保留牌给1金，最多6金；补牌、已出的牌及助攻牌不算。',requiredFeatures:['stage-clear-hooks'],hooks:[
  {phase:'onStageClear',condition:{kind:'hand-type-in',values:AMO_ASSIST_TYPES},operations:[{kind:'add-gold-per-held',minimum:4,cap:6}]},
 ]},
 e04:{description:'成功过关时，按领取所有过关奖励前的金币，每10金额外给1金，最多6金；本次奖励不计入本金。',requiredFeatures:['stage-clear-hooks'],hooks:[
  {phase:'onStageClear',condition:{kind:'always'},operations:[{kind:'add-gold-per-capital',divisor:10,cap:6}]},
 ]},
};
function freeze<T>(value:T):T {if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const R2_COMBO_GROWTH_JOKERS:readonly R2JokerDefinition[]=freeze(R2_ASSIST_JOKERS.map(d=>{
 const change=changes[d.id];if(!change)return d;
 const {modifiers:_,...base}=d;return {...base,...change};
}));
export const R2_COMBO_GROWTH_IDS=Object.freeze(Object.keys(changes));
