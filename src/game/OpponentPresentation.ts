import type Phaser from 'phaser';
import type {Box} from './layout';
import type {R2RunState} from '../domain/r2Run';
import {getR2Stage} from '../domain/r2Run';
import {HAND_LABELS} from '../content/handLabels';
import {DetailDialog} from './DetailDialog';
import {B05_OPPONENT,type OpponentCue,type OpponentChoice} from './OpponentFacts';
import {heatText} from './scoreText';
import {PAPER_CSS as C,UI_FONT} from './theme';
import {cssViewport} from '../platform/Viewport';

/** Scoped paper/ink UI. Portrait and eye art can be supplied independently; no borrowed player face. */
function style(host:HTMLElement):void {
  const sheet=document.createElement('style');sheet.textContent=`
  .detail-dialog.opponent-dialog[open] {border-color:${C.jade};width:min(650px,calc(100vw - var(--safe-left) - var(--safe-right) - 24px));height:auto;top:calc(50% + (var(--safe-top) - var(--safe-bottom)) / 2);bottom:auto;transform:translateY(-50%)}
  .opponent-dialog .dialog-content {overflow:auto}
  .opponent-dialog .dialog-scroll {height:auto;overflow:visible}
  .opponent-dialog .dialog-eyebrow {display:block;color:${C.jade}}
  .opponent-dialog .dialog-effect {font-size:17px;color:${C.ink};white-space:pre-line}
  .opponent-dialog .dialog-purchase-summary {color:${C.jade};font-size:15px}
  .opponent-dialog .opponent-quote {font-size:21px;font-weight:700;color:${C.jade};margin:0 0 12px}
  .opponent-dialog .opponent-options {display:grid;gap:10px;margin:12px 0}
  .opponent-dialog .opponent-option {border:1px solid ${C.divider};padding:10px;border-radius:6px;background:${C.paperLight}}
  .opponent-dialog .opponent-option p {font-size:14px;line-height:1.6;white-space:pre-line;margin:8px 0 0}
  .opponent-dialog .opponent-option button {min-height:44px;width:100%;font-weight:700}
  .opponent-beat {box-sizing:border-box;position:fixed;z-index:12;pointer-events:none;background:${C.paperLight};color:${C.ink};border:1px solid ${C.jade};border-left:5px solid ${C.jade};padding:10px 14px;font-family:${UI_FONT};display:flex;flex-direction:column;justify-content:center;gap:7px;overflow:hidden}
  .opponent-beat[data-kind="repeat"] {border-color:${C.red}}
  .opponent-beat small {font-size:14px;color:${C.mutedInk}}
  .opponent-beat strong {font-size:21px;line-height:1.25}
  .opponent-beat p {font-size:15px;line-height:1.35;margin:0}
  .opponent-beat[data-compact="true"] {padding:2px 10px;gap:2px;justify-content:flex-end}
  .opponent-beat[data-compact="true"] small {line-height:1.25}
  .opponent-beat[data-compact="true"] strong {font-size:18px}
  .opponent-beat > small,.opponent-beat > strong,.opponent-beat > p {flex-shrink:0}
  @media(min-width:700px) {.opponent-dialog .opponent-options {grid-template-columns:1fr 1fr}}
  @media(max-height:620px) {.opponent-dialog .opponent-quote {font-size:18px;margin-bottom:6px}.opponent-dialog .opponent-options {gap:6px;margin:6px 0}.opponent-dialog .opponent-option {padding:7px}}
  `;host.append(sheet);
}
function decorate(dialog:HTMLDialogElement,quote:string):void {
  dialog.classList.add('opponent-dialog');dialog.dataset.opponent=B05_OPPONENT.id;dialog.dataset.artMode='text-only';style(dialog);
  const eyebrow=dialog.querySelector('.dialog-eyebrow');if(eyebrow)eyebrow.textContent=B05_OPPONENT.role+' · 文字演出';
  const text=document.createElement('p');text.className='opponent-quote';text.textContent='“'+quote+'”';dialog.querySelector('.dialog-intro')?.prepend(text);
}
/** Resolves false on cancel/scene shutdown, with no EnterStage or draw committed. */
export function presentOpponentEntrance(dialog:DetailDialog,run:R2RunState):Promise<boolean> {
  const spec=getR2Stage(run.stageIndex,run.tourMode,run.difficulty,run);
  if(run.phase!=='stage-ready'||run.stageIndex%3!==2||run.boss.definitionId!=='B05'||!spec)return Promise.resolve(true);
  return new Promise(resolve=>{
    let entered=false;
    const d=dialog.open('回音墙 · 入场前',
      '连续两手同牌型，只将等级后的牌型基础热度减半。普通点数、增强和大丑牌热度正常。首手不减半。',
      [{label:'入场 · 看手牌',primary:true,run:()=>{entered=true;dialog.close();}}],
      {closeLabel:'稍后入场',onClose:()=>resolve(entered),summaryBody:spec.name+' · 目标 '+heatText(spec.targetHeat),effectBody:'连出同型 → 牌型基础½\n同型硬闯，或换已成型牌型',collapseRules:true,rulesLabel:'具体减什么'});
    decorate(d,'再来同一招，我就接住它。');d.dataset.opponentPhase='entrance';d.dataset.phase='entrance';d.dataset.attitude='composed';d.dataset.stageIndex=String(run.stageIndex);d.dataset.commandSeq=String(run.commandSeq);
  });
}
export function showOpponentChoices(dialog:DetailDialog,run:R2RunState,choices:readonly OpponentChoice[],choose:(choice:OpponentChoice)=>void,extra:()=>void,canChoose:()=>boolean):void {
  const stage=run.stage!,previous=stage.previousHandType;
  const d=dialog.open('回音墙 · 这一手怎么接',
    '重复上手牌型，只减等级后的牌型基础热度。牌点数、增强、大丑牌热度正常。切换不保证本手更高或过关。',
    [{label:'规则 / 物品',run:extra}],{closeLabel:'自己选牌',summaryBody:'目标 '+heatText(stage.targetHeat)+' · 剩'+stage.handsLeft+'次出牌',effectBody:previous?'上手 '+HAND_LABELS[previous]+' → 再出同型基础½':'本场还没有上手 · 首手基础不减半',collapseRules:true,rulesLabel:'完整限制'});
  decorate(d,previous?'同一招硬闯，还是换一招？':'先让我听听你的招。');d.dataset.opponentPhase='choices';
  const options=document.createElement('section');options.className='opponent-options';options.setAttribute('aria-label','当前手牌已成型应对');
  for(const choice of choices){const row=document.createElement('article'),button=document.createElement('button'),detail=document.createElement('p');row.className='opponent-option';button.type='button';button.textContent=choice.label;button.disabled=!canChoose();button.onclick=()=>{if(!canChoose())return;choose(choice);dialog.close(d);};detail.textContent=choice.detail;row.append(button,detail);options.append(row);}
  if(previous&&!choices.some(c=>c.kind==='repeat')){const p=document.createElement('p');p.textContent='当前手牌凑不出上手'+HAND_LABELS[previous]+'；可自己选牌或用原弃牌操作。';options.append(p);}
  d.querySelector('.dialog-intro')?.append(options);
}
/** Abortable, read-only key beat. The real accumulator remains visible above it. */
export async function presentOpponentBeat(scene:Phaser.Scene,area:Box,beat:OpponentCue,signal:AbortSignal,reduced:boolean):Promise<void> {
  if(signal.aborted)return;
  const host=document.createElement('section');host.className='opponent-beat';host.dataset.kind=beat.kind;host.dataset.opponent=beat.opponentId;host.dataset.eventId=beat.eventId;host.dataset.phase=beat.phase;host.dataset.attitude=beat.attitude;host.dataset.placement=beat.placement;host.dataset.artMode='text-only';host.setAttribute('role','status');style(host);
  const title=document.createElement('small'),quote=document.createElement('strong'),effect=document.createElement('p');title.textContent=beat.title;quote.textContent='“'+beat.quote+'”';effect.textContent=beat.effect;host.append(title,quote,effect);document.body.append(host);
  // The played area uses CSS layout coordinates, independent of framebuffer density.
  const position=()=>{const r=scene.game.canvas.getBoundingClientRect(),viewport=cssViewport(scene),x=r.width/viewport.width,y=r.height/viewport.height;host.dataset.compact=String(area.height*y<96);Object.assign(host.style,{left:r.left+area.x*x+'px',top:r.top+area.y*y+'px',width:area.width*x+'px',height:area.height*y+'px'});};position();
  const animation=reduced?undefined:host.animate([{opacity:0,transform:'translateX(9px)'},{opacity:1,transform:'translateX(0)'}],{duration:140,fill:'both'});
  try {await new Promise<void>(resolve=>{const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();},timer=setTimeout(finish,beat.kind==='won'||beat.kind==='lost'?900:850);signal.addEventListener('abort',finish,{once:true});});}
  finally {animation?.cancel();host.remove();}
}
