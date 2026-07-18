import type { WebSocket } from 'ws';
import {
  executeBotResponse,
  getBotActionDelayMs,
  runBotDiscard,
} from '../core/botAI.js';
import { MahjongGame } from '../core/MahjongGame.js';
import type { GameEventName } from '../core/events.js';
import type { PlayerIndex } from '../core/types.js';
import {
  parseClientMessage,
  sendMessage,
  type ClientMessage,
  type RoomStatePayload,
  type SeatInfo,
  type SeatKind,
} from '../shared/protocol.js';

const AUTO_DRAW_MS = 400;
const PLAYER_COUNT = 4;
const BOT_NAME_PREFIX = '机器人';
const GAME_ABORT_DELAY_MS = 10_000;

interface SeatSlot {
  playerIndex: PlayerIndex;
  kind: SeatKind;
  name: string;
  ws: WebSocket | null;
  ready: boolean;
}

export class Room {
  readonly roomId: string;
  private seats: SeatSlot[];
  private hostPlayerIndex: PlayerIndex | null = null;
  private botPlayerIndices = new Set<PlayerIndex>();
  private game: MahjongGame | null = null;
  private inGame = false;
  private drawTimer: ReturnType<typeof setTimeout> | null = null;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private abortTimer: ReturnType<typeof setTimeout> | null = null;
  private lastDrawnTileId: Partial<Record<PlayerIndex, string>> = {};
  private unsubs: Array<() => void> = [];
  private botCounter = 0;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.seats = ([0, 1, 2, 3] as PlayerIndex[]).map((playerIndex) => ({
      playerIndex,
      kind: 'empty' as SeatKind,
      name: '',
      ws: null,
      ready: false,
    }));
  }

  join(ws: WebSocket, name: string): PlayerIndex {
    const existing = this.seats.find((s) => s.ws === ws);
    if (existing) return existing.playerIndex;

    const empty = this.seats.find((s) => s.kind === 'empty');
    if (!empty) {
      throw new Error('房间已满');
    }

    empty.kind = 'human';
    empty.name = name;
    empty.ws = ws;
    empty.ready = false;

    if (this.hostPlayerIndex === null) {
      this.hostPlayerIndex = empty.playerIndex;
    }

    return empty.playerIndex;
  }

  disconnect(ws: WebSocket): void {
    const seat = this.seats.find((s) => s.ws === ws);
    if (!seat || seat.kind !== 'human') return;

    const wasHost = seat.playerIndex === this.hostPlayerIndex;
    const disconnectedName = seat.name;
    const wasInGame = this.inGame;

    seat.kind = 'empty';
    seat.name = '';
    seat.ws = null;
    seat.ready = false;

    if (wasHost) {
      const nextHost = this.seats.find((s) => s.kind === 'human' && s.ws);
      this.hostPlayerIndex = nextHost?.playerIndex ?? null;
    }

    if (wasInGame) {
      this.scheduleGameAbort(disconnectedName);
    }

    this.broadcastRoomState();
  }

  handleMessage(ws: WebSocket, raw: string): void {
    let msg: ClientMessage;
    try {
      msg = parseClientMessage(raw);
    } catch {
      sendMessage(ws, { type: 'error', message: '无效消息格式' });
      return;
    }

    const seat = this.seats.find((s) => s.ws === ws);

    try {
      switch (msg.type) {
        case 'join_room':
          this.handleJoin(ws, msg.roomId, msg.name);
          break;
        case 'ready':
          if (!seat) throw new Error('请先加入房间');
          this.handleReady(seat);
          break;
        case 'start_game':
          if (!seat) throw new Error('请先加入房间');
          this.handleStart(seat);
          break;
        case 'add_bot':
          if (!seat) throw new Error('请先加入房间');
          this.handleAddBot(seat, msg.seatIndex);
          break;
        case 'remove_bot':
          if (!seat) throw new Error('请先加入房间');
          this.handleRemoveBot(seat, msg.seatIndex);
          break;
        case 'discard':
          if (!seat) throw new Error('请先加入房间');
          this.handleDiscard(seat, msg.tileId);
          break;
        case 'pass':
          if (!seat) throw new Error('请先加入房间');
          this.handlePass(seat);
          break;
        case 'respond':
          if (!seat) throw new Error('请先加入房间');
          this.handleRespond(seat, msg.action, msg.chiTileIds);
          break;
        default:
          sendMessage(ws, { type: 'error', message: '未知消息类型' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      sendMessage(ws, { type: 'error', message });
    }
  }

  private handleJoin(ws: WebSocket, roomId: string, name: string): void {
    if (roomId !== this.roomId) {
      sendMessage(ws, { type: 'error', message: '房间号不匹配' });
      return;
    }
    if (this.inGame) {
      sendMessage(ws, { type: 'error', message: '对局已开始，无法加入' });
      return;
    }

    const playerIndex = this.join(ws, name);
    sendMessage(ws, {
      type: 'joined',
      roomId: this.roomId,
      playerIndex,
      isHost: playerIndex === this.hostPlayerIndex,
    });
    this.broadcastRoomState();
  }

  private assertHost(seat: SeatSlot): void {
    if (seat.playerIndex !== this.hostPlayerIndex) {
      throw new Error('仅房主可操作');
    }
  }

  private handleAddBot(seat: SeatSlot, seatIndex?: PlayerIndex): void {
    this.assertHost(seat);
    if (this.inGame) throw new Error('对局进行中');

    const target =
      seatIndex !== undefined
        ? this.seats.find((s) => s.playerIndex === seatIndex)
        : this.seats.find((s) => s.kind === 'empty');

    if (!target || target.kind !== 'empty') {
      throw new Error('该座位不可用');
    }

    this.botCounter += 1;
    target.kind = 'bot';
    target.name = `${BOT_NAME_PREFIX}${this.botCounter}`;
    target.ws = null;
    target.ready = true;

    this.broadcastRoomState();
  }

  private handleRemoveBot(seat: SeatSlot, seatIndex: PlayerIndex): void {
    this.assertHost(seat);
    if (this.inGame) throw new Error('对局进行中');

    const target = this.seats.find((s) => s.playerIndex === seatIndex);
    if (!target || target.kind !== 'bot') {
      throw new Error('该座位没有机器人');
    }

    target.kind = 'empty';
    target.name = '';
    target.ready = false;

    this.broadcastRoomState();
  }

  private handleReady(seat: SeatSlot): void {
    if (this.inGame) throw new Error('对局进行中');
    if (seat.kind !== 'human') throw new Error('仅玩家可准备');
    seat.ready = true;
    this.broadcastRoomState();
  }

  private occupiedCount(): number {
    return this.seats.filter((s) => s.kind !== 'empty').length;
  }

  private allHumansReady(): boolean {
    return this.seats
      .filter((s) => s.kind === 'human')
      .every((s) => s.ready && s.ws !== null);
  }

  private handleStart(seat: SeatSlot): void {
    if (this.inGame) throw new Error('对局已开始');
    this.assertHost(seat);

    if (this.occupiedCount() < PLAYER_COUNT) {
      throw new Error('需要 4 人（玩家 + 机器人）才能开始');
    }
    if (!this.allHumansReady()) {
      throw new Error('所有玩家尚未准备');
    }

    this.startGame();
  }

  private startGame(): void {
    this.inGame = true;
    this.botPlayerIndices = new Set(
      this.seats.filter((s) => s.kind === 'bot').map((s) => s.playerIndex),
    );
    this.game = new MahjongGame();
    this.lastDrawnTileId = {};
    this.attachGameListeners();
    this.game.start(0);
    this.broadcastRoomState();
    this.broadcastGameState();
    this.scheduleAutoDraw();
    this.scheduleBotActions();
  }

  private isBot(player: PlayerIndex): boolean {
    return this.botPlayerIndices.has(player);
  }

  private attachGameListeners(): void {
    this.unsubs.forEach((off) => off());
    this.unsubs = [];

    if (!this.game) return;

    const syncEvents: GameEventName[] = [
      'phase_change',
      'after_draw',
      'after_discard',
      'after_response',
      'response_window_open',
      'response_level_change',
      'response_window_close',
      'game_over',
      'wildcard_reveal',
      'turn_change',
      'response_pass',
    ];

    const onSync = () => {
      this.broadcastGameState();
      this.scheduleAutoDraw();
      this.scheduleBotActions();
    };

    for (const event of syncEvents) {
      this.unsubs.push(this.game.on(event, () => {
        onSync();
        return undefined;
      }));
    }

    this.unsubs.push(
      this.game.on('after_draw', (payload) => {
        this.lastDrawnTileId[payload.player] = payload.tile.id;
      }),
    );

    this.unsubs.push(
      this.game.on('after_discard', (payload) => {
        delete this.lastDrawnTileId[payload.player];
      }),
    );
  }

  private scheduleAutoDraw(): void {
    if (this.drawTimer) clearTimeout(this.drawTimer);
    if (this.abortTimer || !this.game || this.game.getPhase() !== 'draw') return;

    this.drawTimer = setTimeout(() => {
      if (!this.game || this.game.getPhase() !== 'draw') return;
      try {
        this.game.drawCard();
      } catch {
        // ignore race
      }
    }, AUTO_DRAW_MS);
  }

  private scheduleBotActions(): void {
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.abortTimer || !this.game || !this.inGame) return;

    const snap = this.game.getSnapshot();
    const delay = getBotActionDelayMs();

    if (snap.phase === 'discard' && this.isBot(snap.currentPlayer)) {
      this.botTimer = setTimeout(() => {
        if (!this.game || this.game.getPhase() !== 'discard') return;
        if (!this.isBot(this.game.getCurrentPlayer())) return;
        try {
          runBotDiscard(this.game, this.game.getCurrentPlayer());
        } catch {
          // ignore
        }
      }, delay);
      return;
    }

    if (snap.phase === 'response') {
      const humanPending = snap.pendingResponses.some((o) => !this.isBot(o.player));
      if (humanPending) return;

      const botOption = snap.pendingResponses.find((o) => this.isBot(o.player));
      if (!botOption) return;

      this.botTimer = setTimeout(() => {
        if (!this.game || this.game.getPhase() !== 'response') return;
        const fresh = this.game
          .getSnapshot()
          .pendingResponses.filter((o) => o.player === botOption.player);
        if (fresh.length === 0) return;
        try {
          executeBotResponse(this.game, botOption.player, fresh);
        } catch {
          // ignore
        }
      }, delay);
    }
  }

  private handleDiscard(seat: SeatSlot, tileId: string): void {
    if (this.abortTimer) throw new Error('对局即将结束，请稍候');
    if (!this.game) throw new Error('对局未开始');
    if (this.game.getCurrentPlayer() !== seat.playerIndex) {
      throw new Error('不是你的回合');
    }
    this.game.discardCard(tileId);
  }

  private handlePass(seat: SeatSlot): void {
    if (this.abortTimer) throw new Error('对局即将结束，请稍候');
    if (!this.game) throw new Error('对局未开始');
    this.game.passResponse(seat.playerIndex);
  }

  private handleRespond(
    seat: SeatSlot,
    action: Exclude<import('../core/types.js').ResponseAction, 'pass'>,
    chiTileIds?: [string, string],
  ): void {
    if (this.abortTimer) throw new Error('对局即将结束，请稍候');
    if (!this.game) throw new Error('对局未开始');

    let chiTiles: [import('../core/types.js').Tile, import('../core/types.js').Tile] | undefined;
    if (chiTileIds) {
      const snap = this.game.getSnapshot();
      const hand = snap.players[seat.playerIndex].hand;
      const t1 = hand.find((t) => t.id === chiTileIds[0]);
      const t2 = hand.find((t) => t.id === chiTileIds[1]);
      if (!t1 || !t2) throw new Error('吃牌组合无效');
      chiTiles = [t1, t2];
    }

    this.game.respond(seat.playerIndex, action, chiTiles);
  }

  getRoomState(): RoomStatePayload {
    return {
      roomId: this.roomId,
      inGame: this.inGame,
      hostPlayerIndex: this.hostPlayerIndex,
      seats: this.seats.map(
        (s): SeatInfo => ({
          playerIndex: s.playerIndex,
          kind: s.kind,
          name: s.kind === 'empty' ? '' : s.name,
          connected: s.kind === 'human' && s.ws !== null,
          ready: s.kind === 'bot' ? true : s.ready,
        }),
      ),
    };
  }

  private clearGameTimers(): void {
    if (this.drawTimer) clearTimeout(this.drawTimer);
    if (this.botTimer) clearTimeout(this.botTimer);
    this.drawTimer = null;
    this.botTimer = null;
  }

  private clearAbortTimer(): void {
    if (this.abortTimer) clearTimeout(this.abortTimer);
    this.abortTimer = null;
  }

  private scheduleGameAbort(playerName: string): void {
    if (this.abortTimer) return;

    this.clearGameTimers();
    this.broadcast({
      type: 'game_abort_warning',
      playerName,
      secondsLeft: GAME_ABORT_DELAY_MS / 1000,
    });

    this.abortTimer = setTimeout(() => {
      this.abortTimer = null;
      this.abortGame(`玩家 ${playerName} 断开连接，对局已结束`);
    }, GAME_ABORT_DELAY_MS);
  }

  private abortGame(reason: string): void {
    this.clearGameTimers();
    this.clearAbortTimer();
    this.unsubs.forEach((off) => off());
    this.unsubs = [];

    this.game = null;
    this.inGame = false;
    this.lastDrawnTileId = {};

    for (const seat of this.seats) {
      if (seat.kind === 'human') {
        seat.ready = false;
      }
    }

    this.broadcast({ type: 'game_aborted', reason });
    this.broadcastRoomState();
  }

  private broadcast(msg: import('../shared/protocol.js').ServerMessage): void {
    for (const seat of this.seats) {
      if (seat.ws) sendMessage(seat.ws, msg);
    }
  }

  broadcastRoomState(): void {
    const state = this.getRoomState();
    this.broadcast({ type: 'room_state', state });
  }

  broadcastGameState(): void {
    if (!this.game) return;
    for (const seat of this.seats) {
      if (!seat.ws) continue;
      const view = this.game.getSnapshotForPlayer(seat.playerIndex);
      sendMessage(seat.ws, {
        type: 'game_state',
        state: {
          view,
          lastDrawnTileId: this.lastDrawnTileId[seat.playerIndex] ?? null,
        },
      });
    }
  }

  isEmpty(): boolean {
    return this.seats.every((s) => s.kind === 'empty') && !this.inGame;
  }
}
