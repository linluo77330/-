import type { PlayerIndex, ResponseAction } from '../core/types.js';

/** ── 客户端 → 服务端 ── */

export type ClientMessage =
  | { type: 'join_room'; roomId: string; name: string }
  | { type: 'ready' }
  | { type: 'start_game' }
  | { type: 'add_bot'; seatIndex?: PlayerIndex }
  | { type: 'remove_bot'; seatIndex: PlayerIndex }
  | { type: 'discard'; tileId: string }
  | { type: 'pass' }
  | {
      type: 'respond';
      action: Exclude<ResponseAction, 'pass'>;
      chiTileIds?: [string, string];
    }
  | { type: 'leave_game' };

/** ── 服务端 → 客户端 ── */

export type SeatKind = 'empty' | 'human' | 'bot';

export interface SeatInfo {
  playerIndex: PlayerIndex;
  kind: SeatKind;
  name: string;
  connected: boolean;
  ready: boolean;
}

export interface RoomStatePayload {
  roomId: string;
  inGame: boolean;
  hostPlayerIndex: PlayerIndex | null;
  seats: SeatInfo[];
}

export interface GameStatePayload {
  view: import('../core/types.js').PlayerView;
  lastDrawnTileId: string | null;
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
