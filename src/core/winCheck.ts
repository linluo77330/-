import type { Meld, Tile } from './types.js';

const NUMBER_SUITS = new Set(['wan', 'tong', 'tiao']);

/** 34 种牌型索引：万1-9, 筒1-9, 条1-9, 风1-4, 箭1-3 */
export function tileIndex(tile: Tile): number {
  const base: Record<Tile['suit'], number> = {
    wan: 0,
    tong: 9,
    tiao: 18,
    feng: 27,
    dragon: 31,
  };
  return base[tile.suit] + tile.rank - 1;
}

export function tilesToCounts(tiles: Tile[]): number[] {
  const counts = new Array<number>(34).fill(0);
  for (const tile of tiles) {
    counts[tileIndex(tile)] += 1;
  }
  return counts;
}

function cloneCounts(counts: number[]): number[] {
  return [...counts];
}

function totalTiles(counts: number[]): number {
  return counts.reduce((sum, n) => sum + n, 0);
}

/** 七对：14 张、7 个对子（每种牌恰好 2 张） */
export function isSevenPairs(tiles: Tile[]): boolean {
  if (tiles.length !== 14) return false;
  const counts = tilesToCounts(tiles);
  let pairs = 0;
  for (const count of counts) {
    if (count === 0) continue;
    if (count !== 2) return false;
    pairs += 1;
  }
  return pairs === 7;
}

/** 递归：从 counts 中拆出 numSets 组面子（刻子或顺子） */
function canFormMelds(counts: number[], numSets: number): boolean {
  if (numSets === 0) return totalTiles(counts) === 0;

  const start = counts.findIndex((c) => c > 0);
  if (start === -1) return numSets === 0;

  // 刻子
  if (counts[start] >= 3) {
    counts[start] -= 3;
    if (canFormMelds(counts, numSets - 1)) return true;
    counts[start] += 3;
  }

  // 顺子（仅数牌）
  if (start <= 26) {
    const suitBase = Math.floor(start / 9) * 9;
    const rank = start - suitBase;
    if (rank <= 7) {
      const i2 = start + 1;
      const i3 = start + 2;
      if (counts[i2] > 0 && counts[i3] > 0) {
        counts[start] -= 1;
        counts[i2] -= 1;
        counts[i3] -= 1;
        if (canFormMelds(counts, numSets - 1)) return true;
        counts[start] += 1;
        counts[i2] += 1;
        counts[i3] += 1;
      }
    }
  }

  return false;
}

/** 标准胡：m 组已有鸣牌 + 剩余牌组成 (4-m) 面子 + 1 对将 */
export function canStandardWin(tiles: Tile[], meldCount: number): boolean {
  const setsNeeded = 4 - meldCount;
  const expected = setsNeeded * 3 + 2;
  if (tiles.length !== expected) return false;

  const baseCounts = tilesToCounts(tiles);

  for (let i = 0; i < 34; i++) {
    if (baseCounts[i] < 2) continue;

    const counts = cloneCounts(baseCounts);
    counts[i] -= 2;

    if (canFormMelds(counts, setsNeeded)) return true;
  }

  return false;
}

/**
 * 胡牌判定
 * @param hand  当前手牌（自摸时含刚摸的牌；荣胡时不含点炮牌）
 * @param melds 已有鸣牌（每组计 1 面子）
 * @param winTile 胡的那张牌
 */
export function canWin(hand: Tile[], melds: Meld[], winTile: Tile): boolean {
  const winAlreadyInHand = hand.some((t) => t.id === winTile.id);
  const allTiles = winAlreadyInHand ? [...hand] : [...hand, winTile];

  const meldCount = melds.length;
  const setsNeeded = 4 - meldCount;
  const expectedTiles = setsNeeded * 3 + 2;

  if (allTiles.length !== expectedTiles) return false;

  // 门清七对
  if (meldCount === 0 && allTiles.length === 14 && isSevenPairs(allTiles)) {
    return true;
  }

  return canStandardWin(allTiles, meldCount);
}

/** 是否听牌（差一张胡） */
export function isTenpai(hand: Tile[], melds: Meld[]): boolean {
  // 枚举所有可能胡的牌型
  for (let suit of ['wan', 'tong', 'tiao', 'feng', 'dragon'] as Tile['suit'][]) {
    const max = suit === 'feng' ? 4 : suit === 'dragon' ? 3 : 9;
    for (let rank = 1; rank <= max; rank++) {
      const probe: Tile = { id: '__probe__', suit, rank };
      if (canWin(hand, melds, probe)) return true;
    }
  }
  return false;
}

/** 返回所有可胡的牌（13 张手牌 + 进张） */
export function getWaitingTiles(hand: Tile[], melds: Meld[]): Tile[] {
  const waiting: Tile[] = [];
  for (let suit of ['wan', 'tong', 'tiao', 'feng', 'dragon'] as Tile['suit'][]) {
    const max = suit === 'feng' ? 4 : suit === 'dragon' ? 3 : 9;
    for (let rank = 1; rank <= max; rank++) {
      const probe: Tile = { id: `wait_${suit}_${rank}`, suit, rank };
      if (canWin(hand, melds, probe)) waiting.push(probe);
    }
  }
  return waiting;
}

/** 返回打某张牌后听的牌（14 张待出时） */
export function getTenpaiTiles(hand: Tile[], melds: Meld[]): Tile[] {
  const meldCount = melds.length;
  const expectedAfterDiscard = (4 - meldCount) * 3 + 2 - 1; // 出牌后手牌数
  if (hand.length !== expectedAfterDiscard + 1) return [];

  const seen = new Set<string>();
  const result: Tile[] = [];

  for (let i = 0; i < hand.length; i++) {
    const reduced = hand.filter((_, idx) => idx !== i);
    for (const wait of getWaitingTiles(reduced, melds)) {
      const key = `${wait.suit}-${wait.rank}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(wait);
      }
    }
  }
  return result;
}

/** 两张牌是否同牌型（忽略 id） */
export function sameTileType(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/** 数牌是否能组成顺子搭子 */
export function isNumberSuit(suit: Tile['suit']): boolean {
  return NUMBER_SUITS.has(suit);
}
