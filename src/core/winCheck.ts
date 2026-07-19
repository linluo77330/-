import type { Meld, Tile, WildcardConfig } from './types.js';
import { tilesEqual } from './deck.js';
import { resolveTileForWin } from './wildcard.js';

const NUMBER_SUITS = new Set(['wan', 'tong', 'tiao']);

/** 鸣牌中的杠数量（每杠使总牌数 +1，仍计 1 个面子） */
export function countKongMelds(melds: Meld[]): number {
  return melds.filter((m) => m.type === 'kong').length;
}

/** 胡牌时手牌应有的张数（不含鸣牌区） */
export function expectedHandTilesForWin(melds: Meld[]): number {
  return (4 - melds.length) * 3 + 2;
}

/** 胡牌时手牌 + 鸣牌区总张数（标准 14，每杠 +1） */
export function expectedTotalTilesForWin(melds: Meld[]): number {
  return 14 + countKongMelds(melds);
}

/** 出牌阶段可暗杠的牌型（手牌含四张相同） */
export function getConcealedKongCandidates(hand: Tile[]): Tile[] {
  const seen = new Map<string, Tile>();
  const counts = new Map<string, number>();
  for (const tile of hand) {
    const key = `${tile.suit}-${tile.rank}`;
    if (!seen.has(key)) seen.set(key, tile);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const result: Tile[] = [];
  for (const [key, count] of counts) {
    if (count >= 4) result.push(seen.get(key)!);
  }
  return result;
}

/** 34 种牌型索引：万1-9, 筒1-9, 条1-9, 风1-4, 箭1-3 */
export function tileIndex(tile: Pick<Tile, 'suit' | 'rank'>): number {
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

function isSevenPairsWithWildcards(fixed: Tile[], wildCount: number): boolean {
  if (fixed.length + wildCount !== 14) return false;

  const counts = tilesToCounts(fixed);
  let wild = wildCount;
  let pairsNeeded = 7;

  for (let i = 0; i < 34; i++) {
    while (counts[i] >= 2 && pairsNeeded > 0) {
      counts[i] -= 2;
      pairsNeeded -= 1;
    }
  }

  for (let i = 0; i < 34; i++) {
    while (counts[i] >= 1 && wild >= 1 && pairsNeeded > 0) {
      counts[i] -= 1;
      wild -= 1;
      pairsNeeded -= 1;
    }
  }

  while (wild >= 2 && pairsNeeded > 0) {
    wild -= 2;
    pairsNeeded -= 1;
  }

  return pairsNeeded === 0 && totalTiles(counts) === 0 && wild === 0;
}

/** 递归：从 counts 中拆出 numSets 组面子（刻子或顺子） */
function canFormMelds(counts: number[], numSets: number): boolean {
  if (numSets === 0) return totalTiles(counts) === 0;

  const start = counts.findIndex((c) => c > 0);
  if (start === -1) return numSets === 0;

  // 杠（4 张）或刻子（3 张）
  if (counts[start] >= 4) {
    counts[start] -= 4;
    if (canFormMelds(counts, numSets - 1)) return true;
    counts[start] += 4;
  }
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

function canFormMeldsWithWildcards(counts: number[], numSets: number, wild: number): boolean {
  const fixedTotal = totalTiles(counts);

  if (numSets === 0) {
    return fixedTotal === 0 && wild === 0;
  }

  if (fixedTotal === 0) {
    return wild >= numSets * 3 && wild % 3 === 0;
  }

  const start = counts.findIndex((c) => c > 0);
  if (start === -1) {
    return wild >= numSets * 3 && wild % 3 === 0;
  }

  // 刻子 / 杠（4 张同牌）
  for (let useWild = 0; useWild <= Math.min(2, wild); useWild++) {
    for (const needReal of [3, 4] as const) {
      if (needReal === 4 && counts[start] < 4) continue;
      const tilesNeeded = needReal - useWild;
      if (tilesNeeded <= 0) continue;
      if (counts[start] < tilesNeeded) continue;
      if (needReal === 4 && useWild > 0) continue;

      counts[start] -= tilesNeeded;
      if (canFormMeldsWithWildcards(counts, numSets - 1, wild - useWild)) {
        counts[start] += tilesNeeded;
        return true;
      }
      counts[start] += tilesNeeded;
    }
  }

  // 顺子（仅数牌）
  if (start <= 26) {
    const suitBase = Math.floor(start / 9) * 9;
    const rank = start - suitBase;
    if (rank <= 7) {
      const slots = [start, start + 1, start + 2];
      for (let mask = 0; mask < 8; mask++) {
        let useWild = 0;
        const taken: number[] = [];
        let ok = true;

        for (let s = 0; s < 3; s++) {
          const useReal = (mask >> s) & 1;
          if (useReal) {
            if (counts[slots[s]] <= 0) {
              ok = false;
              break;
            }
            taken.push(slots[s]);
          } else {
            useWild += 1;
          }
        }

        if (!ok || useWild > wild) continue;

        for (const idx of taken) counts[idx] -= 1;
        if (canFormMeldsWithWildcards(counts, numSets - 1, wild - useWild)) {
          for (const idx of taken) counts[idx] += 1;
          return true;
        }
        for (const idx of taken) counts[idx] += 1;
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

function canStandardWinWithWildcards(fixed: Tile[], wildCount: number, meldCount: number): boolean {
  const setsNeeded = 4 - meldCount;
  const expected = setsNeeded * 3 + 2;
  if (fixed.length + wildCount !== expected) return false;

  const baseCounts = tilesToCounts(fixed);

  for (let jPair = 0; jPair <= Math.min(2, wildCount); jPair++) {
    const wildAfterPair = wildCount - jPair;

    for (let i = 0; i < 34; i++) {
      const needReal = Math.max(0, 2 - jPair);
      if (baseCounts[i] < needReal) continue;

      const counts = cloneCounts(baseCounts);
      counts[i] -= needReal;

      if (canFormMeldsWithWildcards(counts, setsNeeded, wildAfterPair)) {
        return true;
      }
    }
  }

  return false;
}

function splitWildcards(tiles: Tile[], wildcard: WildcardConfig | null | undefined): {
  fixed: Tile[];
  wildCount: number;
} {
  if (!wildcard) return { fixed: tiles, wildCount: 0 };
  const fixed: Tile[] = [];
  let wildCount = 0;
  for (const tile of tiles) {
    if (tilesEqual(tile, wildcard.wildcardType)) {
      wildCount += 1;
    } else {
      fixed.push(resolveTileForWin(tile, wildcard));
    }
  }
  return { fixed, wildCount };
}

function canWinInternal(
  allTiles: Tile[],
  meldCount: number,
  wildcard: WildcardConfig | null | undefined,
): boolean {
  const { fixed, wildCount } = splitWildcards(allTiles, wildcard);

  if (meldCount === 0 && fixed.length + wildCount === 14) {
    if (wildcard) {
      if (isSevenPairsWithWildcards(fixed, wildCount)) return true;
    } else if (isSevenPairs(allTiles)) {
      return true;
    }
  }

  if (wildcard) {
    return canStandardWinWithWildcards(fixed, wildCount, meldCount);
  }
  return canStandardWin(allTiles, meldCount);
}

/**
 * 胡牌判定
 * @param hand  当前手牌（自摸时含刚摸的牌；荣胡时不含点炮牌）
 * @param melds 已有鸣牌（每组计 1 面子）
 * @param winTile 胡的那张牌
 * @param wildcard 万能牌配置（可选）
 */
export function canWin(
  hand: Tile[],
  melds: Meld[],
  winTile: Tile,
  wildcard?: WildcardConfig | null,
): boolean {
  const winAlreadyInHand = hand.some((t) => t.id === winTile.id);
  const allTiles = winAlreadyInHand ? [...hand] : [...hand, winTile];

  const meldCount = melds.length;
  const setsNeeded = 4 - meldCount;
  const expectedHand = setsNeeded * 3 + 2;

  if (allTiles.length !== expectedHand) return false;

  const meldTileCount = melds.reduce((sum, meld) => sum + meld.tiles.length, 0);
  if (allTiles.length + meldTileCount !== expectedTotalTilesForWin(melds)) return false;

  return canWinInternal(allTiles, meldCount, wildcard);
}

/** 是否听牌（差一张胡） */
export function isTenpai(hand: Tile[], melds: Meld[], wildcard?: WildcardConfig | null): boolean {
  for (const suit of ['wan', 'tong', 'tiao', 'feng', 'dragon'] as Tile['suit'][]) {
    const max = suit === 'feng' ? 4 : suit === 'dragon' ? 3 : 9;
    for (let rank = 1; rank <= max; rank++) {
      const probe: Tile = { id: '__probe__', suit, rank };
      if (canWin(hand, melds, probe, wildcard)) return true;
    }
  }
  return false;
}

/** 返回所有可胡的牌（13 张手牌 + 进张） */
export function getWaitingTiles(hand: Tile[], melds: Meld[], wildcard?: WildcardConfig | null): Tile[] {
  const waiting: Tile[] = [];
  for (const suit of ['wan', 'tong', 'tiao', 'feng', 'dragon'] as Tile['suit'][]) {
    const max = suit === 'feng' ? 4 : suit === 'dragon' ? 3 : 9;
    for (let rank = 1; rank <= max; rank++) {
      const probe: Tile = { id: `wait_${suit}_${rank}`, suit, rank };
      if (canWin(hand, melds, probe, wildcard)) waiting.push(probe);
    }
  }
  return waiting;
}

/** 返回打某张牌后听的牌（14 张待出时） */
export function getTenpaiTiles(
  hand: Tile[],
  melds: Meld[],
  wildcard?: WildcardConfig | null,
): Tile[] {
  const meldCount = melds.length;
  const expectedAfterDiscard = (4 - meldCount) * 3 + 2 - 1;
  if (hand.length !== expectedAfterDiscard + 1) return [];

  const seen = new Set<string>();
  const result: Tile[] = [];

  for (let i = 0; i < hand.length; i++) {
    const reduced = hand.filter((_, idx) => idx !== i);
    for (const wait of getWaitingTiles(reduced, melds, wildcard)) {
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
