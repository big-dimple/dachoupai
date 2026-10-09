import type {BuildKeepsake} from './BuildKeepsake';
import {buildKeepsakeView,compactBuildKeepsakeView} from './BuildKeepsakeView';
import {AudioEngine} from '../audio/AudioEngine';
import {observeSuitSymbols} from './SuitSymbols';
import type {ExperienceCard} from './JokerExperience';
import {decodeArtImage,progressiveArt} from './DetailArt';
import type {CardAbilityCopy} from './CardCopy';
import {mountF09Detail} from './F09Art';
import {createJokerRarityElement,type JokerRarity} from './JokerRarity';
/** Native modal owns focus and readable, scrollable details independently of canvas resize. */
let dismissedPointer:{x:number;y:number;until:number}|undefined;
/** A rapid second tap at a just-dismissed modal button must not reach the canvas behind it. */
export function modalBlocksCanvas(x:number,y:number):boolean {
  return !!document.querySelector('dialog[open]')||!!dismissedPointer&&performance.now()<dismissedPointer.until&&Math.hypot(x-dismissedPointer.x,y-dismissedPointer.y)<24;
}
interface DialogAction {label:string;run:()=>void|Promise<void>;disabled?:boolean;primary?:boolean}
type ArtLoadStatus='unregistered'|'idle'|'loading'|'loaded'|'failed';
interface DialogOptions {keepsake?:BuildKeepsake;keepsakeCompact?:boolean;shopContext?:'purchase'|'held'|'compare'|'sale';cards?:readonly ExperienceCard[];onClose?:()=>void;summaryBody?:string;effectBody?:string;editionBody?:string;ability?:CardAbilityCopy;collapseRules?:boolean;rulesLabel?:string;f09?:{inactive:boolean;bodyInactive?:boolean;alignedLayers?:boolean;reduced:boolean;reason?:string};closeLabel?:string;rarity?:JokerRarity;artLoad?:{status:ArtLoadStatus;readStatus?:()=>ArtLoadStatus;retry?:()=>Promise<boolean>};portrait?:{url:string;thumbnailUrl?:string;fallbackUrl?:string;alt:string;layout?:'card';caption?:string}}
export class DetailDialog {
  private dialog?:HTMLDialogElement;
  private lastPointer?:{x:number;y:number};
  private returnFocus?:HTMLElement;
  private stopArt?:()=>void;
  private afterClose?:()=>void;
  private rarity?:JokerRarity;
  private attachFallback?:(url:string,alt:string)=>void;
  private refreshArt?:()=>void;
  get current():HTMLDialogElement|undefined {return this.dialog;}
  active(dialog:HTMLDialogElement):boolean {return this.dialog===dialog;}
  /** Loader-driven scene refreshes keep an open modal current without rebuilding it. */
  refreshArtLoad():void {this.refreshArt?.();}
  private artVisual(image:HTMLImageElement):HTMLDivElement {
    const visual=document.createElement('div');visual.className='dialog-art-visual';visual.append(image);
    if(this.rarity)visual.append(createJokerRarityElement(this.rarity));return visual;
  }
  /** Reuse the actual Phaser card face for readable poker details, after snapshot resolves. */
  attachCardArt(dialog:HTMLDialogElement,url:string,alt:string,variant:'poker'|'mechanism'='poker'):void {
    if(!this.active(dialog))return;
    if(variant==='mechanism'&&this.attachFallback){this.attachFallback(url,alt);return;}
    if(dialog.querySelector('.dialog-card-art'))return;
    const frame=document.createElement('figure'),image=document.createElement('img');
    image.width=240;image.height=336;frame.className='dialog-card-art dialog-poker-art'+(variant==='mechanism'?' dialog-mechanism-art':'');image.className='dialog-card-image';image.src=url;image.alt=alt;
    frame.append(this.artVisual(image));
    if(variant==='mechanism'){const caption=document.createElement('figcaption');caption.textContent='机制示意';dialog.querySelector('.dialog-scroll')?.prepend(caption);}
    dialog.querySelector('.dialog-content')?.prepend(frame);dialog.classList.add('detail-dialog--illustrated');
  }
  close(expected?:HTMLDialogElement):void {
    if(expected&&!this.active(expected))return;
    if(this.dialog&&this.lastPointer)dismissedPointer={...this.lastPointer,until:performance.now()+350};
    this.stopArt?.();this.stopArt=undefined;
    this.attachFallback=undefined;this.refreshArt=undefined;this.rarity=undefined;
    this.dialog?.close();this.dialog?.remove();this.dialog=undefined;this.lastPointer=undefined;
    const afterClose=this.afterClose;this.afterClose=undefined;afterClose?.();
    if(this.returnFocus?.isConnected)this.returnFocus.focus({preventScroll:true});this.returnFocus=undefined;
  }
  open(title:string,body:string,actions:DialogAction[]=[],options:DialogOptions={}):HTMLDialogElement {
    this.close();this.afterClose=options.onClose;this.returnFocus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
    this.rarity=options.rarity;const cleanups:(()=>void)[]=[];this.stopArt=()=>{for(const cleanup of cleanups)cleanup();};
    const dialog=document.createElement('dialog'),header=document.createElement('header'),heading=document.createElement('h2'),content=document.createElement('p'),layout=document.createElement('div'),copy=document.createElement('div'),row=document.createElement('div'),status=document.createElement('p');
    if(options.shopContext)dialog.dataset.shopContext=options.shopContext;
    dialog.className='detail-dialog'+(options.ability?.plain?' detail-dialog--plain-joker':'');dialog.setAttribute('aria-label',title);heading.textContent=title;content.textContent=body;content.className='dialog-body';row.className='dialog-actions';
    status.className='dialog-status';status.setAttribute('role','status');status.hidden=true;
    header.className='dialog-header';layout.className='dialog-content';copy.className='dialog-copy';const intro=document.createElement('div');intro.className='dialog-intro';
    const eyebrow=document.createElement('span');eyebrow.className='dialog-eyebrow';eyebrow.textContent=options.portrait?'巡演藏牌':'牌桌手记';eyebrow.textContent=options.shopContext==='purchase'?'现货 · 确认后付款':options.shopContext==='sale'?'已持 · 确认后出售':options.shopContext==='held'?'当前持有':options.shopContext==='compare'?'现货与已持':eyebrow.textContent;header.append(eyebrow,heading);
    for(const action of actions){
      const b=document.createElement('button');b.textContent=action.label;b.disabled=!!action.disabled;if(action.primary)b.className='dialog-primary';
      b.onclick=async()=>{AudioEngine.shared.select();b.disabled=true;b.setAttribute('aria-busy','true');status.hidden=true;try{await action.run();}catch{if(this.active(dialog)){status.textContent='操作未完成，请重试。';status.hidden=false;}}finally{if(b.isConnected){b.disabled=!!action.disabled;b.removeAttribute('aria-busy');}}};row.append(b);
    }
    const close=document.createElement('button');close.textContent=options.closeLabel??'关闭';close.className='dialog-close';close.onclick=()=>{AudioEngine.shared.cancel();this.close(dialog);};row.append(close);
    dialog.append(header);
    if(options.portrait){
      const portrait=options.portrait,image=document.createElement('img'),card=portrait.layout==='card';image.className=card?'dialog-card-image':'dialog-portrait';image.alt=portrait.alt;image.decoding='async';
      dialog.classList.add('detail-dialog--illustrated');
      if(card){
        const frame=document.createElement('figure'),visual=this.artVisual(image);frame.className='dialog-card-art';frame.append(visual);
        image.width=615;image.height=768;
        const thumbnailUrl=portrait.thumbnailUrl??portrait.url;
        let closed=false,thumbnailFailed=false,detailReady=false,showingFallback=false,registeredFailed=options.artLoad?.status==='failed',registeredLoading=options.artLoad?.status==='loading';
        let fallback:{url:string;alt:string}|undefined=portrait.fallbackUrl?{url:portrait.fallbackUrl,alt:portrait.alt+'机制示意'}:undefined,retryDecode:AbortController|undefined;
        const loadStatus=document.createElement('div'),retry=document.createElement('button');
        loadStatus.className='detail-art-status dialog-art-load-status';loadStatus.setAttribute('role','status');loadStatus.hidden=true;
        retry.className='detail-art-retry dialog-art-load-retry';retry.type='button';retry.textContent='重试卡面';retry.hidden=true;
        const syncLayers=()=>{
          frame.querySelectorAll<HTMLImageElement>('.f09-layer').forEach(layer=>{layer.hidden=showingFallback;if(!showingFallback)layer.src=image.src;});
          frame.querySelectorAll<HTMLElement>('.f09-lamp').forEach(layer=>{layer.hidden=showingFallback;});
        };
        const updateStatus=()=>{
          const failed=thumbnailFailed||registeredFailed;loadStatus.hidden=!failed&&!registeredLoading;retry.hidden=!failed||registeredLoading;
          loadStatus.textContent=registeredLoading?(showingFallback?'暂用机制示意；牌桌卡面加载中…':'牌桌卡面加载中…'):showingFallback?'暂用机制示意卡面':thumbnailFailed?'卡面暂未加载，可重试':registeredFailed?'牌桌卡面暂未加载，可重试':'';
        };
        if(options.artLoad?.readStatus)this.refreshArt=()=>{
          if(closed)return;const current=options.artLoad!.readStatus!();registeredLoading=current==='loading';
          if(current==='loaded')registeredFailed=false;else if(current==='failed')registeredFailed=true;updateStatus();
        };
        const showFallback=()=>{
          if(!thumbnailFailed||detailReady||!fallback||showingFallback)return;
          showingFallback=true;frame.dataset.artFallback='mechanism';image.src=fallback.url;image.alt=fallback.alt;syncLayers();updateStatus();
        };
        const showReal=()=>{
          thumbnailFailed=false;showingFallback=false;delete frame.dataset.artFallback;frame.classList.remove('art-unavailable');image.alt=portrait.alt;syncLayers();updateStatus();
        };
        this.attachFallback=(url,alt)=>{if(closed)return;fallback={url,alt};showFallback();};
        image.onerror=()=>{
          if(closed)return;if(showingFallback){image.alt='机制示意暂未加载';return;}
          thumbnailFailed=true;detailReady=false;image.alt='卡面暂未加载';frame.classList.add('art-unavailable');showFallback();updateStatus();
        };
        image.onload=()=>{if(!closed&&!showingFallback)showReal();};
        retry.onclick=async()=>{
          if(closed||retry.disabled)return;retry.disabled=true;retry.setAttribute('aria-busy','true');loadStatus.hidden=false;loadStatus.textContent='正在重试卡面…';
          retryDecode?.abort();retryDecode=new AbortController();const signal=retryDecode.signal,retryThumbnail=thumbnailFailed;
          try {
            const [registered,thumbnail]=await Promise.allSettled([
              Promise.resolve().then(()=>options.artLoad?.retry?.()),
              retryThumbnail?decodeArtImage(thumbnailUrl,signal):Promise.resolve(),
            ]);
            if(closed||signal.aborted)return;
            if(options.artLoad?.retry){registeredLoading=false;registeredFailed=registered.status!=='fulfilled'||registered.value!==true;}
            if(retryThumbnail&&thumbnail.status==='fulfilled'&&!detailReady){image.src=thumbnailUrl;showReal();}else updateStatus();
          }catch {if(!closed){loadStatus.textContent=showingFallback?'暂用机制示意卡面，可重试':'卡面暂未加载，可重试';loadStatus.hidden=false;retry.hidden=false;}}
          finally {if(!closed){retry.disabled=false;retry.removeAttribute('aria-busy');}}
        };
        image.src=thumbnailUrl;
        if(options.f09){
          const layer=document.createElement('div');layer.className='dialog-art-layer';image.replaceWith(layer);layer.append(image);
          mountF09Detail(layer,image,options.f09.inactive,options.f09.reduced,options.f09.bodyInactive,options.f09.alignedLayers);dialog.classList.add('f09-detail');
        }
        if(portrait.caption){const caption=document.createElement('figcaption');caption.textContent=portrait.caption;frame.append(caption);}
        frame.append(loadStatus,retry);updateStatus();
        if(portrait.thumbnailUrl)cleanups.push(progressiveArt(frame,image,portrait.url,()=>{if(closed)return;detailReady=true;showReal();}));
        cleanups.push(()=>{closed=true;retryDecode?.abort();image.onerror=null;image.onload=null;retry.onclick=null;});layout.append(frame);
      }else {
        const frame=document.createElement('figure'),message=document.createElement('div'),retry=document.createElement('button');frame.className='dialog-portrait-art';image.width=615;image.height=768;
        message.className='detail-art-status';message.hidden=true;retry.className='detail-art-retry';retry.textContent='重试立绘';retry.hidden=true;let closed=false,controller:AbortController|undefined;
        image.src=portrait.thumbnailUrl??portrait.url;image.onerror=()=>{message.textContent='立绘暂未加载，文字和操作仍可用';message.hidden=false;retry.hidden=false;};image.onload=()=>{message.hidden=true;retry.hidden=true;};
        retry.onclick=async()=>{controller?.abort();controller=new AbortController();retry.disabled=true;try{await decodeArtImage(portrait.url,controller.signal);if(!closed)image.src=portrait.url;}catch{if(!closed)message.textContent='立绘仍未加载，可取消或重试';}finally{if(!closed)retry.disabled=false;}};
        frame.append(image,message,retry);layout.append(frame);
        if(portrait.thumbnailUrl)cleanups.push(progressiveArt(frame,image,portrait.url,()=>{}));
        cleanups.push(()=>{closed=true;controller?.abort();image.onerror=null;image.onload=null;retry.onclick=null;});
      }
    }
    if(options.ability){
      const ability=document.createElement('section'),condition=document.createElement('span'),value=document.createElement('strong'),state=document.createElement('small');
      ability.className='card-ability f09-ability';ability.dataset.inactive=String(!!options.f09?.inactive);condition.textContent=options.ability.condition;value.textContent=options.ability.value;if(options.ability.playerCopy&&options.ability.plain?.steps){
        dialog.classList.add('detail-dialog--stepped-joker');ability.classList.add('is-player-copy','is-stepped');
        const steps=document.createElement('ol');steps.className='ability-main ability-steps';steps.setAttribute('aria-label','生效步骤');
        for(const step of options.ability.plain.steps.steps){const item=document.createElement('li'),when=document.createElement('p'),effect=document.createElement('strong');when.className='ability-when';when.textContent=step.when;effect.textContent=step.effect;if(step.when)item.append(when);item.append(effect);steps.append(item);}ability.append(steps);
        const limits=document.createElement('ul');limits.className='ability-limits ability-step-limits';limits.setAttribute('aria-label','关键限制');for(const text of options.ability.plain.steps.limits){const item=document.createElement('li');item.textContent=text;limits.append(item);}if(limits.childElementCount)ability.append(limits);
      }else if(options.ability.playerCopy){ability.classList.add('is-player-copy');value.textContent=options.ability.plain?.line??options.ability.condition;condition.textContent=options.ability.plain?.essential??options.ability.value;value.className='ability-main';condition.className='ability-limits';ability.append(value);if(condition.textContent)ability.append(condition);}else ability.append(condition,value);
      if(options.ability.state){state.textContent=(options.ability.plain?.steps?'现在：':'')+(options.ability.plain?.status??options.ability.state);ability.append(state);}intro.append(ability);
      if(options.ability.flavor.trim()&&!options.shopContext){const flavor=document.createElement('p');flavor.className='card-flavor';flavor.textContent=options.ability.flavor;copy.append(flavor);}
    }
    if(options.effectBody&&!options.ability){const effect=document.createElement('p');effect.className='dialog-effect';effect.textContent=options.effectBody;intro.append(effect);}
    if(options.summaryBody&&options.ability?.plain?.steps){const summary=document.createElement('p');summary.className='dialog-purchase-summary';summary.textContent=options.summaryBody;intro.append(summary);}
    if(options.editionBody){const edition=document.createElement('p');edition.className='dialog-edition-summary';edition.textContent=options.editionBody;intro.append(edition);}
    if(options.summaryBody&&!options.ability?.plain?.steps){const summary=document.createElement('p');summary.className='dialog-purchase-summary';summary.textContent=options.summaryBody;intro.append(summary);}
    if(options.keepsake&&!options.keepsakeCompact)intro.prepend(buildKeepsakeView(options.keepsake,cleanups));
    if(options.cards?.length){
      const gallery=document.createElement('section');gallery.className='experience-cards';gallery.setAttribute('aria-label','来源与下一步');
      for(const card of options.cards){
        const item=document.createElement('article'),title=document.createElement('h3'),text=document.createElement('p'),copy=document.createElement('div');
        item.className='experience-card';title.textContent=card.title;text.textContent=card.body;copy.append(title);if(card.stat){const stat=document.createElement('strong');stat.className='experience-card-stat';stat.textContent=card.stat;copy.append(stat);}copy.append(text);
        if(card.url){const image=document.createElement('img');image.src=card.url;image.alt=card.title+'卡面';image.width=80;image.height=112;image.decoding='async';image.onerror=()=>{image.hidden=true;};item.append(image);cleanups.push(()=>{image.onerror=null;});}
        if(card.action){const b=document.createElement('button');b.type='button';b.textContent=card.action.label;b.onclick=card.action.run;copy.append(b);}
        if(card.details){const details=document.createElement('details'),label=document.createElement('summary'),text=document.createElement('p');details.className='card-rules';label.textContent='条件、配合与完整损失';text.textContent=card.details;details.append(label,text);copy.append(details);}
        item.append(copy);gallery.append(item);
      }intro.append(gallery);
    }
    if(options.keepsake&&options.keepsakeCompact)intro.append(compactBuildKeepsakeView(options.keepsake,cleanups));
    if(options.collapseRules||options.ability){const rules=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('p');rules.className='card-rules';summary.textContent=options.rulesLabel??'规则与操作';text.textContent=[options.ability?.plain?.details??options.ability?.rules,body].filter(Boolean).join('\n\n');rules.append(summary,text);copy.append(rules,status);}
    else copy.append(content,status);
    const scroll=document.createElement('div');scroll.className='dialog-scroll';if(intro.childElementCount)scroll.append(intro);for(const selector of ['figcaption','.detail-art-status','.detail-art-retry'])for(const node of layout.querySelectorAll(selector))scroll.append(node);scroll.append(copy);layout.append(scroll);dialog.append(layout,row);document.body.append(dialog);
    dialog.addEventListener('cancel',event=>{event.preventDefault();this.close(dialog);});
    dialog.addEventListener('pointerup',event=>{this.lastPointer={x:event.clientX,y:event.clientY};});
    dialog.showModal();this.dialog=dialog;cleanups.push(observeSuitSymbols(dialog));close.focus({preventScroll:true});dialog.scrollTop=0;return dialog;
  }
}
