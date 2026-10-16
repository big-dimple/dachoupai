import './HeroPortraitDialog.css';
import type {CharacterId} from './characters';
import {characterForNewRun} from './CharacterRunCopy';
import type {DetailDialog} from './DetailDialog';
import {portraitURL,selectionPortraitURL} from './portraits';
import {characterArt} from './CharacterArt';

/** Full composition stays separate from the phone's enlarged, top-aligned preview. */
export function showHeroPortrait(dialog:DetailDialog,id:CharacterId):void {
 const hero=characterForNewRun(id);
 // Pointer actions on the Phaser canvas do not always establish a DOM focus owner.
 if(document.activeElement===document.body)document.querySelector('canvas')?.focus({preventScroll:true});
 const d=dialog.open(hero.name,'',[],{closeLabel:'回到选角',portrait:{url:portraitURL(id),thumbnailUrl:selectionPortraitURL(id),alt:hero.name}});
 d.classList.add('hero-portrait-view');d.dataset.hero=id;
 const art=characterArt(id,'portrait');if(art)d.style.setProperty('--hero-portrait-ratio',String(art.width/art.height));
 const controls=document.createElement('div'),close=d.querySelector<HTMLButtonElement>('.dialog-close')!;
 controls.className='hero-portrait-controls';close.textContent='×';close.setAttribute('aria-label','关闭立绘，回到选角');controls.append(close);
 d.querySelector('.dialog-header')?.replaceWith(controls);d.querySelector('.dialog-actions')?.remove();
 // Preserve the shared loader/retry nodes, while removing the empty explanation column.
 const scroll=d.querySelector('.dialog-scroll')!;scroll.querySelector('.dialog-copy')?.remove();
 d.querySelector('.dialog-portrait-art')!.append(...scroll.childNodes);scroll.remove();
 d.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const buttons=[...d.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(b=>b.getClientRects().length);
  const first=buttons[0],last=buttons.at(-1);
  if(event.shiftKey?document.activeElement===first:document.activeElement===last){event.preventDefault();(event.shiftKey?last:first)?.focus();}
 });
 d.setAttribute('aria-label',hero.name+' · 全图');close.focus({preventScroll:true});
}
