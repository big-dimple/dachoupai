import type {BuildKeepsake} from './BuildKeepsake';
/** A shared hand-painted keepsake; text remains readable if a reused preview fails. */
export function buildKeepsakeView(facts:BuildKeepsake,cleanups:(()=>void)[]):HTMLElement {
 const section=document.createElement('section');section.className='build-keepsake';section.setAttribute('aria-label','角色与成长手记');
 const image=(url:string,alt:string)=>{const img=document.createElement('img');img.src=url;img.alt=alt;img.decoding='async';img.onerror=()=>{img.hidden=true;};cleanups.push(()=>{img.onerror=null;});return img;};
 const p=(text:string,cls?:string)=>{const node=document.createElement('p');node.textContent=text;if(cls)node.className=cls;return node;};
 const hero=document.createElement('article'),copy=document.createElement('div'),heading=document.createElement('h3');hero.className='build-keepsake-hero';heading.textContent=facts.hero.name+' · '+facts.hero.ability;
 copy.append(heading,p(facts.hero.modeNote,'build-keepsake-note'));
 if(!facts.continuity)copy.append(p(facts.hero.tip));
 if(facts.continuity){
  if(facts.continuity.last)copy.append(p('上一场 · '+facts.continuity.last,'build-keepsake-read'));
  copy.append(p(facts.continuity.next,'build-keepsake-next'),p(facts.continuity.decision));
 }
 if(facts.hero.details){const details=document.createElement('details'),summary=document.createElement('summary');details.className='card-rules';summary.textContent='完整角色打法';details.append(summary,p(facts.hero.details));copy.append(details);}
 hero.append(image(facts.hero.url,facts.hero.name+'既有立绘'),copy);section.append(hero);
 if(!facts.growth.length){section.append(p(facts.terminal?'本局最终未持有成长来源；这份留影不补发成长或奖励。':'尚无持有的成长来源；先用现有持牌尝试，按真实货架自主购买。','build-keepsake-empty'));return section;}
 const title=document.createElement('h3');title.textContent='已存成长 · 不补加到刚结算的本手';section.append(title);
 for(const row of facts.growth){
  const card=document.createElement('article'),copy=document.createElement('div'),name=document.createElement('h4'),value=document.createElement('strong');card.className='build-keepsake-growth';card.dataset.instanceId=row.instanceId;card.dataset.growthKey=row.key;
  name.textContent=row.name;value.textContent=row.metric;value.className='build-keepsake-value';copy.append(name,value,p(row.cause,'build-keepsake-cause'));if(row.read)copy.append(p(row.read,'build-keepsake-read'));copy.append(p(row.next+' · 以实际条件和保存事件为准','build-keepsake-next'));
  if(row.url)card.append(image(row.url,row.name+'已有卡面'));card.append(copy);section.append(card);
 }
 return section;
}

/** Default shop decisions lead with today's action; the saved ledger is opt-in. */
export function compactBuildKeepsakeView(facts:BuildKeepsake,cleanups:(()=>void)[]):HTMLElement {
 const details=document.createElement('details'),summary=document.createElement('summary');details.className='card-rules build-keepsake-compact';
 const first=facts.growth[0];summary.textContent=(facts.continuity?facts.hero.name+' · '+facts.continuity.next+' · ':'成长手记 · ')+(first?first.name+' '+first.metric+(facts.growth.length>1?' 等'+facts.growth.length+'项':''):'暂无成长来源');details.append(summary);
 let mounted=false;const expand=()=>{if(details.open&&!mounted){mounted=true;details.append(buildKeepsakeView(facts,cleanups));}};
 details.addEventListener('toggle',expand);cleanups.push(()=>details.removeEventListener('toggle',expand));return details;
}
