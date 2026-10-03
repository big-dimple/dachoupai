/** D44 shared ink / paper language. New character artwork is supplied separately. */
export const PAPER_THEME = {
  paper: 0xf3eadb,
  paperLight: 0xfff9ee,
  paperEdge: 0xe2d2b8,
  ink: 0x26313a,
  mutedInk: 0x59646a,
  jade: 0x3f606b,
  jadeSoft: 0xe2e8e5,
  red: 0xb8473a,
  redSoft: 0xf0d3c7,
  brass: 0x7b7365,
  divider: 0xc7b89d,
  shadow: 0x26313a,
  disabled: 0xd8d1c3,
  disabledInk: 0x595b59,
  focus: 0x3f606b,
} as const;

export const PAPER_CSS = Object.fromEntries(
  Object.entries(PAPER_THEME).map(([name, value]) => [name, `#${value.toString(16).padStart(6, '0')}`]),
) as { readonly [K in keyof typeof PAPER_THEME]: string };

export const UI_FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';

/** Small procedural borders, not generated character pictures; no gradients or baked text. */
const inkSvg=(body:string)=>'data:image/svg+xml;base64,'+btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="336" viewBox="0 0 240 336">${body}</svg>`);
const frameSvg=(color:string,extra='')=>inkSvg(`<rect x="3" y="3" width="234" height="330" rx="9" fill="none" stroke="${color}" stroke-width="1.5"/><path d="M9 29V10l19-1M212 327l19-1v-19" fill="none" stroke="${color}" stroke-width=".7" opacity=".45"/>${extra}`);
export const INK_FRAME_PATHS={
  common:frameSvg('#26313A'),
  uncommon:frameSvg('#3F606B','<path d="m120 5 5 5-5 5-5-5Z" fill="#3F606B"/>'),
  rare:frameSvg('#B8473A','<path d="m120 5 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#B8473A"/>'),
  back:inkSvg('<rect x="3" y="3" width="234" height="330" rx="9" fill="#F3EADB" stroke="#26313A" stroke-width="1.5"/><path d="M12 24V12h20M208 324h20v-12M120 84l65 84-65 84-65-84Z" fill="none" stroke="#3F606B" stroke-width="2"/><path d="M87 178c4-45 23-66 33-69 10 3 29 24 33 69Z" fill="#B8473A"/><path d="M79 187h82M103 202h34" fill="none" stroke="#26313A" stroke-width="3"/>'),
} as const;
export const P00_ASSETS = [
  { key: 'p00-paper', path: 'assets/p00/paper.svg', width: 640, height: 640 },
  { key: 'p00-card-back', path: INK_FRAME_PATHS.back, width: 240, height: 336 },
  { key: 'p00-frame-common', path: INK_FRAME_PATHS.common, width: 240, height: 336 },
  { key: 'p00-frame-uncommon', path: INK_FRAME_PATHS.uncommon, width: 240, height: 336 },
  { key: 'p00-frame-rare', path: INK_FRAME_PATHS.rare, width: 240, height: 336 },
  { key: 'p00-mark-joker', path: 'assets/p00/mark-joker.svg', width: 96, height: 96 },
  { key: 'p00-mark-plus', path: 'assets/p00/mark-plus.svg', width: 96, height: 96 },
  { key: 'p00-mark-times', path: 'assets/p00/mark-times.svg', width: 96, height: 96 },
] as const;

export function assetUrl(path: string): string {
  if(path.startsWith('data:'))return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
