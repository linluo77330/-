import { describe, expect, it } from 'vitest';
import type { Meld, Tile } from './types.js';
import { createWildcardConfig } from './wildcard.js';
import { canWin } from './winCheck.js';
import { getTenpaiHandDisplay, getWinHandGroups } from './winDecompose.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

function allGroupedIds(hand: Tile[], display: { groups: { tileIds: string[] }[]; looseTileIds?: string[] }) {
  const ids = new Set([
    ...display.groups.flatMap((g) => g.tileIds),
    ...(display.looseTileIds ?? []),
  ]);
  return hand.every((tile) => ids.has(tile.id));
}

describe('getWinHandGroups', () => {
  it('标准胡：拆成顺子、刻子、将', () => {
    const hand = [
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('wan', 4), t('wan', 5), t('wan', 6),
      t('tong', 2), t('tong', 3), t('tong', 4),
      t('tiao', 5), t('tiao', 5), t('tiao', 5),
      t('feng', 1),
    ];
    const winTile = t('feng', 1);
    const display = getWinHandGroups(hand, [], winTile);
    expect(display).not.toBeNull();
    expect(display!.pattern).toBe('standard');
    expect(display!.groups.some((g) => g.kind === 'pair')).toBe(true);
    expect(display!.groups.some((g) => g.kind === 'triplet')).toBe(true);
    expect(display!.groups.some((g) => g.kind === 'sequence')).toBe(true);
    expect(allGroupedIds([...hand, winTile], display!)).toBe(true);
  });

  it('七对：7 组对子', () => {
    const hand = [
      t('wan', 1), t('wan', 1),
      t('wan', 3), t('wan', 3),
      t('tong', 2), t('tong', 2),
      t('tong', 5), t('tong', 5),
      t('tiao', 7), t('tiao', 7),
      t('feng', 2), t('feng', 2),
      t('dragon', 3), t('dragon', 3),
    ];
    const display = getWinHandGroups(hand, [], hand[0]);
    expect(display).not.toBeNull();
    expect(display!.pattern).toBe('seven_pairs');
    expect(display!.groups).toHaveLength(7);
    expect(display!.groups.every((g) => g.kind === 'seven_pair')).toBe(true);
  });

  it('有鸣牌时分解手牌', () => {
    const melds: Meld[] = [{
      type: 'pong',
      tiles: [t('wan', 5), t('wan', 5), t('wan', 5)],
    }];
    const hand = [
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('tong', 4), t('tong', 5), t('tong', 6),
      t('tiao', 7), t('tiao', 8), t('tiao', 9),
      t('feng', 3),
    ];
    const display = getWinHandGroups(hand, melds, t('feng', 3));
    expect(display).not.toBeNull();
    expect(display!.groups.some((g) => g.kind === 'pair')).toBe(true);
  });

  it('万能牌胡牌可分解', () => {
    const wildcard = createWildcardConfig(t('tiao', 1));
    const hand = [
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('wan', 4), t('wan', 5), t('wan', 6),
      t('wan', 7), t('wan', 8), t('wan', 9),
      t('feng', 5), t('feng', 5), t('feng', 5),
      t('tiao', 1),
    ];
    expect(canWin(hand, [], t('dragon', 1), wildcard)).toBe(true);
    const display = getWinHandGroups(hand, [], t('dragon', 1), wildcard);
    expect(display).not.toBeNull();
    expect(display!.groups.length).toBeGreaterThan(0);
  });
});

describe('getTenpaiHandDisplay', () => {
  it('14 张听牌时标出待打牌', () => {
    const hand = [
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('wan', 4), t('wan', 5), t('wan', 6),
      t('tong', 1), t('tong', 2), t('tong', 3),
      t('tiao', 9), t('tiao', 9), t('tiao', 9),
      t('feng', 4), t('feng', 2),
    ];
    const display = getTenpaiHandDisplay(hand, []);
    expect(display).not.toBeNull();
    expect(display!.looseTileIds?.length).toBe(1);
    expect(allGroupedIds(hand, display!)).toBe(true);
  });
});
