import { describe, expect, it } from 'vitest';
import { MahjongGame } from './MahjongGame.js';
import type { Tile } from './types.js';

let id = 0;
function t(suit: Tile['suit'], rank: number): Tile {
  return { id: `t${++id}`, suit, rank };
}

function setHand(game: MahjongGame, player: 0 | 1 | 2 | 3, hand: Tile[]) {
  (game as unknown as { players: { hand: Tile[] }[] }).players[player].hand = hand;
}

describe('response priority', () => {
  it('碰家 pass 后下家可吃', () => {
    const game = new MahjongGame();
    game.start(0);

    const fiveWan = t('wan', 5);
    setHand(game, 0, [
      fiveWan,
      t('tong', 1), t('tong', 2), t('tong', 3), t('tong', 4), t('tong', 5),
      t('tong', 6), t('tong', 7), t('tong', 8), t('tong', 9), t('feng', 1), t('feng', 2), t('feng', 3), t('feng', 4),
    ]);

    // 玩家1（下家）有 3,4万 → 可吃 5万
    setHand(game, 1, [
      t('wan', 3), t('wan', 4),
      t('tiao', 1), t('tiao', 2), t('tiao', 3), t('tiao', 4), t('tiao', 5),
      t('tiao', 6), t('tiao', 7), t('tiao', 8), t('tiao', 9), t('feng', 1), t('feng', 2), t('feng', 3),
    ]);

    // 玩家2（对家）有 5,5万 → 可碰，优先于吃
    setHand(game, 2, [
      t('wan', 5), t('wan', 5),
      t('tong', 1), t('tong', 2), t('tong', 3), t('tong', 4), t('tong', 5),
      t('tong', 6), t('tong', 7), t('tong', 8), t('tong', 9), t('feng', 1), t('feng', 2),
    ]);

    game.discardCard(fiveWan.id);

    let snap = game.getSnapshot();
    expect(snap.phase).toBe('response');
    expect(snap.responseLevel).toBe('pong');

    game.passResponse(2);
    snap = game.getSnapshot();
    expect(snap.phase).toBe('response');
    expect(snap.responseLevel).toBe('chi');
    expect(snap.pendingResponses.some((o) => o.player === 1 && o.action === 'chi')).toBe(true);
  });
});
