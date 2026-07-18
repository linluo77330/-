import type { GameSnapshot, PlayerIndex } from '../types.js';

/** 庄家首回合（出牌阶段、turnNumber 为 0） */
export function isDealerTurnOpening(
  snapshot: Pick<GameSnapshot, 'phase' | 'currentPlayer' | 'dealer' | 'turnNumber'>,
  player: PlayerIndex,
): boolean {
  return (
    snapshot.phase === 'discard' &&
    snapshot.turnNumber === 0 &&
    snapshot.dealer === player &&
    snapshot.currentPlayer === player
  );
}

export function isTurnStartDrawChoice(
  snapshot: Pick<GameSnapshot, 'phase' | 'currentPlayer' | 'drawMode'>,
  player: PlayerIndex,
): boolean {
  return snapshot.phase === 'draw' && snapshot.currentPlayer === player && snapshot.drawMode === 'choose';
}
