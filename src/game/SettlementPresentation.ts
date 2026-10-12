import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import type {ScoreEvent} from '../domain/scoreR2';
import {Rational} from '../domain/rational';
import {r2JokerDefinitionFor} from '../domain/r2ContentProfiles';
import {HAND_LABELS} from '../content/handLabels';
import {rankLabel,SUIT_SYMBOL} from '../cards/types';
import {resultStageFacts} from './ResultStage';
import {stageOutcome} from './stageOutcome';
import {getCharacter} from './characters';
import {selectionPortraitKey,avatarKey} from './portraits';
import {jokerArtKey} from './jokerArt';
import {heatText,readableFractionText} from './scoreText';
import {failureSummary} from './FailureSummary';
import {PAPER_THEME as T,PAPER_CSS as C,SCORE_FONT} from './theme';
import type {SceneView} from './SceneView';
import type {Box} from './layout';

const scoring=(e:ScoreEvent)=>!['base','finalScore','afterHand','onStageClear','beforeFailure'].includes(e.phase);
const increased=(e:ScoreEvent,metric:'H'|'M')=>Rational.fromJSON(e.after[metric]).compare(Rational.fromJSON(e.before[metric]))>0;
const multiplicative=(e:ScoreEvent)=>scoring(e)&&increased(e,'M')&&['multiply-multiplier','read-coefficient','rescue-multiplier','route-factor'].includes(e.operation);
/** Event value is a source factor. The final accumulator belongs to the entire hand. */
export function settlementFacts(run:R2RunState,cleared:boolean,skipped=false){
 const saved=resultStageFacts(run,cleared,skipped),trace=saved.trace;
 const factors=trace?.events.filter(multiplicative)??[];
 const score=BigInt(trace?.finalScore??'0');
 const tier=score>=100000000n?3:score>=10000000n?2:factors.length>=2?1:0;
 const tag=skipped?'换场留影':!cleared?'此番落幕':tier===3?'亿分落定':tier===2?'千万喝彩':tier===1?'连锁成势':'好戏收束';
 const hero=trace?.events.find(e=>scoring(e)&&e.sourceType==='character'&&e.sourceDefinitionId===run.characterId&&(increased(e,'H')||increased(e,'M')));
 const cardEvent=factors.find(e=>e.sourceType==='joker')??trace?.events.find(e=>scoring(e)&&e.sourceType==='joker'&&(increased(e,'H')||increased(e,'M')));
 const card=cardEvent?{id:cardEvent.sourceDefinitionId,name:r2JokerDefinitionFor(run,cardEvent.sourceDefinitionId).name,event:cardEvent}:undefined;
 const operation=(e:ScoreEvent)=>multiplicative(e)?'×'+readableFractionText(e.value):increased(e,'H')?'热度 +'+readableFractionText(e.value):'倍率 +'+readableFractionText(e.value);
 const cardCopy=card?trace!.events.filter(e=>scoring(e)&&e.sourceType==='joker'&&e.sourceInstanceId===card.event.sourceInstanceId&&(increased(e,'H')||increased(e,'M'))).map(e=>e.operation==='read-growth'?'读取 +'+readableFractionText(e.value)+(increased(e,'H')?' 热度':' 倍率'):operation(e)).join('\n'):undefined;
 const heroCopy=hero?(trace?.xiemuBurn?.cost?'燃'+trace.xiemuBurn.cost+'金 · ':trace?.azaoCharge?.release?'释放'+trace.azaoCharge.before.charge+'层 · ':'本手兑现 · ')+operation(hero):'本局角色';
 const route=trace?.events.find(e=>e.operation==='route-factor'&&multiplicative(e));
 const routeCopy=route?'本局资历 '+route.routeFamily+route.resourceBefore+' · ×'+readableFractionText(route.value):undefined;
 // Keep the complete ordered trace in the existing inspection. This line is a subset, never a claimed total.
 const chain=factors.filter(e=>e.sourceType==='joker').slice(0,3).map(e=>r2JokerDefinitionFor(run,e.sourceDefinitionId).name+' ×'+readableFractionText(e.value));
 return {...saved,tier,tag,hero,heroCopy,card,cardCopy,operation,routeCopy,chain,factorCount:factors.length};
}

