import {SUIT_SYMBOL} from '../cards/types';
import {HAND_LABELS} from '../content/handLabels';
import {r2JokerDefinitionsForContext} from '../domain/r2ContentProfiles';
import {R2_BOSSES,r2DisabledCards,r2OrdinarySuppression} from '../domain/r2Chapter';
import {r2DiscardCost} from '../domain/r2Run';
import type {R2RunState} from '../domain/run';
import {r2ScoringDisabledJokerIds} from '../domain/scoreR2';
import {heatText} from './scoreText';

export type StageNoticeInput=Pick<R2RunState,'phase'|'stage'|'stageIndex'|'boss'|'handOrder'|'deckInstances'>&Partial<Pick<R2RunState,'jokers'|'challengeId'|'contentVersion'|'contentHash'>>;
export interface StageNotice {
  stageIndex:number;
  title:string;
  description:string;
  details:string;
  symbol:string;
  warning:boolean;
  discardCost:number;
  disabledCardIds:readonly string[];
  ordinarySuppressedIds:readonly string[];
  disabledJokerIds:readonly string[];
  wagerDisabled:boolean;
  jokerScoreDirection:'left-to-right'|'right-to-left';
  discardGoldCost:number;
  targetIncreasePerDiscard:string;
}

/** Presentation of the entered stage only; chapter forecasts never disable current cards. */
function enteredNotice(run:StageNoticeInput,selectedIds:readonly string[]=[]):StageNotice|undefined {
  const stage=run.stage;
  if(run.phase!=='await-input'||!stage)return;
  const index=stage.index,discardCost=r2DiscardCost(run),normal:StageNotice={
    stageIndex:index,title:['暖场','正场','压轴'][index%3]+' · 正常计分',description:'本场没有压轴限制。',details:'本场没有压轴限制，按当前牌型和有效来源正常计分。',symbol:'○',warning:false,discardCost,
    disabledCardIds:[],ordinarySuppressedIds:[],
    disabledJokerIds:[],wagerDisabled:false,jokerScoreDirection:'left-to-right',discardGoldCost:0,targetIncreasePerDiscard:'0',
  };
  const boss=stage.boss;
  if(index%3!==2||!boss)return normal;
  const definition=R2_BOSSES.find(definition=>definition.id===boss.definitionId)!;
  const stoppedScope=['B06','B15','B16'].includes(boss.definitionId)
    ?'\n封禁只影响计分和版次，计分概率不判定；静态、经济、非数学成长和寿命仍有效，未执行的待用热度不消耗。':'';
  const hand=run.handOrder.map(id=>run.deckInstances.find(card=>card.id===id)!);
  const notice:StageNotice={...normal,warning:true,symbol:'!',details:definition.rule+stoppedScope+'\n\n应对：'+definition.response,
    disabledCardIds:r2DisabledCards(boss,index,hand),ordinarySuppressedIds:r2OrdinarySuppression(boss,index,hand,selectedIds),
    disabledJokerIds:r2ScoringDisabledJokerIds(boss,run.jokers??[],r2JokerDefinitionsForContext(run),stage.sealedJokerIds)};
  switch(boss.definitionId){
    case 'B01':
      return {...notice,title:'贵宾场 · 弃牌耗'+discardCost+'次',description:discardCost===2?'第一手前，每次弃牌消耗2次额度。':'第一手已打出，每次弃牌消耗1次额度。',symbol:discardCost===2?'×2':'○',warning:discardCost===2};
    case 'B02':
      return {...notice,title:'低调点 · 第4/5张无普通点数',description:'按手牌顺序计算所出牌；第4/5张仍组成牌型，明确的大丑牌效果正常。',symbol:'4/5'};
    case 'B03': {
      const suit=boss.disabledSuit?SUIT_SYMBOL[boss.disabledSuit]:'公开花色';
      return {...notice,title:'单色灯 · '+suit+'失效',description:'本场'+suit+'不加点数或计分牌效果，仍参与牌型。',details:'本场公开花色：'+suit+'。\n'+notice.details,symbol:suit};
    }
    case 'B04':
      return {...notice,title:'素颜场 · J/Q/K失效',description:'J/Q/K不加点数或计分牌效果；A正常，失效人头仍可凑牌型。',symbol:'JQK'};
    case 'B05': {
      const previous=stage.previousHandType?HAND_LABELS[stage.previousHandType]:null;
      return {...notice,title:'回音墙 · '+(previous?'再出'+previous+'基础½':'首手不减半'),
        description:'重复上手牌型时，等级后的基础热度减半；牌点数、增强和大丑牌热度正常。',
        details:(previous?'上手牌型：'+previous+'。\n':'本场尚未出牌。\n')+notice.details,symbol:'½'};
    }
    case 'B06':
      return {...notice,title:'半边灯 · 第2/4槽计分停用',description:'可把关键计分牌移到第1/3/5槽；静态、经济和非数学成长仍正常。',symbol:'2/4'};
    case 'B07':
      return {...notice,title:'验票员 · 弃牌先付1金',description:'每次弃牌另扣1金；金币不足仍可正常出牌。',discardGoldCost:1,symbol:'−1金'};
    case 'B08':
      return {...notice,title:'静场 · 角色计分/押注停用',description:'角色初始等级与非计分过关奖励保留；用牌型、增强和大丑牌计分。',wagerDisabled:true,symbol:'静'};
    case 'B09':
      return {...notice,title:'快板 · 出牌−1',description:'本场初始'+stage.initialHands+'次出牌，最低2次；返手和救场按原规则执行。',symbol:'−1次'};
    case 'B10':
      return {...notice,title:'小舞台 · 手牌−2',description:'本场手牌上限'+stage.handLimit+'张，最低5张；入场预算固定。',symbol:'−2张'};
    case 'B11':
      return {...notice,title:'谢客 · 手牌上限'+stage.handLimit,description:'每次出牌后容量减1，最低5张；只影响补牌，不额外删除持牌。',symbol:'↓'};
    case 'B12':
      return {...notice,title:'挑剔 · 基础热度½',description:'牌型等级先算基础再减半；牌点数、增强和大丑牌热度正常。',symbol:'½'};
    case 'B13':
      return {...notice,title:'逆着来 · 大丑牌计分右→左',description:'本体与本槽版次一起反序；计分牌、持牌和成长时点顺序不变。',jokerScoreDirection:'right-to-left',symbol:'←'};
    case 'B14': {
      const amount=((BigInt(stage.initialTargetHeat)+19n)/20n).toString(),label=heatText(amount);
      return {...notice,title:'催场 · 弃牌目标+'+label,description:'每次成功弃牌固定+'+label+'目标；返还额度也算一次，不复利。',
        details:'本场每次增加'+label+'热度，按初始目标'+heatText(stage.initialTargetHeat)+'计算。\n'+notice.details,targetIncreasePerDiscard:amount,symbol:'+5%'};
    }
    case 'B15':
      return {...notice,title:'逐个谢幕 · 已封禁'+notice.disabledJokerIds.length+'张',description:'每手后封最左未封禁实例；调序只改变下一位，静态与经济仍有效。',
        details:'结算和寿命销毁后封禁下一实例，下一手生效，本场结束解除。\n'+notice.details,symbol:'封'};
    case 'B16':
      return {...notice,title:'不吃名气 · 稀有计分停用',description:'稀有牌的计分、版次与计分概率停用；静态、经济、成长和寿命正常。',symbol:'R×'};
  }
}

