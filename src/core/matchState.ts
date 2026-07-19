import type { GameOverReason, PlayerIndex, WinInfo, MatchViewState } from './types.js';

export type RoundWinType = 'self_draw' | 'deal_in' | 'skill_vote' | 'skill_steal' | 'draw' | 'none';

export type HpChangeReason = 'self_draw' | 'deal_in' | 'skill_vote' | 'skill_steal';

export interface HpChangeEntry {
  player: PlayerIndex;
  delta: number;
  reason: HpChangeReason;
}

export interface RoundSummary {
  roundNumber: number;
  winner: PlayerIndex | null;
  winType: RoundWinType;
  /** 点炮者（仅 deal_in） */
  discarder: PlayerIndex | null;
  hpChanges: HpChangeEntry[];
}

export type MatchPhase = 'playing' | 'round_intermission' | 'match_over';

export interface MatchState {
  hp: [number, number, number, number];
  maxHp: [number, number, number, number];
  eliminated: [boolean, boolean, boolean, boolean];
  /** 场上剩余 Y 名玩家时结束整场对局 */
  survivorsToWin: number;
  roundNumber: number;
  dealer: PlayerIndex;
  matchPhase: MatchPhase;
  lastRoundSummary: RoundSummary | null;
  matchWinners: PlayerIndex[];
  /** 下一局自动开始的时间戳（毫秒），仅 round_intermission */
  nextRoundAt: number | null;
}

export const ROUND_INTERMISSION_MS = 5000;

export const DEFAULT_SURVIVORS_TO_WIN = 1;

export function getCharacterMaxHp(_characterId: string): number {
  return 3;
}

export function createInitialMatchState(
  maxHpByPlayer: [number, number, number, number],
  survivorsToWin: number,
): MatchState {
  const y = Math.max(1, Math.min(4, survivorsToWin));
  return {
    hp: [...maxHpByPlayer] as MatchState['hp'],
    maxHp: [...maxHpByPlayer] as MatchState['maxHp'],
    eliminated: [false, false, false, false],
    survivorsToWin: y,
    roundNumber: 1,
    dealer: 0,
    matchPhase: 'playing',
    lastRoundSummary: null,
    matchWinners: [],
    nextRoundAt: null,
  };
}

export function buildMaxHpFromCharacters(
  playerCharacters: [string, string, string, string],
  getMaxHp: (characterId: string) => number = getCharacterMaxHp,
): [number, number, number, number] {
  return playerCharacters.map((id) => Math.max(1, getMaxHp(id))) as [
    number,
    number,
    number,
    number,
  ];
}

export function countAlive(state: MatchState): number {
  return state.eliminated.filter((e) => !e).length;
}

export function getAlivePlayers(state: MatchState): PlayerIndex[] {
  return ([0, 1, 2, 3] as PlayerIndex[]).filter((p) => !state.eliminated[p]);
}

export function isPlayerActive(state: MatchState, player: PlayerIndex): boolean {
  return !state.eliminated[player];
}

export function activePlayersMask(state: MatchState): [boolean, boolean, boolean, boolean] {
  return state.eliminated.map((e) => !e) as [boolean, boolean, boolean, boolean];
}

export function resolveRoundWinType(
  reason: GameOverReason | null,
  winInfo: WinInfo | null,
): RoundWinType {
  if (reason === 'hu' && winInfo) {
    return winInfo.isSelfDraw ? 'self_draw' : 'deal_in';
  }
  if (reason === 'skill_vote') return 'skill_vote';
  if (reason === 'skill_steal') return 'skill_steal';
  if (reason === 'draw') return 'draw';
  return 'none';
}

