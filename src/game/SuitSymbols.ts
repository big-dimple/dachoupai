import type {Suit} from '../cards/types';

const SUIT_FOR_GLYPH:Record<string,Suit>={'♠':'spades','♣':'clubs','♥':'hearts','♦':'diamonds'};
export const SUIT_TEXT_INK={black:'#26313A',red:'#9F3228',darkBlack:'#FFF9EE',darkRed:'#FFEDE3'} as const;
export function suitTextParts(text:string):{text:string;suit?:Suit}[]{
 return text.split(/([♠♣♥♦][\uFE0E\uFE0F]?)/).filter(Boolean).map(text=>({text,...(SUIT_FOR_GLYPH[text[0]]?{suit:SUIT_FOR_GLYPH[text[0]]}:{})}));
}
/** Color glyphs inside this dialog only; retain ordinary text, accessible labels and input nodes. */
export function observeSuitSymbols(host:HTMLElement):()=>void {
 const doc=host.ownerDocument;if(!doc?.createTreeWalker)return ()=>{};
 let observer:MutationObserver|undefined;
 const paint=()=>{
  observer?.disconnect();
  const walker=doc.createTreeWalker(host,NodeFilter.SHOW_TEXT),nodes:Text[]=[];
  for(let node=walker.nextNode();node;node=walker.nextNode())if(/[♠♣♥♦]/.test(node.textContent??'')&&!node.parentElement?.closest('.suit-symbol,.candidate-card-face,script,style,textarea,option,[contenteditable]'))nodes.push(node as Text);
  for(const node of nodes){const fragment=doc.createDocumentFragment();
   for(const part of suitTextParts(node.data))if(part.suit){const span=doc.createElement('span');span.className='suit-symbol '+(part.suit==='hearts'||part.suit==='diamonds'?'suit-symbol--red':'suit-symbol--black');span.dataset.suit=part.suit;span.textContent=part.text;fragment.append(span);}else fragment.append(doc.createTextNode(part.text));
   node.replaceWith(fragment);
  }
  // Native options cannot contain rich spans. Only isolated suit labels get this scoped color.
  for(const select of host.querySelectorAll('select'))if([...select.options].some(o=>/[♠♣♥♦]/.test(o.textContent??''))){
   select.classList.add('suit-select');select.dataset.suit=SUIT_FOR_GLYPH[select.selectedOptions[0]?.textContent?.match(/[♠♣♥♦]/)?.[0]??'']??'';
   for(const option of select.options){const suit=SUIT_FOR_GLYPH[option.textContent?.match(/[♠♣♥♦]/)?.[0]??''];if(suit)option.style.color=suit==='hearts'||suit==='diamonds'?SUIT_TEXT_INK.red:SUIT_TEXT_INK.black;}
  }
  observer?.observe(host,{childList:true,characterData:true,subtree:true});
 };
 if(typeof MutationObserver!=='undefined')observer=new MutationObserver(paint);
 paint();host.addEventListener('change',paint);
 return ()=>{observer?.disconnect();host.removeEventListener('change',paint);};
}
