import type {CharacterId} from './characters';
import {characterForNewRun} from './CharacterRunCopy';
import {R2_ASSIST_CONTRACT} from '../domain/r2AssistIdentity';
import {R2_AZAO_CHARGE_CONTRACT,R2_XIEMU_BURN_CONTRACT,R2_TOUYE_WAGER_CONTRACT,R2_LAOHUAN_REFILL_CONTRACT} from '../domain/r2GroupUpgrade';
import {ordinaryCardPoints} from '../domain/r2ErxiangHandoff';
export interface SignatureBeat {label:string;cards:string[];result:string}
/** Educational public rule examples: no RNG, hypothetical total, run, reward or command. */
export function heroSignature(id:CharacterId){
 const signatures:Record<CharacterId,{cost:string;beats:SignatureBeat[]}>= {
  amo:{cost:'副组真消耗 · 本场一次',beats:[{label:'先成主手',cards:['7♠','7♥','Q♣','Q♦'],result:'两对及以上'},{label:'剩牌助攻',cards:['3♠','3♥'],result:'再搭一组'},{label:'一起出牌',cards:[],result:'对子 ×'+R2_ASSIST_CONTRACT.pair}]},
  touye:{cost:'赌下一手 · 押后不能再弃',beats:[{label:'先定目标',cards:['7♠','7♥','Q♣'],result:'已成型也能押'},{label:'真弃补新牌',cards:['Q♦'],result:'用新摸的牌成型'},{label:'达约／未达约',cards:[],result:'×'+R2_TOUYE_WAGER_CONTRACT.success+' ／ ×'+R2_TOUYE_WAGER_CONTRACT.failure}]},
  laohuan:{cost:'照付弃牌成本 · 本场一次',beats:[{label:'先弃1张',cards:['3♠'],result:'真实弃牌'},{label:'多看候选',cards:['7♠','9♥','Q♣'],result:'最多多看'+R2_LAOHUAN_REFILL_CONTRACT.extra+'张'},{label:'自己留1张',cards:['7♠'],result:'其余本场不抽'}]},
  erxiang:{cost:'普通点数不计热度 · 本场一次',beats:[{label:'先有对子',cards:['8♠','8♥'],result:'对子及以上'},{label:'选择8作计分牌',cards:['8♠'],result:'普通点数转移'},{label:'接住倍率',cards:[],result:'+ '+ordinaryCardPoints({id:'example',rank:8,suit:'spades'})+' 倍率'}]},
  azao:{cost:'同牌型未释放则清空 · 最高3层',beats:[{label:'两对蓄势',cards:['7♠','7♥','Q♣','Q♦'],result:'存1层'},{label:'换三条',cards:['7♠','7♥','7♣'],result:'再蓄到2层'},{label:'下手释放',cards:[],result:'2层 ×'+R2_AZAO_CHARGE_CONTRACT.tiers[1]}]},
  xiemu:{cost:'两对起 · 真扣金 · 每场一次',beats:[{label:'经营存钱',cards:[],result:'先留'+R2_XIEMU_BURN_CONTRACT.costs[0]+'金'},{label:'出牌前选支付档',cards:['7♠','7♥','Q♣','Q♦'],result:'扣'+R2_XIEMU_BURN_CONTRACT.costs[0]+'金'},{label:'关键手兑现',cards:[],result:'角色 ×'+R2_XIEMU_BURN_CONTRACT.multipliers[0]}]},
 };
 const ability=characterForNewRun(id);return {...signatures[id],tag:ability.passiveName,ability};
}
