import {jokerArtUrl, jokerArtPreviewUrl} from './jokerArt';
import {cardDisplayName} from './tangsongCardNames';
import {AudioEngine} from '../audio/AudioEngine';

let activeZoomDialog: HTMLDialogElement | null = null;

function ensureZoomStyles(): void {
  if (document.getElementById('card-art-zoom-styles')) return;
  const style = document.createElement('style');
  style.id = 'card-art-zoom-styles';
  style.textContent = `
    .card-art-zoom-dialog {
      border: 1px solid #d4c7b4;
      border-radius: 10px;
      padding: 0;
      background: #1e1b18;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1);
      width: min(92vw, 480px);
      max-height: 90vh;
      color: #f7eedf;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 99999;
    }
    .card-art-zoom-dialog::backdrop {
      background: rgba(14, 12, 10, 0.78);
      backdrop-filter: blur(4px);
    }
    .card-art-zoom-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(36, 32, 28, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .card-art-zoom-title {
      font-family: Georgia, "Noto Serif SC", SimSun, serif;
      font-size: clamp(16px, 4vw, 19px);
      font-weight: bold;
      color: #ffd97d;
      letter-spacing: 0.06em;
      margin: 0;
    }
    .card-art-zoom-badge {
      font-size: 11px;
      color: #a89f91;
      margin-left: 8px;
      font-weight: normal;
    }
    .card-art-zoom-close {
      background: transparent;
      border: none;
      color: #c9bfb0;
      font-size: 22px;
      line-height: 1;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 4px;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .card-art-zoom-close:hover,
    .card-art-zoom-close:focus {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
    .card-art-zoom-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px;
      position: relative;
      overflow: auto;
      max-height: calc(90vh - 90px);
    }
    .card-art-zoom-img-wrapper {
      position: relative;
      width: 100%;
      max-width: 360px;
      aspect-ratio: 615 / 768;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      background: #2a2520;
    }
    .card-art-zoom-thumb {
      position: absolute;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: blur(8px);
      transform: scale(1.05);
      transition: opacity 0.3s ease;
    }
    .card-art-zoom-detail {
      position: relative;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.35s ease;
      z-index: 2;
    }
    .card-art-zoom-detail.is-loaded {
      opacity: 1;
    }
    .card-art-zoom-loading {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 13px;
      color: #ffd97d;
      background: rgba(20, 18, 16, 0.85);
      padding: 6px 14px;
      border-radius: 20px;
      border: 1px solid rgba(255, 217, 125, 0.3);
      z-index: 3;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    .card-art-zoom-loading.is-hidden {
      opacity: 0;
    }
    .card-art-zoom-footer {
      padding: 8px 16px 12px;
      text-align: center;
      font-size: 12px;
      color: #9c9182;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    /* Subtle zoom indicator on card preview in DetailDialog */
    .dialog-card-art {
      position: relative;
      cursor: zoom-in;
    }
    .dialog-card-zoom-badge {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(30, 27, 24, 0.88);
      color: #ffd97d;
      font-size: 11px;
      font-weight: bold;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid rgba(255, 217, 125, 0.4);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      pointer-events: none;
      opacity: 0.88;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .dialog-card-art:hover .dialog-card-zoom-badge {
      opacity: 1;
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(style);
}

/**
 * Opens a full-fidelity artwork inspection modal for a Tang-Song card.
 * Loads the 615x768 detail image live on demand with instant thumbnail preview.
 */
export function openCardArtZoom(definitionId: string, customName?: string): HTMLDialogElement {
  ensureZoomStyles();

  if (activeZoomDialog) {
    activeZoomDialog.close();
    activeZoomDialog.remove();
    activeZoomDialog = null;
  }

  const name = cardDisplayName(definitionId, customName);
  const detailUrl = jokerArtUrl(definitionId);
  const thumbUrl = jokerArtPreviewUrl(definitionId);

  const dialog = document.createElement('dialog');
  dialog.className = 'card-art-zoom-dialog';
  dialog.setAttribute('aria-label', `${name} · 高清细节鉴赏`);

  // Header
  const header = document.createElement('div');
  header.className = 'card-art-zoom-header';

  const titleWrap = document.createElement('div');
  titleWrap.style.display = 'flex';
  titleWrap.style.alignItems = 'baseline';

  const title = document.createElement('h3');
  title.className = 'card-art-zoom-title';
  title.textContent = `【${name}】`;

  const badge = document.createElement('span');
  badge.className = 'card-art-zoom-badge';
  badge.textContent = '手绘卡面 · 高清鉴赏';

  titleWrap.append(title, badge);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'card-art-zoom-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', '关闭赏析');
  closeBtn.onclick = () => {
    AudioEngine.shared.cancel();
    dialog.close();
  };

  header.append(titleWrap, closeBtn);

  // Body with live on-demand image loader
  const body = document.createElement('div');
  body.className = 'card-art-zoom-body';

  const imgWrapper = document.createElement('div');
  imgWrapper.className = 'card-art-zoom-img-wrapper';

  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'card-art-zoom-loading';
  loadingIndicator.textContent = '正在加载高清卡面…';

  // Fast thumbnail
  const thumbImg = document.createElement('img');
  thumbImg.className = 'card-art-zoom-thumb';
  thumbImg.alt = name;
  if (thumbUrl) thumbImg.src = thumbUrl;

  // Live on-demand detail image
  const detailImg = document.createElement('img');
  detailImg.className = 'card-art-zoom-detail';
  detailImg.alt = `${name} 高清细节`;
  detailImg.decoding = 'async';

  detailImg.onload = async () => {
    try {
      await detailImg.decode();
    } catch {
      // Decode fallback
    }
    detailImg.classList.add('is-loaded');
    loadingIndicator.classList.add('is-hidden');
    thumbImg.style.opacity = '0';
  };

  detailImg.onerror = () => {
    loadingIndicator.textContent = '高清原画加载失败，保留原图';
  };

  if (detailUrl) {
    detailImg.src = detailUrl;
  }

  imgWrapper.append(thumbImg, detailImg, loadingIndicator);
  body.append(imgWrapper);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'card-art-zoom-footer';
  footer.textContent = '唐宋手绘卡牌工笔原画 · 点击任意处返回';

  dialog.append(header, body, footer);
  document.body.appendChild(dialog);

  // Dismiss on clicking backdrop
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      AudioEngine.shared.cancel();
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    dialog.remove();
    if (activeZoomDialog === dialog) {
      activeZoomDialog = null;
    }
  });

  dialog.showModal();
  activeZoomDialog = dialog;
  AudioEngine.shared.select();

  return dialog;
}