export function stageNotice(run:StageNoticeInput,selectedIds:readonly string[]=[]):StageNotice|undefined {
  let notice=enteredNotice(run,selectedIds);if(!notice||!run.stage)return;
  if(run.challengeId==='Q01')notice={...notice,warning:true,wagerDisabled:true,
    title:notice.warning?notice.title+' · 被动关闭':'本色演出 · 角色被动关闭',
    description:'本次挑战关闭角色被动与押注。'+(notice.warning?notice.description:''),
    details:'本次挑战关闭角色被动、初始牌型等级赠送和押注；角色身份保留。\n\n'+notice.details};
  const ban=run.stage.challengeDisabledJokerId;
  if(ban){
    const name=r2JokerDefinitionsForContext(run).find(row=>row.id===ban)!.name;
    notice={...notice,warning:true,symbol:'封',title:notice.warning?notice.title+' · 封角':'封角 · '+name+'计分停用',
      description:notice.description+' 本章'+name+'的计分与版次停用。',
      details:'本章公开封角：'+name+'。仅暂停计分和版次，静态、经济、非数学生命周期仍正常。\n\n'+notice.details,
      disabledJokerIds:r2ScoringDisabledJokerIds(run.stage.boss,run.jokers??[],r2JokerDefinitionsForContext(run),run.stage.sealedJokerIds,ban)};
  }
  return notice;
}
