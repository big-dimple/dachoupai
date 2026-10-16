import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import type {R2HandType} from '../domain/evaluateR2';
import {HAND_LABELS} from '../content/handLabels';
import {heatText} from './scoreText';
import type {Box} from './layout';
import type {SceneView} from './SceneView';
import {fitScoreLine} from './ScoreTextLayout';
import {textDensity} from './TextRaster';
import {PAPER_THEME as T,PAPER_CSS as C,UI_FONT} from './theme';

/** Public, current-stage facts only. A selected type is a tell, never a score forecast. */
export function opponentChallenge(run:R2RunState,selected?:R2HandType){
 const stage=run.stage;if(run.phase!=='await-input'||stage?.boss?.definitionId!=='B05')return;
 const previous=stage.previousHandType,kind=!previous?'opening':selected?selected===previous?'repeat':'change':'watching';
 const badge=kind==='opening'?'首手不减半':kind==='repeat'?'同型 · 基础½':kind==='change'?'换型 · 基础正常':'再出'+HAND_LABELS[previous!]+' · 基础½';
 const quote=kind==='opening'?'来，让我记住你的第一招。':kind==='repeat'?'这一招，我已经记住了。':kind==='change'?'换招？好，我接着。':'上一招，我记下了。';
 return {kind,previous,selected,badge,quote,target:stage.targetHeat,heat:stage.heat,handsLeft:stage.handsLeft,
  pressure:heatText(stage.heat)+' / '+heatText(stage.targetHeat)+' 热度 · 余'+stage.handsLeft+'手',
  remembered:previous?'已认招 · '+HAND_LABELS[previous]:'尚未出招 · 首手基础正常',
  rule:'连出同型，仅牌型基础½',other:'牌点数、增强、助演热度照常',selection:selected?HAND_LABELS[selected]+' · '+(kind==='opening'?'首手正常':kind==='repeat'?'同型基础½':'换型基础正常'):undefined};
}

/** Owns only the existing empty played-card workplane; no timers, state or extra modal. */
export function mountOpponentChallenge(scene:Phaser.Scene,view:SceneView,parent:Phaser.GameObjects.Container,area:Box,run:R2RunState,open:()=>void):boolean {
 const facts=opponentChallenge(run);if(!facts||area.width<180||area.height<62)return false;
 const compact=area.height<190,b={x:area.x+4,y:area.y+3,width:area.width-8,height:area.height-6},group=scene.add.container(0,0).setName('opponent/challenge').setData('facts',facts).setData('bounds',b);parent.add(group);
 const paper=scene.add.graphics().fillStyle(T.paperLight).fillRoundedRect(b.x,b.y,b.width,b.height,5).lineStyle(1,T.jade,.65).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,5);group.add(paper);
 if(scene.textures.exists('p00-paper'))group.add(scene.add.tileSprite(b.x+3,b.y+3,b.width-6,b.height-6,'p00-paper').setOrigin(0).setAlpha(.13));
 const action={x:b.x+b.width-94,y:b.y+b.height-48,width:88,height:44},copyWidth=compact?b.width-108:b.width-24;
 const text=(name:string,copy:string,y:number,size:number,color:string,width=copyWidth)=>{const t=scene.add.text(0,0,copy,{fontFamily:UI_FONT,fontSize:size+'px',fontStyle:'bold',color,resolution:textDensity(scene)}).setName(name).setData('fullText',copy);group.add(t);fitScoreLine(t,{x:b.x+12,y,width,height:compact?20:28},size,true);return t;};
 text('opponent/name',compact?'回音墙 · 目标 '+heatText(facts.target):'回音墙 · 同行高手',b.y+(compact?3:10),compact?15:22,C.jade);
 text('opponent/challenge-rule',facts.badge+(compact&&b.height<90?' · 余'+facts.handsLeft+'手':''),b.y+(compact?25:46),compact?14:20,facts.previous?C.red:C.jade);
 if(!compact){text('opponent/challenge-quote','“'+facts.quote+'”',b.y+80,20,C.ink);text('opponent/challenge-scope',facts.rule+' · 其余热度照常',b.y+116,14,C.mutedInk);}
 const pressureY=compact?b.y+b.height-21:b.y+b.height-35;
 if(!compact||b.height>=90)text('opponent/challenge-pressure',compact?'目标 '+heatText(facts.target)+' · 余'+facts.handsLeft+'手':facts.pressure,pressureY,14,C.ink,b.width-112);
 const first=view.root.length,button=view.button(action,'看招 / 应对','opponent/choices',open,true);const objects=view.root.list.slice(first);for(const object of objects)group.add(object);(button.getData('label') as Phaser.GameObjects.Text).setFontSize(13);
 return true;
}
