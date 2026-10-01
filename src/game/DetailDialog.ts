/** Native modal owns focus and readable, scrollable details independently of canvas resize. */
let dismissedPointer:{x:number;y:number;until:number}|undefined;
/** A rapid second tap at a just-dismissed modal button must not reach the canvas behind it. */
export function modalBlocksCanvas(x:number,y:number):boolean {
  return !!document.querySelector('dialog[open]')||!!dismissedPointer&&performance.now()<dismissedPointer.until&&Math.hypot(x-dismissedPointer.x,y-dismissedPointer.y)<24;
}
interface DialogAction {label:string;run:()=>void|Promise<void>;disabled?:boolean;primary?:boolean}
export class DetailDialog {
  private dialog?:HTMLDialogElement;
  private lastPointer?:{x:number;y:number};
  private returnFocus?:HTMLElement;
  active(dialog:HTMLDialogElement):boolean {return this.dialog===dialog;}
  close(expected?:HTMLDialogElement):void {
    if(expected&&!this.active(expected))return;
    if(this.dialog&&this.lastPointer)dismissedPointer={...this.lastPointer,until:performance.now()+350};
    this.dialog?.close();this.dialog?.remove();this.dialog=undefined;this.lastPointer=undefined;
    if(this.returnFocus?.isConnected)this.returnFocus.focus({preventScroll:true});this.returnFocus=undefined;
  }
  open(title:string,body:string,actions:DialogAction[]=[],options:{closeLabel?:string;portrait?:{url:string;alt:string}}={}):HTMLDialogElement {
    this.close();this.returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
    const dialog=document.createElement('dialog'),heading=document.createElement('h2'),content=document.createElement('p'),row=document.createElement('div'),status=document.createElement('p');
    dialog.className='detail-dialog';dialog.setAttribute('aria-label',title);heading.textContent=title;content.textContent=body;content.className='dialog-body';row.className='dialog-actions';
    status.className='dialog-status';status.setAttribute('role','status');status.hidden=true;
    for(const action of actions){
      const b=document.createElement('button');b.textContent=action.label;b.disabled=!!action.disabled;if(action.primary)b.className='dialog-primary';
      b.onclick=async()=>{b.disabled=true;b.setAttribute('aria-busy','true');status.hidden=true;try{await action.run();}catch{if(this.active(dialog)){status.textContent='操作未完成，请重试。';status.hidden=false;}}finally{if(b.isConnected){b.disabled=!!action.disabled;b.removeAttribute('aria-busy');}}};row.append(b);
    }
    const close=document.createElement('button');close.textContent=options.closeLabel??'关闭';close.className='dialog-close';close.onclick=()=>this.close(dialog);row.append(close);
    dialog.append(heading);
    if(options.portrait){const image=document.createElement('img');image.className='dialog-portrait';image.src=options.portrait.url;image.alt=options.portrait.alt;image.width=640;image.height=640;image.onerror=()=>image.remove();dialog.append(image);}
    dialog.append(content,status,row);document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();this.close(dialog);});
    dialog.addEventListener('pointerup',event=>{this.lastPointer={x:event.clientX,y:event.clientY};});
    dialog.showModal();this.dialog=dialog;close.focus();return dialog;
  }
}
