import { describe, expect, it } from 'vitest';
import type { GameSnapshot, Tile } from './types.js';
import { buildPlayerView, assertPlayerViewSafe } from './playerView.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

function baseSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    phase: 'game_over',
    currentPlayer: 0,
    dealer: 0,
    deck: [],
    players: [
      { hand: [t('wan', 1), t('wan', 2)], discards: [], melds: [] },
      { hand: [t('tong', 1), t('tong', 2), t('tong', 3)], discards: [], melds: [] },
      { hand: [t('tiao', 5)], discards: [], melds: [] },
      { hand: [t('feng', 1)], discards: [], melds: [] },
    ],
    lastDiscard: null,
    pendingResponses: [],
    responseLevel: null,
    turnNumber: 1,
    winner: 1,
    winInfo: { tile: t('tong', 4), isSelfDraw: false },
    wildcard: null,
    playerCharacters: ['', 'shou_duan_zhe', '', ''],
    skillUses: [0, 0, 0, 0],
    drawMode: null,
    skillMode: null,
    gameOverReason: null,
    ...overrides,
  };
}

describe('buildPlayerView winner reveal', () => {
  it('胡牌后向所有视角公开赢家手牌', () => {
    const snapshot = baseSnapshot();
    const view = buildPlayerView(snapshot, 0);

    expect(view.players[1].hand.kind).toBe('visible');
    if (view.players[1].hand.kind === 'visible') {
      expect(view.players[1].hand.tiles).toHaveLength(3);
    }
    expect(view.players[2].hand.kind).toBe('hidden');
    assertPlayerViewSafe(view);
  });

  it('非胡牌结束时不公开他人手牌', () => {
    const snapshot = baseSnapshot({ winner: null, winInfo: null, phase: 'game_over' });
    const view = buildPlayerView(snapshot, 0);

    expect(view.players[1].hand.kind).toBe('hidden');
  });

  it('技能选牌时向所有玩家展示发动信息，选牌列表仅发动者可见', () => {
    const discard = t('feng', 1);
    const snapshot = baseSnapshot({
      phase: 'draw',
      currentPlayer: 1,
      skillMode: { skillId: 'let_me_draw', step: 'pick_discard' },
      players: [
        { hand: [t('wan', 1)], discards: [], melds: [] },
        { hand: [t('tong', 1)], discards: [discard], melds: [] },
        { hand: [t('tiao', 5)], discards: [], melds: [] },
        { hand: [t('feng', 2)], discards: [], melds: [] },
      ],
    });

    const actorView = buildPlayerView(snapshot, 1);
    const observerView = buildPlayerView(snapshot, 0);

    expect(actorView.skillActivity?.skillName).toContain('让让我吧');
    expect(actorView.skillActivity?.pickableDiscards).toHaveLength(1);
    expect(observerView.skillActivity?.player).toBe(1);
    expect(observerView.skillActivity?.pickableDiscards).toHaveLength(0);
  });
});