export function settlementPlan(b:Box,short=false){
 const desktop=b.width>=600,pad=desktop?28:16,inner={x:b.x+pad,y:b.y+pad,width:b.width-pad*2,height:b.height-pad*2};
 if(desktop||short){const width=short?Math.min(120,inner.width*.26):Math.min(310,inner.width*.34);return {desktop,short,hero:{...inner,width},score:{...inner,x:inner.x+width+24,width:inner.width-width-24},source:{x:inner.x,y:inner.y+inner.height-100,width,height:100}};}
 const top=Math.min(242,Math.max(190,inner.height*.56));
 return {desktop,short,score:{...inner,height:top},hero:{x:inner.x,y:inner.y+top+8,width:inner.width*.42,height:inner.height-top-8},source:{x:inner.x+inner.width*.46,y:inner.y+top+8,width:inner.width*.54,height:inner.height-top-8}};
}

function fit(view:SceneView,x:number,y:number,text:string,size:number,width:number,color=C.ink,name='',center=false){
 const item=view.text(x,y,text,size,color).setName(name);
 if(center)item.setOrigin(.5,0);
 for(let font=size;item.width>width&&font>14;)item.setFontSize(--font);
 if(item.width>width)item.setWordWrapWidth(width,true);
 return item;
}
/** All imagery stays contained. Fixed boxes survive missing or late optional resources. */
export function drawSettlement(scene:Phaser.Scene,view:SceneView,b:Box,run:R2RunState,cleared:boolean,skipped:boolean,stageHeat:string){
 const facts=settlementFacts(run,cleared,skipped),p=settlementPlan(b,view.layout.height<500),lost=!cleared&&!skipped,accent=lost?T.ink:facts.tier?T.red:T.jade;
 const paper=scene.add.graphics().setName('result-art/stage').setData('bounds',b);
 paper.fillStyle(T.ink,.04).fillRoundedRect(b.x,b.y+3,b.width,b.height,4).fillStyle(T.paperLight).fillRoundedRect(b.x,b.y,b.width,b.height,4);
 paper.lineStyle(1,T.divider,.7).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,4);view.add(paper);
 if(scene.textures.exists('p00-paper'))view.add(scene.add.tileSprite(b.x+3,b.y+3,b.width-6,b.height-6,'p00-paper').setOrigin(0).setAlpha(.10));
 const ink=scene.add.graphics().setName('result-art/ink');view.add(ink);
 ink.lineStyle(2,accent,.8).beginPath().moveTo(b.x+12,b.y+32).lineTo(b.x+12,b.y+12).lineTo(b.x+42,b.y+12).strokePath();
 ink.lineStyle(1,accent,.25).beginPath().moveTo(b.x+b.width-12,b.y+b.height-38).lineTo(b.x+b.width-12,b.y+b.height-12).lineTo(b.x+b.width-44,b.y+b.height-12).strokePath();
 if(p.desktop)ink.lineStyle(1,T.divider,.6).beginPath().moveTo(p.score.x-13,b.y+30).lineTo(p.score.x-13,b.y+b.height-30).strokePath();
 const main=p.score,center=main.x+main.width/2,compact=p.short||main.height<200;
 const tag=fit(view,main.x,main.y,facts.tag,p.desktop?18:16,main.width,C.jade,'result/tier').setFontFamily('Georgia, "Noto Serif SC", SimSun, serif');
 if(run.stage?.boss&&!skipped){const seal=fit(view,main.x+main.width,main.y,lost?'压轴未过':'压轴击败',14,main.width/2,lost?C.jade:C.red,'result/boss-seal').setOrigin(1,0);seal.setData('savedBoss',run.stage.boss.definitionId);}
 const hand=facts.trace?HAND_LABELS[facts.trace.handType]+' · Lv.'+facts.trace.level:lost?failureSummary(run).reason:'本场热度';
 const handText=p.short?tag.setText(facts.tag+(facts.trace?' · '+HAND_LABELS[facts.trace.handType]:'')):fit(view,center,tag.y+tag.height+(compact?6:12),hand,16,main.width,C.ink,'result/hand',true);
 const scoreY=handText.y+handText.height+(compact?5:12),size=p.short?36:compact?38:p.desktop?(facts.tier>=2?88:72):facts.tier>=2?54:48;
 const score=fit(view,center,scoreY,(facts.trace?'+':'')+heatText(facts.trace?.finalScore??stageHeat),size,main.width-4,facts.tier?C.red:C.ink,'result/score',true).setFontFamily(SCORE_FONT).setFontStyle('bold');
 // Set the actual score family before fitting: its measured width differs from the UI family.
 for(let font=size;score.width>main.width-4&&font>24;)score.setFontSize(--font);
 const formulaY=score.y+score.height+6;
 const formula=facts.trace?'H '+readableFractionText(facts.trace.accumulator.H)+'  ×  累计 M '+readableFractionText(facts.trace.accumulator.M):lost?'目标 '+heatText(run.stage!.targetHeat)+' · 差 '+heatText((BigInt(run.stage!.targetHeat)-BigInt(stageHeat)).toString()):'已保存的本场结果';
 const formulaText=fit(view,center,formulaY,formula,14,main.width,C.jade,'result/formula',true);
 const gap=fit(view,center,formulaText.y+formulaText.height+6,skipped?'本场跳过':lost?failureSummary(run).lastHand:'全场 '+heatText(stageHeat)+' / '+heatText(run.stage!.targetHeat),14,main.width,C.jade,'result/gap',true);
 let y=gap.y+gap.height+10;
 if(!compact&&facts.routeCopy){const route=fit(view,center,y,facts.routeCopy,14,main.width,C.jade,'result/route-factor',true);y+=route.height+5;}
 if(!compact&&facts.chain.length>=2){const row=fit(view,center,y,facts.chain.join(' · '),14,main.width,C.jade,'result/chain-sources',true);y+=row.height+5;}
 const reward:Box={x:p.desktop?main.x+main.width*.6:main.x,y:p.desktop?main.y+main.height-54:b.y+b.height-50,width:p.desktop?main.width*.4:main.width,height:42};
 // Mobile keeps the reward beside the lower portrait; score receives the whole upper width.
 if(!p.desktop&&!p.short){reward.x=p.source.x;reward.width=p.source.width;}
 const artLayer=scene.add.container(0,0).setName('result-art/source-layer');view.add(artLayer);
 const paint=()=>{
  artLayer.removeAll(true);const start=view.root.length;
  const hero=p.hero,heroFoot=p.desktop?64:28,heroHeight=Math.max(0,hero.height-heroFoot),key=selectionPortraitKey(run.characterId);
  const addArt=(key:string,box:Box,name:string,id:string)=>{const image=scene.add.image(box.x+box.width/2,box.y+box.height/2,key).setName(name).setData('assetId',id).setData('bounds',box);image.setScale(Math.min(box.width/image.width,box.height/image.height));view.add(image);return image;};
  let heroImage:Phaser.GameObjects.Image|undefined;
  if(heroHeight>=40&&scene.textures.exists(key))heroImage=addArt(key,{...hero,height:heroHeight},'result-art/hero',run.characterId+'.selection');
  else if(heroHeight>=40&&scene.textures.exists(avatarKey(run.characterId)))heroImage=addArt(avatarKey(run.characterId),{...hero,y:hero.y+heroHeight*.2,height:Math.min(100,heroHeight*.6)},'result-art/hero',run.characterId+'.avatar');
  else if(heroHeight>=40){
   const played=facts.trace?.sets.playedIds.map(id=>facts.trace!.cards.find(c=>c.id===id)).filter(c=>!!c)??[];
   fit(view,hero.x+hero.width/2,hero.y+heroHeight*.22,played.length?'本手落牌':'构筑留影',16,hero.width,C.jade,'result-art/hero-fallback',true);
   if(played.length)fit(view,hero.x+hero.width/2,hero.y+heroHeight*.22+28,played.map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join(' '),16,hero.width,C.ink,'result/played-cards',true);
  }
  const heroName=fit(view,hero.x+hero.width/2,hero.y+heroHeight+2,getCharacter(run.characterId).name,p.desktop?20:16,hero.width,C.ink,'result/hero-name',true).setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
  if(p.desktop&&!p.short)fit(view,hero.x+hero.width/2,heroName.y+heroName.height+6,facts.heroCopy,14,hero.width,facts.hero?C.red:C.jade,'result/hero-effect',true);
  const source=p.desktop?{x:main.x,y:main.y+main.height-92,width:main.width*.56,height:90}:p.source;
  const card=facts.card,cardWidth=p.desktop?62:52,cardHeight=cardWidth*1.4,textX=source.x+(card?cardWidth+12:0),textWidth=source.width-(card?cardWidth+12:0);
  if(card&&!p.short){const cardBox={x:source.x,y:source.y,width:cardWidth,height:cardHeight},cardKey=jokerArtKey(card.id);
   if(cardKey&&scene.textures.exists(cardKey))addArt(cardKey,cardBox,'result-art/source',card.id+'.thumbnail');
   else {view.material(cardBox,T.paper,T.paper,3);view.add(scene.add.graphics().lineStyle(1,T.divider).strokeRoundedRect(cardBox.x,cardBox.y,cardBox.width,cardBox.height,3));fit(view,cardBox.x+cardWidth/2,cardBox.y+cardHeight/2-18,'本手\n来源',14,cardWidth-8,C.jade,'result-art/source-fallback',true);}
  }
  if(!p.short&&source.height>=80){
   let sy=source.y;
   if(!p.desktop&&facts.hero){const h=fit(view,textX,sy,facts.heroCopy,14,textWidth,C.red,'result/hero-effect');sy+=h.height+6;}
   if(card){const name=fit(view,textX,sy,card.name,14,textWidth,C.ink,'result/source-continuity').setFontStyle('bold');sy+=name.height+4;
    const effect=fit(view,textX,sy,facts.cardCopy!,14,textWidth,C.jade,'result/source-effect');sy+=effect.height+4;
    const growth=facts.growth?.definitionId===card.id?facts.growth:undefined;
    if(growth&&p.desktop)fit(view,textX,sy,'本手读取 '+growth.before+' · 手后存 '+growth.after+'（下手生效）',14,textWidth,C.jade,'result/growth-saved');
   }else if(facts.trace){
    const played=facts.trace.sets.playedIds.map(id=>facts.trace!.cards.find(c=>c.id===id)).filter(c=>!!c);
    const label=fit(view,textX,sy,'本手落牌 · 已保存',14,textWidth,C.jade,'result-art/hand-fallback');sy+=label.height+6;
    fit(view,textX,sy,played.map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join('  '),18,textWidth,C.ink,'result/played-cards');
   }else if(lost)fit(view,textX,sy,'构筑已留影\n可回看最后一手',14,textWidth,C.jade,'result/failure-keepsake');
  }
  artLayer.add(view.root.list.slice(start));
  return heroImage;
 };
 const hero=paint();
 return {facts,score,reward,paint,hero,stage:b};
}

