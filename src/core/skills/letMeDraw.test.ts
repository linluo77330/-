import { describe, expect, it } from 'vitest';
import { MahjongGame } from '../MahjongGame.js';
import type { Tile } from '../types.js';
import { SHOU_DUAN_ZHE_ID } from './letMeDraw.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

describe('let me draw skill', () => {
  it('摸牌阶段可发动并从河牌入手', () => {
    const game = new MahjongGame();
    const chars: [string, string, string, string] = [SHOU_DUAN_ZHE_ID, '', '', ''];
    game.start(0, chars);

    const snap0 = game.getSnapshot();
    expect(snap0.phase).toBe('discard');

    const discardTile = snap0.players[0].hand[0];
    game.discardCard(discardTile.id);

    while (game.getPhase() !== 'draw' || game.getCurrentPlayer() !== 0) {
      const snap = game.getSnapshot();
      if (snap.phase === 'response') {
        game.passResponse(snap.pendingResponses[0]?.player ?? 0);
        continue;
      }
      if (snap.phase === 'discard' && snap.currentPlayer !== 0) {
        const botHand = snap.players[snap.currentPlayer].hand;
        game.discardCard(botHand[0].id);
        continue;
      }
      if (snap.phase === 'draw' && snap.currentPlayer !== 0) {
        game.drawCard();
      }
    }

    expect(game.needsDrawChoice()).toBe(true);
    expect(game.activateSkill('let_me_draw')).toBe(true);

    const before = game.getSnapshot();
    const riverTile = before.players[0].discards[0];
    expect(game.resolveSkillPick({ tileId: riverTile.id })).toBe(true);

    const after = game.getSnapshot();
    expect(after.skillUses[0]).toBe(1);
    expect(after.players[0].hand.some((tile) => tile.id === riverTile.id)).toBe(true);
    expect(after.players[0].discards.some((tile) => tile.id === riverTile.id)).toBe(false);
    expect(after.phase).toBe('discard');
  });
});
