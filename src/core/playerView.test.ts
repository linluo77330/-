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
});
