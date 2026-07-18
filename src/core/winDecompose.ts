import { tilesEqual } from './deck.js';
import type { Meld, Tile, WildcardConfig } from './types.js';
import { resolveTileForWin } from './wildcard.js';
import {
  canWin,
  getWaitingTiles,
  isSevenPairs,
  tileIndex,
} from './winCheck.js';

export type WinGroupKind = 'pair' | 'triplet' | 'sequence' | 'seven_pair';

export interface WinGroup {
  kind: WinGroupKind;
  tileIds: string[];
}

export interface WinHandDisplay {
  pattern: 'standard' | 'seven_pairs';
  groups: WinGroup[];
  /** 听牌时暂不打进牌型的那张牌 */
  looseTileIds?: string[];
}

interface WildPool {
  fixed: Tile[];
  wild: Tile[];
}

function splitWildcards(tiles: Tile[], wildcard: WildcardConfig | null | undefined): WildPool {
  if (!wildcard) {
    return { fixed: [...tiles], wild: [] };
  }
  const fixed: Tile[] = [];
  const wild: Tile[] = [];
  for (const tile of tiles) {
    if (tilesEqual(tile, wildcard.wildcardType)) {
      wild.push(tile);
    } else {
      fixed.push(resolveTileForWin(tile, wildcard));
    }
  }
  return { fixed, wild };
}

function cloneWildPool(pool: WildPool): WildPool {
  return { fixed: [...pool.fixed], wild: [...pool.wild] };
}

function sortByIndex(tiles: Tile[]): Tile[] {
  return [...tiles].sort(
    (a, b) => tileIndex(a) - tileIndex(b) || a.id.localeCompare(b.id),
  );
}

function takeTiles(pool: Tile[], suit: Tile['suit'], rank: number, count: number): Tile[] | null {
  const taken: Tile[] = [];
  for (let i = pool.length - 1; i >= 0 && taken.length < count; i--) {
    if (pool[i].suit === suit && pool[i].rank === rank) {
      taken.push(pool[i]);
      pool.splice(i, 1);
    }
  }
  if (taken.length !== count) {
    restoreTiles(pool, taken);
    return null;
  }
  return taken;
}

function restoreTiles(pool: Tile[], tiles: Tile[]) {
  pool.push(...tiles);
}

function decomposeMelds(pool: Tile[], numSets: number): WinGroup[] | null {
  if (numSets === 0) {
    return pool.length === 0 ? [] : null;
  }

  const sorted = sortByIndex(pool);
  const first = sorted[0];

  const tripletTaken = takeTiles(pool, first.suit, first.rank, 3);
  if (tripletTaken) {
    const rest = decomposeMelds(pool, numSets - 1);
    if (rest) {
      return [{ kind: 'triplet', tileIds: tripletTaken.map((t) => t.id) }, ...rest];
    }
    restoreTiles(pool, tripletTaken);
  }

  if (first.suit === 'wan' || first.suit === 'tong' || first.suit === 'tiao') {
    if (first.rank <= 7) {
      const s1 = takeTiles(pool, first.suit, first.rank, 1);
      if (s1) {
        const s2 = takeTiles(pool, first.suit, first.rank + 1, 1);
        if (s2) {
          const s3 = takeTiles(pool, first.suit, first.rank + 2, 1);
          if (s3) {
            const seq = [...s1, ...s2, ...s3];
            const rest = decomposeMelds(pool, numSets - 1);
            if (rest) {
              return [{ kind: 'sequence', tileIds: seq.map((t) => t.id) }, ...rest];
            }
            restoreTiles(pool, seq);
          } else {
            restoreTiles(pool, [...s2, ...s1]);
          }
        } else {
          restoreTiles(pool, s1);
        }
      }
    }
  }

  return null;
}

