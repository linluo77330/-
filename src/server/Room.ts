import type { WebSocket } from 'ws';
import {
  executeBotResponse,
  getBotActionDelayMs,
  runBotDiscard,
} from '../core/botAI.js';
import { MahjongGame } from '../core/MahjongGame.js';
import type { GameEventName } from '../core/events.js';
import {
  appendGameLogEntry,
  createDiscardLog,
  createHuLog,
  createMeldLog,
  createSkillLog,
  createSkillVoteFailedLog,
  type GameLogEntry,
  resetGameLogSequence,
} from '../core/gameLog.js';
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
  characterId: string;
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
  private gameLog: GameLogEntry[] = [];
  private lastDiscardFrom: PlayerIndex | null = null;
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
      characterId: '',
    }));
  }

  join(ws: WebSocket, name: string, characterId = ''): PlayerIndex {
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
    empty.characterId = characterId;

    if (this.hostPlayerIndex === null) {
      this.hostPlayerIndex = empty.playerIndex;
    }

    return empty.playerIndex;
  }

  disconnect(ws: WebSocket): void {
    const seat = this.seats.find((s) => s.ws === ws);
    if (!seat || seat.kind !== 'human') return;
    this.handlePlayerLeave(seat);
  }

  private handlePlayerLeave(seat: SeatSlot, options?: { keepConnected?: boolean }): void {
    const playerName = seat.name;
    const wasInGame = this.inGame;
    const wasHost = seat.playerIndex === this.hostPlayerIndex;
    const leaverWs = options?.keepConnected ? seat.ws : null;

    seat.kind = 'empty';
    seat.name = '';
    seat.ws = null;
    seat.ready = false;
    seat.characterId = '';

    if (wasHost) {
      const nextHost = this.seats.find((s) => s.kind === 'human' && s.ws);
      this.hostPlayerIndex = nextHost?.playerIndex ?? null;
    }

    if (wasInGame) {
      this.scheduleGameAbort(playerName, leaverWs);
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
          this.handleJoin(ws, msg.roomId, msg.name, msg.characterId ?? '');
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
        case 'leave_game':
          if (!seat) throw new Error('请先加入房间');
          if (!this.inGame) throw new Error('当前不在对局中');
          this.handlePlayerLeave(seat, { keepConnected: true });
          break;
        case 'draw_wall':
          if (!seat) throw new Error('请先加入房间');
          this.handleDrawWall(seat);
          break;
        case 'activate_skill':
          if (!seat) throw new Error('请先加入房间');
          this.handleActivateSkill(seat, msg.skillId);
          break;
        case 'skill_pick':
          if (!seat) throw new Error('请先加入房间');
          this.handleSkillPick(seat, {
            tileId: msg.tileId,
            splitRanks: msg.splitRanks,
            confirm: msg.confirm,
          });
          break;
        case 'skill_vote':
          if (!seat) throw new Error('请先加入房间');
          this.handleSkillVote(seat, msg.agree);
          break;
        default:
          sendMessage(ws, { type: 'error', message: '未知消息类型' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      sendMessage(ws, { type: 'error', message });
    }
  }

  private handleJoin(ws: WebSocket, roomId: string, name: string, characterId: string): void {
    if (roomId !== this.roomId) {
      sendMessage(ws, { type: 'error', message: '房间号不匹配' });
      return;
    }
    if (this.inGame) {
      sendMessage(ws, { type: 'error', message: '对局已开始，无法加入' });
      return;
    }

    const playerIndex = this.join(ws, name, characterId);
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
    target.characterId = '';

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
    target.characterId = '';

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
    this.gameLog = [];
    this.lastDiscardFrom = null;
    resetGameLogSequence();
    this.attachGameListeners();
    const playerCharacters = this.seats.map((s) => s.characterId) as [
      string,
      string,
      string,
      string,
    ];
    this.game.start(0, playerCharacters);
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
      'draw_choice_open',
      'skill_pick_open',
      'skill_used',
      'skill_vote_open',
      'skill_vote_cast',
      'skill_vote_failed',
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
        this.lastDiscardFrom = payload.player;
        this.gameLog = appendGameLogEntry(this.gameLog, createDiscardLog(payload));
      }),
    );

    this.unsubs.push(
      this.game.on('after_response', (payload) => {
        if (this.lastDiscardFrom === null) return;
        this.gameLog = appendGameLogEntry(
          this.gameLog,
          createMeldLog(payload, this.lastDiscardFrom),
        );
      }),
    );

    this.unsubs.push(
      this.game.on('after_hu', (payload) => {
        const from = payload.isSelfDraw ? undefined : (this.lastDiscardFrom ?? undefined);
        this.gameLog = appendGameLogEntry(this.gameLog, createHuLog(payload, from));
      }),
    );

    this.unsubs.push(
      this.game.on('skill_used', (payload) => {
        this.gameLog = appendGameLogEntry(this.gameLog, createSkillLog(payload));
      }),
    );

    this.unsubs.push(
      this.game.on('skill_vote_failed', (payload) => {
        this.gameLog = appendGameLogEntry(
          this.gameLog,
          createSkillVoteFailedLog(payload),
        );
      }),
    );
  }

  private scheduleAutoDraw(): void {
    if (this.drawTimer) clearTimeout(this.drawTimer);
    if (this.abortTimer || !this.game || this.game.getPhase() !== 'draw') return;
    // 与单机 useBotPlayers 一致：摸牌选择或技能交互中不自动摸牌
    if (this.game.needsDrawChoice() || this.game.isSkillActive()) return;

    this.drawTimer = setTimeout(() => {
      if (!this.game || this.game.getPhase() !== 'draw') return;
      if (this.game.needsDrawChoice() || this.game.isSkillActive()) return;
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

    if (this.game.isSkillVoteActive()) {
      const mode = snap.skillMode;
      if (mode?.skillId === 'instant_win_vote' && mode.step === 'vote') {
        const initiator = snap.currentPlayer;
        const pendingBots = ([0, 1, 2, 3] as PlayerIndex[]).filter(
          (p) => p !== initiator && this.isBot(p) && mode.votes[p] === null,
        );
        if (pendingBots.length > 0) {
          this.botTimer = setTimeout(() => {
            if (!this.game?.isSkillVoteActive()) return;
            const fresh = this.game.getSnapshot();
            const voteMode = fresh.skillMode;
            if (
              !voteMode ||
              voteMode.skillId !== 'instant_win_vote' ||
              voteMode.step !== 'vote'
            ) {
              return;
            }
            for (const bot of pendingBots) {
              if (voteMode.votes[bot] !== null) continue;
              try {
                this.game.submitSkillVote(bot, true);
              } catch {
                // ignore
              }
            }
          }, delay);
        }
      }
      return;
    }

    if (snap.phase === 'draw' && this.isBot(snap.currentPlayer) && !this.game.needsDrawChoice()) {
      this.botTimer = setTimeout(() => {
        if (!this.game || this.game.getPhase() !== 'draw') return;
        if (!this.isBot(this.game.getCurrentPlayer())) return;
        if (this.game.needsDrawChoice() || this.game.isSkillActive()) return;
        try {
          this.game.drawCard();
        } catch {
          // ignore
        }
      }, delay);
      return;
    }

    if (snap.phase === 'discard' && this.isBot(snap.currentPlayer) && !this.game.isSkillActive()) {
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

  private handleDrawWall(seat: SeatSlot): void {
    if (this.abortTimer) throw new Error('对局即将结束，请稍候');
    if (!this.game) throw new Error('对局未开始');
    if (this.game.getCurrentPlayer() !== seat.playerIndex) {
      throw new Error('不是你的回合');
    }
    this.game.drawCard();
  }

  private handleActivateSkill(seat: SeatSlot, skillId: string): void {
    if (this.abortTimer) throw new Error('对局即将结束，请稍候');
    if (!this.game) throw new Error('对局未开始');
    if (this.game.getCurrentPlayer() !== seat.playerIndex) {
      throw new Error('不是你的回合');
    }
    if (!this.game.activateSkill(skillId)) {
      throw new Error('当前无法发动技能');
    }
  }

  private handleSkillPick(
    seat: SeatSlot,
    params: { tileId?: string; splitRanks?: [number, number]; confirm?: boolean },
  ): void {
    if (this.abortTimer) throw new Error('对局即将结束，请稍候');
    if (!this.game) throw new Error('对局未开始');
    if (this.game.getCurrentPlayer() !== seat.playerIndex) {
      throw new Error('不是你的回合');
    }
    if (!this.game.resolveSkillPick(params)) {
      throw new Error('技能选择无效');
    }
    // 掰牌等中间步骤不会触发 phase/摸牌事件，需主动同步客户端
    this.broadcastGameState();
    this.scheduleBotActions();
  }

  private handleSkillVote(seat: SeatSlot, agree: boolean): void {
    if (this.abortTimer) throw new Error('对局即将结束，请稍候');
    if (!this.game) throw new Error('对局未开始');
    if (!this.game.isSkillVoteActive()) {
      throw new Error('当前不在投票中');
    }
    this.game.submitSkillVote(seat.playerIndex, agree);
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
          characterId: s.characterId,
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

  private scheduleGameAbort(
    playerName: string,
    leaverWs: WebSocket | null = null,
  ): void {
    if (this.abortTimer) return;

    this.clearGameTimers();
    const warning = {
      type: 'game_abort_warning' as const,
      playerName,
      secondsLeft: GAME_ABORT_DELAY_MS / 1000,
    };
    this.broadcast(warning);
    if (leaverWs) {
      sendMessage(leaverWs, warning);
    }

    this.abortTimer = setTimeout(() => {
      this.abortTimer = null;
      this.abortGame(`玩家 ${playerName} 已退出，对局已结束`);
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
    if (!this.game || this.abortTimer) return;
    for (const seat of this.seats) {
      if (!seat.ws) continue;
      const view = this.game.getSnapshotForPlayer(seat.playerIndex);
      sendMessage(seat.ws, {
        type: 'game_state',
        state: {
          view,
          lastDrawnTileId: this.lastDrawnTileId[seat.playerIndex] ?? null,
          log: this.gameLog,
        },
      });
    }
  }

  isEmpty(): boolean {
    return this.seats.every((s) => s.kind === 'empty') && !this.inGame;
  }
}
