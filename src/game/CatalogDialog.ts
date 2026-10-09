import type {R2RunState} from '../domain/r2Run';
import {DetailDialog} from './DetailDialog';
import {catalogFacts,queryCatalog,CATALOG_KINDS,CATALOG_USES,type CatalogQuery,type CatalogEntry} from './Catalog';
/** Optional read-only menu surface. Reuse the detail image lifecycle; never owns a Run command. */
export function showCatalog(dialog:DetailDialog,run:R2RunState|undefined,current:()=>boolean):void {
 let facts:ReturnType<typeof catalogFacts>;
 try{facts=catalogFacts(run);}catch{dialog.open('图鉴查询','当前保存局规则不兼容，无法查询。请从菜单查看进度或导出原存档。');return;}
 const query:CatalogQuery={name:'',kind:'',use:'',source:run?'公开内容':''};let page=0;
 const watch=(element:HTMLDialogElement)=>{const timer=setInterval(()=>{if(!current()&&dialog.active(element))dialog.close(element);},250);return()=>clearInterval(timer);};
 const check=()=>{if(current())return true;dialog.close();return false;};
 const showDetail=(entry:CatalogEntry)=>{
  if(!check())return;let stop=()=>{};
  const data=entry.sources.length?'公开记录：'+entry.sources.join('／')+'。上手来源仅表示实际记录有来源事件，不等于收益或当前存值。':'仅规则资料，不表示已获得。';
  const element=dialog.open(entry.name+' · '+CATALOG_KINDS[entry.kind],entry.current+'\n\n'+data+'\n\n一般规则\n'+entry.rules,[{label:'返回查询',primary:true,run:()=>{if(check())showSearch();}}],{portrait:entry.portrait,rarity:entry.rarity,onClose:()=>stop()});stop=watch(element);
 };
 const showSearch=()=>{
  if(!check())return;let stop=()=>{};
  const element=dialog.open('图鉴查询',facts.label+' · 主动查找，不改变本局。',[{label:'上一页',disabled:true,run:()=>{if(check()){page--;update();}}},{label:'下一页',disabled:true,run:()=>{if(check()){page++;update();}}}],{onClose:()=>stop()});stop=watch(element);element.classList.add('catalog-dialog');
  const scroll=element.querySelector('.dialog-scroll')!,controls=document.createElement('section'),count=document.createElement('p'),list=document.createElement('section');controls.className='catalog-query';list.className='catalog-results';count.className='catalog-count';count.setAttribute('role','status');
  const name=document.createElement('input');name.type='search';name.value=query.name;name.placeholder='按名字查找';name.setAttribute('aria-label','按名字查找');controls.append(name);
  const select=(label:string,choices:readonly (readonly [string,string])[],value:string,change:(value:string)=>void)=>{const field=document.createElement('label'),caption=document.createElement('span'),input=document.createElement('select');caption.textContent=label;input.setAttribute('aria-label',label);for(const [value,text] of choices){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}input.value=value;input.onchange=()=>{if(check()){change(input.value);page=0;update();}};field.append(caption,input);controls.append(field);};
  select('分类',[['','全部分类'],...Object.entries(CATALOG_KINDS)],query.kind,v=>query.kind=v as CatalogQuery['kind']);
  select('用途',[['','全部用途'],...CATALOG_USES.map(v=>[v,v] as const)],query.use,v=>query.use=v);
  if(run)select('公开范围',[['公开内容','本局公开内容'],['持有','当前持有'],['现货','当前现货'],['上手来源','上手来源'],['','全部规则资料']],query.source,v=>query.source=v as CatalogQuery['source']);
  const intro=element.querySelector('.dialog-body')!;intro.textContent=facts.label+(run?'；持有、现货、上手来源分开。':'；没有当前保存局，不显示实例值。');scroll.prepend(controls);scroll.append(count,list);
  const actions=element.querySelectorAll<HTMLButtonElement>('.dialog-actions button');
  const update=()=>{
   if(!check())return;const rows=queryCatalog(facts.entries,query),pages=Math.max(1,Math.ceil(rows.length/8));page=Math.max(0,Math.min(page,pages-1));count.textContent=rows.length+' 项 · '+(page+1)+' / '+pages+' 页';actions[0].disabled=page===0;actions[1].disabled=page+1===pages;list.replaceChildren();
   if(!rows.length){const empty=document.createElement('p');empty.textContent='没有匹配项。可清空名字、切换分类或用途'+(run?'，或查看全部规则资料。':'。');list.append(empty);return;}
   for(const entry of rows.slice(page*8,page*8+8)){const row=document.createElement('article'),copy=document.createElement('div'),title=document.createElement('h3'),summary=document.createElement('p'),source=document.createElement('small'),button=document.createElement('button');row.className='catalog-result';title.textContent=entry.name;summary.textContent=entry.summary;source.textContent=CATALOG_KINDS[entry.kind]+' · '+(entry.sources.join('／')||'规则资料')+(entry.uses.length?' · '+entry.uses.join('／'):'');button.type='button';button.textContent='查看'+entry.name;button.onclick=()=>showDetail(entry);copy.append(title,source,summary,button);if(entry.thumbnail){const image=document.createElement('img');image.src=entry.thumbnail;image.alt=entry.name;image.width=48;image.height=68;image.loading='lazy';image.decoding='async';image.onerror=()=>image.hidden=true;row.append(image);}row.append(copy);list.append(row);}
  };
  name.oninput=()=>{if(check()){query.name=name.value;page=0;update();}};update();
 };
 showSearch();
}
