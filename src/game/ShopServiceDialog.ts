import {DetailDialog} from './DetailDialog';

/** Supplied by the authoritative service adapter, including discounts and shared quota. */
export interface ShopServiceQuote {
  title:string;price:number;goldBefore:number;goldAfter:number;effect:string;quota:string;unavailable?:string;
}
export interface ShopServiceEntry {
  id:string;title:string;summary:string;price:number;unavailable?:string;choose:()=>void;
}
/** Services pay and apply directly. Inventory tool purchase/use stays a separate flow. */
export function showShopServiceConfirmation(dialog:DetailDialog,quote:ShopServiceQuote,ready:()=>boolean,
  submit:()=>Promise<void>,back:()=>void):HTMLDialogElement {
  let saving=false;
  const d=dialog.open(quote.title+' · 确认服务',quote.quota,[{label:'确认升级 · '+quote.price+' 金',primary:true,disabled:!!quote.unavailable||!ready(),run:async()=>{
    if(saving||!dialog.active(d)||!ready()||quote.unavailable)return;
    saving=true;const close=d.querySelector<HTMLButtonElement>('.dialog-close')!;close.disabled=true;
    try{await submit();}finally{saving=false;if(dialog.active(d))close.disabled=false;}
  }}],{shopContext:'purchase',closeLabel:'返回选购',effectBody:quote.effect,summaryBody:`实付 ${quote.price} 金 · 金币 ${quote.goldBefore} → ${quote.goldAfter}\n当场升级，不收入道具箱`+(quote.unavailable?'\n'+quote.unavailable:''),collapseRules:true});
  d.classList.add('shop-service-confirmation');
  d.querySelector<HTMLButtonElement>('.dialog-close')!.onclick=()=>{if(!saving)back();};
  d.addEventListener('cancel',event=>{if(saving){event.preventDefault();event.stopImmediatePropagation();}else back();},{capture:true});
  return d;
}