export function computeHpChanges(
  winner: PlayerIndex | null,
  winType: RoundWinType,
  discarder: PlayerIndex | null,
  stealTarget: PlayerIndex | null,
): HpChangeEntry[] {
  if (winner === null || winType === 'draw' || winType === 'none') {
    return [];
  }

  const changes: HpChangeEntry[] = [];

  if (winType === 'self_draw' || winType === 'skill_vote') {
    for (const p of [0, 1, 2, 3] as PlayerIndex[]) {
      if (p === winner) continue;
      changes.push({ player: p, delta: -1, reason: winType });
    }
    return changes;
  }

  if (winType === 'deal_in' && discarder !== null) {
    changes.push({ player: discarder, delta: -1, reason: 'deal_in' });
    return changes;
  }

  if (winType === 'skill_steal' && stealTarget !== null) {
    changes.push({ player: stealTarget, delta: -1, reason: 'skill_steal' });
    return changes;
  }

  return changes;
}

export function applyHpChanges(state: MatchState, changes: HpChangeEntry[]): MatchState {
  const hp = [...state.hp] as MatchState['hp'];
  const eliminated = [...state.eliminated] as MatchState['eliminated'];

  for (const change of changes) {
    if (eliminated[change.player]) continue;
    hp[change.player] = Math.max(0, hp[change.player] + change.delta);
    if (hp[change.player] === 0) {
      eliminated[change.player] = true;
    }
  }

  return { ...state, hp, eliminated };
}

export function isMatchFinished(state: MatchState): boolean {
  return countAlive(state) <= state.survivorsToWin;
}

export function getMatchWinners(state: MatchState): PlayerIndex[] {
  return getAlivePlayers(state);
}

export function getNextDealer(state: MatchState, lastDealer: PlayerIndex): PlayerIndex {
  let p = lastDealer;
  for (let i = 0; i < 4; i++) {
    p = ((p + 1) % 4) as PlayerIndex;
    if (!state.eliminated[p]) return p;
  }
  return lastDealer;
}

export interface RoundEndInput {
  winner: PlayerIndex | null;
  gameOverReason: GameOverReason | null;
  winInfo: WinInfo | null;
  lastDiscardFrom: PlayerIndex | null;
  stealTarget: PlayerIndex | null;
}

export function processRoundEnd(state: MatchState, input: RoundEndInput): MatchState {
  const winType = resolveRoundWinType(input.gameOverReason, input.winInfo);
  const discarder =
    winType === 'deal_in' && input.lastDiscardFrom !== null ? input.lastDiscardFrom : null;
  const hpChanges = computeHpChanges(input.winner, winType, discarder, input.stealTarget);

  const afterHp = applyHpChanges(state, hpChanges);
  const summary: RoundSummary = {
    roundNumber: state.roundNumber,
    winner: input.winner,
    winType,
    discarder,
    hpChanges,
  };

  let next: MatchState = {
    ...afterHp,
    lastRoundSummary: summary,
    nextRoundAt: null,
  };

  if (isMatchFinished(next)) {
    return {
      ...next,
      matchPhase: 'match_over',
      matchWinners: getMatchWinners(next),
    };
  }

  return {
    ...next,
    matchPhase: 'round_intermission',
    nextRoundAt: Date.now() + ROUND_INTERMISSION_MS,
  };
}

export function beginNextRound(state: MatchState): MatchState {
  if (isMatchFinished(state)) {
    return {
      ...state,
      matchPhase: 'match_over',
      matchWinners: getMatchWinners(state),
      nextRoundAt: null,
    };
  }

  const dealer = getNextDealer(state, state.dealer);
  return {
    ...state,
    roundNumber: state.roundNumber + 1,
    dealer,
    matchPhase: 'playing',
    lastRoundSummary: state.lastRoundSummary,
    nextRoundAt: null,
  };
}

export function toMatchViewState(state: MatchState, now = Date.now()): MatchViewState {
  const countdown =
    state.matchPhase === 'round_intermission' && state.nextRoundAt !== null
      ? Math.max(0, Math.ceil((state.nextRoundAt - now) / 1000))
      : null;

  return {
    hp: state.hp,
    maxHp: state.maxHp,
    eliminated: state.eliminated,
    survivorsToWin: state.survivorsToWin,
    roundNumber: state.roundNumber,
    matchPhase: state.matchPhase,
    lastRoundSummary: state.lastRoundSummary,
    matchWinners: state.matchWinners,
    nextRoundCountdown: countdown,
    nextRoundAt: state.nextRoundAt,
    dealer: state.dealer,
  };
}
