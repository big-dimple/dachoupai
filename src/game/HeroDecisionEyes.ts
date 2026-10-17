import './HeroDecisionEyes.css';
import {heroEyesURL} from './portraits';
import {gameSession} from './session';
/** Decorative decision feedback, explicitly separate from a scored payoff. */
export function mountHeroDecisionEyes(dialog:HTMLDialogElement,phase:'discard-choice'|'target-choice'|'confirm-target',reduced=gameSession().reducedMotion):void {
 const header=dialog.querySelector('.dialog-header');if(!header)return;
 const image=document.createElement('img');image.className='hero-decision-eyes';image.alt='';image.setAttribute('aria-hidden','true');image.dataset.hero='touye';image.dataset.decisionPhase=phase;image.src=heroEyesURL('touye');header.classList.add('has-decision-eyes');header.append(image);
 let disposed=false,animation:Animation|undefined;const cleanup=()=>{if(disposed)return;disposed=true;animation?.cancel();dialog.removeEventListener('close',cleanup);dialog.removeEventListener('cancel',cleanup);};
 dialog.addEventListener('close',cleanup,{once:true});dialog.addEventListener('cancel',cleanup,{once:true});
 void image.decode().then(()=>{if(disposed||!dialog.open||!image.isConnected)return;if(reduced||window.matchMedia('(prefers-reduced-motion: reduce)').matches){image.style.opacity='.8';return;}animation=image.animate([{opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.82},{opacity:0}],{duration:720,easing:'ease-out'});}).catch(()=>{image.remove();header.classList.remove('has-decision-eyes');cleanup();});
}