/** One real second, independent of Phaser's acceleration. No input or command callback. */
export function mountSettlementMotion(scene:Phaser.Scene,root:Phaser.GameObjects.Container,stage:Box,score:Phaser.GameObjects.Text,hero:Phaser.GameObjects.Image|undefined,tier:number,lost:boolean){
 const group=scene.add.container(0,0).setName(lost?'result/failure-motion':'result/victory-motion').setData('startedAt',performance.now());
 // Insert behind every fact; geometry stays strictly inside the result paper.
 const paperIndex=root.list.findIndex(o=>o.name==='result-art/stage');root.addAt(group,Math.max(0,paperIndex+2));const strokes=scene.add.graphics();group.add(strokes);
 const color=lost?T.ink:tier?T.red:T.jade,count=lost?2:tier+1;
 for(let i=0;i<count;i++){const y=stage.y+stage.height*(.3+i*.10);strokes.fillStyle(color,.035+i*.012).fillPoints([{x:stage.x+18,y:y+8},{x:stage.x+stage.width-18,y:y-3},{x:stage.x+stage.width-24,y:y+7},{x:stage.x+22,y:y+17}],true);}
 const started=performance.now(),sx=score.scaleX,sy=score.scaleY,hx=hero?.x,hy=hero?.y;let disposed=false;
 const restore=()=>{if(score.active)score.setScale(sx,sy);if(hero?.active)hero.setPosition(hx!,hy!);};
 const dispose=()=>{if(disposed)return;disposed=true;scene.events.off('update',update);restore();if(group.active)group.destroy();};
 const update=()=>{const t=Math.min(1,(performance.now()-started)/1000),land=Math.min(1,t/.32),ease=1-(1-land)**3;
  if(score.active)score.setScale(sx*(.97+.03*ease),sy*(.97+.03*ease));
  if(hero?.active)hero.y=hy!+(lost?-1:1)*7*(1-ease);
  strokes.setAlpha(t<.32?ease:t<.72?1:(1-t)/.28);
  if(t===1)dispose();
 };
 scene.events.on('update',update);update();return {dispose};
}
