import type {CharacterId} from './characters';
import {CHARACTERS} from './characters';
import type {DetailDialog} from './DetailDialog';
import {selectionPortraitURL} from './portraits';
import {SELECTION_PRESENTATION} from './SelectionPresentation';

const css=`
.selection-comparison .dialog-content{display:block}
.selection-comparison .selection-roster{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
.selection-comparison .selection-hero{padding:12px;background:#fff9ee;border:1px solid #c7b89d;border-radius:6px;color:#26313a}
.selection-comparison .selection-hero[data-selected=true]{border:2px solid #3f606b;padding:11px;background:#e2e8e5}
.selection-comparison .selection-heading{display:grid;grid-template-columns:54px minmax(0,1fr);gap:10px;align-items:center}
.selection-comparison .selection-heading img{width:54px;height:68px;object-fit:contain}
.selection-comparison .selection-heading h3{margin:0;font-size:20px}
.selection-comparison .selection-heading span{display:block;font-size:14px;color:#3f606b;margin-top:4px}
.selection-comparison .selection-hero p{font-size:14px;line-height:1.55;margin:10px 0;white-space:normal}
.selection-comparison .selection-hero .selection-hook{font-weight:bold}
.selection-comparison .selection-hero strong{color:#3f606b;font-weight:normal}
.selection-comparison .selection-hero footer{display:flex;gap:8px;margin-top:12px}
.selection-comparison .selection-hero button{min-height:44px;flex:1;padding:8px 4px;border:1px solid #3f606b;border-radius:6px;background:#fff9ee;color:#3f606b;font:14px/1.4 "Microsoft YaHei","PingFang SC",sans-serif;cursor:pointer}
.selection-comparison .selection-hero button:first-child{background:#3f606b;color:#fff9ee}
.selection-comparison .selection-hero button:disabled{opacity:.55;cursor:default}
.selection-comparison .selection-hero button:focus-visible{outline:3px solid #b8473a;outline-offset:2px}
@media(max-width:850px){.selection-comparison .selection-roster{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){.selection-comparison .selection-roster{grid-template-columns:1fr;gap:10px}.selection-comparison .selection-hero{padding:12px}.selection-comparison .selection-heading{grid-template-columns:64px minmax(0,1fr)}.selection-comparison .selection-heading img{width:64px;height:80px}}
`;
/** Six semantic choices with facts and explicit detail actions, owned by the selection scene. */
export function showSelectionComparison(dialog:DetailDialog,options:{selectedId?:CharacterId;abilityEnabled:boolean;tutorial:boolean;select:(id:CharacterId)=>void;inspect:(id:CharacterId)=>void}){
 const d=dialog.open('谁来撑这场戏？',options.abilityEnabled?'每位英雄都能玩三条路线，挑你想怎么操作。':'当前模式关闭角色能力；以下是普通局玩法参考。',[],{closeLabel:'回到选角'});
 d.classList.add('selection-comparison');
 const style=document.createElement('style');style.textContent=css;d.append(style);
 const grid=document.createElement('section');grid.className='selection-roster';grid.setAttribute('aria-label','六英雄操作与代价');
 for(const c of CHARACTERS){
  const copy=SELECTION_PRESENTATION[c.id],card=document.createElement('article'),heading=document.createElement('div'),image=document.createElement('img'),title=document.createElement('div'),name=document.createElement('h3'),tag=document.createElement('span');
  card.className='selection-hero';card.dataset.hero=c.id;card.dataset.selected=String(c.id===options.selectedId);heading.className='selection-heading';image.src=selectionPortraitURL(c.id);image.alt=c.name+'立绘';image.width=54;image.height=68;image.decoding='async';
  name.textContent=c.name;tag.textContent=copy.tag;title.append(name,tag);heading.append(image,title);card.append(heading);
  const hook=document.createElement('p');hook.className='selection-hook';hook.textContent=copy.hook;card.append(hook);
  for(const [label,value] of [['操作',copy.entry],['可用',copy.when],['代价',copy.cost]]){const p=document.createElement('p'),labelNode=document.createElement('strong');labelNode.textContent=label+' · ';p.append(labelNode,document.createTextNode(value));card.append(p);}
  const footer=document.createElement('footer'),choose=document.createElement('button'),detail=document.createElement('button');choose.type=detail.type='button';choose.textContent=options.tutorial&&c.id!=='erxiang'?'教程固定二响':c.id===options.selectedId?'已选 · '+c.name:'选'+c.name;choose.disabled=options.tutorial&&c.id!=='erxiang';choose.setAttribute('aria-pressed',String(c.id===options.selectedId));choose.onclick=()=>{options.select(c.id);dialog.close(d);};detail.textContent='技能说明';detail.setAttribute('aria-label','查看'+c.name+'技能说明');detail.onclick=()=>options.inspect(c.id);footer.append(choose,detail);card.append(footer);grid.append(card);
 }
 d.querySelector('.dialog-copy')!.append(grid);
 return d;
}
