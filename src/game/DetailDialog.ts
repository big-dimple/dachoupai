/** Native modal owns focus and readable, scrollable details independently of canvas resize. */
export class DetailDialog {
  private dialog?:HTMLDialogElement;
  active(dialog:HTMLDialogElement):boolean {return this.dialog===dialog;}
  close(expected?:HTMLDialogElement):void {if(expected&&!this.active(expected))return;this.dialog?.close();this.dialog?.remove();this.dialog=undefined;}
  open(title:string,body:string,actions:{label:string;run:()=>void|Promise<void>;disabled?:boolean}[]=[]):HTMLDialogElement {
    this.close();const dialog=document.createElement('dialog'),heading=document.createElement('h2'),content=document.createElement('p'),row=document.createElement('div');
    dialog.className='detail-dialog';dialog.setAttribute('aria-label',title);heading.textContent=title;content.textContent=body;row.className='dialog-actions';
    for(const action of actions){const b=document.createElement('button');b.textContent=action.label;b.disabled=!!action.disabled;b.onclick=async()=>{b.disabled=true;try{await action.run();}finally{if(b.isConnected)b.disabled=!!action.disabled;}};row.append(b);}
    const close=document.createElement('button');close.textContent='关闭';close.onclick=()=>this.close();row.append(close);dialog.append(heading,content,row);document.body.append(dialog);dialog.addEventListener('cancel',()=>this.close());dialog.showModal();this.dialog=dialog;close.focus();return dialog;
  }
}
