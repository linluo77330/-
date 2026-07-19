import type { PlayerIndex, ResponseAction } from '../core/types.js';

/** ── 客户端 → 服务端 ── */

export type ClientMessage =
  | { type: 'join_room'; roomId: string; name: string; characterId?: string }
  | { type: 'ready' }
  | { type: 'start_game' }
  | { type: 'add_bot'; seatIndex?: PlayerIndex }
  | { type: 'remove_bot'; seatIndex: PlayerIndex }
  | { type: 'discard'; tileId: string }
  | { type: 'concealed_kong'; suit: import('../core/types.js').Tile['suit']; rank: number }
  | { type: 'pass' }
  | {
      type: 'respond';
      action: Exclude<ResponseAction, 'pass'>;
      chiTileIds?: [string, string];
    }
  | { type: 'leave_game' }
  | { type: 'draw_wall' }
  | { type: 'activate_skill'; skillId: string }
  | { type: 'skill_pick'; tileId?: string; splitRanks?: [number, number]; confirm?: boolean; targetPlayer?: PlayerIndex; skip?: boolean }
  | { type: 'skill_vote'; agree: boolean };

/** ── 服务端 → 客户端 ── */

export type SeatKind = 'empty' | 'human' | 'bot';

export interface SeatInfo {
  playerIndex: PlayerIndex;
  kind: SeatKind;
  name: string;
  connected: boolean;
  ready: boolean;
  characterId: string;
}

export interface RoomStatePayload {
  roomId: string;
  inGame: boolean;
  hostPlayerIndex: PlayerIndex | null;
  seats: SeatInfo[];
}

import type { GameLogEntry } from '../core/gameLog.js';

export interface GameStatePayload {
  view: import('../core/types.js').PlayerView;
  lastDrawnTileId: string | null;
  log: GameLogEntry[];
}

export type ServerMessage =
  | { type: 'joined'; roomId: string; playerIndex: PlayerIndex; isHost: boolean }
  | { type: 'room_state'; state: RoomStatePayload }
  | { type: 'game_state'; state: GameStatePayload }
  | { type: 'game_abort_warning'; playerName: string; secondsLeft: number }
  | { type: 'game_aborted'; reason: string }
  | { type: 'error'; message: string };

export function parseClientMessage(raw: string): ClientMessage {
  const data = JSON.parse(raw) as ClientMessage;
  if (!data || typeof data !== 'object' || !('type' in data)) {
    throw new Error('Invalid message');
  }
  return data;
}

export function sendMessage(ws: { send: (data: string) => void }, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}
