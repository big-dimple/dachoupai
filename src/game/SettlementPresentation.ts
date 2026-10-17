import {cardDefinitionName} from './tangsongCardNames';
import type Phaser from 'phaser';
import type {R2RunState} from '../domain/r2Run';
import type {ScoreEvent} from '../domain/scoreR2';
import {isR2BoundedClear} from '../domain/r2GroupUpgrade';
import {scoreSourceProcess} from './ScoreSourceProcess';
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
import {savedSkillName,strongestJokerFactor,settlementBeat} from './SettlementHighlights';

const scoring=(e:ScoreEvent)=>!['base','finalScore','afterHand','onStageClear','beforeFailure'].includes(e.phase);
const increased=(e:ScoreEvent,metric:'H'|'M')=>Rational.fromJSON(e.after[metric]).compare(Rational.fromJSON(e.before[metric]))>0;
const multiplicative=(e:ScoreEvent)=>scoring(e)&&increased(e,'M')&&['multiply-multiplier','read-coefficient','rescue-multiplier','route-factor'].includes(e.operation);
const retriggered=(e:ScoreEvent)=>scoring(e)&&e.operation==='retrigger-card'&&BigInt(e.value.n)>0n;
const benefited=(e:ScoreEvent)=>scoring(e)&&(increased(e,'H')||increased(e,'M')||retriggered(e));
/** Event value is a source factor. The final accumulator belongs to the entire hand. */
export function settlementFacts(run:R2RunState,cleared:boolean,skipped=false){
 const saved=resultStageFacts(run,cleared,skipped),trace=saved.trace;
 const factors=trace?.events.filter(multiplicative)??[];
 const score=BigInt(trace?.finalScore??'0');
 const retriggers=trace?.events.filter(e=>scoring(e)&&e.operation==='retrigger-card'&&BigInt(e.value.n)>0n).length??0;
 const tier=score>=100000000n?3:score>=1000000n?2:factors.length>=2||retriggers>=2?1:0;
 const tag=skipped?'换场留影':!cleared?'本局结束':tier===3?'亿分落定':tier===2?(score>=10000000n?'千万喝彩':'百万喝彩'):tier===1?'连锁成势':'本场结算';
 const hero=trace?.events.find(e=>scoring(e)&&e.sourceType==='character'&&e.sourceDefinitionId===run.characterId&&(increased(e,'H')||increased(e,'M')));
 const cardEvent=(trace&&strongestJokerFactor(trace,factors))??trace?.events.find(e=>e.sourceType==='joker'&&benefited(e));
 const card=cardEvent?{id:cardEvent.sourceDefinitionId,name:cardDefinitionName(r2JokerDefinitionFor(run,cardEvent.sourceDefinitionId)),event:cardEvent}:undefined;
 const operation=(e:ScoreEvent)=>multiplicative(e)?'×'+readableFractionText(scoreSourceProcess(trace!,e,'')?.factor??e.value):increased(e,'H')?'热度 +'+readableFractionText(e.value):'倍率 +'+readableFractionText(e.value);
 const cardEvents=card?trace!.events.filter(e=>e.sourceType==='joker'&&e.sourceInstanceId===card.event.sourceInstanceId&&benefited(e)):[];
 const reads=new Map<string,number>();
 for(const e of cardEvents.filter(e=>!retriggered(e))){const copy=e.operation==='read-growth'?'读取 +'+readableFractionText(e.value)+(increased(e,'H')?' 热度':' 倍率'):operation(e);reads.set(copy,(reads.get(copy)??0)+1);}
 const repeatCount=cardEvents.filter(retriggered).reduce((sum,e)=>sum.add(Rational.fromJSON(e.value)),new Rational(0n));
 const labels=[...(repeatCount.compare(new Rational(0n))>0?['再计分'+readableFractionText(repeatCount.toJSON())+'次']:[]),...[...reads].map(([copy,count])=>count>1?copy.replace('热度 +','热+').replace('倍率 +','倍+').replaceAll(' ','')+'·'+count+'次':copy)];
 const cardCopy=card?(labels.length>2?labels[0]+'\n另'+(cardEvents.length-[...reads.values()][0])+'笔':labels.join('\n')):undefined;
 const heroCopy=hero?(trace?.xiemuBurn?.cost?'燃'+trace.xiemuBurn.cost+'金 · ':trace?.azaoCharge?.release?'释放'+trace.azaoCharge.before.charge+'层 · ':'本手兑现 · ')+operation(hero):'本局角色';
 const heroSkill=hero&&savedSkillName(run,trace!,hero);
 const routes=trace?.events.filter(e=>e.operation==='route-factor'&&multiplicative(e))??[];
 const routeCopy=routes.length?'本局资历 '+routes.map(route=>route.routeFamily+String(route.resourceBefore)+' · ×'+readableFractionText(route.value)).join(' · '):undefined;
 const routeSummary=isR2BoundedClear(run)&&routes.length?'过关加成 · '+routes.map(route=>'×'+readableFractionText(route.value)).join(' · '):routes.length?'本局'+routes.map(route=>({G:'同点',S:'顺子',F:'同花'}[route.routeFamily!])+route.resourceBefore+'场').join(' · '):undefined;
 // Keep the complete ordered trace in the existing inspection. This line is a subset, never a claimed total.
 const jokerFactorSourceCount=new Set(factors.filter(e=>e.sourceType==='joker').map(e=>e.sourceInstanceId)).size;
 const chain=factors.filter(e=>e.sourceType==='joker').slice(0,3).map(e=>cardDefinitionName(r2JokerDefinitionFor(run,e.sourceDefinitionId))+' ×'+readableFractionText(e.value));
 return {...saved,stageTotal:run.stage?.heat??'0',tier,tag,hero,heroSkill,heroCopy,card,cardCopy,operation,routeCopy,routeSummary,chain,jokerFactorSourceCount,factorCount:factors.length};
}

