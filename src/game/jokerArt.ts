import {assetUrl} from './theme';

/** Three P01 review illustrations; other definitions still use mechanism motifs. */
export const JOKER_ART = [
  { id: 'pengci', key: 'p01-joker-pengci', path: 'assets/p01/jokers/pengci.webp', detailPath: 'assets/p01/jokers/pengci-detail.webp' },
  { id: 'e05', key: 'p01-joker-e05', path: 'assets/p01/jokers/e05.webp', detailPath: 'assets/p01/jokers/e05-detail.webp' },
  { id: 'huimaqiang', key: 'p01-joker-huimaqiang', path: 'assets/p01/jokers/huimaqiang.webp', detailPath: 'assets/p01/jokers/huimaqiang-detail.webp' },
] as const;

export const jokerArtKey = (definitionId: string): string | undefined =>
  JOKER_ART.find(art => art.id === definitionId)?.key;

export function jokerArtUrl(definitionId: string): string | undefined {
  const art = JOKER_ART.find(candidate => candidate.id === definitionId);
  return art ? assetUrl(art.detailPath) : undefined;
}
