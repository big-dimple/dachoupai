/** P00 review candidate: printed touring table. Visual approval is still pending. */
export const PAPER_THEME = {
  paper: 0xf3eadb,
  paperLight: 0xfff9ee,
  paperEdge: 0xe2d2b8,
  ink: 0x203744,
  mutedInk: 0x596b70,
  jade: 0x367f75,
  jadeSoft: 0xdce9df,
  red: 0xbf493d,
  redSoft: 0xf0d3c7,
  brass: 0xb78a4f,
  divider: 0xc7b89d,
  shadow: 0x233b40,
  disabled: 0xd8d1c3,
  disabledInk: 0x706d63,
  focus: 0x2a6f87,
} as const;

export const PAPER_CSS = Object.fromEntries(
  Object.entries(PAPER_THEME).map(([name, value]) => [name, `#${value.toString(16).padStart(6, '0')}`]),
) as { readonly [K in keyof typeof PAPER_THEME]: string };

export const UI_FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';

/** SVGs are small source/runtime assets; text, pips and hit areas stay in Phaser. */
export const P00_ASSETS = [
  { key: 'p00-paper', path: 'assets/p00/paper.svg', width: 640, height: 640 },
  { key: 'p00-card-back', path: 'assets/p00/card-back.svg', width: 240, height: 336 },
  { key: 'p00-frame-common', path: 'assets/p00/frame-common.svg', width: 240, height: 336 },
  { key: 'p00-frame-uncommon', path: 'assets/p00/frame-uncommon.svg', width: 240, height: 336 },
  { key: 'p00-frame-rare', path: 'assets/p00/frame-rare.svg', width: 240, height: 336 },
  { key: 'p00-mark-joker', path: 'assets/p00/mark-joker.svg', width: 96, height: 96 },
  { key: 'p00-mark-plus', path: 'assets/p00/mark-plus.svg', width: 96, height: 96 },
  { key: 'p00-mark-times', path: 'assets/p00/mark-times.svg', width: 96, height: 96 },
] as const;

export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
