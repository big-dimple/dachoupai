import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import type {Box} from './layout';
import type {SceneView} from './SceneView';
import {resultStageFacts} from './ResultStage';
import {selectionPortraitKey,avatarKey} from './portraits';
import {getCharacter} from './characters';
import {jokerArtKey} from './jokerArt';
import {HAND_LABELS} from '../content/handLabels';
import {PAPER_CSS as C,PAPER_THEME as T,SCORE_FONT} from './theme';
import {resultInteger,resultFraction} from './ResultScoreNumber';

/** A saved hand, not a recomputed score or a reward forecast. */
export function resultStrongHand(facts:ReturnType<typeof resultStageFacts>,target:string):boolean {
 const t=facts.trace;
 return !!t&&BigInt(t.finalScore)>=10000n&&BigInt(t.finalScore)>=BigInt(target)*2n&&BigInt(t.accumulator.M.n)>=10n*BigInt(t.accumulator.M.d);
}
export function drawResultScoreComposition(scene:Phaser.Scene,v:SceneView,b:Box,run:R2RunState,stageHeat:string){
 const facts=resultStageFacts(run,true),trace=facts.trace!,strong=resultStrongHand(facts,run.stage!.targetHeat),mobile=b.width<600,pad=mobile?16:32;
 const dense=b.height<240,heroWidth=mobile?(dense?58:78):Math.min(210,b.width*.25),heroHeight=mobile?(dense?86:116):Math.min(280,b.height-40);
 const hero={x:mobile?b.x+b.width-pad-heroWidth:b.x+pad,y:b.y+pad,width:heroWidth,height:heroHeight};
 const main={x:mobile?b.x+pad:hero.x+hero.width+36,y:b.y+pad,width:mobile?b.width-pad*2-heroWidth-10:b.width-pad*2-hero.width-36};
 const label=v.text(main.x,main.y,HAND_LABELS[trace.handType]+' · 本手得分',14,C.jade,main.width).setName('result/hand');
 const scoreY=label.y+label.height+(mobile?6:12),size=mobile?dense?36:46:84;
 const score=v.text(main.x,scoreY,resultInteger(trace.finalScore),size,strong?C.red:C.ink).setFontFamily(SCORE_FONT).setFontStyle('bold').setName('result/score');
 while(score.width>main.width&&parseInt(String(score.style.fontSize))>24)score.setFontSize(parseInt(String(score.style.fontSize))-1);
 const formula=v.text(main.x,score.y+score.height+5,`热度 ${resultFraction(trace.accumulator.H)} · 倍率 ${resultFraction(trace.accumulator.M)}`,14,C.jade,main.width).setName('result/formula');
 const totalY=mobile?Math.max(hero.y+hero.height,formula.y+formula.height)+8:formula.y+formula.height+14;
 const total=v.text(mobile?b.x+pad:main.x,totalY,`全场 ${resultInteger(stageHeat)}  /  目标 ${resultInteger(run.stage!.targetHeat)}`,14,C.jade,mobile?b.width-pad*2:main.width).setName('result/gap');
 const rewardHeight=38,rewardY=b.y+b.height-rewardHeight-12;
 const sourceY=total.y+total.height+(mobile?32:44),sourceX=mobile?b.x+pad:main.x,sourceWidth=mobile?b.width-pad*2:main.width;
 const sourceHeight=Math.max(0,rewardY-sourceY-8);
 const cardMultipliers=trace.events.filter(e=>e.sourceType==='card'&&e.operation==='multiply-multiplier'&&BigInt(e.value.n)>BigInt(e.value.d)).length;
 const cards=trace.sets.activeScoringIds.length;
 if(sourceHeight>=0)v.text(sourceX,sourceY-22,`${cards} 张实际计分牌`+(cardMultipliers?` · ${cardMultipliers} 次连乘`:''),14,C.jade,sourceWidth).setName('result/card-contribution');
 const art:Phaser.GameObjects.Image[]=[];
 let layer:Phaser.GameObjects.Container|undefined;
 const paint=()=>{
  layer?.destroy();art.length=0;const start=v.root.length;
  const portrait=[selectionPortraitKey(run.characterId),avatarKey(run.characterId)].find(key=>scene.textures.exists(key));
  if(portrait){const image=scene.add.image(hero.x+hero.width/2,hero.y+hero.height/2,portrait).setName('result-art/hero');image.setScale(Math.min(hero.width/image.width,hero.height/image.height));v.add(image);art.push(image);}
  else {v.material(hero,T.paperLight,T.paperLight,4);v.text(hero.x+hero.width/2,hero.y+16,getCharacter(run.characterId).name,16,C.jade,hero.width-8).setOrigin(.5,0).setName('result-art/hero-fallback');}
  // Identity is not a claim of an active skill: the label states actual contribution separately.
  if(!mobile)v.text(hero.x,hero.y+hero.height+6,getCharacter(run.characterId).name+(facts.character?' · 本手参与计分':' · 本局角色'),14,C.jade,hero.width).setName('result/hero-identity');
  if(sourceHeight>=20&&facts.source){
   const source=facts.source,growth=facts.growth,key=source&&jokerArtKey(source.definitionId),h=Math.min(72,sourceHeight),w=h*5/7,hasArt=!!key&&scene.textures.exists(key)&&sourceHeight>=48;
   if(hasArt){const image=scene.add.image(sourceX+w/2,sourceY+h/2,key!).setName('result-art/source');image.setScale(Math.min(w/image.width,h/image.height));v.add(image);art.push(image);}
   const x=sourceX+(hasArt?w+12:0),width=sourceWidth-(hasArt?w+12:0);
   const name=(growth?'成长 · ':'来源 · ')+(growth?.name??source!.title);
   const heading=v.text(x,sourceY,name,14,C.ink,width).setFontStyle('bold').setName('result/source-continuity');
   const prefix=growth?.metric.includes('×')?'×':'+';
   const detail=growth?`本手读取 ${prefix}${growth.before} · 保存至 ${prefix}${growth.after}\n成长下手生效`:source?source.effect:facts.character?'角色效果已计入本手':'牌型与计分牌已结算';
   const room=sourceHeight-heading.height-4;
   if(room>=18)v.text(x,heading.y+heading.height+4,detail,14,C.jade,width).setStyle({maxLines:Math.floor(room/18)}).setName(growth?'result/growth-next':'result/source-effect');
  }
  layer=scene.add.container(0,0,v.root.list.slice(start)).setName('result-art/source-layer');v.add(layer);
 };
 paint();
 // A single quiet ink rule connects the score/source group to the saved reward.
 v.add(scene.add.graphics().lineStyle(1,T.jade,.28).beginPath().moveTo(b.x+pad,rewardY-6).lineTo(b.x+b.width-pad,rewardY-6).strokePath()).setName('result-art/reward-rule');
 return {score,art,paint,strong,band:{x:mobile?b.x+pad:main.x,y:rewardY,width:mobile?b.width-pad*2:main.width,height:rewardHeight}};
}
