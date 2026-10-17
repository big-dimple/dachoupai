import type {R2RunState} from '../domain/run';
import type {R2Offer} from '../domain/r2Shop';
import {R2_TOOLS} from '../content/r2Tools';
import {r2ToolAllowed} from '../domain/r2ToolRuntime';
import {shopPurchaseReceipt,shopPurchaseReceiptExists,type ShopPurchaseReceipt} from './ShopPurchaseReceipt';

export interface ShopToolContinuation {
  instanceId:string;
  expectedSeq:number;
  next:'targets'|'confirmation'|'later';
  primaryLabel?:string;
  secondaryLabel:'稍后使用';
  status:string;
  scope:string;
}

/** Presentation only. No target, command, carry intent or default selection is created. */
export function shopToolContinuation(run:R2RunState,instanceId:string):ShopToolContinuation|undefined {
  const item=run.consumables.find(c=>c.instanceId===instanceId),tool=item&&R2_TOOLS.find(t=>t.id===item.definitionId);
  if(!tool)return;
  const phase=run.phase==='shop'?'shop':run.phase==='await-input'?'await-input':undefined;
  const allowed=r2ToolAllowed(run,tool.id),canUse=allowed&&!!phase&&tool.phases.includes(phase);
  const requiresTarget=tool.target.kind!=='none'&&tool.target.kind!=='whole-deck'&&!(tool.target.kind==='discovered-hand'&&tool.target.selection==='fixed');
  const next=!canUse?'later':requiresTarget?'targets':'confirmation';
  const scope=tool.target.kind==='whole-deck'||tool.target.kind==='suit'?'整副有效牌组'
    :tool.target.kind==='card-or-joker'?'有效牌组或随身唐宋牌'
    :tool.target.kind==='cards'||tool.target.kind==='card-sacrifice'?run.phase==='shop'?'从当前有效牌组选择':'从当前手牌选择'
    :tool.target.kind==='discovered-hand'?'已发现牌型'
    :tool.target.kind==='hand-exchange'?'两种不同牌型'
    :tool.target.kind==='joker-sacrifice'?'随身唐宋牌':'使用前查看实际变化';
  return {instanceId,expectedSeq:run.commandSeq,next,
    primaryLabel:next==='later'?undefined:next==='targets'?'选择目标':'查看并确认使用',secondaryLabel:'稍后使用',
    status:!allowed?'本模式不可使用，工具仍在工具包':!canUse?'留到可用阶段，工具仍在工具包':'已入工具包 · 尚未使用',
    scope};
}

/** Call after durable publication, with the exact receipt. An offer alone is never acquisition. */
export function shopPurchaseContinuation(run:R2RunState,receipt:ShopPurchaseReceipt):ShopToolContinuation|undefined {
  if(receipt.kind!=='tools'||receipt.commandSeq!==run.commandSeq||!shopPurchaseReceiptExists(receipt,run))return;
  return shopToolContinuation(run,receipt.id);
}

export function shopToolPurchaseContinuation(before:R2RunState,after:R2RunState,offer:R2Offer):{receipt:ShopPurchaseReceipt;continuation:ShopToolContinuation}|undefined {
  if(before.runId!==after.runId||before.phase!=='shop'||after.phase!=='shop')return;
  const receipt=shopPurchaseReceipt(before,after,'tools',offer);
  const continuation=receipt&&shopPurchaseContinuation(after,receipt);
  if(receipt&&continuation)return {receipt,continuation};
}
