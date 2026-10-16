import {GAME_NAME} from './Brand';
import './HomePage.css';

// Capture the existing loading artwork before its dialog leaves the document.
// The same inline SVG, suit drawings and shared .load-* styles remain the visual source.
const sceneTemplate=typeof document==='undefined'?undefined:document.querySelector<HTMLElement>('#resource-loading .load-scene')?.cloneNode(true) as HTMLElement|undefined;
const mastheadTemplate=typeof document==='undefined'?undefined:document.querySelector<HTMLElement>('#resource-loading .load-top')?.cloneNode(true) as HTMLElement|undefined;
export interface HomePageModel {summary?:readonly string[];canContinue:boolean;canStart:boolean;notice:boolean;reduced:boolean}

/** Native actions sit with the paper artwork; selection, persistence and routing stay in TitleScene. */
export class HomePage {
 readonly root=document.createElement('main');
 private summary=document.createElement('p');
 private start=document.createElement('button');
 private resume=document.createElement('button');
 private notice=document.createElement('p');
 private busy=false;
 private visibility=()=>this.root.toggleAttribute('data-home-paused',document.hidden);
 constructor(actions:{start:()=>void;resume:()=>void}){
  this.root.className='title-home';this.root.setAttribute('aria-label',GAME_NAME+'首页');
  const sheet=document.createElement('div');sheet.className='home-sheet';
  const masthead=mastheadTemplate?.cloneNode(true) as HTMLElement|undefined;
  if(masthead){masthead.classList.add('home-masthead');masthead.setAttribute('aria-hidden','true');sheet.append(masthead);}
  const art=sceneTemplate?.cloneNode(true) as HTMLElement|undefined;
  if(art){
   art.classList.add('home-hero');art.removeAttribute('aria-hidden');
   for(const ornament of art.querySelectorAll('.load-world,.load-side,.load-fan'))ornament.setAttribute('aria-hidden','true');
   for(const card of art.querySelectorAll('.load-card-seat'))card.classList.add('is-inked');
   sheet.append(art);
  }else {const heading=document.createElement('h1');heading.textContent=GAME_NAME;sheet.append(heading);}
  const entry=document.createElement('section');entry.className='home-entry';entry.setAttribute('aria-label','开始或继续');
  this.summary.className='home-save';this.summary.setAttribute('aria-label','当前存档');
  const buttons=document.createElement('div');buttons.className='home-actions';
  this.resume.type=this.start.type='button';this.resume.textContent='继续本局';this.start.textContent='开始新局';this.resume.dataset.ui='title/action/title-continue';this.start.dataset.ui='title/action/title-start';
  this.resume.onclick=actions.resume;this.start.onclick=actions.start;buttons.append(this.resume,this.start);
  const hint=document.createElement('p');hint.className='home-hint';hint.textContent='选英雄、定路线，开始对局。';
  this.notice.className='home-notice';this.notice.textContent='存档提示请查看右上菜单。';this.notice.setAttribute('role','status');
  entry.append(this.summary,buttons,hint,this.notice);sheet.append(entry);
  const footer=document.createElement('p');footer.className='home-footer';footer.textContent='一纸纳山河 · 六位群英同席';sheet.append(footer);
  this.root.append(sheet);document.body.append(this.root);this.visibility();document.addEventListener('visibilitychange',this.visibility);
 }
 update(model:HomePageModel):void {
  this.root.dataset.homeMotion=model.reduced?'reduce':'full';this.root.dataset.hasSave=String(!!model.summary);
  this.summary.hidden=!model.summary;this.summary.replaceChildren(...(model.summary??[]).map(text=>{const span=document.createElement('span');span.textContent=text;return span;}));
  this.resume.hidden=!model.summary;this.resume.disabled=this.busy||!model.canContinue;this.start.disabled=this.busy||!model.canStart;
  this.resume.className='home-primary';this.start.className=model.summary?'home-secondary':'home-primary';this.notice.hidden=!model.notice;
 }
 confirm():void {this.busy=true;this.resume.disabled=this.start.disabled=true;this.root.setAttribute('aria-busy','true');}
 destroy():void {document.removeEventListener('visibilitychange',this.visibility);this.resume.onclick=this.start.onclick=null;this.root.remove();}
}
