import type { GameSnapshot, PlayerIndex, PlayerStateView, PlayerView } from './types.js';

function cloneMeld(meld: GameSnapshot['players'][0]['melds'][0]) {
  return {
    ...meld,
    tiles: meld.tiles.map((t) => ({ ...t })),
  };
}

function clonePlayerState(
  state: GameSnapshot['players'][0],
  viewer: PlayerIndex,
  playerIndex: PlayerIndex,
  snapshot: GameSnapshot,
): PlayerStateView {
  const revealWinnerHand =
    snapshot.phase === 'game_over' &&
    snapshot.winner === playerIndex &&
    snapshot.winInfo !== null;

  return {
    hand:
      playerIndex === viewer || revealWinnerHand
        ? { kind: 'visible', tiles: state.hand.map((t) => ({ ...t })) }
        : { kind: 'hidden', count: state.hand.length },
    discards: state.discards.map((t) => ({ ...t })),
    melds: state.melds.map(cloneMeld),
  };
}

/** 联机：按 viewer 隐藏他人手牌与牌墙 */
export function buildPlayerView(snapshot: GameSnapshot, viewer: PlayerIndex): PlayerView {
  const players = snapshot.players.map((state, i) =>
    clonePlayerState(state, viewer, i as PlayerIndex, snapshot),
  ) as PlayerView['players'];

  return {
    viewer,
    phase: snapshot.phase,
    currentPlayer: snapshot.currentPlayer,
    dealer: snapshot.dealer,
    deckCount: snapshot.deck.length,
    players,
    lastDiscard: snapshot.lastDiscard
      ? {
          from: snapshot.lastDiscard.from,
          tile: { ...snapshot.lastDiscard.tile },
        }
      : null,
    pendingResponses: snapshot.pendingResponses.filter((o) => o.player === viewer),
    responseLevel: snapshot.responseLevel,
    turnNumber: snapshot.turnNumber,
    winner: snapshot.winner,
    winInfo: snapshot.winInfo
      ? {
          tile: { ...snapshot.winInfo.tile },
          isSelfDraw: snapshot.winInfo.isSelfDraw,
        }
      : null,
    wildcard: snapshot.wildcard
      ? {
          indicator: { ...snapshot.wildcard.indicator },
          wildcardType: { ...snapshot.wildcard.wildcardType },
        }
      : null,
  };
}

/** 测试用：确保他人手牌未泄露 */
export function assertPlayerViewSafe(view: PlayerView): void {
  for (let i = 0; i < 4; i++) {
    if (i === view.viewer) continue;
    if (view.phase === 'game_over' && view.winner === i && view.winInfo) continue;
    const hand = view.players[i as PlayerIndex].hand;
    if (hand.kind === 'visible') {
      throw new Error(`Player ${i} hand must be hidden for viewer ${view.viewer}`);
    }
  }
}
