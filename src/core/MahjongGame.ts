import { TypedEventEmitter } from './EventEmitter.js';
import { createDeck, shuffleDeck, tilesEqual } from './deck.js';
import type { GameEventListener, GameEventMap, GameEventName } from './events.js';
import type {
  GamePhase,
  GameSnapshot,
  LastDiscard,
  Meld,
  PlayerIndex,
  PlayerState,
  ResponseAction,
  ResponseOption,
  Tile,
} from './types.js';
import { canWin } from './winCheck.js';
import { buildPlayerView } from './playerView.js';
import { createWildcardConfig } from './wildcard.js';
import type { WildcardConfig, PlayerView } from './types.js';

const PLAYER_COUNT = 4;
const INITIAL_HAND_SIZE = 13;

function emptyPlayer(): PlayerState {
  return { hand: [], discards: [], melds: [] };
}

function nextPlayer(current: PlayerIndex): PlayerIndex {
  return ((current + 1) % PLAYER_COUNT) as PlayerIndex;
}

function leftOf(player: PlayerIndex): PlayerIndex {
  return ((player + PLAYER_COUNT - 1) % PLAYER_COUNT) as PlayerIndex;
}

/**
 * MahjongGame — 事件驱动 + 状态机核心
 *
 * 流程概览：
 *   start() → dealing → [庄家 discard] 或 draw
 *   draw → discard → response → (claim?) → draw / game_over
 *
 * 技能接入：监听 before_* / after_* 事件，或返回 false 拦截动作
 */
export class MahjongGame {
  readonly events = new TypedEventEmitter();

  private phase: GamePhase = 'idle';
  private currentPlayer: PlayerIndex = 0;
  private dealer: PlayerIndex = 0;
  private deck: Tile[] = [];
  private players: [PlayerState, PlayerState, PlayerState, PlayerState] = [
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
    emptyPlayer(),
  ];
  private lastDiscard: LastDiscard | null = null;
  private allResponseOptions: ResponseOption[] = [];
  private pendingResponses: ResponseOption[] = [];
  private responseLevel: Exclude<ResponseAction, 'pass'> | null = null;
  private passedPlayers = new Set<PlayerIndex>();
  private turnNumber = 0;
  private winner: PlayerIndex | null = null;
  private wildcard: WildcardConfig | null = null;

  // ── 事件订阅（代理到内部 emitter）──────────────────────────

  on<K extends GameEventName>(event: K, listener: GameEventListener<K>): () => void {
    return this.events.on(event, listener);
  }

  once<K extends GameEventName>(event: K, listener: GameEventListener<K>): () => void {
    return this.events.once(event, listener);
  }

  off<K extends GameEventName>(event: K, listener: GameEventListener<K>): void {
    this.events.off(event, listener);
  }

  // ── 只读快照（供 UI / 回放）────────────────────────────────

  getSnapshot(): GameSnapshot {
    return {
      phase: this.phase,
      currentPlayer: this.currentPlayer,
      dealer: this.dealer,
      deck: [...this.deck],
      players: this.players.map((p) => ({
        hand: [...p.hand],
        discards: [...p.discards],
        melds: p.melds.map((m) => ({ ...m, tiles: [...m.tiles] })),
      })) as GameSnapshot['players'],
      lastDiscard: this.lastDiscard ? { ...this.lastDiscard, tile: { ...this.lastDiscard.tile } } : null,
      pendingResponses: [...this.pendingResponses],
      responseLevel: this.responseLevel,
      turnNumber: this.turnNumber,
      winner: this.winner,
      wildcard: this.wildcard
        ? {
            indicator: { ...this.wildcard.indicator },
            wildcardType: { ...this.wildcard.wildcardType },
          }
        : null,
    };
  }

