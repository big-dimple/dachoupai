import type Phaser from 'phaser';
import type {ScoreEvent,ScoreTrace} from '../domain/scoreR2';
import {Rational,type Fraction} from '../domain/rational';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import type {Box} from './layout';
import {fractionText,readableFractionText} from './scoreText';
import {compactScoreText} from './ScoreTextLayout';
import {multiplierCaption,multiplierOverview} from './ScoreEventCaption';

export interface ScoreSourceProcess {
 eventId:string;sourceInstanceId:string;sourceDefinitionId:string;source:string;
 kind:'heat'|'add'|'multiply'|'retrigger'|'cap';effect:string;exact:string;
 before:ScoreEvent['before'];after:ScoreEvent['after'];factor?:Fraction;
 repeat?:{current:number;total:number};
}
const subtract=(after:Fraction,before:Fraction)=>Rational.fromJSON(after).add(Rational.fromJSON(before).multiply(new Rational(-1n)));
/** Consume a committed event only. Totals never become a card/hero's local factor. */
export function scoreSourceProcess(trace:ScoreTrace,event:ScoreEvent,source:string):ScoreSourceProcess|undefined {
 const index=trace.events.findIndex(e=>e===event||e.eventId===event.eventId&&JSON.stringify(e)===JSON.stringify(event));
 if(index<0||!['onCardScore','onHeldCard','characterScore','jokerScore','routeGrowth'].includes(event.phase))return;
 const heat=subtract(event.after.H,event.before.H),mult=subtract(event.after.M,event.before.M);
 const base={eventId:event.eventId,sourceInstanceId:event.sourceInstanceId,sourceDefinitionId:event.sourceDefinitionId,source:source.replace(/\s*·\s*/g,'·'),before:event.before,after:event.after};
 const target=trace.cards.find(c=>c.id===event.targetCardId),targetName=target?rankLabel(target.rank)+SUIT_SYMBOL[target.suit]:undefined;
 let repeat:ScoreSourceProcess['repeat'];
 if(event.retriggerDepth>0&&target){
  const executions=trace.events.filter(e=>e.sourceType==='card'&&e.sourceDefinitionId===`rank-${target.rank}`&&e.targetCardId===target.id&&e.rootEventId===event.rootEventId&&e.retriggerDepth>0&&e.operation==='add-heat');
  const current=executions.filter(e=>trace.events.indexOf(e)<=index).length;
  if(current)repeat={current,total:executions.length};
 }
 const repeated=repeat?`重触${repeat.current}/${repeat.total} `:'';
 const reads=['read-growth','consume-growth','read-coefficient'].includes(event.operation);
 if(event.operation==='retrigger-card'||event.operation==='retrigger-cap'){
  if(!targetName)return;
  const count=Rational.fromJSON(event.value),cap=event.operation==='retrigger-cap';
  return {...base,source:base.source+(event.sourceType==='card'?'':'→'+targetName),kind:cap?'cap':'retrigger',effect:cap?'重触已达上限':'重触+'+readableFractionText(event.value)+'次',exact:cap?'重触上限 '+fractionText(event.value):'实际额外重触 '+fractionText(count.toJSON())+' 次'};
 }
 if(['multiply-multiplier','read-coefficient','route-factor'].includes(event.operation)){
  const before=Rational.fromJSON(event.before.M);if(before.n===0n||!mult.n)return;
  const factor=Rational.fromJSON(event.after.M).multiply(new Rational(before.d,before.n)).toJSON();
  const origin=event.operation==='route-factor'?'本局资历':event.reasonKey.startsWith('edition.')?'版次':reads?'读已有':'本源';
  return {...base,kind:'multiply',factor,repeat,effect:repeated+origin+' ×'+readableFractionText(factor),exact:multiplierCaption(source,factor,event.before.M,event.after.M).exact};
 }
 // Compound effects retain the existing complete operation copy.
 if(heat.n&&mult.n)return;
 if(mult.n)return {...base,kind:'add',repeat,effect:repeated+(reads?'读已有倍率':'倍率')+(mult.n>0n?'+':'')+readableFractionText(mult.toJSON()),exact:'实际倍率变化 '+fractionText(mult.toJSON())};
 if(heat.n)return {...base,kind:'heat',repeat,effect:repeated+(reads?'读已有热度':'热度')+(heat.n>0n?'+':'')+readableFractionText(heat.toJSON()),exact:'实际热度变化 '+fractionText(heat.toJSON())};
}

/** The existing cut-in uses the same local event, with its accumulator in the footer. */
export function scoreSourceClimaxValue(cue:ScoreSourceProcess,note:string){
 if(cue.kind!=='multiply'&&cue.kind!=='add'&&cue.kind!=='heat')return;
 const multiplier=cue.kind!=='heat',value=cue.factor?Rational.fromJSON(cue.factor):subtract(multiplier?cue.after.M:cue.after.H,multiplier?cue.before.M:cue.before.H);
 const local=(cue.factor?'×':value.n>0n?'+':'')+readableFractionText(value.toJSON());
 return {label:cue.kind==='multiply'?'本源因子':cue.kind==='add'?'本源加倍率':'本源加热度',before:local,after:local,note,
  accumulated:(multiplier?'累计倍率 ':'累计热度 ')+multiplierOverview(multiplier?cue.before.M:cue.before.H,true)+'→'+multiplierOverview(multiplier?cue.after.M:cue.after.H,true)};
}

/** Measure alternatives at 14px. Abbreviate numbers before shortening a source;
 * the local operation/repeat always survives, on one reserved row with no overlay.
 */
export function fitScoreSourceProcess(text:Phaser.GameObjects.Text,cue:ScoreSourceProcess,area:Box):void {
 const full=cue.source+' · '+cue.effect,compact=compactScoreText(cue.effect);
 text.setFontSize(14).setWordWrapWidth(0).setScale(1);
 const effects=[cue.effect,compact,compact.replace('读已有','读').replace('本局资历','资历').replace('倍率','倍').replace('热度','热')];
 let display=full;
 for(const effect of effects){display=cue.source+' · '+effect;text.setText(display);if(text.width<=area.width)break;}
 if(text.width>area.width){
  const effect=effects.at(-1)!;let name=cue.source;
  do{name=name.slice(0,-1);display=(name?name+'… · ':'')+effect;text.setText(display);}while(text.width>area.width&&name.length);
 }
 text.setText(display).setPosition(area.x+area.width/2,area.y).setOrigin(.5,0)
  .setData('fullText',full).setData('fittedText',display).setData('scoreSourceProcess',cue);
}

/** Uses the current caption and accumulator label; owns no animations, input or clocks. */
export function presentScoreSourceProcess(text:Phaser.GameObjects.Text,multiplierLabel:Phaser.GameObjects.Text,cue:ScoreSourceProcess,area:Box,signal:AbortSignal){
 const previous=multiplierLabel.text;
 multiplierLabel.setText('累计倍率');fitScoreSourceProcess(text,cue,area);text.setData('sourceProcessPhase','windup');
 if(cue.factor)text.setData('exactMultiplierCaption',{eventId:cue.eventId,text:cue.exact});
 let disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;signal.removeEventListener('abort',dispose);if(multiplierLabel.active)multiplierLabel.setText(previous);if(text.active)text.setData('scoreSourceProcess',undefined).setData('sourceProcessPhase',undefined);};
 signal.addEventListener('abort',dispose,{once:true});
 return {arrive:()=>{if(!disposed)text.setData('sourceProcessPhase','impact');},dispose};
}
