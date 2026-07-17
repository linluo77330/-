import type { Suit, Tile } from '@/core/types';

const WAN = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const TONG = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨'];
const TIAO = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const FENG = ['东', '南', '西', '北'];
const DRAGON = ['中', '发', '白'];

export function tileLabel(tile: Tile): string {
  const { suit, rank } = tile;
  const idx = rank - 1;
  switch (suit) {
    case 'wan':
      return `${WAN[idx]}万`;
    case 'tong':
      return `${TONG[idx]}筒`;
    case 'tiao':
      return `${TIAO[idx]}条`;
    case 'feng':
      return FENG[idx] ?? '?';
    case 'dragon':
      return DRAGON[idx] ?? '?';
    default:
      return '?';
  }
}

export function tileShortLabel(tile: Tile): string {
  const { suit, rank } = tile;
  const idx = rank - 1;
  switch (suit) {
    case 'wan':
      return WAN[idx];
    case 'tong':
      return String(rank);
    case 'tiao':
      return String(rank);
    case 'feng':
      return FENG[idx]?.[0] ?? '?';
    case 'dragon':
      return DRAGON[idx]?.[0] ?? '?';
    default:
      return '?';
  }
}

export function suitClass(suit: Suit): string {
  return `tile--${suit}`;
}

export const PLAYER_NAMES = ['你（东）', '南家', '西家', '北家'] as const;

export const PHASE_LABELS: Record<string, string> = {
  idle: '等待开始',
  dealing: '发牌中',
  draw: '摸牌',
  discard: '出牌',
  response: '响应',
  game_over: '对局结束',
};

export const ACTION_LABELS: Record<string, string> = {
  chi: '吃',
  pong: '碰',
  kong: '杠',
  hu: '胡',
  pass: '过',
};