  /** 联机：按玩家视角返回隐藏信息后的快照 */
  getSnapshotForPlayer(viewer: PlayerIndex): PlayerView {
    return buildPlayerView(this.getSnapshot(), viewer);
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getCurrentPlayer(): PlayerIndex {
    return this.currentPlayer;
  }

  // ── 开局 ────────────────────────────────────────────────────

  /** 初始化并发牌；dealer 默认 0（东风） */
  start(dealer: PlayerIndex = 0): void {
    if (this.phase !== 'idle' && this.phase !== 'game_over') {
      throw new Error(`Cannot start: current phase is ${this.phase}`);
    }

    this.dealer = dealer;
    this.currentPlayer = dealer;
    this.turnNumber = 0;
    this.winner = null;
    this.lastDiscard = null;
    this.allResponseOptions = [];
    this.pendingResponses = [];
    this.responseLevel = null;
    this.passedPlayers.clear();
    this.players = [emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer()];
    this.wildcard = null;

    this.setPhase('dealing');

    this.deck = shuffleDeck(createDeck());

    // 发 13 张 / 人，庄家额外摸 1 张（共 14 张）
    for (let round = 0; round < INITIAL_HAND_SIZE; round++) {
      for (let p = 0; p < PLAYER_COUNT; p++) {
        this.players[p as PlayerIndex].hand.push(this.deck.pop()!);
      }
    }
    this.players[dealer].hand.push(this.deck.pop()!);

    // 翻首张牌定万能：同牌型另 3 张 +（翻牌非白板时）白板作赖子
    if (this.deck.length === 0) {
      throw new Error('Deck empty after deal');
    }
    const indicator = this.deck.pop()!;
    this.wildcard = createWildcardConfig(indicator);
    this.events.emit('wildcard_reveal', { indicator, wildcard: this.wildcard });

    this.events.emit('game_start', { dealer });
    this.events.emit('turn_change', { player: this.currentPlayer, turnNumber: this.turnNumber });

    // 庄家 14 张 → 直接进入出牌阶段
    this.setPhase('discard');
  }

  // ── 摸牌 ────────────────────────────────────────────────────

  /**
   * 当前玩家在 draw 阶段摸牌
   * 自摸胡判定在此触发（占位）
   */
  drawCard(): Tile | null {
    this.assertPhase('draw');
    this.assertCurrentActor();

    if (this.deck.length === 0) {
      this.endGame(null, 'draw');
      return null;
    }

    const player = this.currentPlayer;
    const deckRemaining = this.deck.length;

    if (!this.events.emit('before_draw', { player, deckRemaining })) {
      return null;
    }

    const tile = this.deck.pop()!;
    this.players[player].hand.push(tile);

    this.events.emit('after_draw', {
      player,
      tile,
      deckRemaining: this.deck.length,
    });

    // 自摸胡（占位）
    if (this.tryHu(player, tile, true)) {
      return tile;
    }

    this.setPhase('discard');
    return tile;
  }

  // ── 出牌 ────────────────────────────────────────────────────

  discardCard(tileId: string): Tile | null {
    this.assertPhase('discard');

    const player = this.currentPlayer;
    const hand = this.players[player].hand;
    const idx = hand.findIndex((t) => t.id === tileId);
    if (idx === -1) {
      throw new Error(`Tile ${tileId} not in player ${player}'s hand`);
    }

    const tile = hand[idx];

    if (!this.events.emit('before_discard', { player, tile })) {
      return null;
    }

    hand.splice(idx, 1);
    this.players[player].discards.push(tile);

    this.lastDiscard = { tile, from: player };
    this.events.emit('after_discard', {
      player,
      tile,
      lastDiscard: this.lastDiscard,
    });

    this.turnNumber += 1;
    this.openResponseWindow();
    return tile;
  }

  // ── 响应阶段 ────────────────────────────────────────────────

  /** 获取当前玩家可执行的响应选项 */
  getAvailableResponses(forPlayer: PlayerIndex): ResponseOption[] {
    return this.pendingResponses.filter((o) => o.player === forPlayer);
  }

  /** 玩家放弃响应 */
  passResponse(player: PlayerIndex): void {
    this.assertPhase('response');

    const active = this.getActiveResponses();
    if (!active.some((o) => o.player === player)) return;

    this.passedPlayers.add(player);
    this.events.emit('response_pass', { player });

    this.advanceResponseRound();
  }

  /**
   * 执行吃 / 碰 / 杠 / 胡
   * chiTiles 仅吃牌时需要传入
   */
  respond(
    player: PlayerIndex,
    action: Exclude<ResponseAction, 'pass'>,
    chiTiles?: [Tile, Tile],
  ): boolean {
    this.assertPhase('response');

    const option = this.pendingResponses.find(
      (o) => o.player === player && o.action === action,
    );
    if (!option) {
      throw new Error(`Invalid response: ${action} for player ${player}`);
    }

    if (!this.lastDiscard) {
      throw new Error('No discard to respond to');
    }

    const { tile, from } = this.lastDiscard;

    if (
      !this.events.emit('before_response', {
        player,
        action,
        tile,
        from,
      })
    ) {
      return false;
    }

    if (action === 'hu') {
      return this.tryHu(player, tile, false);
    }

    let meld: Meld | undefined;

    switch (action) {
      case 'pong':
        meld = this.applyPong(player, tile, from);
        break;
      case 'kong':
        meld = this.applyKong(player, tile, from);
        break;
      case 'chi': {
        if (!chiTiles && option.chiTiles) chiTiles = option.chiTiles;
        if (!chiTiles) throw new Error('chiTiles required for chi');
        meld = this.applyChi(player, tile, from, chiTiles);
        break;
      }
    }

    this.events.emit('after_response', { player, action, meld, won: false });
    this.closeResponseWindow(true);

    this.currentPlayer = player;
    this.events.emit('turn_change', { player, turnNumber: this.turnNumber });

    // 杠后补牌 → 出牌；吃碰 → 出牌
    this.setPhase('discard');
    return true;
  }

  // ── 状态机辅助 ──────────────────────────────────────────────

  private setPhase(next: GamePhase): void {
    if (this.phase === next) return;
    const prev = this.phase;
    this.phase = next;
    this.events.emit('phase_change', { from: prev, to: next });
  }

  private openResponseWindow(): void {
    if (!this.lastDiscard) return;

    this.allResponseOptions = this.computeResponses(this.lastDiscard);
    this.passedPlayers.clear();
    this.refreshActiveResponses(false);

    if (this.pendingResponses.length === 0) {
      this.advanceToNextDraw(this.lastDiscard.from);
      return;
    }

    this.setPhase('response');
    this.events.emit('response_window_open', {
      lastDiscard: this.lastDiscard,
      options: [...this.pendingResponses],
    });
  }

  /** 按 胡>杠>碰>吃 逐级开放响应；高优先级玩家 pass 后解锁低优先级 */
  private getActiveResponses(): ResponseOption[] {
    const priority: Exclude<ResponseAction, 'pass'>[] = ['hu', 'kong', 'pong', 'chi'];
    for (const action of priority) {
      const level = this.allResponseOptions.filter(
        (o) => o.action === action && !this.passedPlayers.has(o.player),
      );
      if (level.length > 0) return level;
    }
    return [];
  }

  private refreshActiveResponses(emitLevelChange: boolean): void {
    const prevLevel = this.responseLevel;
    this.pendingResponses = this.getActiveResponses();
    this.responseLevel = this.pendingResponses[0]?.action ?? null;

    if (emitLevelChange && this.responseLevel && this.responseLevel !== prevLevel) {
      this.events.emit('response_level_change', {
        level: this.responseLevel,
        options: [...this.pendingResponses],
      });
    }
  }

  /** pass 后：同级是否还有人未决定 → 否则降级到下一优先级 */
  private advanceResponseRound(): void {
    const active = this.getActiveResponses();

    if (active.length > 0) {
      const prevLevel = this.responseLevel;
      this.pendingResponses = active;
      this.responseLevel = active[0].action;
      if (this.responseLevel !== prevLevel) {
        this.events.emit('response_level_change', {
          level: this.responseLevel,
          options: [...active],
        });
      }
      return;
    }

    const discardFrom = this.lastDiscard?.from ?? this.currentPlayer;
    this.closeResponseWindow(false);
    this.advanceToNextDraw(discardFrom);
  }

  private closeResponseWindow(claimed: boolean): void {
    this.events.emit('response_window_close', { claimed });
    this.allResponseOptions = [];
    this.pendingResponses = [];
    this.responseLevel = null;
    this.passedPlayers.clear();
    this.lastDiscard = null;
  }

  /** 无人吃碰杠胡 → 下家摸牌 */
  private advanceToNextDraw(afterPlayer: PlayerIndex): void {
    this.currentPlayer = nextPlayer(afterPlayer);
    this.events.emit('turn_change', {
      player: this.currentPlayer,
      turnNumber: this.turnNumber,
    });
    this.setPhase('draw');
  }

  private endGame(winner: PlayerIndex | null, reason: 'hu' | 'draw' | 'abort'): void {
    this.winner = winner;
    this.setPhase('game_over');
    this.events.emit('game_over', { winner, reason });
  }

  // ── 响应判定 ────────────────────────────────────────────────

  private computeResponses(last: LastDiscard): ResponseOption[] {
    const options: ResponseOption[] = [];
    const { tile, from } = last;

    for (let p = 0; p < PLAYER_COUNT; p++) {
      const player = p as PlayerIndex;
      if (player === from) continue;

      const state = this.players[player];

      // 胡 > 杠 > 碰 > 吃
      if (canWin(state.hand, state.melds, tile, this.wildcard)) {
        options.push({ player, action: 'hu' });
      }

      const sameInHand = state.hand.filter((t) => tilesEqual(t, tile));
      if (sameInHand.length >= 3) {
        options.push({ player, action: 'kong' });
      } else if (sameInHand.length >= 2) {
        options.push({ player, action: 'pong' });
      }

      // 仅下家可吃
      if (player === nextPlayer(from)) {
        const chiCombos = this.findChiCombos(state.hand, tile);
        for (const chiTiles of chiCombos) {
          options.push({ player, action: 'chi', chiTiles });
        }
      }
    }

    return options;
  }

  private findChiCombos(hand: Tile[], tile: Tile): [Tile, Tile][] {
    if (!['wan', 'tong', 'tiao'].includes(tile.suit)) return [];

    const combos: [Tile, Tile][] = [];

    // tile 作为顺子中间或两端
    const patterns: [number, number][] = [
      [tile.rank - 2, tile.rank - 1],
      [tile.rank - 1, tile.rank + 1],
      [tile.rank + 1, tile.rank + 2],
    ];

    for (const [r1, r2] of patterns) {
      if (r1 < 1 || r2 > 9) continue;
      const t1 = hand.find((t) => t.suit === tile.suit && t.rank === r1);
      const t2 = hand.find((t) => t.suit === tile.suit && t.rank === r2);
      if (t1 && t2 && t1.id !== t2.id) {
        combos.push([t1, t2]);
      }
    }

    return combos;
  }

  // ── 鸣牌执行 ────────────────────────────────────────────────

  private applyPong(player: PlayerIndex, tile: Tile, from: PlayerIndex): Meld {
    const hand = this.players[player].hand;
    const matches = hand.filter((t) => tilesEqual(t, tile)).slice(0, 2);
    for (const t of matches) {
      hand.splice(hand.indexOf(t), 1);
    }
    this.removeLastDiscardFromPlayer(from);

    const meld: Meld = { type: 'pong', tiles: [matches[0], matches[1], { ...tile }], fromPlayer: from };
    this.players[player].melds.push(meld);
    return meld;
  }

  private applyKong(player: PlayerIndex, tile: Tile, from: PlayerIndex): Meld {
    const hand = this.players[player].hand;
    const matches = hand.filter((t) => tilesEqual(t, tile)).slice(0, 3);
    for (const t of matches) {
      hand.splice(hand.indexOf(t), 1);
    }
    this.removeLastDiscardFromPlayer(from);

    const meld: Meld = {
      type: 'kong',
      tiles: [matches[0], matches[1], matches[2], { ...tile }],
      fromPlayer: from,
    };
    this.players[player].melds.push(meld);

    // 明杠补牌
    this.supplementAfterKong(player);
    return meld;
  }

  private applyChi(
    player: PlayerIndex,
    tile: Tile,
    from: PlayerIndex,
    chiTiles: [Tile, Tile],
  ): Meld {
    const hand = this.players[player].hand;
    for (const t of chiTiles) {
      const idx = hand.findIndex((h) => h.id === t.id);
      if (idx === -1) throw new Error('chiTiles not in hand');
      hand.splice(idx, 1);
    }
    this.removeLastDiscardFromPlayer(from);

    const sorted = [...chiTiles, tile].sort((a, b) => a.rank - b.rank);
    const meld: Meld = { type: 'chi', tiles: sorted, fromPlayer: from };
    this.players[player].melds.push(meld);
    return meld;
  }

  private removeLastDiscardFromPlayer(from: PlayerIndex): void {
    const discards = this.players[from].discards;
    if (discards.length > 0) {
      discards.pop();
    }
  }

  private supplementAfterKong(player: PlayerIndex): void {
    if (this.deck.length === 0) return;
    const tile = this.deck.pop()!;
    this.players[player].hand.push(tile);
    this.events.emit('after_draw', {
      player,
      tile,
      deckRemaining: this.deck.length,
    });
  }

  // ── 胡牌（占位）────────────────────────────────────────────

  private tryHu(player: PlayerIndex, tile: Tile, isSelfDraw: boolean): boolean {
    const state = this.players[player];

    if (!this.events.emit('before_hu', { player, tile, isSelfDraw })) {
      return false;
    }

    if (!canWin(state.hand, state.melds, tile, this.wildcard)) {
      return false;
    }

    this.events.emit('after_hu', { player, tile, isSelfDraw });
    this.events.emit('after_response', {
      player,
      action: 'hu',
      won: true,
    });
    this.closeResponseWindow(true);
    this.endGame(player, 'hu');
    return true;
  }

  // ── 断言 ────────────────────────────────────────────────────

  private assertPhase(expected: GamePhase): void {
    if (this.phase !== expected) {
      throw new Error(`Expected phase "${expected}", got "${this.phase}"`);
    }
  }

  private assertCurrentActor(): void {
    // 预留：联机模式下校验 actor === currentPlayer
  }

  private canRespond(player: PlayerIndex): boolean {
    return this.getActiveResponses().some((o) => o.player === player);
  }
}

/** 技能模块注册辅助：批量挂载钩子 */
export function registerSkillHooks(
  game: MahjongGame,
  hooks: Partial<{ [K in GameEventName]: GameEventListener<K> }>,
): () => void {
  const unsubs: (() => void)[] = [];
  for (const [event, listener] of Object.entries(hooks)) {
    if (listener) {
      unsubs.push(game.on(event as GameEventName, listener as GameEventListener<GameEventName>));
    }
  }
  return () => unsubs.forEach((fn) => fn());
}

export type { GameEventMap, GameEventName, GameEventListener };
