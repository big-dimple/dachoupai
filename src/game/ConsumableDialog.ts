import type {Action,R2RunState} from '../domain/run';
import {HAND_LABELS} from '../content/handLabels';
import {rankLabel,SUITS,SUIT_SYMBOL,type PlayingCard,type Suit} from '../cards/types';
import {R2_HAND_TYPES,type R2HandType} from '../domain/evaluateR2';
import {R2_BASE_SCORES} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {R2_ENHANCEMENTS,R2_TOOLS,R2_TOOL_CATALOG,type R2ToolDefinition} from '../content/r2Tools';
import {R2_JOKERS,type R2JokerInstance} from '../content/r2Schema';
import {getR2Stage,r2ConsumableCapacity,r2HandLimit,r2HandsBudget,R2_RESOURCE_CONTRACT} from '../domain/r2Run';
import {r2PaidRerollPrice,r2Pool,r2ToolAcquisitionPool} from '../domain/r2Shop';
import {r2ToolAllowed,r2ToolSupported} from '../domain/r2ToolRuntime';
import {r2JokerCapacity} from '../domain/r2Resources';
import {DetailDialog} from './DetailDialog';
import {cardSpecialText,editionEffectText,editionLabel,itemInfo,toolInfo} from './r2ToolInfo';

export const SKIP_ITEM_LABELS:Record<string,string>=Object.fromEntries(R2_TOOLS.map(tool=>[tool.id,tool.name]));
const SUIT_NAMES:Record<Suit,string>={spades:'黑桃',hearts:'红桃',clubs:'梅花',diamonds:'方片'};
const cardName=(card:PlayingCard)=>rankLabel(card.rank)+SUIT_SYMBOL[card.suit];
const enhancementName=(card:PlayingCard)=>R2_ENHANCEMENTS.find(enhancement=>enhancement.id===card.enhancement)?.name??'无增强';
function rationalText(value:Rational):string {
  if(value.d===1n)return value.n.toString();
  if(value.n*100n%value.d===0n){const hundredths=value.n*100n/value.d;return `${hundredths/100n}.${String(hundredths%100n).padStart(2,'0')}`.replace(/0+$/,'');}
  return `${value.n}/${value.d}`;
}
function handChange(type:R2HandType,before:number,after:number):string {
  const [heat,mult,heatStep,multStep]=R2_BASE_SCORES[type];
  const multiplier=(level:number)=>rationalText(Rational.fromJSON(mult).add(Rational.fromJSON(multStep).multiply(new Rational(BigInt(level-1)))));
  return `${HAND_LABELS[type]} · Lv.${before} → ${after}\n基础热度 ${heat+heatStep*(before-1)} → ${heat+heatStep*(after-1)}；基础倍率 ${multiplier(before)} → ${multiplier(after)}`;
}
interface Choice {id:string;name:string;detail:string;card?:PlayingCard;joker?:R2JokerInstance}
interface Selection {ids:Set<string>;sacrificeId?:string;handType?:R2HandType;secondaryHandType?:R2HandType;suit?:Suit;targetKind:'card'|'joker'}
const rarePool=(state:R2RunState)=>r2Pool(state.jokers.map(joker=>joker.definitionId),state.safetyNetUsed?['f07']:[]).filter(joker=>joker.rarity==='rare');