/** The portrait, hand result and saved contributions share one compact composition. */
export function settlementContentHeight(width:number,heroCaption=false,highScore=false){
 return width>=600?344:highScore||heroCaption?322:302;
}

export function settlementPlan(b:Box,short=false){
 const desktop=b.width>=600&&!short,compact=short||b.height<290,pad=desktop?24:12;
 const heroWidth=desktop?176:compact?80:96;
 const scoreX=b.x+pad+heroWidth+(desktop?32:14),scoreWidth=b.x+b.width-pad-scoreX;
 const topHeight=desktop?142:compact?108:138,sourceY=b.y+pad+topHeight+8;
 const reward={x:b.x+pad,y:b.y+b.height-(compact?34:44),width:b.width-pad*2,height:compact?26:32};
 return {desktop,short,compact,
  hero:{x:b.x+pad,y:b.y+pad,width:heroWidth,height:desktop?b.height-74:topHeight},
  score:{x:scoreX,y:b.y+pad,width:scoreWidth,height:topHeight},
  source:{x:desktop?scoreX:b.x+pad,y:sourceY,width:desktop?scoreWidth:b.width-pad*2,height:Math.max(40,reward.y-sourceY-10)},reward};
}

function fit(view:SceneView,x:number,y:number,text:string,size:number,width:number,color=C.ink,name='',center=false){
 const item=view.text(x,y,text,size,color).setName(name);
 if(center)item.setOrigin(.5,0);
 for(let font=size;item.width>width&&font>14;)item.setFontSize(--font);
 if(item.width>width)item.setWordWrapWidth(width,true);
 return item;
}

