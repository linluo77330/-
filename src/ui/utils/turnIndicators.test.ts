import { describe, expect, it } from 'vitest';
import type { PlayerView } from '@/core/types';
import {
  createDiscardSegment,
  getSeatTurnIndicator,
  type DiscardDisplaySegment,
} from './turnIndicators.js';

function tile(id: string) {
  return { id, suit: 'wan' as const, rank: 1 };
}

function baseView(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    viewer: 0,
    phase: 'discard',
    currentPlayer: 1,
    dealer: 0,
    deckCount: 50,
    players: [
      { hand: { kind: 'visible', tiles: [] }, discards: [tile('h1')], melds: [] },
      { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
    ],
    lastDiscard: null,
    pendingResponses: [],
    responseLevel: null,
    turnNumber: 1,
    winner: null,
    winInfo: null,
    wildcard: null,
    playerCharacters: ['', '', '', ''],
    skillUses: [0, 0, 0, 0],
    drawMode: null,
    skillModeActive: false,
    skillMode: null,
    skill: null,
    skillActivity: null,
    blackHandTarget: null,
    gameOverReason: null,
    ...overrides,
  } as PlayerView;
}

describe('turnIndicators segment display', () => {
  it('视角玩家刚出牌后仅自己显示打出', () => {
    const view = baseView({
      phase: 'response',
      lastDiscard: { from: 0, tile: tile('h1') },
    });
    const segment = createDiscardSegment(view, 0)!;

    expect(getSeatTurnIndicator(view, 0, [], segment, 0)?.label).toBe('打出');
    expect(getSeatTurnIndicator(view, 1, [], segment, 0)).toBeNull();
  });

  it('其他玩家出牌后显示各自打出的牌', () => {
    const segment: DiscardDisplaySegment = {
      baselineCounts: [1, 0, 0, 0],
      viewerDiscardTileId: 'h1',
    };
    const view = baseView({
      currentPlayer: 3,
      players: [
        { hand: { kind: 'visible', tiles: [] }, discards: [tile('h1')], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [tile('p1')], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      ],
    });

    expect(getSeatTurnIndicator(view, 0, [], segment, 0)?.label).toBe('打出');
    expect(getSeatTurnIndicator(view, 1, [], segment, 0)?.tile?.id).toBe('p1');
    expect(getSeatTurnIndicator(view, 2, [], segment, 0)).toBeNull();
  });

  it('轮到出牌时高亮当前玩家而非展示牌', () => {
    const segment: DiscardDisplaySegment = {
      baselineCounts: [1, 0, 0, 0],
      viewerDiscardTileId: 'h1',
    };
    const view = baseView({
      phase: 'discard',
      currentPlayer: 0,
      players: [
        { hand: { kind: 'visible', tiles: [] }, discards: [tile('h1')], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [tile('p1')], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [tile('p2')], melds: [] },
        { hand: { kind: 'hidden', count: 13 }, discards: [], melds: [] },
      ],
    });

    expect(getSeatTurnIndicator(view, 0, [], segment, 0)?.kind).toBe('action');
    expect(getSeatTurnIndicator(view, 1, [], segment, 0)?.label).toBe('打出');
  });
});
