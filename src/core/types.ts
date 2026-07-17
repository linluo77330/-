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
}
