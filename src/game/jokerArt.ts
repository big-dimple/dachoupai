import {assetUrl} from './theme';

/** P01/P05 engineering review illustrations; visual approval is still separate. */
export const JOKER_ART = [
  { id: 'pengci', key: 'p01-joker-pengci', path: 'assets/p01/jokers/pengci.webp', detailPath: 'assets/p01/jokers/pengci-detail.webp' },
  { id: 'e05', key: 'p01-joker-e05', path: 'assets/p01/jokers/e05.webp', detailPath: 'assets/p01/jokers/e05-detail.webp' },
  { id: 'huimaqiang', key: 'p01-joker-huimaqiang', path: 'assets/p01/jokers/huimaqiang.webp', detailPath: 'assets/p01/jokers/huimaqiang-detail.webp' },
  { id: 'a03', key: 'p05-joker-a03', path: 'assets/jokers-p05/a03.webp', detailPath: 'assets/jokers-p05/a03-detail.webp' },
  { id: 'f02', key: 'p05-joker-f02', path: 'assets/jokers-p05/f02.webp', detailPath: 'assets/jokers-p05/f02-detail.webp' },
  { id: 'd03', key: 'p05-joker-d03', path: 'assets/jokers-p05/d03.webp', detailPath: 'assets/jokers-p05/d03-detail.webp' },
  { id: 'tiesuanpan', key: 'p05-joker-tiesuanpan', path: 'assets/jokers-p05/tiesuanpan.webp', detailPath: 'assets/jokers-p05/tiesuanpan-detail.webp' },
  { id: 'mantangcai', key: 'p05-joker-mantangcai', path: 'assets/jokers-p05/mantangcai.webp', detailPath: 'assets/jokers-p05/mantangcai-detail.webp' },
] as const;

export const jokerArtKey = (definitionId: string): string | undefined =>
  JOKER_ART.find(art => art.id === definitionId)?.key;

export function jokerArtUrl(definitionId: string): string | undefined {
  const art = JOKER_ART.find(candidate => candidate.id === definitionId);
  return art ? assetUrl(art.detailPath) : undefined;
}
