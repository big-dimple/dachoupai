import type {JokerPlayerTemplate} from './JokerPlayerCopy';
const binding=(source:string,format='fractionText')=>({source,format});
const types=(hook:number)=>binding(`definition.hooks[${hook}].condition.values`,'authoritative label list');
/** Display-only templates for the six changed C2 definitions; values stay in the rules. */
export const JOKER_ROUTE_GROWTH_TEMPLATES:Readonly<Record<string,JokerPlayerTemplate>>={
 mantangcai:{main:'打出{types}时，整手热度 +{heat}。',limits:['五条、同花葫芦、同花五条也生效；普通顺子、普通同花与高牌不生效。'],rules:['按最终牌型判断；不是只要里面含一对就生效。'],state:[],bindings:{types:types(0),heat:binding('definition.hooks[0].operations[0].value')}},
 c04:{main:'打出{types}时，热度 +{heat}；每手加入已存热度成长，打出上述牌型后成长 +{gain}，最多 +{cap}。',limits:['本手使用已存成长；新增从下一次出牌生效，每手只长一次。'],rules:['已有成长用于任意牌型，跨场保留；其他牌型不增加成长。出售后丢失，重买从0开始。','计分暂停时不读取加成；结算后的成长仍按牌型判断。'],state:['当前保存：+{saved_heat}'],bindings:{types:types(0),heat:binding('definition.hooks[0].operations[0].value'),gain:binding('definition.hooks[2].operations[0].value'),cap:binding('definition.hooks[2].operations[0].cap')}},
 c06:{main:'每手加上已攒的倍率；打出{types}后，再攒 {gain}，最多攒 {cap}。',limits:['新增从下一手生效；同花葫芦、同花五条也增加成长。'],rules:['已有成长用于任意牌型，跨场保留，跟随这张唐宋牌；其他牌型不增加成长。出售后丢失，重买从0开始。','计分暂停时不读取加成；结算后的成长仍按牌型判断。'],state:['每手倍率加成：+{saved_multiplier}'],bindings:{types:types(1),gain:binding('definition.hooks[1].operations[0].value'),cap:binding('definition.hooks[1].operations[0].cap')}},
 jiedongfeng:{main:'打出{types}时，整手倍率 +{multiplier}。',limits:['每手只加一次，不按牌数累加；同花葫芦、同花五条也生效。'],rules:['看最终牌型，不是看打出的牌中能否拆出顺子或同花。'],state:[],bindings:{types:types(0),multiplier:binding('definition.hooks[0].operations[0].value')}},
 e11:{main:'每手按本牌攒下的倍数加成；这场没卖过唐宋牌又过关，倍数加 {gain}，最高 ×{cap}。',limits:['初始 ×{initial}；新增从下一手生效。','进场前的准备商店也算；出售其他唐宋牌保留已有倍数，但本场不增长。出售本牌后重买从 ×{initial} 开始。'],rules:['成长增加乘数本身，不是再乘一个系数。倍数跟随本牌、跨场保留；本场无出售记录才可增长，买回不会恢复本场资格。'],state:['当前倍率：×{saved_coefficient}'],bindings:{initial:binding('definition.hooks[1].operations[0].initial'),gain:binding('definition.hooks[1].operations[0].value'),cap:binding('definition.hooks[1].operations[0].cap')}},
 f10:{main:'本场出牌前首次成功弃牌备好救火；下一次出牌若为两对及以上，倍率 ×{multiplier}。',limits:['不要求弃牌前缺少成型牌；再次弃牌不叠加。','下一次合法出牌后消耗，不符合牌型也作废；场末清空。'],rules:['生效牌型为{types}；对子和高牌不算。','计分暂停时不兑现倍率，下一次出牌后仍消耗；返还次数、重载不恢复已消耗救火。'],state:['{reward_progress}'],bindings:{types:types(1),multiplier:binding('definition.hooks[1].operations[0].value')}},
};
