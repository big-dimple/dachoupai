import {playerText} from './Brand';

export const playerTextValue=(value:string|string[]):string|string[]=>Array.isArray(value)?value.map(playerText):typeof value==='string'?playerText(value):value;
interface TextSetter {setText(value:string|string[]):unknown}
const textSetters=new WeakMap<object,()=>void>();
/** Covers initial Phaser text and later setText calls, including direct scene.add.text users. */
export function normalizeTextSetter<T extends TextSetter>(target:T):()=>void {
  const installed=textSetters.get(target);if(installed)return installed;
  const original=target.setText;
  const normalized=function(this:T,value:string|string[]){return original.call(this,playerTextValue(value));} as T['setText'];
  target.setText=normalized;
  const stop=()=>{if(target.setText===normalized)target.setText=original;textSetters.delete(target);};textSetters.set(target,stop);return stop;
}

const displayAttributes=['aria-label','aria-description','aria-valuetext','title','alt','placeholder'];
const rawText='script,style,textarea,pre,code,[contenteditable],[data-preserve-player-text]';
/** DOM-only projection: never changes form values, URLs, identifiers, rules or save objects. */
export function observePlayerText(root:HTMLElement):()=>void {
  const rewriteText=(node:Node)=>{
    if(node.nodeType!==Node.TEXT_NODE||node.parentElement?.closest(rawText))return;
    const before=node.nodeValue??'',after=playerText(before);if(after!==before)node.nodeValue=after;
  };
  const rewriteAttribute=(element:Element,name:string)=>{
    const before=element.getAttribute(name);if(before===null)return;const after=playerText(before);if(after!==before)element.setAttribute(name,after);
  };
  const rewrite=(node:Node)=>{
    if(node.nodeType===Node.TEXT_NODE){rewriteText(node);return;}
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    const element=node as Element;if(element.matches('script,style,[data-preserve-player-text]'))return;
    for(const name of displayAttributes)rewriteAttribute(element,name);
    for(const child of node.childNodes)rewrite(child);
  };
  rewrite(root);
  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='characterData')rewriteText(record.target);
      else if(record.type==='attributes')rewriteAttribute(record.target as Element,record.attributeName!);
      else for(const child of record.addedNodes)rewrite(child);
    }
  });
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:displayAttributes});
  return()=>observer.disconnect();
}