function decomposeStandard(allTiles: Tile[], meldCount: number): WinGroup[] | null {
  const setsNeeded = 4 - meldCount;
  const expected = setsNeeded * 3 + 2;
  if (allTiles.length !== expected) return null;

  const types = new Set<string>();
  for (const tile of allTiles) {
    types.add(`${tile.suit}-${tile.rank}`);
  }

  for (const typeKey of types) {
    const [suit, rankStr] = typeKey.split('-');
    const rank = Number(rankStr);
    const pool = [...allTiles];
    const pair = takeTiles(pool, suit as Tile['suit'], rank, 2);
    if (!pair) continue;

    const melds = decomposeMelds(pool, setsNeeded);
    if (melds) {
      return [{ kind: 'pair', tileIds: pair.map((t) => t.id) }, ...melds];
    }
  }

  return null;
}

function decomposeSevenPairs(allTiles: Tile[]): WinGroup[] | null {
  if (allTiles.length !== 14) return null;

  const pool = [...allTiles];
  const groups: WinGroup[] = [];

  while (pool.length > 0) {
    const sorted = sortByIndex(pool);
    const first = sorted[0];
    const pair = takeTiles(pool, first.suit, first.rank, 2);
    if (!pair) return null;
    groups.push({ kind: 'seven_pair', tileIds: pair.map((t) => t.id) });
  }

  return groups.length === 7 ? groups : null;
}

function takePairFromWildPool(
  pool: WildPool,
  suit: Tile['suit'],
  rank: number,
  wildForPair: number,
): Tile[] | null {
  const needReal = Math.max(0, 2 - wildForPair);
  const p = cloneWildPool(pool);
  const realTaken = needReal > 0 ? takeTiles(p.fixed, suit, rank, needReal) : [];
  if (needReal > 0 && (!realTaken || realTaken.length !== needReal)) return null;

  const wildTaken: Tile[] = [];
  for (let i = 0; i < wildForPair; i++) {
    const w = p.wild.pop();
    if (!w) return null;
    wildTaken.push(w);
  }

  Object.assign(pool, p);
  return [...(realTaken ?? []), ...wildTaken];
}

function takeTripletFromWildPool(
  pool: WildPool,
  suit: Tile['suit'],
  rank: number,
  wildForSet: number,
): Tile[] | null {
  const needReal = 3 - wildForSet;
  const p = cloneWildPool(pool);
  const realTaken = needReal > 0 ? takeTiles(p.fixed, suit, rank, needReal) : [];
  if (needReal > 0 && (!realTaken || realTaken.length !== needReal)) return null;

  const wildTaken: Tile[] = [];
  for (let i = 0; i < wildForSet; i++) {
    const w = p.wild.pop();
    if (!w) return null;
    wildTaken.push(w);
  }

  Object.assign(pool, p);
  return [...(realTaken ?? []), ...wildTaken];
}

