import type {CharacterId} from './characters';
import type {BuildFocus} from './BuildJourney';
import {heroSignature} from './HeroSignature';
import {openingRouteDemo} from './OpeningRouteDemo';

export interface OpeningPlaySample {
 tag:string;before:{label:string;cards:string[];marked:number[]};after:{label:string;cards:string[];marked:number[]};result:string;cost:string;
}
/** Authored, public examples only. No run, RNG, command, predicted score or reward. */
export function heroPlaySample(id:CharacterId):OpeningPlaySample {
 const s=heroSignature(id);
 const samples:Record<CharacterId,Omit<OpeningPlaySample,'tag'>>={
  amo:{before:{label:'主手两对 · 红框是助攻对子',cards:['7♠','7♥','Q♣','Q♦','3♠','3♥'],marked:[4,5]},after:{label:'副组消耗 · 主手仍是两对',cards:['7♠','7♥','Q♣','Q♦'],marked:[]},result:s.beats[2].result,cost:'副组不计主手、不能留手 · 本场一次'},
  touye:{before:{label:'选1–5张待弃 → 押未成的两对',cards:['7♠','7♥','Q♣','5♦','9♣','2♥','4♣','K♦'],marked:[3,4,5,6,7]},after:{label:'确认补牌 → 只赌下一手（非必中）',cards:['7♠','7♥','Q♣','Q♦','3♥','5♣','8♦','A♠'],marked:[3,4,5,6,7]},result:'成 '+s.beats[2].result.replace(' ／ ',' · 未成 '),cost:'本场一次 · 押后不能再弃、用工具或调大丑牌'},
  laohuan:{before:{label:'弃1张 → 看3张候选',cards:['7♠','9♥','Q♣'],marked:[0]},after:{label:'点选7♠ → 只补回1张',cards:['7♠'],marked:[0]},result:'多看最多2张 · 自己选',cost:s.cost+' · 未留候选本场不抽'},
  erxiang:{before:{label:'对子以上 → 点红框8交棒',cards:['8♠','8♥'],marked:[0]},after:{label:'仍计这张牌 · 普通热度转倍率',cards:['8♠','8♥'],marked:[0]},result:s.beats[2].result,cost:'失去这张普通热度 · 增强／版次保留 · 本场一次'},
  azao:{before:{label:'先出两对 → 存1层',cards:['7♠','7♥','Q♣','Q♦'],marked:[]},after:{label:'再出三条 → 换型存2层',cards:['7♠','7♥','7♣'],marked:[2]},result:'再一手释放 '+s.beats[2].result,cost:'重复不放／对子／高牌会清空 · 最高3层'},
  xiemu:{before:{label:'先留10金 · 两对以上才可燃',cards:['7♠','7♥','Q♣','Q♦'],marked:[]},after:{label:'出牌前燃10金 → 示例余0金',cards:['7♠','7♥','Q♣','Q♦'],marked:[0,1,2,3]},result:s.beats[2].result,cost:'真扣金、影响持币与利息 · 本场一次'},
 };
 return {tag:s.tag,...samples[id]};
}
export function routePlaySample(focus:BuildFocus,id:CharacterId):OpeningPlaySample {
 const d=openingRouteDemo(focus,id);
 const pairs={
  group:{before:{label:'差一个7 → 用往下挪',cards:['7♠','8♥','Q♣','Q♦'],marked:[1]},after:{label:'8♥降为7♥ → 凑成两对',cards:d.shape,marked:[1]}},
  straight:{before:{label:'差一个6 → 往下挪两张',cards:['3♠','4♥','5♣','7♦','8♠'],marked:[3,4]},after:{label:'7、8各降1 → 接成顺子',cards:d.shape,marked:[3,4]}},
  flush:{before:{label:'差两张红桃 → 用红桃染',cards:['3♥','5♠','8♥','Q♣','A♥'],marked:[1,3]},after:{label:'点数保留 → 五张同花色',cards:d.shape,marked:[1,3]}},
 };
 return {tag:'做牌',...pairs[focus],result:d.payoff,cost:'买工具再选目标 · 原价格／次数 · 进店仍能换路线'};
}
