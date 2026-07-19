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

/** 摸牌阶段：choose=可选技能或牌墙 */
export type DrawMode = 'choose';

export type SkillMode =
  | {
      skillId: 'let_me_draw';
      step: 'pick_discard';
    }
  | {
      skillId: 'cant_read';
      step: 'confirm';
    }
  | {
      skillId: 'instant_win_vote';
      step: 'confirm';
    }
  | {
      skillId: 'instant_win_vote';
      step: 'vote';
      votes: [
        SkillVoteChoice | null,
        SkillVoteChoice | null,
        SkillVoteChoice | null,
        SkillVoteChoice | null,
      ];
    }
  | {
      skillId: 'split_tile';
      step: 'pick_source';
    }
  | {
      skillId: 'split_tile';
      step: 'pick_split';
      sourceTileId: string;
      suit: 'tong' | 'tiao';
      rank: number;
    }
  | {
      skillId: 'split_tile';
      step: 'pick_keep';
      sourceTileId: string;
      suit: 'tong' | 'tiao';
      rankA: number;
      rankB: number;
      tileA: Tile;
      tileB: Tile;
    }
  | {
      skillId: 'steal_victory';
      step: 'pick_target';
    }
  | {
      skillId: 'vegetable_juice_caishen';
      step: 'pick_hand';
    }
  | {
      skillId: 'borrow_tile';
      step: 'pick_hand';
    }
  | {
      skillId: 'borrow_tile';
      step: 'pick_target';
      sourceTileId: string;
    }
  | {
      skillId: 'wen_qu_descends';
      step: 'pick_hand';
    }
  | {
      skillId: 'wen_qu_descends';
      step: 'pick_wan_rank';
      sourceTileId: string;
    };

export interface LastDiscard {
  tile: Tile;
  from: PlayerIndex;
  /** 技能弃牌等：不可被吃碰响应 */
  noResponse?: boolean;
}

export type ResponseAction = 'chi' | 'pong' | 'kong' | 'hu' | 'pass';

export interface ResponseOption {
  player: PlayerIndex;
  action: Exclude<ResponseAction, 'pass'>;
  /** 吃牌时需要的组合（从手牌中选 2 张） */
  chiTiles?: [Tile, Tile];
}

/** 投票型技能：同意 / 拒绝 */
export type SkillVoteChoice = 'agree' | 'reject';

export interface SkillVoteStatus {
  player: PlayerIndex;
  choice: SkillVoteChoice | 'pending';
}

export type GameOverReason = 'hu' | 'draw' | 'abort' | 'skill_vote' | 'skill_steal';

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

export interface SkillViewState {
  characterId: string;
  skillId: string;
  skillName: string;
  skillDescription: string;
  usesRemaining: number;
  maxUses: number;
  /** 是否为限定技（显示剩余次数） */
  limited: boolean;
  /** 摸牌阶段可发动（手短者）或出牌阶段可发动（体育生） */
  canActivate: boolean;
  /** 技能所属阶段 */
  activatePhase: 'draw' | 'discard';
}

export type SkillActivityStep =
  | 'pick_discard'
  | 'pick_source'
  | 'pick_split'
  | 'pick_keep'
  | 'confirm'
  | 'vote'
  | 'pick_target'
  | 'pick_hand'
  | 'pick_wan_rank';

export interface SkillSplitOption {
  rankA: number;
  rankB: number;
}

/** 技能发动中（所有玩家可见；选牌内容仅发动者可见） */
export interface SkillActivityView {
  player: PlayerIndex;
  characterId: string;
  characterName: string;
  skillId: string;
  skillName: string;
  step: SkillActivityStep;
  pickableDiscards?: Tile[];
  pickableHandTiles?: Tile[];
  splitOptions?: SkillSplitOption[];
  sourceTile?: Tile;
  splitTiles?: [Tile, Tile];
  /** 确认型技能预览（如丢弃字牌） */
  previewTiles?: Tile[];
  drawPreviewCount?: number;
  votePrompt?: string;
  voteStatus?: SkillVoteStatus[];
  canVote?: boolean;
  /** 黑手技能：可选目标座位（仅发动者可见） */
  pickableTargets?: PlayerIndex[];
  /** 万能牌替换技能提示 */
  wildcardPrompt?: string;
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
  wildcard: WildcardConfig | null;
  playerCharacters: [string, string, string, string];
  skillUses: [number, number, number, number];
  drawMode: DrawMode | null;
  skillMode: SkillMode | null;
  /** 黑手标记目标；完整状态仅服务端持有，按视角过滤后下发 */
  blackHandTarget: PlayerIndex | null;
  blackHandOwner: PlayerIndex | null;
  gameOverReason: GameOverReason | null;
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
  playerCharacters: [string, string, string, string];
  skillUses: [number, number, number, number];
  /** 摸牌阶段：choose=可选技能或牌墙 */
  drawMode: DrawMode | null;
  /** 是否有技能交互进行中 */
  skillModeActive: boolean;
  /** 联机：服务端下发的技能步骤详情，供客户端重建 skillActivity */
  skillMode: SkillMode | null;
  skill: SkillViewState | null;
  /** 有玩家正在发动技能并选择效果时为非 null */
  skillActivity: SkillActivityView | null;
  /** 仅零食大总统视角可见：当前黑手标记的玩家 */
  blackHandTarget: PlayerIndex | null;
  gameOverReason: GameOverReason | null;
}
