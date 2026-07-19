import { describe, expect, it } from 'vitest';
import {
  applyHpChanges,
  beginNextRound,
  computeHpChanges,
  createInitialMatchState,
  isMatchFinished,
  processRoundEnd,
} from './matchState.js';

describe('matchState', () => {
  const base = createInitialMatchState([3, 3, 3, 3], 1);

  it('自摸：其余三人各扣 1 生命', () => {
    const changes = computeHpChanges(0, 'self_draw', null, null);
    expect(changes).toHaveLength(3);
    expect(changes.map((c) => c.player).sort()).toEqual([1, 2, 3]);
  });

  it('点炮：仅放铳者扣 1 生命', () => {
    const changes = computeHpChanges(1, 'deal_in', 0, null);
    expect(changes).toEqual([{ player: 0, delta: -1, reason: 'deal_in' }]);
  });

  it('三名玩家淘汰后剩 1 人，整场结束', () => {
    let state = base;
    for (const p of [0, 1, 2] as const) {
      state = applyHpChanges(state, [{ player: p, delta: -3, reason: 'self_draw' }]);
    }
    expect(isMatchFinished(state)).toBe(true);
    expect(state.eliminated.slice(0, 3)).toEqual([true, true, true]);
  });

  it('小局结束后进入间歇并记录摘要', () => {
    const after = processRoundEnd(base, {
      winner: 0,
      gameOverReason: 'hu',
      winInfo: { tile: { id: 't1', suit: 'wan', rank: 1 }, isSelfDraw: true },
      lastDiscardFrom: null,
      stealTarget: null,
    });
    expect(after.matchPhase).toBe('round_intermission');
    expect(after.lastRoundSummary?.winType).toBe('self_draw');
    expect(after.hp).toEqual([3, 2, 2, 2]);
    expect(after.nextRoundAt).not.toBeNull();
  });

  it('存活目标 3 人：一局内淘汰至剩 2 人，整场结束', () => {
    const state = createInitialMatchState([3, 1, 1, 3], 3);
    const after = processRoundEnd(state, {
      winner: 0,
      gameOverReason: 'hu',
      winInfo: { tile: { id: 't1', suit: 'wan', rank: 1 }, isSelfDraw: true },
      lastDiscardFrom: null,
      stealTarget: null,
    });
    expect(after.matchPhase).toBe('match_over');
    expect(after.matchWinners.sort()).toEqual([0, 3]);
    expect(after.eliminated).toEqual([false, true, true, false]);
  });

  it('存活目标 3 人：剩 3 人时整场结束', () => {
    const state = createInitialMatchState([3, 3, 3, 1], 3);
    const after = processRoundEnd(state, {
      winner: 0,
      gameOverReason: 'hu',
      winInfo: { tile: { id: 't1', suit: 'wan', rank: 1 }, isSelfDraw: true },
      lastDiscardFrom: null,
      stealTarget: null,
    });
    expect(after.matchPhase).toBe('match_over');
    expect(after.matchWinners.sort()).toEqual([0, 1, 2]);
  });

  it('beginNextRound 轮换庄家', () => {
    const intermission = processRoundEnd(base, {
      winner: 0,
      gameOverReason: 'hu',
      winInfo: { tile: { id: 't1', suit: 'wan', rank: 1 }, isSelfDraw: true },
      lastDiscardFrom: null,
      stealTarget: null,
    });
    const next = beginNextRound(intermission);
    expect(next.roundNumber).toBe(2);
    expect(next.dealer).toBe(1);
    expect(next.matchPhase).toBe('playing');
  });
});
