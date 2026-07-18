import type {
  GamePhase,
  LastDiscard,
  Meld,
  PlayerIndex,
  ResponseAction,
  ResponseOption,
  Tile,
  WildcardConfig,
} from './types.js';

/** before_* 监听器返回 false 可取消该动作（预留技能拦截点） */
export type BeforeHookResult = void | boolean;

export interface GameEventMap {
  // ── 生命周期 ──
  game_start: { dealer: PlayerIndex };
  wildcard_reveal: { indicator: Tile; wildcard: WildcardConfig };
  game_over: { winner: PlayerIndex | null; reason: import('./types.js').GameOverReason };
  phase_change: { from: GamePhase; to: GamePhase };
  turn_change: { player: PlayerIndex; turnNumber: number };

  // ── 摸牌 ──
  before_draw: { player: PlayerIndex; deckRemaining: number; fromSkill?: boolean };
  after_draw: { player: PlayerIndex; tile: Tile; deckRemaining: number; fromSkill?: boolean };
  draw_choice_open: { player: PlayerIndex };
  skill_pick_open: { player: PlayerIndex };
  skill_used: {
    player: PlayerIndex;
    skillId: string;
    skillName: string;
    tile: Tile;
    sourceTile?: Tile;
    discardedTile?: Tile;
    discardedTiles?: Tile[];
    drawnTiles?: Tile[];
    usesRemaining?: number;
    votePassed?: boolean;
  };

  skill_vote_open: { initiator: PlayerIndex };
  skill_vote_cast: { initiator: PlayerIndex; voter: PlayerIndex; agree: boolean };
  skill_vote_failed: { initiator: PlayerIndex; rejectedBy: PlayerIndex };

  // ── 出牌 ──
  before_discard: { player: PlayerIndex; tile: Tile };
  after_discard: { player: PlayerIndex; tile: Tile; lastDiscard: LastDiscard };

  // ── 响应（吃碰杠胡）──
  before_response: {
    player: PlayerIndex;
    action: Exclude<ResponseAction, 'pass'>;
    tile: Tile;
    from: PlayerIndex;
  };
  after_response: {
    player: PlayerIndex;
    action: Exclude<ResponseAction, 'pass'>;
    meld?: Meld;
    won: boolean;
  };
  response_pass: { player: PlayerIndex };
  response_window_open: {
    lastDiscard: LastDiscard;
    options: ResponseOption[];
  };
  response_level_change: {
    level: Exclude<ResponseAction, 'pass'>;
    options: ResponseOption[];
  };
  response_window_close: { claimed: boolean };

  // ── 胡牌（占位，后续扩展番型计算）──
  before_hu: { player: PlayerIndex; tile: Tile; isSelfDraw: boolean };
  after_hu: { player: PlayerIndex; tile: Tile; isSelfDraw: boolean };

  // ── 技能系统预留 ──
  /** 角色技能注册后可监听此事件做 UI 提示 */
  skill_hook: { hook: string; payload: Record<string, unknown> };
}

export type GameEventName = keyof GameEventMap;

export type GameEventListener<K extends GameEventName> = (
  payload: GameEventMap[K],
) => BeforeHookResult | Promise<BeforeHookResult>;