/** Read only: every caption comes from the saved trace; optional art never moves a fact. */
export function drawSettlement(scene:Phaser.Scene,view:SceneView,b:Box,run:R2RunState,cleared:boolean,skipped:boolean){
 const facts=settlementFacts(run,cleared,skipped),lost=!cleared&&!skipped,p=settlementPlan(b,view.layout.height<500);
 const paper=scene.add.graphics().setName('result-art/stage').setData('bounds',b);
 paper.fillStyle(T.paperLight).fillRoundedRect(b.x,b.y,b.width,b.height,6);
 paper.lineStyle(1,T.divider,.65).strokeRoundedRect(b.x+.5,b.y+.5,b.width-1,b.height-1,6);view.add(paper);
 if(scene.textures.exists('p00-paper'))view.add(scene.add.tileSprite(b.x+3,b.y+3,b.width-6,b.height-6,'p00-paper').setOrigin(0).setAlpha(.08));
 const main=p.score,compact=p.compact;
 const hand=skipped?'本场跳过':'本场总热度';
 const tag=fit(view,main.x,main.y,hand,14,main.width,C.jade,'result/hand');
 // The stage total is the result. The last trace explains one contributing hand only.
 const exactScore=facts.stageTotal,scoreLabel=(exactScore.length>15&&/[1-9]/.test(exactScore.slice(3))?'≈':'')+heatText(exactScore);
 const size=p.desktop?(facts.tier>=2?66:60):compact?34:44;
 const score=view.text(main.x,tag.y+tag.height+3,scoreLabel,size,facts.tier?C.red:C.ink).setName('result/score').setWordWrapWidth(0).setFontFamily(SCORE_FONT).setFontStyle('bold').setData('exactScore',exactScore);
 for(let font=size;score.width>main.width&&font>24;)score.setFontSize(--font);
 if(score.width>main.width)score.setScale(main.width/score.width);
 const formula=lost?'目标 '+heatText(run.stage!.targetHeat)+' · 差 '+heatText((BigInt(run.stage!.targetHeat)-BigInt(facts.stageTotal)).toString()):facts.trace?'目标 '+heatText(run.stage!.targetHeat)+' · 已过关':skipped?'本场跳过':'本场累计 '+heatText(facts.stageTotal);
 const formulaText=fit(view,main.x,score.y+score.displayHeight+3,formula,14,main.width,C.jade,'result/formula');
 const receipt=lost?failureSummary(run).lastHand:facts.trace?'末手 '+HAND_LABELS[facts.trace.handType]+' · '+heatText(facts.trace.finalScore):'末手记录不可用';
 fit(view,main.x,formulaText.y+formulaText.height+3,skipped?'没有本场计分':receipt,14,main.width,C.jade,'result/gap');
 // A short horizontal join ends in the gap above the contribution. It never crosses text.
 const source=p.source,linkY=source.y-5;
 view.add(scene.add.graphics().lineStyle(1,facts.tier?T.red:T.jade,.32).beginPath().moveTo(source.x,linkY).lineTo(source.x+source.width,linkY).strokePath()).setName('result-art/contribution-rule');
 if(p.desktop&&facts.tier>=2)fit(view,main.x+main.width,main.y,facts.tag,14,main.width*.45,C.red,'result/tier').setOrigin(1,0);
 const artLayer=scene.add.container(0,0).setName('result-art/source-layer');view.add(artLayer);
 const paint=()=>{
  artLayer.removeAll(true);const start=view.root.length;
  const addArt=(key:string,box:Box,name:string,id:string)=>{const image=scene.add.image(box.x+box.width/2,box.y+box.height/2,key).setName(name).setData('assetId',id).setData('bounds',box);image.setScale(Math.min(box.width/image.width,box.height/image.height));view.add(image);return image;};
  const hero=p.hero,foot=facts.hero?(compact?68:72):p.desktop?40:24,artHeight=Math.max(40,hero.height-foot),key=selectionPortraitKey(run.characterId),box={...hero,height:artHeight};
  let heroImage:Phaser.GameObjects.Image|undefined;
  if(scene.textures.exists(key))heroImage=addArt(key,box,'result-art/hero',run.characterId+'.selection');
  else if(scene.textures.exists(avatarKey(run.characterId)))heroImage=addArt(avatarKey(run.characterId),box,'result-art/hero',run.characterId+'.avatar');
  else fit(view,hero.x+hero.width/2,hero.y+10,getCharacter(run.characterId).name,18,hero.width,C.ink,'result-art/hero-fallback',true);
  const name=fit(view,hero.x+hero.width/2,hero.y+artHeight+3,getCharacter(run.characterId).name,p.desktop?20:16,hero.width,C.ink,'result/hero-name',true).setFontFamily('Georgia, "Noto Serif SC", SimSun, serif').setFontStyle('bold');
  if(facts.hero){
   const skill=fit(view,hero.x+hero.width/2,name.y+name.height+2,facts.heroSkill??'',14,hero.width,C.red,'result/hero-skill',true).setFontStyle('bold');
   // The exact source operation remains directly attached to its owner.
   fit(view,hero.x+hero.width/2,skill.y+skill.height+2,facts.heroCopy.replace('本手兑现 · ',''),14,hero.width,C.red,'result/hero-effect',true).setData('ownerCharacter',run.characterId);
  }
  if(lost){
   fit(view,source.x,source.y,failureSummary(run).reason,14,source.width,C.ink,'result/failure-reason');
  }else if(facts.card){
   const card=facts.card,cardWidth=compact?32:p.desktop?52:40,cardBox={x:source.x,y:source.y,width:cardWidth,height:cardWidth*1.4},cardKey=jokerArtKey(card.id),textX=source.x+cardWidth+12,textWidth=source.width-cardWidth-12;
   if(cardKey&&scene.textures.exists(cardKey))addArt(cardKey,cardBox,'result-art/source',card.id+'.thumbnail');
   else {view.material(cardBox,T.paper,T.paper,3);fit(view,cardBox.x+cardWidth/2,cardBox.y+5,'来源',14,cardWidth-4,C.jade,'result-art/source-fallback',true);}
   const label=fit(view,textX,source.y,'末手来源 · '+card.name,p.desktop?17:14,textWidth,C.ink,'result/source-continuity').setFontStyle('bold');
   const effect=fit(view,textX,label.y+label.height+2,facts.cardCopy!,14,textWidth,C.red,'result/source-effect');
   const growth=facts.growth?.definitionId===card.id&&facts.growth.instanceId===card.event.sourceInstanceId?facts.growth:undefined;
   if(growth)fit(view,textX,effect.y+effect.height+2,'手后 '+growth.before+' → '+growth.after,14,textWidth,C.jade,'result/growth-saved').setData('ownerSourceInstance',card.event.sourceInstanceId);
  }else if(facts.trace){
   const played=facts.trace.sets.playedIds.map(id=>facts.trace!.cards.find(c=>c.id===id)).filter(c=>!!c);
   const label=fit(view,source.x,source.y,'末手牌面',14,source.width,C.jade,'result-art/hand-fallback');
   fit(view,source.x,label.y+label.height+5,played.map(c=>rankLabel(c.rank)+SUIT_SYMBOL[c.suit]).join('  '),18,source.width,C.ink,'result/played-cards');
  }
  artLayer.add(view.root.list.slice(start));return heroImage;
 };
 const hero=paint();
 return {facts,score,reward:p.reward,paint,hero,stage:b};
}

