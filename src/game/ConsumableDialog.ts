import type {Action,R2RunState} from '../domain/run';
import {HAND_LABELS} from '../content/handLabels';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {R2_SKIP_CONSUMABLES} from '../domain/r2Chapter';
import {DetailDialog} from './DetailDialog';

export const SKIP_ITEM_LABELS:Record<string,string>={T01:'练一招',T03:'红桃染',T04:'方片染',T05:'梅花染',T06:'黑桃染',T17:'再想想'};
export function showConsumables(dialog:DetailDialog,state:R2RunState,ready:boolean,send:(action:Action)=>Promise<boolean>):void {
  const openItem=(instanceId:string)=>{
    const item=state.consumables.find(c=>c.instanceId===instanceId)!;let targets:string[]=[];let handType:keyof typeof HAND_LABELS|undefined;
    const levels=Object.keys(state.handLevels).filter(t=>state.handLevels[t as keyof typeof HAND_LABELS]!<30) as (keyof typeof HAND_LABELS)[];
    const dye=['T03','T04','T05','T06'].includes(item.definitionId),enabled=ready&&R2_SKIP_CONSUMABLES.some(id=>id===item.definitionId)&&(item.definitionId==='T01'?levels.length>0:item.definitionId==='T17'?state.phase==='await-input'&&state.stage!.discardsLeft<3:true);
    const text=dye?'选择1～3张牌改花色。确认前不消耗物品；没有变化的选择会拒绝。':item.definitionId==='T01'?'选择已实际打出的牌型，提升1级；上限30级。尚未发现或已满级者不能选。':`恢复1次弃牌，上限3；不清除本场用过弃牌的记录。当前 ${state.stage?.discardsLeft??'尚未入场'}。`;
    const d=dialog.open((SKIP_ITEM_LABELS[item.definitionId]??item.definitionId)+' · 使用详情',text,[
      {label:'确认使用',disabled:!enabled,run:async()=>{if(await send({type:'UseConsumable',instanceId,targetIds:targets,...(handType?{handType}:{})}))dialog.close(d);}},
      {label:'销毁物品',disabled:!ready,run:()=>{const c=dialog.open('销毁确认','物品不会自动出售，销毁后不获得金币。',[{label:'确认销毁',run:async()=>{if(await send({type:'DestroyConsumable',instanceId}))dialog.close(c);}}]);}},
    ]);
    const content=d.querySelector('p')!,confirm=d.querySelector<HTMLButtonElement>('.dialog-actions button')!;
    if(item.definitionId==='T01'&&levels.length){const select=document.createElement('select');select.setAttribute('aria-label','升级牌型');for(const t of levels){const o=document.createElement('option');o.value=t;o.textContent=HAND_LABELS[t]+' · 等级 '+state.handLevels[t];select.append(o);}handType=levels[0];select.onchange=()=>{handType=select.value as typeof handType;};content.after(select);}
    if(dye){const box=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=state.phase==='shop'?'已知持久牌组（不展示抽牌顺序）':'当前手牌';box.append(legend);confirm.disabled=true;
      const cards=(state.phase==='shop'?state.deckInstances.filter(c=>!state.destroyedIds.includes(c.id)):state.handOrder.map(id=>state.deckInstances.find(c=>c.id===id)!));
      const suit=({T03:'hearts',T04:'diamonds',T05:'clubs',T06:'spades'} as const)[item.definitionId as 'T03'|'T04'|'T05'|'T06'];
      for(const card of cards){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=card.id;input.setAttribute('aria-label',card.id);label.style.minHeight='44px';label.style.display='flex';label.style.alignItems='center';label.style.gap='8px';label.append(input,document.createTextNode(rankLabel(card.rank)+SUIT_SYMBOL[card.suit]));box.append(label);input.onchange=()=>{targets=[...box.querySelectorAll<HTMLInputElement>('input:checked')].map(i=>i.value);if(targets.length>3){input.checked=false;targets=targets.filter(id=>id!==input.value);}confirm.disabled=!enabled||!targets.length||!cards.some(c=>targets.includes(c.id)&&c.suit!==suit);};}
      content.after(box);
    }
  };
  dialog.open('局内物品',`库存 ${state.consumables.length} / 2。正场跳过的公开奖励会进入此处；点击物品查看效果，再确认使用或销毁。`,state.consumables.map(c=>({label:(SKIP_ITEM_LABELS[c.definitionId]??c.definitionId)+' · 查看',run:()=>openItem(c.instanceId)})));
}
