import type { Tile } from '@/core/types';

const FENG_FILES = ['Ton', 'Nan', 'Shaa', 'Pei'] as const;
const DRAGON_FILES = ['Chun', 'Hatsu', 'Haku'] as const;

const NUMBER_PREFIX: Record<'wan' | 'tong' | 'tiao', string> = {
  wan: 'Man',
  tong: 'Pin',
  tiao: 'Sou',
};

export const TILE_BACK_SRC = '/tiles/Back.png';

export function getTileImageSrc(tile: Pick<Tile, 'suit' | 'rank'>): string {
  let file: string;
  if (tile.suit === 'feng') {
    file = FENG_FILES[tile.rank - 1] ?? 'Ton';
  } else if (tile.suit === 'dragon') {
    file = DRAGON_FILES[tile.rank - 1] ?? 'Haku';
  } else {
    file = `${NUMBER_PREFIX[tile.suit]}${tile.rank}`;
  }
  return `/tiles/${file}.png`;
}
