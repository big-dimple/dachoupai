import type {Action,R2RunState} from '../domain/run';
import {R2_TOOLS} from '../content/r2Tools';
import {R2_HAND_TYPES} from '../domain/evaluateR2';
import {toolInfo,cardSpecialText,editionLabel} from './r2ToolInfo';
import {renderToolCard} from './CandidateCardPreview';
import {renderCardChange,renderHandChange,type CardChange} from './ToolChangePreview';
import {enhancementText} from './CardSpecialLabels';
import {DetailDialog} from './DetailDialog';
import {AudioEngine} from '../audio/AudioEngine';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {mountSavedCardMotion} from './SavedCardMotion';
import {gameSession} from './session';
/** Result projection from the successful command's snapshots, never a random preview. */
export function savedToolFacts(before:R2RunState,after:R2RunState,action:Extract<Action,{type:'UseConsumable'}>){
 const item=before.consumables.find(i=>i.instanceId===action.instanceId);
 if(!item||before.runId!==after.runId||after.commandSeq!==before.commandSeq+1||after.consumables.some(i=>i.instanceId===item.instanceId))return;
 const tool=R2_TOOLS.find(t=>t.id===item.definitionId);if(!tool)return;
 const liveBefore=before.deckInstances.filter(c=>!before.destroyedIds.includes(c.id)),liveAfter=after.deckInstances.filter(c=>!after.destroyedIds.includes(c.id));
 const changes:CardChange[]=liveBefore.flatMap(card=>{const next=liveAfter.find(c=>c.id===card.id);return !next?[{before:card,label:card.id===action.sacrificeId?'已献出':'已移除',note:'永久移除已保存'}]:JSON.stringify(card)!==JSON.stringify(next)?[{before:card,after:next,label:'实际保存后',note:card.enhancement!==next.enhancement?enhancementText(card)+' → '+enhancementText(next):card.edition!==next.edition?editionLabel(card.edition)+' → '+editionLabel(next.edition):'点数／花色见实际保存牌面'}]:[];});
 const added=liveAfter.filter(c=>!liveBefore.some(b=>b.id===c.id)),levels=R2_HAND_TYPES.flatMap(type=>before.handLevels[type]!==after.handLevels[type]&&before.handLevels[type]!==undefined&&after.handLevels[type]!==undefined?[{type,before:before.handLevels[type]!,after:after.handLevels[type]!}]:[]);
 const resources:string[]=[];
 const delta=(name:string,a:number|undefined,b:number|undefined)=>{if(a!==undefined&&b!==undefined&&a!==b)resources.push(`${name} ${a} → ${b}`);};
 delta('本场剩余弃牌',before.stage?.discardsLeft,after.stage?.discardsLeft);delta('免费刷新',before.shop?.freeRerolls,after.shop?.freeRerolls);
 delta('下场出牌次数永久减少量',before.spectralModifiers.handsPenalty,after.spectralModifiers.handsPenalty);delta('下场手牌上限永久减少量',before.spectralModifiers.handPenalty,after.spectralModifiers.handPenalty);delta('下场手牌上限永久增加量',before.spectralModifiers.cleanSlateBonus,after.spectralModifiers.cleanSlateBonus);
 for(const old of before.jokers){const current=after.jokers.find(j=>j.instanceId===old.instanceId),name=r2JokerDefinitionFor(before,old.definitionId).name;if(!current)resources.push(name+' · 永久献出');else if(current.edition!==old.edition)resources.push(name+' · '+editionLabel(old.edition)+' → '+editionLabel(current.edition));}
 for(const current of after.jokers.filter(j=>!before.jokers.some(old=>old.instanceId===j.instanceId)))resources.push('实际获得大丑牌 · '+r2JokerDefinitionFor(after,current.definitionId).name);
 return {tool,changes,added,levels,resources,deckBefore:liveBefore.length,deckAfter:liveAfter.length,goldBefore:before.gold,goldAfter:after.gold,sacrifice:changes.find(c=>c.before.id===action.sacrificeId&&!c.after),beneficiaries:changes.filter(c=>c.after&&action.targetIds.includes(c.before.id)),key:after.runId+'/'+after.commandSeq};
}
/** Readable result remains after optional finite motion; skip/close never own a command. */
export function showSavedToolResult(dialog:DetailDialog,before:R2RunState,after:R2RunState,action:Extract<Action,{type:'UseConsumable'}>,reduced:boolean):void {
 const facts=savedToolFacts(before,after,action);if(!facts)return;
 const info=toolInfo(facts.tool.id,after);let dispose=()=>{};
 const d=dialog.open(info.name+' · 已保存',[`道具已消耗 · 库存 ${after.consumables.length}`,`有效牌组 ${facts.deckBefore} → ${facts.deckAfter} 张`,...facts.resources,...(facts.goldBefore!==facts.goldAfter?[`金币 ${facts.goldBefore} → ${facts.goldAfter}`]:[])].join('\n'),[],{closeLabel:after.phase==='shop'?'回到经营':'回到牌桌',onClose:()=>dispose()});d.classList.add('tool-saved-result');d.dataset.resultKey=facts.key;d.dataset.animationState='settled';
 const host=d.querySelector('.dialog-copy')!;
 if(facts.sacrifice&&facts.tool.operation.kind==='random-enhancement'){
  const stage=document.createElement('section'),donor=document.createElement('figure'),source=document.createElement('span'),label=document.createElement('figcaption'),recipients=document.createElement('div');stage.className='tool-sacrifice-stage';donor.className='tool-sacrifice-donor';label.textContent='永久献出 · 已保存';renderToolCard(source,facts.sacrifice.before);donor.append(source,label);recipients.className='tool-sacrifice-recipients';stage.append(donor,recipients);host.prepend(stage);
  const faces:HTMLElement[]=[];for(const change of facts.beneficiaries){const recipient=document.createElement('figure'),face=document.createElement('span'),name=document.createElement('figcaption');renderToolCard(face,change.after!);name.textContent=enhancementText(change.after!);recipient.append(face,name);recipient.className='tool-sacrifice-beneficiary';recipients.append(recipient);faces.push(recipient);}
  const canvas=document.createElement('canvas');canvas.className='tool-sacrifice-ash';canvas.setAttribute('aria-hidden','true');stage.append(canvas);let frame:number|undefined,timer:ReturnType<typeof setTimeout>|undefined,stopped=false;const animations:Animation[]=[];
  const stop=()=>{if(stopped)return;stopped=true;d.dataset.animationState='settled';unsubscribe();window.removeEventListener('resize',stop);window.removeEventListener('blur',stop);document.removeEventListener('visibilitychange',onHide);media.removeEventListener('change',preference);if(frame!==undefined)cancelAnimationFrame(frame);clearTimeout(timer);for(const a of animations)a.cancel();source.classList.add('is-ash');source.replaceChildren();const ash=document.createElement('span');ash.className='tool-paper-ash';ash.textContent='纸灰 · 已移除';source.append(ash);canvas.remove();};
  const onHide=()=>{if(document.hidden)stop();},media=window.matchMedia('(prefers-reduced-motion: reduce)'),preference=()=>{if(gameSession().reducedMotion||media.matches)stop();},unsubscribe=gameSession().subscribe(preference);media.addEventListener('change',preference);window.addEventListener('resize',stop);window.addEventListener('blur',stop);document.addEventListener('visibilitychange',onHide);
  dispose=()=>{if(!stopped)AudioEngine.shared.cancelPresentation();stop();};
  if(!reduced)d.dataset.animationState='playing';
  if(reduced||media.matches)stop();else {frame=requestAnimationFrame(()=>{frame=undefined;if(stopped||!dialog.active(d))return;const bounds=stage.getBoundingClientRect(),start=performance.now(),ratio=Math.min(devicePixelRatio||1,1.5),ctx=canvas.getContext('2d');if(!ctx){stop();return;}canvas.width=Math.round(bounds.width*ratio);canvas.height=Math.round(bounds.height*ratio);ctx.scale(ratio,ratio);const from=source.getBoundingClientRect(),x=from.x-bounds.x+from.width/2,y=from.y-bounds.y+from.height/2,targets=faces.map(face=>{const r=face.getBoundingClientRect();return {x:r.x-bounds.x+r.width/2,y:r.y-bounds.y+r.height*.35};});
   animations.push(source.animate([{opacity:1,transform:'translateY(0) rotate(0)'},{opacity:.3,transform:'translateY(10px) rotate(-7deg)'},{opacity:0,transform:'translateY(20px) rotate(-13deg)'}],{duration:640,fill:'forwards'}));for(const [i,face] of faces.entries())animations.push(face.animate([{transform:'scale(.92)'},{transform:'scale(1.06)'},{transform:'scale(1)'}],{duration:460,delay:400+i*90,fill:'both'}));
   const draw=(now:number)=>{if(stopped||!dialog.active(d)){stop();return;}const t=Math.min(1,(now-start)/1100);ctx.clearRect(0,0,bounds.width,bounds.height);for(let i=0;i<24;i++){const target=targets[i%Math.max(1,targets.length)]??{x,y},p=Math.max(0,Math.min(1,(t-i*.012)/.72)),bend=Math.sin(p*Math.PI)*(-32-i%4*8);const px=x+(target.x-x)*p,py=y+(target.y-y)*p+bend;ctx.globalAlpha=Math.sin(p*Math.PI)*.85;ctx.fillStyle=i%3?'#26313A':'#B8473A';ctx.fillRect(px,py,2+i%3,2+i%2);}ctx.globalAlpha=1;if(t<1)frame=requestAnimationFrame(draw);else stop();};frame=requestAnimationFrame(draw);timer=setTimeout(stop,1450);
  });}
 }
 const grid=document.createElement('section');grid.className='tool-saved-changes';for(const [i,change] of facts.changes.entries())renderCardChange(grid,change,i);for(const level of facts.levels)renderHandChange(grid,level.type,level.before,level.after);
 for(const card of facts.added){const figure=document.createElement('figure'),face=document.createElement('span'),label=document.createElement('figcaption');figure.className='tool-change-card';renderToolCard(face,card);label.textContent='新增实例 · '+cardSpecialText(card);figure.append(face,label);grid.append(figure);}host.append(grid);
 if(!facts.sacrifice&&facts.changes.length){dispose=mountSavedCardMotion(d,grid,reduced);}
 const next=document.createElement('p');next.className='tool-saved-next';next.textContent=(facts.changes.length||facts.added.length?'点数与花色按上方实际牌面核对；增强只占一个槽。':'')+(after.phase==='shop'?'结果已保存，可以保留金币进入牌桌。':'结果已保存，继续自己选牌。');host.append(next);
 AudioEngine.shared.cardLand();
}
