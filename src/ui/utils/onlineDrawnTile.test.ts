import { describe, expect, it } from 'vitest';
import type { PlayerView } from '@/core/types';
import { resolveOnlineDrawnTileId } from './onlineDrawnTile';

function baseView(overrides: Partial<PlayerView> = {}): PlayerView {
  return {
    viewer: 0,
    phase: 'discard',
    currentPlayer: 0,
    dealer: 0,
    deckCount: 50,
    players: [
      {
        hand: {
          kind: 'visible',
          tiles: [
            { id: 't1', suit: 'wan', rank: 1 },
            { id: 't2', suit: 'wan', rank: 2 },
            { id: 't-new', suit: 'wan', rank: 3 },
          ],
        },
        discards: [],
        melds: [],
      },
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
    match: null,
    lastDrawnTileId: null,
    ...overrides,
  };
}

describe('resolveOnlineDrawnTileId', () => {
  it('优先使用服务端 hint', () => {
    const result = resolveOnlineDrawnTileId(baseView(), 0, 't-new', ['t1', 't2']);
    expect(result.drawnId).toBe('t-new');
  });

  it('服务端无 hint 时通过手牌 diff 推断', () => {
    const result = resolveOnlineDrawnTileId(baseView(), 0, null, ['t1', 't2']);
    expect(result.drawnId).toBe('t-new');
  });

  it('首次同步不把手牌全量当作新摸牌', () => {
    const result = resolveOnlineDrawnTileId(baseView(), 0, null, []);
    expect(result.drawnId).toBeNull();
    expect(result.handIds).toEqual(['t1', 't2', 't-new']);
  });
});
