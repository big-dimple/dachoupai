import type {R2RunState} from '../domain/r2Run';
import type {CharacterId} from './characters';
import type {DetailDialog} from './DetailDialog';
import {mountHeroTags} from './HeroText';
import {characterForNewRun,characterForRun,usesCurrentHeroText} from './CharacterRunCopy';
import {HERO_OPENING} from './HeroOpeningCopy';
import {heroSignature} from './HeroSignature';
import {heroSkillGuide} from './HeroSkillGuide';
import {r2RunModeConfig} from '../content/r2Modes';
import {portraitURL,selectionPortraitURL} from './portraits';

const conditions:Record<CharacterId,string>={
 amo:'先选两对及以上主手，剩余牌里留一组对子或三条；每场一次。',
 erxiang:'先选对子及以上，再选一张有效计分牌交棒；每场一次。',
 laohuan:'先选1–5张弃牌，付得起本次弃牌成本；每场一次。',
 azao:'先用两对及以上实际出牌蓄势；有层时，选两对及以上就能释放。',
 xiemu:'选两对及以上，至少留有10金；每场一次。',
 touye:'选1–5张弃牌，再押下一手牌型并换牌；每场一次。',
};

/** A read-only explanation follows the saved identity, including old passive abilities. */
export function heroExplanationCopy(id:CharacterId,run?:R2RunState,abilityEnabled=true){
 const hero=run?characterForRun(run):characterForNewRun(id),current=!run||usesCurrentHeroText(run);
 let now=abilityEnabled?'选路线并开始对局后，在牌桌点英雄使用技能。':'当前模式关闭角色能力，以下仅供普通局参考。';
 let effect=hero.quickEffect;
 if(run){
  if(!r2RunModeConfig(run).characterAbilityEnabled)now='本模式关闭角色能力，当前不能使用。';
  else if(run.phase==='shop')now='现在是筹备商店；技能要到牌桌使用。';
  else if(run.phase==='stage-ready')now='尚未入场；先进入牌桌，再按技能条件操作。';
  else if(['stage-cleared','run-won','run-lost'].includes(run.phase))now='本场已结束；这里只查看说明，不会发动技能。';
  else if(run.phase==='await-input'||run.pendingRefill){const guide=heroSkillGuide(run);now=guide.step;effect=guide.effect;}
  else now='当前正在处理本局操作；完成后再到牌桌使用。';
 }
 return {hero,current,effect,when:current?conditions[id]:hero.openingPlay,now};
}

const css=`
.hero-explanation[open]{height:min(580px,calc(100dvh - var(--safe-top) - var(--safe-bottom) - 24px))}
.hero-explanation .dialog-content{grid-template-columns:minmax(140px,34%) minmax(0,1fr);gap:18px}
.hero-explanation .dialog-portrait-art{height:auto;width:100%;max-width:260px;align-self:start}
.hero-explanation .dialog-portrait{max-height:42dvh}
.hero-explanation .dialog-eyebrow{color:#386d65}
.hero-explanation .hero-motto{margin:0 0 12px;color:#386d65;font:italic 16px/1.5 Georgia,"Noto Serif SC",serif}
.hero-explanation .hero-fact{margin:0 0 12px;line-height:1.55;font-size:15px;color:#26313a;white-space:pre-line}
.hero-explanation .hero-fact strong{display:block;color:#3f606b;font-size:14px;margin-bottom:3px}
.hero-explanation .hero-example{margin-top:12px}
.hero-explanation .hero-example li{margin:10px 0;line-height:1.55}
.hero-explanation .hero-example small{display:block;color:#59646a}
.hero-explanation .hero-example .example-cards{color:#386d65;font-weight:bold}
@media(max-width:560px){.hero-explanation .dialog-content{grid-template-columns:96px minmax(0,1fr);gap:12px;padding:12px;grid-template-rows:minmax(0,1fr)}.hero-explanation .dialog-portrait-art{width:96px}.hero-explanation .dialog-portrait{max-height:180px}.hero-explanation .hero-motto{font-size:15px}.hero-explanation .hero-fact{margin-bottom:10px}.hero-explanation h2{font-size:22px}}
`;

export function showHeroExplanation(dialog:DetailDialog,id:CharacterId,options:{run?:R2RunState;abilityEnabled?:boolean;actions?:{label:string;run:()=>void;disabled?:boolean}[];guide?:ReturnType<typeof heroSkillGuide>;status?:string;closeLabel?:string;onClose?:()=>void}={}):HTMLDialogElement {
 const copy=heroExplanationCopy(id,options.run,options.abilityEnabled),hero=copy.hero;
 if(options.guide){copy.now=options.guide.step;copy.effect=options.guide.effect;}if(options.status)copy.now=options.status;
 // Canvas entries are focusable; closing returns keyboard control to the same surface.
 if(!document.querySelector('dialog[open]'))document.querySelector<HTMLCanvasElement>('canvas')?.focus({preventScroll:true});
 const d=dialog.open(hero.name+' · '+hero.passiveName,hero.detailRules,options.actions??[],{closeLabel:options.closeLabel??'返回',onClose:options.onClose,collapseRules:true,rulesLabel:'完整能力与限制',portrait:{url:portraitURL(id),thumbnailUrl:selectionPortraitURL(id),alt:hero.name}});
 d.classList.add('hero-explanation');if(!portraitURL(id))d.classList.add('hero-explanation--text');d.dataset.hero=id;
 const style=document.createElement('style');style.textContent=css+' .hero-explanation--text .dialog-content{display:block}.hero-explanation--text .dialog-intro{max-width:680px}';d.append(style);
 d.querySelector('.dialog-eyebrow')!.textContent='英雄说明 · 只查看不消耗';
 const intro=document.createElement('div');intro.className='dialog-intro';
 const story=document.createElement('details'),storyLabel=document.createElement('summary'),motto=document.createElement('p'),bio=document.createElement('p');
 story.className='card-rules hero-story';storyLabel.textContent='人物故事与宣言';motto.className='hero-motto';motto.textContent='“'+HERO_OPENING[id].taunt+'”';bio.className='hero-fact';bio.textContent=hero.intro;story.append(storyLabel,motto,bio);
 for(const [label,value] of [['做什么',copy.effect],...(!copy.current?[['何时能用',copy.when]]:[]),['现在',copy.now]]){const p=document.createElement('p'),title=document.createElement('strong');p.className='hero-fact';title.textContent=label;p.append(title,document.createTextNode(value));intro.append(p);}
 const theme=document.createElement('p');theme.className='hero-fact hero-theme';theme.textContent=hero.title;intro.append(theme,story);
 if(copy.current){
  const example=document.createElement('details'),summary=document.createElement('summary');example.className='card-rules hero-example';summary.textContent='点开看一个技能例子';example.append(summary);
  // Examples are educational public cards, created only after the player asks to see them.
  let mounted=false;example.addEventListener('toggle',()=>{if(!example.open||mounted)return;mounted=true;const list=document.createElement('ol');for(const beat of heroSignature(id).beats){const item=document.createElement('li'),cards=document.createElement('span'),result=document.createElement('small');cards.className='example-cards';cards.textContent=beat.cards.join('　');result.textContent=beat.result;item.append(document.createTextNode(beat.label+' '),cards,result);list.append(item);}const note=document.createElement('p');note.textContent='规则示例，不是本局手牌或预计得分。';example.append(list,note);});
  intro.append(example);
 }
 // DetailDialog omits an empty intro; this explanation supplies its own compact first layer.
 d.querySelector('.dialog-scroll')!.prepend(intro);mountHeroTags(d,hero.skillTags);
 return d;
}
