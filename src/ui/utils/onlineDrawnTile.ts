import type { PlayerIndex, PlayerView } from '@/core/types';

/** 联机：从服务端字段或手牌 diff 推断刚摸到的牌 id */
export function resolveOnlineDrawnTileId(
  view: PlayerView,
  viewer: PlayerIndex,
  serverHint: string | null,
  prevHandIds: readonly string[],
): { drawnId: string | null; handIds: string[] } {
  const hand = view.players[viewer]?.hand;
  if (hand?.kind !== 'visible') {
    return { drawnId: serverHint, handIds: [...prevHandIds] };
  }

  const handIds = hand.tiles.map((tile) => tile.id);
  let drawnId = serverHint;

  if (drawnId && !handIds.includes(drawnId)) {
    drawnId = null;
  }

  if (
    !drawnId &&
    prevHandIds.length > 0 &&
    view.phase === 'discard' &&
    view.currentPlayer === viewer &&
    handIds.length > prevHandIds.length
  ) {
    const added = handIds.filter((id) => !prevHandIds.includes(id));
    if (added.length > 0) {
      drawnId = added[added.length - 1] ?? null;
    }
  }

  return { drawnId, handIds };
}
