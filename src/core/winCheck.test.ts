import { describe, expect, it } from 'vitest';
import type { Meld, Tile } from './types.js';
import { canStandardWin, canWin, isSevenPairs } from './winCheck.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

describe('canWin', () => {
  it('标准胡：4 顺 + 1 对', () => {
    const hand = [
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('wan', 4), t('wan', 5), t('wan', 6),
      t('tong', 2), t('tong', 3), t('tong', 4),
      t('tiao', 5), t('tiao', 5), t('tiao', 5),
      t('feng', 1),
    ];
    expect(canWin(hand, [], t('feng', 1))).toBe(true);
  });

  it('标准胡：刻子 + 顺子组合', () => {
    const hand = [
      t('wan', 9), t('wan', 9), t('wan', 9),
      t('tong', 1), t('tong', 2), t('tong', 3),
      t('tong', 4), t('tong', 5), t('tong', 6),
      t('tiao', 7), t('tiao', 8), t('tiao', 9),
      t('dragon', 1),
    ];
    expect(canWin(hand, [], t('dragon', 1))).toBe(true);
  });

  it('七对', () => {
    const hand = [
      t('wan', 1), t('wan', 1),
      t('wan', 3), t('wan', 3),
      t('tong', 2), t('tong', 2),
      t('tong', 5), t('tong', 5),
      t('tiao', 7), t('tiao', 7),
      t('feng', 2), t('feng', 2),
      t('dragon', 3), t('dragon', 3),
    ];
    expect(isSevenPairs(hand)).toBe(true);
    expect(canWin(hand, [], hand[0])).toBe(true);
  });

  it('有鸣牌时：1 碰 + 手牌 3 顺 + 将', () => {
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
    expect(canWin(hand, melds, t('feng', 3))).toBe(true);
  });

  it('非胡：差一张', () => {
    const hand = [
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('wan', 4), t('wan', 5), t('wan', 6),
      t('tong', 1), t('tong', 2), t('tong', 3),
      t('tiao', 9), t('tiao', 9), t('tiao', 9),
      t('feng', 4),
    ];
    expect(canWin(hand, [], t('wan', 9))).toBe(false);
  });

  it('荣胡：点炮牌不在手牌中', () => {
    const hand = [
      t('wan', 2), t('wan', 3), t('wan', 4),
      t('tong', 5), t('tong', 6), t('tong', 7),
      t('tiao', 1), t('tiao', 1), t('tiao', 1),
      t('feng', 1), t('feng', 1), t('feng', 1),
      t('dragon', 2),
    ];
    expect(canWin(hand, [], t('dragon', 2))).toBe(true);
  });
});

describe('canStandardWin', () => {
  it('拒绝错误张数', () => {
    expect(canStandardWin([t('wan', 1), t('wan', 1)], 0)).toBe(false);
  });
});