/** Public targets and finite guards only; the command remains the final authority. */
function selectionIssue(tool:R2ToolDefinition,state:R2RunState,selection:Selection,known:readonly PlayingCard[],ready:boolean):string|undefined {
  if(!ready)return '当前正在结算或保存，完成后才能使用。';
  if(!r2ToolSupported(tool.id))return '当前局面不支持使用此工具。';
  if(!r2ToolAllowed(state,tool.id))return state.challengeId==='Q06'?'本次挑战禁止免费和付费换牌。':'本次挑战禁止增强牌的获取与赋予。';
  if(!tool.phases.includes(state.phase as 'shop'|'await-input'))return tool.phases.length===1&&tool.phases[0]==='shop'?'请在商店使用。':'请在待出牌时使用。';
  const target=tool.target,operation=tool.operation,limits=R2_TOOL_CATALOG.limits,ids=[...selection.ids];
  const selected=known.filter(card=>selection.ids.has(card.id)),liveCount=state.deckInstances.length-state.destroyedIds.length;
  switch(target.kind){
    case 'cards':case 'card-sacrifice':
      if(ids.length<target.minimum||ids.length>target.maximum)return `请选择 ${target.minimum===target.maximum?target.minimum:`${target.minimum}～${target.maximum}`} 张受益牌。`;
      if(selected.length!==ids.length)return '目标不在当前可见候选中。';
      if(target.kind==='card-sacrifice'){
        if(!known.some(card=>card.id===selection.sacrificeId))return '请选择一张牺牲扑克牌。';
        if(ids.includes(selection.sacrificeId!))return '牺牲牌和受益牌须是不同实例。';
        if(selected.some(card=>card.enhancement!==undefined))return '受益牌必须没有增强；可以保留已有版次。';
      }
      break;
    case 'card-or-joker': {
      if(ids.length!==1)return '请选择一个普通版次的目标。';
      const recipient=selection.targetKind==='card'?selected[0]:state.jokers.find(joker=>joker.instanceId===ids[0]);
      if(!recipient||(recipient.edition??'none')!=='none')return '只有普通版次的目标可以镀影。';break;
    }
    case 'discovered-hand': {
      const type=target.selection==='fixed'&&operation.kind==='upgrade-hand'?operation.handType:selection.handType;
      if(!type||state.handLevels[type]===undefined)return type?`${HAND_LABELS[type]}尚未发现。`:'请选择一个已发现牌型。';
      if(state.handLevels[type]!>=limits.handLevelMaximum)return `已达 Lv.${limits.handLevelMaximum}，不能继续升级。`;break;
    }
    case 'suit':if(!selection.suit)return '请选择全副改造后的花色。';break;
    case 'hand-exchange': {
      const {handType:gain,secondaryHandType:loss}=selection;
      if(!gain||!loss)return '请选择收益牌型和遗忘牌型。';
      if(gain===loss)return '收益与遗忘须为两个不同牌型。';
      if(state.handLevels[gain]===undefined||state.handLevels[loss]===undefined)return '两个牌型都须已发现。';
      if(operation.kind==='exchange-hand-levels'&&(state.handLevels[gain]!>operation.targetMaximumBefore||state.handLevels[loss]!<operation.donorMinimumBefore))return '收益型等级过高或遗忘型等级不足。';break;
    }
    case 'joker-sacrifice': {
      if(!state.jokers.some(joker=>joker.instanceId===selection.sacrificeId))return '请选择牺牲大丑牌。';
      if(ids.length!==1)return '请选择受益大丑牌。';
      if(ids[0]===selection.sacrificeId)return '牺牲牌与受益牌须是不同实例。';
      const recipient=state.jokers.find(joker=>joker.instanceId===ids[0]);
      if(!recipient||recipient.edition===target.excludedEdition)return '受益大丑牌已经是多彩，或不在当前持有牌中。';
      if(state.consumables.length-1>r2ConsumableCapacity({...state,jokers:state.jokers.filter(joker=>joker.instanceId!==selection.sacrificeId)}))return '牺牲后余下库存会超过容量，请先处理库存。';break;
    }
    case 'none':case 'whole-deck':break;
  }
  for(const cost of tool.costs){
    if(cost.kind==='gold'&&state.gold<cost.amount)return `额外需要 ${cost.amount} 金，当前仅 ${state.gold} 金。`;
    if(cost.kind==='all-gold'&&state.gold<cost.minimum)return `至少持有 ${cost.minimum} 金才能孤注。`;
    if(cost.kind==='permanent-hands-penalty'){
      const modifiers={...state.spectralModifiers,handsPenalty:state.spectralModifiers.handsPenalty+cost.amount};
      if(!getR2Stage(state.stageIndex,state.tourMode,state.difficulty))return '已无下一场，无法支付永久出牌代价。';
      if(modifiers.handsPenalty>limits.spectralHandsPenaltyMaximum||r2HandsBudget(state)-r2HandsBudget({...state,spectralModifiers:modifiers})!==cost.amount)return '下一场出牌预算不能再实际减少，请保留此工具。';
    }
    if(cost.kind==='permanent-hand-penalty'){
      const modifiers={...state.spectralModifiers,handPenalty:state.spectralModifiers.handPenalty+cost.amount};
      if(!getR2Stage(state.stageIndex,state.tourMode,state.difficulty))return '已无下一场，无法支付永久手牌代价。';
      if(modifiers.handPenalty>limits.spectralHandPenaltyMaximum||r2HandLimit(state)-r2HandLimit({...state,spectralModifiers:modifiers})!==cost.amount)return '下一场手牌容量不能再实际减少，请保留此工具。';
    }
  }
  switch(operation.kind){
    case 'delete-cards':case 'random-enhancement': {
      const floor=state.longTermItems.includes('U08')?limits.minimalDeckFloor:limits.deckDeletionFloor,removed=operation.kind==='delete-cards'?ids.length:1;
      if(liveCount-removed<floor)return `改造后须至少保留 ${floor} 张有效牌，当前 ${liveCount} 张。`;
      if(state.phase==='await-input'&&state.handOrder.every(id=>operation.kind==='delete-cards'?selection.ids.has(id):id===selection.sacrificeId))return '不能清空当前手牌，需保留可行动的牌。';break;
    }
    case 'copy-card':if(liveCount+operation.copies>limits.deckMaximum)return `复制后有效牌组不能超过 ${limits.deckMaximum} 张。`;break;
    case 'set-suit':if(selected.every(card=>card.suit===operation.suit))return '所选牌已经全部是该花色，没有变化。';break;
    case 'shift-rank':if(selected.every(card=>operation.delta>0?card.rank>=operation.maximum:card.rank<=operation.minimum))return '所选点数全部已达边界，没有变化。';break;
    case 'set-enhancement':if(selected.every(card=>card.enhancement===operation.enhancement))return '所选牌已经全部具有相同增强，没有变化。';break;
    case 'set-deck-suit':if(state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id)).every(card=>card.suit===selection.suit))return '有效牌组已全部是该花色，没有变化。';break;
    case 'restore-discard':
      if(!state.stage||state.stage.discardsLeft>=state.stage.initialDiscards)return '本场弃牌次数已达初始预算，无法恢复。';
      if(state.stage.discardGained+operation.amount>R2_RESOURCE_CONTRACT.discardGainMaximum)return '本场恢复弃牌已达上限，无法再次恢复。';break;
    case 'rare-joker-reward':
      if(state.jokers.length>=r2JokerCapacity(state))return '大丑牌槽已满，请先腾出一个槽位。';
      if(!rarePool(state).length)return '当前没有可获得的未持有稀有大丑牌。';break;
    case 'clear-deck-specials': {
      if(state.spectralModifiers.cleanSlateBonus)return '本局已使用过净台。';
      const modified=state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id)&&(card.enhancement!==undefined||(card.edition??'none')!=='none'));
      if(modified.length<operation.minimumModifiedCards)return `至少 ${operation.minimumModifiedCards} 张不同牌有增强或特殊版次；当前 ${modified.length} 张。`;
      if(!getR2Stage(state.stageIndex,state.tourMode,state.difficulty)||r2HandLimit({...state,spectralModifiers:{...state.spectralModifiers,cleanSlateBonus:state.spectralModifiers.cleanSlateBonus+operation.handBonus}})-r2HandLimit(state)!==operation.handBonus)return '下一场手牌容量不能实际增加，无法净台。';break;
    }
    case 'free-reroll':if(!r2Pool(state.jokers.map(joker=>joker.definitionId),state.safetyNetUsed?['f07']:[]).length&&!r2ToolAcquisitionPool(state).length)return '当前没有可刷新的候选。';break;
    case 'add-gold':if(!Number.isSafeInteger(state.gold+operation.amount))return '金币已达可保存上限，无法继续增加。';break;
    default:break;
  }
}

