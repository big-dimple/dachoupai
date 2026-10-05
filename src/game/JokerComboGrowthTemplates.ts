import type {JokerPlayerTemplate} from './JokerPlayerCopy';
const binding=(source:string,format='fractionText')=>({source,format});
const qualified='两对及以上包括两对、三条、顺子、同花、葫芦、四条、同花顺、五条、同花葫芦、同花五条；对子和高牌不算。';
export const JOKER_COMBO_GROWTH_TEMPLATES:Readonly<Record<string,JokerPlayerTemplate>>={
 a06:{main:'主手为两对及以上牌型时，本次出牌的倍率乘当前系数（初始×{initial}）。每场首次连续两次主手均两对及以上且牌型不同，结算后系数再×{factor}。',limits:['新系数下一次出牌才生效，每场只长一次；致胜手也可成长。'],rules:[qualified,'已有系数跨场保留，最多×{cap}；进场重置成长次数与上一手判断，不跨场接首手。','同型、对子或高牌不增长，也不清零已有系数。计分封禁不阻止成长；售出重买从初始值开始。'],state:['当前系数：×{saved_coefficient}','上一手：{previous_hand_type}'],bindings:{initial:binding('definition.hooks[1].operations[0].initial'),factor:binding('definition.hooks[1].operations[0].value'),cap:binding('definition.hooks[1].operations[0].cap')}},
 f10:{main:'本场未出牌，第一次成功弃牌前手牌凑不出两对及以上时，备好一次救火；下一次出牌若为两对及以上，本次出牌的倍率×{factor}。',limits:['下一次出牌后必消耗：未成型或计分被封禁也作废；继续弃牌不叠加、不重武装。'],rules:[qualified,'只看弃牌前当前公开手牌；四张顺子／同花规则参与判断。停用牌仍按原判型规则参与成型。','先出高牌也会失去本场启动机会；返还弃牌不抹除成功弃牌次数。场末清空。'],state:[],bindings:{factor:binding('definition.hooks[1].operations[0].value')}},
 d12:{main:'用两对及以上牌型过关，且实际保留至少{minimum}张牌时，每张保留牌给1金，最多{cap}金。',limits:['按致胜手补牌前实际保留的牌计算；主手、附带牌和助攻消费的牌不算。'],rules:[qualified,'停用但确实留下的牌仍算；每次实际过关只发一次，失败和跳场不发。','计分封禁不暂停此过关收入。'],state:[],bindings:{minimum:binding('definition.hooks[0].operations[0].minimum','plain'),cap:binding('definition.hooks[0].operations[0].cap','plain')}},
 e04:{main:'成功过关时，按领取所有过关奖励前的金币，每{divisor}金额外给1金，最多{cap}金。',limits:['小费盒、留点悬念、金纸和本次过关奖励不增加这笔收入的本金。'],rules:['这是独立过关收入，不再增加利息上限；普通利息与利息簿沿原规则。','实际花钱会降低本金；每次过关只发一次，失败和跳场不发。计分封禁不暂停此收入。'],state:[],bindings:{divisor:binding('definition.hooks[0].operations[0].divisor','plain'),cap:binding('definition.hooks[0].operations[0].cap','plain')}},
};