/** One real second, independent of Phaser's acceleration. No input or command callback. */
export function mountSettlementMotion(scene:Phaser.Scene,root:Phaser.GameObjects.Container,stage:Box,score:Phaser.GameObjects.Text,hero:Phaser.GameObjects.Image|undefined,tier:number,lost:boolean){
 const group=scene.add.container(0,0).setName(lost?'result/failure-motion':'result/victory-motion').setData('startedAt',performance.now());
 // Insert behind every fact; geometry stays strictly inside the result paper.
 const paperIndex=root.list.findIndex(o=>o.name==='result-art/stage');root.addAt(group,Math.max(0,paperIndex+2));const strokes=scene.add.graphics();group.add(strokes);
 const color=lost?T.ink:tier?T.red:T.jade,count=lost?2:tier+1;
 for(let i=0;i<count;i++){const y=stage.y+stage.height*(.3+i*.10);strokes.fillStyle(color,.035+i*.012).fillPoints([{x:stage.x+18,y:y+8},{x:stage.x+stage.width-18,y:y-3},{x:stage.x+stage.width-24,y:y+7},{x:stage.x+22,y:y+17}],true);}
 const number=score.getBounds(),landInk=scene.add.graphics().setName('result-art/landing-ink');group.add(landInk);
 if(!lost&&tier>=1){for(let i=0;i<tier;i++){const y=number.y+number.height+3+i*3;landInk.lineStyle(i===0?3:1,color,.65-i*.15).beginPath().moveTo(number.x+number.width*.04,y).lineTo(number.x+number.width*.96,y-2).strokePath();}}
 const started=performance.now(),sx=score.scaleX,sy=score.scaleY,hx=hero?.x,hy=hero?.y;let disposed=false;
 const restore=()=>{if(score.active)score.setScale(sx,sy);if(hero?.active)hero.setPosition(hx!,hy!);};
 const dispose=()=>{if(disposed)return;disposed=true;scene.events.off('update',update);restore();if(group.active)group.destroy();};
 const update=()=>{const beat=settlementBeat(performance.now()-started,tier,lost);group.setData('phase',beat.phase).setData('elapsedMs',performance.now()-started);
  if(score.active)score.setScale(sx*beat.scale,sy*beat.scale);
  if(hero?.active)hero.y=hy!+(lost?-1:1)*7*(1-beat.scale);
  strokes.setAlpha(beat.alpha);landInk.setAlpha(beat.alpha).setScale(beat.phase==='charge'?.7:1,1);
  if(beat.progress===1)dispose();
 };
 scene.events.on('update',update);update();return {dispose};
}
