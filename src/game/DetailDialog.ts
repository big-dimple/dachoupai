/** Native modal owns focus and readable, scrollable details independently of canvas resize. */
let dismissedPointer:{x:number;y:number;until:number}|undefined;
/** A rapid second tap at a just-dismissed modal button must not reach the canvas behind it. */
export function modalBlocksCanvas(x:number,y:number):boolean {
  return !!document.querySelector('dialog[open]')||!!dismissedPointer&&performance.now()<dismissedPointer.until&&Math.hypot(x-dismissedPointer.x,y-dismissedPointer.y)<24;
}
interface DialogAction {label:string;run:()=>void|Promise<void>;disabled?:boolean;primary?:boolean}
interface DialogOptions {closeLabel?:string;rarity?:'common'|'uncommon'|'rare';portrait?:{url:string;alt:string;layout?:'card';caption?:string}}
export class DetailDialog {
  private dialog?:HTMLDialogElement;
  private lastPointer?:{x:number;y:number};
  private returnFocus?:HTMLElement;
  active(dialog:HTMLDialogElement):boolean {return this.dialog===dialog;}
  /** Reuse the actual Phaser card face for readable poker details, after snapshot resolves. */
  attachCardArt(dialog:HTMLDialogElement,url:string,alt:string):void {
    if(!this.active(dialog))return;
    const frame=document.createElement('figure'),image=document.createElement('img');
    frame.className='dialog-card-art dialog-poker-art';image.className='dialog-card-image';image.src=url;image.alt=alt;
    frame.append(image);dialog.querySelector('.dialog-content')?.prepend(frame);dialog.classList.add('detail-dialog--illustrated');
  }
  close(expected?:HTMLDialogElement):void {
    if(expected&&!this.active(expected))return;
    if(this.dialog&&this.lastPointer)dismissedPointer={...this.lastPointer,until:performance.now()+350};
    this.dialog?.close();this.dialog?.remove();this.dialog=undefined;this.lastPointer=undefined;
    if(this.returnFocus?.isConnected)this.returnFocus.focus({preventScroll:true});this.returnFocus=undefined;
  }
  open(title:string,body:string,actions:DialogAction[]=[],options:DialogOptions={}):HTMLDialogElement {
    this.close();this.returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
    const dialog=document.createElement('dialog'),header=document.createElement('header'),heading=document.createElement('h2'),content=document.createElement('p'),layout=document.createElement('div'),copy=document.createElement('div'),row=document.createElement('div'),status=document.createElement('p');
    dialog.className='detail-dialog';dialog.setAttribute('aria-label',title);heading.textContent=title;content.textContent=body;content.className='dialog-body';row.className='dialog-actions';
    status.className='dialog-status';status.setAttribute('role','status');status.hidden=true;
    header.className='dialog-header';layout.className='dialog-content';copy.className='dialog-copy';
    const eyebrow=document.createElement('span');eyebrow.className='dialog-eyebrow';eyebrow.textContent=options.portrait?'巡演藏牌':'牌桌手记';header.append(eyebrow,heading);
    if(options.rarity){
      const badge=document.createElement('span');badge.className='dialog-rarity';badge.dataset.rarity=options.rarity;
      badge.textContent=({common:'● 普通大丑牌',uncommon:'◆ 特别大丑牌',rare:'✦ 稀有大丑牌'} as const)[options.rarity];header.append(badge);
    }
    for(const action of actions){
      const b=document.createElement('button');b.textContent=action.label;b.disabled=!!action.disabled;if(action.primary)b.className='dialog-primary';
      b.onclick=async()=>{b.disabled=true;b.setAttribute('aria-busy','true');status.hidden=true;try{await action.run();}catch{if(this.active(dialog)){status.textContent='操作未完成，请重试。';status.hidden=false;}}finally{if(b.isConnected){b.disabled=!!action.disabled;b.removeAttribute('aria-busy');}}};row.append(b);
    }
    const close=document.createElement('button');close.textContent=options.closeLabel??'关闭';close.className='dialog-close';close.onclick=()=>this.close(dialog);row.append(close);
    dialog.append(header);
    if(options.portrait){
      const image=document.createElement('img'),card=options.portrait.layout==='card';image.className=card?'dialog-card-image':'dialog-portrait';image.src=options.portrait.url;image.alt=options.portrait.alt;image.decoding='async';
      dialog.classList.add('detail-dialog--illustrated');
      if(card){
        const frame=document.createElement('figure');frame.className='dialog-card-art';frame.append(image);
        if(options.portrait.caption){const caption=document.createElement('figcaption');caption.textContent=options.portrait.caption;frame.append(caption);}
        image.onerror=()=>frame.remove();layout.append(frame);
      }else {image.onerror=()=>image.remove();layout.append(image);}
    }
    copy.append(content,status);layout.append(copy);dialog.append(layout,row);document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();this.close(dialog);});
    dialog.addEventListener('pointerup',event=>{this.lastPointer={x:event.clientX,y:event.clientY};});
    dialog.showModal();this.dialog=dialog;close.focus({preventScroll:true});dialog.scrollTop=0;return dialog;
  }
}
