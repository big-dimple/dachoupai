import type Phaser from 'phaser';
import type {EffectContext} from '../core/EffectQueue';
import type {ScoreEvent} from '../domain/scoreR2';
import type {Box} from './layout';
import {scoreContributions} from './ScoreContribution';
import {readableFractionText} from './scoreText';
import type {ScoreAnimate} from './ScorePosture';
import {crispText,prepareTextScale,textDensity} from './TextRaster';
import {UI_FONT} from './theme';

export type ScoreArrivalKind='heat'|'mult-add'|'mult-multiply'|'total';
export interface ScoreArrival {eventId:string;kind:ScoreArrivalKind;strength:'ordinary'|'key';label:string}
/** Keep the saved trace; neutral receipts have no separate presentation slot. */
export function isNeutralScoreReceipt(event:ScoreEvent):boolean {
 const unchanged=event.before.H.n===event.after.H.n&&event.before.H.d===event.after.H.d&&event.before.M.n===event.after.M.n&&event.before.M.d===event.after.M.d;
 return unchanged&&(event.sourceType==='rule'&&event.sourceDefinitionId==='route-growth'&&['route-factor','route-clear','route-clear-family'].includes(event.operation)||event.sourceType==='card'&&event.operation==='add-heat'&&event.value.n==='0');
}
/** Notification data only. A future device adapter must report its real capability. */
export function scoreArrival(event:ScoreEvent):ScoreArrival|undefined {
 if(event.phase==='finalScore')return {eventId:event.eventId,kind:'total',strength:'key',label:readableFractionText(event.value)};
 const cue=scoreContributions(event)[0];if(!cue)return;
 return {eventId:event.eventId,kind:cue.kind==='multiply'?'mult-multiply':cue.target==='H'?'heat':'mult-add',strength:cue.kind==='multiply'?'key':'ordinary',label:cue.label};
}
export const SCORE_CHANNEL={heat:{color:0x247b93,css:'#247b93',size:18},'mult-add':{color:0xb8473a,css:'#b8473a',size:22},'mult-multiply':{color:0x8c561f,css:'#8c561f',size:28},total:{color:0x26313a,css:'#26313a',size:28}};

/** A value stays beside its real source; a matched landing mark arrives locally.
 * No line crosses the table and no second accumulator owns score state. */
export async function presentScoreSource(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,options:{event:ScoreEvent;source:Box;target:Box;viewport:Box;duration:number;reduced:boolean;beside?:boolean;animate:ScoreAnimate;context:EffectContext;protectedBounds?:readonly Box[]}):Promise<void>{
 const cue=scoreArrival(options.event);if(!cue||options.context.signal.aborted)return;const style=SCORE_CHANNEL[cue.kind];
 const group=scene.add.container(0,0).setName('score/source-arrival').setData('eventId',cue.eventId).setData('kind',cue.kind);parent.add(group);
 const label=scene.add.text(0,0,cue.label,{fontFamily:UI_FONT,fontSize:style.size+'px',fontStyle:'bold',color:style.css,backgroundColor:'#fff9ee',resolution:Math.ceil(textDensity(scene)*1.08)}).setName('score/source-value').setOrigin(.5);group.add(label);prepareTextScale(label,1.08);
 const centerX=Math.max(options.viewport.x+label.width/2+4,Math.min(options.viewport.x+options.viewport.width-label.width/2-4,options.source.x+options.source.width/2)),candidates=[...(options.beside?[{x:options.source.x+options.source.width+label.width/2+8,y:options.source.y+options.source.height/2},{x:options.source.x-label.width/2-8,y:options.source.y+options.source.height/2}]:[]),{x:centerX,y:options.source.y-label.height/2-5},{x:centerX,y:options.source.y+options.source.height+label.height/2+5}],clear=({x,y}:{x:number;y:number})=>x-label.width/2>=options.viewport.x+4&&x+label.width/2<=options.viewport.x+options.viewport.width-4&&y-label.height/2>=options.viewport.y&&y+label.height/2<=options.viewport.y+options.viewport.height&&!(options.protectedBounds??[]).some(b=>x+label.width/2>b.x&&x-label.width/2<b.x+b.width&&y+label.height/2>b.y&&y-label.height/2<b.y+b.height),{x,y}=candidates.find(clear)??{x:centerX,y:options.source.y+label.height/2+3};label.setPosition(x,y);crispText(label);
 let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;options.context.signal.removeEventListener('abort',dispose);group.destroy();};options.context.signal.addEventListener('abort',dispose,{once:true});
 try{const t={p:0};await options.animate({targets:t,p:1,duration:options.duration,ease:'Linear',onUpdate:()=>{if(disposed)return;label.setPosition(x,y-(options.reduced?0:Math.min(8,options.duration/20)*t.p)).setAlpha(options.reduced?1:1-.35*t.p);crispText(label);}},options.context);}finally{dispose();}
}

/** One bounded arrival mark in the destination gutter, not a full-table sweep. */
export async function presentScoreArrival(scene:Phaser.Scene,parent:Phaser.GameObjects.Container,options:{event:ScoreEvent;target:Box;duration:number;reduced:boolean;animate:ScoreAnimate;context:EffectContext;notify?:(arrival:ScoreArrival)=>void}):Promise<void>{
 const cue=scoreArrival(options.event);if(!cue||options.context.signal.aborted)return;options.notify?.(cue);if(options.reduced)return;const style=SCORE_CHANNEL[cue.kind],box=options.target;
 const ink=scene.add.graphics().setName('score/arrival-mark').setData('eventId',cue.eventId).setData('kind',cue.kind);parent.add(ink);let disposed=false;const dispose=()=>{if(disposed)return;disposed=true;options.context.signal.removeEventListener('abort',dispose);ink.destroy();};options.context.signal.addEventListener('abort',dispose,{once:true});
 try{const t={p:0};await options.animate({targets:t,p:1,duration:Math.min(options.duration,180),ease:'Sine.Out',onUpdate:()=>{if(disposed)return;ink.clear();ink.lineStyle(cue.strength==='key'?3:2,style.color,.65*(1-t.p));const width=Math.min(box.width*.62,64);ink.lineBetween(box.x+(box.width-width)/2,box.y+box.height+3,box.x+(box.width+width)/2,box.y+box.height+3);}},options.context);}finally{dispose();}
}