export function showConsumables(dialog:DetailDialog,state:R2RunState,ready:boolean,send:(action:Action,expectedSeq?:number)=>Promise<boolean>):void {
  const expectedSeq=state.commandSeq;
  const known=(state.phase==='shop'?state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id)):state.phase==='await-input'?state.handOrder.map(id=>state.deckInstances.find(card=>card.id===id)!):[]);
  const cardChoices:Choice[]=known.map((card,index)=>({id:card.id,name:cardName(card),detail:`${enhancementName(card)} · ${editionLabel(card.edition)}\n第 ${index+1} 张`,card}));
  const jokerChoices:Choice[]=state.jokers.map(joker=>({id:joker.instanceId,name:R2_JOKERS.find(definition=>definition.id===joker.definitionId)!.name,detail:`${editionLabel(joker.edition)} · 原支付 ${joker.paidPrice} 金`,joker}));
  const showItem=(id:string)=>{const info=itemInfo(id),d=dialog.open(info.name+' · 长期道具',info.description+'\n\n已持有；本局持续生效，不能出售。',[],{portrait:{url:info.artUrl,alt:info.name,layout:'card',caption:info.name}});d.classList.add('tool-item-detail');};
  const openTool=(instanceId:string)=>{
    const item=state.consumables.find(consumable=>consumable.instanceId===instanceId),definition=item&&R2_TOOLS.find(candidate=>candidate.id===item.definitionId);if(!item||!definition)return;
    const tool=definition;
    const info=toolInfo(tool.id),selection:Selection={ids:new Set(),targetKind:'card'};let busy=false;
    const useAction={label:'确认使用',primary:true,disabled:true,run:async()=>{
      if(busy||selectionIssue(tool,state,selection,known,ready))return;
      const action:Extract<Action,{type:'UseConsumable'}>={type:'UseConsumable',instanceId,targetIds:targetChoices().filter(choice=>selection.ids.has(choice.id)).map(choice=>choice.id)};
      switch(tool.target.kind){
        case 'discovered-hand':if(tool.target.selection==='chosen')action.handType=selection.handType;break;
        case 'card-sacrifice':case 'joker-sacrifice':action.sacrificeId=selection.sacrificeId;break;
        case 'card-or-joker':action.targetKind=selection.targetKind;break;
        case 'suit':action.suit=selection.suit;break;
        case 'hand-exchange':action.handType=selection.handType;action.secondaryHandType=selection.secondaryHandType;break;
        default:break;
      }
      busy=true;refresh();
      try{if(await send(action,expectedSeq))dialog.close(d);else showError('使用未完成。目标选择已保留，请检查保存提示或当前局面后重试。');}
      catch{showError('操作未完成，目标选择已保留，请重试。');}
      finally{busy=false;if(dialog.active(d))refresh();}
    }};
    const destroyAction={label:'销毁物品',disabled:!ready,run:()=>{
      if(busy)return;
      const confirmation=dialog.open('销毁确认',`销毁「${info.name}」后不获得金币。`,[{label:'确认销毁',run:async()=>{
        try{if(await send({type:'DestroyConsumable',instanceId},expectedSeq))dialog.close(confirmation);else {const status=confirmation.querySelector<HTMLParagraphElement>('.dialog-status')!;status.textContent='销毁未完成，请检查保存提示或当前局面后重试。';status.hidden=false;}}
        catch{const status=confirmation.querySelector<HTMLParagraphElement>('.dialog-status')!;status.textContent='销毁未完成，请重试。';status.hidden=false;}
      }}],{closeLabel:'取消'});
    }};
    const d=dialog.open(info.label+' · 使用详情',[info.description,info.cost].join('\n\n'),[useAction,destroyAction],{closeLabel:'取消',portrait:{url:info.artUrl,alt:info.label,layout:'card',caption:info.label}});d.classList.add('tool-detail');
    const panel=document.createElement('section'),preview=document.createElement('p'),hint=document.createElement('p');panel.className='tool-target-panel';preview.className='tool-preview';preview.setAttribute('aria-live','polite');hint.className='tool-validation';hint.setAttribute('role','status');
    const controls:{input:HTMLInputElement;label:HTMLLabelElement;choice:Choice;role:'target'|'donor';maximum:number}[]=[],selects:HTMLSelectElement[]=[];
    const buttons=d.querySelectorAll<HTMLButtonElement>('.dialog-actions button'),confirm=buttons[0],destroy=buttons[1];
    const targetChoices=()=>tool.target.kind==='joker-sacrifice'||tool.target.kind==='card-or-joker'&&selection.targetKind==='joker'?jokerChoices:cardChoices;
    function showError(message:string):void {if(!dialog.active(d))return;const status=d.querySelector<HTMLParagraphElement>('.dialog-status')!;status.textContent=message;status.hidden=false;}
    function gallery(title:string,choices:readonly Choice[],role:'target'|'donor',maximum:number,host=panel):void {
      const field=document.createElement('fieldset'),legend=document.createElement('legend'),grid=document.createElement('div');field.className='tool-target-group';field.setAttribute('aria-label',title);legend.textContent=title;grid.className='tool-choice-grid';field.append(legend,grid);
      if(!choices.length){const empty=document.createElement('p');empty.textContent='当前没有可选对象。';grid.append(empty);}
      for(const choice of choices){
        const label=document.createElement('label'),input=document.createElement('input'),name=document.createElement('strong'),detail=document.createElement('small');label.className='tool-card-option';label.dataset.sourceId=choice.id;
        input.type=role==='donor'||maximum===1?'radio':'checkbox';input.name=`${instanceId}/${role}`;input.value=choice.id;input.setAttribute('aria-label',choice.card&&role==='target'?choice.id:choice.name+' · '+(role==='donor'?'牺牲':'受益'));
        if(choice.card){label.dataset.suit=choice.card.suit;label.dataset.edition=choice.card.edition??'none';label.title=cardSpecialText(choice.card);}else label.dataset.edition=choice.joker?.edition??'none';
        name.textContent=choice.name;detail.textContent=choice.detail;label.append(input,name,detail);grid.append(label);controls.push({input,label,choice,role,maximum});
        input.onchange=()=>{
          if(role==='donor'){selection.sacrificeId=choice.id;selection.ids.delete(choice.id);}
          else if(input.checked){if(maximum===1)selection.ids.clear();if(selection.ids.size<maximum)selection.ids.add(choice.id);}
          else selection.ids.delete(choice.id);refresh();
        };
      }
      host.append(field);
    }
    function handSelect(labelText:string,types:readonly R2HandType[],choose:(type:R2HandType|undefined)=>void,initial?:R2HandType):void {
      const label=document.createElement('label'),name=document.createElement('span'),select=document.createElement('select'),empty=document.createElement('option');label.className='tool-field';name.textContent=labelText;select.setAttribute('aria-label',labelText);empty.value='';empty.textContent=types.length?'请选择':'没有符合条件的已发现牌型';select.append(empty);
      for(const type of types){const option=document.createElement('option');option.value=type;option.textContent=`${HAND_LABELS[type]} · Lv.${state.handLevels[type]}`;select.append(option);}
      select.value=initial??'';choose(initial);select.onchange=()=>{choose(select.value?select.value as R2HandType:undefined);refresh();};selects.push(select);label.append(name,select);panel.append(label);
    }
    const discovered=R2_HAND_TYPES.filter(type=>state.handLevels[type]!==undefined);
    switch(tool.target.kind){
      case 'cards':gallery(state.phase==='shop'?'持久牌组':'当前手牌',cardChoices,'target',tool.target.maximum);break;
      case 'card-sacrifice':gallery('牺牲扑克牌',cardChoices,'donor',1);gallery('受益扑克牌',cardChoices,'target',tool.target.maximum);break;
      case 'card-or-joker': {
        const label=document.createElement('label'),name=document.createElement('span'),select=document.createElement('select'),host=document.createElement('div');label.className='tool-field';name.textContent='改造对象';select.setAttribute('aria-label','改造对象');
        for(const [value,text] of [['card','扑克牌'],['joker','大丑牌']] as const){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
        label.append(name,select);panel.append(label,host);selects.push(select);gallery('普通版次目标',cardChoices,'target',1,host);
        select.onchange=()=>{selection.targetKind=select.value as 'card'|'joker';selection.ids.clear();for(let index=controls.length-1;index>=0;index--)if(controls[index].role==='target')controls.splice(index,1);host.replaceChildren();gallery('普通版次目标',targetChoices(),'target',1,host);refresh();};break;
      }
      case 'discovered-hand':if(tool.target.selection==='chosen'){const types=discovered.filter(type=>state.handLevels[type]!<R2_TOOL_CATALOG.limits.handLevelMaximum);handSelect('升级牌型',types,type=>{selection.handType=type;},types[0]);}break;
      case 'suit': {
        const label=document.createElement('label'),name=document.createElement('span'),select=document.createElement('select'),empty=document.createElement('option');label.className='tool-field';name.textContent='全副花色';select.setAttribute('aria-label','全副花色');empty.value='';empty.textContent='请选择';select.append(empty);
        for(const suit of SUITS){const option=document.createElement('option');option.value=suit;option.textContent=SUIT_SYMBOL[suit]+' '+SUIT_NAMES[suit];select.append(option);}
        select.onchange=()=>{selection.suit=select.value?select.value as Suit:undefined;refresh();};selects.push(select);label.append(name,select);panel.append(label);break;
      }
      case 'hand-exchange':if(tool.operation.kind==='exchange-hand-levels'){const operation=tool.operation;handSelect('收益牌型',discovered.filter(type=>state.handLevels[type]!<=operation.targetMaximumBefore),type=>{selection.handType=type;});handSelect('遗忘牌型',discovered.filter(type=>state.handLevels[type]!>=operation.donorMinimumBefore),type=>{selection.secondaryHandType=type;});}break;
      case 'joker-sacrifice':gallery('牺牲大丑牌',jokerChoices,'donor',1);gallery('受益大丑牌',jokerChoices,'target',1);break;
      case 'whole-deck': {const count=state.deckInstances.filter(card=>!state.destroyedIds.includes(card.id)&&(card.enhancement!==undefined||(card.edition??'none')!=='none')).length;const note=document.createElement('p');note.textContent=`整副有效牌组中 ${count} 张有特殊属性；同一张牌的增强与版次只计一张。`;panel.append(note);break;}
      case 'none':break;
    }
    if(['cards','card-sacrifice','card-or-joker'].includes(tool.target.kind)){const scope=document.createElement('p');scope.className='tool-scope-note';scope.textContent=state.phase==='shop'?'仅展示有效持久牌组；列表为公开选牌顺序，不展示抽牌顺序。':'只展示当前已知手牌，不提供隐藏牌目标。';panel.prepend(scope);}
    const operation=tool.operation;
    if(operation.kind==='random-enhancement'||operation.kind==='random-edition'){
      const probability=document.createElement('p'),total=operation.choices.reduce((sum,choice)=>sum+choice.weight,0);probability.className='tool-public-probability';
      probability.textContent='公开概率：'+operation.choices.map(choice=>`${operation.kind==='random-enhancement'?R2_ENHANCEMENTS.find(enhancement=>enhancement.id===choice.id)!.name:editionLabel(choice.id as 'foil'|'holographic'|'polychrome')} ${choice.weight}/${total}`).join('、')+'。使用后揭晓结果。';panel.append(probability);
    }
    const risks=document.createElement('details'),riskTitle=document.createElement('summary'),riskText=document.createElement('p');risks.className='tool-full-risk';riskTitle.textContent='风险与完整说明';riskText.textContent=info.risk;risks.append(riskTitle,riskText);
    panel.append(preview,hint,risks);d.querySelector('.dialog-content')!.append(panel);
    function refresh():void {
      const issue=selectionIssue(tool,state,selection,known,ready),selected=targetChoices().filter(choice=>selection.ids.has(choice.id));
      for(const control of controls){
        const {input,label,choice,role,maximum}=control;let unavailable=false;
        if(role==='target'){
          unavailable=choice.id===selection.sacrificeId;
          if(tool.target.kind==='card-sacrifice'&&choice.card?.enhancement!==undefined)unavailable=true;
          if(tool.target.kind==='card-or-joker'&&(choice.card?.edition??choice.joker?.edition??'none')!=='none')unavailable=true;
          if(tool.target.kind==='joker-sacrifice'&&choice.joker?.edition===tool.target.excludedEdition)unavailable=true;
          input.checked=selection.ids.has(choice.id);if(maximum>1&&selection.ids.size>=maximum&&!input.checked)unavailable=true;
        }else input.checked=selection.sacrificeId===choice.id;
        input.disabled=busy||unavailable;label.classList.toggle('is-unavailable',unavailable);label.classList.toggle('is-selected',input.checked);
      }
      selects.forEach(select=>{select.disabled=busy;});useAction.disabled=busy||!!issue;destroyAction.disabled=busy||!ready;confirm.disabled=useAction.disabled;destroy.disabled=destroyAction.disabled;
      hint.textContent=busy?'正在提交并保存…':issue??'目标有效。确认后使用物品并支付上述代价。';hint.dataset.valid=String(!issue);
      const lines:string[]=[],operation=tool.operation;
      if(selection.sacrificeId){const donor=(tool.target.kind==='joker-sacrifice'?jokerChoices:cardChoices).find(choice=>choice.id===selection.sacrificeId);if(donor)lines.push(`永久牺牲：${donor.name} · ${donor.detail.replace('\n',' · ')}。不作为出售，不退款。`);}
      if(selected.length)lines.push((tool.target.kind==='card-sacrifice'?'公开受益顺序：':'目标顺序：')+selected.map((choice,index)=>`${index+1}. ${choice.name} · ${choice.detail.replace('\n',' · ')}`).join(' → '));
      for(const choice of selected)if(choice.card){
        if(operation.kind==='set-suit')lines.push(`${cardName(choice.card)} → ${rankLabel(choice.card.rank)}${SUIT_SYMBOL[operation.suit]}；${cardSpecialText(choice.card)}`);
        else if(operation.kind==='shift-rank')lines.push(`${cardName(choice.card)} → ${rankLabel(Math.max(operation.minimum,Math.min(operation.maximum,choice.card.rank+operation.delta)) as PlayingCard['rank'])}${SUIT_SYMBOL[choice.card.suit]}；${cardSpecialText(choice.card)}`);
        else if(operation.kind==='set-enhancement')lines.push(`${cardName(choice.card)}：${enhancementName(choice.card)} → ${R2_ENHANCEMENTS.find(enhancement=>enhancement.id===operation.enhancement)!.name}；${choice.card.enhancement!==undefined&&choice.card.enhancement!==operation.enhancement?'原增强将被替换，其效果不再保留。':'保留其他属性。'}\n当前 ${cardSpecialText(choice.card)}。`);
        else lines.push(`${cardName(choice.card)} · ${cardSpecialText(choice.card)}`);
      }
      for(const choice of selected)if(choice.joker)lines.push(`${choice.name} · ${editionEffectText(choice.joker.edition)}\n${operation.kind==='set-joker-edition'?`版次 → ${editionEffectText(operation.edition)}；原支付 ${choice.joker.paidPrice} 金与已有成长保留。`:'本体、原支付金额与已有成长保留。'}`);
      if(operation.kind==='upgrade-hand'){const type=tool.target.kind==='discovered-hand'&&tool.target.selection==='fixed'?operation.handType:selection.handType;if(type){const level=state.handLevels[type];lines.push(level===undefined?`${HAND_LABELS[type]} · 尚未发现`:level>=R2_TOOL_CATALOG.limits.handLevelMaximum?`${HAND_LABELS[type]} · Lv.${level}（已满级）`:handChange(type,level,level+operation.levels));}}
      if(operation.kind==='exchange-hand-levels'){if(selection.handType)lines.push(handChange(selection.handType,state.handLevels[selection.handType]!,state.handLevels[selection.handType]!+operation.gain));if(selection.secondaryHandType)lines.push('遗忘：'+handChange(selection.secondaryHandType,state.handLevels[selection.secondaryHandType]!,state.handLevels[selection.secondaryHandType]!-operation.loss));}
      for(const cost of tool.costs){
        if(cost.kind==='gold')lines.push(`额外使用代价：${cost.amount} 金；金币 ${state.gold} → ${state.gold-cost.amount}。`);
        if(cost.kind==='all-gold')lines.push(`清空全部金币：${state.gold} → 0。`);
        if(cost.kind==='permanent-hands-penalty')lines.push(`下一场起出牌预算：${r2HandsBudget(state)} → ${r2HandsBudget({...state,spectralModifiers:{...state.spectralModifiers,handsPenalty:state.spectralModifiers.handsPenalty+cost.amount}})}；原牌保留，复制 ${operation.kind==='copy-card'?operation.copies:0} 张。`);
        if(cost.kind==='permanent-hand-penalty')lines.push(`下一场起手牌容量：${r2HandLimit(state)} → ${r2HandLimit({...state,spectralModifiers:{...state.spectralModifiers,handPenalty:state.spectralModifiers.handPenalty+cost.amount}})}；整副 ${state.deckInstances.length-state.destroyedIds.length} 张改为${selection.suit?SUIT_NAMES[selection.suit]:'所选花色'}。`);
      }
      if(operation.kind==='rare-joker-reward'){const pool=rarePool(state);lines.push(`当前公开稀有池：${pool.length?pool.map(joker=>joker.name).join('、'):'无候选'}。${pool.length?`每张概率 1/${pool.length}。`:''}`);}
      if(operation.kind==='clear-deck-specials')lines.push(`所有增强与特殊版次都将清除。下一场起手牌容量：${r2HandLimit(state)} → ${r2HandLimit({...state,spectralModifiers:{...state.spectralModifiers,cleanSlateBonus:state.spectralModifiers.cleanSlateBonus+operation.handBonus}})}。`);
      if(operation.kind==='restore-discard')lines.push(`本场弃牌：${state.stage?.discardsLeft??'尚未入场'} → ${state.stage?Math.min(state.stage.initialDiscards,state.stage.discardsLeft+operation.amount):'须先入场'}；上限为本场初始预算 ${state.stage?.initialDiscards??'待入场确定'}。`);
      if(operation.kind==='add-gold')lines.push(`金币 ${state.gold} → ${state.gold+operation.amount}。`);
      if(operation.kind==='free-reroll')lines.push(state.shop?`本次免费刷新，不扣金币；刷新计数 ${state.shop.rerollCount} → ${state.shop.rerollCount+1}。\n下次收费刷新 ${r2PaidRerollPrice(state)} → ${r2PaidRerollPrice({...state,shop:{...state.shop,rerollCount:state.shop.rerollCount+1}})} 金。长期道具货架保留，不触发成长。`:'请在商店免费刷新货架。');
      preview.textContent=lines.join('\n\n')||'选择目标后，这里会显示变化与代价。';
    }
    refresh();
  };
  const inventory=dialog.open('局内物品',`工具库存 ${state.consumables.length} / ${r2ConsumableCapacity(state)}；长期道具 ${state.longTermItems.length} / ${R2_TOOL_CATALOG.limits.longTermSlots}。查看详情后选择目标并确认使用。`);inventory.classList.add('tool-inventory');
  const content=inventory.querySelector('.dialog-copy')!;
  function inventoryGroup(title:string,entries:readonly {id:string;name:string;label:string;artUrl:string;run:()=>void}[]):void {
    const section=document.createElement('section'),heading=document.createElement('h3'),grid=document.createElement('div');section.className='tool-inventory-group';heading.textContent=title;grid.className='tool-inventory-grid';section.append(heading,grid);
    if(!entries.length){const empty=document.createElement('p');empty.className='tool-empty';empty.textContent=title==='持有工具'?'当前没有工具。':'当前没有长期道具。';grid.append(empty);}
    for(const entry of entries){const button=document.createElement('button'),image=document.createElement('img'),name=document.createElement('strong'),label=document.createElement('span');button.className='tool-inventory-card';button.setAttribute('aria-label',entry.name+' · 查看');button.dataset.itemId=entry.id;image.src=entry.artUrl;image.alt='';image.loading='lazy';name.textContent=entry.name;label.textContent=entry.label;button.append(image,name,label);button.onclick=entry.run;grid.append(button);}
    content.append(section);
  }
  inventoryGroup('持有工具',state.consumables.map(item=>{const info=toolInfo(item.definitionId);return {id:item.instanceId,name:info.name,label:info.label,artUrl:info.artUrl,run:()=>openTool(item.instanceId)};}));
  inventoryGroup('长期道具',state.longTermItems.map(id=>{const info=itemInfo(id);return {id,name:info.name,label:'本局持续生效',artUrl:info.artUrl,run:()=>showItem(id)};}));
}
