/** 万 / 筒 / 条 / 风 / 箭 */
export type Suit = 'wan' | 'tong' | 'tiao' | 'feng' | 'dragon';

export type PlayerIndex = 0 | 1 | 2 | 3;

export interface Tile {
  /** 全局唯一 ID，便于 UI 与事件追踪 */
  id: string;
  suit: Suit;
  /** 1-9 for 数牌；风牌 1-4；箭牌 1-3 */
  rank: number;
}

export type MeldType = 'chi' | 'pong' | 'kong';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  /** 鸣牌来源玩家（吃碰杠时） */
  fromPlayer?: PlayerIndex;
}

export interface PlayerState {
  hand: Tile[];
  discards: Tile[];
  melds: Meld[];
}

/**
 * 状态机阶段
 *
 * idle      → 未开局
 * dealing   → 发牌中（瞬时）
 * draw      → 当前玩家摸牌
 * discard   → 当前玩家出牌
 * response  → 等待其他玩家吃/碰/杠/胡
 * game_over → 对局结束
 */
export type GamePhase =
  | 'idle'
  | 'dealing'
  | 'draw'
  | 'discard'
  | 'response'
  | 'game_over';

export interface LastDiscard {
  tile: Tile;
  from: PlayerIndex;
}

export type ResponseAction = 'chi' | 'pong' | 'kong' | 'hu' | 'pass';

export interface ResponseOption {
  player: PlayerIndex;
  action: Exclude<ResponseAction, 'pass'>;
  /** 吃牌时需要的组合（从手牌中选 2 张） */
  chiTiles?: [Tile, Tile];
}

export interface WildcardConfig {
  /** 发牌后从牌墙首张翻出的指示牌 */
  indicator: Tile;
  /** 由翻牌决定的赖子牌型 */
  wildcardType: Pick<Tile, 'suit' | 'rank'>;
}

/** 胡牌结算信息（game_over 且 reason 为 hu 时有效） */
export interface WinInfo {
  tile: Tile;
  isSelfDraw: boolean;
}

export interface GameSnapshot {
  phase: GamePhase;
  currentPlayer: PlayerIndex;
  dealer: PlayerIndex;
  deck: Tile[];
  players: [PlayerState, PlayerState, PlayerState, PlayerState];
  lastDiscard: LastDiscard | null;
  pendingResponses: ResponseOption[];
  /** 当前响应优先级（胡/杠/碰/吃） */
  responseLevel: Exclude<ResponseAction, 'pass'> | null;
  turnNumber: number;
  winner: PlayerIndex | null;
  /** 胡牌时的进张；流局/中止时为 null */
  winInfo: WinInfo | null;
  /** 万能牌配置；发牌后翻首张牌确定 */
  wildcard: WildcardConfig | null;
}

/** 联机：他人手牌仅可见张数 */
export interface HiddenHandView {
  kind: 'hidden';
  count: number;
}

/** 联机：己方手牌完整可见 */
export interface VisibleHandView {
  kind: 'visible';
  tiles: Tile[];
}

export type HandView = HiddenHandView | VisibleHandView;

/** 联机：单个玩家的公开/私有状态 */
export interface PlayerStateView {
  hand: HandView;
  discards: Tile[];
  melds: Meld[];
}

/**
 * 联机视角快照：不含牌墙明细、不含他人手牌
 * @see MahjongGame.getSnapshotForPlayer
 */
export interface PlayerView {
  viewer: PlayerIndex;
  phase: GamePhase;
  currentPlayer: PlayerIndex;
  dealer: PlayerIndex;
  deckCount: number;
  players: [PlayerStateView, PlayerStateView, PlayerStateView, PlayerStateView];
  lastDiscard: LastDiscard | null;
  /** 仅包含 viewer 可执行的响应选项 */
  pendingResponses: ResponseOption[];
  responseLevel: Exclude<ResponseAction, 'pass'> | null;
  turnNumber: number;
  winner: PlayerIndex | null;
  winInfo: WinInfo | null;
  wildcard: WildcardConfig | null;
}
