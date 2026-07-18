import type { HandView, PlayerStateView, Tile } from '@/core/types';

export function resolveHandTiles(hand: HandView): { tiles: Tile[]; faceDown: boolean } {
  if (hand.kind === 'visible') {
    const sorted = [...hand.tiles].sort((a, b) => {
      const suitOrder = { wan: 0, tong: 1, tiao: 2, feng: 3, dragon: 4 };
      const sd = suitOrder[a.suit] - suitOrder[b.suit];
      return sd !== 0 ? sd : a.rank - b.rank;
    });
    return { tiles: sorted, faceDown: false };
  }

  const tiles = Array.from({ length: hand.count }, (_, i) => ({
    id: `hidden-${i}`,
    suit: 'wan' as const,
    rank: 1,
  }));
  return { tiles, faceDown: true };
}

export function getVisibleHand(state: PlayerStateView): Tile[] | null {
  return state.hand.kind === 'visible' ? state.hand.tiles : null;
}
