import type {CharacterId} from './characters';
import {characterForNewRun} from './CharacterRunCopy';
import type {DetailDialog} from './DetailDialog';
import {portraitURL,selectionPortraitURL} from './portraits';

/** Full composition stays separate from the phone's enlarged, top-aligned preview. */
export function showHeroPortrait(dialog:DetailDialog,id:CharacterId):void {
 const hero=characterForNewRun(id);
 const d=dialog.open(hero.name+' · 立绘','',[],{closeLabel:'回到选角',portrait:{url:portraitURL(id),thumbnailUrl:selectionPortraitURL(id),alt:hero.name+' · 完整立绘'}});
 d.classList.add('hero-portrait-view');d.dataset.hero=id;
 const style=document.createElement('style');
 style.textContent=`.hero-portrait-view[open]{width:min(860px,calc(100vw - var(--safe-left) - var(--safe-right) - 24px));height:calc(100dvh - var(--safe-top) - var(--safe-bottom) - 24px);max-height:1000px}
 .hero-portrait-view .dialog-content{display:flex;min-height:0;justify-content:center;overflow:auto;padding:8px}
 .hero-portrait-view .dialog-portrait-art{margin:0;width:min(100%,615px);max-width:100%;height:100%;max-height:768px;aspect-ratio:auto;display:flex;flex-direction:column;align-items:center;min-height:0}
 .hero-portrait-view .dialog-portrait{width:auto;height:100%;max-height:100%;max-width:100%;object-fit:contain;flex:1;min-height:0}
 .hero-portrait-view .dialog-copy{display:none}.hero-portrait-view .dialog-header{padding:10px 16px}.hero-portrait-view h2{font-size:22px}`;
 d.append(style);
}
