import type { GameEventMap } from './events.js';
import type { Meld, PlayerIndex, Tile } from './types.js';

export type GameLogKind = 'discard' | 'chi' | 'pong' | 'kong' | 'hu';

export interface GameLogTile {
  suit: Tile['suit'];
  rank: number;
}

export interface GameLogEntry {
  id: string;
  kind: GameLogKind;
  player: PlayerIndex;
  tile: GameLogTile;
  fromPlayer?: PlayerIndex;
  meldTiles?: GameLogTile[];
  isSelfDraw?: boolean;
}

let logSequence = 0;

export function resetGameLogSequence(): void {
  logSequence = 0;
}

function nextLogId(): string {
  logSequence += 1;
  return `log-${logSequence}`;
}

export function toLogTile(tile: Pick<Tile, 'suit' | 'rank'>): GameLogTile {
  return { suit: tile.suit, rank: tile.rank };
}

export function logTileToTile(tile: GameLogTile, id = 'log'): Tile {
  return { id, suit: tile.suit, rank: tile.rank };
}

export function createDiscardLog(
  payload: GameEventMap['after_discard'],
): GameLogEntry {
  return {
    id: nextLogId(),
    kind: 'discard',
    player: payload.player,
    tile: toLogTile(payload.tile),
  };
}

export function createMeldLog(
  payload: GameEventMap['after_response'],
  fromPlayer: PlayerIndex,
): GameLogEntry | null {
  if (payload.won || !payload.meld || payload.action === 'hu') return null;

  return {
    id: nextLogId(),
    kind: payload.action,
    player: payload.player,
    tile: toLogTile(payload.meld.tiles[payload.meld.tiles.length - 1]),
    fromPlayer,
    meldTiles: payload.meld.tiles.map(toLogTile),
  };
}

export function createHuLog(
  payload: GameEventMap['after_hu'],
  fromPlayer?: PlayerIndex,
): GameLogEntry {
  return {
    id: nextLogId(),
    kind: 'hu',
    player: payload.player,
    tile: toLogTile(payload.tile),
    isSelfDraw: payload.isSelfDraw,
    fromPlayer: payload.isSelfDraw ? undefined : fromPlayer,
  };
}

export function appendGameLogEntry(
  entries: GameLogEntry[],
  entry: GameLogEntry | null,
): GameLogEntry[] {
  if (!entry) return entries;
  return [...entries, entry];
}

export function meldLogFromMeld(
  player: PlayerIndex,
  action: 'chi' | 'pong' | 'kong',
  meld: Meld,
): GameLogEntry {
  return {
    id: nextLogId(),
    kind: action,
    player,
    tile: toLogTile(meld.tiles[meld.tiles.length - 1]),
    fromPlayer: meld.fromPlayer,
    meldTiles: meld.tiles.map(toLogTile),
  };
}
