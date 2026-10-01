import {assetUrl} from './theme';

/** All 24 current Joker candidates have illustrations; human visual approval is separate. */
export const JOKER_ART = [
  { id: 'pengci', key: 'p07-joker-pengci', path: 'assets/jokers-p07/pengci.webp', detailPath: 'assets/jokers-p07/pengci-detail.webp' },
  { id: 'e05', key: 'p07-joker-e05', path: 'assets/jokers-p07/e05.webp', detailPath: 'assets/jokers-p07/e05-detail.webp' },
  { id: 'huimaqiang', key: 'p07-joker-huimaqiang', path: 'assets/jokers-p07/huimaqiang.webp', detailPath: 'assets/jokers-p07/huimaqiang-detail.webp' },
  { id: 'a03', key: 'p07-joker-a03', path: 'assets/jokers-p07/a03.webp', detailPath: 'assets/jokers-p07/a03-detail.webp' },
  { id: 'f02', key: 'p07-joker-f02', path: 'assets/jokers-p07/f02.webp', detailPath: 'assets/jokers-p07/f02-detail.webp' },
  { id: 'd03', key: 'p07-joker-d03', path: 'assets/jokers-p07/d03.webp', detailPath: 'assets/jokers-p07/d03-detail.webp' },
  { id: 'tiesuanpan', key: 'p07-joker-tiesuanpan', path: 'assets/jokers-p07/tiesuanpan.webp', detailPath: 'assets/jokers-p07/tiesuanpan-detail.webp' },
  { id: 'mantangcai', key: 'p07-joker-mantangcai', path: 'assets/jokers-p07/mantangcai.webp', detailPath: 'assets/jokers-p07/mantangcai-detail.webp' },
  { id: 'jiedongfeng', key: 'p07-joker-jiedongfeng', path: 'assets/jokers-p07/jiedongfeng.webp', detailPath: 'assets/jokers-p07/jiedongfeng-detail.webp' },
  { id: 'a05', key: 'p07-joker-a05', path: 'assets/jokers-p07/a05.webp', detailPath: 'assets/jokers-p07/a05-detail.webp' },
  { id: 'b02', key: 'p07-joker-b02', path: 'assets/jokers-p07/b02.webp', detailPath: 'assets/jokers-p07/b02-detail.webp' },
  { id: 'b03', key: 'p07-joker-b03', path: 'assets/jokers-p07/b03.webp', detailPath: 'assets/jokers-p07/b03-detail.webp' },
  { id: 'b04', key: 'p07-joker-b04', path: 'assets/jokers-p07/b04.webp', detailPath: 'assets/jokers-p07/b04-detail.webp' },
  { id: 'c02', key: 'p07-joker-c02', path: 'assets/jokers-p07/c02.webp', detailPath: 'assets/jokers-p07/c02-detail.webp' },
  { id: 'c04', key: 'p07-joker-c04', path: 'assets/jokers-p07/c04.webp', detailPath: 'assets/jokers-p07/c04-detail.webp' },
  { id: 'c06', key: 'p07-joker-c06', path: 'assets/jokers-p07/c06.webp', detailPath: 'assets/jokers-p07/c06-detail.webp' },
  { id: 'd01', key: 'p07-joker-d01', path: 'assets/jokers-p07/d01.webp', detailPath: 'assets/jokers-p07/d01-detail.webp' },
  { id: 'd05', key: 'p07-joker-d05', path: 'assets/jokers-p07/d05.webp', detailPath: 'assets/jokers-p07/d05-detail.webp' },
  { id: 'd10', key: 'p07-joker-d10', path: 'assets/jokers-p07/d10.webp', detailPath: 'assets/jokers-p07/d10-detail.webp' },
  { id: 'e01', key: 'p07-joker-e01', path: 'assets/jokers-p07/e01.webp', detailPath: 'assets/jokers-p07/e01-detail.webp' },
  { id: 'e03', key: 'p07-joker-e03', path: 'assets/jokers-p07/e03.webp', detailPath: 'assets/jokers-p07/e03-detail.webp' },
  { id: 'e08', key: 'p07-joker-e08', path: 'assets/jokers-p07/e08.webp', detailPath: 'assets/jokers-p07/e08-detail.webp' },
  { id: 'f03', key: 'p07-joker-f03', path: 'assets/jokers-p07/f03.webp', detailPath: 'assets/jokers-p07/f03-detail.webp' },
  { id: 'f09', key: 'p07-joker-f09', path: 'assets/jokers-p07/f09.webp', detailPath: 'assets/jokers-p07/f09-detail.webp' },
] as const;

export const jokerArtKey = (definitionId: string): string | undefined =>
  JOKER_ART.find(art => art.id === definitionId)?.key;

export function jokerArtUrl(definitionId: string): string | undefined {
  const art = JOKER_ART.find(candidate => candidate.id === definitionId);
  return art ? assetUrl(art.detailPath) : undefined;
}
