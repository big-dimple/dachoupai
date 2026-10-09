import type {CharacterId} from './characters';
import {characterForNewRun} from './CharacterRunCopy';
import {R2_ASSIST_CONTRACT} from '../domain/r2AssistIdentity';
import {R2_AZAO_CHARGE_CONTRACT,R2_XIEMU_BURN_CONTRACT,R2_TOUYE_WAGER_CONTRACT,R2_LAOHUAN_REFILL_CONTRACT} from '../domain/r2GroupUpgrade';
import {ordinaryCardPoints} from '../domain/r2ErxiangHandoff';
export interface SignatureBeat {label:string;cards:string[];result:string}
/** Educational public rule examples: no RNG, hypothetical total, run, reward or command. */
export function heroSignature(id:CharacterId){
 const signatures:Record<CharacterId,{tag:string;cost:string;beats:SignatureBeat[]}>= {
  amo:{tag:'主手＋助攻',cost:'副组真消耗 · 本场一次',beats:[{label:'先成主手',cards:['7♠','7♥','Q♣','Q♦'],result:'两对及以上'},{label:'剩牌助攻',cards:['3♠','3♥'],result:'再搭一组'},{label:'一起撑场',cards:[],result:'对子 ×'+R2_ASSIST_CONTRACT.pair}]},
  touye:{tag:'弃前赌约',cost:'赌下一手 · 押后不能再弃',beats:[{label:'押未成目标',cards:['7♠','7♥','Q♣'],result:'弃牌前约定'},{label:'真弃再找',cards:['Q♦'],result:'下手结算'},{label:'成／未成',cards:[],result:'×'+R2_TOUYE_WAGER_CONTRACT.success+' ／ ×'+R2_TOUYE_WAGER_CONTRACT.failure}]},
  laohuan:{tag:'戏法择牌',cost:'照付弃牌成本 · 本场一次',beats:[{label:'先弃1张',cards:['3♠'],result:'真实弃牌'},{label:'多看候选',cards:['7♠','9♥','Q♣'],result:'最多多看'+R2_LAOHUAN_REFILL_CONTRACT.extra+'张'},{label:'自己留1张',cards:['7♠'],result:'其余本场不抽'}]},
  erxiang:{tag:'点数交棒',cost:'普通点数不计热度 · 本场一次',beats:[{label:'先有对子',cards:['8♠','8♥'],result:'对子及以上'},{label:'选8交棒',cards:['8♠'],result:'普通点数转移'},{label:'接住倍率',cards:[],result:'+ '+ordinaryCardPoints({id:'example',rank:8,suit:'spades'})+' 倍率'}]},
  azao:{tag:'换型蓄势',cost:'重复不放会清空 · 最高3层',beats:[{label:'两对蓄势',cards:['7♠','7♥','Q♣','Q♦'],result:'存1层'},{label:'换三条',cards:['7♠','7♥','7♣'],result:'再蓄到2层'},{label:'下手释放',cards:[],result:'2层 ×'+R2_AZAO_CHARGE_CONTRACT.tiers[1]}]},
  xiemu:{tag:'留钱／燃金',cost:'两对起 · 真扣金 · 每场一次',beats:[{label:'经营存钱',cards:[],result:'先留'+R2_XIEMU_BURN_CONTRACT.costs[0]+'金'},{label:'出牌前燃金',cards:['7♠','7♥','Q♣','Q♦'],result:'扣'+R2_XIEMU_BURN_CONTRACT.costs[0]+'金'},{label:'关键手兑现',cards:[],result:'角色 ×'+R2_XIEMU_BURN_CONTRACT.multipliers[0]}]},
 };
 return {...signatures[id],ability:characterForNewRun(id)};
}
