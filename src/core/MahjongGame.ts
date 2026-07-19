import { TypedEventEmitter } from './EventEmitter.js';
import { createDeck, createSkillTile, shuffleDeck, tilesEqual } from './deck.js';
import type { GameEventListener, GameEventMap, GameEventName } from './events.js';
import type {
  DrawMode,
  GameOverReason,
  GamePhase,
  GameSnapshot,
  LastDiscard,
  Meld,
  PlayerIndex,
  PlayerState,
  ResponseAction,
  ResponseOption,
  SkillMode,
  SkillVoteChoice,
  Tile,
  WinInfo,
} from './types.js';
import {
  LET_ME_DRAW_MAX_USES,
  LET_ME_DRAW_SKILL_ID,
  LET_ME_DRAW_SKILL_NAME,
  canPlayerUseLetMeDrawSkill,
  canUseLetMeDraw,
  isShouDuanZhe,
} from './skills/letMeDraw.js';
import {
  SPLIT_TILE_MAX_USES,
  SPLIT_TILE_SKILL_ID,
  SPLIT_TILE_SKILL_NAME,
  canUseSplitTile,
  getSplitPairs,
  isHeiPiTiYuSheng,
  isSplittableTile,
} from './skills/splitTile.js';
import {
  CANT_READ_SKILL_ID,
  CANT_READ_SKILL_NAME,
  canPlayerUseCantReadSkill,
  canUseCantRead,
  getUnreadableTilesInHand,
  isJueWangDeWenMang,
} from './skills/cantRead.js';
import {
  INSTANT_WIN_VOTE_SKILL_ID,
  INSTANT_WIN_VOTE_SKILL_NAME,
  canUseInstantWinVote,
  getPendingSkillVoters,
  isDuiKangLuGaluo,
  isInstantWinVoteActive,
} from './skills/instantWinVote.js';
import {
  LING_SHI_DA_ZONG_TONG_ID,
  STEAL_VICTORY_SKILL_ID,
  STEAL_VICTORY_SKILL_NAME,
  canUseStealVictory,
  isBlackHandJudgmentHonorTile,
} from './skills/stealVictory.js';
import {
  VEGETABLE_JUICE_CAISHEN_MAX_USES,
  VEGETABLE_JUICE_CAISHEN_SKILL_ID,
  VEGETABLE_JUICE_CAISHEN_SKILL_NAME,
  canUseVegetableJuiceCaishen,
} from './skills/vegetableJuiceCaishen.js';
import {
  BORROW_TILE_MAX_USES,
  BORROW_TILE_SKILL_ID,
  BORROW_TILE_SKILL_NAME,
  canUseBorrowTile,
  getBorrowTileTargets,
  resetBorrowTileTurnUsage,
} from './skills/borrowTile.js';
import {
  WEN_QU_DESCENDS_MAX_USES,
  WEN_QU_DESCENDS_SKILL_ID,
  WEN_QU_DESCENDS_SKILL_NAME,
  canUseWenQuDescends,
  isWanTile,
  parseWenQuWanTargetRank,
} from './skills/wenQuDescends.js';
import { canWin } from './winCheck.js';
import { buildPlayerView } from './playerView.js';
import { createWildcardConfig, replaceWildcardDisplay } from './wildcard.js';
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
  private winInfo: WinInfo | null = null;
  private wildcard: WildcardConfig | null = null;
  private playerCharacters: [string, string, string, string] = ['', '', '', ''];
  private skillUses: [number, number, number, number] = [0, 0, 0, 0];
  private drawMode: DrawMode | null = null;
  private skillMode: SkillMode | null = null;
  private blackHandTarget: PlayerIndex | null = null;
  private blackHandOwner: PlayerIndex | null = null;
  private blackHandJudgmentPending = false;
  private gameOverReason: GameOverReason | null = null;

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
      winInfo: this.winInfo
        ? {
            tile: { ...this.winInfo.tile },
            isSelfDraw: this.winInfo.isSelfDraw,
          }
        : null,
      wildcard: this.wildcard
        ? {
            indicator: { ...this.wildcard.indicator },
            wildcardType: { ...this.wildcard.wildcardType },
          }
        : null,
      playerCharacters: [...this.playerCharacters] as GameSnapshot['playerCharacters'],
      skillUses: [...this.skillUses] as GameSnapshot['skillUses'],
      drawMode: this.drawMode,
      skillMode: this.skillMode
        ? this.skillMode.skillId === 'split_tile' && this.skillMode.step === 'pick_keep'
          ? {
              ...this.skillMode,
              tileA: { ...this.skillMode.tileA },
              tileB: { ...this.skillMode.tileB },
            }
          : { ...this.skillMode }
        : null,
      blackHandTarget: this.blackHandTarget,
      blackHandOwner: this.blackHandOwner,
      gameOverReason: this.gameOverReason,
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
  start(
    dealer: PlayerIndex = 0,
    playerCharacters: [string, string, string, string] = ['', '', '', ''],
  ): void {
    if (this.phase !== 'idle' && this.phase !== 'game_over') {
      throw new Error(`Cannot start: current phase is ${this.phase}`);
    }

    this.dealer = dealer;
    this.currentPlayer = dealer;
    this.turnNumber = 0;
    this.winner = null;
    this.winInfo = null;
    this.lastDiscard = null;
    this.allResponseOptions = [];
    this.pendingResponses = [];
    this.responseLevel = null;
    this.passedPlayers.clear();
    this.players = [emptyPlayer(), emptyPlayer(), emptyPlayer(), emptyPlayer()];
    this.wildcard = null;
    this.playerCharacters = [...playerCharacters] as [string, string, string, string];
    this.skillUses = [0, 0, 0, 0];
    this.drawMode = null;
    this.skillMode = null;
    this.blackHandTarget = null;
    this.blackHandOwner = null;
    this.blackHandJudgmentPending = false;
    this.gameOverReason = null;

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

  /** 是否等待玩家选择摸牌方式（牌墙 / 技能） */
  needsDrawChoice(): boolean {
    return this.phase === 'draw' && this.drawMode === 'choose';
  }

  /** 是否有技能交互进行中 */
  isSkillActive(): boolean {
    return this.skillMode !== null;
  }

  /** 是否有技能投票进行中 */
  isSkillVoteActive(): boolean {
    return isInstantWinVoteActive(this.skillMode);
  }

  /** 是否等待从河牌选牌（手短者） */
  isSkillPickMode(): boolean {
    return (
      this.phase === 'draw' &&
      this.skillMode?.skillId === LET_ME_DRAW_SKILL_ID &&
      this.skillMode.step === 'pick_discard'
    );
  }

  /**
   * 当前玩家在 draw 阶段摸牌（从牌墙）
   */
  drawCard(): Tile | null {
    this.assertPhase('draw');
    this.assertCurrentActor();

    if (this.skillMode !== null) {
      throw new Error('请先完成技能选择');
    }

    if (this.drawMode === 'choose') {
      this.drawMode = null;
    }

    return this.executeWallDraw();
  }

  /** 发动技能（按 skillId 路由） */
  activateSkill(skillId: string): boolean {
    if (skillId === LET_ME_DRAW_SKILL_ID) return this.activateLetMeDrawSkill();
    if (skillId === CANT_READ_SKILL_ID) return this.activateCantReadSkill();
    if (skillId === INSTANT_WIN_VOTE_SKILL_ID) return this.activateInstantWinVoteSkill();
    if (skillId === SPLIT_TILE_SKILL_ID) return this.activateSplitTileSkill();
    if (skillId === STEAL_VICTORY_SKILL_ID) return this.activateStealVictorySkill();
    if (skillId === VEGETABLE_JUICE_CAISHEN_SKILL_ID) return this.activateVegetableJuiceCaishenSkill();
    if (skillId === BORROW_TILE_SKILL_ID) return this.activateBorrowTileSkill();
    if (skillId === WEN_QU_DESCENDS_SKILL_ID) return this.activateWenQuDescendsSkill();
    return false;
  }

  /** 发动「让让我吧」：进入从河牌选牌 */
  activateLetMeDrawSkill(): boolean {
    this.assertPhase('draw');
    const player = this.currentPlayer;
    const snap = this.getSnapshot();

    if (!canUseLetMeDraw(snap, player)) {
      return false;
    }

    this.skillMode = { skillId: LET_ME_DRAW_SKILL_ID, step: 'pick_discard' };
    this.events.emit('skill_pick_open', { player });
    return true;
  }

  /** 发动「我看不懂啊」：进入确认丢弃带字牌 */
  activateCantReadSkill(): boolean {
    const player = this.currentPlayer;
    const snap = this.getSnapshot();

    if (!canUseCantRead(snap, player)) {
      return false;
    }

    this.skillMode = { skillId: CANT_READ_SKILL_ID, step: 'confirm' };
    this.events.emit('skill_pick_open', { player });
    return true;
  }

  /** 发动「一秒四破」：进入确认发起投票 */
  activateInstantWinVoteSkill(): boolean {
    const player = this.currentPlayer;
    const snap = this.getSnapshot();

    if (!canUseInstantWinVote(snap, player)) {
      return false;
    }

    this.skillMode = { skillId: INSTANT_WIN_VOTE_SKILL_ID, step: 'confirm' };
    this.events.emit('skill_pick_open', { player });
    return true;
  }

  activateSplitTileSkill(): boolean {
    this.assertPhase('discard');
    const player = this.currentPlayer;
    const snap = this.getSnapshot();

    if (!canUseSplitTile(snap, player)) {
      return false;
    }

    this.skillMode = { skillId: SPLIT_TILE_SKILL_ID, step: 'pick_source' };
    this.events.emit('skill_pick_open', { player });
    return true;
  }

  /** 发动「窃取胜利果实」：点击技能按钮后选择黑手目标 */
  activateStealVictorySkill(): boolean {
    this.assertPhase('discard');
    const player = this.currentPlayer;
    const snap = this.getSnapshot();

    if (!canUseStealVictory(snap, player)) {
      return false;
    }

    this.skillMode = { skillId: STEAL_VICTORY_SKILL_ID, step: 'pick_target' };
    this.events.emit('skill_pick_open', { player });
    return true;
  }

  /** 发动「蔬菜汁财神」：选手牌替换万能牌 */
  activateVegetableJuiceCaishenSkill(): boolean {
    this.assertPhase('discard');
    const player = this.currentPlayer;
    const snap = this.getSnapshot();

    if (!canUseVegetableJuiceCaishen(snap, player)) {
      return false;
    }

    this.skillMode = { skillId: VEGETABLE_JUICE_CAISHEN_SKILL_ID, step: 'pick_hand' };
    this.events.emit('skill_pick_open', { player });
    return true;
  }

  /** 发动「同学这个借我用一下」：选手牌后指定玩家互换 */
  activateBorrowTileSkill(): boolean {
    this.assertPhase('discard');
    const player = this.currentPlayer;
    const snap = this.getSnapshot();

    if (!canUseBorrowTile(snap, player)) {
      return false;
    }

    this.skillMode = { skillId: BORROW_TILE_SKILL_ID, step: 'pick_hand' };
    this.events.emit('skill_pick_open', { player });
    return true;
  }

  /** 发动「文曲下凡」：选万字牌后改点数 */
  activateWenQuDescendsSkill(): boolean {
    this.assertPhase('discard');
    const player = this.currentPlayer;
    const snap = this.getSnapshot();

    if (!canUseWenQuDescends(snap, player)) {
      return false;
    }

    this.skillMode = { skillId: WEN_QU_DESCENDS_SKILL_ID, step: 'pick_hand' };
    this.events.emit('skill_pick_open', { player });
    return true;
  }

  /** 技能交互：选牌 / 选拆分 / 选保留 / 确认 / 选黑手目标 */
  resolveSkillPick(params: {
    tileId?: string;
    splitRanks?: [number, number];
    confirm?: boolean;
    targetPlayer?: PlayerIndex;
    skip?: boolean;
  }): boolean {
    if (!this.skillMode) {
      throw new Error('当前未在技能选择中');
    }

    if (this.skillMode.skillId === LET_ME_DRAW_SKILL_ID) {
      if (!params.tileId) throw new Error('请选择河牌');
      return this.drawFromOwnDiscard(params.tileId) !== null;
    }

    if (this.skillMode.skillId === CANT_READ_SKILL_ID) {
      if (params.skip) {
        this.skillMode = null;
        return true;
      }
      if (!params.confirm) throw new Error('请确认发动技能');
      return this.executeCantReadSkill();
    }

    if (this.skillMode.skillId === INSTANT_WIN_VOTE_SKILL_ID) {
      if (this.skillMode.step !== 'confirm') {
        throw new Error('当前未在确认投票');
      }
      if (params.skip) {
        this.skillMode = null;
        return true;
      }
      if (!params.confirm) throw new Error('请确认发起投票');
      return this.startInstantWinVote();
    }

    if (this.skillMode.skillId === SPLIT_TILE_SKILL_ID) {
      return this.resolveSplitTilePick(params);
    }

    if (this.skillMode.skillId === STEAL_VICTORY_SKILL_ID) {
      return this.resolveStealVictoryPick(params);
    }

    if (this.skillMode.skillId === VEGETABLE_JUICE_CAISHEN_SKILL_ID) {
      return this.resolveVegetableJuiceCaishenPick(params);
    }

    if (this.skillMode.skillId === BORROW_TILE_SKILL_ID) {
      return this.resolveBorrowTilePick(params);
    }

    if (this.skillMode.skillId === WEN_QU_DESCENDS_SKILL_ID) {
      return this.resolveWenQuDescendsPick(params);
    }

    return false;
  }

  private resolveWenQuDescendsPick(params: {
    tileId?: string;
    skip?: boolean;
  }): boolean {
    const mode = this.skillMode;
    if (!mode || mode.skillId !== WEN_QU_DESCENDS_SKILL_ID) {
      throw new Error('当前未在文曲下凡技能中');
    }

    const player = this.currentPlayer;

    if (params.skip) {
      this.skillMode = null;
      return true;
    }

    if (mode.step === 'pick_hand') {
      if (!params.tileId) {
        throw new Error('请选择万字牌');
      }

      const hand = this.players[player].hand;
      const sourceTile = hand.find((t) => t.id === params.tileId);
      if (!sourceTile || !isWanTile(sourceTile)) {
        throw new Error('只能选择万字牌');
      }

      this.skillMode = {
        skillId: WEN_QU_DESCENDS_SKILL_ID,
        step: 'pick_wan_rank',
        sourceTileId: sourceTile.id,
      };
      this.events.emit('skill_pick_open', { player });
      return true;
    }

    if (mode.step === 'pick_wan_rank') {
      if (!params.tileId) {
        throw new Error('请选择目标万字牌');
      }

      const targetRank = parseWenQuWanTargetRank(params.tileId);
      if (targetRank === null) {
        throw new Error('请选择一至九万');
      }

      const hand = this.players[player].hand;
      const sourceIdx = hand.findIndex((t) => t.id === mode.sourceTileId);
      if (sourceIdx === -1) {
        throw new Error('所选万字牌不在手中');
      }

      const sourceTile = hand[sourceIdx];
      if (!isWanTile(sourceTile)) {
        throw new Error('所选牌不是万字牌');
      }

      const transformedTile: Tile = {
        id: sourceTile.id,
        suit: 'wan',
        rank: targetRank,
      };
      hand[sourceIdx] = transformedTile;
      this.skillUses[player] += 1;
      this.skillMode = null;

      this.events.emit('skill_used', {
        player,
        skillId: WEN_QU_DESCENDS_SKILL_ID,
        skillName: WEN_QU_DESCENDS_SKILL_NAME,
        tile: { ...transformedTile },
        sourceTile: { ...sourceTile },
        usesRemaining: WEN_QU_DESCENDS_MAX_USES - this.skillUses[player],
      });

      if (this.tryHu(player, transformedTile, true)) {
        return true;
      }

      return true;
    }

    return false;
  }

  private resolveBorrowTilePick(params: {
    tileId?: string;
    targetPlayer?: PlayerIndex;
    skip?: boolean;
  }): boolean {
    const mode = this.skillMode;
    if (!mode || mode.skillId !== BORROW_TILE_SKILL_ID) {
      throw new Error('当前未在借牌技能中');
    }

    const player = this.currentPlayer;

    if (params.skip) {
      this.skillMode = null;
      return true;
    }

    if (mode.step === 'pick_hand') {
      if (!params.tileId) {
        throw new Error('请选择手牌');
      }

      const hand = this.players[player].hand;
      const sourceTile = hand.find((t) => t.id === params.tileId);
      if (!sourceTile) {
        throw new Error('请选择手牌中的一张牌');
      }

      const targets = getBorrowTileTargets(this.getSnapshot(), player);
      if (targets.length === 0) {
        throw new Error('没有可借牌的目标玩家');
      }

      this.skillMode = {
        skillId: BORROW_TILE_SKILL_ID,
        step: 'pick_target',
        sourceTileId: sourceTile.id,
      };
      this.events.emit('skill_pick_open', { player });
      return true;
    }

    if (mode.step === 'pick_target') {
      if (params.targetPlayer === undefined) {
        throw new Error('请选择目标玩家');
      }

      const target = params.targetPlayer;
      if (target === player) {
        throw new Error('不能选择自己');
      }

      const actorHand = this.players[player].hand;
      const sourceIdx = actorHand.findIndex((t) => t.id === mode.sourceTileId);
      if (sourceIdx === -1) {
        throw new Error('所选手牌不在手中');
      }

      const targetHand = this.players[target].hand;
      if (targetHand.length === 0) {
        throw new Error('目标玩家没有手牌');
      }

      const offeredTile = actorHand[sourceIdx];
      const randomIdx = Math.floor(Math.random() * targetHand.length);
      const borrowedTile = targetHand[randomIdx];

      actorHand[sourceIdx] = { ...borrowedTile };
      targetHand[randomIdx] = { ...offeredTile };

      this.skillUses[player] += 1;
      this.skillMode = null;

      this.events.emit('skill_used', {
        player,
        skillId: BORROW_TILE_SKILL_ID,
        skillName: BORROW_TILE_SKILL_NAME,
        tile: { ...borrowedTile },
        sourceTile: { ...offeredTile },
        targetPlayer: target,
        hideReceivedTile: true,
        usesRemaining: BORROW_TILE_MAX_USES - this.skillUses[player],
      });

      return true;
    }

    return false;
  }

  private resolveVegetableJuiceCaishenPick(params: {
    tileId?: string;
    skip?: boolean;
  }): boolean {
    if (
      this.skillMode?.skillId !== VEGETABLE_JUICE_CAISHEN_SKILL_ID ||
      this.skillMode.step !== 'pick_hand'
    ) {
      throw new Error('当前未在选择手牌');
    }

    const player = this.currentPlayer;

    if (params.skip) {
      this.skillMode = null;
      return true;
    }

    if (!params.tileId) {
      throw new Error('请选择手牌');
    }

    if (!this.wildcard) {
      throw new Error('当前没有万能牌');
    }

    const hand = this.players[player].hand;
    const idx = hand.findIndex((t) => t.id === params.tileId);
    if (idx === -1) {
      throw new Error('请选择手牌中的一张牌');
    }

    const sacrificed = hand[idx];
    const previousType = { ...this.wildcard.wildcardType };
    const previousIndicator = { ...this.wildcard.indicator };
    const receivedTile = createSkillTile(previousType.suit, previousType.rank);

    hand.splice(idx, 1);
    hand.push(receivedTile);

    this.wildcard = replaceWildcardDisplay(this.wildcard, {
      suit: sacrificed.suit,
      rank: sacrificed.rank,
    });

    this.skillUses[player] += 1;
    this.skillMode = null;

    this.events.emit('wildcard_change', {
      player,
      previousType,
      newType: { suit: sacrificed.suit, rank: sacrificed.rank },
      previousIndicator,
      newIndicator: { ...this.wildcard.indicator },
      receivedTile,
      sacrificedTile: { ...sacrificed },
    });

    this.events.emit('skill_used', {
      player,
      skillId: VEGETABLE_JUICE_CAISHEN_SKILL_ID,
      skillName: VEGETABLE_JUICE_CAISHEN_SKILL_NAME,
      tile: receivedTile,
      sourceTile: { ...sacrificed },
      usesRemaining: VEGETABLE_JUICE_CAISHEN_MAX_USES - this.skillUses[player],
    });

    return true;
  }

  private resolveStealVictoryPick(params: {
    targetPlayer?: PlayerIndex;
    skip?: boolean;
  }): boolean {
    if (this.skillMode?.skillId !== STEAL_VICTORY_SKILL_ID || this.skillMode.step !== 'pick_target') {
      throw new Error('当前未在选择黑手目标');
    }

    const player = this.currentPlayer;
    this.skillMode = null;

    if (params.skip) {
      return true;
    }

    const target = params.targetPlayer;
    if (target === undefined) {
      throw new Error('请选择黑手目标');
    }
    if (target === player) {
      throw new Error('不能对自己使用黑手');
    }

    this.blackHandTarget = target;
    this.blackHandOwner = player;

    this.events.emit('skill_used', {
      player,
      skillId: STEAL_VICTORY_SKILL_ID,
      skillName: '黑手',
      tile: { id: 'black-hand', suit: 'feng', rank: 1 },
      blackHandPublic: true,
    });

    return true;
  }

  /** 投票型技能：其余玩家表决 */
  submitSkillVote(voter: PlayerIndex, agree: boolean): boolean {
    const mode = this.skillMode;
    if (!mode || mode.skillId !== INSTANT_WIN_VOTE_SKILL_ID || mode.step !== 'vote') {
      throw new Error('当前不在投票中');
    }

    const initiator = this.currentPlayer;
    if (voter === initiator) {
      throw new Error('发起者不能投票');
    }
    if (mode.votes[voter] !== null) {
      throw new Error('你已经投过票了');
    }

    const choice: SkillVoteChoice = agree ? 'agree' : 'reject';
    const votes = [...mode.votes] as typeof mode.votes;
    votes[voter] = choice;
    this.skillMode = { ...mode, votes };

    this.events.emit('skill_vote_cast', { initiator, voter, agree });

    if (!agree) {
      return this.resolveInstantWinVoteFailed(initiator, voter);
    }

    const pending = getPendingSkillVoters(initiator, votes);
    if (pending.length === 0) {
      return this.resolveInstantWinVotePassed(initiator);
    }

    return true;
  }

  private startInstantWinVote(): boolean {
    const initiator = this.currentPlayer;
    if (!isDuiKangLuGaluo(this.playerCharacters[initiator])) {
      throw new Error('该角色无法使用此技能');
    }

    this.skillMode = {
      skillId: INSTANT_WIN_VOTE_SKILL_ID,
      step: 'vote',
      votes: [null, null, null, null],
    };
    this.events.emit('skill_vote_open', { initiator });
    return true;
  }

  private resolveInstantWinVotePassed(initiator: PlayerIndex): boolean {
    this.skillMode = null;
    const tile = this.players[initiator].hand[0] ?? {
      id: 'skill-vote-win',
      suit: 'wan' as const,
      rank: 1,
    };

    this.events.emit('skill_used', {
      player: initiator,
      skillId: INSTANT_WIN_VOTE_SKILL_ID,
      skillName: INSTANT_WIN_VOTE_SKILL_NAME,
      tile: { ...tile },
      votePassed: true,
    });

    this.endGame(initiator, 'skill_vote');
    return true;
  }

  private resolveInstantWinVoteFailed(initiator: PlayerIndex, rejectedBy: PlayerIndex): boolean {
    this.skillMode = null;
    this.events.emit('skill_vote_failed', { initiator, rejectedBy });

    if (this.phase === 'draw' && isDuiKangLuGaluo(this.playerCharacters[initiator])) {
      this.drawMode = 'choose';
    }

    return true;
  }

  /** 从自己的河牌摸一张（技能） */
  drawFromOwnDiscard(tileId: string): Tile | null {
    this.assertPhase('draw');
    this.assertCurrentActor();

    if (this.skillMode?.skillId !== LET_ME_DRAW_SKILL_ID || this.skillMode.step !== 'pick_discard') {
      throw new Error('当前未在选择河牌');
    }

    const player = this.currentPlayer;
    if (!isShouDuanZhe(this.playerCharacters[player])) {
      throw new Error('该角色无法使用此技能');
    }
    if (this.skillUses[player] >= LET_ME_DRAW_MAX_USES) {
      throw new Error('技能次数已用尽');
    }

    const discards = this.players[player].discards;
    const idx = discards.findIndex((t) => t.id === tileId);
    if (idx === -1) {
      throw new Error('只能选择自己打出的河牌');
    }

    const deckRemaining = this.deck.length;
    if (!this.events.emit('before_draw', { player, deckRemaining, fromSkill: true })) {
      return null;
    }

    const tile = discards.splice(idx, 1)[0];
    this.players[player].hand.push(tile);
    this.skillUses[player] += 1;
    this.skillMode = null;

    if (this.tryHu(player, tile, true)) {
      this.events.emit('after_draw', {
        player,
        tile,
        deckRemaining,
        fromSkill: true,
      });
      this.events.emit('skill_used', {
        player,
        skillId: LET_ME_DRAW_SKILL_ID,
        skillName: LET_ME_DRAW_SKILL_NAME,
        tile,
        usesRemaining: LET_ME_DRAW_MAX_USES - this.skillUses[player],
      });
      return tile;
    }

    this.setPhase('discard');
    this.events.emit('after_draw', {
      player,
      tile,
      deckRemaining,
      fromSkill: true,
    });
    this.events.emit('skill_used', {
      player,
      skillId: LET_ME_DRAW_SKILL_ID,
      skillName: LET_ME_DRAW_SKILL_NAME,
      tile,
      usesRemaining: LET_ME_DRAW_MAX_USES - this.skillUses[player],
    });
    return tile;
  }

  /** 执行「我看不懂啊」：弃全部带字牌、等量补摸、跳过出牌 */
  private executeCantReadSkill(): boolean {
    this.assertCurrentActor();

    const player = this.currentPlayer;
    const snap = this.getSnapshot();
    if (!canUseCantRead(snap, player) && this.skillMode?.skillId !== CANT_READ_SKILL_ID) {
      throw new Error('当前无法发动该技能');
    }

    if (!isJueWangDeWenMang(this.playerCharacters[player])) {
      throw new Error('该角色无法使用此技能');
    }

    const mode = this.skillMode;
    if (!mode || mode.skillId !== CANT_READ_SKILL_ID || mode.step !== 'confirm') {
      throw new Error('当前未在确认技能');
    }

    const hand = this.players[player].hand;
    const unreadableTiles = getUnreadableTilesInHand(hand);
    if (unreadableTiles.length === 0) {
      throw new Error('手牌中没有带字的牌');
    }

    const discardedTiles: Tile[] = [];
    for (const tile of unreadableTiles) {
      const idx = hand.findIndex((t) => t.id === tile.id);
      if (idx === -1) continue;
      const removed = hand.splice(idx, 1)[0];
      this.players[player].discards.push({ ...removed });
      discardedTiles.push({ ...removed });
    }

    const drawCount = discardedTiles.length;
    const drawnTiles: Tile[] = [];

    this.drawMode = null;
    this.skillMode = null;

    for (let i = 0; i < drawCount; i++) {
      if (this.deck.length === 0) {
        this.endGame(null, 'draw');
        break;
      }

      const deckRemaining = this.deck.length;
      if (!this.events.emit('before_draw', { player, deckRemaining, fromSkill: true })) {
        break;
      }

      const tile = this.deck.pop()!;
      hand.push(tile);
      drawnTiles.push({ ...tile });

      this.events.emit('after_draw', {
        player,
        tile,
        deckRemaining: this.deck.length,
        fromSkill: true,
      });

      if (this.tryHu(player, tile, true)) {
        break;
      }
    }

    this.events.emit('skill_used', {
      player,
      skillId: CANT_READ_SKILL_ID,
      skillName: CANT_READ_SKILL_NAME,
      tile: discardedTiles[0],
      discardedTiles,
      drawnTiles,
    });

    if (this.phase === 'game_over') {
      return true;
    }

    this.turnNumber += 1;
    this.advanceToNextDraw(player);
    return true;
  }

  private resolveSplitTilePick(params: {
    tileId?: string;
    splitRanks?: [number, number];
  }): boolean {
    this.assertPhase('discard');
    this.assertCurrentActor();

    const player = this.currentPlayer;
    if (!isHeiPiTiYuSheng(this.playerCharacters[player])) {
      throw new Error('该角色无法使用此技能');
    }

    const mode = this.skillMode;
    if (!mode || mode.skillId !== SPLIT_TILE_SKILL_ID) {
      throw new Error('当前未在掰牌技能中');
    }

    if (mode.step === 'pick_source') {
      if (!params.tileId) throw new Error('请选择要掰开的牌');
      const hand = this.players[player].hand;
      const sourceTile = hand.find((t) => t.id === params.tileId);
      if (!sourceTile || !isSplittableTile(sourceTile)) {
        throw new Error('只能选择筒牌或条牌且点数至少为 2');
      }

      const pairs = getSplitPairs(sourceTile.rank);
      if (pairs.length === 0) {
        throw new Error('该牌无法掰开');
      }

      if (pairs.length === 1) {
        const { rankA, rankB } = pairs[0];
        this.skillMode = {
          skillId: SPLIT_TILE_SKILL_ID,
          step: 'pick_keep',
          sourceTileId: sourceTile.id,
          suit: sourceTile.suit as 'tong' | 'tiao',
          rankA,
          rankB,
          tileA: createSkillTile(sourceTile.suit, rankA),
          tileB: createSkillTile(sourceTile.suit, rankB),
        };
        this.events.emit('skill_pick_open', { player });
        return true;
      }

      this.skillMode = {
        skillId: SPLIT_TILE_SKILL_ID,
        step: 'pick_split',
        sourceTileId: sourceTile.id,
        suit: sourceTile.suit as 'tong' | 'tiao',
        rank: sourceTile.rank,
      };
      this.events.emit('skill_pick_open', { player });
      return true;
    }

    if (mode.step === 'pick_split') {
      if (!params.splitRanks) throw new Error('请选择拆分方式');
      const [rankA, rankB] = params.splitRanks;
      const valid = getSplitPairs(mode.rank).some(
        (p) =>
          (p.rankA === rankA && p.rankB === rankB) || (p.rankA === rankB && p.rankB === rankA),
      );
      if (!valid) throw new Error('无效的拆分方式');

      this.skillMode = {
        skillId: SPLIT_TILE_SKILL_ID,
        step: 'pick_keep',
        sourceTileId: mode.sourceTileId,
        suit: mode.suit,
        rankA,
        rankB,
        tileA: createSkillTile(mode.suit, rankA),
        tileB: createSkillTile(mode.suit, rankB),
      };
      this.events.emit('skill_pick_open', { player });
      return true;
    }

    if (mode.step === 'pick_keep') {
      if (!params.tileId) throw new Error('请选择要保留的牌');
      const kept =
        params.tileId === mode.tileA.id
          ? mode.tileA
          : params.tileId === mode.tileB.id
            ? mode.tileB
            : null;
      if (!kept) throw new Error('请选择拆分后的其中一张牌');

      const discarded = kept.id === mode.tileA.id ? mode.tileB : mode.tileA;
      const hand = this.players[player].hand;
      const sourceIdx = hand.findIndex((t) => t.id === mode.sourceTileId);
      if (sourceIdx === -1) throw new Error('原牌不在手牌中');

      const sourceTile = hand.splice(sourceIdx, 1)[0];
      hand.push({ ...kept });
      this.players[player].discards.push({ ...discarded });

      this.skillUses[player] += 1;
      this.skillMode = null;

      this.events.emit('skill_used', {
        player,
        skillId: SPLIT_TILE_SKILL_ID,
        skillName: SPLIT_TILE_SKILL_NAME,
        tile: { ...kept },
        sourceTile: { ...sourceTile },
        discardedTile: { ...discarded },
        usesRemaining: SPLIT_TILE_MAX_USES - this.skillUses[player],
      });

      if (this.tryHu(player, kept, true)) {
        return true;
      }

      return true;
    }

    return false;
  }

  private executeWallDraw(): Tile | null {
    if (this.deck.length === 0) {
      this.endGame(null, 'draw');
      return null;
    }

    const player = this.currentPlayer;
    const deckRemaining = this.deck.length;

    if (!this.events.emit('before_draw', { player, deckRemaining, fromSkill: false })) {
      return null;
    }

    const tile = this.deck.pop()!;
    this.players[player].hand.push(tile);

    if (this.tryHu(player, tile, true)) {
      this.events.emit('after_draw', {
        player,
        tile,
        deckRemaining: this.deck.length,
        fromSkill: false,
      });
      return tile;
    }

    this.setPhase('discard');
    this.events.emit('after_draw', {
      player,
      tile,
      deckRemaining: this.deck.length,
      fromSkill: false,
    });
    return tile;
  }

  private enterDrawPhase(): void {
    const player = this.currentPlayer;
    resetBorrowTileTurnUsage(this.skillUses, this.playerCharacters, player);
    const snapshot = this.getSnapshot();

    if (
      canPlayerUseLetMeDrawSkill(snapshot, player) ||
      canPlayerUseCantReadSkill(snapshot, player) ||
      isDuiKangLuGaluo(this.playerCharacters[player])
    ) {
      this.drawMode = 'choose';
    } else {
      this.drawMode = null;
    }

    this.setPhase('draw');

    if (this.drawMode === 'choose') {
      this.events.emit('draw_choice_open', { player });
    }
  }

  // ── 出牌 ────────────────────────────────────────────────────

  /** 暗杠：手牌四张相同牌亮杠并补摸一张，随后仍需出牌 */
  declareConcealedKong(tile: Pick<Tile, 'suit' | 'rank'>): boolean {
    this.assertPhase('discard');
    if (this.skillMode !== null) {
      throw new Error('请先完成技能选择');
    }

    const player = this.currentPlayer;
    const meld = this.applyConcealedKong(player, tile);

    this.events.emit('after_response', {
      player,
      action: 'kong',
      meld,
      won: false,
    });

    const hand = this.players[player].hand;
    const lastTile = hand[hand.length - 1];
    if (lastTile && this.tryHu(player, lastTile, true)) {
      return true;
    }

    return true;
  }

  discardCard(tileId: string): Tile | null {
    this.assertPhase('discard');

    if (this.skillMode !== null) {
      throw new Error('请先完成技能选择');
    }

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
    resetBorrowTileTurnUsage(this.skillUses, this.playerCharacters, player);
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

    if (this.lastDiscard.noResponse) {
      this.advanceToNextDraw(this.lastDiscard.from);
      return;
    }

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
    if (this.blackHandTarget === afterPlayer) {
      this.clearBlackHand();
    }

    this.currentPlayer = nextPlayer(afterPlayer);
    this.events.emit('turn_change', {
      player: this.currentPlayer,
      turnNumber: this.turnNumber,
    });
    this.enterDrawPhase();
  }

  private endGame(winner: PlayerIndex | null, reason: GameOverReason): void {
    this.winner = winner;
    this.gameOverReason = reason;
    if (reason !== 'hu') {
      this.winInfo = null;
    }
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

  private applyConcealedKong(player: PlayerIndex, tile: Pick<Tile, 'suit' | 'rank'>): Meld {
    const hand = this.players[player].hand;
    const matches = hand.filter((t) => tilesEqual(t, tile));
    if (matches.length < 4) {
      throw new Error('需要手牌中有四张相同的牌才能暗杠');
    }

    const kongTiles = matches.slice(0, 4).map((t) => ({ ...t }));
    for (const t of matches.slice(0, 4)) {
      hand.splice(
        hand.findIndex((h) => h.id === t.id),
        1,
      );
    }

    const meld: Meld = {
      type: 'kong',
      tiles: kongTiles,
    };
    this.players[player].melds.push(meld);
    this.supplementAfterKong(player);
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

  private clearBlackHand(): void {
    this.blackHandTarget = null;
    this.blackHandOwner = null;
    this.blackHandJudgmentPending = false;
  }

  // ── 胡牌（占位）────────────────────────────────────────────

  private finalizeHu(player: PlayerIndex, tile: Tile, isSelfDraw: boolean): boolean {
    this.winInfo = { tile: { ...tile }, isSelfDraw };
    this.events.emit('after_hu', { player, tile, isSelfDraw });
    this.events.emit('after_response', {
      player,
      action: 'hu',
      won: true,
    });
    this.closeResponseWindow(true);
    this.clearBlackHand();
    this.endGame(player, 'hu');
    return true;
  }

  private finalizeStealWin(
    owner: PlayerIndex,
    originalWinner: PlayerIndex,
    tile: Tile,
    isSelfDraw: boolean,
    judgmentTile: Tile,
  ): boolean {
    this.winInfo = null;
    this.events.emit('after_hu', { player: originalWinner, tile, isSelfDraw });
    this.events.emit('after_response', {
      player: originalWinner,
      action: 'hu',
      won: true,
    });
    this.events.emit('skill_used', {
      player: owner,
      skillId: STEAL_VICTORY_SKILL_ID,
      skillName: STEAL_VICTORY_SKILL_NAME,
      tile: { ...judgmentTile },
    });
    this.closeResponseWindow(true);
    this.clearBlackHand();
    this.endGame(owner, 'skill_steal');
    return true;
  }

  private tryHu(player: PlayerIndex, tile: Tile, isSelfDraw: boolean): boolean {
    const state = this.players[player];

    if (!this.events.emit('before_hu', { player, tile, isSelfDraw })) {
      return false;
    }

    if (!canWin(state.hand, state.melds, tile, this.wildcard)) {
      return false;
    }

    if (
      this.blackHandTarget === player &&
      this.blackHandOwner !== null &&
      this.currentPlayer === player
    ) {
      this.blackHandJudgmentPending = true;

      if (this.deck.length === 0) {
        return this.finalizeHu(player, tile, isSelfDraw);
      }

      const judgmentTile = this.deck.pop()!;

      if (isBlackHandJudgmentHonorTile(judgmentTile)) {
        return this.finalizeHu(player, tile, isSelfDraw);
      }

      return this.finalizeStealWin(this.blackHandOwner, player, tile, isSelfDraw, judgmentTile);
    }

    return this.finalizeHu(player, tile, isSelfDraw);
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
