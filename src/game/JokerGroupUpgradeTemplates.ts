import type {JokerPlayerTemplate} from './JokerPlayerCopy';
const binding=(source:string,format='fractionText')=>({source,format});
const types='成组指最终牌型为对子、两对、三条、葫芦、四条、五条、同花葫芦、同花五条；普通同花即使含同点牌也不算。';
const growth=(unit:string,key:string):JokerPlayerTemplate=>({main:'每次出牌加入已保存的'+unit+'成长；打出成组牌型后，'+unit+'成长+{gain}，最多+{cap}。',limits:['本手使用旧值；新成长从下一手起生效，每次出牌只长一次，额外计分不会多长。'],rules:[types,'已有成长跨场保留，改打顺子、普通同花或高牌仍可使用，但不增长；出售后丢失，重买初始为0。','计分封禁时不读取加成，非计分成长仍照常判断。'],state:['当前保存：+'+(key==='heat'?'{saved_heat}':'{saved_multiplier}')],bindings:{gain:binding('definition.hooks[1].operations[0].value'),cap:binding('definition.hooks[1].operations[0].cap')}});
export const JOKER_GROUP_UPGRADE_TEMPLATES:Readonly<Record<string,JokerPlayerTemplate>>={
 b03:growth('倍率','multiplier'),b10:growth('热度','heat'),
 b06:{main:'成组牌型中，主手原始计分牌里张数最多的同点组，各张有效牌再计{count}次。',limits:['同样多时取当前主手从左到右最先出现的一组；失效牌参与选组，但不再计，也不改选另一组。'],rules:[types,'附带牌、保留牌和助攻牌不参与选组。对子选2张，两对选其中一组2张，三条/葫芦选3张，四条选4张，五条选5张。','只让牌级计分再执行，不重复整手、角色、成长或过关奖励。与其他再次计分叠加，每牌额外最多{cap}次，深度最多1层；计分封禁时暂停。'],state:[],bindings:{count:binding('definition.hooks[0].operations[0].count','plain'),cap:binding('SCORE_LIMITS.extraRetriggers','plain')}},
 b08:{main:'以成组主手致胜并成功过关，额外获得{amount}金。',limits:['同一次过关只发一次；失败、跳场不发。无需保留牌数量，助攻不改变主手牌型。'],rules:[types,'计分封禁不暂停过关收入；这笔奖励不抬高滚个零头的奖励前本金。'],state:[],bindings:{amount:binding('definition.hooks[0].operations[0].amount','plain')}},
};
