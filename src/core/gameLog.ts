import type { GameEventMap } from './events.js';
import type { Meld, PlayerIndex, Tile } from './types.js';

export type GameLogKind = 'discard' | 'chi' | 'pong' | 'kong' | 'hu' | 'skill';

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
  skillId?: string;
  skillName?: string;
  sourceTile?: GameLogTile;
  secondaryTile?: GameLogTile;
  skillTiles?: GameLogTile[];
  drawnTiles?: GameLogTile[];
  votePassed?: boolean;
  rejectedBy?: PlayerIndex;
  /** 黑手技能：公开播报不暴露目标 */
  blackHandPublic?: boolean;
  /** 借牌技能：互换目标 */
  targetPlayer?: PlayerIndex;
  /** 借牌技能：公开播报不暴露换得的牌 */
  hideReceivedTile?: boolean;
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

export function createSkillLog(payload: GameEventMap['skill_used']): GameLogEntry {
  return {
    id: nextLogId(),
    kind: 'skill',
    player: payload.player,
    tile: toLogTile(payload.tile),
    skillId: payload.skillId,
    skillName: payload.skillName,
    sourceTile: payload.sourceTile ? toLogTile(payload.sourceTile) : undefined,
    secondaryTile: payload.discardedTile ? toLogTile(payload.discardedTile) : undefined,
    skillTiles: payload.discardedTiles?.map(toLogTile),
    drawnTiles: payload.drawnTiles?.map(toLogTile),
    votePassed: payload.votePassed,
    blackHandPublic: payload.blackHandPublic,
    targetPlayer: payload.targetPlayer,
    hideReceivedTile: payload.hideReceivedTile,
  };
}

export function createSkillVoteFailedLog(
  payload: GameEventMap['skill_vote_failed'],
): GameLogEntry {
  return {
    id: nextLogId(),
    kind: 'skill',
    player: payload.initiator,
    tile: { suit: 'wan', rank: 1 },
    skillId: 'instant_win_vote',
    skillName: '一秒四破',
    votePassed: false,
    rejectedBy: payload.rejectedBy,
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
