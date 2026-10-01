import {SUIT_SYMBOL} from '../cards/types';
import {r2DisabledCards,r2OrdinarySuppression} from '../domain/r2Chapter';
import {r2DiscardCost} from '../domain/r2Run';
import type {R2RunState} from '../domain/run';

export type StageNoticeInput=Pick<R2RunState,'phase'|'stage'|'stageIndex'|'boss'|'handOrder'|'deckInstances'>;
export interface StageNotice {
  stageIndex:number;
  title:string;
  description:string;
  symbol:string;
  warning:boolean;
  discardCost:number;
  disabledCardIds:readonly string[];
  ordinarySuppressedIds:readonly string[];
}

/** Presentation of the entered stage only; chapter forecasts never disable current cards. */
export function stageNotice(run:StageNoticeInput,selectedIds:readonly string[]=[]):StageNotice|undefined {
  const stage=run.stage;
  if(run.phase!=='await-input'||!stage)return;
  const index=stage.index,discardCost=r2DiscardCost(run),normal:StageNotice={
    stageIndex:index,title:(index%3===0?'暖场':'正场')+' · 正常计分',description:'本场没有压轴限制。',symbol:'○',warning:false,discardCost,
    disabledCardIds:[],ordinarySuppressedIds:[],
  };
  if(index%3!==2)return normal;
  const hand=run.handOrder.map(id=>run.deckInstances.find(card=>card.id===id)!);
  const notice:StageNotice={...normal,warning:true,symbol:'!',disabledCardIds:r2DisabledCards(run.boss,index,hand),ordinarySuppressedIds:r2OrdinarySuppression(run.boss,index,hand,selectedIds)};
  switch(run.boss.definitionId){
    case 'B01':
      return {...notice,title:'贵宾场 · 弃牌耗'+discardCost+'次',description:discardCost===2?'第一手前，每次弃牌消耗2次额度。':'第一手已打出，每次弃牌消耗1次额度。',symbol:discardCost===2?'×2':'○',warning:discardCost===2};
    case 'B02':
      return {...notice,title:'低调点 · 第4/5张无普通点数',description:'按手牌顺序计算所出牌；第4/5张仍组成牌型，明确的大丑牌效果正常。',symbol:'4/5'};
    case 'B03': {
      const suit=run.boss.disabledSuit?SUIT_SYMBOL[run.boss.disabledSuit]:'公开花色';
      return {...notice,title:'单色灯 · '+suit+'失效',description:'本场'+suit+'不加点数或计分牌效果，仍参与牌型。',symbol:suit};
    }
    case 'B04':
      return {...notice,title:'素颜场 · J/Q/K失效',description:'J/Q/K不加点数或计分牌效果；A正常，失效人头仍可凑牌型。',symbol:'JQK'};
  }
}