function decomposeMeldsWithWild(pool: WildPool, numSets: number): WinGroup[] | null {
  if (numSets === 0) {
    return pool.fixed.length === 0 && pool.wild.length === 0 ? [] : null;
  }

  if (pool.fixed.length === 0) {
    if (pool.wild.length < numSets * 3) return null;
    const groups: WinGroup[] = [];
    const p = cloneWildPool(pool);
    for (let i = 0; i < numSets; i++) {
      const triple = p.wild.splice(-3, 3);
      groups.push({ kind: 'triplet', tileIds: triple.map((t) => t.id) });
    }
    Object.assign(pool, p);
    return groups;
  }

  const sorted = sortByIndex(pool.fixed);
  const start = sorted[0];
  const idx = tileIndex(start);

  for (let useWild = 0; useWild <= Math.min(2, pool.wild.length); useWild++) {
    const p = cloneWildPool(pool);
    const taken = takeTripletFromWildPool(p, start.suit, start.rank, useWild);
    if (!taken) continue;

    const rest = decomposeMeldsWithWild(p, numSets - 1);
    if (rest) {
      Object.assign(pool, p);
      return [{ kind: 'triplet', tileIds: taken.map((t) => t.id) }, ...rest];
    }
  }

  if (idx <= 26) {
    const suitBase = Math.floor(idx / 9) * 9;
    const rank = idx - suitBase;
    if (rank <= 7) {
      const slots = [idx, idx + 1, idx + 2];
      for (let mask = 0; mask < 8; mask++) {
        let useWild = 0;
        const p = cloneWildPool(pool);
        const taken: Tile[] = [];
        let ok = true;

        for (let s = 0; s < 3; s++) {
          const useReal = (mask >> s) & 1;
          if (useReal) {
            const slotIdx = slots[s];
            const suit = slotIdx < 9 ? 'wan' : slotIdx < 18 ? 'tong' : 'tiao';
            const slotRank = (slotIdx % 9) + 1;
            const one = takeTiles(p.fixed, suit, slotRank, 1);
            if (!one) {
              ok = false;
              break;
            }
            taken.push(...one);
          } else {
            useWild += 1;
          }
        }

        if (!ok || useWild > p.wild.length) continue;

        for (let w = 0; w < useWild; w++) {
          const wildTile = p.wild.pop();
          if (!wildTile) {
            ok = false;
            break;
          }
          taken.push(wildTile);
        }
        if (!ok) continue;

        const rest = decomposeMeldsWithWild(p, numSets - 1);
        if (rest) {
          Object.assign(pool, p);
          return [{ kind: 'sequence', tileIds: taken.map((t) => t.id) }, ...rest];
        }
      }
    }
  }

  return null;
}

function decomposeStandardWild(
  allTiles: Tile[],
  meldCount: number,
  wildcard: WildcardConfig,
): WinGroup[] | null {
  const setsNeeded = 4 - meldCount;
  const expected = setsNeeded * 3 + 2;
  if (allTiles.length !== expected) return null;

  const { fixed, wild } = splitWildcards(allTiles, wildcard);
  const types = new Set<string>();
  for (const tile of fixed) {
    types.add(`${tile.suit}-${tile.rank}`);
  }

  for (let jPair = 0; jPair <= Math.min(2, wild.length); jPair++) {
    for (const typeKey of types) {
      const [suit, rankStr] = typeKey.split('-');
      const rank = Number(rankStr);
      const pool: WildPool = { fixed: [...fixed], wild: [...wild] };
      const pair = takePairFromWildPool(pool, suit as Tile['suit'], rank, jPair);
      if (!pair) continue;

      const melds = decomposeMeldsWithWild(pool, setsNeeded);
      if (melds) {
        return [{ kind: 'pair', tileIds: pair.map((t) => t.id) }, ...melds];
      }
    }
  }

  return null;
}

function decomposeSevenPairsWild(fixed: Tile[], wild: Tile[]): WinGroup[] | null {
  if (fixed.length + wild.length !== 14) return null;

  const pool: WildPool = { fixed: [...fixed], wild: [...wild] };
  const groups: WinGroup[] = [];
  let pairsNeeded = 7;

  while (pairsNeeded > 0 && pool.fixed.length > 0) {
    const sorted = sortByIndex(pool.fixed);
    const first = sorted[0];
    const before = cloneWildPool(pool);
    const pair = takePairFromWildPool(pool, first.suit, first.rank, 0);
    if (!pair) {
      const mixed = takePairFromWildPool(pool, first.suit, first.rank, 1);
      if (!mixed) break;
      groups.push({ kind: 'seven_pair', tileIds: mixed.map((t) => t.id) });
      pairsNeeded -= 1;
      continue;
    }
    if (pair.length === 2) {
      groups.push({ kind: 'seven_pair', tileIds: pair.map((t) => t.id) });
      pairsNeeded -= 1;
      continue;
    }
    Object.assign(pool, before);
    break;
  }

  while (pairsNeeded > 0 && pool.fixed.length > 0 && pool.wild.length > 0) {
    const tile = pool.fixed.pop()!;
    const w = pool.wild.pop()!;
    groups.push({ kind: 'seven_pair', tileIds: [tile.id, w.id] });
    pairsNeeded -= 1;
  }

  while (pairsNeeded > 0 && pool.wild.length >= 2) {
    const w1 = pool.wild.pop()!;
    const w2 = pool.wild.pop()!;
    groups.push({ kind: 'seven_pair', tileIds: [w1.id, w2.id] });
    pairsNeeded -= 1;
  }

  return pairsNeeded === 0 && pool.fixed.length === 0 && pool.wild.length === 0 ? groups : null;
}

