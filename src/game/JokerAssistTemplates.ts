import type {JokerPlayerTemplate} from './JokerPlayerCopy';

const binding=(source:string,format='fractionText')=>({source,format});
const value=binding('definition.hooks[0].operations[0].value');
const qualified='两对及以上牌型包括两对、三条、顺子、同花、葫芦、四条、同花顺、五条、同花葫芦、同花五条；对子和高牌不算。';
export const JOKER_ASSIST_TEMPLATES:Readonly<Record<string,JokerPlayerTemplate>>={
 pengci:{main:'主手恰为三条时，本次出牌的倍率 +{value}。',limits:['助攻三条不算；葫芦等其他牌型也不替代三条。'],rules:['只读取主手的实际判型。'],state:[],bindings:{value}},
 a03:{main:'主手为两对及以上牌型时，首张有效计分牌的热度 +{value}。',limits:['只加在首张有效计分牌上；合法重触发时可再次获得。'],rules:[qualified,'停用牌跳过；助攻牌不参与计分，也不触发此效果。'],state:[],bindings:{value}},
 a05:{main:'每次出牌加上已攒的热度；相邻两次主手为同一种两对及以上牌型，结算后再攒 {growth}，最多攒 {cap}。',limits:['新成长从下一手生效，每手结算后最多成长一次；已有成长用于任何牌型；助攻牌型不参与比较。'],rules:[qualified,'首手不成长；对子、高牌或不同牌型中断连续同型。成长随这张大丑牌跨场保留，换场后重新开始连续判断。'],state:['每手热度加成：+{saved_heat}','上一手：{previous_hand_type}'],bindings:{growth:binding('definition.hooks[1].operations[0].value'),cap:binding('definition.hooks[1].operations[0].cap')}},
 a06:{main:'相邻两次主手都为两对及以上牌型且牌型不同，本次出牌的倍率 ×{value}。',limits:['首手、上一手为对子或高牌时不生效；助攻牌型不参与比较。'],rules:[qualified,'只比较相邻两次成功出牌的主手；弃牌不推进上一手记录。'],state:['上一手：{previous_hand_type}'],bindings:{value}},
 a10:{main:'保留的有效 J、Q、K 中，按手牌顺序取首张，使倍率 ×{value}。',limits:['先排除助攻和停用牌，再找首张人头牌；排在它前面的小牌不影响。'],rules:['不限制主手张数。A不算人头牌；持牌版次不计分。此加成发生在持牌阶段。'],state:[],bindings:{value}},
 a11:{main:'主手为葫芦或同花葫芦时，每张有效计分牌再计分 {count} 次。',limits:['助攻牌不触发；停用的主手牌不再计分。'],rules:['再次计分会重算这张牌的点数、增强、版次和逐张加成；角色与整手效果不会重复。','所有额外计分效果合计，每张每手最多再计分 {extra} 次。再次计分不会继续申请再次计分。'],state:[],bindings:{count:binding('definition.hooks[0].operations[0].count','plain'),extra:binding('SCORE_LIMITS.extraRetriggers','plain')}},
 a12:{main:'本场每手主手都不超过 {maximum} 张，过关时额外获得 {gold} 金币。',limits:['助攻牌不计入主手张数；任何一手主手出5张，就失去本场奖励。'],rules:['必须实际出牌并成功过关；失败和跳场不发。主手内的附带牌、停用牌仍计入张数。'],state:[],bindings:{maximum:binding('definition.hooks[0].condition.maximum','plain'),gold:binding('definition.hooks[0].operations[0].amount','plain')}},
};

export const JOKER_ASSIST_COMPACT:Readonly<Record<string,readonly string[]>>={pengci:['主手三条 +2'],a03:['两对及以上首张+15','条件 ›'],a05:['连续同型两对及以上成长','条件 ›'],a06:['连续异型两对及以上×1.5','条件 ›'],a10:['留人头 ×1.25'],a11:['葫芦再计分'],a12:['主手≤4 · +3金']};
