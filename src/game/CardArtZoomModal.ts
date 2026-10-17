import {cardArtSource} from './CardArtSource';
import {progressiveArt} from './DetailArt';
import {AudioEngine} from '../audio/AudioEngine';

let activeZoom: {dialog: HTMLDialogElement; returnFocus: HTMLElement | null; dispose: (restore?: boolean) => void} | undefined;

function ensureZoomStyles(): void {
  if (document.getElementById('card-art-zoom-styles')) return;
  const style = document.createElement('style');
  style.id = 'card-art-zoom-styles';
  style.textContent = `
    .card-art-zoom-dialog {
      position: fixed;
      inset: 0;
      margin: 0;
      transform: none;
      box-sizing: border-box;
      width: 100%;
      max-width: none;
      height: 100vh;
      height: 100dvh;
      max-height: none;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: #000;
      color: #eee;
      overflow: hidden;
      z-index: 99999;
    }
    .card-art-zoom-dialog[open] { display: block; }
    .card-art-zoom-dialog::backdrop { background: #000; }
    .card-art-zoom-header { position: absolute; z-index: 2; top: max(8px, var(--safe-top, 0px), env(safe-area-inset-top)); left: max(8px, var(--safe-left, 0px), env(safe-area-inset-left)); right: max(8px, var(--safe-right, 0px), env(safe-area-inset-right)); display: flex; align-items: start; justify-content: space-between; gap: 12px; pointer-events: none; }
    .card-art-zoom-title { margin: 0; padding: 6px 8px; max-width: calc(100% - 56px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 1.4; font-weight: normal; color: #eee; background: #0009; }
    .card-art-zoom-close {
      flex: 0 0 44px;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: #0009;
      color: #fff;
      font-size: 28px;
      cursor: pointer;
      pointer-events: auto;
      box-shadow: none;
    }
    .card-art-zoom-dialog button:focus-visible { outline: 3px solid #ffd97d; outline-offset: 2px; }
    .card-art-zoom-dialog .card-art-zoom-close:is(:hover,:active) { background: #222c; transform: none; }
    .card-art-zoom-body { position: absolute; inset: 0; }
    .card-art-zoom-thumb, .card-art-zoom-detail {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      object-fit: contain;
      filter: none;
      transform: none;
    }
    .card-art-zoom-detail { opacity: 0; transition: opacity .18s ease-out; }
    .card-art-zoom-detail.is-loaded { opacity: 1; }
    .card-art-zoom-thumb { transition: opacity .18s ease-out; }
    .card-art-zoom-thumb.is-replaced { opacity: 0; pointer-events: none; }
    @media (prefers-reduced-motion: reduce) { .card-art-zoom-detail, .card-art-zoom-thumb { transition: none; } }
    .card-art-zoom-recovery { position: absolute; z-index: 2; bottom: max(8px, var(--safe-bottom, 0px), env(safe-area-inset-bottom)); left: 8px; right: 8px; min-height: 20px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; background: #000c; }
    .card-art-zoom-recovery[hidden] { display: none; }
    .card-art-zoom-recovery .detail-art-status { margin: 0; color: #ddd; font-size: 13px; line-height: 20px; }
    .card-art-zoom-recovery .detail-art-retry { min-height: 44px; margin: 0; padding: 6px 16px; background: #111; color: #fff; border: 1px solid #777; }
    .card-art-zoom-recovery [hidden] { display: none; }
  `;
  document.head.appendChild(style);
}

/** Full artwork, bounded on-demand HD loading, and a readable thumbnail on failure. */
export function openCardArtZoom(definitionId: string, customName?: string): HTMLDialogElement | undefined {
  const source = cardArtSource(definitionId, customName);
  if (!source) return;
  ensureZoomStyles();
  // Replacing a zoom retains the original opener, never a soon-to-be-removed close button.
  const returnFocus = activeZoom?.returnFocus ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  activeZoom?.dispose(false);
  const {name, detailUrl, thumbnailUrl: thumbUrl} = source;
  const dialog = document.createElement('dialog');
  dialog.className = 'card-art-zoom-dialog';
  dialog.setAttribute('aria-label', `${name} · 高清细节鉴赏`);
  const header = document.createElement('header'), title = document.createElement('h3'), close = document.createElement('button');
  header.className = 'card-art-zoom-header';title.className = 'card-art-zoom-title';title.textContent = name;
  close.type = 'button';close.className = 'card-art-zoom-close';close.textContent = '×';close.setAttribute('aria-label', '关闭赏析');
  header.append(title, close);
  const body = document.createElement('div'), thumb = document.createElement('img'), detail = document.createElement('img'), recovery = document.createElement('div');
  body.className = 'card-art-zoom-body';recovery.className = 'card-art-zoom-recovery';recovery.setAttribute('aria-live', 'polite');
  thumb.className = 'card-art-zoom-thumb';thumb.alt = `${name} 缩略卡面`;
  thumb.onerror = () => {thumb.hidden = true;};
  detail.className = 'card-art-zoom-detail';detail.alt = `${name} 高清卡面`;detail.decoding = 'async';
  let disposed = false, stopLoading: (() => void) | undefined;
  const dispose = (restore = true) => {
    if (disposed) return;
    disposed = true;stopLoading?.();thumb.onload = null;thumb.onerror = null;
    thumb.removeAttribute('src');detail.removeAttribute('src');
    dialog.close();dialog.remove();
    if (activeZoom?.dialog === dialog) activeZoom = undefined;
    if (restore && returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
  };
  const dismiss = () => {AudioEngine.shared.cancel();dispose();};
  close.onclick = dismiss;
  dialog.addEventListener('cancel', event => {event.preventDefault();dismiss();});
  dialog.addEventListener('close', () => dispose(), {once: true});
  // The black area around the contained image is an outside click, even on the img element.
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target === body) {dismiss();return;}
    if (event.target !== thumb && event.target !== detail) return;
    const image = detail.classList.contains('is-loaded') ? detail : thumb, rect = image.getBoundingClientRect();
    if (!image.naturalWidth || !image.naturalHeight) return;
    const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    const left = rect.left + (rect.width - width) / 2, top = rect.top + (rect.height - height) / 2;
    if (event.clientX < left || event.clientX > left + width || event.clientY < top || event.clientY > top + height) dismiss();
  });
  body.append(thumb, detail);dialog.append(header, body, recovery);document.body.append(dialog);
  activeZoom = {dialog, returnFocus, dispose};dialog.showModal();close.focus({preventScroll: true});
  thumb.src = thumbUrl;
  stopLoading = progressiveArt(recovery, detail, detailUrl, () => {
    if (disposed || !dialog.open) return;
    detail.classList.add('is-loaded');thumb.classList.add('is-replaced');
    recovery.hidden = true;
    close.focus({preventScroll: true});
  });
  AudioEngine.shared.select();
  return dialog;
}
