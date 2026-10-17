import {SUIT_SYMBOL,type Suit} from '../cards/types';
import {getR2Stage} from '../domain/r2Run';
import {R2_BOSSES,type R2BossPlan,type R2TourMode} from '../domain/r2Chapter';

const suitNames:Record<Suit,string>={spades:'黑桃',hearts:'红桃',clubs:'梅花',diamonds:'方片'};
/** Text and glyph together keep the locked parameter identifiable on both renderers. */
export function stageSuitLabel(suit:Suit):string {return suitNames[suit]+' '+SUIT_SYMBOL[suit];}
export function bossIdentity(boss:R2BossPlan):string {
 const name=R2_BOSSES.find(row=>row.id===boss.definitionId)!.name;
 return name+(boss.disabledSuit?' · '+stageSuitLabel(boss.disabledSuit):'');
}
/** Short public scope only; no draw, score prediction or recomputed result. */
export function bossScope(boss:R2BossPlan):string {
 switch(boss.definitionId){
  case 'B01':return '首手前每次弃牌耗2次，之后每次耗1次';
  case 'B02':return '第4/5张仅普通点数0；仍成型、触发唐宋牌';
  case 'B03':return stageSuitLabel(boss.disabledSuit!)+'不加点数或计分牌效果；仍成型';
  case 'B04':return 'J/Q/K计分失效；仍成型，A正常';
  case 'B05':return '连续同牌型仅牌型基础热度减半';
  case 'B06':return '第2/4槽唐宋牌计分与版次停用';
  case 'B07':return '每次弃牌先花1金；无钱仍可出牌';
  case 'B08':return '角色计分能力与押注停用';
  case 'B09':return '入场出牌次数−1，最低2次';
  case 'B10':return '入场手牌上限−2，最低5张';
  case 'B11':return '每手后补牌上限−1，最低5张；不删持牌';
  case 'B12':return '仅牌型基础热度减半；其他热度正常';
  case 'B13':return '整手唐宋牌计分与本槽版次从右到左';
  case 'B14':return '每次弃牌增加初始目标5%，向上取整不复利';
  case 'B15':return '每手后封禁最左未封唐宋牌的计分';
  case 'B16':return '稀有唐宋牌计分与版次停用';
 }
}
export function stageIdentity(index:number,boss:R2BossPlan|null,tourMode:R2TourMode='normal',difficulty=0,identity:{contentVersion?:unknown;contentHash?:unknown}={}){
 const spec=getR2Stage(index,tourMode,difficulty,identity);if(!spec)return;
 const isBoss=index%3===2&&!!boss;
 return {stageName:spec.name,title:isBoss?bossIdentity(boss):['暖场','正场','压轴'][index%3],scope:isBoss?bossScope(boss):'按当前牌型与来源正常计分',isBoss};
}