function decomposeWinTiles(
  allTiles: Tile[],
  meldCount: number,
  wildcard: WildcardConfig | null | undefined,
): WinGroup[] | null {
  if (wildcard) {
    if (meldCount === 0 && allTiles.length === 14) {
      const { fixed, wild } = splitWildcards(allTiles, wildcard);
      const seven = decomposeSevenPairsWild(fixed, wild);
      if (seven) return seven;
    }
    return decomposeStandardWild(allTiles, meldCount, wildcard);
  }

  if (meldCount === 0 && isSevenPairs(allTiles)) {
    return decomposeSevenPairs(allTiles);
  }
  return decomposeStandard(allTiles, meldCount);
}

/** 将可胡的 14 张牌拆成对子 / 刻子 / 顺子分组，用于 UI 展示 */
export function getWinHandGroups(
  hand: Tile[],
  melds: Meld[],
  winTile: Tile,
  wildcard?: WildcardConfig | null,
): WinHandDisplay | null {
  if (!canWin(hand, melds, winTile, wildcard)) return null;

  const winAlreadyInHand = hand.some((t) => t.id === winTile.id);
  const allTiles = winAlreadyInHand ? [...hand] : [...hand, winTile];
  const groups = decomposeWinTiles(allTiles, melds.length, wildcard);
  if (!groups) return null;

  const pattern = groups.every((g) => g.kind === 'seven_pair') ? 'seven_pairs' : 'standard';
  return { pattern, groups };
}

/** 14 张听牌时：展示打掉一张后的胡牌牌型，多出的那张单独标出 */
export function getTenpaiHandDisplay(
  hand: Tile[],
  melds: Meld[],
  wildcard?: WildcardConfig | null,
): WinHandDisplay | null {
  const meldCount = melds.length;
  const expectedAfterDiscard = (4 - meldCount) * 3 + 2 - 1;
  if (hand.length !== expectedAfterDiscard + 1) return null;

  for (let i = 0; i < hand.length; i++) {
    const reduced = hand.filter((_, idx) => idx !== i);
    const waits = getWaitingTiles(reduced, melds, wildcard);
    if (waits.length === 0) continue;

    const display = getWinHandGroups(reduced, melds, waits[0], wildcard);
    if (display) {
      return { ...display, looseTileIds: [hand[i].id] };
    }
  }

  return null;
}

/** 对局 UI：在可胡 / 听牌 / 自摸成形时返回分组展示 */
export function getWinHandDisplayForPlayer(
  hand: Tile[],
  melds: Meld[],
  options: {
    wildcard?: WildcardConfig | null;
    canHuOnDiscard?: Tile | null;
    isTenpai?: boolean;
    checkSelfDraw?: boolean;
  },
): WinHandDisplay | null {
  const { wildcard, canHuOnDiscard, isTenpai, checkSelfDraw } = options;

  if (canHuOnDiscard) {
    const display = getWinHandGroups(hand, melds, canHuOnDiscard, wildcard);
    if (display) return display;
  }

  if (isTenpai) {
    const display = getTenpaiHandDisplay(hand, melds, wildcard);
    if (display) return display;
  }

  if (checkSelfDraw) {
    const meldCount = melds.length;
    const expected = (4 - meldCount) * 3 + 2;
    if (hand.length === expected) {
      for (const tile of hand) {
        if (canWin(hand, melds, tile, wildcard)) {
          const display = getWinHandGroups(hand, melds, tile, wildcard);
          if (display) return display;
        }
      }
    }
  }

  return null;
}
